import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { PROMPT_VERSION } from '@/types/enums'
import type { Database } from '@/types/database'

type Conversation = Database['public']['Tables']['conversations']['Row']

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function findOrCreateActiveConversation(
  contactId: string,
  promptVersion: string = PROMPT_VERSION
): Promise<ServiceResult<Conversation>> {
  const supabase = createServiceRoleClient()

  // Look for an existing active conversation
  const { data: existing, error: selectError } = await supabase
    .from('conversations')
    .select('*')
    .eq('contact_id', contactId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (existing) {
    return { success: true, data: existing }
  }

  // PGRST116 = no rows found — expected when there's no active conversation
  if (selectError && selectError.code !== 'PGRST116') {
    return { success: false, error: selectError.message }
  }

  // Create a new active conversation
  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({
      contact_id: contactId,
      status: 'active',
      prompt_version: promptVersion,
    })
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true, data: created }
}

export async function closeConversation(
  conversationId: string,
  summary?: string
): Promise<ServiceResult<Conversation>> {
  const supabase = createServiceRoleClient()

  const now = new Date().toISOString()
  const updatePayload: Database['public']['Tables']['conversations']['Update'] =
    {
      status: 'completed',
      ended_at: now,
      updated_at: now,
    }

  if (summary !== undefined) {
    updatePayload.summary = summary
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(updatePayload)
    .eq('id', conversationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function loadPriorSummaries(
  contactId: string,
  limit: number = 3
): Promise<ServiceResult<string[]>> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('summary')
    .eq('contact_id', contactId)
    .eq('status', 'completed')
    .not('summary', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: data.map((row) => row.summary as string),
  }
}
