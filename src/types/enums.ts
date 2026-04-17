// ---------------------------------------------------------------------------
// Domain enums — single source of truth for all status/role/source unions
// ---------------------------------------------------------------------------

// Conversation lifecycle
export const CONVERSATION_STATUSES = [
  'active',
  'completed',
  'stalled',
  'escalated',
] as const
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]

// Message authorship
export const MESSAGE_ROLES = ['user', 'assistant'] as const
export type MessageRole = (typeof MESSAGE_ROLES)[number]

// Lead temperature. `out_of_area` is a hard disqualification used when the
// prospect's location is outside our supported markets (US + Canada only).
export const QUALIFICATION_STATUSES = [
  'hot',
  'warm',
  'cold',
  'out_of_area',
] as const
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number]

// How the contact entered the funnel
export const CONTACT_SOURCES = [
  'keyword',
  'broadcast',
  'organic_dm',
  'comment',
] as const
export type ContactSource = (typeof CONTACT_SOURCES)[number]

// Third-party integrations
export const INTEGRATION_NAMES = [
  'close_crm',
  'customerio',
  'slack',
  'calendly',
  'inro',
  'sendpulse',
] as const
export type IntegrationName = (typeof INTEGRATION_NAMES)[number]

// Integration event delivery status
export const INTEGRATION_EVENT_STATUSES = [
  'pending',
  'success',
  'failed',
] as const
export type IntegrationEventStatus = (typeof INTEGRATION_EVENT_STATUSES)[number]

// Post-call disposition
export const CALL_OUTCOMES = [
  'showed_up',
  'no_show',
  'closed',
  'not_qualified',
  'needs_follow_up',
] as const
export type CallOutcome = (typeof CALL_OUTCOMES)[number]

// ---------------------------------------------------------------------------
// Instagram / prompt constants
// ---------------------------------------------------------------------------

export const PROMPT_VERSION = 'setter-v2' as const
export const FIRST_MESSAGE_LIMIT = 300 as const
export const MESSAGE_LIMIT = 2000 as const

// Conversations with no activity for this many hours are considered stale.
// A stale conversation gets auto-summarized and closed when the prospect
// sends a new message, so a fresh conversation can begin.
export const STALE_CONVERSATION_HOURS = 4 as const
