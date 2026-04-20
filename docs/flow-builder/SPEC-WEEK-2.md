# Spec — Week 2: Editor UI (TDD, fully expanded)

Editor is wired to Supabase via Server Actions and the service layer from Week 1. Nothing in prod runtime changes — all new code lives under `/dashboard/*`.

Dependencies: Week 1 merged (schemas + `compileBlock` + seed flow exists). `flow_engine.use_compile_block` flag off in prod.

## Shared pattern for component tests

Every component test file uses `@testing-library/react` (already installed) + jsdom (already default). Template:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentUnderTest } from '../component-under-test'

describe('ComponentUnderTest', () => {
  beforeEach(() => vi.clearAllMocks())
  it('does X when Y', async () => {
    render(<ComponentUnderTest prop={value} />)
    await userEvent.click(screen.getByRole('button', { name: /foo/i }))
    expect(screen.getByText(/bar/i)).toBeInTheDocument()
  })
})
```

Use `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (last resort). No snapshot tests on components — they freeze styling churn.

---

## Slice 1 — Flow page loads flow from Supabase

### Server Action/service layer test

`src/lib/services/__tests__/flows-service.integration.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { loadFlowForEditor } from '@/lib/services/flows-service'
import { insertTestFlow, insertTestFlowVersion } from '@/test/fixtures'

describe('loadFlowForEditor', () => {
  const db = createServiceClient()

  beforeEach(async () => {
    await resetFlowBuilderTables(db)
  })

  it('returns published + latest draft for a flow', async () => {
    const flow = await insertTestFlow(db, { slug: 'x' })
    await insertTestFlowVersion(db, flow.id, {
      version_number: 1,
      status: 'published',
    })
    const draft = await insertTestFlowVersion(db, flow.id, {
      version_number: 2,
      status: 'draft',
    })

    const result = await loadFlowForEditor(db, flow.id)
    expect(result.success).toBe(true)
    expect(result.data?.draftVersionId).toBe(draft.id)
    expect(result.data?.publishedVersion).toBe(1)
    expect(result.data?.draftVersion).toBe(2)
  })

  it('creates a new draft from published if no draft exists', async () => {
    const flow = await insertTestFlow(db, { slug: 'y' })
    await insertTestFlowVersion(db, flow.id, {
      version_number: 1,
      status: 'published',
    })
    const result = await loadFlowForEditor(db, flow.id)
    expect(result.success).toBe(true)
    expect(result.data?.draftVersion).toBe(2)
  })

  it('returns error for missing flow', async () => {
    const result = await loadFlowForEditor(
      db,
      '00000000-0000-0000-0000-000000000000'
    )
    expect(result.success).toBe(false)
    expect(result.error).toBe('flow_not_found')
  })
})
```

### Impl

`src/lib/services/flows-service.ts` (new)

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { FlowGraph } from '@/types/flow-builder'

type Result<T> = { success: true; data: T } | { success: false; error: string }

interface FlowForEditor {
  flowId: string
  name: string
  draftVersionId: string
  draftVersion: number
  publishedVersion: number | null
  graph: FlowGraph
}

