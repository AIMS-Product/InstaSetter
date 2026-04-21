'use server'

import {
  countConversationsStartedSince,
  getConversation,
  listConversations,
  type ConversationDetail,
  type ConversationListItem,
} from '@/lib/services/conversation-viewer'
import {
  loadFlowDraft,
  saveFlowDraft,
  type FlowDraftKey,
  type SaveFlowDraftArgs,
} from '@/lib/services/flow-drafts'
import type { PersistedFlowDraft } from './draft-persistence'

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

export async function loadFlowDraftAction(
  key: FlowDraftKey
): Promise<PersistedFlowDraft | null> {
  return loadFlowDraft(key)
}

export async function saveFlowDraftAction(
  args: SaveFlowDraftArgs
): Promise<boolean> {
  return saveFlowDraft(args)
}
