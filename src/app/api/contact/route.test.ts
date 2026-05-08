/**
 * Integration tests for src/app/api/contact/route.ts
 *
 * Tests the full POST pipeline:
 *   1 Parse body → 2 Honeypot → 3 IP → 4 Rate-limit → 5 Zod → 6 Turnstile → 7 n8n → 8 OK
 *
 * All external dependencies (rate-limit, turnstile, n8n) are mocked via vi.mock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'

// ─── Module mocks ─────────────────────────────────────────────────────────

vi.mock('@/lib/contact/rate-limit', () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/contact/turnstile', () => ({
  verifyTurnstile: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/contact/n8n', () => ({
  postN8nWebhook: vi.fn().mockResolvedValue(true),
}))

// ─── Imports after mocks ───────────────────────────────────────────────────

import { isRateLimited } from '@/lib/contact/rate-limit'
import { verifyTurnstile } from '@/lib/contact/turnstile'
import { postN8nWebhook } from '@/lib/contact/n8n'

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://portfolio.example.com/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'CF-Connecting-IP': '203.0.113.42',
      'CF-IPCountry': 'FR',
      'user-agent': 'vitest/1.0',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  name: 'Jean Dupont',
  email: 'jean@example.com',
  message: 'Bonjour, ceci est un test suffisamment long.',
  locale: 'fr',
  turnstileToken: 'valid-token-abc',
  company: '', // honeypot must be empty
}

async function parseJson(res: Response) {
  return res.json() as Promise<{ ok: boolean; code: string; details?: unknown }>
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/contact', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isRateLimited).mockResolvedValue(false)
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(postN8nWebhook).mockResolvedValue(true)
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/uuid'
    process.env.TURNSTILE_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  // ── Step 1: body parse ──────────────────────────────────────────────────

  it('returns 400 bad_request when body is not JSON', async () => {
    const req = new Request('https://portfolio.example.com/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not json at all',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.code).toBe('bad_request')
  })

  // ── Step 2: honeypot ───────────────────────────────────────────────────

  it('returns 200 sent silently when honeypot (company) is filled', async () => {
    const req = makeRequest({ ...VALID_BODY, company: 'ACME Corp' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.code).toBe('sent')
    // Must NOT call n8n — bot was dropped silently
    expect(postN8nWebhook).not.toHaveBeenCalled()
  })

  it('accepts company field as undefined (no honeypot)', async () => {
    const body = { ...VALID_BODY }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (body as any).company
    const req = makeRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.ok).toBe(true)
  })

  // ── Step 4: rate-limit ─────────────────────────────────────────────────

  it('returns 429 rate_limited when isRateLimited returns true', async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true)
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await parseJson(res)
    expect(json.code).toBe('rate_limited')
    expect(postN8nWebhook).not.toHaveBeenCalled()
  })

  // ── Step 5: Zod validation ─────────────────────────────────────────────

  it('returns 400 validation_error when name is missing', async () => {
    const req = makeRequest({ ...VALID_BODY, name: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.code).toBe('validation_error')
  })

  it('returns 400 validation_error when email is invalid', async () => {
    const req = makeRequest({ ...VALID_BODY, email: 'not-an-email' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.code).toBe('validation_error')
  })

  it('returns 400 validation_error when message is too short', async () => {
    const req = makeRequest({ ...VALID_BODY, message: 'hi' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.code).toBe('validation_error')
  })

  it('returns 400 validation_error when turnstileToken is empty', async () => {
    const req = makeRequest({ ...VALID_BODY, turnstileToken: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await parseJson(res)
    expect(json.code).toBe('validation_error')
  })

  // ── Step 6: Turnstile ──────────────────────────────────────────────────

  it('returns 403 captcha_failed when turnstile rejects token', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValueOnce(false)
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await parseJson(res)
    expect(json.code).toBe('captcha_failed')
    expect(postN8nWebhook).not.toHaveBeenCalled()
  })

  // ── Step 7: n8n webhook ────────────────────────────────────────────────

  it('returns 502 webhook_failed when n8n returns false', async () => {
    vi.mocked(postN8nWebhook).mockResolvedValueOnce(false)
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)
    expect(res.status).toBe(502)
    const json = await parseJson(res)
    expect(json.code).toBe('webhook_failed')
  })

  it('calls postN8nWebhook with name, email, message, locale and ts', async () => {
    const req = makeRequest(VALID_BODY)
    await POST(req)

    expect(postN8nWebhook).toHaveBeenCalledOnce()
    const [arg] = vi.mocked(postN8nWebhook).mock.calls[0]
    expect(arg.name).toBe(VALID_BODY.name)
    expect(arg.email).toBe(VALID_BODY.email)
    expect(arg.message).toBe(VALID_BODY.message)
    expect(arg.locale).toBe('fr')
    expect(typeof arg.ts).toBe('number')
    expect(arg.ts).toBeGreaterThan(0)
  })

  it('passes CF-IPCountry header as meta.country', async () => {
    const req = makeRequest(VALID_BODY, { 'CF-IPCountry': 'DE' })
    await POST(req)

    const [arg] = vi.mocked(postN8nWebhook).mock.calls[0]
    expect(arg.meta?.country).toBe('DE')
  })

  it('passes user-agent header as meta.userAgent', async () => {
    const req = makeRequest(VALID_BODY, { 'user-agent': 'MyTestAgent/2.0' })
    await POST(req)

    const [arg] = vi.mocked(postN8nWebhook).mock.calls[0]
    expect(arg.meta?.userAgent).toBe('MyTestAgent/2.0')
  })

  it('passes hashed IP in meta.ipHash (never plaintext)', async () => {
    const req = makeRequest(VALID_BODY, { 'CF-Connecting-IP': '203.0.113.99' })
    await POST(req)

    const [arg] = vi.mocked(postN8nWebhook).mock.calls[0]
    expect(arg.meta?.ipHash).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(arg.meta?.ipHash).not.toContain('203.0.113.99')
  })

  it('skips n8n call in dev when N8N_WEBHOOK_URL not set and returns 200', async () => {
    delete process.env.N8N_WEBHOOK_URL
    vi.stubEnv('NODE_ENV', 'development')
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)

    // In dev, missing URL → warn but still return 200
    expect(res.status).toBe(200)
    expect(postN8nWebhook).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('returns 502 webhook_failed in prod when N8N_WEBHOOK_URL not set', async () => {
    delete process.env.N8N_WEBHOOK_URL
    vi.stubEnv('NODE_ENV', 'production')
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)

    expect(res.status).toBe(502)
    const json = await parseJson(res)
    expect(json.code).toBe('webhook_failed')
    vi.unstubAllEnvs()
  })

  // ── Step 8: success ────────────────────────────────────────────────────

  it('returns 200 { ok: true, code: "sent" } on full happy path', async () => {
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.ok).toBe(true)
    expect(json.code).toBe('sent')
  })

  it('response content-type is application/json', async () => {
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)
    expect(res.headers.get('content-type')).toBe('application/json')
  })

  // ── Locale handling ────────────────────────────────────────────────────

  it('accepts locale "en"', async () => {
    const req = makeRequest({ ...VALID_BODY, locale: 'en' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const [arg] = vi.mocked(postN8nWebhook).mock.calls[0]
    expect(arg.locale).toBe('en')
  })

  it('defaults locale to "fr" when absent', async () => {
    const body = { ...VALID_BODY }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (body as any).locale
    const req = makeRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)

    const [arg] = vi.mocked(postN8nWebhook).mock.calls[0]
    expect(arg.locale).toBe('fr')
  })
})
