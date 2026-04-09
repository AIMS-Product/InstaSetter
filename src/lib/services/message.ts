import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { generateDedupHash } from '@/lib/utils/dedup-hash'

type MessageRow = Database['public']['Tables']['messages']['Row']

type StoreMessageInput = {
  conversationId: string
  role: string
  content: string
  timestamp: string
  inroMessageId?: string
  tokenCount?: number
  metadata?: Record<string, unknown>
}

type StoreResult =
  | { success: true; isDuplicate: true }
  | { success: true; isDuplicate: false; data: MessageRow }
  | { success: false; error: string }

export async function storeMessage(
  client: SupabaseClient<Database>,
  input: StoreMessageInput
): Promise<StoreResult> {
  const dedupHash = generateDedupHash(
    input.conversationId,
    input.content,
    input.timestamp
  )

  // Check for existing duplicate by inro_message_id or dedup_hash
  const { data: existing, error: lookupError } = input.inroMessageId
    ? await client
        .from('messages')
        .select()
        .eq('inro_message_id', input.inroMessageId)
        .maybeSingle()
    : await client
        .from('messages')
        .select()
        .eq('dedup_hash', dedupHash)
        .maybeSingle()

  if (lookupError) {
    return { success: false, error: lookupError.message }
  }

  if (existing) {
    return { success: true, isDuplicate: true }
  }

  // Build insert payload
  const insertData: Database['public']['Tables']['messages']['Insert'] = {
    conversation_id: input.conversationId,
    role: input.role,
    content: input.content,
    dedup_hash: dedupHash,
    created_at: input.timestamp,
  }

  if (input.inroMessageId) {
    insertData.inro_message_id = input.inroMessageId
  }

  if (input.tokenCount !== undefined) {
    insertData.token_count = input.tokenCount
  }

  if (input.metadata !== undefined) {
    insertData.metadata = input.metadata
  }

  const { data: inserted, error: insertError } = await client
    .from('messages')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    // Postgres unique violation — treat as duplicate (race condition)
    if (insertError.code === '23505') {
      return { success: true, isDuplicate: true }
    }
    return { success: false, error: insertError.message }
  }

  return { success: true, isDuplicate: false, data: inserted }
}
