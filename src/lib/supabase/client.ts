import { createBrowserClient } from '@supabase/ssr'
import { config } from '@/lib/config'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
