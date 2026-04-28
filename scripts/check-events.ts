import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

async function main() {
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    env[m[1]!] = m[2]!.trim().replace(/^['"]|['"]$/g, '')
  }

  const c = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count } = await c
    .from('lead_events')
    .select('*', { count: 'exact', head: true })
  console.log('lead_events row count:', count)

  const { data } = await c
    .from('lead_events')
    .select('tool_name, integration, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log('most recent:', data)
}

main()
