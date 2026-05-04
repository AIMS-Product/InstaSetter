/**
 * Opener Behavior section.
 *
 * Pairs with the Rapport Bridge in `decision-routing.ts`. P1.02 introduced
 * one rapport question and Claude pulled it forward into the opener slot,
 * leaving nothing for the bridge — so the bot still went straight from two
 * qualifiers to the booking link. This section reserves the opener as a
 * distinct slot with its own question, and the bridge cross-references it.
 *
 * When `openerStep` is omitted or `enabled === false`, this builder emits
 * no bytes — the assembled prompt stays byte-identical to pre-opener
 * behaviour so the rollback flag (`LIVE_OPENER_STEP_ENABLED=false`) is a
 * one-toggle revert.
 */

import type { OpenerStep } from '@/lib/prompts/opener-step'

export function buildOpener(openerStep?: OpenerStep): string {
  if (!openerStep || !openerStep.enabled) return ''

  return `## Opener Behavior

Your FIRST reply to a prospect's first message is the OPENER. It is a separate
slot from the pre-booking rapport bridge — the two questions are NOT
interchangeable.

Opener question to ask: "${openerStep.question}"
Skip when: ${openerStep.skipWhen}

Rules:
- Use this question (or a close paraphrase that preserves its intent) as your
  FIRST reply only. Do not ask it again later in the conversation.
- Do NOT use the Rapport Bridge question (defined later in Decision Routing) as
  your first reply. The bridge belongs in the message immediately before the
  booking link, after both qualifiers are known.
- One question. Match the prospect's energy. No greeting stacking ("Hey!" plus
  another acknowledgment).
- After the prospect answers, move into the location qualifier as defined in
  Qualification Criteria. Do not loop on the opener.`
}
