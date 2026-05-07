/**
 * Cloudflare Turnstile server-side verification.
 * Calls the siteverify API to validate the challenge token received from the widget.
 *
 * Tokens are single-use and expire after 5 minutes on Cloudflare's side.
 * We do NOT need to store used tokens — CF handles idempotency.
 *
 * Dev override: if TURNSTILE_SECRET is "1x0000000000000000000000000000000AA"
 * (Cloudflare's always-pass test secret), any token passes.
 */

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  hostname?: string
}

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET

  if (!secret) {
    // No secret configured — log warning and pass in dev, fail in prod
    if (process.env.NODE_ENV === 'development') {
      console.warn('[turnstile] TURNSTILE_SECRET not set — skipping verification in dev')
      return true
    }
    return false
  }

  if (!token) {
    console.warn('[turnstile] empty token from client — widget did not run')
    return false
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
      }).toString(),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>')
      console.warn('[turnstile] siteverify HTTP error', res.status, {
        bodyPreview: text.slice(0, 300),
        secretLen: secret.length,
        secretPrefix: secret.slice(0, 12),
        tokenLen: token.length,
        tokenPrefix: token.slice(0, 16),
      })
      return false
    }

    const data = (await res.json()) as TurnstileVerifyResponse
    if (!data.success) {
      console.warn('[turnstile] siteverify failed', data['error-codes'])
    }
    return data.success === true
  } catch (err) {
    console.warn('[turnstile] siteverify fetch failed', err)
    return false
  }
}
