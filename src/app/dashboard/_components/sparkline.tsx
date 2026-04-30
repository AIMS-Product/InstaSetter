/**
 * Inline SVG sparkline. Server-renderable, no chart library, no client JS.
 * Used by the dashboard's WeeklySummaryCard to show daily DM volume Mon-Sun.
 *
 * Design constraints:
 * - Min height of 1px for empty days so the row stays readable.
 * - Heights scale proportionally to the max within the supplied set.
 * - Constant total height (24px) so the card layout doesn't jiggle when
 *   data shifts. A peaky day caps at the full bar height; the tooltip
 *   carries the absolute number.
 */

const BAR_WIDTH = 6
const BAR_GAP = 3
const HEIGHT = 24
const FLOOR = 1
const FILL = '#4F46BA' // accent indigo, matches the rest of the dashboard

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export interface SparklineProps {
  values: number[]
  ariaLabel?: string
}

export function Sparkline({
  values,
  ariaLabel = 'Daily DMs Mon through Sun',
}: SparklineProps) {
  const max = Math.max(0, ...values)
  const width = values.length * BAR_WIDTH + (values.length - 1) * BAR_GAP

  return (
    <span className="inline-flex items-end">
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block"
      >
        {values.map((v, i) => {
          const h =
            max === 0
              ? FLOOR
              : Math.max(FLOOR, Math.round((v / max) * (HEIGHT - 1)))
          const x = i * (BAR_WIDTH + BAR_GAP)
          const y = HEIGHT - h
          return (
            <rect
              key={i}
              data-bar
              data-day={WEEKDAY_LABELS[i] ?? `Day ${i + 1}`}
              data-value={v}
              x={x}
              y={y}
              width={BAR_WIDTH}
              height={h}
              rx={1}
              fill={FILL}
            />
          )
        })}
      </svg>
      {/* Visually hidden table fallback for assistive tech that doesn't
          announce SVG `aria-label`s as a list of values. */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            {WEEKDAY_LABELS.slice(0, values.length).map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {values.map((v, i) => (
              <td key={i}>{v}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </span>
  )
}