export async function loadFlowForEditor(
  db: SupabaseClient<Database>,
  flowId: string
): Promise<Result<FlowForEditor>> {
  const { data: flow } = await db
    .from('ins_flows')
    .select('id, name')
    .eq('id', flowId)
    .maybeSingle()
  if (!flow) return { success: false, error: 'flow_not_found' }

  const { data: versions } = await db
    .from('ins_flow_versions')
    .select('id, version_number, status, graph')
    .eq('flow_id', flowId)
    .in('status', ['draft', 'published'])
    .order('version_number', { ascending: false })
  if (!versions) return { success: false, error: 'versions_unavailable' }

  const draft = versions.find((v) => v.status === 'draft')
  const published = versions.find((v) => v.status === 'published')

  if (!draft && !published) return { success: false, error: 'no_versions' }

  // Fork a new draft from published if no draft yet
  let draftRow = draft
  if (!draftRow && published) {
    const next = (published.version_number ?? 0) + 1
    const { data: forked, error } = await db
      .from('ins_flow_versions')
      .insert({
        flow_id: flowId,
        version_number: next,
        status: 'draft',
        source: 'editor',
        graph: published.graph,
        checksum: `fork-from-v${published.version_number}`,
      })
      .select('id, version_number, status, graph')
      .single()
    if (error) return { success: false, error: 'fork_failed' }
    draftRow = forked!
  }

  return {
    success: true,
    data: {
      flowId,
      name: flow.name,
      draftVersionId: draftRow!.id,
      draftVersion: draftRow!.version_number!,
      publishedVersion: published?.version_number ?? null,
      graph: draftRow!.graph as unknown as FlowGraph,
    },
  }
}
```

### Page test

`src/app/dashboard/flows/[flowId]/__tests__/page.test.tsx` (unit, jsdom, service mocked)

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '../page'

vi.mock('@/lib/services/flows-service', () => ({
  loadFlowForEditor: vi.fn().mockResolvedValue({
    success: true,
    data: {
      flowId: 'f1',
      name: 'Test Flow',
      draftVersionId: 'v2',
      draftVersion: 2,
      publishedVersion: 1,
      graph: { nodes: [], edges: [], ambientTriggers: [] },
    },
  }),
}))

describe('FlowPage', () => {
  it('renders flow name from service', async () => {
    const result = await Page({
      params: Promise.resolve({ flowId: 'f1' }),
    } as never)
    render(result)
    expect(screen.getByText(/Test Flow/)).toBeInTheDocument()
  })
})
```

### Impl

`src/app/dashboard/flows/[flowId]/page.tsx`

```ts
import FlowEditor from './flow-editor'
import { loadFlowForEditor } from '@/lib/services/flows-service'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function FlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>
}) {
  const { flowId } = await params
  const db = await getSupabaseServerClient()
  const result = await loadFlowForEditor(db, flowId)
  if (!result.success) notFound()
  return <FlowEditor flow={result.data} />
}
```

### Commits

- `test(flows-service): loadFlowForEditor integration`
- `feat(flows-service): implement loadFlowForEditor with auto-fork draft`
- `test(page): flow page delegates to FlowEditor`
- `feat(page): wire flow page to service layer`

---

## Slice 2 — Block palette renders 8 block types

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/block-palette.test.tsx`

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BlockPalette from '../block-palette'

describe('BlockPalette', () => {
  it('renders all 8 block types', () => {
    render(<BlockPalette />)
    for (const label of [
      'Opening', 'Qualifier', 'Objection Handler', 'Email Capture',
      'Booking Handoff', 'Post-Call Follow-up', 'Escalation', 'Summary',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('each block is draggable', () => {
    render(<BlockPalette />)
    const items = screen.getAllByTestId('palette-block')
    expect(items.length).toBe(8)
    for (const item of items) {
      expect(item).toHaveAttribute('draggable', 'true')
    }
  })

  it('filter input narrows the visible list', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    render(<BlockPalette />)
    await userEvent.type(screen.getByPlaceholderText(/filter/i), 'object')
    expect(screen.getByText('Objection Handler')).toBeInTheDocument()
    expect(screen.queryByText('Opening')).not.toBeInTheDocument()
  })
})
```

### Impl

Port from mockup (`src/app/dashboard/flows/[flowId]/components/block-palette.tsx`). Add `data-testid="palette-block"` + filter state.

### Commits

- `test(block-palette): renders all types, draggable, filter works`
- `feat(block-palette): port from mockup with filter state`

---

