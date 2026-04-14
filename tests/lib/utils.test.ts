import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins plain strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('dedupes conflicting Tailwind utilities', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('flattens arrays and ignores falsy values', () => {
    expect(cn(['a', false, null, ['b', undefined]], 'c')).toBe('a b c')
  })

  it('supports the object conditional form', () => {
    expect(cn({ a: true, b: false, c: true })).toBe('a c')
  })
})
