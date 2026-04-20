# Spec — Primitive #3: Compiled prompt debugger (TDD, fully expanded)

Depends on: Week 1 (`compileBlock` returning `PromptSection[]` with source attribution, contract test green).

Most correctness is guaranteed by the Week 1 contract test. This primitive's specific work is: extend `source` with `editUrl`, build a drawer UI, wire click-through navigation, live-update binding to editor state.

Always available — no dev-mode gate.

---

## Slice 1 — `source.editUrl` + jump-to-source semantics

### Test additions

`src/lib/prompts/__tests__/compile-block.test.ts`

```ts
describe('compileBlock — source editUrl', () => {
  it('persona source.editUrl points to bot settings', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot({ id: 'bot_1' }),
      runtimeContext: createEmptyContext(),
    })
    const persona = result.find((s) => s.id === 'persona')!
    expect(persona.source.editUrl).toMatch(/bot.*settings/i)
    expect(persona.source.editUrl).toContain('bot_1')
  })

  it('constraints source.editUrl points to bot settings', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(result.find((s) => s.id === 'constraints')!.source.editUrl).toMatch(
      /bot.*settings/i
    )
  })

  it('block section editUrl contains block id', () => {
    const block = createTestBlock({ id: 'blk_abc' })
    const result = compileBlock({
      block,
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(result.find((s) => s.id === 'block')!.source.editUrl).toContain(
      'blk_abc'
    )
  })

  it('capture and routing sections share block editUrl anchor', () => {
    const block = createTestBlock({ id: 'blk_x' })
    const result = compileBlock({
      block,
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(result.find((s) => s.id === 'capture')?.source.editUrl).toContain(
      'blk_x'
    )
    expect(result.find((s) => s.id === 'routing')?.source.editUrl).toContain(
      'blk_x'
    )
  })

  it('context section editUrl is runtime (no deep-link)', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    const ctx = result.find((s) => s.id === 'context')!
    expect(ctx.source.type).toBe('runtime')
    // runtime editUrl may be the Variables tab route — non-empty
    expect(ctx.source.editUrl).toMatch(/vars|variables/i)
  })
})
```

### Impl

Update `compile-block.ts`:

- `buildPersonaSection(bot)`: `source.editUrl = '/dashboard/bots/<bot.id>/settings#persona'`
- `buildConstraintsSection(bot)`: `/dashboard/bots/<bot.id>/settings#constraints`
- `buildBlockSection(block)`: `/dashboard/flows/current#block-<block.id>-edit`
- `buildCaptureSection(block)`: `/dashboard/flows/current#block-<block.id>-capture`
- `buildRoutingSection(block)`: `/dashboard/flows/current#block-<block.id>-routing`
- `buildContextSection(ctx)`: `/dashboard/flows/current?tab=vars`

Note: `/dashboard/flows/current` is a placeholder resolved client-side to the actual `flowId` by the drawer via `useParams()`. This keeps the compiler pure and URL-agnostic.

### Commits

- `test(compile-block): source.editUrl for every section`
- `feat(compile-block): add editUrl deep-links per section source`

---

## Slice 2 — Drawer shell (collapsed/expanded state)

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/compiled-prompt-drawer.test.tsx`

### Test bodies

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompiledPromptDrawer from '../compiled-prompt-drawer'
import { createTestBlock, createTestBot, createTestContext } from '@/test/fixtures'

describe('CompiledPromptDrawer', () => {
  const block = createTestBlock()
  const bot = createTestBot()
  const ctx = createTestContext()

  it('renders the toggle button collapsed by default', () => {
    render(<CompiledPromptDrawer block={block} bot={bot} runtimeContext={ctx} />)
    expect(
      screen.getByRole('button', { name: /Show compiled prompt/i })
    ).toBeInTheDocument()
    expect(screen.queryByText('## Persona')).not.toBeInTheDocument()
  })

  it('toggles drawer open on click', async () => {
    render(<CompiledPromptDrawer block={block} bot={bot} runtimeContext={ctx} />)
    await userEvent.click(
      screen.getByRole('button', { name: /Show compiled prompt/i })
    )
    // Section heading appears
    expect(screen.getByText(/Persona/)).toBeInTheDocument()
  })

  it('toggles drawer closed on second click', async () => {
    render(<CompiledPromptDrawer block={block} bot={bot} runtimeContext={ctx} />)
    const btn = screen.getByRole('button', { name: /Show compiled prompt/i })
    await userEvent.click(btn)
    await userEvent.click(btn)
    expect(screen.queryByText(/Persona/)).not.toBeInTheDocument()
  })
})
```

