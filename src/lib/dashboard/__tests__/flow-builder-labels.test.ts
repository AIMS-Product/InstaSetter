import { describe, expect, it } from 'vitest'

import {
  FLOW_BUILDER_LABELS,
  getBlockDisplayLabel,
  getInspectorTabLabel,
  type LabelEntry,
} from '../flow-builder-labels'

// The catalog is the single source of truth for operator-facing copy in the
// Flow Builder workspace. Every entry must:
// - have a non-empty `display` string
// - have a non-empty `tooltip` when the field is present (no whitespace-only)
// - keep tooltip length under 140 chars (so the helper never crowds the UI)
// - never leak engineering vocabulary into operator copy
//
// The substring ban guards against accidentally threading file paths or
// framework slang into the UI. Operator copy is i18n-shaped (key -> string)
// even though we don't actually run i18n yet.

const ENGINEERING_BANS = [
  'Week ', // sequencing label from internal docs
  'compile-block',
  'flow_engine.',
  'setter-v2',
  'src/lib/prompts/',
  ' prod ',
  ' dev ',
  ' staging ',
] as const

function collectEntries(): Array<{ path: string; entry: LabelEntry }> {
  const out: Array<{ path: string; entry: LabelEntry }> = []
  for (const [groupKey, group] of Object.entries(FLOW_BUILDER_LABELS)) {
    for (const [memberKey, entry] of Object.entries(group)) {
      // Skip the lock catalog reference — it's a Record<id, LockEntry>, not a
      // LabelEntry. Catalog assertions live in flow-builder-locks.test.ts.
      if (groupKey === 'locks' && memberKey === 'catalog') continue
      out.push({
        path: `${groupKey}.${memberKey}`,
        entry: entry as LabelEntry,
      })
    }
  }
  return out
}

describe('FLOW_BUILDER_LABELS', () => {
  it('exports the six required sub-records', () => {
    expect(Object.keys(FLOW_BUILDER_LABELS).sort()).toEqual(
      [
        'blocks',
        'inspectorFields',
        'inspectorTabs',
        'locks',
        'pageNav',
        'panelSections',
      ].sort()
    )
  })

  it('every catalog entry has a non-empty display string', () => {
    for (const { path, entry } of collectEntries()) {
      expect(entry.display, `${path}.display`).toBeTruthy()
      expect(entry.display.trim(), `${path}.display`).not.toBe('')
    }
  })

  it('any tooltip present is non-empty after trim', () => {
    for (const { path, entry } of collectEntries()) {
      if (entry.tooltip === undefined) continue
      expect(entry.tooltip.trim(), `${path}.tooltip`).not.toBe('')
    }
  })

  it('tooltip length stays under 140 characters', () => {
    for (const { path, entry } of collectEntries()) {
      if (entry.tooltip === undefined) continue
      expect(
        entry.tooltip.length,
        `${path}.tooltip too long (${entry.tooltip.length} chars)`
      ).toBeLessThanOrEqual(140)
    }
  })

  it('no entry leaks engineering vocabulary into operator copy', () => {
    for (const { path, entry } of collectEntries()) {
      const haystack = `${entry.display}\n${entry.tooltip ?? ''}\n${
        'description' in entry
          ? (entry as { description?: string }).description
          : ''
      }\n${'blurb' in entry ? (entry as { blurb?: string }).blurb : ''}`
      for (const banned of ENGINEERING_BANS) {
        expect(
          haystack.toLowerCase(),
          `${path} contains banned substring "${banned.trim()}"`
        ).not.toContain(banned.toLowerCase())
      }
    }
  })

  it('no entry uses dark-theme or emoji decoration in display copy', () => {
    // Light theme + no emoji rule from ~/.claude/CLAUDE.md and conventions.md.
    // We allow the existing arrow glyph "↗" elsewhere but it should not appear
    // in the catalog's display strings.
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    for (const { path, entry } of collectEntries()) {
      expect(emojiPattern.test(entry.display), `${path}.display`).toBe(false)
    }
  })
})

