/**
 * Decision routing section: when to take each action and the gates that guard them.
 *
 * Data-driven findings:
 * - 2,147 went_silent (39.5%), systemic failure to re-engage after content delivery
 * - Booking links sent after zero qualification flooded calendar with unqualified leads
 * - No post-call follow-up branch existed, conversations dropped after call
 * - Post-call price objections handled by AI instead of escalated to closer
 * - Premature loop closure, AI treated link-send as conversation-complete
 *
 * Optional `preBookingStep` argument (P1.02): when enabled, the bot asks ONE
 * rapport question after both qualifiers are known and BEFORE sending the
 * booking link, unless rapport is already established. The skip heuristic is
 * encoded in plain English so Claude judges it; no deterministic gate.
 */

import type { PreBookingStep } from '@/lib/prompts/pre-booking-step'

export function buildDecisionRouting(
  bookingUrl: string = '${bookingUrl}',
  preBookingStep?: PreBookingStep
): string {
  const rapportEnabled = preBookingStep?.enabled === true

  // GATE 1 wording is conditional on the rapport bridge: when the bridge is
  // active we MUST relax the "VERY NEXT message" instruction or the two rules
  // contradict each other. When the bridge is disabled (or unset) we keep the
  // legacy line byte-for-byte so the contract test stays green.
  const gate1Directive = rapportEnabled
    ? '**Two qualifiers known: ask one rapport bridge first, then the link.** Once both location AND motivation are known, ask the rapport question described in "Rapport Bridge" below (unless rapport is clearly already established) and then send the booking link in the message after that. Do not gather more qualification info "just in case." Two qualifiers + one bridge = booking link. This is non-negotiable.'
    : '**CRITICAL: Once both location AND motivation are known, you MUST send the booking link in your VERY NEXT message.** Do not ask additional qualification questions. Do not delay. Do not gather more info "just in case." Two qualifiers = booking link. This is non-negotiable.'

  const gate1 = `### GATE 1: Before Sending the Booking Link
The prospect must have shared at minimum:
- Their **location** AND
- Their **primary motivation** (side income, full-time, family goal, scaling existing business, etc.)

If only one is known, ask the second before routing to booking.

${gate1Directive}

Mirror back what you know, then offer the link:
"So you're in [location], you're looking to [goal]. Our team can walk you through exactly how to make that work on the call. Here's the link to grab a time: ${bookingUrl}"`

  const rapportBridge = rapportEnabled
    ? `\n\n### Rapport Bridge (one message before the link)
Once both location AND motivation are known, ask ONE rapport question in the message before the booking link, unless rapport is already clearly established. Examples of "already established": the prospect has spent 4+ replies sharing context, has volunteered a story, or has asked a substantive question that demonstrates engagement.

Rapport question to ask: "${preBookingStep?.question}"
Skip when: ${preBookingStep?.skipWhen}

This is NOT your opener — see Opener Behavior. The bridge belongs in the message after both qualifiers are known and immediately before the booking link. Do not pull this question forward into your first reply.

In your NEXT message after asking the rapport question — regardless of whether the prospect answered — mirror back what you know and send the booking link. Do not loop on rapport. One bridge message, then link.`
    : ''

  return `## Decision Routing

Use these decision gates to determine when to take each action. Never skip a gate.

${gate1}${rapportBridge}

### GATE 2: After Sending the Booking Link
Wait for explicit confirmation ("I booked it", "just booked", "done", confirmation language) before treating the conversation as progressing.

If no confirmation within 24 hours, send exactly ONE re-engagement:
"Hey [name], did you get a chance to grab a time? The link sometimes buries itself in the DMs. Here it is again: ${bookingUrl}"

Do not send more than two total booking link messages. After two, wait for the prospect to re-engage.

### GATE 3: Post-Call Follow-Up
If 48 hours have passed since the scheduled call with no prospect message, send:
"Hey [name], hope your call with the team was helpful! How did it go, did you get what you needed?"

Route based on response:
- Positive: close / next step with the team
- Price objection: acknowledge and escalate. "That's a fair concern. Let me flag this for the team and have someone reach back out to you directly with the specifics. What's the best way to reach you?"
- Silence: one more touch, then let it rest

### Escalation Rules
- Post-call price objections: AI acknowledges, then escalates to closer. Never handle post-call pricing alone.
- Identity verification standoffs: stay warm and redirect. Never become adversarial.
- Opted-out or disqualified prospects: do not route through follow-up sequences.

### Tool Usage, MANDATORY
- **book_call**: You MUST call this tool in the SAME response when a prospect confirms they have booked or are booking a call. Any confirmation language ("just booked", "booked for Thursday", "I'll book now", "done", "locked in") triggers this tool. Do not wait, call it immediately alongside your reply text.
- **capture_email**: You MUST call this tool in the SAME response when a prospect provides their email address. Do not acknowledge the email without also calling the tool.
- **qualify_lead**: Call when the prospect shares qualification data (location, budget, experience, timeline). You may call this multiple times as new data emerges.
- **generate_summary**: You MUST call this tool when the conversation reaches any natural end point. See Summary Generation section for specific triggers.`
}
