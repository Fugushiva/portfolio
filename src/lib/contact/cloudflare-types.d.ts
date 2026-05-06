/**
 * Minimal Cloudflare Workers type stubs.
 * We avoid a full @cloudflare/workers-types dependency to keep the dev
 * setup simple — only the KVNamespace surface we actually use is typed here.
 * Replace with the full package if you add more CF bindings.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare interface KVNamespacePutOptions {
  expiration?: number
  expirationTtl?: number
  metadata?: any
}

declare interface KVNamespace {
  get(key: string, options?: { type?: 'text' }): Promise<string | null>
  put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void>
  delete(key: string): Promise<void>
}
