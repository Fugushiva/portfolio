/**
 * Tests for src/lib/contact/n8n.ts
 *
 * Coverage targets:
 * - buildN8nPayload: all field groups, both locales, edge cases (long message, etc.)
 * - postN8nWebhook: missing URL early return, successful 200, non-ok status,
 *   network error, timeout, auth header sent, body logged on failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildN8nPayload, postN8nWebhook, type N8nPayloadInput } from './n8n'

// ─── Fixtures ─────────────────────────────────────────────────────────────

const BASE_INPUT: N8nPayloadInput = {
  name: 'Jean Dupont',
  email: 'jean@example.com',
  message: 'Bonjour, je voudrais en savoir plus sur vos services.',
  locale: 'fr',
  ts: 1746700000000, // fixed — avoids flakiness in snapshot tests
  meta: {
    country: 'FR',
    userAgent: 'Mozilla/5.0 (Test)',
    ipHash: 'sha256:abc123',
  },
}

const BASE_INPUT_EN: N8nPayloadInput = {
  ...BASE_INPUT,
  locale: 'en',
}

// ─── buildN8nPayload ──────────────────────────────────────────────────────

describe('buildN8nPayload', () => {
  // ── Root legacy fields ─────────────────────────────────────────────────

  it('preserves root-level legacy fields for backward compat', () => {
    const p = buildN8nPayload(BASE_INPUT)
    expect(p.name).toBe(BASE_INPUT.name)
    expect(p.email).toBe(BASE_INPUT.email)
    expect(p.message).toBe(BASE_INPUT.message)
    expect(p.locale).toBe('fr')
    expect(p.ts).toBe(BASE_INPUT.ts)
    expect(p.source).toBe('portfolio')
  })

  // ── form group ─────────────────────────────────────────────────────────

  it('sets form.type and form.source correctly', () => {
    const { form } = buildN8nPayload(BASE_INPUT)
    expect(form.type).toBe('contact')
    expect(form.source).toBe('portfolio')
  })

  it('converts ts to ISO-8601 UTC in form.submittedAt', () => {
    const { form } = buildN8nPayload(BASE_INPUT)
    expect(form.submittedAt).toBe(new Date(1746700000000).toISOString())
    expect(form.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('converts ts to unix seconds in form.submittedAtUnix', () => {
    const { form } = buildN8nPayload(BASE_INPUT)
    expect(form.submittedAtUnix).toBe(Math.floor(1746700000000 / 1000))
  })

  it('sets form.locale', () => {
    expect(buildN8nPayload(BASE_INPUT).form.locale).toBe('fr')
    expect(buildN8nPayload(BASE_INPUT_EN).form.locale).toBe('en')
  })

  // ── contact group ──────────────────────────────────────────────────────

  it('echoes contact fields', () => {
    const { contact } = buildN8nPayload(BASE_INPUT)
    expect(contact.name).toBe(BASE_INPUT.name)
    expect(contact.email).toBe(BASE_INPUT.email)
    expect(contact.message).toBe(BASE_INPUT.message)
  })

  it('sets messageLength to the exact character count', () => {
    const { contact } = buildN8nPayload(BASE_INPUT)
    expect(contact.messageLength).toBe(BASE_INPUT.message.length)
  })

  it('returns full message as messagePreview when length <= 120', () => {
    const short = 'Hello world'
    const { contact } = buildN8nPayload({ ...BASE_INPUT, message: short })
    expect(contact.messagePreview).toBe(short)
  })

  it('truncates messagePreview to 120 chars + ellipsis when message is longer', () => {
    const long = 'A'.repeat(200)
    const { contact } = buildN8nPayload({ ...BASE_INPUT, message: long })
    expect(contact.messagePreview).toBe('A'.repeat(120) + '…')
    expect(contact.messagePreview.length).toBe(121) // 120 + '…'
  })

  it('does NOT truncate message field regardless of length', () => {
    const long = 'B'.repeat(2000)
    const { contact } = buildN8nPayload({ ...BASE_INPUT, message: long })
    expect(contact.message).toBe(long)
    expect(contact.messageLength).toBe(2000)
  })

  // ── labels group (FR) ──────────────────────────────────────────────────

  it('[FR] sets subjectOwner with French prefix', () => {
    const { labels } = buildN8nPayload(BASE_INPUT)
    expect(labels.subjectOwner).toBe('[Portfolio] Nouveau message de Jean Dupont')
  })

  it('[FR] sets subjectAutoReply in French', () => {
    const { labels } = buildN8nPayload(BASE_INPUT)
    expect(labels.subjectAutoReply).toBe('Votre message a bien été reçu')
  })

  it('[FR] sets ownerGreeting in French', () => {
    const { labels } = buildN8nPayload(BASE_INPUT)
    expect(labels.ownerGreeting).toBe('Nouveau message de Jean Dupont')
  })

  it('[FR] sets autoReplyGreeting in French with name', () => {
    const { labels } = buildN8nPayload(BASE_INPUT)
    expect(labels.autoReplyGreeting).toBe('Bonjour Jean Dupont,')
  })

  // ── labels group (EN) ──────────────────────────────────────────────────

  it('[EN] sets subjectOwner with English prefix', () => {
    const { labels } = buildN8nPayload(BASE_INPUT_EN)
    expect(labels.subjectOwner).toBe('[Portfolio] New message from Jean Dupont')
  })

  it('[EN] sets subjectAutoReply in English', () => {
    const { labels } = buildN8nPayload(BASE_INPUT_EN)
    expect(labels.subjectAutoReply).toBe('Your message has been received')
  })

  it('[EN] sets ownerGreeting in English', () => {
    const { labels } = buildN8nPayload(BASE_INPUT_EN)
    expect(labels.ownerGreeting).toBe('New message from Jean Dupont')
  })

  it('[EN] sets autoReplyGreeting in English with name', () => {
    const { labels } = buildN8nPayload(BASE_INPUT_EN)
    expect(labels.autoReplyGreeting).toBe('Hello Jean Dupont,')
  })

  // ── emails group ───────────────────────────────────────────────────────

  it('sets owner email routing correctly', () => {
    const { emails } = buildN8nPayload(BASE_INPUT)
    expect(emails.ownerTo).toBe('jerome@delodder.dev')
    expect(emails.ownerFrom).toBe('hello@jeromedelodder.com')
    expect(emails.ownerReplyTo).toBe('jean@example.com')
  })

  it('sets auto-reply routing correctly', () => {
    const { emails } = buildN8nPayload(BASE_INPUT)
    expect(emails.autoReplyTo).toBe('jean@example.com')
    expect(emails.autoReplyFrom).toBe('hello@jeromedelodder.com')
  })

  it('includes name, email and message in ownerBodyText', () => {
    const { emails } = buildN8nPayload(BASE_INPUT)
    expect(emails.ownerBodyText).toContain('Jean Dupont')
    expect(emails.ownerBodyText).toContain('jean@example.com')
    expect(emails.ownerBodyText).toContain(BASE_INPUT.message)
  })

  it('includes submittedAt ISO timestamp in ownerBodyText', () => {
    const { emails, form } = buildN8nPayload(BASE_INPUT)
    expect(emails.ownerBodyText).toContain(form.submittedAt)
  })

  it('[FR] autoReplyBodyText includes name and is in French', () => {
    const { emails } = buildN8nPayload(BASE_INPUT)
    expect(emails.autoReplyBodyText).toContain('Jean Dupont')
    expect(emails.autoReplyBodyText).toContain('24')
    expect(emails.autoReplyBodyText).toContain('Jérôme Delodder')
  })

  it('[EN] autoReplyBodyText includes name and is in English', () => {
    const { emails } = buildN8nPayload(BASE_INPUT_EN)
    expect(emails.autoReplyBodyText).toContain('Jean Dupont')
    expect(emails.autoReplyBodyText).toContain('24')
    expect(emails.autoReplyBodyText).toContain('Jérôme Delodder')
    expect(emails.autoReplyBodyText).toContain('Hello Jean Dupont')
  })

  // ── meta group ─────────────────────────────────────────────────────────

  it('passes through meta fields from input', () => {
    const { meta } = buildN8nPayload(BASE_INPUT)
    expect(meta.country).toBe('FR')
    expect(meta.userAgent).toBe('Mozilla/5.0 (Test)')
    expect(meta.ipHash).toBe('sha256:abc123')
  })

  it('defaults meta fields to "unknown" when meta is omitted', () => {
    const input: N8nPayloadInput = { ...BASE_INPUT }
    delete (input as Partial<N8nPayloadInput>).meta
    const { meta } = buildN8nPayload(input)
    expect(meta.country).toBe('unknown')
    expect(meta.userAgent).toBe('unknown')
    expect(meta.ipHash).toBe('unknown')
  })

  it('defaults partial meta fields to "unknown"', () => {
    const { meta } = buildN8nPayload({ ...BASE_INPUT, meta: { country: 'DE' } })
    expect(meta.country).toBe('DE')
    expect(meta.userAgent).toBe('unknown')
    expect(meta.ipHash).toBe('unknown')
  })

  // ── Shape completeness ─────────────────────────────────────────────────

  it('payload has all expected top-level keys', () => {
    const p = buildN8nPayload(BASE_INPUT)
    expect(Object.keys(p).sort()).toEqual(
      ['name', 'email', 'message', 'locale', 'ts', 'source',
       'form', 'contact', 'labels', 'emails', 'meta'].sort()
    )
  })
})

// ─── postN8nWebhook ───────────────────────────────────────────────────────

describe('postN8nWebhook', () => {
  // Save originals
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  // ── Missing URL ────────────────────────────────────────────────────────

  it('returns false immediately when N8N_WEBHOOK_URL is not set', async () => {
    delete process.env.N8N_WEBHOOK_URL
    const result = await postN8nWebhook(BASE_INPUT)
    expect(result).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  // ── Successful request ─────────────────────────────────────────────────

  it('returns true on HTTP 200', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    process.env.N8N_WEBHOOK_SECRET = 'my-secret'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{"data":"ok"}', { status: 200 }))

    const result = await postN8nWebhook(BASE_INPUT)
    expect(result).toBe(true)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('sends POST method', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }))

    await postN8nWebhook(BASE_INPUT)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit).method).toBe('POST')
  })

  it('sends content-type: application/json header', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }))

    await postN8nWebhook(BASE_INPUT)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit & { headers: Record<string, string> }).headers['content-type'])
      .toBe('application/json')
  })

  it('sends x-portfolio-secret header from env', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    process.env.N8N_WEBHOOK_SECRET = 'supersecret42'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }))

    await postN8nWebhook(BASE_INPUT)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit & { headers: Record<string, string> }).headers['x-portfolio-secret'])
      .toBe('supersecret42')
  })

  it('sends empty x-portfolio-secret when env var is absent', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    delete process.env.N8N_WEBHOOK_SECRET
    vi.mocked(fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }))

    await postN8nWebhook(BASE_INPUT)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit & { headers: Record<string, string> }).headers['x-portfolio-secret'])
      .toBe('')
  })

  it('posts to N8N_WEBHOOK_URL', async () => {
    const url = 'https://n8n.example.com/webhook/specific-uuid'
    process.env.N8N_WEBHOOK_URL = url
    vi.mocked(fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }))

    await postN8nWebhook(BASE_INPUT)

    const [calledUrl] = vi.mocked(fetch).mock.calls[0]
    expect(calledUrl).toBe(url)
  })

  it('body is valid JSON containing enriched payload', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }))

    await postN8nWebhook(BASE_INPUT)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)

    // Legacy root fields
    expect(body.name).toBe(BASE_INPUT.name)
    expect(body.email).toBe(BASE_INPUT.email)
    expect(body.source).toBe('portfolio')

    // Enriched groups
    expect(body.form.type).toBe('contact')
    expect(body.contact.name).toBe(BASE_INPUT.name)
    expect(body.labels.subjectOwner).toContain(BASE_INPUT.name)
    expect(body.emails.ownerTo).toBe('jerome@delodder.dev')
    expect(body.meta.country).toBe('FR')
  })

  // ── Failed HTTP status ─────────────────────────────────────────────────

  it('returns false on HTTP 4xx', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    const result = await postN8nWebhook(BASE_INPUT)
    expect(result).toBe(false)
  })

  it('returns false on HTTP 5xx', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 })
    )

    const result = await postN8nWebhook(BASE_INPUT)
    expect(result).toBe(false)
  })

  it('returns false on HTTP 404 (e.g. workflow not activated)', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    const result = await postN8nWebhook(BASE_INPUT)
    expect(result).toBe(false)
  })

  it('logs status code on non-ok response', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Bad auth', { status: 403 }))

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await postN8nWebhook(BASE_INPUT)

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[n8n]'),
      403,
      expect.any(String),
    )
  })

  // ── Network / timeout errors ───────────────────────────────────────────

  it('returns false on network error (fetch throws)', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await postN8nWebhook(BASE_INPUT)
    expect(result).toBe(false)
  })

  it('returns false on AbortError (timeout)', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    const abortErr = new DOMException('The operation was aborted.', 'AbortError')
    vi.mocked(fetch).mockRejectedValueOnce(abortErr)

    const result = await postN8nWebhook(BASE_INPUT)
    expect(result).toBe(false)
  })

  it('logs on network error', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/test-uuid'
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await postN8nWebhook(BASE_INPUT)

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[n8n]'),
      expect.any(String),
    )
  })
})
