import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type HumanReviewSeverity = 'concern' | 'hostile' | 'compliance'
export type HumanReviewActor = 'bot' | 'operator'

export interface ConversationHumanReviewPause {
  conversationId: string
  reason: string
  severity: HumanReviewSeverity
  requestedAt: string
  requestedBy: HumanReviewActor
}

type ServiceResult = { success: true } | { success: false; error: string }

function normaliseSeverity(value: unknown): HumanReviewSeverity {
  return value === 'hostile' || value === 'compliance' ? value : 'concern'
}

function normaliseActor(value: unknown): HumanReviewActor {
  return value === 'operator' ? 'operator' : 'bot'
}

/**
 * Returns the active (uncleared) pause for the given conversation, if any.
 * Used by:
 *  - `processMessage` to short-circuit before calling Claude.
 *  - The conversation detail page to render the pause banner.
 */
export async function getActiveConversationPause(
  conversationId: string
): Promise<ConversationHumanReviewPause | null> {
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('conversation_human_review_pauses')
    .select(
      'conversation_id, reason, severity, requested_at, requested_by, cleared_at'
    )
    .eq('conversation_id', conversationId)
    .is('cleared_at', null)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('getActiveConversationPause failed', error)
    return null
  }
  if (!data) return null

  return {
    conversationId: data.conversation_id as string,
    reason: data.reason as string,
    severity: normaliseSeverity(data.severity),
    requestedAt: data.requested_at as string,
    requestedBy: normaliseActor(data.requested_by),
  }
}

/**
 * Inserts a pause row and flips the conversation status to `flagged`.
 * Called from the engine's `request_human_review` tool branch and (in v0)
 * not surfaced to operators directly — manual operator pauses live behind
 * the `pauseConversationForHumanReview({ requestedBy: 'operator' })` path.
 */
export async function pauseConversationForHumanReview(input: {
  conversationId: string
  reason: string
  severity: HumanReviewSeverity
  requestedBy: HumanReviewActor
}): Promise<ServiceResult> {
  const client = createServiceRoleClient()

  const insert = await client.from('conversation_human_review_pauses').insert({
    conversation_id: input.conversationId,
    reason: input.reason,
    severity: input.severity,
    requested_by: input.requestedBy,
  })

  if (insert.error) {
    return {
      success: false,
      error: extractErrorMessage(insert.error, 'pause insert failed'),
    }
  }

  // Flip conversation status. Failure here doesn't unwind the pause — the row
  // is the source of truth for "should the bot reply?". Status is just the
  // display surface.
  const { error: convError } = await client
    .from('conversations')
    .update({ status: 'flagged', updated_at: new Date().toISOString() })
    .eq('id', input.conversationId)

  if (convError) {
    console.error(
      'pauseConversationForHumanReview: conversation status update failed',
      convError
    )
  }

  return { success: true }
}

/**
 * Marks the active pause as cleared and returns the conversation to `active`.
 * Called from the dashboard Server Action `resumeConversationAction`.
 */
export async function resumeConversationFromHumanReview(input: {
  conversationId: string
  clearedBy: string
}): Promise<ServiceResult> {
  const client = createServiceRoleClient()
  const now = new Date().toISOString()

  const { error: updateError } = await client
    .from('conversation_human_review_pauses')
    .update({ cleared_at: now, cleared_by: input.clearedBy })
    .eq('conversation_id', input.conversationId)
    .is('cleared_at', null)

  if (updateError) {
    return {
      success: false,
      error: extractErrorMessage(updateError, 'pause clear failed'),
    }
  }

  const { error: convError } = await client
    .from('conversations')
    .update({ status: 'active', updated_at: now })
    .eq('id', input.conversationId)

  if (convError) {
    console.error(
      'resumeConversationFromHumanReview: conversation status update failed',
      convError
    )
  }

  return { success: true }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string' && m.length > 0) return m
  }
  return fallback
}