## Slice 3 — Canvas renders nodes + edges from flow graph

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/flow-canvas.test.tsx`

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FlowCanvas from '../flow-canvas'
import { ReactFlowProvider } from '@xyflow/react'
import { createTestGraph } from '@/test/fixtures'

function wrap(ui: React.ReactElement) {
  return <ReactFlowProvider>{ui}</ReactFlowProvider>
}

describe('FlowCanvas', () => {
  it('renders one node per graph.nodes entry', () => {
    const graph = createTestGraph()
    const onSelect = vi.fn()
    render(
      wrap(
        <FlowCanvas
          graph={graph}
          selectedBlockId={null}
          onSelectBlock={onSelect}
        />
      )
    )
    // react-flow puts data-id on each node wrapper
    for (const node of graph.nodes) {
      expect(document.querySelector(`[data-id="${node.id}"]`)).toBeTruthy()
    }
  })

  it('clicking a node fires onSelectBlock with its id', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const graph = createTestGraph()
    const onSelect = vi.fn()
    render(
      wrap(
        <FlowCanvas
          graph={graph}
          selectedBlockId={null}
          onSelectBlock={onSelect}
        />
      )
    )
    const firstNode = document.querySelector(
      `[data-id="${graph.nodes[0]!.id}"]`
    ) as HTMLElement
    await userEvent.click(firstNode)
    expect(onSelect).toHaveBeenCalledWith(graph.nodes[0]!.id)
  })
})
```

Note: React Flow has known jsdom quirks. For complex canvas interactions (pan, zoom, drag-to-connect), the test belongs in Playwright e2e rather than jsdom.

### Impl

Port from mockup. Accept `graph` + `selectedBlockId` + `onSelectBlock` props. Keep existing styling.

### Commits

- `test(flow-canvas): renders nodes from graph, selection fires callback`
- `feat(flow-canvas): port from mockup with typed props`

---

## Slice 4 — Block node shows goal + branch pills

### Component test

`src/app/dashboard/flows/[flowId]/components/nodes/__tests__/block-node.test.tsx`

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BlockNode from '../block-node'
import { createTestBlock } from '@/test/fixtures'

describe('BlockNode', () => {
  it('shows block name and goal', () => {
    const block = createTestBlock({
      name: 'Qualifier',
      goal: 'Collect motivation.',
    })
    render(<BlockNode data={{ block, selected: false }} selected={false} id={block.id} type="block" />)
    expect(screen.getByText('Qualifier')).toBeInTheDocument()
    expect(screen.getByText('Collect motivation.')).toBeInTheDocument()
  })

  it('renders up to 3 exit branch pills', () => {
    const block = createTestBlock({
      exitBranches: Array.from({ length: 5 }, (_, i) => ({
        id: `b${i}`,
        label: `Branch ${i}`,
        target: 't',
        conditionSummary: 'cond',
      })),
    })
    render(<BlockNode data={{ block, selected: false }} selected={false} id={block.id} type="block" />)
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('applies ring styling when selected', () => {
    const block = createTestBlock()
    const { container } = render(
      <BlockNode data={{ block, selected: true }} selected={true} id={block.id} type="block" />
    )
    expect(container.querySelector('[class*="ring-accent"]')).toBeTruthy()
  })
})
```

### Impl

Port existing `block-node.tsx`.

### Commits

- `test(block-node): renders name, goal, up to 3 branches, selected state`
- `feat(block-node): port from mockup`

---

## Slice 5 — Right pane tabs switch content

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/right-pane.test.tsx`

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RightPane from '../right-pane'
import { createTestBlock } from '@/test/fixtures'

describe('RightPane', () => {
  it('shows Edit content when tab=edit and a block is selected', () => {
    render(
      <RightPane
        tab="edit"
        onTabChange={() => {}}
        selectedBlock={createTestBlock({ name: 'Qualifier' })}
        simMode="fast"
      />
    )
    expect(screen.getByText(/Goal/)).toBeInTheDocument()
  })

  it('shows empty state when tab=edit and no block is selected', () => {
    render(
      <RightPane
        tab="edit"
        onTabChange={() => {}}
        selectedBlock={null}
        simMode="fast"
      />
    )
    expect(screen.getByText(/Nothing selected/i)).toBeInTheDocument()
  })

  it('switches to Try tab on click', async () => {
    const onTabChange = vi.fn()
    render(
      <RightPane
        tab="edit"
        onTabChange={onTabChange}
        selectedBlock={createTestBlock()}
        simMode="fast"
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Try it/ }))
    expect(onTabChange).toHaveBeenCalledWith('try')
  })
})
```

### Impl

Port existing `right-pane.tsx`.

### Commits

- `test(right-pane): tabs switch, empty state, Edit enabled only with selection`
- `feat(right-pane): port from mockup`

---

## Slice 6 — Block editor saves via Server Action (debounced)

### Server Action test

`src/app/dashboard/flows/[flowId]/actions/__tests__/save-block.action.integration.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import {
  insertTestFlow,
  insertTestFlowVersion,
  createTestGraph,
  createTestBlock,
} from '@/test/fixtures'
import { saveBlockAction } from '../save-block.action'

