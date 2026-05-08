/**
 * Cryptographic helpers for the contact pipeline.
 * Uses the Web Crypto API (available in all runtimes: Node ≥18, CF Workers, Edge).
 */

/**
 * SHA-256 hash of an arbitrary string, returned as a `sha256:<hex>` prefixed string.
 * The prefix makes the hash self-documenting when stored or logged.
 *
 * @example
 * await sha256Prefixed('192.168.1.1') // → 'sha256:f1d2d2f9...'
 */
export async function sha256Prefixed(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `sha256:${hex}`
}

/**
 * Truncated (16-char) SHA-256 hash of an IP address.
 * Used for rate-limit keys — short enough to be an efficient KV key,
 * long enough to avoid accidental collisions (2^64 space).
 *
 * @example
 * await hashIp('192.168.1.1') // → 'a1b2c3d4e5f60718'
 */
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}
