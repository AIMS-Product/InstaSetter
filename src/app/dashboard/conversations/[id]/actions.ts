'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  pauseConversationForHumanReview,
  resumeConversationFromHumanReview,
} from '@/lib/services/conversation-pauses'
import { assertDashboardActionAuthorized } from '@/lib/dashboard-action-auth'

const conversationIdSchema = z.string().uuid()

const resumeArgsSchema = z
  .object({
    conversationId: conversationIdSchema,
    clearedBy: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

const pauseArgsSchema = z
  .object({
    conversationId: conversationIdSchema,
    reason: z.string().trim().min(1).max(2000),
    severity: z.enum(['concern', 'hostile', 'compliance']).default('concern'),
    requestedBy: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

/**
 * Clear the active human-review pause on a conversation. Called from the
 * "Resume bot" button on the conversation detail banner.
 */
export async function resumeConversationAction(args: {
  conversationId: string
  clearedBy?: string
}): Promise<{ success: boolean; error?: string }> {
  await assertDashboardActionAuthorized()

  const parsed = resumeArgsSchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input.' }
  }

  const result = await resumeConversationFromHumanReview({
    conversationId: parsed.data.conversationId,
    clearedBy: parsed.data.clearedBy ?? 'operator',
  })

  if (!result.success) return { success: false, error: result.error }

  revalidatePath(`/dashboard/conversations/${parsed.data.conversationId}`)
  revalidatePath('/dashboard/conversations')
  return { success: true }
}

/**
 * Allow operators to escalate ahead of the bot. Used when an operator wants
 * the bot to stop replying immediately.
 */
export async function pauseConversationAction(args: {
  conversationId: string
  reason: string
  severity?: 'concern' | 'hostile' | 'compliance'
  requestedBy?: string
}): Promise<{ success: boolean; error?: string }> {
  await assertDashboardActionAuthorized()

  const parsed = pauseArgsSchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input.' }
  }

  const result = await pauseConversationForHumanReview({
    conversationId: parsed.data.conversationId,
    reason: parsed.data.reason,
    severity: parsed.data.severity,
    requestedBy: 'operator',
  })

  if (!result.success) return { success: false, error: result.error }

  revalidatePath(`/dashboard/conversations/${parsed.data.conversationId}`)
  revalidatePath('/dashboard/conversations')
  return { success: true }
}
