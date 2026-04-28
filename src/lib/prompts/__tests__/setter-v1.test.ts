import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompts/setter-v1'

describe('buildSystemPrompt', () => {
  it('includes all 7 sections', () => {
    const prompt = buildSystemPrompt({ brandName: 'VendingPreneurs' })
    expect(prompt).toContain('VendingPreneurs')
    expect(prompt).toContain('email')
    expect(prompt).toContain('Calendly')
    expect(prompt).toContain('summary')
    expect(prompt).toContain('qualification')
    expect(prompt).toContain('objection')
  })

  it('interpolates brand name', () => {
    const prompt = buildSystemPrompt({ brandName: 'MedPro' })
    expect(prompt).toContain('MedPro')
    expect(prompt).not.toContain('VendingPreneurs')
  })

  it('includes version tag', () => {
    const prompt = buildSystemPrompt({ brandName: 'VendingPreneurs' })
    expect(prompt).toContain('setter-v1')
  })

  it('appends returning contact section with summaries', () => {
    const prompt = buildSystemPrompt({
      brandName: 'VP',
      isReturningContact: true,
      priorSummaries: [
        'Had 10 machines, interested in expansion',
        'Asked for pricing before booking',
      ],
    })
    expect(prompt).toContain('## Returning Contact')
    expect(prompt).toContain('1. Had 10 machines, interested in expansion')
    expect(prompt).toContain('2. Asked for pricing before booking')
  })

  it('does not append returning contact section when the summary list is empty', () => {
    const prompt = buildSystemPrompt({
      brandName: 'VP',
      isReturningContact: true,
      priorSummaries: [],
    })

    expect(prompt).not.toMatch(/returning contact/i)
  })

  it('omits returning contact section by default', () => {
    const prompt = buildSystemPrompt({ brandName: 'VP' })
    expect(prompt).not.toMatch(/returning contact/i)
  })

  it('includes Instagram message constraints', () => {
    const prompt = buildSystemPrompt({ brandName: 'VP' })
    expect(prompt).toMatch(/2.?000/)
  })

  it('includes all 5 objection types', () => {
    const prompt = buildSystemPrompt({ brandName: 'VP' })
    expect(prompt).toMatch(/too expensive/i)
    expect(prompt).toMatch(/not ready/i)
    expect(prompt).toMatch(/need to think/i)
    expect(prompt).toMatch(/already have/i)
    expect(prompt).toMatch(/just browsing/i)
  })

  it('includes concrete routing actions and required summary fields', () => {
    const prompt = buildSystemPrompt({ brandName: 'VP' })

    expect(prompt).toContain('qualify_lead')
    expect(prompt).toContain('book_call')
    expect(prompt).toContain('capture_email')
    expect(prompt).toContain('generate_summary')
    expect(prompt).toContain('instagram_handle (string, required)')
    expect(prompt).toContain(
      'qualification_status ("hot" | "warm" | "cold", required)'
    )
    expect(prompt).toContain('call_booked (boolean, required)')
  })
})
