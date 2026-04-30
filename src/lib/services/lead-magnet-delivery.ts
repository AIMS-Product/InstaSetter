/**
 * lead-magnet-delivery.ts — provider-agnostic delivery interface.
 *
 * Spec: plans/dm-setter-roadmap/p1-trust-conversation/05-anthony-magnet.md
 *
 * P1.05 ships only the contract + a no-op implementation so the rest of the
 * scaffolding can land without picking a provider. P2.04 swaps this for a
 * concrete Resend / Customer.io / Close implementation behind the same
 * interface.
 *
 * The shape mirrors the existing `EmailTemplate` schema in
 * `src/lib/prompts/post-email-behavior.ts` (commit 80d5d98) so future
 * adapters can render directly from the Email block configuration.
 */

export interface LeadMagnetDeliveryRequest {
  /** Foreign key into `lead_capture_events` for end-to-end tracing. */
  eventId: string
  /** Recipient email — already normalised lowercase by `recordLeadCaptureEvent`. */
  email: string
  /** Optional first-name salutation, when known. */
  recipientFirstName?: string | null
  /** Public URL to the magnet asset (PDF, video, etc). */
  attachmentUrl?: string | null
  /** Display filename for the attachment. */
  attachmentFileName?: string | null
  /** Email subject line. */
  subject: string
  /** Plain-text or HTML body, depending on the provider. */
  body: string
}

export type LeadMagnetDeliveryResult =
  | { success: true; providerId: string }
  | { success: false; error: string; retryable: boolean }

export interface LeadMagnetDelivery {
  /**
   * Attempt to deliver the magnet. Implementations MUST never throw.
   * On failure, return `{ success: false, retryable }` so the orchestrator
   * (P2's lead-magnet-job) can decide whether to dead-letter or retry.
   */
  send(req: LeadMagnetDeliveryRequest): Promise<LeadMagnetDeliveryResult>
}

/**
 * v0 implementation. Logs the request shape and returns success without
 * actually sending. This keeps the integration boundary stable while P2
 * picks a real provider — the rest of the plumbing (event recording, status
 * pill, dashboard surfaces) can land first against the no-op.
 *
 * Returns `delivered: false` in the success payload for observability so
 * dashboard surfaces can distinguish "we recorded this" from "we shipped this".
 */
export class NoopMagnetDelivery implements LeadMagnetDelivery {
  async send(
    req: LeadMagnetDeliveryRequest
  ): Promise<{
    success: true
    providerId: string
    delivered: false
    reason: 'noop'
  }> {
    console.info('[noop-magnet-delivery] would send', {
      event: 'lead_magnet.noop_send',
      eventId: req.eventId,
      hasAttachmentUrl: Boolean(req.attachmentUrl),
    })

    return {
      success: true,
      providerId: `noop_${req.eventId}`,
      delivered: false,
      reason: 'noop',
    }
  }
}