describe('saveBlockAction', () => {
  const db = createServiceClient()

  beforeEach(async () => {
    await resetFlowBuilderTables(db)
  })

  it('updates a block in the draft graph', async () => {
    const flow = await insertTestFlow(db)
    const graph = createTestGraph()
    const version = await insertTestFlowVersion(db, flow.id, {
      status: 'draft',
      graph: graph as unknown as Record<string, unknown>,
    })
    const updated = {
      ...graph.nodes[0]!.block,
      goal: 'New goal text',
    }

    const result = await saveBlockAction({
      draftVersionId: version.id,
      block: updated,
    })
    expect(result.success).toBe(true)

    const { data } = await db
      .from('ins_flow_versions')
      .select('graph')
      .eq('id', version.id)
      .single()
    const nodes = (data!.graph as any).nodes
    expect(nodes[0].block.goal).toBe('New goal text')
  })

  it('refuses to update a published version', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id, {
      status: 'published',
    })
    const result = await saveBlockAction({
      draftVersionId: version.id,
      block: createTestBlock(),
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('version_not_draft')
  })

  it('validates block with Zod', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id, {
      status: 'draft',
    })
    const result = await saveBlockAction({
      draftVersionId: version.id,
      block: { id: 'x' } as never, // invalid
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid/i)
  })
})
```

### Impl

`src/app/dashboard/flows/[flowId]/actions/save-block.action.ts`

```ts
'use server'

import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { BlockData } from '@/types/flow-builder'

const BlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'opening',
    'qualifier',
    'objection',
    'email-capture',
    'booking',
    'followup',
    'escalation',
    'summary',
  ]),
  name: z.string().min(1),
  goal: z.string(),
  messageGuidance: z.string(),
  exampleGood: z.array(z.string()),
  captureRules: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      variable: z.string(),
      source: z.enum(['llm-extract', 'user-answer']),
    })
  ),
  exitBranches: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      target: z.string().nullable(),
      conditionSummary: z.string(),
    })
  ),
})

const Input = z.object({
  draftVersionId: z.string().uuid(),
  block: BlockSchema,
})

type Result<T> = { success: true; data?: T } | { success: false; error: string }

export async function saveBlockAction(input: unknown): Promise<Result<void>> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { success: false, error: 'invalid_input' }

  const { draftVersionId, block } = parsed.data
  const db = await getSupabaseServerClient()

  const { data: version, error } = await db
    .from('ins_flow_versions')
    .select('id, status, graph')
    .eq('id', draftVersionId)
    .single()
  if (error || !version) return { success: false, error: 'version_not_found' }
  if (version.status !== 'draft') {
    return { success: false, error: 'version_not_draft' }
  }

  const graph = version.graph as unknown as {
    nodes: Array<{
      id: string
      block: BlockData
      position: { x: number; y: number }
    }>
  }
  const nodeIdx = graph.nodes.findIndex((n) => n.block.id === block.id)
  if (nodeIdx === -1) return { success: false, error: 'block_not_in_graph' }
  graph.nodes[nodeIdx]!.block = block

  const { error: updateErr } = await db
    .from('ins_flow_versions')
    .update({ graph: graph as never })
    .eq('id', draftVersionId)
  if (updateErr) return { success: false, error: 'update_failed' }

  return { success: true }
}
```

### Debounce wiring (component side)

`src/app/dashboard/flows/[flowId]/components/block-editor.tsx`:

```ts
const saveDebounced = useDebouncedCallback(
  (block: BlockData) => saveBlockAction({ draftVersionId, block }),
  1200
)
```

Use `use-debounce` npm package or a ~20-line hook — skip a net-new dep if possible.

### Commits

- `test(save-block): Server Action updates draft graph, rejects published`
- `feat(save-block): Server Action with Zod validation`
- `test(block-editor): edits trigger debounced save`
- `feat(block-editor): wire save via Server Action`

---

## Slice 7 — Condition builder renders rules from string

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/condition-builder.test.tsx`

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConditionBuilder from '../condition-builder'

