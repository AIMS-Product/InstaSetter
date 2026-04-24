import Link from 'next/link'
import { listConversations } from '@/lib/services/conversation-viewer'
import { formatAttributionLabel } from '@/lib/services/marketing-attribution'

export const revalidate = 0

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d2 = Math.floor(h / 24)
  return `${d2}d ago`
}

const STATUS_COLORS: Record<string, { bg: string; ink: string }> = {
  active: { bg: '#E6F4EA', ink: '#1F6B3A' },
  closed: { bg: '#EEEFF3', ink: '#4B4A5E' },
  flagged: { bg: '#F5D9D9', ink: '#8E2A2A' },
}

export default async function ConversationsPage() {
  const conversations = await listConversations(100)

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
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
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
                letterSpacing: -0.4,
                color: '#161528',
              }}
            >
              Conversations
            </h1>
            <p
              style={{
                fontSize: 13,
                color: '#6B6A7E',
                margin: '4px 0 0',
              }}
            >
              {conversations.length} recent · newest first
            </p>
          </div>
          <Link
            href="/dashboard"
            style={{
              fontSize: 12,
              color: '#6B6A7E',
              textDecoration: 'none',
            }}
          >
            ← Dashboard
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div
            style={{
              padding: 48,
              background: 'white',
              border: '1px solid #EEEFF3',
              borderRadius: 12,
              textAlign: 'center',
              color: '#6B6A7E',
              fontSize: 14,
            }}
          >
            No conversations yet. Bot replies will appear here as they come in.
          </div>
        ) : (
          <div
            style={{
              background: 'white',
              border: '1px solid #EEEFF3',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {conversations.map((c, i) => {
              const statusStyle =
                STATUS_COLORS[c.status] ?? STATUS_COLORS.closed!
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/conversations/${c.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'minmax(160px, 1fr) minmax(200px, 2fr) minmax(160px, 1.2fr) 80px 70px 90px',
                    gap: 16,
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderTop: i === 0 ? 'none' : '1px solid #EEEFF3',
                    textDecoration: 'none',
                    color: '#161528',
                    transition: 'background 120ms',
                  }}
                  className="conv-row"
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.contact.name ?? c.contact.instagram_handle}
                    </div>
                    {c.contact.name && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: '#6B6A7E',
                          marginTop: 1,
                        }}
                      >
                        {c.contact.instagram_handle}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: c.attribution ? '#3B2E72' : '#8A8A9B',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatAttributionLabel(
                      c.attribution && {
                        sourceKey: c.attribution.source_key ?? undefined,
                        channel: c.attribution.channel ?? undefined,
                        campaign: c.attribution.campaign ?? undefined,
                        material: c.attribution.material ?? undefined,
                        entryAction: c.attribution.entry_action ?? undefined,
                        triggerLabel: c.attribution.trigger_label ?? undefined,
                      }
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: '#4B4A5E',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.last_message_preview ?? '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: statusStyle.bg,
                      color: statusStyle.ink,
                      fontWeight: 600,
                      textAlign: 'center',
                      width: 'fit-content',
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                    }}
                  >
                    {c.status}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: '#6B6A7E',
                      textAlign: 'right',
                    }}
                  >
                    {c.message_count} msg
                    {c.event_count > 0 && (
                      <span
                        style={{ color: '#3B2E72', fontWeight: 600 }}
                      >{` · ${c.event_count} evt`}</span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: '#6B6A7E',
                      textAlign: 'right',
                    }}
                  >
                    {timeAgo(c.last_message_at ?? c.started_at)}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
