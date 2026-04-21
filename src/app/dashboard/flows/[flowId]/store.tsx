'use client'

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { buildPersona } from '@/lib/prompts/sections/persona'
import { buildMessageConstraints } from '@/lib/prompts/sections/message-constraints'
import { deriveBlock } from './directions/b-stage/block-sections'
import {
  normalizePersistedFlowDraft,
  type BotSettings,
  type PersistedFlowDraft,
  type VersionEntry,
  type VersionSnapshot,
} from './draft-persistence'
import { BLOCK_TYPES } from './types'
import type {
  AmbientTrigger,
  BlockType,
  Branch,
  Capture,
  Flow,
  FlowNode,
  Turn,
  Variable,
} from './types'

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
  dirtySincePublish: boolean
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

// Canvas layout for the 8-block flow. Keeps the visual structure the user
// already sees while every other field becomes derived from the real prompt.
const BLOCK_POSITIONS: Record<BlockType, { x: number; y: number }> = {
  opening: { x: 0, y: 0 },
  qualifier: { x: 0, y: 1 },
  objection: { x: 1, y: 1 },
  booking: { x: 0, y: 2 },
  email: { x: 1, y: 2 },
  followup: { x: 2, y: 2 },
  escalation: { x: 2, y: 3 },
  summary: { x: 0, y: 3 },
}

const BLOCK_LABELS: Record<BlockType, string> = {
  opening: 'Opening',
  qualifier: 'Qualifier',
  objection: 'Objection Handler',
  booking: 'Booking Handoff',
  email: 'Email Capture',
  followup: 'Post-Call Follow-up',
  escalation: 'Escalation',
  summary: 'Summary',
}

export function buildInitialFlow(
  brand: string,
  bookingUrl?: string,
  flowId: string = 'ig-organic-dm'
): Flow {
  const nodes: FlowNode[] = BLOCK_TYPES.map((type) => {
    const d = deriveBlock(brand, type, { bookingUrl })
    return {
      id: type,
      type,
      name: BLOCK_LABELS[type],
      goal: d.goal,
      guidance: d.guidance,
      examples: d.examples,
      captures: d.captures,
      branches: d.branches,
      pos: BLOCK_POSITIONS[type],
      rationale: d.rationale,
      ...(d.stat ? { stat: d.stat } : {}),
      examplePairs: d.examplePairs,
      guardrails: d.guardrails,
      blockConfig: d.blockConfig,
      primarySectionIds: d.primarySectionIds,
      globalSectionIds: d.globalSectionIds,
    }
  })
  return {
    id: flowId,
    brand,
    name: 'Instagram DM Flow',
    channel: 'Instagram — Organic DM',
    draft: 1,
    published: 1,
    nodes,
  }
}

export function deriveVariables(
  flow: Flow,
  brand: string,
  bookingUrl?: string
): Variable[] {
  const seen = new Set<string>()
  const captureVars: Variable[] = []
  for (const node of flow.nodes) {
    for (const capture of node.captures) {
      if (seen.has(capture.variable)) continue
      seen.add(capture.variable)
      const [scope, ...keyParts] = capture.variable.split('.')
      if (scope !== 'brand' && scope !== 'contact' && scope !== 'conversation')
        continue
      const key = keyParts.join('.')
      captureVars.push({
        scope,
        key,
        value: null,
        capturedBy: node.id,
        kind: guessKind(key),
      })
    }
  }
  return [
    { scope: 'brand', key: 'brand_name', value: brand, kind: 'text' },
    {
      scope: 'brand',
      key: 'booking_url',
      value: bookingUrl ?? null,
      kind: 'url',
    },
    { scope: 'brand', key: 'timezone', value: null, kind: 'text' },
    ...captureVars,
  ]
}

function guessKind(key: string): Variable['kind'] {
  if (key.includes('email')) return 'email'
  if (key.includes('url')) return 'url'
  if (key.includes('budget') || key.includes('count')) return 'number'
  return 'text'
}

function buildInitialBot(brand: string, bookingUrl?: string): BotSettings {
  return {
    name: '',
    persona: buildPersona(brand),
    messageConstraints: buildMessageConstraints(bookingUrl),
    forbiddenPhrases: [],
  }
}

function buildVersionEntry({
  v,
  status,
  note,
  source,
}: {
  v: number
  status: VersionEntry['status']
  note?: string
  source: Pick<FlowState, 'flow' | 'triggers' | 'bot' | 'variables'>
}): VersionEntry {
  return {
    v,
    at: 'just now',
    note,
    status,
    snapshot: makeVersionSnapshot(source),
  }
}

function buildInitialVersions(
  source: Pick<FlowState, 'flow' | 'triggers' | 'bot' | 'variables'>
): VersionEntry[] {
  return [
    buildVersionEntry({
      v: 1,
      note: 'Seeded from prompt sections',
      status: 'live',
      source,
    }),
  ]
}

export function buildInitialState(
  brand: string,
  bookingUrl?: string,
  flowId: string = 'ig-organic-dm'
): FlowState {
  const flow = buildInitialFlow(brand, bookingUrl, flowId)
  const baseState = {
    flow,
    triggers: [],
    bot: buildInitialBot(brand, bookingUrl),
    variables: deriveVariables(flow, brand, bookingUrl),
    conversation: [],
    simActiveBlock: null,
    simMode: 'fast',
    publishedVersion: 1,
    draftVersion: 1,
    toast: null,
    selectedId: null,
    activeTab: 'design',
    paletteOpen: false,
    dirtySincePublish: false,
  } satisfies Omit<FlowState, 'versions'>

  return {
    ...baseState,
    versions: buildInitialVersions(baseState),
  }
}

