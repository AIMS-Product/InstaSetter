import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { InroWebhookPayload } from '@/types/inro'
import type { SendPulseWebhookPayload } from '@/types/sendpulse'

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

export async function upsertSendPulseContact(
  client: SupabaseClient<Database>,
  payload: SendPulseWebhookPayload
): Promise<Result<ContactRow>> {
  const { contact } = payload
  const handle = contact.username ?? contact.name ?? `sp_${contact.id}`

  // Look up by sendpulse_contact_id first, fall back to instagram_handle
  const { data: existing, error: lookupError } = await client
    .from('contacts')
    .select('id, name, profile_picture_url, tags, sendpulse_contact_id')
    .eq('sendpulse_contact_id', contact.id)
    .maybeSingle()

  if (lookupError) {
    return { success: false, error: lookupError.message }
  }

  if (existing) {
    const now = new Date().toISOString()
    // Merge incoming SendPulse tags with existing DB tags (deduplicated)
    const incomingTags = contact.tags ?? []
    const existingTags = existing.tags ?? []
    const mergedTags = [...new Set([...existingTags, ...incomingTags])]

    const { data: updated, error: updateError } = await client
      .from('contacts')
      .update({
        last_message_at: now,
        updated_at: now,
        name: contact.name ?? existing.name,
        profile_picture_url: contact.photo ?? existing.profile_picture_url,
        tags: mergedTags,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updated }
  }

  // Check if a contact already exists by instagram_handle (e.g. migrated from Inro)
  const { data: byHandle } = await client
    .from('contacts')
    .select('id, name, profile_picture_url, tags')
    .eq('instagram_handle', handle)
    .maybeSingle()

  if (byHandle) {
    const now = new Date().toISOString()
    const incomingTags = contact.tags ?? []
    const existingTags = byHandle.tags ?? []
    const mergedTags = [...new Set([...existingTags, ...incomingTags])]

    const { data: updated, error: updateError } = await client
      .from('contacts')
      .update({
        sendpulse_contact_id: contact.id,
        last_message_at: now,
        updated_at: now,
        name: contact.name ?? byHandle.name,
        profile_picture_url: contact.photo ?? byHandle.profile_picture_url,
        tags: mergedTags,
      })
      .eq('id', byHandle.id)
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
      sendpulse_contact_id: contact.id,
      instagram_handle: handle,
      name: contact.name ?? null,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      profile_picture_url: contact.photo ?? null,
      source: 'organic_dm',
      tags: contact.tags ?? [],
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
