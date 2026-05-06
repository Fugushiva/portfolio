/**
 * n8n webhook — fire-and-forget.
 * Runs in parallel with the Resend sends but NEVER blocks the response.
 * If N8N_WEBHOOK_URL is not set, this is a no-op.
 *
 * Auth: x-portfolio-secret header (shared secret, must match n8n workflow config).
 * Timeout: 3 seconds abort — keeps UX snappy regardless of n8n health.
 */

export interface N8nPayload {
  name: string
  email: string
  message: string
  locale: string
  ts: number
  source: 'portfolio'
}

export function postN8nWebhook(payload: N8nPayload): void {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return // n8n not configured yet — no-op

  const secret = process.env.N8N_WEBHOOK_SECRET ?? ''

  // Fire and forget — we do NOT await this
  fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-portfolio-secret': secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3000),
  }).catch((err) => {
    // Log only — never surface this to the user
    console.warn('[n8n] webhook failed:', err instanceof Error ? err.message : err)
  })
}
