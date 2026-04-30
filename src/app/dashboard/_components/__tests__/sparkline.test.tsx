import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Sparkline } from '@/app/dashboard/_components/sparkline'

describe('Sparkline', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders one bar per data point', () => {
    const { container } = render(<Sparkline values={[1, 2, 0, 5, 8, 3, 0]} />)
    const bars = container.querySelectorAll('rect[data-bar]')
    expect(bars).toHaveLength(7)
  })

  it('scales bar heights proportionally to the maximum value', () => {
    const { container } = render(<Sparkline values={[1, 2, 0, 5, 8, 3, 0]} />)
    const bars = Array.from(
      container.querySelectorAll<SVGRectElement>('rect[data-bar]')
    )
    const heights = bars.map((b) => Number(b.getAttribute('height')))
    // The 8-valued bar must be tallest, the 0-valued bars must be at the floor
    // (1px), and other bars in between.
    const maxHeight = Math.max(...heights)
    const minHeight = Math.min(...heights)
    expect(maxHeight).toBeGreaterThan(minHeight)
    expect(minHeight).toBeGreaterThanOrEqual(1)
    // Bar for value 8 should be the tallest
    const idxOfMaxValue = 4
    expect(Number(bars[idxOfMaxValue].getAttribute('height'))).toBe(maxHeight)
    // Bars for value 0 should hit the floor
    const idxsOfZero = [2, 6]
    for (const i of idxsOfZero) {
      expect(Number(bars[i].getAttribute('height'))).toBe(1)
    }
  })

  it('applies the floor height to every bar when the max is zero', () => {
    const { container } = render(<Sparkline values={[0, 0, 0, 0, 0, 0, 0]} />)
    const bars = Array.from(
      container.querySelectorAll<SVGRectElement>('rect[data-bar]')
    )
    for (const bar of bars) {
      expect(Number(bar.getAttribute('height'))).toBe(1)
    }
  })

  it('renders an aria-label and a visually hidden table fallback', () => {
    const { container } = render(<Sparkline values={[1, 2, 0, 5, 8, 3, 0]} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-label')).toBe('Daily DMs Mon through Sun')
    // Table fallback for screen readers
    const table = container.querySelector('table.sr-only')
    expect(table).toBeInTheDocument()
    expect(table?.querySelectorAll('th')).toHaveLength(7)
    const cells = Array.from(table?.querySelectorAll('td') ?? []).map(
      (c) => c.textContent
    )
    expect(cells).toEqual(['1', '2', '0', '5', '8', '3', '0'])
  })

  it('caps bar heights at the configured chart height', () => {
    // Even a wildly peaky day should not exceed the chart's height bounds.
    const { container } = render(<Sparkline values={[1, 1, 1, 1, 1, 1, 100]} />)
    const bars = Array.from(
      container.querySelectorAll<SVGRectElement>('rect[data-bar]')
    )
    const tallest = Number(bars[6].getAttribute('height'))
    const svg = container.querySelector('svg')
    const svgHeight = Number(svg?.getAttribute('height'))
    expect(tallest).toBeLessThanOrEqual(svgHeight)
  })
})
