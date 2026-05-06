/**
 * n8n webhook — awaited, returns success boolean.
 * n8n is responsible for sending all emails (owner notification + auto-reply).
 * If N8N_WEBHOOK_URL is not set, returns false immediately.
 *
 * Auth: x-portfolio-secret header (shared secret, must match n8n workflow config).
 * Timeout: 5 seconds — n8n must respond within this window.
 */

export interface N8nPayload {
  name: string
  email: string
  message: string
  locale: string
  ts: number
  source: 'portfolio'
}

export async function postN8nWebhook(payload: N8nPayload): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return false

  const secret = process.env.N8N_WEBHOOK_SECRET ?? ''

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-portfolio-secret': secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error('[n8n] webhook returned', res.status)
      return false
    }

    return true
  } catch (err) {
    console.error('[n8n] webhook failed:', err instanceof Error ? err.message : err)
    return false
  }
}
