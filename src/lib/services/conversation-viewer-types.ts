// Pure types and client-safe helpers for conversation viewer.
// The server-only fetchers live in ./conversation-viewer.ts.

export interface ConversationHumanReviewPauseSummary {
  reason: string
  severity: 'concern' | 'hostile' | 'compliance'
  requestedAt: string
  requestedBy: 'bot' | 'operator'
}

export interface ConversationListItem {
  id: string
  flow_id: string | null
  status: string
  started_at: string
  ended_at: string | null
  summary: string | null
  message_count: number
  event_count: number
  event_tool_names: string[]
  last_message_at: string | null
  last_message_preview: string | null
  attribution: ConversationAttribution | null
  human_review_pause: ConversationHumanReviewPauseSummary | null
  contact: {
    id: string
    instagram_handle: string
    name: string | null
  }
}

export interface ConversationAttribution {
  source_id: string | null
  source_key: string | null
  channel: string | null
  campaign: string | null
  material: string | null
  entry_action: string | null
  trigger_label: string | null
}

export interface ConversationMessage {
  id: string
  role: string
  content: string
  created_at: string
}

export interface ConversationEvent {
  id: string
  message_id: string | null
  tool_name: string
  tool_input: Record<string, unknown>
  integration: string
  created_at: string
}

export interface ConversationDetail {
  id: string
  flow_id: string | null
  status: string
  prompt_version: string
  summary: string | null
  started_at: string
  ended_at: string | null
  contact: {
    id: string
    instagram_handle: string
    name: string | null
    email: string | null
  }
  attribution: ConversationAttribution | null
  human_review_pause: ConversationHumanReviewPauseSummary | null
  messages: ConversationMessage[]
  events: ConversationEvent[]
}

export type TimelineItem =
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

export function interleave(
  messages: ConversationMessage[],
  events: ConversationEvent[]
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
    if (a.kind === 'message' && b.kind === 'event') return -1
    if (a.kind === 'event' && b.kind === 'message') return 1
    return 0
  })
  return items
}
