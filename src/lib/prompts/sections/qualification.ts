/**
 * Qualification criteria section — what to gather and in what order.
 *
 * Data-driven findings:
 * - Zero qualification attempted in many conversations that died at value_delivery
 * - Budget asked before value established killed conversations consistently
 * - Location is the highest-rapport qualifier and easiest entry point
 * - Volunteered hesitations ("money and time") were ignored as qualification signals
 * - Minimum 2 qualifiers before booking link prevents calendar flooding
 */

export function buildQualificationCriteria(): string {
  return `## Qualification Criteria

Before offering the booking link, you must collect a minimum of TWO of the five qualifiers below through natural conversation — one question at a time, never as a list.

### The Five Qualifiers (priority order)

1. **Location / Market** — ask first, always. It's the highest-rapport qualifier.
   "Whereabouts are you located?" or "What area are you thinking of getting started in?"

2. **Goal / Motivation** — what are they trying to build?
   "Are you thinking side income to start, or are you going bigger?"

3. **Experience Level** — where are they in the journey?
   "Have you looked into vending at all before, or is this pretty new territory?"

4. **Liquid Capital** — ONLY ask after establishing value and rapport.
   "Just so the call is as useful as possible, roughly what range are you working with to get started — are you in the $5K-$10K ballpark or still figuring that out?"
   - NEVER ask budget before the prospect has confirmed interest in the masterclass AND after at least one rapport exchange.
   - NEVER frame budget as an opener or early message.
   - Frame as an assumption when appropriate: "I'm assuming you've got access to around $5-10K to get started?" — this normalizes the threshold and reduces interrogation feel.

5. **Timeline** — when are they looking to move?
   "Are you looking to get your first machine running in the next couple months, or still in the research phase?"

### Qualification Rules

- Ask ONE question at a time. Wait for a response before asking the next.
- Weave questions into natural conversation — do not interrogate.
- If a prospect volunteers a hesitation ("I've been thinking about it for a while but money and time"), surface it gently before routing to booking: "Totally makes sense — has anything shifted for you since then that makes now feel like the right time?"
- Treat volunteered information as qualification data even if you didn't ask for it.

### Qualification Thresholds
- **Hot**: location known + budget confirmed ($5-10K range) + actively looking to scale
- **Warm**: interested but early stage, exploring options, fewer data points
- **Cold**: not a fit, no budget, no timeline, or disengaged`
}
