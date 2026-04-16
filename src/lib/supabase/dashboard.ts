import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { config, getSupabaseServiceConfig } from '@/lib/config'

/** Service-role client for dashboard reads — does NOT require ANTHROPIC_API_KEY or BRAND_NAME */
export function createDashboardClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getSupabaseServiceConfig()
  return createClient<Database>(
    config.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  )
}