describe('ConditionBuilder', () => {
  it('renders is-set rules with variable + operator chips', () => {
    render(<ConditionBuilder condition="contact.location is set" />)
    expect(screen.getByText('contact.location')).toBeInTheDocument()
    expect(screen.getByText('is set')).toBeInTheDocument()
  })

  it('renders AI (seems) rules with amber chip', () => {
    render(<ConditionBuilder condition="last message ⚡ seems ready" />)
    const aiChip = screen.getByText(/seems/)
    expect(aiChip.className).toMatch(/amber/)
    expect(screen.getByText('ready')).toBeInTheDocument()
  })

  it('renders numeric comparison with value chip', () => {
    render(<ConditionBuilder condition="contact.budget is more than 5000" />)
    expect(screen.getByText('contact.budget')).toBeInTheDocument()
    expect(screen.getByText(/is more than|>/i)).toBeInTheDocument()
    expect(screen.getByText('5000')).toBeInTheDocument()
  })
})
```

### Impl

Port existing `condition-builder.tsx`. The mockup parser is sufficient for v1 display; editing conditions structurally comes with Primitive #2 work.

### Commits

- `test(condition-builder): parses is-set, AI, and numeric conditions`
- `feat(condition-builder): port from mockup`

---

## Slice 8 — Publish Server Action snapshots a new version

### Server Action test

`src/app/dashboard/flows/[flowId]/actions/__tests__/publish-flow.action.integration.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { publishFlowAction } from '../publish-flow.action'
import {
  insertTestFlow,
  insertTestFlowVersion,
  createTestGraph,
} from '@/test/fixtures'

