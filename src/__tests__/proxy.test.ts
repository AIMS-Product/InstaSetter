import { describe, it, expect } from 'vitest'

// The Next.js middleware matcher from src/proxy.ts uses a negative lookahead
// regex to exclude certain paths from session refresh processing.
// We convert it to a standard RegExp to verify the exclusion behavior.
const MATCHER_PATTERN =
  /^\/((?!_next\/static|_next\/image|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$|api\/webhooks).*)$/

describe('middleware webhook exclusion', () => {
  it('excludes /api/webhooks/inro', () => {
    expect(MATCHER_PATTERN.test('/api/webhooks/inro')).toBe(false)
  })

  it('excludes /api/webhooks/stripe', () => {
    expect(MATCHER_PATTERN.test('/api/webhooks/stripe')).toBe(false)
  })

  it('excludes /api/webhooks/ (trailing slash)', () => {
    expect(MATCHER_PATTERN.test('/api/webhooks/')).toBe(false)
  })

  it('does NOT exclude /dashboard', () => {
    expect(MATCHER_PATTERN.test('/dashboard')).toBe(true)
  })

  it('does NOT exclude /api/other', () => {
    expect(MATCHER_PATTERN.test('/api/other')).toBe(true)
  })

  it('does NOT exclude root /', () => {
    expect(MATCHER_PATTERN.test('/')).toBe(true)
  })
})
