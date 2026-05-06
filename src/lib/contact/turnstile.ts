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
      console.warn('[turnstile] siteverify HTTP error', res.status)
      return false
    }

    const data = (await res.json()) as TurnstileVerifyResponse
    return data.success === true
  } catch (err) {
    console.warn('[turnstile] siteverify fetch failed', err)
    return false
  }
}
