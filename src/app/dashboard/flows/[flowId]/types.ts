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
