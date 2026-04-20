import Link from 'next/link'
import { Suspense } from 'react'
import { getDashboardMetrics } from '@/lib/services/dashboard-metrics'
import { listConversations } from '@/lib/services/conversation-viewer'
import { Chip } from '@/components/ui/chip'

export const revalidate = 0

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function DashboardHome() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex-1 overflow-auto bg-[#FAFAFB] px-6 py-8 sm:px-10"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="m-0 text-[32px] font-normal tracking-tight text-[#161528]"
              style={{
                fontFamily:
                  'var(--font-instrument-serif), ui-serif, Georgia, serif',
              }}
            >
              Dashboard
            </h1>
            <p className="mt-1 text-[13px] text-[#6B6A7E]">
              Bot performance across your Instagram DM flows.
            </p>
          </div>
        </header>

        <Suspense fallback={<MetricsSkeleton />}>
          <Metrics />
        </Suspense>

        <Suspense fallback={<ActivitySkeleton />}>
          <Activity />
        </Suspense>
      </div>
    </main>
  )
}

async function Metrics() {
  const m = await getDashboardMetrics()
  return (
    <section aria-labelledby="metrics-heading">
      <h2 id="metrics-heading" className="sr-only">
        Bot metrics
      </h2>
      <div className="mb-4 flex items-center gap-3">
        <Chip tone={m.bot.enabled ? 'success' : 'danger'} dot>
          Bot {m.bot.enabled ? 'live' : 'paused'}
        </Chip>
        <span className="text-[12px] text-[#6B6A7E]">
          Last reply {timeAgo(m.lastMessageAt)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Active" value={m.conversations.active} />
        <KpiCard label="Today" value={m.conversations.today} />
        <KpiCard label="Last 7 days" value={m.conversations.last7d} />
        <KpiCard label="Last 30 days" value={m.conversations.last30d} />
      </div>
    </section>
  )
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#EEEFF3] bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[#8A8A9B]">
        {label}
      </div>
      <div className="mt-1 text-[28px] font-semibold text-[#161528]">
        {value}
      </div>
    </div>
  )
}

function MetricsSkeleton() {
  return (
    <section>
      <div className="mb-4 h-5 w-40 animate-pulse rounded bg-[#EEEFF3]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-[#EEEFF3] bg-white"
          />
        ))}
      </div>
    </section>
  )
}

async function Activity() {
  const items = await listConversations(6)
  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2
          id="activity-heading"
          className="text-[15px] font-semibold text-[#161528]"
        >
          Recent conversations
        </h2>
        <Link
          href="/dashboard/conversations"
          className="text-[12px] font-medium text-[#4F46BA] hover:underline"
        >
          View all →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-[#EEEFF3] bg-white p-8 text-center text-[13px] text-[#6B6A7E]">
          No conversations yet. Replies will appear here as the bot handles DMs.
        </div>
      ) : (
        <ul className="divide-y divide-[#EFEFF3] rounded-xl border border-[#EEEFF3] bg-white">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/conversations/${c.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-[#FAFAFB]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-[#161528]">
                    {c.contact.name ?? c.contact.instagram_handle}
                  </div>
                  <div className="truncate text-[12px] text-[#6B6A7E]">
                    {c.last_message_preview ?? '—'}
                  </div>
                </div>
                <Chip
                  tone={
                    c.status === 'active'
                      ? 'success'
                      : c.status === 'flagged'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {c.status}
                </Chip>
                <div className="w-20 text-right text-[11.5px] text-[#6B6A7E]">
                  {timeAgo(c.last_message_at ?? c.started_at)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ActivitySkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <div className="h-5 w-48 animate-pulse rounded bg-[#EEEFF3]" />
      <div className="h-64 animate-pulse rounded-xl border border-[#EEEFF3] bg-white" />
    </section>
  )
}
