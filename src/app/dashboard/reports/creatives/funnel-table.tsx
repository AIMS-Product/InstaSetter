'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useTransition, type CSSProperties } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  CREATIVE_FUNNEL_GROUP_BYS,
  UNATTRIBUTED_KEY,
  type CreativeFunnelGroupBy,
  type CreativeFunnelRow,
  type CreativeFunnelSortKey,
} from '@/lib/services/creative-funnel-types'
import { HelpTooltip } from '@/components/help-tooltip'
import { DATE_PRESETS, type DatePreset } from './date-window'

interface FunnelTableProps {
  rows: CreativeFunnelRow[]
  groupBy: CreativeFunnelGroupBy
  sort: CreativeFunnelSortKey
  dir: 'asc' | 'desc'
  preset: DatePreset
  windowFrom: string
  windowTo: string
  /** True when none of the rows have a non-zero `sentToClose`. Lets the column render the graceful empty state. */
  closeUnpopulated: boolean
}

const PERCENT_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const COUNT_FORMATTER = new Intl.NumberFormat('en-US')

const COLUMNS: Array<{
  key: CreativeFunnelSortKey
  label: string
  tooltip: string
  example?: string
  kind: 'count' | 'percent'
}> = [
  {
    key: 'dms',
    label: 'DMs',
    tooltip:
      'Distinct conversations that started in the selected window for this group.',
    example: '142',
    kind: 'count',
  },
  {
    key: 'qualified',
    label: 'Qualified',
    tooltip: 'Hot or warm leads. Cold and out-of-area excluded.',
    example: '81',
    kind: 'count',
  },
  {
    key: 'booked',
    label: 'Booked',
    tooltip:
      'Conversations where the bot triggered a book_call tool — a call landed on the calendar.',
    example: '24',
    kind: 'count',
  },
  {
    key: 'sentToClose',
    label: 'Sent to Close',
    tooltip:
      'Leads with a Close CRM contact id. Live once the Close handoff is enabled.',
    example: '22',
    kind: 'count',
  },
  {
    key: 'qualifiedFromDms',
    label: 'Q→DM',
    tooltip:
      'Share of DMs that turned into hot or warm leads. Higher is better.',
    example: '57.0%',
    kind: 'percent',
  },
  {
    key: 'bookedFromDms',
    label: 'Book→DM',
    tooltip:
      'Share of DMs that converted to a booked call. The headline conversion rate.',
    example: '17.0%',
    kind: 'percent',
  },
  {
    key: 'closeFromDms',
    label: 'Close→DM',
    tooltip:
      'Share of DMs that handed off to Close CRM. Live once the Close sync is enabled.',
    example: '15.5%',
    kind: 'percent',
  },
]

const GROUP_BY_LABELS: Record<CreativeFunnelGroupBy, string> = {
  source: 'Source',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  utm_content: 'utm_content',
  channel: 'Channel',
}

const headerCellStyle: CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 800,
  color: '#4B4A5E',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  borderBottom: '1px solid #EEEFF3',
  padding: '10px 12px',
  background: '#FAFAFB',
  whiteSpace: 'nowrap',
}

const bodyCellStyle: CSSProperties = {
  fontSize: 13,
  color: '#161528',
  padding: '12px',
  borderBottom: '1px solid #F2F2F6',
  whiteSpace: 'nowrap',
}

