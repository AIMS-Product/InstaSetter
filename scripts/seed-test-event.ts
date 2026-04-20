/**
 * Insert test lead_events rows into a conversation to verify the
 * dashboard conversation viewer renders badges inline. Also supports
 * cleanup of previously-seeded test events.
 *
 * Usage:
 *   npx tsx scripts/seed-test-event.ts <conversationId>
 *   npx tsx scripts/seed-test-event.ts --cleanup
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Env = Record<string, string>

function loadEnv(): Env {
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  const out: Env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    out[m[1]!] = m[2]!.trim().replace(/^['"]|['"]$/g, '')
  }
  return out
}

async function main() {
  const env = loadEnv()
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const arg = process.argv[2]

  if (arg === '--cleanup') {
    const { error, count } = await client
      .from('lead_events')
      .delete({ count: 'exact' })
      .like('tool_use_id', 'test_%')
    if (error) {
      console.error('Cleanup failed:', error.message)
      process.exit(1)
    }
    console.log(`Deleted ${count} test events`)
    return
  }

  const conversationId = arg
  if (!conversationId) {
    console.error(
      'Usage: npx tsx scripts/seed-test-event.ts <conversationId> | --cleanup'
    )
    process.exit(1)
  }

  const { data: conv, error: convErr } = await client
    .from('conversations')
    .select('id, contact_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (convErr || !conv) {
    console.error('Conversation not found:', convErr?.message)
    process.exit(1)
  }

  const now = Date.now()
  const events = [
    {
      conversation_id: conv.id,
      contact_id: conv.contact_id,
      tool_name: 'qualify_lead',
      tool_use_id: `test_${now}_q`,
      tool_input: { location_type: 'Austin, TX', machine_count: 3 },
      integration: 'simulator',
    },
    {
      conversation_id: conv.id,
      contact_id: conv.contact_id,
      tool_name: 'book_call',
      tool_use_id: `test_${now}_b`,
      tool_input: { calendly_slot: 'Thursday 2pm' },
      integration: 'simulator',
    },
    {
      conversation_id: conv.id,
      contact_id: conv.contact_id,
      tool_name: 'capture_email',
      tool_use_id: `test_${now}_e`,
      tool_input: { email: 'jess@example.com' },
      integration: 'simulator',
    },
    {
      conversation_id: conv.id,
      contact_id: conv.contact_id,
      tool_name: 'generate_summary',
      tool_use_id: `test_${now}_s`,
      tool_input: { qualification_status: 'warm', call_booked: true },
      integration: 'simulator',
    },
  ]

  const { error: insertErr, count } = await client
    .from('lead_events')
    .insert(events, { count: 'exact' })

  if (insertErr) {
    console.error('Insert failed:', insertErr.message)
    process.exit(1)
  }

  console.log(`Inserted ${count} events for conversation ${conversationId}`)
}

main()
