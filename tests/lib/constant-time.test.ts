import { describe, expect, it } from 'vitest'
import {
  constantTimeEqual,
  verifyBearerSecret,
} from '@/lib/security/constant-time'

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEqual('secret-42', 'secret-42')).toBe(true)
  })

  it('returns false for different strings of same length', () => {
    expect(constantTimeEqual('secret-42', 'secret-43')).toBe(false)
  })

  it('returns false for different lengths (no throw)', () => {
    expect(constantTimeEqual('short', 'much-longer-secret')).toBe(false)
    expect(constantTimeEqual('much-longer-secret', 'short')).toBe(false)
  })

  it('returns false for empty or null-ish inputs', () => {
    expect(constantTimeEqual('', 'anything')).toBe(false)
    expect(constantTimeEqual('anything', '')).toBe(false)
    expect(constantTimeEqual('', '')).toBe(false)
  })

  it('handles unicode / utf-8 payloads', () => {
    expect(constantTimeEqual('éàç', 'éàç')).toBe(true)
    expect(constantTimeEqual('éàç', 'éàd')).toBe(false)
  })
})

describe('verifyBearerSecret', () => {
  const expected = 'cron-secret-xyz'

  it('accepts matching Bearer token', () => {
    expect(verifyBearerSecret(`Bearer ${expected}`, expected)).toBe(true)
  })

  it('rejects mismatched secret', () => {
    expect(verifyBearerSecret('Bearer wrong-secret', expected)).toBe(false)
  })

  it('rejects missing header', () => {
    expect(verifyBearerSecret(null, expected)).toBe(false)
  })

  it('rejects header without Bearer prefix', () => {
    expect(verifyBearerSecret(expected, expected)).toBe(false)
    expect(verifyBearerSecret(`Token ${expected}`, expected)).toBe(false)
  })

  it('rejects when expected secret is undefined (env not set)', () => {
    expect(verifyBearerSecret(`Bearer ${expected}`, undefined)).toBe(false)
    expect(verifyBearerSecret(`Bearer ${expected}`, '')).toBe(false)
  })

  it('rejects empty Bearer value', () => {
    expect(verifyBearerSecret('Bearer ', expected)).toBe(false)
  })
})
