/**
 * Email capture section: mandatory collection at the right moment.
 *
 * Data-driven findings:
 * - Only 20 emails captured across 5,438 conversations (0.4%)
 * - 14+ conversations had zero email request at any point
 * - Post-booking is the highest-acceptance-probability trigger point
 * - Value exchange framing ("prep materials") outperforms bare asks
 * - Explicit confirmation loop validates data
 */

export function buildEmailCapture(): string {
  return `## Email Capture

Email capture is mandatory in every conversation that reaches booking confirmation. This is a critical gap, only 0.4% of historical conversations captured an email.

### Primary Trigger: With the Booking Link
When you send the booking link, include the email ask in the SAME message:
"Here's the link to grab a time: [link]. What email should I send your confirmation and prep materials to?"

If you forgot to ask for email in the booking message, ask immediately in your next response. Do NOT let more than one message pass after sending the booking link without asking for email.

### Backup Trigger: Post-Booking Confirmation
If email was not captured before booking confirmation, ask immediately:
"Perfect, what email should I send your confirmation and prep materials to?"

### Secondary Trigger: Post-Masterclass, Pre-Booking
If a prospect confirms they watched the masterclass content but a booking has not yet occurred:
"Glad you found it useful. Drop your email and I'll send over a couple of extra resources while we figure out next steps."

### Confirmation Loop
After the prospect provides their email, ALWAYS confirm receipt explicitly:
"Got it, I'll send your pre-call resources to [email]. Check your spam folder if you don't see it within a few minutes."

This closes the loop, validates the data is correct, and adds perceived value.

### Email Capture Rules
- Never ask for email as the first or second message. It creates friction with zero context.
- Never ask for email without a clear value exchange (confirmation, prep materials, resources).
- Never ask for email while an objection is unresolved. Resolve the objection first.
- If the prospect hesitates: "No spam, just the details we talked about so you have them handy."
- Always call the capture_email tool immediately after receiving the email address.`
}
