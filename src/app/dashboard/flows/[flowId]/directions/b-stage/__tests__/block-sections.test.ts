import { describe, it, expect } from 'vitest'
import {
  deriveBlock,
  extractBotGuardrails,
  extractExamples,
  extractGuardrails,
  isGlobalGuardrailSource,
  parsePersonaSections,
} from '../block-sections'
import { buildPersona } from '@/lib/prompts/sections/persona'
import { buildMessageConstraints } from '@/lib/prompts/sections/message-constraints'
import { DEFAULT_POST_EMAIL_BEHAVIOR } from '@/lib/prompts/post-email-behavior'

const BRAND = 'VendingPreneurs'

describe('extractExamples', () => {
  it('extracts prospect/good/bad triplets from persona section', () => {
    const pairs = extractExamples(buildPersona(BRAND))
    expect(pairs.length).toBeGreaterThan(0)
    const withBoth = pairs.filter((p) => p.good && p.bad)
    expect(withBoth.length).toBeGreaterThan(0)
  })
})

describe('parsePersonaSections', () => {
  it('returns Voice, Message Length, Affirmation, Forbidden, Off-Topic, Identity', () => {
    const parsed = parsePersonaSections(buildPersona(BRAND))
    const keys = parsed.map((p) => p.key)
    expect(keys).toContain('voice')
    expect(keys).toContain('messageLength')
    expect(keys).toContain('affirmation')
    expect(keys).toContain('forbidden')
    expect(keys).toContain('offTopic')
    expect(keys).toContain('identity')
  })

  it('locks Identity, Message Length, Forbidden, Off-Topic', () => {
    const parsed = parsePersonaSections(buildPersona(BRAND))
    expect(parsed.find((p) => p.key === 'identity')?.locked).toBe(true)
    expect(parsed.find((p) => p.key === 'messageLength')?.locked).toBe(true)
    expect(parsed.find((p) => p.key === 'forbidden')?.locked).toBe(true)
    expect(parsed.find((p) => p.key === 'offTopic')?.locked).toBe(true)
  })

  it('leaves Voice and Affirmation unlocked', () => {
    const parsed = parsePersonaSections(buildPersona(BRAND))
    expect(parsed.find((p) => p.key === 'voice')?.locked).toBe(false)
    expect(parsed.find((p) => p.key === 'affirmation')?.locked).toBe(false)
  })

  it('populates non-empty body for every recognised section', () => {
    const parsed = parsePersonaSections(buildPersona(BRAND))
    for (const sec of parsed) {
      expect(sec.body.length).toBeGreaterThan(0)
    }
  })
})

describe('extractGuardrails', () => {
  it('extracts Never/Always/MAXIMUM rules from message-constraints', () => {
    const rules = extractGuardrails(
      buildMessageConstraints(),
      'src/lib/prompts/sections/message-constraints.ts',
      'test'
    )
    expect(rules.length).toBeGreaterThan(3)
    for (const r of rules) {
      expect(r.text.length).toBeGreaterThan(0)
      expect(r.why).toBe('test')
      expect(r.source).toContain('message-constraints')
    }
  })

  it('extracts bot-level guardrails from persona + message constraints separately', () => {
    const rules = extractBotGuardrails({
      personaText: buildPersona(BRAND),
      messageConstraintsText: buildMessageConstraints(),
    })

    expect(rules.length).toBeGreaterThan(3)
    expect(
      rules.some((rule) => rule.source.includes('message-constraints'))
    ).toBe(true)
    expect(rules.some((rule) => rule.source.includes('persona'))).toBe(true)
  })
})

