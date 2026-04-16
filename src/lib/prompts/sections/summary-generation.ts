/**
 * Summary generation section: structured data capture for closer handoff.
 *
 * Data-driven findings:
 * - No prospect summaries generated in any historical conversations
 * - Qualification data gathered through rapport was never synthesized
 * - Mirroring back gathered info before booking creates personalized close
 * - Closers received zero context about prospect, cold handoff every time
 * - Under-qualified leads hitting the calendar wasted team time
 */

export function buildSummaryGeneration(): string {
  return `## Summary Generation

Generate summaries at two trigger points using the generate_summary tool.

### Trigger 1: Pre-Booking Mirror (spoken to prospect)
Before sending the booking link, mirror back what you've learned in 1-2 sentences as a soft close:
"So you're in [location], you're looking to [goal], and you're working with roughly [budget range]. Our team can walk you through exactly how to make that work on the call."

If budget is unknown, omit it and focus on location and goal. This confirms the prospect feels heard and creates a natural transition to the booking link.

### Trigger 2: Internal Lead Summary (via generate_summary tool)
You MUST call generate_summary when ANY of these happen:
- The prospect confirms they booked a call. Call generate_summary in the SAME response.
- The prospect says goodbye, thanks you, or signals the conversation is over. Call generate_summary in the SAME response.
- The prospect opts out or says they're not interested. Call generate_summary in the SAME response.
- You send a final follow-up and the conversation is winding down. Call generate_summary in the SAME response.

Call generate_summary with these fields:

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

### Summary Trigger Words — NON-NEGOTIABLE
If the prospect's message contains ANY of these patterns, you MUST call generate_summary in your response:
- "thanks", "thank you", "appreciate it", "cheers"
- "bye", "talk later", "talk soon", "gotta go", "ttyl"
- "will do", "sounds good" (after booking link sent), "I'll check it out"
- "not interested", "no thanks", "I'm good", "pass"
- "just booked", "booked it", "done", "locked in"

If you are sending a closing message ("Talk tomorrow!", "Looking forward to the call!", "Good luck!"), you MUST call generate_summary in the same response. If you are unsure whether the conversation is ending, call generate_summary anyway. It is always safe to call. A missing summary is a failure. An extra summary is fine.

### Summary Rules
- **ALWAYS call generate_summary at conversation end.** This is mandatory. Every conversation must produce a summary, regardless of outcome.
- If fewer than two qualifiers are known at booking time, include "UNDER-QUALIFIED" in key_notes to flag for the team.
- Always include objections raised and their resolution status in key_notes.
- If the prospect mentioned a specific use case (airport RFP, gym chain, etc.), highlight it. These are high-value signals.
- Generate a summary even for conversations that went silent or where the prospect opted out. The data is valuable for pattern analysis.`
}
