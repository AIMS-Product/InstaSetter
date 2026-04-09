import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { InroWebhookPayload } from '@/types/inro'

type ContactRow = Database['public']['Tables']['contacts']['Row']

type Result<T> = { success: true; data: T } | { success: false; error: string }

export async function upsertContact(
  client: SupabaseClient<Database>,
  payload: InroWebhookPayload
): Promise<Result<ContactRow>> {
  // Look up existing contact by inro_contact_id
  const { data: existing, error: lookupError } = await client
    .from('contacts')
    .select()
    .eq('inro_contact_id', payload.contact_id)
    .maybeSingle()

  if (lookupError) {
    return { success: false, error: lookupError.message }
  }

  if (existing) {
    // Update only last_message_at and updated_at — preserve first_seen_at and source
    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await client
      .from('contacts')
      .update({
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updated }
  }

  // Create new contact
  const now = new Date().toISOString()
  const { data: created, error: insertError } = await client
    .from('contacts')
    .insert({
      inro_contact_id: payload.contact_id,
      instagram_handle: payload.username,
      name: payload.name ?? null,
      email: payload.email ?? null,
      source: payload.source,
      first_seen_at: now,
      last_message_at: now,
    })
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true, data: created }
}