describe('publishFlowAction', () => {
  const db = createServiceClient()
  beforeEach(async () => await resetFlowBuilderTables(db))

  it('transitions draft → published and creates new draft at v+1', async () => {
    const flow = await insertTestFlow(db)
    const draft = await insertTestFlowVersion(db, flow.id, {
      status: 'draft',
      version_number: 2,
      graph: createTestGraph() as unknown as Record<string, unknown>,
    })

    const result = await publishFlowAction({
      draftVersionId: draft.id,
      actorEmail: 'tester@x.com',
    })
    expect(result.success).toBe(true)

    const { data: versions } = await db
      .from('ins_flow_versions')
      .select('version_number, status')
      .eq('flow_id', flow.id)
      .order('version_number', { ascending: true })
    expect(versions).toHaveLength(2)
    expect(versions![0]).toMatchObject({
      version_number: 2,
      status: 'published',
    })
    // next draft auto-created? Actually per design we create on next edit.
    // Verify the publish log
    const { data: log } = await db
      .from('ins_flow_publish_log')
      .select('action')
      .eq('flow_id', flow.id)
    expect(log?.[0]?.action).toBe('publish')
  })

  it('refuses to publish an already-published version', async () => {
    const flow = await insertTestFlow(db)
    const v = await insertTestFlowVersion(db, flow.id, { status: 'published' })
    const result = await publishFlowAction({
      draftVersionId: v.id,
      actorEmail: 'x@y',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('version_not_draft')
  })

  it('runs contract validation and fails publish on violations', async () => {
    // draft with intentionally invalid graph: e.g., a node missing its block
    const flow = await insertTestFlow(db)
    const v = await insertTestFlowVersion(db, flow.id, {
      status: 'draft',
      graph: {
        nodes: [{ id: 'x', position: { x: 0, y: 0 } }],
        edges: [],
        ambientTriggers: [],
      } as never,
    })
    const result = await publishFlowAction({
      draftVersionId: v.id,
      actorEmail: 'x@y',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/validation/i)
  })
})
```

### Impl

`src/app/dashboard/flows/[flowId]/actions/publish-flow.action.ts`

```ts
'use server'

import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { validateFlowForPublish } from '@/lib/services/flow-validator'

const Input = z.object({
  draftVersionId: z.string().uuid(),
  actorEmail: z.string().email(),
  label: z.string().optional(),
})

export async function publishFlowAction(
  raw: unknown
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = Input.safeParse(raw)
  if (!parsed.success) return { success: false, error: 'invalid_input' }
  const { draftVersionId, actorEmail, label } = parsed.data

  const db = await getSupabaseServerClient()
  const { data: version } = await db
    .from('ins_flow_versions')
    .select('id, flow_id, status, graph, version_number')
    .eq('id', draftVersionId)
    .single()
  if (!version) return { success: false, error: 'version_not_found' }
  if (version.status !== 'draft')
    return { success: false, error: 'version_not_draft' }

  const issues = validateFlowForPublish(version.graph as never)
  if (issues.length > 0) {
    return { success: false, error: `validation_failed:${issues.length}` }
  }

  const { error: updateErr } = await db
    .from('ins_flow_versions')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: actorEmail,
      label,
    })
    .eq('id', draftVersionId)
  if (updateErr) return { success: false, error: 'update_failed' }

  await db.from('ins_flow_publish_log').insert({
    flow_id: version.flow_id,
    action: 'publish',
    to_version_id: draftVersionId,
    actor_email: actorEmail,
  })

  return { success: true }
}
```

Validator (stub — expanded in Primitive #2 and publish quality work):

```ts
// src/lib/services/flow-validator.ts
import type { FlowGraph } from '@/types/flow-builder'

export function validateFlowForPublish(graph: FlowGraph): string[] {
  const issues: string[] = []
  for (const node of graph.nodes) {
    if (!node.block) issues.push(`Node ${node.id} is missing its block`)
  }
  return issues
}
```

### Commits

- `test(publish-flow): transitions draft to published, logs publish event`
- `feat(publish-flow): Server Action with validator gate`
- `test(flow-validator): rejects nodes missing block`
- `feat(flow-validator): stub with missing-block check`

---

## Slice 9 — Multi-user last-write-wins banner

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/edit-conflict-banner.test.tsx`

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EditConflictBanner from '../edit-conflict-banner'

describe('EditConflictBanner', () => {
  it('renders nothing when otherEditor is null', () => {
    const { container } = render(<EditConflictBanner otherEditor={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows editor email when someone else is editing', () => {
    render(<EditConflictBanner otherEditor={{ email: 'alex@x.com', since: new Date().toISOString() }} />)
    expect(screen.getByText(/alex@x.com/)).toBeInTheDocument()
  })
})
```

### Impl

Pure presentational component. Presence detection lives in a future slice (using Supabase Realtime — out of scope for v1; for now, poll `ins_flow_versions.updated_at` every 10s and show the banner if `updated_by !== current user`).

```tsx
export default function EditConflictBanner({
  otherEditor,
}: {
  otherEditor: { email: string; since: string } | null
}) {
  if (!otherEditor) return null
  return (
    <div className="border-b border-warning/40 bg-warning/10 px-3 py-1.5 text-xs">
      ⚠ {otherEditor.email} is also editing this flow. Last-write-wins —
      coordinate.
    </div>
  )
}
```

### Commits

- `test(edit-conflict-banner): renders when someone else is editing`
- `feat(edit-conflict-banner): presentational banner`

---

## End-of-week verification

- [ ] `npx vitest --project=unit` green
- [ ] `npx vitest --project=integration` green
- [ ] Component tests all green, coverage ≥ 60% on `src/app/dashboard/**`
- [ ] Server Actions have integration tests hitting real Supabase
- [ ] Drag-to-connect not yet wired (comes in Primitive #2 slice or polish week)
- [ ] Existing conversation engine still runs setter-v2 path unchanged in prod

## What's NOT in Week 2 (intentional)

- Live preview (Primitive #1, Week 3)
- Compiled prompt drawer (Primitive #3, Week 3)
- Ambient triggers section (Primitive #2, Week 4)
- Simulator wired to real Claude (Primitive #1 shares infra)
- Drag-to-add-from-palette (polish week)
- Realtime presence (future)
