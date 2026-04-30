import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WarningChip } from '../warning-chip'

afterEach(() => {
  cleanup()
})

describe('WarningChip', () => {
  it('renders the message inside a status role', () => {
    render(<WarningChip message="This change affects what prospects see." />)

    const chip = screen.getByRole('status')
    expect(chip).toBeTruthy()
    expect(chip.textContent ?? '').toContain(
      'This change affects what prospects see.'
    )
  })

  it('uses an amber light-theme palette', () => {
    render(<WarningChip message="High-impact" />)
    const chip = screen.getByRole('status')
    // Tailwind class assertion — guards the colour tokens that match the
    // email panel "No automatic delivery" warning.
    expect(chip.className).toContain('bg-[#FFF7E6]')
    expect(chip.className).toContain('text-[#7A4B00]')
  })

  it('forwards additional className prop without losing base classes', () => {
    render(<WarningChip message="High-impact" className="ml-2" />)
    const chip = screen.getByRole('status')
    expect(chip.className).toContain('ml-2')
    expect(chip.className).toContain('rounded-md')
  })
})