describe('deriveBlock', () => {
  it('opening has non-empty goal and first question', () => {
    const b = deriveBlock(BRAND, 'opening')
    expect(b.goal.length).toBeGreaterThan(0)
    expect(b.blockConfig.kind).toBe('opening')
    if (b.blockConfig.kind === 'opening') {
      expect(b.blockConfig.firstQuestion.length).toBeGreaterThan(0)
      expect(b.blockConfig.supportedMarkets).toEqual([
        'United States',
        'Canada',
      ])
      expect(b.blockConfig.outOfAreaScript.length).toBeGreaterThan(0)
    }
  })

  it('qualifier has 5 qualifiers with non-empty asks', () => {
    const b = deriveBlock(BRAND, 'qualifier')
    expect(b.blockConfig.kind).toBe('qualifier')
    if (b.blockConfig.kind === 'qualifier') {
      expect(b.blockConfig.qualifiers).toHaveLength(5)
      expect(b.blockConfig.minToBook).toBe(2)
      for (const q of b.blockConfig.qualifiers) {
        expect(q.label.length).toBeGreaterThan(0)
        expect(q.ask.length).toBeGreaterThan(0)
        // Regression guard: the first qualifier in qualification.ts is
        // "Whereabouts are you located?" or "What area are you thinking
        // of getting started in?" — on a single line. Previous parser kept
        // everything between the outermost quotes, producing malformed
        // strings containing stray " or " fragments. Assert no such artefact
        // survives in any qualifier's ask string.
        expect(q.ask).not.toMatch(/"\s*or\s*"/i)
        expect(q.ask).not.toContain('"')
      }
      const keys = b.blockConfig.qualifiers.map((q) => q.key)
      expect(keys).toEqual([
        'location',
        'motivation',
        'experience',
        'capital',
        'timeline',
      ])
      // Location (priority 1) and Capital (priority 4) are locked
      expect(b.blockConfig.qualifiers[0]!.locked).toBe(true)
      expect(b.blockConfig.qualifiers[3]!.locked).toBe(true)
      // Location qualifier should contain "Whereabouts" (first alternative only).
      expect(b.blockConfig.qualifiers[0]!.ask).toMatch(/whereabouts/i)
    }
  })

  it('objection has 9 handlers, sorted by occurrences descending', () => {
    const b = deriveBlock(BRAND, 'objection')
    expect(b.blockConfig.kind).toBe('objection')
    if (b.blockConfig.kind === 'objection') {
      expect(b.blockConfig.handlers).toHaveLength(9)
      // Top handler should be timing with 381 occurrences
      expect(b.blockConfig.handlers[0]!.type).toBe('timing')
      expect(b.blockConfig.handlers[0]!.occurrences).toBe(381)
      // Descending order
      for (let i = 1; i < b.blockConfig.handlers.length; i++) {
        expect(b.blockConfig.handlers[i]!.occurrences).toBeLessThanOrEqual(
          b.blockConfig.handlers[i - 1]!.occurrences
        )
      }
      // Every handler has an opener
      for (const h of b.blockConfig.handlers) {
        expect(h.opener.length).toBeGreaterThan(0)
      }
      expect(b.blockConfig.structure).toEqual([
        'acknowledge',
        'probe',
        'respond',
      ])
    }
  })

  it('booking has mirror template, link pattern, re-engagement config', () => {
    const b = deriveBlock(BRAND, 'booking')
    expect(b.blockConfig.kind).toBe('booking')
    if (b.blockConfig.kind === 'booking') {
      expect(b.blockConfig.mirrorTemplate.length).toBeGreaterThan(0)
      expect(b.blockConfig.linkPattern).toContain('{{brand.booking_url}}')
      expect(b.blockConfig.emailAskCombined.length).toBeGreaterThan(0)
      expect(b.blockConfig.reengagementAfterHours).toBe(24)
      expect(b.blockConfig.maxLinkSends).toBe(2)
      expect(b.blockConfig.reengagementScript.length).toBeGreaterThan(0)
    }
  })

  it('email has Primary/Backup/Secondary triggers', () => {
    const b = deriveBlock(BRAND, 'email')
    expect(b.blockConfig.kind).toBe('email')
    if (b.blockConfig.kind === 'email') {
      expect(b.blockConfig.triggers.length).toBeGreaterThanOrEqual(3)
      const priorities = b.blockConfig.triggers.map((t) => t.priority)
      expect(priorities).toContain('primary')
      expect(priorities).toContain('backup')
      expect(priorities).toContain('secondary')
      const backup = b.blockConfig.triggers.find((t) => t.priority === 'backup')
      expect(backup?.mandatory).toBe(true)
      expect(b.blockConfig.confirmationScript.length).toBeGreaterThan(0)
      expect(b.blockConfig.postEmailBehavior).toEqual(
        DEFAULT_POST_EMAIL_BEHAVIOR
      )
      expect(b.blockConfig.postEmailBehavior.confirmationMessage).toContain(
        'saved'
      )
      expect(b.blockConfig.postEmailBehavior.deliveryMode).toBe('none')
    }
  })

  it('followup has 48-hour delay and outcomes', () => {
    const b = deriveBlock(BRAND, 'followup')
    expect(b.blockConfig.kind).toBe('followup')
    if (b.blockConfig.kind === 'followup') {
      expect(b.blockConfig.delayHours).toBe(48)
      expect(b.blockConfig.script.length).toBeGreaterThan(0)
      expect(b.blockConfig.outcomes.length).toBe(3)
    }
  })

  it('escalation has triggers and handoff script', () => {
    const b = deriveBlock(BRAND, 'escalation')
    expect(b.blockConfig.kind).toBe('escalation')
    if (b.blockConfig.kind === 'escalation') {
      expect(b.blockConfig.triggers.length).toBeGreaterThan(0)
      expect(b.blockConfig.handoffScript.length).toBeGreaterThan(0)
      expect(b.blockConfig.captureMethod).toBe('contact.preferred_contact')
    }
  })

  it('summary has required fields (instagram_handle, qualification_status, call_booked) and trigger words', () => {
    const b = deriveBlock(BRAND, 'summary')
    expect(b.blockConfig.kind).toBe('summary')
    if (b.blockConfig.kind === 'summary') {
      const reqKeys = b.blockConfig.requiredFields.map((f) => f.key)
      expect(reqKeys).toContain('instagram_handle')
      expect(reqKeys).toContain('qualification_status')
      expect(reqKeys).toContain('call_booked')
      expect(b.blockConfig.optionalFields.length).toBeGreaterThan(3)
      expect(b.blockConfig.triggerWords.length).toBeGreaterThan(5)
      expect(b.blockConfig.mirrorTemplate.length).toBeGreaterThan(0)
    }
  })

  it('every block has block-specific guardrails with non-empty why', () => {
    const types = [
      'opening',
      'qualifier',
      'objection',
      'booking',
      'email',
      'followup',
      'escalation',
      'summary',
    ] as const
    for (const t of types) {
      const b = deriveBlock(BRAND, t)
      expect(b.guardrails.length).toBeGreaterThan(0)
      for (const g of b.guardrails) {
        expect(g.text.length).toBeGreaterThan(0)
        expect(g.why.length).toBeGreaterThan(0)
        expect(g.source.length).toBeGreaterThan(0)
        expect(isGlobalGuardrailSource(g.source)).toBe(false)
      }
    }
  })

  it('every block has rationale and captures/branches', () => {
    const types = [
      'opening',
      'qualifier',
      'objection',
      'booking',
      'email',
      'followup',
      'escalation',
      'summary',
    ] as const
    for (const t of types) {
      const b = deriveBlock(BRAND, t)
      expect(b.goal.length).toBeGreaterThan(0)
      expect(b.guidance.length).toBeGreaterThan(0)
      expect(b.rationale.length).toBeGreaterThan(0)
      expect(b.primarySectionIds.length).toBeGreaterThan(0)
      expect(b.globalSectionIds).toContain('persona')
    }
  })
})
