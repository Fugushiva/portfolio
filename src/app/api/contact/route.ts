/**
 * Contact form API
 *
 * Pipeline (ordered cheapest → most expensive):
 * 1. Parse JSON body
 * 2. Honeypot check (company field must be empty → silent 200 on fail)
 * 3. Zod validate
 * 4. POST enriched payload to n8n webhook (n8n handles all email sending)
 * 5. Return { ok, code }
 *
 * Email sending is delegated entirely to n8n — no email provider needed here.
 */

export const dynamic = 'force-dynamic'

import { contactSchema } from '@/lib/contact/schema'
import { postN8nWebhook } from '@/lib/contact/n8n'
import { sha256Prefixed } from '@/lib/contact/hash'

type ApiCode =
  | 'sent'
  | 'bad_request'
  | 'validation_error'
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

  // ── 3. Zod validate ────────────────────────────────────────────────────────
  const parsed = contactSchema.safeParse(rawBody)
  if (!parsed.success) {
    return json(
      { ok: false, code: 'validation_error', details: parsed.error.flatten() },
      400,
    )
  }

  const { name, email, message, locale } = parsed.data

  // ── 4. n8n webhook — n8n handles all email sending ────────────────────────
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    // n8n not configured — log and return success anyway in dev
    console.warn('[contact] N8N_WEBHOOK_URL not set')
    if (process.env.NODE_ENV !== 'development') {
      return json({ ok: false, code: 'webhook_failed' }, 502)
    }
  } else {
    const ip =
      req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
      '0.0.0.0'
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

  // ── 5. Success ─────────────────────────────────────────────────────────────
  return json({ ok: true, code: 'sent' }, 200)
}
