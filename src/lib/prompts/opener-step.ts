import { z } from 'zod'

/**
 * Opener step.
 *
 * The bot's first reply to a prospect's first message. Pairs with — and is
 * intentionally distinct from — the pre-booking rapport bridge in
 * `pre-booking-step.ts`. P1.02 shipped one rapport question, and Claude
 * pulled it forward into the opener slot, leaving nothing for the bridge:
 * the bot still went straight from two qualifiers to the booking link.
 *
 * This slot gives operators a separate opener question. The default skip
 * heuristic is plain English Claude reads — not deterministic logic.
 * Operators may edit the question and skip-when copy from the future
 * Opener block panel; the live default ships from code via
 * `resolveLiveOpenerStep` in `@/lib/services/opener-resolver`.
 */
export const OpenerStepSchema = z
  .object({
    enabled: z.boolean(),
    question: z.string().trim().min(1),
    skipWhen: z.string().trim().min(1),
  })
  .strict()

export type OpenerStep = z.infer<typeof OpenerStepSchema>

/**
 * Default opener question + skip guidance.
 *
 * Distinct from the pre-booking bridge ("What got you interested in
 * vending?") so Claude does not collapse the two slots into one. Sofia's
 * Apr 29 walkthrough asked for a softer, slightly drawn-out intro; the
 * extra opener turn is what creates that softness — qualifiers still
 * follow, the bridge still fires before the link.
 */
export const DEFAULT_OPENER_STEP: OpenerStep = {
  enabled: true,
  question:
    "Hey, glad you reached out — what's drawing you to vending right now?",
  skipWhen:
    'The prospect\'s first message already volunteers motivation, mentions a specific goal, asks a substantive question, or is 4+ words of context (e.g. "I\'ve got 7K saved and want to start a route in Dallas"). In those cases, skip the opener question and proceed directly to the location qualifier.',
}
