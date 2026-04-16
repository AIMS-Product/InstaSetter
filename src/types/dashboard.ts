// ---------------------------------------------------------------------------
// Dashboard-specific types — derived/aggregated from database tables
// ---------------------------------------------------------------------------

export type OverviewKPIs = {
  totalConversations: number
  activeConversations: number
  totalLeads: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  bookingRate: number
  totalMessages: number
  messagesLast24h: number
}

export type ConversationVolumePoint = {
  date: string // YYYY-MM-DD
  started: number
  completed: number
}

export type ConversationListItem = {
  id: string
  contactName: string | null
  instagramHandle: string
  status: string
  messageCount: number
  startedAt: string
  lastMessageAt: string
  summary: string | null
}

export type ConversationDetail = {
  id: string
  contactName: string | null
  instagramHandle: string
  status: string
  promptVersion: string
  startedAt: string
  endedAt: string | null
  summary: string | null
  flaggedReason: string | null
  messages: MessageItem[]
}

export type MessageItem = {
  id: string
  role: string
  content: string
  createdAt: string
}

export type LeadListItem = {
  id: string
  instagramHandle: string
  name: string | null
  email: string | null
  qualificationStatus: string
  callBooked: boolean
  machineCount: number | null
  locationType: string | null
  revenueRange: string | null
  calendlySlot: string | null
  callOutcome: string | null
  keyNotes: string | null
  recommendedAction: string | null
  createdAt: string
}

export type ContactListItem = {
  id: string
  instagramHandle: string
  name: string | null
  email: string | null
  phone: string | null
  source: string
  optedOut: boolean
  conversationCount: number
  firstSeenAt: string
  lastMessageAt: string
}

export type ActivityItem = {
  id: string
  integration: string
  action: string
  status: string
  errorMessage: string | null
  instagramHandle: string | null
  createdAt: string
}
