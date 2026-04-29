import { z } from 'zod'

export const EmailAttachmentSchema = z
  .object({
    fileName: z.string().trim().min(1),
    url: z.string().trim().url(),
    description: z.string().trim().nullable(),
  })
  .strict()

export const EmailTemplateSchema = z
  .object({
    subject: z.string().trim().min(1),
    body: z.string().trim().min(1),
    attachment: EmailAttachmentSchema.nullable(),
  })
  .strict()

export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplate = {
  subject: 'Your call details',
  body: 'Hey {{first_name}},\n\nHere are the call details and prep resources we talked about.',
  attachment: null,
}

export const PostEmailBehaviorSchema = z
  .object({
    confirmationMessage: z.string().trim().min(1),
    deliveryMode: z.enum(['none', 'manual', 'customerio', 'close', 'webhook']),
    resourceLabel: z.string().nullable(),
    nextStep: z.enum(['summary', 'booking', 'nurture', 'human_review']),
    emailTemplate: EmailTemplateSchema.default(DEFAULT_EMAIL_TEMPLATE),
  })
  .refine(
    (config) =>
      config.deliveryMode !== 'none' ||
      !/right now|within a few minutes/i.test(config.confirmationMessage),
    {
      message:
        'No-delivery confirmation copy must not promise immediate automatic sending.',
      path: ['confirmationMessage'],
    }
  )

export type PostEmailBehavior = z.output<typeof PostEmailBehaviorSchema>
export type PostEmailBehaviorInput = z.input<typeof PostEmailBehaviorSchema>

export const DEFAULT_POST_EMAIL_BEHAVIOR: PostEmailBehavior = {
  confirmationMessage:
    "Got it, I've saved your email for the pre-call resources and call details.",
  deliveryMode: 'none',
  resourceLabel: null,
  nextStep: 'summary',
  emailTemplate: DEFAULT_EMAIL_TEMPLATE,
}
