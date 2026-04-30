import {
  getWeeklyFunnelSummary,
  type WeeklySummary,
} from '@/lib/services/weekly-summary'
import { formatPercent, formatPpDelta } from '@/lib/format'
import { Chip } from '@/components/ui/chip'
import { Sparkline } from './sparkline'

const RATE_TOOLTIP =
  "Percentage of this week's DMs that have been pushed to Close CRM as a lead."

const FUNNEL_STEPS: Array<{
  key: 'dms' | 'qualified' | 'booked' | 'sentToClose'
  label: string
}> = [
  { key: 'dms', label: 'DMs' },
  { key: 'qualified', label: 'qualified' },
  { key: 'booked', label: 'booked' },
  { key: 'sentToClose', label: 'to Close' },
]

export interface WeeklySummaryProps {
  summary: WeeklySummary
}

/**
 * Server Component entry point. Streams via Suspense from the dashboard
 * page; never invoked from a client boundary.
 */
export async function WeeklySummaryCard() {
  const summary = await getWeeklyFunnelSummary()
  return renderWeeklySummaryCard({ summary })
}

/**
 * Pure presentational renderer used by both the async wrapper above and the
 * RTL test suite. Keeping the JSX in a sync function lets tests render
 * the markup without mocking the data layer.
 */
export function renderWeeklySummaryCard({ summary }: WeeklySummaryProps) {
  const { current, previous, dailyDms, closeHandoffShipped } = summary
  const isEmpty = current.dms === 0
  const wow =
    previous.dms > 0
      ? formatPpDelta(current.rates.closeFromDms, previous.rates.closeFromDms)
      : null

  return (
    <section
      aria-labelledby="weekly-summary-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2
            id="weekly-summary-heading"
            className="text-[15px] font-semibold text-[#161528]"
          >
            This week
          </h2>
          <p className="mt-0.5 text-[12px] text-[#6B6A7E]">
            Mon - Sun, {summary.timeZone.replace('_', ' ')} time
          </p>
        </div>
        <span className="text-[12px] text-[#6B6A7E]">{current.label}</span>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[#EEEFF3] bg-white p-5">
        {isEmpty ? (
          <EmptyState previous={previous} />
        ) : (
          <>
            <FunnelRow current={current} />
            <HeadlineRate
              rate={current.rates.closeFromDms}
              wow={wow}
              previousLabel={previous.label}
            />
            <div className="flex items-center gap-3">
              <Sparkline values={dailyDms} />
              <span className="text-[12px] text-[#6B6A7E]">
                Daily DMs Mon - Sun
              </span>
            </div>
          </>
        )}
      </div>

      {!closeHandoffShipped && (
        <div className="flex items-center gap-2">
          <Chip tone="warn">Close handoff coming soon - see Settings.</Chip>
        </div>
      )}
    </section>
  )
}

function FunnelRow({ current }: { current: WeeklySummary['current'] }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] text-[#161528]">
      {FUNNEL_STEPS.map((step, i) => (
        <span key={step.key} className="inline-flex items-baseline gap-2">
          {i > 0 && (
            <span aria-hidden className="text-[#8A8A9B]">
              →
            </span>
          )}
          <span className="text-[18px] font-semibold tabular-nums">
            {current[step.key]}
          </span>
          <span className="text-[12px] text-[#6B6A7E]">{step.label}</span>
        </span>
      ))}
    </div>
  )
}

function HeadlineRate({
  rate,
  wow,
  previousLabel,
}: {
  rate: number | null
  wow: ReturnType<typeof formatPpDelta>
  previousLabel: string
}) {
  const tone = wow?.sign ?? 'flat'
  const chipTone =
    tone === 'up' ? 'success' : tone === 'down' ? 'danger' : 'neutral'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        data-rate-tooltip
        title={RATE_TOOLTIP}
        tabIndex={0}
        className="inline-flex items-baseline gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#4F46BA]"
      >
        <span className="text-[28px] font-semibold tabular-nums text-[#161528]">
          {formatPercent(rate)}
        </span>
        <span className="text-[12px] font-medium text-[#6B6A7E]">
          DM → Close
        </span>
      </span>
      {wow && (
        <span
          data-wow-tone={wow.sign}
          className="inline-flex items-center gap-1.5"
        >
          <Chip tone={chipTone}>
            {wow.sign === 'up' ? '↑' : wow.sign === 'down' ? '↓' : '→'}{' '}
            {wow.label}
          </Chip>
          <span className="text-[12px] text-[#6B6A7E]">vs {previousLabel}</span>
        </span>
      )}
    </div>
  )
}

function EmptyState({ previous }: { previous: WeeklySummary['previous'] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] text-[#161528]">
        Quiet week so far. New DMs will appear here.
      </p>
      {previous.dms > 0 && (
        <p className="text-[12px] text-[#6B6A7E]">
          Last week ({previous.label}): {previous.dms} DMs ·{' '}
          {formatPercent(previous.rates.closeFromDms)} DM → Close.
        </p>
      )}
    </div>
  )
}

export function WeeklySummarySkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <div className="h-5 w-32 animate-pulse rounded bg-[#EEEFF3]" />
      <div className="h-32 animate-pulse rounded-xl border border-[#EEEFF3] bg-white" />
    </section>
  )
}
