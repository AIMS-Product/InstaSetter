import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/services/conversation-pauses', () => ({
  pauseConversationForHumanReview: vi.fn(),
  resumeConversationFromHumanReview: vi.fn(),
}))

import { revalidatePath } from 'next/cache'
import {
  pauseConversationForHumanReview,
  resumeConversationFromHumanReview,
} from '@/lib/services/conversation-pauses'
import {
  pauseConversationAction,
  resumeConversationAction,
} from '@/app/dashboard/conversations/[id]/actions'

const VALID_UUID = '11111111-2222-4333-8444-555555555555'

describe('resumeConversationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid conversation IDs', async () => {
    const result = await resumeConversationAction({
      conversationId: 'not-a-uuid',
    })

    expect(result.success).toBe(false)
    expect(resumeConversationFromHumanReview).not.toHaveBeenCalled()
  })

  it('clears the active pause and revalidates dashboard paths', async () => {
    vi.mocked(resumeConversationFromHumanReview).mockResolvedValueOnce({
      success: true,
    })

    const result = await resumeConversationAction({
      conversationId: VALID_UUID,
      clearedBy: 'james@aims',
    })

    expect(result.success).toBe(true)
    expect(resumeConversationFromHumanReview).toHaveBeenCalledWith({
      conversationId: VALID_UUID,
      clearedBy: 'james@aims',
    })
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/conversations/${VALID_UUID}`
    )
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/conversations')
  })

  it('defaults clearedBy to "operator" when omitted', async () => {
    vi.mocked(resumeConversationFromHumanReview).mockResolvedValueOnce({
      success: true,
    })

    await resumeConversationAction({ conversationId: VALID_UUID })

    expect(resumeConversationFromHumanReview).toHaveBeenCalledWith({
      conversationId: VALID_UUID,
      clearedBy: 'operator',
    })
  })

  it('returns the service error when the resume fails', async () => {
    vi.mocked(resumeConversationFromHumanReview).mockResolvedValueOnce({
      success: false,
      error: 'db down',
    })

    const result = await resumeConversationAction({
      conversationId: VALID_UUID,
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('db down')
  })
})

describe('pauseConversationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects empty reason', async () => {
    const result = await pauseConversationAction({
      conversationId: VALID_UUID,
      reason: '   ',
    })

    expect(result.success).toBe(false)
    expect(pauseConversationForHumanReview).not.toHaveBeenCalled()
  })

  it('passes operator-initiated pauses with default severity concern', async () => {
    vi.mocked(pauseConversationForHumanReview).mockResolvedValueOnce({
      success: true,
    })

    const result = await pauseConversationAction({
      conversationId: VALID_UUID,
      reason: 'Manual pause from operator',
    })

    expect(result.success).toBe(true)
    expect(pauseConversationForHumanReview).toHaveBeenCalledWith({
      conversationId: VALID_UUID,
      reason: 'Manual pause from operator',
      severity: 'concern',
      requestedBy: 'operator',
    })
  })

  it('respects an explicit severity', async () => {
    vi.mocked(pauseConversationForHumanReview).mockResolvedValueOnce({
      success: true,
    })

    await pauseConversationAction({
      conversationId: VALID_UUID,
      reason: 'Compliance issue raised by prospect',
      severity: 'compliance',
    })

    expect(pauseConversationForHumanReview).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'compliance' })
    )
  })
})
