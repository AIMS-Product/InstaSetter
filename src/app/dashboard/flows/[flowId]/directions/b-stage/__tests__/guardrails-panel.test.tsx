import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
  within,
  fireEvent,
} from '@testing-library/react'

import { GuardrailsPanel } from '../block-panels/guardrails'
import type { BrandGuardrail, Guardrail } from '../../../types'

afterEach(() => {
  cleanup()
})

const PERSONA_LOCKED: Guardrail[] = [
  {
    id: 'src/lib/prompts/sections/persona.ts:1',
    text: 'Never say "just popping in here real quick"',
    why: 'Persona-level identity/voice rule.',
    source: 'src/lib/prompts/sections/persona.ts',
  },
  {
    id: 'src/lib/prompts/sections/persona.ts:2',
    text: 'Never say "Still with me?"',
    why: 'Persona-level identity/voice rule.',
    source: 'src/lib/prompts/sections/persona.ts',
  },
]

const SAMPLE_GUARDRAILS: BrandGuardrail[] = [
  {
    id: '11111111-2222-4333-8444-555555555555',
    phrase: 'passive income',
    note: 'Anthony hates it.',
    createdAt: '2026-04-29T00:00:00.000Z',
  },
]

describe('GuardrailsPanel', () => {
  it('renders the locked persona phrases above the editable list', () => {
    render(
      <GuardrailsPanel guardrails={[]} lockedPersonaPhrases={PERSONA_LOCKED} />
    )

    expect(
      screen.getByText(/just popping in here real quick/)
    ).toBeInTheDocument()
    expect(screen.getByText(/Still with me\?/)).toBeInTheDocument()
  })

  it('shows the empty state when the operator list is empty', () => {
    render(
      <GuardrailsPanel guardrails={[]} lockedPersonaPhrases={PERSONA_LOCKED} />
    )

    expect(
      screen.getByText(/No brand-specific forbidden phrases yet/i)
    ).toBeInTheDocument()
  })

  it('renders one row per operator-added guardrail', () => {
    render(
      <GuardrailsPanel
        guardrails={SAMPLE_GUARDRAILS}
        lockedPersonaPhrases={PERSONA_LOCKED}
      />
    )

    expect(screen.getByDisplayValue('passive income')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Anthony hates it.')).toBeInTheDocument()
  })

  it('appends an empty row when "Add a forbidden phrase" is clicked', () => {
    const onChange = vi.fn()
    render(
      <GuardrailsPanel
        guardrails={[]}
        lockedPersonaPhrases={PERSONA_LOCKED}
        onChange={onChange}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: /add a forbidden phrase/i })
    )

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as BrandGuardrail[]
    expect(next).toHaveLength(1)
    expect(next[0]?.phrase).toBe('')
    expect(next[0]?.note).toBeNull()
  })

  it('updates the phrase when the input is changed', () => {
    const onChange = vi.fn()
    render(
      <GuardrailsPanel
        guardrails={SAMPLE_GUARDRAILS}
        lockedPersonaPhrases={PERSONA_LOCKED}
        onChange={onChange}
      />
    )

    const phraseInput = screen.getByDisplayValue('passive income')
    fireEvent.change(phraseInput, { target: { value: 'guaranteed returns' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as BrandGuardrail[]
    expect(next[0]?.phrase).toBe('guaranteed returns')
    // Other fields preserved
    expect(next[0]?.id).toBe(SAMPLE_GUARDRAILS[0]!.id)
    expect(next[0]?.note).toBe('Anthony hates it.')
  })

  it('removes a row when the delete button is clicked', () => {
    const onChange = vi.fn()
    render(
      <GuardrailsPanel
        guardrails={SAMPLE_GUARDRAILS}
        lockedPersonaPhrases={PERSONA_LOCKED}
        onChange={onChange}
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /delete phrase: passive income/i,
      })
    )

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toEqual([])
  })

  it('renders a counter showing usage out of 50', () => {
    const list: BrandGuardrail[] = [
      ...SAMPLE_GUARDRAILS,
      {
        id: '22222222-3333-4444-8555-666666666666',
        phrase: 'guaranteed returns',
        note: null,
        createdAt: '2026-04-29T00:00:00.000Z',
      },
    ]
    render(
      <GuardrailsPanel
        guardrails={list}
        lockedPersonaPhrases={PERSONA_LOCKED}
      />
    )

    expect(screen.getByText(/2 of 50 phrases used/i)).toBeInTheDocument()
  })

  it('warns on reserved phrases without blocking edits', () => {
    const reserved: BrandGuardrail[] = [
      {
        id: '33333333-4444-4555-8666-777777777777',
        phrase: 'booking',
        note: null,
        createdAt: '2026-04-29T00:00:00.000Z',
      },
    ]
    render(
      <GuardrailsPanel
        guardrails={reserved}
        lockedPersonaPhrases={PERSONA_LOCKED}
      />
    )

    const row = screen.getByDisplayValue('booking').closest('li')
    expect(row).not.toBeNull()
    expect(
      within(row as HTMLElement).getByText(/required behaviour|reserved/i)
    ).toBeInTheDocument()
    // Input still editable — the warning is non-blocking.
    expect(screen.getByDisplayValue('booking')).not.toBeDisabled()
  })
})