// Retained for test compatibility. Prefer `buildInitialState(brand, bookingUrl)` in app code.
export const INITIAL_STATE: FlowState = buildInitialState('VendingPreneurs')

const CONTENT_EDIT_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'update_block_field',
  'add_example',
  'edit_example',
  'delete_example',
  'add_capture',
  'delete_capture',
  'add_branch',
  'edit_branch',
  'delete_branch',
  'move_node',
  'add_node',
  'delete_node',
  'add_trigger',
  'edit_trigger',
  'delete_trigger',
  'update_bot',
])

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function makeVersionSnapshot(
  source: Pick<FlowState, 'flow' | 'triggers' | 'bot' | 'variables'>
): VersionSnapshot {
  return deepCopy({
    flow: source.flow,
    triggers: source.triggers,
    bot: source.bot,
    variables: source.variables,
  })
}

function getStateBookingUrl(
  state: Pick<FlowState, 'variables'>
): string | undefined {
  const bookingUrl = state.variables.find(
    (variable) => variable.scope === 'brand' && variable.key === 'booking_url'
  )?.value

  return typeof bookingUrl === 'string' ? bookingUrl : undefined
}

function reconcileVariables(
  state: Pick<FlowState, 'variables'>,
  flow: Flow
): Variable[] {
  const previousByKey = new Map(
    state.variables.map((variable) => [
      `${variable.scope}.${variable.key}`,
      variable,
    ])
  )

  return deriveVariables(flow, flow.brand, getStateBookingUrl(state)).map(
    (variable) => {
      const previous = previousByKey.get(`${variable.scope}.${variable.key}`)
      if (!previous) return variable

      return {
        ...variable,
        value: previous.value,
      }
    }
  )
}

function withFlow(state: FlowState, flow: Flow): FlowState {
  return {
    ...state,
    flow,
    variables: reconcileVariables(state, flow),
  }
}

function withDraftSnapshot(state: FlowState): FlowState {
  return {
    ...state,
    versions: state.versions.map((version) =>
      version.v === state.draftVersion
        ? {
            ...version,
            snapshot: makeVersionSnapshot(state),
          }
        : version
    ),
  }
}

function replaceNode(
  state: FlowState,
  id: BlockType,
  fn: (n: FlowNode) => FlowNode
): FlowState {
  return withFlow(state, {
    ...state.flow,
    nodes: state.flow.nodes.map((n) => (n.id === id ? fn(n) : n)),
  })
}

export function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'select_block':
      return {
        ...state,
        selectedId: action.id,
        activeTab: action.id ? state.activeTab : 'design',
        paletteOpen: action.id ? false : state.paletteOpen,
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
        ...withFlow(state, {
          ...state.flow,
          nodes: [...state.flow.nodes, action.node],
        }),
        selectedId: action.node.id,
        paletteOpen: false,
      }
    case 'delete_node':
      return {
        ...withFlow(state, {
          ...state.flow,
          nodes: state.flow.nodes
            .filter((n) => n.id !== action.id)
            .map((node) => ({
              ...node,
              branches: node.branches.filter(
                (branch) => branch.target !== action.id
              ),
            })),
        }),
        triggers: state.triggers.filter(
          (trigger) =>
            trigger.whenBlock !== action.id && trigger.target !== action.id
        ),
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
          buildVersionEntry({
            v: nextV,
            note: 'New draft after publish',
            status: 'draft',
            source: state,
          }),
          buildVersionEntry({
            v: state.draftVersion,
            note: 'Published',
            status: 'live',
            source: state,
          }),
          ...state.versions
            .filter((x) => x.v !== state.draftVersion)
            .map((x) =>
              x.status === 'live' ? { ...x, status: 'archived' as const } : x
            ),
        ],
        toast: `Published v${state.draftVersion}`,
        dirtySincePublish: false,
      }
    }
    case 'rollback':
      return (() => {
        const target = state.versions.find((version) => version.v === action.v)
        if (!target) return state

        const restored = deepCopy(target.snapshot)

        return {
          ...state,
          flow: restored.flow,
          triggers: restored.triggers,
          bot: restored.bot,
          variables: restored.variables,
          publishedVersion: action.v,
          versions: state.versions.map((version) => {
            if (version.v === action.v) {
              return {
                ...version,
                status: 'live' as const,
                snapshot: restored,
              }
            }

            if (version.v === state.draftVersion) {
              return {
                ...version,
                status: 'draft' as const,
                snapshot: restored,
              }
            }

            return version.status === 'live'
              ? { ...version, status: 'archived' as const }
              : version
          }),
          toast: `Rolled back to v${action.v}`,
          dirtySincePublish: false,
        }
      })()
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
      return {
        ...state,
        ...normalizePersistedFlowDraft(
          action.state as Partial<PersistedFlowDraft>
        ),
      }
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

export function dirtyTrackingReducer(
  state: FlowState,
  action: Action
): FlowState {
  const next = reducer(state, action)
  if (next === state) return next
  if (CONTENT_EDIT_ACTIONS.has(action.type)) {
    const withSnapshot = withDraftSnapshot(next)
    if (withSnapshot.dirtySincePublish) return withSnapshot
    return { ...withSnapshot, dirtySincePublish: true }
  }
  return next
}

export function FlowStoreProvider({
  children,
  flowId,
  brand,
  bookingUrl,
}: {
  children: ReactNode
  flowId: string
  brand: string
  bookingUrl?: string
}) {
  const initial = useMemo(
    () => buildInitialState(brand, bookingUrl, flowId),
    [brand, bookingUrl, flowId]
  )
  const [state, dispatch] = useReducer(dirtyTrackingReducer, initial)

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
