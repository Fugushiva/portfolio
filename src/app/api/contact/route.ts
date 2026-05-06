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
 * 7. KV write (increment, non-blocking)
 * 8. Promise.allSettled([owner email, auto-reply, n8n webhook])
 * 9. Return { ok, code }
 */
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { contactSchema } from '@/lib/contact/schema'
import { isRateLimited } from '@/lib/contact/rate-limit'
import { verifyTurnstile } from '@/lib/contact/turnstile'
import { sendOwnerEmail, sendAutoReply } from '@/lib/contact/email'
import { postN8nWebhook } from '@/lib/contact/n8n'

type ApiCode =
  | 'sent'
  | 'bad_request'
  | 'validation_error'
  | 'rate_limited'
  | 'captcha_failed'
  | 'email_failed'

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
  // company field must be empty (bots auto-fill hidden fields)
  // We return 200 + ok:true to prevent enumeration — bot can't tell it was dropped.
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

  const { name, email, message, locale, turnstileToken } = parsed.data

  // ── 6. Turnstile verify ────────────────────────────────────────────────────
  const captchaOk = await verifyTurnstile(turnstileToken)
  if (!captchaOk) {
    return json({ ok: false, code: 'captcha_failed' }, 403)
  }

  // ── 7–8. Send emails + n8n webhook (parallel, non-blocking for n8n) ────────
  const emailParams = { name, email, message, locale }

  // n8n is fire-and-forget — started synchronously but not awaited in allSettled
  postN8nWebhook({ name, email, message, locale, ts: Date.now(), source: 'portfolio' })

  const [ownerResult, autoReplyResult] = await Promise.allSettled([
    sendOwnerEmail(emailParams),
    sendAutoReply(emailParams),
  ])

  // Owner email is the critical path — auto-reply failure is non-fatal
  if (ownerResult.status === 'rejected') {
    console.error('[contact] owner email failed:', ownerResult.reason)
    return json({ ok: false, code: 'email_failed' }, 502)
  }

  if (autoReplyResult.status === 'rejected') {
    console.warn('[contact] auto-reply failed (non-fatal):', autoReplyResult.reason)
  }

  // ── 9. Success ─────────────────────────────────────────────────────────────
  return json({ ok: true, code: 'sent' }, 200)
}
