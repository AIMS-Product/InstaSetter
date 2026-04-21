export type BlockType =
  | 'opening'
  | 'qualifier'
  | 'objection'
  | 'booking'
  | 'email'
  | 'followup'
  | 'escalation'
  | 'summary'

export interface BlockCatalogEntry {
  type: BlockType
  label: string
  blurb: string
  hue: number
}

export interface Capture {
  label: string
  variable: string
}

export interface Branch {
  id: string
  label: string
  target: BlockType
  when: string
}

export interface Guardrail {
  id: string
  text: string
  why: string
  source: string
}

export interface ExamplePair {
  prospect?: string
  good?: string
  bad?: string
}

export interface OpeningConfig {
  kind: 'opening'
  firstQuestion: string
  supportedMarkets: string[]
  outOfAreaScript: string
}

export interface QualifierEntry {
  priority: number
  key: 'location' | 'motivation' | 'experience' | 'capital' | 'timeline'
  label: string
  ask: string
  rules: string[]
  locked: boolean
}

export interface QualifierThreshold {
  name: 'hot' | 'warm' | 'cold'
  criteria: string
}

export interface QualifierConfig {
  kind: 'qualifier'
  minToBook: number
  qualifiers: QualifierEntry[]
  thresholds: QualifierThreshold[]
}

export interface ObjectionHandler {
  type:
    | 'timing'
    | 'no_capital'
    | 'location'
    | 'needs_to_think'
    | 'price'
    | 'bad_credit'
    | 'trust'
    | 'spouse_approval'
    | 'already_has_machines'
  label: string
  occurrences: number
  resolutionPct: number
  opener: string
  followUps: string[]
}

export interface ObjectionConfig {
  kind: 'objection'
  structure: readonly ['acknowledge', 'probe', 'respond']
  handlers: ObjectionHandler[]
}

export interface BookingConfig {
  kind: 'booking'
  mirrorTemplate: string
  linkPattern: string
  emailAskCombined: string
  reengagementAfterHours: number
  maxLinkSends: number
  reengagementScript: string
}

export interface EmailTrigger {
  priority: 'primary' | 'backup' | 'secondary'
  when: string
  script: string
  mandatory: boolean
}

export interface EmailConfig {
  kind: 'email'
  triggers: EmailTrigger[]
  confirmationScript: string
  hesitationScript: string
}

export interface FollowupConfig {
  kind: 'followup'
  delayHours: number
  script: string
  outcomes: string[]
}

export interface EscalationConfig {
  kind: 'escalation'
  triggers: string[]
  handoffScript: string
  captureMethod: string
}

export interface SummaryField {
  key: string
  label: string
  notes: string
}

export interface SummaryConfig {
  kind: 'summary'
  triggerWords: string[]
  requiredFields: SummaryField[]
  optionalFields: SummaryField[]
  mirrorTemplate: string
}

export type BlockConfig =
  | OpeningConfig
  | QualifierConfig
  | ObjectionConfig
  | BookingConfig
  | EmailConfig
  | FollowupConfig
  | EscalationConfig
  | SummaryConfig

export interface FlowNode {
  id: BlockType
  type: BlockType
  name: string
  goal: string
  guidance: string
  examples: string[]
  captures: Capture[]
  branches: Branch[]
  pos: { x: number; y: number }
  rationale?: string[]
  stat?: string
  examplePairs?: ExamplePair[]
  guardrails?: Guardrail[]
  blockConfig?: BlockConfig
  primarySectionIds?: string[]
  globalSectionIds?: string[]
  editable?: 'locked' | 'local-only'
}

export interface Flow {
  id: string
  brand: string
  name: string
  channel: string
  draft: number
  published: number
  nodes: FlowNode[]
}

export interface Variable {
  scope: 'brand' | 'contact' | 'conversation'
  key: string
  value: string | number | null
  capturedBy?: BlockType
  kind: 'text' | 'url' | 'email' | 'number'
}

export interface SimToolCall {
  name: string
  input: Record<string, unknown>
}

export interface Turn {
  role: 'prospect' | 'bot' | 'system'
  text: string
  block?: BlockType
  t: string
  toolCalls?: SimToolCall[]
  error?: boolean
}

export type DirectionId = 'a' | 'b' | 'c'
export type PageId = 'flow' | 'runs' | 'variables' | 'versions' | 'bot'

export interface Palette {
  bg: string
  panel: string
  ink: string
  ink2: string
  ink3: string
  line: string
  lineSoft: string
  accent: string
  accentSoft: string
  accentInk: string
  sel: string
  highlight?: string
  serif: boolean
}
