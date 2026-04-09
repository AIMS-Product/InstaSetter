import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { config, getServerConfig } from '@/lib/config'

export function createServiceRoleClient() {
  const serverConfig = getServerConfig()
  return createClient<Database>(
    config.NEXT_PUBLIC_SUPABASE_URL,
    serverConfig.SUPABASE_SERVICE_ROLE_KEY
  )
}