describe('FLOW_BUILDER_LABELS — page nav', () => {
  it('renames Variables and Bot descriptions per the spec', () => {
    expect(FLOW_BUILDER_LABELS.pageNav.flow.display).toBe('Flow')
    expect(FLOW_BUILDER_LABELS.pageNav.flow.description).toBe(
      'Edit how the bot replies'
    )
    expect(FLOW_BUILDER_LABELS.pageNav.variables.display).toBe('Saved details')
    expect(FLOW_BUILDER_LABELS.pageNav.variables.description).toBe(
      'Brand and contact info the bot remembers'
    )
    expect(FLOW_BUILDER_LABELS.pageNav.bot.display).toBe('Bot')
    expect(FLOW_BUILDER_LABELS.pageNav.bot.description).toBe(
      'Voice, safety, never-say list'
    )
  })
})

describe('FLOW_BUILDER_LABELS — inspector tabs', () => {
  it('renames the Design and Memory tabs and keeps Paths/Follow-ups', () => {
    expect(FLOW_BUILDER_LABELS.inspectorTabs.design.display).toBe('Reply')
    expect(FLOW_BUILDER_LABELS.inspectorTabs.routing.display).toBe('Paths')
    expect(FLOW_BUILDER_LABELS.inspectorTabs.triggers.display).toBe(
      'Follow-ups'
    )
    expect(FLOW_BUILDER_LABELS.inspectorTabs.data.display).toBe(
      'What this step remembers'
    )
  })

  it('exposes a helper that maps an InspectorTab key to the display string', () => {
    expect(getInspectorTabLabel('design')).toBe('Reply')
    expect(getInspectorTabLabel('routing')).toBe('Paths')
  })
})

describe('FLOW_BUILDER_LABELS — inspector fields', () => {
  it('renames Guidance to Step instructions and Examples to Sample replies', () => {
    expect(FLOW_BUILDER_LABELS.inspectorFields.guidance.display).toBe(
      'Step instructions'
    )
    expect(FLOW_BUILDER_LABELS.inspectorFields.guidance.tooltip).toMatch(
      /voice/i
    )
    expect(FLOW_BUILDER_LABELS.inspectorFields.examples.display).toBe(
      'Sample replies'
    )
    expect(FLOW_BUILDER_LABELS.inspectorFields.marketerExamples.display).toBe(
      'Your draft examples'
    )
  })

  it('renames Capture rules and Routes out per the spec', () => {
    expect(FLOW_BUILDER_LABELS.inspectorFields.captures.display).toBe(
      'What to save from the reply'
    )
    expect(FLOW_BUILDER_LABELS.inspectorFields.routesOut.display).toBe(
      'Where to go next'
    )
    expect(FLOW_BUILDER_LABELS.inspectorFields.routesOut.tooltip).toBeTruthy()
  })

  it('renames Ambient triggers to Scheduled follow-ups with a tooltip', () => {
    expect(FLOW_BUILDER_LABELS.inspectorFields.triggers.display).toBe(
      'Scheduled follow-ups'
    )
    expect(FLOW_BUILDER_LABELS.inspectorFields.triggers.tooltip).toMatch(
      /24-hour/i
    )
  })

  it('renames the data-tab labels per the spec', () => {
    expect(FLOW_BUILDER_LABELS.inspectorFields.memorySaves.display).toBe(
      'Saved in this step'
    )
    expect(FLOW_BUILDER_LABELS.inspectorFields.memoryReads.display).toBe(
      'Used by this step'
    )
  })
})

