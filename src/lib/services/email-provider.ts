import 'server-only'

/**
 * Adapter shim for the live email-delivery channel chosen in P2.01.
 *
 * Resend wins as the v1 provider — see
 * `plans/dm-setter-roadmap/p2-live-email-delivery/decision.md` for the
 * one-page rationale (DX, Svix-signed webhooks, dashboard ergonomics, vendor
 * cohort with Vercel + Supabase).
 *
 * This file deliberately ships as a no-op stub. The real Resend SDK call
 * lands in P2.04 along with the webhook route handler. Downstream specs
 * (P2.02 published-snapshot, P2.03 asset-storage, P2.04 real-send,
 * P2.05 retry/visibility) import the typed interface below as a stable
 * contract so they can compile and test against the boundary today.
 *
 * This module MUST NOT import any third-party SDK. The shim is pure
 * TypeScript types + a no-op implementation. Installing `resend` and
 * `svix` is P2.04's job.
 */

export interface EmailAttachmentInput {
  /** Display filename the recipient sees on the attached file. */
  fileName: string
  /**
   * Signed URL or remote URL the provider downloads server-side. Resend's
   * `attachments[].path` field accepts a fetchable URL; the provider does the
   * fetch + base64-encode itself, so we never have to load asset bytes into
   * the Next.js runtime. P2.03 owns the URL-signing layer.
   */
  url: string
  /** Optional MIME type override; if omitted, the provider sniffs from URL. */
  contentType?: string
}

export interface SendTransactionalEmailInput {
  /** RFC-5321 recipient address. Validated upstream by the caller. */
  to: string
  /**
   * Resolved at the call-site by reading config (e.g. `Anthony from
   * VendingPreneurs`). The verified sending address (e.g.
   * `team@vendingpreneurs.com`) is read separately from config inside the
   * provider implementation; the shim does not need it.
   */
  fromDisplay: string
  subject: string
  /** Plain text by default. HTML is opt-in via a P2.04 follow-up. */
  body: string
  /** Monitored shared inbox; defaults via config when omitted. */
  replyTo?: string
  /**
   * Optional attachment metadata. `null` is accepted as an explicit
   * "no attachment" signal so the caller can keep field shape stable across
   * branches.
   */
  attachment?: EmailAttachmentInput | null
  /**
   * Required idempotency key. Resend honours `Idempotency-Key` (24h window,
   * <=256 chars) — verified against
   * https://resend.com/docs/api-reference/emails/send-email
   * (fetched April 2026). The caller MUST provide a deterministic value
   * tied to the business event, e.g. `email_capture_<conversationId>`.
   */
  idempotencyKey: string
  /**
   * Free-form metadata for dashboard correlation (Resend's `tags` and our
   * own DB rows). Keys/values are short strings — providers cap length;
   * downstream code handles truncation.
   */
  metadata?: Record<string, string>
}

export type SendTransactionalEmailResult =
  | { success: true; providerMessageId: string }
  | { success: false; error: string; retryable: boolean }

/**
 * Send a transactional email via the chosen provider.
 *
 * Until P2.04 wires Resend, this stub returns
 * `{ success: false, error: 'NOT_CONFIGURED', retryable: false }`. It is
 * safe to import from any server context. Calling it never throws.
 */
export async function sendTransactionalEmail(
  _input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
  return {
    success: false,
    error: 'NOT_CONFIGURED',
    retryable: false,
  }
}
