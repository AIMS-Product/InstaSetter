import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_POST_EMAIL_BEHAVIOR } from '@/lib/prompts/post-email-behavior'
import type { EmailConfig } from '../../../types'
import { EmailPanel } from '../block-panels/email'

const config: EmailConfig = {
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

afterEach(() => {
  cleanup()
})

describe('EmailPanel', () => {
  it('edits post-email confirmation copy', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<EmailPanel config={config} onChange={onChange} />)

    const field = screen.getByLabelText(/after email is captured/i)
    await user.clear(field)
    await user.type(field, "Got it, I've saved that email.")

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        postEmailBehavior: expect.objectContaining({
          confirmationMessage: "Got it, I've saved that email.",
        }),
      })
    )
  })

  it('surfaces no-delivery immediate-send validation errors', async () => {
    const user = userEvent.setup()

    render(<EmailPanel config={config} onChange={vi.fn()} />)

    const field = screen.getByLabelText(/after email is captured/i)
    await user.clear(field)
    await user.type(field, "Got it, I'll send that right now.")

    expect(screen.getByText(/must not promise immediate/i)).toBeInTheDocument()
  })

  it('edits the sent email subject, body, and attachment metadata', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<EmailPanel config={config} onChange={onChange} />)

    await user.clear(screen.getByLabelText(/email subject/i))
    await user.type(screen.getByLabelText(/email subject/i), 'Your call prep')
    await user.clear(screen.getByLabelText(/email body/i))
    await user.type(
      screen.getByLabelText(/email body/i),
      'Here are the resources from our chat.'
    )
    await user.clear(screen.getByLabelText(/attachment file name/i))
    await user.type(
      screen.getByLabelText(/attachment file name/i),
      'prep-checklist.pdf'
    )
    await user.clear(screen.getByLabelText(/attachment url/i))
    await user.type(
      screen.getByLabelText(/attachment url/i),
      'https://assets.example.com/prep-checklist.pdf'
    )

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          postEmailBehavior: expect.objectContaining({
            emailTemplate: expect.objectContaining({
              subject: 'Your call prep',
              body: 'Here are the resources from our chat.',
              attachment: expect.objectContaining({
                fileName: 'prep-checklist.pdf',
                url: 'https://assets.example.com/prep-checklist.pdf',
              }),
            }),
          }),
        })
      )
    })
  })
})
