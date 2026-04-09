import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves @/ path aliases', async () => {
    const mod = await import('@/types/database')
    expect(mod).toBeDefined()
  })
})
