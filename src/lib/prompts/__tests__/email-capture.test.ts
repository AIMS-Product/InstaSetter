import { describe, expect, it } from 'vitest'

import { DEFAULT_POST_EMAIL_BEHAVIOR } from '../post-email-behavior'
import { buildEmailCapture } from '../sections/email-capture'

describe('buildEmailCapture post-email behavior', () => {
  it('renders the safe default confirmation copy when no config is supplied', () => {
    const prompt = buildEmailCapture('https://booking.test')

    expect(prompt).toContain(DEFAULT_POST_EMAIL_BEHAVIOR.confirmationMessage)
  })

  it('renders custom confirmation copy without removing locked email rules', () => {
    const prompt = buildEmailCapture('https://booking.test', {
      confirmationMessage:
        "Got it, I've saved that email for the call details.",
      resourceLabel: null,
      deliveryMode: 'none',
      nextStep: 'summary',
    })

    expect(prompt).toContain(
      "Got it, I've saved that email for the call details."
    )
    expect(prompt).toContain('Always call the capture_email tool')
    expect(prompt).toContain(
      'Never ask for email as the first or second message'
    )
    expect(prompt).toContain('No automatic email delivery is configured')
  })

  it('can mention the resource label when customerio delivery is configured', () => {
    const prompt = buildEmailCapture('https://booking.test', {
      confirmationMessage: "Got it, I'll send the checklist to [email].",
      resourceLabel: 'Vending launch checklist',
      deliveryMode: 'customerio',
      nextStep: 'nurture',
      emailTemplate: {
        subject: 'Your launch checklist',
        body: 'Here is the checklist we talked about.',
        attachment: {
          fileName: 'launch-checklist.pdf',
          url: 'https://assets.example.com/launch-checklist.pdf',
          description: 'Vending launch checklist PDF',
        },
      },
    })

    expect(prompt).toContain('Vending launch checklist')
    expect(prompt).toContain('Customer.io')
    expect(prompt).toContain('Subject: Your launch checklist')
    expect(prompt).toContain('Attachment: launch-checklist.pdf')
  })
})
