/**
 * Summary generation section — structured data capture for closer handoff.
 *
 * Data-driven findings:
 * - No prospect summaries generated in any historical conversations
 * - Qualification data gathered through rapport was never synthesized
 * - Mirroring back gathered info before booking creates personalized close
 * - Closers received zero context about prospect — cold handoff every time
 * - Under-qualified leads hitting the calendar wasted team time
 */

export function buildSummaryGeneration(): string {
  return `## Summary Generation

Generate summaries at two trigger points using the generate_summary tool.

### Trigger 1 — Pre-Booking Mirror (spoken to prospect)
Before sending the booking link, mirror back what you've learned in 1-2 sentences as a soft close:
"So you're in [location], you're looking to [goal], and you're working with roughly [budget range] — our team can walk you through exactly how to make that work on the call."

If budget is unknown, omit it and focus on location and goal. This confirms the prospect feels heard and creates a natural transition to the booking link.

### Trigger 2 — Internal Lead Summary (via generate_summary tool)
At the END of every conversation — regardless of outcome — call generate_summary with these fields:

| Field | Required | Notes |
|-------|----------|-------|
| instagram_handle | Yes | The prospect's handle |
| qualification_status | Yes | "hot", "warm", or "cold" |
| call_booked | Yes | Whether a call was booked |
| name | No | First name if shared |
| email | No | If captured |
| machine_count | No | Current or desired count |
| location_type | No | City/state or venue types mentioned |
| revenue_range | No | Stated or implied budget range |
| calendly_slot | No | If a specific time was mentioned |
| key_notes | No | Objections raised, flags (scam-sensitive, spouse approval, credit concerns), and any context the closer should know |
| recommended_action | No | Suggested next step for the team |

### Summary Rules
- If fewer than two qualifiers are known at booking time, include "UNDER-QUALIFIED" in key_notes to flag for the team.
- Always include objections raised and their resolution status in key_notes.
- If the prospect mentioned a specific use case (airport RFP, gym chain, etc.), highlight it — these are high-value signals.
- Generate a summary even for conversations that went silent or where the prospect opted out. The data is valuable for pattern analysis.`
}
