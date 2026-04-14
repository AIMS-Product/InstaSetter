// ---------------------------------------------------------------------------
// Shared types for the conversation analysis pipeline
// ---------------------------------------------------------------------------

// --- Raw Instagram export format ---

export interface RawInstagramMessage {
  sender_name: string
  timestamp_ms: number
  content?: string
  share?: { link: string; share_text?: string }
  photos?: { uri: string; creation_timestamp: number }[]
  videos?: { uri: string; creation_timestamp: number }[]
  audio_files?: { uri: string; creation_timestamp: number }[]
  is_geoblocked_for_viewer: boolean
  is_unsent_image_by_messenger_kid_parent?: boolean
}

export interface RawInstagramConversation {
  participants: { name: string }[]
  messages: RawInstagramMessage[]
  title: string
  is_still_participant: boolean
  thread_path: string
  magic_words: unknown[]
}

// --- Phase 1: Normalized output ---

export interface NormalizedMessage {
  sender: string
  timestamp: string // ISO 8601
  content: string
  isOwner: boolean
  hasLink: boolean
  linkUrl?: string
}

export type OpenerType =
  | 'private_reply'
  | 'prospect_first'
  | 'owner_first'
  | 'system'
export type Tier = 'skip' | 'shallow' | 'deep'

export interface ConversationMeta {
  id: string
  title: string
  participantCount: number
  participantNames: string[]
  messageCount: number
  ownerMessageCount: number
  prospectMessageCount: number
  systemMessageCount: number
  substantiveMessageCount: number
  firstMessageTimestamp: string
  lastMessageTimestamp: string
  durationDays: number

  // Heuristic signals
  openerType: OpenerType
  hasBookingLink: boolean
  bookingLinkType?: 'calendly' | 'oncehub' | 'clkmg'
  hasEmail: boolean
  extractedEmails: string[]
  hasCantReceive: boolean
  hasOptOut: boolean
  mentionsMasterclass: boolean
  mentionsPartnerCall: boolean
  mentionsCredit: boolean
  mentionsLocation: boolean

  // Processing tier
  tier: Tier
}

export interface NormalizedConversation {
  meta: ConversationMeta
  messages: NormalizedMessage[]
}

// --- Phase 2: Classification ---

export type ConversationOutcome =
  | 'booked_call'
  | 'email_captured'
  | 'qualified_warm'
  | 'masterclass_delivered'
  | 'objection_unresolved'
  | 'went_silent'
  | 'opted_out'
  | 'spam_or_irrelevant'
  | 'too_short'

export type EngagementLevel = 'high' | 'medium' | 'low' | 'none'

export type ConversationStage =
  | 'opener_only'
  | 'rapport'
  | 'qualification'
  | 'objection_handling'
  | 'value_delivery'
  | 'call_booking'
  | 'post_booking'
  | 'follow_up'

export interface ClassificationResult {
  conversationId: string
  outcome: ConversationOutcome
  engagementLevel: EngagementLevel
  stageReached: ConversationStage
  prospectTemperature: 'hot' | 'warm' | 'cold'
  objectionTypes: string[]
  dropoffPoint: string | null
  tags: string[]
}

// --- Phase 3: Deep analysis ---

export interface PromptSectionObservation {
  section: string
  observation: string
  suggestedImprovement?: string
}

export interface ToneAnalysis {
  mikeTone: string
  prospectTone: string
  toneMatchQuality: 'matched' | 'mismatched' | 'partially_matched'
  toneNotes: string
}

export interface KeyMoment {
  moment: string
  mikeSaid: string
  prospectSaid: string
  impact: 'positive' | 'negative' | 'neutral'
  lesson: string
}

export interface DeepAnalysisResult {
  conversationId: string
  classification: ClassificationResult
  conversationFlow: string[]
  effectiveTechniques: string[]
  ineffectiveTechniques: string[]
  neverSay: string[]
  missedOpportunities: string[]
  toneAnalysis: ToneAnalysis
  promptSections: PromptSectionObservation[]
  goldenPathScore: number
  keyMoments: KeyMoment[]
  rawNotes: string
}

// --- Phase 4: Synthesis ---

export interface GoldenPath {
  pattern: string
  exampleConversationIds: string[]
  frequency: number
  avgMessagesToBooking: number
}

export interface AntiPattern {
  pattern: string
  exampleConversationIds: string[]
  frequency: number
  stageWhereItFails: ConversationStage
}

export interface ObjectionAnalysis {
  objectionType: string
  frequency: number
  resolutionRate: number
  bestResponses: string[]
  worstResponses: string[]
}

export interface PromptRecommendation {
  section: string
  currentBehavior: string
  suggestedChange: string
  evidence: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface PatternReport {
  generatedAt: string
  totalConversations: number
  outcomeDistribution: Record<string, number>
  engagementDistribution: Record<string, number>
  stageDistribution: Record<string, number>
  goldenPaths: GoldenPath[]
  antiPatterns: AntiPattern[]
  objectionAnalysis: ObjectionAnalysis[]
  promptRecommendations: PromptRecommendation[]
}
