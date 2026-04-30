import { z } from 'zod'

/**
 * Pre-booking rapport step.
 *
 * After both qualifiers (location + motivation) are known, the bot asks ONE
 * rapport question before sending the booking link, unless rapport is already
 * established. The skip heuristic is encoded as plain-English guidance Claude
 * reads — not deterministic logic. Operators may edit the question and the
 * skip-when copy from the Booking block panel; the live default ships from
 * code via `resolveLivePreBookingStep` in `@/lib/services/pre-booking-resolver`.
 */
export const PreBookingStepSchema = z
  .object({
    enabled: z.boolean(),
    question: z.string().trim().min(1),
    skipWhen: z.string().trim().min(1),
  })
  .strict()

export type PreBookingStep = z.infer<typeof PreBookingStepSchema>

/**
 * Default rapport question + skip guidance.
 *
 * Sourced from Sofia's Apr 29 walkthrough — "What got you interested in vending?"
 * is the canonical example she gave. Skip-when guidance encodes the explicit
 * carve-out for prospects who have already volunteered motivation with story
 * detail (e.g. "Dallas, got about 7K saved up" — link should land instantly).
 */
export const DEFAULT_PRE_BOOKING_STEP: PreBookingStep = {
  enabled: true,
  question: 'What got you interested in vending?',
  skipWhen:
    'The prospect has already shared a clear motivation, story, or specific goal — for example, they have spent 4+ replies sharing context, volunteered a story, or asked a substantive question that demonstrates engagement.',
}