### Impl skeleton

`src/app/dashboard/flows/[flowId]/components/compiled-prompt-drawer.tsx`

```tsx
'use client'

import { useMemo, useState } from 'react'
import { compileBlock } from '@/lib/prompts/compile-block'
import type { BlockData, BotData, RuntimeContext } from '@/types/flow-builder'

interface Props {
  block: BlockData
  bot: BotData
  runtimeContext: RuntimeContext
}

export default function CompiledPromptDrawer({
  block,
  bot,
  runtimeContext,
}: Props) {
  const [open, setOpen] = useState(false)
  const sections = useMemo(
    () => compileBlock({ block, bot, runtimeContext }),
    [block, bot, runtimeContext]
  )

  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-strong hover:bg-subtle"
        aria-expanded={open}
      >
        <span>{open ? 'Hide' : 'Show'} compiled prompt</span>
        <span className="text-[10px] text-muted">
          {sections.length} sections
        </span>
      </button>
      {open && (
        <div className="border-t border-border bg-subtle/30 p-3">
          {/* section rendering in Slice 3 */}
        </div>
      )}
    </section>
  )
}
```

### Commits

- `test(compiled-prompt-drawer): collapsed by default, toggle opens and closes`
- `feat(compiled-prompt-drawer): drawer shell with toggle state`

---

## Slice 3 — Section rendering with source labels

### Test additions

```ts
describe('CompiledPromptDrawer — section rendering', () => {
  it('renders all 6 sections for a full block', async () => {
    render(<CompiledPromptDrawer block={createTestBlock()} bot={createTestBot()} runtimeContext={createTestContext()} />)
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    for (const title of ['Persona', 'Constraints', 'Current Block', 'Capture', 'Exit Routing', 'Contact Context']) {
      expect(screen.getByText(new RegExp(title, 'i'))).toBeInTheDocument()
    }
  })

  it('each section shows a [from: …] chip', async () => {
    render(<CompiledPromptDrawer block={createTestBlock()} bot={createTestBot()} runtimeContext={createTestContext()} />)
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    const chips = screen.getAllByText(/from:/i)
    expect(chips.length).toBeGreaterThanOrEqual(5) // some blocks may have 5 or 6 sections
  })

  it('preserves body whitespace in monospace', async () => {
    const block = createTestBlock({
      messageGuidance: 'Line 1\nLine 2',
    })
    render(<CompiledPromptDrawer block={block} bot={createTestBot()} runtimeContext={createTestContext()} />)
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    const bodies = document.querySelectorAll('pre')
    expect(bodies.length).toBeGreaterThan(0)
    expect(bodies[0]!.textContent).toContain('Line 1')
  })
})
```

### Impl additions

```tsx
{
  open && (
    <div className="border-t border-border bg-subtle/30 p-3 space-y-3">
      {sections.map((s) => (
        <article
          key={s.id}
          className="rounded-md border border-border bg-panel"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
            <h4 className="text-[12px] font-semibold">{s.title}</h4>
            <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] text-muted-strong">
              from: {s.source.label}
            </span>
          </header>
          <pre className="overflow-x-auto px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
            {s.body}
          </pre>
        </article>
      ))}
    </div>
  )
}
```

### Commits

- `test(compiled-prompt-drawer): renders 6 sections with from-labels and preserved whitespace`
- `feat(compiled-prompt-drawer): render sections with source chips`

---

## Slice 4 — Source chip click → navigation

### Test additions

