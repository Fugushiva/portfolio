/**
 * Contact form API — Edge Runtime
 *
 * Pipeline (ordered cheapest → most expensive):
 * 1. Parse JSON body
 * 2. Honeypot check (company field must be empty → silent 200 on fail)
 * 3. Extract IP (CF-Connecting-IP header)
 * 4. Rate-limit (KV sliding window: 5 req / IP-hash / 10 min)
 * 5. Zod validate
 * 6. Turnstile siteverify
 * 7. POST enriched payload to n8n webhook (n8n handles all email sending)
 * 8. Return { ok, code }
 *
 * Email sending is delegated entirely to n8n — no email provider needed here.
 */

// No explicit runtime declaration — Cloudflare Workers runs everything on the edge by default.
// Declaring runtime='edge' breaks the OpenNext build pipeline.
export const dynamic = 'force-dynamic'

import { contactSchema } from '@/lib/contact/schema'
import { isRateLimited } from '@/lib/contact/rate-limit'
import { verifyTurnstile } from '@/lib/contact/turnstile'
import { postN8nWebhook } from '@/lib/contact/n8n'
import { sha256Prefixed } from '@/lib/contact/hash'

type ApiCode =
  | 'sent'
  | 'bad_request'
  | 'validation_error'
  | 'rate_limited'
  | 'captcha_failed'
  | 'webhook_failed'

function json(body: { ok: boolean; code: ApiCode; details?: unknown }, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function POST(req: Request) {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return json({ ok: false, code: 'bad_request' }, 400)
  }

  // ── 2. Honeypot check ──────────────────────────────────────────────────────
  // company field must be empty — bots auto-fill hidden fields
  // Return 200 ok to prevent enumeration (bot can't tell it was dropped)
  const honeypot = (rawBody as Record<string, unknown>)?.company
  if (honeypot !== '' && honeypot !== undefined) {
    return json({ ok: true, code: 'sent' }, 200)
  }

  // ── 3. Extract IP ──────────────────────────────────────────────────────────
  const ip =
    req.headers.get('CF-Connecting-IP') ??
    req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    '0.0.0.0'

  // ── 4. Rate-limit ──────────────────────────────────────────────────────────
  const limited = await isRateLimited(ip)
  if (limited) {
    return json({ ok: false, code: 'rate_limited' }, 429)
  }

  // ── 5. Zod validate ────────────────────────────────────────────────────────
  const parsed = contactSchema.safeParse(rawBody)
  if (!parsed.success) {
    return json(
      { ok: false, code: 'validation_error', details: parsed.error.flatten() },
      400,
    )
  }

  const { name, email, message, locale } = parsed.data

  // ── 6. Turnstile verify ────────────────────────────────────────────────────
  const captchaOk = await verifyTurnstile(parsed.data.turnstileToken)
  if (!captchaOk) {
    return json({ ok: false, code: 'captcha_failed' }, 403)
  }

  // ── 7. n8n webhook — n8n handles all email sending ────────────────────────
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    // n8n not configured — log and return success anyway in dev
    console.warn('[contact] N8N_WEBHOOK_URL not set')
    if (process.env.NODE_ENV !== 'development') {
      return json({ ok: false, code: 'webhook_failed' }, 502)
    }
  } else {
    // Build request metadata — nothing PII in cleartext
    const ipHash = await sha256Prefixed(ip)
    const country = req.headers.get('CF-IPCountry') ?? 'unknown'
    const userAgent = req.headers.get('user-agent') ?? 'unknown'

    const success = await postN8nWebhook({
      name,
      email,
      message,
      locale,
      ts: Date.now(),
      meta: { country, userAgent, ipHash },
    })

    if (!success) {
      return json({ ok: false, code: 'webhook_failed' }, 502)
    }
  }

  // ── 8. Success ─────────────────────────────────────────────────────────────
  return json({ ok: true, code: 'sent' }, 200)
}
