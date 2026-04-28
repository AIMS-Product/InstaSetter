import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, type ContactContext } from '@/lib/prompts/setter-v2'

describe('buildSystemPrompt with contactContext', () => {
  const baseOpts = {
    brandName: 'TestBrand',
  }

  it('includes contact context section when provided', () => {
    const ctx: ContactContext = {
      tags: ['qualified', 'location:Adelaide'],
      name: 'James',
      email: 'james@test.com',
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('Contact Context')
    expect(prompt).toContain('Name: James')
    expect(prompt).toContain('Email: james@test.com')
    expect(prompt).toContain('qualified, location:Adelaide')
  })

  it('omits contact context section when not provided', () => {
    const prompt = buildSystemPrompt(baseOpts)
    expect(prompt).not.toContain('Contact Context')
  })

  it('includes last qualification data when available', () => {
    const ctx: ContactContext = {
      tags: [],
      lastQualification: {
        status: 'warm',
        location: 'Adelaide',
        motivation: 'side income',
        budget: '$5K',
      },
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('Location: Adelaide')
    expect(prompt).toContain('Motivation: side income')
    expect(prompt).toContain('Budget: $5K')
    expect(prompt).toContain('Status: warm')
  })

  it('keeps known qualification heading out when only identity fields exist', () => {
    const ctx: ContactContext = {
      tags: [],
      name: 'James',
      email: 'james@test.com',
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('Contact Context')
    expect(prompt).toContain('Name: James')
    expect(prompt).toContain('Email: james@test.com')
    expect(prompt).not.toContain('Tags:')
    expect(prompt).not.toContain('Known qualification data')
    expect(prompt).not.toContain('MUST include the booking link')
  })

  it('injects booking directive when location AND motivation are in tags', () => {
    const ctx: ContactContext = {
      tags: ['location:Sydney', 'motivation:full-time'],
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('MUST include the booking link')
  })

  it('injects booking directive when location AND motivation are in lastQualification', () => {
    const ctx: ContactContext = {
      tags: [],
      lastQualification: {
        status: 'warm',
        location: 'Brisbane',
        motivation: 'scaling',
      },
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('MUST include the booking link')
  })

  it('does NOT inject booking directive when only location is known', () => {
    const ctx: ContactContext = {
      tags: ['location:Perth'],
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).not.toContain('MUST include the booking link')
  })

  it('does NOT inject booking directive when only motivation is known', () => {
    const ctx: ContactContext = {
      tags: ['motivation:side-income'],
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).not.toContain('MUST include the booking link')
  })

  it('injects booking directive when location is in tags and motivation is in lastQualification', () => {
    const ctx: ContactContext = {
      tags: ['location:Sydney'],
      lastQualification: {
        status: 'in-progress',
        motivation: 'replace income',
      },
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('Tags: location:Sydney')
    expect(prompt).toContain('Motivation: replace income')
    expect(prompt).toContain('MUST include the booking link')
  })

  it('injects booking directive when motivation is in tags and location is in lastQualification', () => {
    const ctx: ContactContext = {
      tags: ['motivation:side-income'],
      lastQualification: {
        status: 'warm',
        location: 'Toronto',
      },
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('Tags: motivation:side-income')
    expect(prompt).toContain('Location: Toronto')
    expect(prompt).toContain('MUST include the booking link')
  })

  it('omits empty optional fields', () => {
    const ctx: ContactContext = {
      tags: ['qualified'],
    }

    const prompt = buildSystemPrompt({ ...baseOpts, contactContext: ctx })

    expect(prompt).toContain('Tags: qualified')
    expect(prompt).not.toContain('Name:')
    expect(prompt).not.toContain('Email:')
    expect(prompt).not.toContain('Known qualification data')
  })
})
