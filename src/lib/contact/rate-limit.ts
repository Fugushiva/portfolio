/**
 * Sliding-window rate limiter using Cloudflare KV.
 * Falls back to an in-memory Map in local dev (no KV binding).
 *
 * Window: 10 minutes (600_000 ms) — max 5 requests per IP per window.
 * IP is SHA-256 hashed (16 hex chars) before storage — GDPR friendly.
 */

interface RateLimitWindow {
  count: number
  windowStart: number
}

/** Dev stub — replaced by CF KV binding in production */
const devStore = new Map<string, string>()

function getKV(): KVNamespace | null {
  // In Cloudflare Workers / Pages Functions the binding is injected via env.
  // We access it through globalThis since Next.js edge runtime exposes CF bindings there.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kv = (globalThis as any).CONTACT_RATE_LIMIT as KVNamespace | undefined
  return kv ?? null
}

import { hashIp } from './hash'

const WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_REQUESTS = 5
const TTL_SECONDS = 600

export async function isRateLimited(ip: string): Promise<boolean> {
  const hash = await hashIp(ip)
  const key = `rl:contact:${hash}`

  const kv = getKV()
  const raw = kv
    ? await kv.get(key)
    : devStore.get(key) ?? null

  const now = Date.now()

  let window: RateLimitWindow = { count: 0, windowStart: now }

  if (raw) {
    try {
      window = JSON.parse(raw) as RateLimitWindow
    } catch {
      // Corrupt data — reset window
      window = { count: 0, windowStart: now }
    }
  }

  // Reset window if expired
  if (now - window.windowStart > WINDOW_MS) {
    window = { count: 0, windowStart: now }
  }

  if (window.count >= MAX_REQUESTS) {
    return true // rate-limited
  }

  // Increment and persist
  window.count += 1
  const serialized = JSON.stringify(window)

  if (kv) {
    // Fire-and-forget write — don't block response
    kv.put(key, serialized, { expirationTtl: TTL_SECONDS }).catch(() =>
      console.warn('[rate-limit] KV write failed'),
    )
  } else {
    devStore.set(key, serialized)
    // Auto-expire in dev
    setTimeout(() => devStore.delete(key), TTL_SECONDS * 1000)
  }

  return false
}