describe('FLOW_BUILDER_LABELS — block names', () => {
  it('keeps stable display labels and adds palette blurbs for every BlockType', () => {
    const blockTypes = [
      'opening',
      'qualifier',
      'objection',
      'booking',
      'email',
      'followup',
      'escalation',
      'summary',
    ] as const
    for (const type of blockTypes) {
      const entry = FLOW_BUILDER_LABELS.blocks[type]
      expect(entry.display, `blocks.${type}.display`).toBeTruthy()
      expect(entry.blurb, `blocks.${type}.blurb`).toBeTruthy()
    }
  })

  it('renames the four operator-confusing block names per the spec', () => {
    expect(FLOW_BUILDER_LABELS.blocks.objection.display).toBe(
      'Handle objections'
    )
    expect(FLOW_BUILDER_LABELS.blocks.booking.display).toBe(
      'Send the booking link'
    )
    expect(FLOW_BUILDER_LABELS.blocks.email.display).toBe('Capture email')
    expect(FLOW_BUILDER_LABELS.blocks.followup.display).toBe(
      'Follow up after the call'
    )
  })

  it('keeps Opening, Qualifier, Escalation, Summary unchanged', () => {
    expect(FLOW_BUILDER_LABELS.blocks.opening.display).toBe('Opening')
    expect(FLOW_BUILDER_LABELS.blocks.qualifier.display).toBe('Qualifier')
    expect(FLOW_BUILDER_LABELS.blocks.escalation.display).toBe('Escalation')
    expect(FLOW_BUILDER_LABELS.blocks.summary.display).toBe('Summary')
  })

  it('exposes a helper that returns the operator-facing display label', () => {
    expect(getBlockDisplayLabel('booking')).toBe('Send the booking link')
    expect(getBlockDisplayLabel('qualifier')).toBe('Qualifier')
  })
})

describe('FLOW_BUILDER_LABELS — panel section titles', () => {
  it('renames the email and booking panel sections per the spec', () => {
    expect(FLOW_BUILDER_LABELS.panelSections.emailCaptureTriggers.display).toBe(
      'When to ask for email'
    )
    expect(
      FLOW_BUILDER_LABELS.panelSections.bookingMirrorTemplate.display
    ).toBe('Recap before sending the link')
    expect(FLOW_BUILDER_LABELS.panelSections.bookingLinkCopy.display).toBe(
      'Booking link copy'
    )
    expect(FLOW_BUILDER_LABELS.panelSections.bookingReengagement.display).toBe(
      'If they go quiet'
    )
  })

  it('renames escalation and qualifier section titles per the spec', () => {
    expect(FLOW_BUILDER_LABELS.panelSections.escalationTriggers.display).toBe(
      'When to escalate'
    )
    expect(FLOW_BUILDER_LABELS.panelSections.qualifierThresholds.display).toBe(
      'Lead temperature thresholds'
    )
    expect(FLOW_BUILDER_LABELS.panelSections.qualifierList).toMatchObject({
      display: expect.stringContaining('Things to learn before booking'),
    })
  })

  it('renames Fixed safety rules to Locked safety rules', () => {
    expect(FLOW_BUILDER_LABELS.panelSections.lockedSafetyRules.display).toBe(
      'Locked safety rules'
    )
    expect(
      FLOW_BUILDER_LABELS.panelSections.lockedSafetyRules.tooltip
    ).toBeTruthy()
  })
})

describe('FLOW_BUILDER_LABELS — locks sub-record', () => {
  it('exposes the safety and admin pill labels per the spec', () => {
    expect(FLOW_BUILDER_LABELS.locks.safety.display).toBe('Locked')
    expect(FLOW_BUILDER_LABELS.locks.admin.display).toBe('Locked (admin)')
  })

  it('exposes the popover heading and Ask-James escalation copy', () => {
    expect(FLOW_BUILDER_LABELS.locks.popoverHeading.display).toBe(
      'Why this is locked'
    )
    expect(FLOW_BUILDER_LABELS.locks.askJames.display).toMatch(/Ask James/)
  })

  it('references the lock catalog so downstream callers have one entry point', () => {
    expect(FLOW_BUILDER_LABELS.locks.catalog).toBeDefined()
    // Sanity check: at least one well-known id is present.
    expect(FLOW_BUILDER_LABELS.locks.catalog['qualifier.list']).toBeDefined()
  })
})
