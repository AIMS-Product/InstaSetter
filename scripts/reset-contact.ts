/**
 * Reset a contact for clean testing.
 *
 * Clears all tags on the SendPulse contact (so they don't re-flow into Supabase
 * on the next webhook) and deletes the Supabase contact (cascades to conversations,
 * messages, leads).
 *
 * Usage:
 *   npx tsx scripts/reset-contact.ts <instagram_handle>
 *   npx tsx scripts/reset-contact.ts jamesvanderhaak
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnv(key: string): string {
  const envPath = join(process.cwd(), '.env.local')
  try {
    const content = readFileSync(envPath, 'utf-8')
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'))
    if (match) return match[1].trim()
  } catch {
    /* fall through */
  }
  if (process.env[key]) return process.env[key]!
  console.error(`\n❌ ${key} not found in .env.local or environment.\n`)
  process.exit(1)
}

const SUPABASE_URL = loadEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_SERVICE_KEY = loadEnv('SUPABASE_SERVICE_ROLE_KEY')
const SENDPULSE_API_KEY = loadEnv('SENDPULSE_API_KEY')

async function supabaseFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

async function sendpulseRemoveTag(
  contactId: string,
  tag: string
): Promise<boolean> {
  const res = await fetch(
    'https://api.sendpulse.com/instagram/contacts/deleteTag',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDPULSE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contact_id: contactId, tag }),
    }
  )
  return res.ok
}

type ContactRow = {
  id: string
  instagram_handle: string
  sendpulse_contact_id: string | null
  tags: string[] | null
}

async function main() {
  const handle = process.argv[2]
  if (!handle) {
    console.error('Usage: npx tsx scripts/reset-contact.ts <instagram_handle>')
    process.exit(1)
  }

  console.log(`Resetting contact: @${handle}\n`)

  const lookupRes = await supabaseFetch(
    `contacts?select=id,instagram_handle,sendpulse_contact_id,tags&instagram_handle=eq.${encodeURIComponent(handle)}`
  )
  if (!lookupRes.ok) {
    console.error('Supabase lookup failed:', await lookupRes.text())
    process.exit(1)
  }
  const contacts: ContactRow[] = await lookupRes.json()

  if (contacts.length === 0) {
    console.log('No Supabase contact found. Nothing to delete there.')
  } else {
    const contact = contacts[0]
    console.log(`Found Supabase contact: ${contact.id}`)
    console.log(`  sendpulse_contact_id: ${contact.sendpulse_contact_id}`)
    console.log(`  tags: ${JSON.stringify(contact.tags)}`)

    if (contact.sendpulse_contact_id && contact.tags?.length) {
      console.log(`\nClearing ${contact.tags.length} SendPulse tag(s)...`)
      const failures: string[] = []
      for (const tag of contact.tags) {
        const ok = await sendpulseRemoveTag(contact.sendpulse_contact_id, tag)
        console.log(`  ${ok ? '✓' : '✗'} ${tag}`)
        if (!ok) failures.push(tag)
      }
      if (failures.length > 0) {
        // Abort before the cascading Supabase delete. If SendPulse still
        // carries stale qualification tags, the next webhook will recreate
        // the contact pre-qualified and defeat the reset. Rerun after
        // investigating the tag-remove failure (commonly: stale SendPulse
        // contact id, revoked API token, rate limit).
        console.error(
          `\n✗ Aborting: ${failures.length} SendPulse tag(s) failed to remove: ${failures.join(', ')}`
        )
        console.error(
          '  Supabase contact NOT deleted. Fix the SendPulse side first, then rerun.'
        )
        process.exit(1)
      }
    }

    console.log('\nDeleting Supabase contact (cascades)...')
    const delRes = await supabaseFetch(
      `contacts?instagram_handle=eq.${encodeURIComponent(handle)}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
    )
    if (!delRes.ok) {
      console.error('  ✗ failed:', await delRes.text())
      process.exit(1)
    }
    console.log('  ✓ deleted')
  }

  console.log(`\nDone. @${handle} is ready for a clean test.`)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
