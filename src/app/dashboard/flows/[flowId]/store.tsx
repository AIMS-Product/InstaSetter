'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { FLOW, VARIABLES, CONVERSATION } from './shared-data'
import type {
  BlockType,
  Branch,
  Capture,
  Flow,
  FlowNode,
  Turn,
  Variable,
} from './types'

export interface AmbientTrigger {
  id: string
  name: string
  whenBlock: BlockType
  afterMinutes: number
  cancelOnReply: boolean
  mode: 'in_window_only' | 'human_agent_tag' | 'wait_for_next_window'
  target: BlockType
}

export interface VersionEntry {
  v: number
  at: string
  note?: string
  status: 'draft' | 'live' | 'archived'
}

export interface BotSettings {
  name: string
  persona: string
  messageConstraints: string
  forbiddenPhrases: string[]
}

export interface FlowState {
  flow: Flow
  triggers: AmbientTrigger[]
  bot: BotSettings
  variables: Variable[]
  conversation: Turn[]
  simActiveBlock: BlockType | null
  simMode: 'fast' | 'real' | 'cached'
  versions: VersionEntry[]
  publishedVersion: number
  draftVersion: number
  toast: string | null
  selectedId: BlockType | null
  activeTab: 'design' | 'routing' | 'triggers' | 'data'
  paletteOpen: boolean
}

type Action =
  | { type: 'select_block'; id: BlockType | null }
  | { type: 'set_tab'; tab: FlowState['activeTab'] }
  | {
      type: 'update_block_field'
      id: BlockType
      field: 'goal' | 'guidance' | 'name'
      value: string
    }
  | { type: 'add_example'; id: BlockType; text: string }
  | { type: 'edit_example'; id: BlockType; index: number; text: string }
  | { type: 'delete_example'; id: BlockType; index: number }
  | { type: 'add_capture'; id: BlockType; capture: Capture }
  | { type: 'delete_capture'; id: BlockType; variable: string }
  | { type: 'add_branch'; id: BlockType; branch: Branch }
  | {
      type: 'edit_branch'
      id: BlockType
      branchId: string
      patch: Partial<Branch>
    }
  | { type: 'delete_branch'; id: BlockType; branchId: string }
  | { type: 'move_node'; id: BlockType; pos: { x: number; y: number } }
  | { type: 'add_node'; node: FlowNode }
  | { type: 'delete_node'; id: BlockType }
  | { type: 'sim_reset' }
  | { type: 'sim_send'; text: string }
  | { type: 'sim_receive'; turn: Turn }
  | { type: 'sim_set_mode'; mode: FlowState['simMode'] }
  | { type: 'sim_set_active'; id: BlockType | null }
  | { type: 'publish' }
  | { type: 'rollback'; v: number }
  | { type: 'toast'; msg: string | null }
  | { type: 'update_bot'; patch: Partial<BotSettings> }
  | { type: 'add_trigger'; trigger: AmbientTrigger }
  | { type: 'edit_trigger'; id: string; patch: Partial<AmbientTrigger> }
  | { type: 'delete_trigger'; id: string }
  | { type: 'toggle_palette' }
  | { type: 'hydrate'; state: Partial<FlowState> }

const initialBot: BotSettings = {
  name: 'Mike',
  persona:
    'Mike is a calm, direct appointment setter for a vending-machine business. He talks like a text, not a brochure. He\u2019s warm, doesn\u2019t force questions, and never sounds like a bot.',
  messageConstraints: 'MAXIMUM 2 sentences per reply. One question at a time.',
  forbiddenPhrases: ['just popping in', 'Still with me?'],
}

const initialVersions: VersionEntry[] = [
  {
    v: 13,
    at: '2 min ago',
    note: 'Objection handler: stronger acknowledgement',
    status: 'draft',
  },
  {
    v: 12,
    at: '2 days ago',
    note: 'Shipped post-shadow parity',
    status: 'live',
  },
  { v: 11, at: '5 days ago', note: 'Booking link copy', status: 'archived' },
  {
    v: 10,
    at: '9 days ago',
    note: 'Added Follow-up block',
    status: 'archived',
  },
  { v: 9, at: '12 days ago', note: 'Seed from setter-v2', status: 'archived' },
]

export const INITIAL_STATE: FlowState = {
  flow: FLOW,
  triggers: [
    {
      id: 't1',
      name: '24h nudge after booking link',
      whenBlock: 'booking',
      afterMinutes: 60 * 24,
      cancelOnReply: true,
      mode: 'in_window_only',
      target: 'followup',
    },
  ],
  bot: initialBot,
  variables: VARIABLES,
  conversation: CONVERSATION,
  simActiveBlock: 'qualifier',
  simMode: 'fast',
  versions: initialVersions,
  publishedVersion: 12,
  draftVersion: 13,
  toast: null,
  selectedId: 'qualifier',
  activeTab: 'design',
  paletteOpen: false,
}

