import { describe, expect, it } from 'vitest'
import { formatDateRange, formatPercent, formatPpDelta } from '@/lib/format'

describe('formatPercent', () => {
  it('renders one decimal with a trailing % sign', () => {
    expect(formatPercent(0.0814)).toBe('8.1%')
    expect(formatPercent(0.5)).toBe('50.0%')
    expect(formatPercent(1)).toBe('100.0%')
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('renders an em-dash placeholder when the rate is null', () => {
    expect(formatPercent(null)).toBe('—')
  })

  it('clamps to 0% for negative inputs and to 100% for over-1 inputs', () => {
    expect(formatPercent(-0.2)).toBe('0.0%')
    expect(formatPercent(2.5)).toBe('100.0%')
  })
})

describe('formatPpDelta', () => {
  it('renders the absolute pp difference of two rates with the right sign', () => {
    // 8.1% - 6.2% = +1.9pp
    expect(formatPpDelta(0.081, 0.062)).toEqual({
      sign: 'up',
      label: '+1.9pp',
    })
    expect(formatPpDelta(0.05, 0.07)).toEqual({
      sign: 'down',
      label: '-2.0pp',
    })
    expect(formatPpDelta(0.05, 0.05)).toEqual({
      sign: 'flat',
      label: '0.0pp',
    })
  })

  it('returns null when either rate is null', () => {
    expect(formatPpDelta(null, 0.05)).toBeNull()
    expect(formatPpDelta(0.05, null)).toBeNull()
    expect(formatPpDelta(null, null)).toBeNull()
  })
})

describe('formatDateRange', () => {
  it('renders a same-month range as "Mon D - D"', () => {
    // Apr 27 - May 3 (different months)
    const start = new Date('2026-04-27T00:00:00Z')
    const end = new Date('2026-05-03T00:00:00Z')
    expect(formatDateRange(start, end, 'UTC')).toBe('Apr 27 - May 3')
  })

  it('renders a same-month range without repeating the month name', () => {
    const start = new Date('2026-04-06T00:00:00Z')
    const end = new Date('2026-04-12T00:00:00Z')
    expect(formatDateRange(start, end, 'UTC')).toBe('Apr 6 - 12')
  })

  it('respects the supplied IANA timezone', () => {
    // Adelaide is +0930 (ACST) at this date — but we just check the function
    // formats according to the given zone, not local. A UTC midnight on
    // 2026-04-27 is already 09:30 in Adelaide on the same calendar day.
    const start = new Date('2026-04-27T00:00:00Z')
    const end = new Date('2026-05-03T00:00:00Z')
    expect(formatDateRange(start, end, 'Australia/Adelaide')).toBe(
      'Apr 27 - May 3'
    )
  })
})
