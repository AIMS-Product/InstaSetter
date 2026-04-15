import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'

const DEFAULT_OPTS = { brandName: 'VendingPreneurs' }

describe('setter-v2 buildSystemPrompt', () => {
  // -------------------------------------------------------------------------
  // Structure
  // -------------------------------------------------------------------------

  it('includes version tag', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('[setter-v2]')
  })

  it('includes all 8 section headers', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    const expectedSections = [
      '## Persona',
      '## Company Context',
      '## Qualification Criteria',
      '## Objection Handling',
      '## Email Capture',
      '## Decision Routing',
      '## Summary Generation',
      '## Instagram Message Constraints',
    ]

    for (const section of expectedSections) {
      expect(prompt).toContain(section)
    }
  })

  it('interpolates brand name into all relevant sections', () => {
    const prompt = buildSystemPrompt({ brandName: 'MachineKing' })
    // Persona, Company Context, and Objections all use brandName
    const matches = prompt.match(/MachineKing/g)
    expect(matches?.length).toBeGreaterThanOrEqual(3)
    expect(prompt).not.toContain('VendingPreneurs')
  })

  // -------------------------------------------------------------------------
  // Persona section
  // -------------------------------------------------------------------------

  it('defines peer-mentor identity, not salesperson', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/mentor.*not a salesperson/i)
  })

  it('lists forbidden phrases', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('just popping in here real quick')
    expect(prompt).toContain('Still with me?')
  })

  it('bans generic affirmations', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('Okay smooth')
    expect(prompt).toContain('Nice man')
  })

  // -------------------------------------------------------------------------
  // Company Context section
  // -------------------------------------------------------------------------

  it('includes masterclass framing', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/free.*no credit card/i)
  })

  it('includes third-party fraud response protocol', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/without permission|unauthorized/i)
  })

  it('includes team structure guidance', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/partners.*closers/i)
  })

  // -------------------------------------------------------------------------
  // Qualification section
  // -------------------------------------------------------------------------

  it('requires minimum 2 qualifiers before booking', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/minimum of TWO/i)
  })

  it('lists location as first priority qualifier', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    // Location should be listed as #1
    expect(prompt).toMatch(/1\.\s+\*\*Location/)
  })

  it('lists budget after establishing value', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/ONLY ask after establishing value/i)
  })

  it('enforces one question at a time', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/ONE question at a time/i)
  })

  // -------------------------------------------------------------------------
  // Objection Handling section
  // -------------------------------------------------------------------------

  it('uses Acknowledge-Probe-Respond structure', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('Acknowledge')
    expect(prompt).toContain('Probe')
    expect(prompt).toContain('Respond')
  })

  it('covers all 9 objection types', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    const objectionTypes = [
      'TIMING',
      'NO CAPITAL',
      'LOCATION',
      'NEEDS TO THINK',
      'PRICE',
      'BAD CREDIT',
      'TRUST',
      'SPOUSE APPROVAL',
      'ALREADY HAS MACHINES',
    ]
    for (const type of objectionTypes) {
      expect(prompt.toUpperCase()).toContain(type)
    }
  })

  it('includes Socratic reframe technique', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/if you knew you were going to be successful/i)
  })

  // -------------------------------------------------------------------------
  // Email Capture section
  // -------------------------------------------------------------------------

  it('marks email capture as mandatory at booking', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/email capture is mandatory/i)
  })

  it('includes confirmation loop', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/Got it.*send.*pre-call resources/i)
  })

  it('references the 0.4% capture rate for urgency', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('0.4%')
  })

  // -------------------------------------------------------------------------
  // Decision Routing section
  // -------------------------------------------------------------------------

  it('defines 3 decision gates', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('GATE 1')
    expect(prompt).toContain('GATE 2')
    expect(prompt).toContain('GATE 3')
  })

  it('requires location + motivation before booking link', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/location.*AND.*motivation/is)
  })

  it('limits booking link messages to 2', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/not.*more than two.*booking link/i)
  })

  it('includes post-call escalation rules', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/post-call price objections/i)
    expect(prompt).toMatch(/escalat/i)
  })

  // -------------------------------------------------------------------------
  // Summary Generation section
  // -------------------------------------------------------------------------

  it('defines dual trigger points for summaries', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('Trigger 1')
    expect(prompt).toContain('Trigger 2')
  })

  it('includes UNDER-QUALIFIED flag', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain('UNDER-QUALIFIED')
  })

  it('lists all summary fields', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    const fields = [
      'instagram_handle',
      'qualification_status',
      'call_booked',
      'name',
      'email',
      'machine_count',
      'location_type',
      'revenue_range',
      'key_notes',
      'recommended_action',
    ]
    for (const field of fields) {
      expect(prompt).toContain(field)
    }
  })

  // -------------------------------------------------------------------------
  // Message Constraints section
  // -------------------------------------------------------------------------

  it('includes 2000 char limit', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/2.?000/)
  })

  it('enforces one message at a time', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/ONE message without waiting/i)
  })

  it('bans raw automation text', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toContain(
      'You sent a private reply to a comment on your Instagram post.'
    )
    expect(prompt).toMatch(/must NEVER appear/i)
  })

  it('includes value-forward re-engagement pattern', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).toMatch(/value-forward re-engagement/i)
  })

  // -------------------------------------------------------------------------
  // Returning Contact
  // -------------------------------------------------------------------------

  it('appends returning contact section with summaries', () => {
    const prompt = buildSystemPrompt({
      brandName: 'VP',
      isReturningContact: true,
      priorSummaries: ['Had 10 machines in Houston, interested in expansion'],
    })
    expect(prompt).toContain('Returning Contact')
    expect(prompt).toContain('Had 10 machines in Houston')
  })

  it('omits returning contact section by default', () => {
    const prompt = buildSystemPrompt(DEFAULT_OPTS)
    expect(prompt).not.toMatch(/returning contact/i)
  })

  it('omits returning contact when no summaries provided', () => {
    const prompt = buildSystemPrompt({
      brandName: 'VP',
      isReturningContact: true,
      priorSummaries: [],
    })
    expect(prompt).not.toMatch(/returning contact/i)
  })
})