```ts
describe('CompiledPromptDrawer — source navigation', () => {
  it('clicking persona from-chip navigates to bot settings URL', async () => {
    const block = createTestBlock()
    const bot = createTestBot({ id: 'bot_xyz' })
    render(<CompiledPromptDrawer block={block} bot={bot} runtimeContext={createTestContext()} />)
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))

    // The source label chip for persona is itself a link
    const personaChip = screen
      .getAllByText(/from:/i)[0]!
    const parent = personaChip.closest('a')
    expect(parent).not.toBeNull()
    expect(parent!.getAttribute('href')).toContain('bot_xyz')
  })

  it('block section chip links to block editor anchor', async () => {
    const block = createTestBlock({ id: 'blk_abc' })
    render(<CompiledPromptDrawer block={block} bot={createTestBot()} runtimeContext={createTestContext()} />)
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    const chips = screen.getAllByText(/from:/i)
    const blockChip = chips.find((c) =>
      c.textContent?.toLowerCase().includes('block editor')
    )
    const anchor = blockChip?.closest('a')
    expect(anchor?.getAttribute('href')).toContain('blk_abc')
  })
})
```

### Impl refactor

Wrap source chip in `<Link>`:

```tsx
import Link from 'next/link'
import { useParams } from 'next/navigation'

function FromChip({ source }: { source: PromptSectionSource }) {
  const { flowId } = useParams<{ flowId: string }>()
  const href = (source.editUrl ?? '#').replace(
    '/flows/current',
    `/flows/${flowId}`
  )
  return (
    <Link
      href={href}
      className="rounded bg-subtle px-1.5 py-0.5 text-[10px] text-muted-strong hover:bg-subtle-strong hover:text-foreground"
    >
      from: {source.label}
    </Link>
  )
}
```

The placeholder `/flows/current` inserted by `compileBlock` gets rewritten to the real `flowId` at render time — keeps `compileBlock` pure.

### Commits

- `test(compiled-prompt-drawer): source chip clicks navigate to editUrl`
- `feat(compiled-prompt-drawer): source chips are Next Links with flowId substitution`

---

## Slice 5 — Copy button

### Test additions

```ts
describe('CompiledPromptDrawer — copy button', () => {
  beforeEach(() => {
    // jsdom clipboard stub
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('copies concatenated body to clipboard on click', async () => {
    const block = createTestBlock({ goal: 'COPY_ME_PROBE' })
    render(<CompiledPromptDrawer block={block} bot={createTestBot()} runtimeContext={createTestContext()} />)
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    await userEvent.click(screen.getByRole('button', { name: /Copy/i }))
    const wrote = vi.mocked(navigator.clipboard.writeText).mock.calls[0]![0]
    expect(wrote).toContain('COPY_ME_PROBE')
  })

  it('shows "copied" tooltip briefly after click', async () => {
    render(<CompiledPromptDrawer block={createTestBlock()} bot={createTestBot()} runtimeContext={createTestContext()} />)
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    await userEvent.click(screen.getByRole('button', { name: /Copy/i }))
    expect(screen.getByText(/copied/i)).toBeInTheDocument()
  })
})
```

### Impl

Add a Copy button to the drawer header (when open):

```tsx
const [copied, setCopied] = useState(false)
const handleCopy = async () => {
  const text = sections.map((s) => s.body).join('\n\n')
  await navigator.clipboard.writeText(text)
  setCopied(true)
  setTimeout(() => setCopied(false), 1500)
}

// in the header:
;<button
  type="button"
  onClick={handleCopy}
  className="rounded border border-border px-2 py-0.5 text-[10px] hover:bg-subtle"
>
  {copied ? 'Copied' : 'Copy'}
</button>
```

### Commits

- `test(compiled-prompt-drawer): copy button writes to clipboard + shows confirmation`
- `feat(compiled-prompt-drawer): copy button with transient toast`

---

## Slice 6 — Live update on editor change

### Test additions

```ts
describe('CompiledPromptDrawer — live update', () => {
  it('re-renders when block.goal changes', async () => {
    const { rerender } = render(
      <CompiledPromptDrawer
        block={createTestBlock({ goal: 'First goal' })}
        bot={createTestBot()}
        runtimeContext={createTestContext()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    expect(screen.getByText(/First goal/)).toBeInTheDocument()

    rerender(
      <CompiledPromptDrawer
        block={createTestBlock({ goal: 'Second goal' })}
        bot={createTestBot()}
        runtimeContext={createTestContext()}
      />
    )
    expect(screen.getByText(/Second goal/)).toBeInTheDocument()
    expect(screen.queryByText(/First goal/)).not.toBeInTheDocument()
  })
})
```

### Impl

Already works — `useMemo([block, bot, runtimeContext])` triggers recompute. This test is a regression guard against someone breaking the memo deps.

