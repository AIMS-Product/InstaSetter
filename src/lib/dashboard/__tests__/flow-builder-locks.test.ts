import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  FLOW_BUILDER_LOCKS,
  LOCK_KINDS,
  getLock,
  getLockBySourceHint,
  type LockEntry,
} from '../flow-builder-locks'

// The lock catalog is the single source of truth for which surfaces are
// safety- vs admin-locked. The contract:
//   - every id is unique
//   - kind ∈ { 'safety', 'admin' }
//   - escalation === null  ⟺  kind === 'safety'
//   - tooltip + escalation never leak engineering vocabulary
//   - every catalog id is referenced by at least one source file under
//     src/app/dashboard, so the catalog can't drift away from the UI.
//
// This test plus the lock-popover component test together guard P4.03's
// behaviour without touching the live SendPulse engine or the compile-block
// contract.

const ENGINEERING_BANS = [
  'Week ',
  'compile-block',
  'flow_engine.',
  'setter-v2',
  ' prod ',
  ' dev ',
  ' staging ',
] as const

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..')
const DASHBOARD_DIR = join(REPO_ROOT, 'src', 'app', 'dashboard')

async function collectDashboardSources(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name === '__tests__') continue
    const path = join(dir, e.name)
    if (e.isDirectory()) {
      const nested = await collectDashboardSources(path)
      out.push(...nested)
    } else if (
      e.isFile() &&
      (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))
    ) {
      out.push(path)
    }
  }
  return out
}

async function readAllDashboardSourcesJoined(): Promise<string> {
  const files = await collectDashboardSources(DASHBOARD_DIR)
  const contents = await Promise.all(files.map((p) => readFile(p, 'utf8')))
  return contents.join('\n')
}

describe('FLOW_BUILDER_LOCKS — catalog shape', () => {
  it('every entry has a unique stable id', () => {
    const ids = Object.values(FLOW_BUILDER_LOCKS).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("every entry's kind is one of the declared LOCK_KINDS", () => {
    for (const entry of Object.values(FLOW_BUILDER_LOCKS)) {
      expect(LOCK_KINDS, `${entry.id}.kind`).toContain(entry.kind)
    }
  })

  it('escalation is null exactly when kind === "safety"', () => {
    for (const entry of Object.values(FLOW_BUILDER_LOCKS)) {
      if (entry.kind === 'safety') {
        expect(entry.escalation, `${entry.id} (safety)`).toBeNull()
      } else {
        expect(entry.escalation, `${entry.id} (admin)`).not.toBeNull()
        expect(entry.escalation?.trim(), `${entry.id} (admin)`).not.toBe('')
      }
    }
  })

  it('every entry has a non-empty surface and tooltip', () => {
    for (const entry of Object.values(FLOW_BUILDER_LOCKS)) {
      expect(entry.surface.trim(), `${entry.id}.surface`).not.toBe('')
      expect(entry.tooltip.trim(), `${entry.id}.tooltip`).not.toBe('')
    }
  })

  it('tooltips stay under 200 characters', () => {
    for (const entry of Object.values(FLOW_BUILDER_LOCKS)) {
      expect(
        entry.tooltip.length,
        `${entry.id}.tooltip too long (${entry.tooltip.length})`
      ).toBeLessThanOrEqual(200)
    }
  })

  it('no entry leaks engineering vocabulary into operator copy', () => {
    for (const entry of Object.values(FLOW_BUILDER_LOCKS)) {
      const haystack =
        `${entry.surface}\n${entry.tooltip}\n${entry.escalation ?? ''}`.toLowerCase()
      for (const banned of ENGINEERING_BANS) {
        expect(
          haystack,
          `${entry.id} contains banned substring "${banned.trim()}"`
        ).not.toContain(banned.toLowerCase())
      }
    }
  })
})

describe('FLOW_BUILDER_LOCKS — required entries', () => {
  it('contains every spec-mandated id with the right kind', () => {
    const required: Array<[string, 'safety' | 'admin']> = [
      ['opening.usCanadaGate', 'safety'],
      ['opening.outOfAreaScript', 'safety'],
      ['qualifier.list', 'admin'],
      ['qualifier.order', 'admin'],
      ['qualifier.thresholds', 'admin'],
      ['objection.handlers', 'admin'],
      ['objection.followUps', 'admin'],
      ['objection.structure', 'admin'],
      ['booking.linkPattern', 'admin'],
      ['booking.reengagement', 'admin'],
      ['email.captureEmailTool', 'safety'],
      ['email.timingFloor', 'safety'],
      ['email.captureTriggers', 'admin'],
      ['escalation.requiredTriggers', 'admin'],
      ['escalation.captureMethod', 'safety'],
      ['summary.requiredFields', 'admin'],
      ['bot.persona.body', 'admin'],
      ['bot.persona.namelessRule', 'safety'],
      ['bot.messageConstraints', 'admin'],
      ['guardrails.global', 'safety'],
    ]
    for (const [id, kind] of required) {
      const entry = FLOW_BUILDER_LOCKS[id as keyof typeof FLOW_BUILDER_LOCKS]
      expect(entry, `missing id ${id}`).toBeDefined()
      expect(entry.kind, `${id}.kind`).toBe(kind)
    }
  })
})

describe('FLOW_BUILDER_LOCKS — helpers', () => {
  it('getLock returns the entry by id', () => {
    const entry: LockEntry = getLock('qualifier.list')
    expect(entry.id).toBe('qualifier.list')
    expect(entry.kind).toBe('admin')
  })

  it('getLockBySourceHint resolves a registered source path', () => {
    const entry = getLockBySourceHint(
      'src/lib/prompts/sections/location-gate.ts'
    )
    expect(entry).toBeDefined()
    expect(entry?.kind).toBe('safety')
  })

  it('getLockBySourceHint returns undefined for unknown paths', () => {
    expect(getLockBySourceHint('nonexistent/path.ts')).toBeUndefined()
  })
})

describe('FLOW_BUILDER_LOCKS — drift guard', () => {
  it('every catalog id is referenced in at least one src/app/dashboard file', async () => {
    const sources = await readAllDashboardSourcesJoined()
    for (const id of Object.keys(FLOW_BUILDER_LOCKS)) {
      // JSX accepts either single- or double-quoted attribute values;
      // template/string literals also use either. Either form counts as a
      // reference. The id must always appear quoted so we don't match
      // unrelated dotted accessors elsewhere.
      const referenced =
        sources.includes(`'${id}'`) || sources.includes(`"${id}"`)
      expect(
        referenced,
        `${id} is not referenced by any src/app/dashboard source file`
      ).toBe(true)
    }
  }, 20_000)
})
