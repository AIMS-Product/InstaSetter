import { describe, it, expect } from 'vitest'
import { generateDedupHash } from '@/lib/utils/dedup-hash'

describe('generateDedupHash', () => {
  it('returns a 64-character lowercase hex string', () => {
    expect(generateDedupHash('a', 'b', 'c')).toMatch(/^[a-f0-9]{64}$/)
  })

  it('is deterministic', () => {
    const h1 = generateDedupHash('a', 'b', 'c')
    const h2 = generateDedupHash('a', 'b', 'c')
    expect(h1).toBe(h2)
  })

  it('changes when any input differs', () => {
    const base = generateDedupHash('a', 'b', 'c')
    expect(generateDedupHash('x', 'b', 'c')).not.toBe(base)
    expect(generateDedupHash('a', 'x', 'c')).not.toBe(base)
    expect(generateDedupHash('a', 'b', 'x')).not.toBe(base)
  })

  it('handles empty strings', () => {
    expect(() => generateDedupHash('', '', '')).not.toThrow()
    expect(generateDedupHash('', '', '')).toMatch(/^[a-f0-9]{64}$/)
  })

  it('handles unicode and emojis', () => {
    expect(generateDedupHash('id', '👋 Hey!\nLine 2', 'ts')).toMatch(
      /^[a-f0-9]{64}$/
    )
  })
})
