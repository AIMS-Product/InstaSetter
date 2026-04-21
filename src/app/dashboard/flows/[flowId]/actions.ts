'use server'

import {
  countConversationsStartedSince,
  getConversation,
  listConversations,
  type ConversationDetail,
  type ConversationListItem,
} from '@/lib/services/conversation-viewer'

export async function fetchFlowRunsAction(
  limit: number = 50
): Promise<ConversationListItem[]> {
  return listConversations(limit)
}

export async function fetchConversationAction(
  id: string
): Promise<ConversationDetail | null> {
  return getConversation(id)
}

export async function fetchTodayConversationCountAction(): Promise<number> {
  // Use the user's local midnight so the badge matches what "today" means
  // to the operator looking at the dashboard.
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  return countConversationsStartedSince(startOfDay.toISOString())
}
