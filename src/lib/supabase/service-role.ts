import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { config, getSupabaseServerConfig } from '@/lib/config'

export function createServiceRoleClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getSupabaseServerConfig()
  return createClient<Database>(
    config.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  )
}
