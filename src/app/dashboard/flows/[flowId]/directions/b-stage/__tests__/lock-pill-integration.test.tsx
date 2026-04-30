import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { FLOW_BUILDER_LOCKS } from '@/lib/dashboard/flow-builder-locks'
import { DEFAULT_POST_EMAIL_BEHAVIOR } from '@/lib/prompts/post-email-behavior'
import type {
  BookingConfig,
  EmailConfig,
  EscalationConfig,
  OpeningConfig,
  QualifierConfig,
  SummaryConfig,
} from '../../../types'
import { BookingPanel } from '../block-panels/booking'
import { EmailPanel } from '../block-panels/email'
import { EscalationPanel } from '../block-panels/escalation'
import { OpeningPanel } from '../block-panels/opening'
import { QualifierPanel } from '../block-panels/qualifier'
import { SummaryPanel } from '../block-panels/summary'

afterEach(() => {
  cleanup()
})

const opening: OpeningConfig = {
  kind: 'opening',
  firstQuestion: 'Hey, what brings you in?',
  supportedMarkets: ['US', 'CA'],
  outOfAreaScript: 'Appreciate you reaching out.',
}

const qualifier: QualifierConfig = {
  kind: 'qualifier',
  minToBook: 2,
  qualifiers: [
    {
      priority: 1,
      key: 'location',
      label: 'Where are you based?',
      ask: 'What city are you in?',
      rules: [],
      locked: true,
    },
  ],
  thresholds: [
    { name: 'hot', criteria: 'Capital ready, US-based, motivated.' },
  ],
}

const booking: BookingConfig = {
  kind: 'booking',
  mirrorTemplate: 'You said {{contact.location}} and {{contact.motivation}}.',
  linkPattern: 'https://example.com/{{slug}}',
  emailAskCombined: 'Drop your email and I will send the link.',
  reengagementAfterHours: 24,
  maxLinkSends: 2,
  reengagementScript: 'Just bumping this up.',
}

const email: EmailConfig = {
  kind: 'email',
  triggers: [
    {
      priority: 'primary',
      when: 'With the booking link',
      script: 'Ask for email with the booking link.',
      mandatory: true,
    },
  ],
  confirmationScript: DEFAULT_POST_EMAIL_BEHAVIOR.confirmationMessage,
  postEmailBehavior: DEFAULT_POST_EMAIL_BEHAVIOR,
  hesitationScript: 'No spam, just the details.',
}

const escalation: EscalationConfig = {
  kind: 'escalation',
  triggers: ['Asks to speak to a human'],
  handoffScript: 'A teammate will jump in shortly.',
  captureMethod: 'HUMAN_AGENT',
}

const summary: SummaryConfig = {
  kind: 'summary',
  mirrorTemplate: 'You said X.',
  requiredFields: [
    { key: 'location', label: 'Location', notes: 'City + state.' },
  ],
  optionalFields: [],
  triggerWords: ['interested'],
}

describe('LockPill integration — every panel resolves catalog ids', () => {
  it('opening surfaces opening.usCanadaGate as a safety lock', async () => {
    const user = userEvent.setup()
    render(<OpeningPanel config={opening} />)

    const pills = screen.getAllByRole('button', {
      name: /US\/Canada market gate/i,
    })
    await user.click(pills[0]!)

    expect(screen.getByRole('dialog')).toBeTruthy()
    // Safety locks have no escalation note.
    expect(screen.queryByText(/Ask James/i)).toBeNull()
  })

  it('qualifier surfaces qualifier.list as an admin lock with escalation', async () => {
    const user = userEvent.setup()
    render(<QualifierPanel config={qualifier} />)

    await user.click(
      screen.getByRole('button', { name: /Locked \(admin\): Qualifier list/i })
    )

    expect(screen.getByText(/Ask James/i)).toBeTruthy()
  })

  it('booking surfaces booking.reengagement on the re-engagement card', () => {
    render(<BookingPanel config={booking} />)
    expect(
      screen.getAllByRole('button', {
        name: /Locked \(admin\): Booking re-engagement timing/i,
      }).length
    ).toBeGreaterThan(0)
  })

  it('email surfaces email.captureEmailTool as a safety lock', () => {
    render(<EmailPanel config={email} />)
    expect(
      screen.getByRole('button', {
        name: /Locked: capture_email tool firing/i,
      })
    ).toBeTruthy()
  })

  it('escalation surfaces escalation.captureMethod as a safety lock', () => {
    render(<EscalationPanel config={escalation} />)
    expect(
      screen.getByRole('button', { name: /Locked: Human handoff tag/i })
    ).toBeTruthy()
  })

  it('summary surfaces summary.requiredFields as an admin lock', () => {
    render(<SummaryPanel config={summary} />)
    expect(
      screen.getAllByRole('button', {
        name: /Locked \(admin\): Summary required fields/i,
      }).length
    ).toBeGreaterThan(0)
  })

  it('every catalog entry has a non-empty surface for popover headers', () => {
    for (const entry of Object.values(FLOW_BUILDER_LOCKS)) {
      expect(entry.surface).toBeTruthy()
      expect(entry.tooltip).toBeTruthy()
    }
  })
})
