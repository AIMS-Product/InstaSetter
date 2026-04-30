import { z } from 'zod'

/**
 * Email attachments are either:
 *
 * - **legacy URL** (`kind: 'url'` or kind absent): operator-typed
 *   external URL string. The send worker fetches the URL directly.
 *   Kept parsable for back-compat with drafts authored before the
 *   asset-storage uploader landed.
 *
 * - **stored asset** (`kind: 'asset'`): operator-uploaded file living
 *   in the private `email-assets` Supabase Storage bucket. The send
 *   worker resolves the asset id to a 24h signed URL at send time.
 *   Authored via `email-asset-uploader.tsx` -> `uploadEmailAssetAction`.
 */
const LegacyEmailAttachmentSchema = z
  .object({
    // Defaulting `kind` to `'url'` lets the union discriminate cleanly
    // against `'asset'` while still parsing legacy drafts that omit it.
    kind: z.literal('url').default('url'),
    fileName: z.string().trim().min(1),
    url: z.string().trim().url(),
    description: z.string().trim().nullable(),
  })
  .strict()

const StoredEmailAttachmentSchema = z
  .object({
    kind: z.literal('asset'),
    assetId: z.string().uuid(),
    fileName: z.string().trim().min(1),
    description: z.string().trim().nullable(),
  })
  .strict()

export const EmailAttachmentSchema = z.union([
  StoredEmailAttachmentSchema,
  LegacyEmailAttachmentSchema,
])

export const EmailTemplateSchema = z
  .object({
    subject: z.string().trim().min(1),
    body: z.string().trim().min(1),
    attachment: EmailAttachmentSchema.nullable(),
  })
  .strict()

export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>
export type EmailAttachmentInput = z.input<typeof EmailAttachmentSchema>
export type LegacyEmailAttachment = z.infer<typeof LegacyEmailAttachmentSchema>
export type StoredEmailAttachment = z.infer<typeof StoredEmailAttachmentSchema>
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
