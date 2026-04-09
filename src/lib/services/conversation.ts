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
