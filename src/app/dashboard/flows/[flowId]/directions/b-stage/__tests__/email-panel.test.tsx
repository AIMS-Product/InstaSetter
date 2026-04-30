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

    render(
      <EmailPanel
        config={config}
        onChange={onChange}
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
      />
    )

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

    render(
      <EmailPanel
        config={config}
        onChange={vi.fn()}
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
      />
    )

    const field = screen.getByLabelText(/after email is captured/i)
    await user.clear(field)
    await user.type(field, "Got it, I'll send that right now.")

    expect(screen.getByText(/must not promise immediate/i)).toBeInTheDocument()
  })

  it('edits the sent email subject and body', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <EmailPanel
        config={config}
        onChange={onChange}
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
      />
    )

    await user.clear(screen.getByLabelText(/email subject/i))
    await user.type(screen.getByLabelText(/email subject/i), 'Your call prep')
    await user.clear(screen.getByLabelText(/email body/i))
    await user.type(
      screen.getByLabelText(/email body/i),
      'Here are the resources from our chat.'
    )

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          postEmailBehavior: expect.objectContaining({
            emailTemplate: expect.objectContaining({
              subject: 'Your call prep',
              body: 'Here are the resources from our chat.',
            }),
          }),
        })
      )
    })
  })

  it('renders the asset uploader (drop zone) for the new attachment flow', () => {
    render(
      <EmailPanel
        config={config}
        onChange={vi.fn()}
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
      />
    )

    expect(
      screen.getByText(/drop a file or click to browse/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /use external url instead/i })
    ).toBeInTheDocument()
  })

  it('still allows configuring a legacy URL attachment via the toggle', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    // Pre-populate with a legacy attachment so the schema validates as
    // soon as the user touches the URL field. (The schema rejects an
    // attachment with empty fileName + URL — that validation shape is
    // exercised separately in the post-email-behavior schema tests.)
    const seededConfig: EmailConfig = {
      ...config,
      postEmailBehavior: {
        ...config.postEmailBehavior,
        emailTemplate: {
          ...config.postEmailBehavior.emailTemplate,
          attachment: {
            kind: 'url',
            fileName: 'legacy.pdf',
            url: 'https://assets.example.com/legacy.pdf',
            description: null,
          },
        },
      },
    }

    render(
      <EmailPanel
        config={seededConfig}
        onChange={onChange}
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
      />
    )

    // Already in legacy mode because of the seeded attachment.
    await user.clear(screen.getByLabelText(/^attachment url$/i))
    await user.type(
      screen.getByLabelText(/^attachment url$/i),
      'https://assets.example.com/replacement.pdf'
    )

    await waitFor(() => {
      const calls = onChange.mock.calls.filter((call) => {
        const attachment = call[0]?.postEmailBehavior?.emailTemplate?.attachment
        return (
          attachment &&
          attachment.kind === 'url' &&
          attachment.url === 'https://assets.example.com/replacement.pdf'
        )
      })
      expect(calls.length).toBeGreaterThan(0)
    })
  })
})
