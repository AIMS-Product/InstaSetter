import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getConversation } from '@/lib/services/conversation-viewer'
import { ToolBadge } from '@/components/tool-badge'

export const revalidate = 0

type TimelineItem =
  | {
      kind: 'message'
      id: string
      role: string
      content: string
      createdAt: string
    }
  | {
      kind: 'event'
      id: string
      toolName: string
      toolInput: Record<string, unknown>
      integration: string
      createdAt: string
    }

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function interleave(
  messages: { id: string; role: string; content: string; created_at: string }[],
  events: {
    id: string
    message_id: string | null
    tool_name: string
    tool_input: Record<string, unknown>
    integration: string
    created_at: string
  }[]
): TimelineItem[] {
  const items: TimelineItem[] = []
  for (const m of messages) {
    items.push({
      kind: 'message',
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })
  }
  for (const e of events) {
    items.push({
      kind: 'event',
      id: e.id,
      toolName: e.tool_name,
      toolInput: e.tool_input,
      integration: e.integration,
      createdAt: e.created_at,
    })
  }
  items.sort((a, b) => {
    const diff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    if (diff !== 0) return diff
    // stable: messages before events of same timestamp
    if (a.kind === 'message' && b.kind === 'event') return -1
    if (a.kind === 'event' && b.kind === 'message') return 1
    return 0
  })
  return items
}

interface Params {
  params: Promise<{ id: string }>
}

export default async function ConversationDetailPage({ params }: Params) {
  const { id } = await params
  const conversation = await getConversation(id)
  if (!conversation) notFound()

  const timeline = interleave(conversation.messages, conversation.events)

  return (
    <main
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 40px',
        background: '#FAFAFB',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <Link
            href="/dashboard/conversations"
            style={{
              fontSize: 12,
              color: '#6B6A7E',
              textDecoration: 'none',
            }}
          >
            ← All conversations
          </Link>
          <span style={{ fontSize: 11.5, color: '#6B6A7E' }}>
            Prompt {conversation.prompt_version} · {conversation.status}
          </span>
        </div>

        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily:
                'var(--font-instrument-serif), ui-serif, Georgia, serif',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: -0.3,
              margin: 0,
              color: '#161528',
            }}
          >
            {conversation.contact.name ?? conversation.contact.instagram_handle}
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 6,
              fontSize: 12,
              color: '#6B6A7E',
              flexWrap: 'wrap',
            }}
          >
            <span>{conversation.contact.instagram_handle}</span>
            {conversation.contact.email && (
              <>
                <span>·</span>
                <span>{conversation.contact.email}</span>
              </>
            )}
            <span>·</span>
            <span>Started {formatDate(conversation.started_at)}</span>
          </div>
        </header>

        {conversation.summary && (
          <div
            style={{
              padding: 14,
              background: '#EAE6FE',
              color: '#3B2E72',
              borderRadius: 10,
              fontSize: 13,
              lineHeight: 1.55,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
                marginBottom: 4,
                opacity: 0.8,
              }}
            >
              Summary
            </div>
            {conversation.summary}
          </div>
        )}

        <div
          style={{
            background: 'white',
            border: '1px solid #EEEFF3',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {timeline.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: '#6B6A7E',
                fontSize: 13,
                padding: 24,
              }}
            >
              No messages in this conversation yet.
            </div>
          )}
          {timeline.map((item) => {
            if (item.kind === 'message') {
              const isBot = item.role === 'assistant'
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexDirection: isBot ? 'row' : 'row-reverse',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '78%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      alignItems: isBot ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        padding: '9px 13px',
                        borderRadius: 14,
                        background: isBot ? '#F4F4F7' : '#5E52C7',
                        color: isBot ? '#161528' : 'white',
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.content}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: '#9A99AE',
                      }}
                    >
                      {formatTime(item.createdAt)}
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  paddingLeft: 2,
                }}
              >
                <ToolBadge
                  call={{ name: item.toolName, input: item.toolInput }}
                  tone="block"
                />
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
