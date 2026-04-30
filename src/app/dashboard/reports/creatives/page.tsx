import { getCreativeFunnelRows } from '@/lib/services/creative-funnel'
import {
  resolveDateWindow,
  resolveDir,
  resolveGroupBy,
  resolveSort,
} from './date-window'
import { FunnelTable } from './funnel-table'

export const revalidate = 60

interface SearchParams {
  preset?: string
  from?: string
  to?: string
  group_by?: string
  sort?: string
  dir?: string
}

export default async function CreativesReportPage({
  searchParams,
}: {
  // Next.js 16: searchParams is a Promise.
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const window = resolveDateWindow({
    preset: params.preset,
    from: params.from,
    to: params.to,
  })
  const groupBy = resolveGroupBy(params.group_by)
  const sort = resolveSort(params.sort)
  const dir = resolveDir(params.dir)

  const result = await getCreativeFunnelRows({
    from: window.from,
    to: window.to,
    groupBy,
    sort,
    dir,
  })

  const rows = result.success ? result.rows : []
  const closeUnpopulated = rows.every((row) => row.sentToClose === 0)
  const totalConversations = rows.reduce((sum, row) => sum + row.dms, 0)

  return (
    <main
      id="main"
      tabIndex={-1}
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 40px',
        background: '#FAFAFB',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 18,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily:
                  'var(--font-instrument-serif), ui-serif, Georgia, serif',
                fontSize: 32,
                fontWeight: 400,
                margin: 0,
                color: '#161528',
              }}
            >
              Creative funnel
            </h1>
            <p
              style={{
                fontSize: 13,
                color: '#6B6A7E',
                margin: '4px 0 0',
                maxWidth: 560,
                lineHeight: 1.5,
              }}
            >
              Compare ad creatives, sources, and UTM tags by downstream quality
              — not just chat volume. Sort any column, group by source or UTM,
              and click a row to drill into the underlying conversations.
            </p>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: '#6B6A7E',
              textAlign: 'right',
              lineHeight: 1.5,
            }}
            aria-live="polite"
          >
            <div style={{ fontWeight: 700, color: '#161528' }}>
              {window.label}
            </div>
            <div>
              {totalConversations.toLocaleString('en-US')} DMs · refreshed every
              minute
            </div>
          </div>
        </header>

        {!result.success && (
          <section
            role="alert"
            style={{
              background: '#FFF7ED',
              border: '1px solid #FDBA74',
              borderRadius: 8,
              padding: 14,
              marginBottom: 18,
              color: '#7C2D12',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <strong>Could not load the creative funnel report.</strong> Confirm
            the latest migration has run, then refresh.
          </section>
        )}

        <FunnelTable
          rows={rows}
          groupBy={groupBy}
          sort={sort}
          dir={dir}
          preset={window.preset}
          windowFrom={window.from}
          windowTo={window.to}
          closeUnpopulated={closeUnpopulated}
        />
      </div>
    </main>
  )
}