function replaceNode(
  state: FlowState,
  id: BlockType,
  fn: (n: FlowNode) => FlowNode
): FlowState {
  return {
    ...state,
    flow: {
      ...state.flow,
      nodes: state.flow.nodes.map((n) => (n.id === id ? fn(n) : n)),
    },
  }
}

export function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'select_block':
      return {
        ...state,
        selectedId: action.id,
        activeTab: action.id ? state.activeTab : 'design',
      }
    case 'set_tab':
      return { ...state, activeTab: action.tab }
    case 'update_block_field':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        [action.field]: action.value,
      }))
    case 'add_example':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        examples: [...n.examples, action.text],
      }))
    case 'edit_example':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        examples: n.examples.map((e, i) =>
          i === action.index ? action.text : e
        ),
      }))
    case 'delete_example':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        examples: n.examples.filter((_, i) => i !== action.index),
      }))
    case 'add_capture':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        captures: [...n.captures, action.capture],
      }))
    case 'delete_capture':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        captures: n.captures.filter((c) => c.variable !== action.variable),
      }))
    case 'add_branch':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        branches: [...n.branches, action.branch],
      }))
    case 'edit_branch':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        branches: n.branches.map((b) =>
          b.id === action.branchId ? { ...b, ...action.patch } : b
        ),
      }))
    case 'delete_branch':
      return replaceNode(state, action.id, (n) => ({
        ...n,
        branches: n.branches.filter((b) => b.id !== action.branchId),
      }))
    case 'move_node':
      return replaceNode(state, action.id, (n) => ({ ...n, pos: action.pos }))
    case 'add_node':
      return {
        ...state,
        flow: { ...state.flow, nodes: [...state.flow.nodes, action.node] },
        selectedId: action.node.id,
      }
    case 'delete_node':
      return {
        ...state,
        flow: {
          ...state.flow,
          nodes: state.flow.nodes.filter((n) => n.id !== action.id),
        },
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      }
    case 'sim_reset':
      return {
        ...state,
        conversation: [],
        simActiveBlock: state.flow.nodes[0]?.id ?? null,
      }
    case 'sim_send':
      return {
        ...state,
        conversation: [
          ...state.conversation,
          { role: 'prospect', text: action.text, t: 'now' },
        ],
      }
    case 'sim_receive':
      return {
        ...state,
        conversation: [...state.conversation, action.turn],
        simActiveBlock: action.turn.block ?? state.simActiveBlock,
      }
    case 'sim_set_mode':
      return { ...state, simMode: action.mode }
    case 'sim_set_active':
      return { ...state, simActiveBlock: action.id }
    case 'publish': {
      const nextV = state.draftVersion + 1
      return {
        ...state,
        publishedVersion: state.draftVersion,
        draftVersion: nextV,
        versions: [
          {
            v: nextV,
            at: 'just now',
            note: 'New draft after publish',
            status: 'draft',
          },
          {
            v: state.draftVersion,
            at: 'just now',
            note: 'Published',
            status: 'live',
          },
          ...state.versions
            .filter((x) => x.v !== state.draftVersion)
            .map((x) =>
              x.status === 'live' ? { ...x, status: 'archived' as const } : x
            ),
        ],
        toast: `Published v${state.draftVersion}`,
      }
    }
    case 'rollback':
      return {
        ...state,
        publishedVersion: action.v,
        versions: state.versions.map((x) => ({
          ...x,
          status:
            x.v === action.v
              ? ('live' as const)
              : x.status === 'live'
                ? 'archived'
                : x.status,
        })),
        toast: `Rolled back to v${action.v}`,
      }
    case 'toast':
      return { ...state, toast: action.msg }
    case 'update_bot':
      return { ...state, bot: { ...state.bot, ...action.patch } }
    case 'add_trigger':
      return { ...state, triggers: [...state.triggers, action.trigger] }
    case 'edit_trigger':
      return {
        ...state,
        triggers: state.triggers.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t
        ),
      }
    case 'delete_trigger':
      return {
        ...state,
        triggers: state.triggers.filter((t) => t.id !== action.id),
      }
    case 'toggle_palette':
      return { ...state, paletteOpen: !state.paletteOpen }
    case 'hydrate':
      return { ...state, ...action.state }
    default:
      return state
  }
}

interface Ctx {
  state: FlowState
  dispatch: React.Dispatch<Action>
  selectedBlock: FlowNode | null
}

const FlowStore = createContext<Ctx | null>(null)

const STORAGE_KEY = 'instasetter.flow-builder.v1'
const PERSISTED_KEYS: Array<keyof FlowState> = [
  'flow',
  'triggers',
  'bot',
  'versions',
  'publishedVersion',
  'draftVersion',
  'variables',
]

