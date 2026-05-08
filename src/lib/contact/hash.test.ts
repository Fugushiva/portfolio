/**
 * Tests for src/lib/contact/hash.ts
 */

import { describe, it, expect } from 'vitest'
import { sha256Prefixed, hashIp } from './hash'

describe('sha256Prefixed', () => {
  it('returns a string starting with "sha256:"', async () => {
    const result = await sha256Prefixed('192.168.1.1')
    expect(result).toMatch(/^sha256:[0-9a-f]+$/)
  })

  it('is deterministic — same input produces same output', async () => {
    const a = await sha256Prefixed('test-input')
    const b = await sha256Prefixed('test-input')
    expect(a).toBe(b)
  })

  it('is sensitive — different inputs produce different hashes', async () => {
    const a = await sha256Prefixed('192.168.1.1')
    const b = await sha256Prefixed('192.168.1.2')
    expect(a).not.toBe(b)
  })

  it('produces a 64-char hex string after the prefix (SHA-256 = 256 bits = 32 bytes = 64 hex chars)', async () => {
    const result = await sha256Prefixed('any-input')
    const hex = result.replace('sha256:', '')
    expect(hex).toHaveLength(64)
  })

  it('handles empty string', async () => {
    const result = await sha256Prefixed('')
    expect(result).toMatch(/^sha256:[0-9a-f]{64}$/)
  })
})

describe('hashIp', () => {
  it('returns a 16-char hex string', async () => {
    const result = await hashIp('203.0.113.1')
    expect(result).toMatch(/^[0-9a-f]{16}$/)
  })

  it('is deterministic', async () => {
    const a = await hashIp('10.0.0.1')
    const b = await hashIp('10.0.0.1')
    expect(a).toBe(b)
  })

  it('is sensitive — different IPs produce different hashes', async () => {
    const a = await hashIp('10.0.0.1')
    const b = await hashIp('10.0.0.2')
    expect(a).not.toBe(b)
  })

  it('never returns the IP itself', async () => {
    const ip = '198.51.100.42'
    const result = await hashIp(ip)
    expect(result).not.toContain(ip)
    expect(result).not.toBe(ip)
  })

  it('handles IPv6 addresses', async () => {
    const result = await hashIp('2001:db8::1')
    expect(result).toMatch(/^[0-9a-f]{16}$/)
  })

  it('the 16-char result is a prefix of the full sha256Prefixed hex', async () => {
    const full = await sha256Prefixed('1.2.3.4')
    const short = await hashIp('1.2.3.4')
    expect(full).toContain(short) // sha256Prefixed hex starts with hashIp output
  })
})
