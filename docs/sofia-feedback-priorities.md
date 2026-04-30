# Sofia Feedback Priorities

Working notes from the Sofia Pedrotti walkthrough on April 29, 2026. The goal is to turn the feedback into a practical product queue for the first operator-facing version of InstaSetter.

## Context

Sofia is likely to be one of the first non-technical users reviewing the dashboard, conversations view, and Flow Builder. Her feedback should be treated as a strong signal for whether the product is understandable to marketing operators without developer help.

The current demo surfaced three themes:

- The dashboard and conversation review layer are valuable, especially qualification badges and conversation visibility.
- The Flow Builder visual model makes sense, but labels, edit locations, and rule sections need to be clear enough for non-technical users.
- Close CRM handoff, lead magnet delivery, and attribution are the most important operational workflows after basic access is stable.

## Priority 0 - Access And Basic Trust

These items unblock Sofia, Jeffrey, and Cody from reviewing the product and giving real feedback.

| Item                                            | Why It Matters                                                                                         | Target Outcome                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Done - Fix dashboard authentication/link issue  | The walkthrough exposed a broken entry path before the live dashboard could be shared.                 | Complete: dashboard auth/link issue has been fixed.                     |
| Done - Send Sofia the live dashboard link       | Feedback cannot start until she has access.                                                            | Complete: Sofia has the link and can start reviewing independently.     |
| Done - Create dedicated DM Setter Slack channel | Keeps feedback, questions, links, and decisions out of scattered DMs.                                  | Complete: Slack channel has been created for feedback and coordination. |
| Label current limitations clearly               | Conversations are currently read-only, some metrics are not hooked up, and Close sync is not live yet. | Sofia knows what is usable now versus still under construction.         |

## Priority 1 - Conversation Quality And Lead Magnet Readiness

These items affect what prospects experience in Instagram DMs.

| Item                                               | Why It Matters                                                                                         | Target Outcome                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Add a softer step before booking handoff           | Sofia noted the bot can feel too abrupt when it moves from location qualification straight to booking. | After location is confirmed, the bot asks one more natural question before sending the booking link unless enough rapport already exists. |
| Review skeptical/adversarial conversations         | One live conversation showed a prospect asking direct questions and challenging the bot.               | Define how the bot should answer detailed questions, when to keep qualifying, and when to escalate.                                       |
| Finalize post-email behavior                       | The bot currently asks for email and implies something may be sent, but the asset may not exist yet.   | The bot only promises a resource when there is a real lead magnet or follow-up path attached.                                             |
| Prepare Anthony lead magnet path                   | Sofia wants the Anthony lead magnet moving within roughly a week.                                      | Decide whether the first version is landing-page capture, DM capture, or both.                                                            |
| Identify forbidden phrases and escalation triggers | Sofia understood the value of "never say this" rules.                                                  | Start a small operator-owned list of phrases, claims, and scenarios the bot should avoid or escalate.                                     |

### Post-Email Delivery Notes

Current state:

- Flow Builder now lets an operator configure the post-email confirmation message, delivery mode, next step, email subject, email body, and optional attachment metadata.
- This configuration is saved in drafts and visible in the simulator.
- Live Instagram traffic does not yet send the configured email or attachment. The current live path still only captures the email and keeps the actual delivery integration out of scope.

What is left to make this real:

- Decide the first real delivery channel: Customer.io, Close, webhook, or manual handoff.
- Add a published-flow path so only reviewed/published email templates can affect live conversations.
- Store attachment assets somewhere durable, likely Vercel Blob, Supabase Storage, or Customer.io-hosted assets, instead of only storing a URL string.
- Add delivery status tracking on the conversation/contact: pending, sent, failed, skipped, manual follow-up required.
- Add retry and error visibility so operators can see when a promised email failed to send.
- Decide whether email delivery should trigger immediately after `capture_email`, after booking confirmation, or only after a human/operator-approved event.

How to make it live:

1. Publish reviewed Flow Builder config into a versioned live snapshot.
2. When the bot calls `capture_email`, persist the email and enqueue a delivery job using the published snapshot, not the draft.
3. The delivery job renders the configured subject/body with contact variables, attaches or links the approved asset, and sends through the chosen channel.
4. Write the delivery result back to the conversation/contact record.
5. Show the result in the dashboard and conversation detail view.
6. Keep a rollback path so a bad email template can be unpublished quickly.

Sender/from-address decisions (LOCKED 2026-04-29 — see [`plans/dm-setter-roadmap/p2-live-email-delivery/decision.md`](../plans/dm-setter-roadmap/p2-live-email-delivery/decision.md)):