function loadPersisted(): Partial<FlowState> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<FlowState>
    return parsed
  } catch {
    return null
  }
}

function savePersisted(state: FlowState): void {
  if (typeof window === 'undefined') return
  try {
    const subset: Partial<FlowState> = {}
    for (const k of PERSISTED_KEYS) {
      // @ts-expect-error index by union type
      subset[k] = state[k]
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subset))
  } catch {
    /* noop */
  }
}

export function FlowStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted) dispatch({ type: 'hydrate', state: persisted })
  }, [])

  // Debounced save on change
  useEffect(() => {
    const t = window.setTimeout(() => savePersisted(state), 400)
    return () => window.clearTimeout(t)
  }, [state])

  const selectedBlock = useMemo(
    () =>
      state.selectedId
        ? (state.flow.nodes.find((n) => n.id === state.selectedId) ?? null)
        : null,
    [state.flow.nodes, state.selectedId]
  )
  const value = useMemo(
    () => ({ state, dispatch, selectedBlock }),
    [state, selectedBlock]
  )
  return <FlowStore.Provider value={value}>{children}</FlowStore.Provider>
}

export function useFlowStore(): Ctx {
  const ctx = useContext(FlowStore)
  if (!ctx)
    throw new Error('useFlowStore must be used within FlowStoreProvider')
  return ctx
}

export function useFlowState(): FlowState {
  return useFlowStore().state
}

export function useFlowDispatch(): React.Dispatch<Action> {
  return useFlowStore().dispatch
}

/** Stable actions bound to dispatch. */
export function useFlowActions() {
  const dispatch = useFlowDispatch()
  return useMemo(
    () => ({
      select: (id: BlockType | null) => dispatch({ type: 'select_block', id }),
      setTab: (tab: FlowState['activeTab']) =>
        dispatch({ type: 'set_tab', tab }),
      updateBlock: (
        id: BlockType,
        field: 'goal' | 'guidance' | 'name',
        value: string
      ) => dispatch({ type: 'update_block_field', id, field, value }),
      addExample: (id: BlockType, text: string) =>
        dispatch({ type: 'add_example', id, text }),
      editExample: (id: BlockType, index: number, text: string) =>
        dispatch({ type: 'edit_example', id, index, text }),
      deleteExample: (id: BlockType, index: number) =>
        dispatch({ type: 'delete_example', id, index }),
      addCapture: (id: BlockType, capture: Capture) =>
        dispatch({ type: 'add_capture', id, capture }),
      deleteCapture: (id: BlockType, variable: string) =>
        dispatch({ type: 'delete_capture', id, variable }),
      addBranch: (id: BlockType, branch: Branch) =>
        dispatch({ type: 'add_branch', id, branch }),
      editBranch: (id: BlockType, branchId: string, patch: Partial<Branch>) =>
        dispatch({ type: 'edit_branch', id, branchId, patch }),
      deleteBranch: (id: BlockType, branchId: string) =>
        dispatch({ type: 'delete_branch', id, branchId }),
      moveNode: (id: BlockType, pos: { x: number; y: number }) =>
        dispatch({ type: 'move_node', id, pos }),
      addNode: (node: FlowNode) => dispatch({ type: 'add_node', node }),
      deleteNode: (id: BlockType) => dispatch({ type: 'delete_node', id }),
      simReset: () => dispatch({ type: 'sim_reset' }),
      simSend: (text: string) => dispatch({ type: 'sim_send', text }),
      simReceive: (turn: Turn) => dispatch({ type: 'sim_receive', turn }),
      simSetMode: (mode: FlowState['simMode']) =>
        dispatch({ type: 'sim_set_mode', mode }),
      simSetActive: (id: BlockType | null) =>
        dispatch({ type: 'sim_set_active', id }),
      publish: () => dispatch({ type: 'publish' }),
      rollback: (v: number) => dispatch({ type: 'rollback', v }),
      toast: (msg: string | null) => dispatch({ type: 'toast', msg }),
      updateBot: (patch: Partial<BotSettings>) =>
        dispatch({ type: 'update_bot', patch }),
      addTrigger: (trigger: AmbientTrigger) =>
        dispatch({ type: 'add_trigger', trigger }),
      editTrigger: (id: string, patch: Partial<AmbientTrigger>) =>
        dispatch({ type: 'edit_trigger', id, patch }),
      deleteTrigger: (id: string) => dispatch({ type: 'delete_trigger', id }),
      togglePalette: () => dispatch({ type: 'toggle_palette' }),
      hydrate: (s: Partial<FlowState>) =>
        dispatch({ type: 'hydrate', state: s }),
    }),
    [dispatch]
  )
}
