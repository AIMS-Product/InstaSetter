import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { ToolCall } from '@/lib/services/claude'

type LeadEventInsert = Database['public']['Tables']['lead_events']['Insert']

interface PersistInput {
  conversationId: string
  contactId: string
  messageId?: string | null
  integration: string
  toolCalls: ToolCall[]
}

/**
 * Persist tool_use events to the lead_events table so the dashboard
 * conversation viewer can render them alongside messages.
 *
 * Idempotent: the unique constraint on tool_use_id protects against
 * duplicate inserts on webhook retries.
 */
export async function persistLeadEvents(
  client: SupabaseClient<Database>,
  input: PersistInput
): Promise<{ inserted: number }> {
  if (input.toolCalls.length === 0) return { inserted: 0 }

  const rows: LeadEventInsert[] = input.toolCalls.map((tc) => ({
    conversation_id: input.conversationId,
    contact_id: input.contactId,
    message_id: input.messageId ?? null,
    tool_name: tc.name,
    tool_use_id: tc.toolUseId,
    tool_input: tc.input as Json,
    integration: input.integration,
  }))

  const { error, count } = await client
    .from('lead_events')
    .insert(rows, { count: 'exact' })

  if (error) {
    // Unique violation on tool_use_id — retried event, swallow
    if (error.code === '23505') {
      return { inserted: 0 }
    }
    console.error('persistLeadEvents failed', error)
    return { inserted: 0 }
  }

  return { inserted: count ?? 0 }
}