- **Provider:** Resend. Postmark is the runner-up if Resend's domain verification or sandbox limits hit a wall — switching cost is 1–2 days isolated to `src/lib/services/email-provider.ts` and the P2.04 webhook route.
- **Verified sender (From address):** `team@vendingpreneurs.com`. The verification path is Resend dashboard → Domains → DKIM + SPF + DMARC TXT records on `vendingpreneurs.com`.
- **Display name:** `Anthony from VendingPreneurs`. The full From header reads `Anthony from VendingPreneurs <team@vendingpreneurs.com>`. The display string is exposed as the `RESEND_FROM_DISPLAY_NAME` env var so it can change without redeploy.
- **Reply-To:** `sales@vendingpreneurs.com` (a monitored shared inbox or Google Group, never a no-reply address). James provisions this before P2.04 cutover.
- **Open/click tracking:** OFF in v1. No tracking pixels added to the body.
- Customer.io and Close are NOT used for the post-email-capture lead-magnet send. Customer.io is reconsidered when P3 (Close handoff) wires in. Close stays the sales-rep follow-up channel.

## Priority 2 - Close CRM Handoff

These items make the system useful to sales rather than only useful for monitoring.

| Item                                        | Why It Matters                                                             | Target Outcome                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Push captured emails/leads into Close       | Sofia specifically asked whether emails can be saved and tracked in Close. | Qualified leads and captured emails create or update Close records.                              |
| Add `Sent to Close` status on conversations | Operators need visible confirmation that sync worked.                      | Conversation rows and detail views show whether a lead was sent to Close, failed, or is pending. |
| Add dashboard metric for Close handoff      | Sofia suggested tracking lead handoff percentages over time.               | Dashboard shows leads sent to Close this week and percentage of relevant DMs/leads sent.         |
| Create a drill-down view for synced leads   | The team needs to audit which conversations made it downstream.            | Clicking the Close metric shows the conversations/leads included in the count.                   |

## Priority 3 - Flow Builder Usability

These items determine whether Sofia can safely tune the bot without asking James to edit code.

| Item                                                     | Why It Matters                                                                                             | Target Outcome                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Simplify or explain operator labels                      | Terms like variables, global rules, guidance, qualifier, and booking handoff may be unclear at first pass. | A marketer can understand where to change booking links, bot rules, and stage-specific behavior. |
| Make simulator state obvious                             | During the demo, it would help if the active node highlighted as the simulated chat moves.                 | Simulator visually shows which flow block is currently responding.                               |
| Make editable versus locked rules obvious                | Some global rules are locked and some may become editable.                                                 | Operators know which rules they can change and which require developer/admin changes.            |
| Add warnings and rollback/version history for rule edits | Sofia agreed a warning would help before changing high-impact rules.                                       | Important rule edits show a warning and can be restored to a previous version.                   |
| Decide whether `Why this exists` is useful               | The section may help explain the system, but could also add clutter.                                       | Keep, collapse, rename, or hide based on Sofia's first independent review.                       |

## Priority 4 - Attribution And Reporting

These items improve marketing analysis once the core flow is stable.

| Item                                       | Why It Matters                                                                         | Target Outcome                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Build UTM-style lead source tracking       | Sofia immediately connected lead sources to UTM links and said Cody may care about it. | Each DM can be tied back to an ad, creative, campaign, or lead magnet source.                     |
| Compare ad creatives by downstream quality | Chat volume alone is not enough.                                                       | Reporting connects source to chats started, qualified conversations, bookings, and Close handoff. |
| Add weekly performance summaries           | Sofia suggested seeing percentages over a week.                                        | Dashboard can answer: "How many DMs turned into Close leads this week?"                           |

## Priority 5 - Later Investigation

These are useful, but should not block the first Sofia feedback loop.

| Item                                             | Why It Matters                                                                             | Target Outcome                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Investigate TikTok automation options            | TikTok automation is harder than Instagram, but Sofia may research tools like ManyChat.    | Document what is possible, compliant, and worth integrating.                          |
| Multi-bot / A-B flow variants                    | The Flow Builder already hints at opening variants and different booking/webinar outcomes. | Operators can test different openings, lead magnets, webinar links, or booking paths. |
| Automated recommendations from conversation data | Longer-term analysis could suggest better rules or flow changes.                           | System recommends improvements based on conversation outcomes.                        |

## Sofia Feedback Prompts

Use these prompts when asking Sofia to review the dashboard:

- What did you expect to click first?
- Which labels were confusing?
- Where did you expect to edit the booking link?
- Where did you expect to add a rule like "never say this"?
- Did the simulator make it clear what the bot would actually say?
- Did anything feel risky to edit?
- Which information would you want on the dashboard every morning?
- Which conversations would you want flagged for a human?
- What should happen after someone gives their email?
- What would you want Cody or Jeffrey to see first?

## Near-Term Suggested Sequence

1. Label current limitations clearly so Sofia knows what is live, read-only, or still being wired up.
2. Add the softer pre-booking question behavior.
3. Clarify email/lead magnet behavior so the bot does not over-promise.
4. Implement or design the first Close handoff status badge.
5. Collect Sofia's first independent feedback pass from the live link and Slack channel.
6. Rework Flow Builder labels and edit affordances from that feedback.
7. Start attribution design with Cody/Sofia input.