### Commits

- `test(compiled-prompt-drawer): re-renders on block prop change`

---

## Slice 7 — Runtime fallback to example values

### Test additions

```ts
describe('CompiledPromptDrawer — runtime context fallback', () => {
  it('shows example values when runtimeContext has none set', async () => {
    render(
      <CompiledPromptDrawer
        block={createTestBlock()}
        bot={createTestBot()}
        runtimeContext={{ contact: {}, conversation: {}, brand: {} }}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    // Shows Unknown listing since nothing is set
    expect(screen.getByText(/Unknown/)).toBeInTheDocument()
  })

  it('when running inside simulator, uses real runtime values', async () => {
    render(
      <CompiledPromptDrawer
        block={createTestBlock()}
        bot={createTestBot()}
        runtimeContext={{ contact: { location: 'Dallas' }, conversation: {}, brand: {} }}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Show/i }))
    expect(screen.getByText(/Dallas/)).toBeInTheDocument()
  })
})
```

### Impl

The parent component (editor shell) chooses which context to pass:

```ts
const runtimeContext = simulatorRunning
  ? simulatorState.variables
  : exampleVariablesFromSeed(block.type)
```

Helper `exampleVariablesFromSeed` lives in `src/lib/prompts/preview-seeds.ts` (extended from Primitive #1). Nothing special for the drawer itself.

### Commits

- `test(compiled-prompt-drawer): shows example vs runtime values`
- `feat(editor): pass example context to drawer when simulator inactive`

---

## Slice 8 — E2E

### Test

`tests/e2e/compiled-prompt.spec.ts`

```ts
import { test, expect } from './fixtures'

test('compiled prompt drawer shows all sections', async ({ page, flowId }) => {
  await page.goto(`/dashboard/flows/${flowId}`)
  // Select Qualifier block
  await page.locator('[data-id*="qualifier"]').first().click()

  // Open drawer
  await page.getByRole('button', { name: /Show compiled prompt/i }).click()

  // 6 labeled sections
  for (const label of [
    'Persona',
    'Constraints',
    'Current Block',
    'Exit Routing',
    'Contact Context',
  ]) {
    await expect(page.getByText(new RegExp(label, 'i')).first()).toBeVisible()
  }
})

test('clicking from: Bot settings navigates correctly', async ({
  page,
  flowId,
}) => {
  await page.goto(`/dashboard/flows/${flowId}`)
  await page.locator('[data-id*="qualifier"]').first().click()
  await page.getByRole('button', { name: /Show compiled prompt/i }).click()

  await page
    .getByText(/from: Bot settings/i)
    .first()
    .click()
  await expect(page).toHaveURL(/bots\/.*\/settings/)
})

test('editing goal updates drawer section within 200ms', async ({
  page,
  flowId,
}) => {
  await page.goto(`/dashboard/flows/${flowId}`)
  await page.locator('[data-id*="qualifier"]').first().click()
  await page.getByRole('button', { name: /Show compiled prompt/i }).click()

  const goalInput = page.getByLabel('Goal')
  await goalInput.fill('NEW GOAL PROBE')

  // Drawer section should reflect within ~200ms (next render cycle)
  await expect(
    page.locator('pre').filter({ hasText: /NEW GOAL PROBE/ })
  ).toBeVisible({ timeout: 500 })
})

test('copy button puts text on clipboard matching joined sections', async ({
  page,
  flowId,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(`/dashboard/flows/${flowId}`)
  await page.locator('[data-id*="qualifier"]').first().click()
  await page.getByRole('button', { name: /Show compiled prompt/i }).click()
  await page.getByRole('button', { name: /Copy/i }).click()

  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('## Persona')
  expect(copied).toContain('## Current Block')
})
```

### Commits

- `test(e2e): compiled prompt drawer sections, navigation, live-update, clipboard copy`

---

## End of Primitive #3 verification

- [ ] All drawer component tests green
- [ ] e2e passes with real browser clipboard
- [ ] Drawer renders in <50ms for typical block
- [ ] Toggle is available inside the Block editor tab (top-right corner, visible on open)
- [ ] Navigation from a source chip resolves to the correct deep-link (`useParams` handles the flowId substitution)
- [ ] Contract test from Week 1 still green — drawer and engine produce identical text
