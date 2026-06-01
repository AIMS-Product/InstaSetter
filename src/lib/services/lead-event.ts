import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

type LeadEventInsert = Database['public']['Tables']['lead_events']['Insert']

export const PersistLeadEventsSchema = z.object({
  conversationId: z.string().uuid(),
  contactId: z.string().uuid(),
  messageId: z.string().nullable().optional(),
  integration: z.string(),
  toolCalls: z.array(
    z.object({
      name: z.string(),
      toolUseId: z.string(),
      input: z.record(z.string(), z.unknown()),
    })
  ),
})

export type PersistInput = z.infer<typeof PersistLeadEventsSchema>

/**
 * Persist tool_use events to the lead_events table so the dashboard
 * conversation viewer can render them alongside messages.
 *
 * Idempotent: the unique constraint on tool_use_id protects against
 * duplicate inserts on webhook retries.
 *
 * Validates input via Zod. On validation failure, logs via console.error
 * and returns { inserted: 0 } without touching the database.
 */
export async function persistLeadEvents(
  client: SupabaseClient<Database>,
  input: PersistInput
): Promise<{ inserted: number }> {
  const parsed = PersistLeadEventsSchema.safeParse(input)
  if (!parsed.success) {
    console.error('persistLeadEvents validation failed', parsed.error)
    return { inserted: 0 }
  }

  const data = parsed.data

  if (data.toolCalls.length === 0) return { inserted: 0 }

  const rows: LeadEventInsert[] = data.toolCalls.map((tc) => ({
    conversation_id: data.conversationId,
    contact_id: data.contactId,
    message_id: data.messageId ?? null,
    tool_name: tc.name,
    tool_use_id: tc.toolUseId,
    tool_input: tc.input as Json,
    integration: data.integration,
  }))

  const { error, count } = await client.from('lead_events').upsert(rows, {
    count: 'exact',
    ignoreDuplicates: true,
    onConflict: 'tool_use_id',
  })

  if (error) {
    console.error('persistLeadEvents failed', error)
    return { inserted: 0 }
  }

  return { inserted: count ?? 0 }
}