export function FunnelTable({
  rows,
  groupBy,
  sort,
  dir,
  preset,
  windowFrom,
  windowTo,
  closeUnpopulated,
}: FunnelTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const updateParams = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '') params.delete(key)
      else params.set(key, value)
    }
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false })
    })
  }

  const onHeaderClick = (column: CreativeFunnelSortKey) => {
    if (column === sort) {
      updateParams({ sort: column, dir: dir === 'asc' ? 'desc' : 'asc' })
    } else {
      updateParams({ sort: column, dir: 'desc' })
    }
  }

  const onGroupByChange = (next: CreativeFunnelGroupBy) => {
    updateParams({ group_by: next })
  }

  const onPresetChange = (next: DatePreset) => {
    updateParams({
      preset: next,
      // Custom params are wiped on preset change; the page server-resolves
      // a fresh window from the preset alone.
      from: undefined,
      to: undefined,
    })
  }

  const conversationsHref = useMemo(
    () =>
      buildConversationsBaseHref({
        groupBy,
        windowFrom,
        windowTo,
      }),
    [groupBy, windowFrom, windowTo]
  )

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <fieldset
          style={{
            border: '1px solid #EEEFF3',
            borderRadius: 8,
            padding: '6px 8px',
            background: 'white',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <legend
            style={{
              padding: '0 4px',
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#6B6A7E',
              letterSpacing: 0.5,
            }}
          >
            Window
          </legend>
          {DATE_PRESETS.filter((p) => p !== 'custom').map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPresetChange(p)}
              aria-pressed={preset === p}
              style={presetButtonStyle(preset === p)}
            >
              {presetLabel(p)}
            </button>
          ))}
        </fieldset>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#4B4A5E',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: '#6B6A7E',
            }}
          >
            Group by
          </span>
          <select
            value={groupBy}
            onChange={(event) =>
              onGroupByChange(event.target.value as CreativeFunnelGroupBy)
            }
            style={{
              border: '1px solid #D9DAE5',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 13,
              color: '#161528',
              background: 'white',
            }}
          >
            {CREATIVE_FUNNEL_GROUP_BYS.map((option) => (
              <option key={option} value={option}>
                {GROUP_BY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        {pending && (
          <span style={{ fontSize: 11, color: '#6B6A7E' }} aria-live="polite">
            Updating…
          </span>
        )}
      </div>

      {closeUnpopulated && (
        <div
          role="note"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            border: '1px solid #EEEFF3',
            background: '#FAFAFB',
            borderRadius: 8,
            padding: 12,
            color: '#4B4A5E',
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <span aria-hidden style={{ marginTop: 2 }}>
            •
          </span>
          <div>
            <strong style={{ color: '#161528' }}>
              Close handoff not yet wired
            </strong>{' '}
            — the “Sent to Close” column reads zero across every row until the
            Close CRM sync turns on. Counts will fill in automatically once the
            handoff lands.
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px dashed #C9C9D8',
            borderRadius: 8,
            padding: 18,
            color: '#4B4A5E',
          }}
        >
          <div style={{ fontWeight: 800, color: '#161528' }}>
            No conversations in this window
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5 }}>
            Try a wider date range, or check the{' '}
            <Link
              href="/dashboard/marketing-sources"
              style={{ color: '#4F46BA', textDecoration: 'underline' }}
            >
              Lead Sources
            </Link>{' '}
            page to confirm campaigns are tagged.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'white',
            border: '1px solid #EEEFF3',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse' }}
              aria-label="Creative funnel"
            >
              <thead>
                <tr>
                  <th scope="col" style={{ ...headerCellStyle, minWidth: 200 }}>
                    {GROUP_BY_LABELS[groupBy]}
                  </th>
                  {COLUMNS.map((col) => {
                    const isActive = col.key === sort
                    const ariaSort: 'ascending' | 'descending' | 'none' =
                      isActive
                        ? dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={ariaSort}
                        style={{
                          ...headerCellStyle,
                          textAlign: 'right',
                          background: isActive ? '#ECEBF7' : '#FAFAFB',
                          color: isActive ? '#2E297A' : '#4B4A5E',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 4,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onHeaderClick(col.key)}
                            style={{
                              all: 'unset',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {col.label}
                            <SortIcon active={isActive} dir={dir} />
                          </button>
                          <HelpTooltip
                            text={col.tooltip}
                            example={col.example}
                          />
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const href = `${conversationsHref}${conversationsHref.includes('?') ? '&' : '?'}${buildRowQueryString(row, groupBy)}`
                  const isUnattributed = row.groupKey === UNATTRIBUTED_KEY
                  return (
                    <tr key={row.groupKey} style={{ background: 'white' }}>
                      <td
                        style={{
                          ...bodyCellStyle,
                          fontWeight: 600,
                          color: '#161528',
                        }}
                      >
                        {isUnattributed ? (
                          <span style={{ color: '#6B6A7E' }}>
                            {row.groupLabel}
                          </span>
                        ) : (
                          <Link
                            href={href}
                            style={{ color: '#161528', textDecoration: 'none' }}
                          >
                            {row.groupLabel}
                          </Link>
                        )}
                      </td>
                      {COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          style={{
                            ...bodyCellStyle,
                            textAlign: 'right',
                            color:
                              col.key === sort
                                ? '#2E297A'
                                : bodyCellStyle.color,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {renderCell(row, col, closeUnpopulated)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function presetButtonStyle(active: boolean): CSSProperties {
  return {
    border: 0,
    borderRadius: 6,
    padding: '5px 9px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    background: active ? '#ECEBF7' : 'transparent',
    color: active ? '#2E297A' : '#4B4A5E',
  }
}

function presetLabel(preset: DatePreset): string {
  switch (preset) {
    case '7d':
      return '7d'
    case '30d':
      return '30d'
    case '90d':
      return '90d'
    case 'this_month':
      return 'This month'
    case 'last_month':
      return 'Last month'
    case 'custom':
      return 'Custom'
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown aria-hidden size={11} strokeWidth={2} />
  if (dir === 'asc') return <ArrowUp aria-hidden size={11} strokeWidth={2.5} />
  return <ArrowDown aria-hidden size={11} strokeWidth={2.5} />
}

function renderCell(
  row: CreativeFunnelRow,
  col: (typeof COLUMNS)[number],
  closeUnpopulated: boolean
): string {
  if (col.key === 'sentToClose' && closeUnpopulated) {
    return '—'
  }
  if (col.key === 'closeFromDms' && closeUnpopulated) {
    return '—'
  }
  if (col.kind === 'count') {
    const value = row[col.key as 'dms' | 'qualified' | 'booked' | 'sentToClose']
    return COUNT_FORMATTER.format(value)
  }
  const rateKey =
    col.key === 'qualifiedFromDms'
      ? 'qualifiedFromDms'
      : col.key === 'bookedFromDms'
        ? 'bookedFromDms'
        : 'closeFromDms'
  const rate = row.rates[rateKey]
  if (rate === null) return '—'
  return PERCENT_FORMATTER.format(rate)
}

function buildConversationsBaseHref(input: {
  groupBy: CreativeFunnelGroupBy
  windowFrom: string
  windowTo: string
}): string {
  const url = new URL('/dashboard/conversations', 'https://placeholder.local')
  // The conversations page reads `from`/`to` as ISO datetimes and queries
  // `started_at` directly, so we pass through the same window.
  url.searchParams.set('from', input.windowFrom.slice(0, 10))
  url.searchParams.set('to', input.windowTo.slice(0, 10))
  return `${url.pathname}?${url.searchParams.toString()}`
}

function buildRowQueryString(
  row: CreativeFunnelRow,
  groupBy: CreativeFunnelGroupBy
): string {
  if (row.groupKey === UNATTRIBUTED_KEY) {
    // Unattributed rows skip the row-specific filter — clicking them shows
    // every conversation in the date window. The Conversations page does
    // not yet support a "no source" inverse filter and we explicitly leave
    // that out of v1.
    return ''
  }
  const params = new URLSearchParams()
  switch (groupBy) {
    case 'source':
      params.set('source_id', row.groupKey)
      break
    case 'utm_source':
      params.set('utm_source', row.groupKey)
      break
    case 'utm_medium':
      params.set('utm_medium', row.groupKey)
      break
    case 'utm_campaign':
      params.set('utm_campaign', row.groupKey)
      break
    case 'utm_content':
      params.set('utm_content', row.groupKey)
      break
    case 'channel':
      // The conversations list does not yet filter on the channel column —
      // surface the source/UTM equivalents instead. For "channel" grouping we
      // skip the row filter so the click still narrows by date.
      break
  }
  return params.toString()
}
