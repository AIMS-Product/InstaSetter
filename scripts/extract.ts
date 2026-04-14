/**
 * Phase 1: Extract & Normalize
 *
 * Reads all 9,856 conversations from the Instagram export, normalizes encoding,
 * computes heuristic metadata, assigns processing tiers, and writes normalized.json.
 *
 * No API calls — runs entirely locally.
 *
 * Usage: npx tsx scripts/extract.ts
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadAllConversationPaths,
  loadConversation,
  normalizeConversation,
} from './lib/instagram.js'
import type { NormalizedConversation, Tier } from './types.js'

const INBOX_PATH = join(
  process.cwd(),
  'docs/instagram-mikehoffmannofficial-2026-04-13-1cXnJ1tx/your_instagram_activity/messages/inbox'
)
const OUTPUT_PATH = join(process.cwd(), 'scripts/output/normalized.json')

function main() {
  console.log('Phase 1: Extract & Normalize')
  console.log('============================\n')

  // Load all conversation directories
  const dirs = loadAllConversationPaths(INBOX_PATH)
  console.log(`Found ${dirs.length} conversation directories\n`)

  const conversations: NormalizedConversation[] = []
  const tierCounts: Record<Tier, number> = { skip: 0, shallow: 0, deep: 0 }
  let errors = 0

  for (let i = 0; i < dirs.length; i++) {
    const raw = loadConversation(dirs[i])
    if (!raw) {
      errors++
      continue
    }

    const normalized = normalizeConversation(raw)
    conversations.push(normalized)
    tierCounts[normalized.meta.tier]++

    if ((i + 1) % 1000 === 0) {
      console.log(`  Processed ${i + 1}/${dirs.length}...`)
    }
  }

  console.log(
    `\nProcessed ${conversations.length} conversations (${errors} errors)\n`
  )

  // Print tier distribution
  console.log('Tier distribution:')
  console.log(`  skip:    ${tierCounts.skip}`)
  console.log(`  shallow: ${tierCounts.shallow}`)
  console.log(`  deep:    ${tierCounts.deep}`)
  console.log(`  total:   ${conversations.length}\n`)

  // Print signal counts
  const signals = {
    bookingLinks: conversations.filter((c) => c.meta.hasBookingLink).length,
    emails: conversations.filter((c) => c.meta.hasEmail).length,
    cantReceive: conversations.filter((c) => c.meta.hasCantReceive).length,
    optOut: conversations.filter((c) => c.meta.hasOptOut).length,
    masterclass: conversations.filter((c) => c.meta.mentionsMasterclass).length,
    partnerCall: conversations.filter((c) => c.meta.mentionsPartnerCall).length,
    credit: conversations.filter((c) => c.meta.mentionsCredit).length,
    location: conversations.filter((c) => c.meta.mentionsLocation).length,
  }

  console.log('Signal counts:')
  for (const [key, count] of Object.entries(signals)) {
    console.log(`  ${key}: ${count}`)
  }

  // Print opener type distribution
  const openerTypes: Record<string, number> = {}
  for (const c of conversations) {
    openerTypes[c.meta.openerType] = (openerTypes[c.meta.openerType] ?? 0) + 1
  }
  console.log('\nOpener types:')
  for (const [type, count] of Object.entries(openerTypes)) {
    console.log(`  ${type}: ${count}`)
  }

  // Print message count distribution
  const msgBuckets = {
    '1': 0,
    '2': 0,
    '3-5': 0,
    '6-10': 0,
    '11-20': 0,
    '21-50': 0,
    '51+': 0,
  }
  for (const c of conversations) {
    const n = c.meta.substantiveMessageCount
    if (n <= 1) msgBuckets['1']++
    else if (n <= 2) msgBuckets['2']++
    else if (n <= 5) msgBuckets['3-5']++
    else if (n <= 10) msgBuckets['6-10']++
    else if (n <= 20) msgBuckets['11-20']++
    else if (n <= 50) msgBuckets['21-50']++
    else msgBuckets['51+']++
  }
  console.log('\nSubstantive message distribution:')
  for (const [bucket, count] of Object.entries(msgBuckets)) {
    console.log(`  ${bucket}: ${count}`)
  }

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(conversations, null, 2))
  console.log(`\n✅ Wrote ${OUTPUT_PATH}`)
  console.log(
    `   File size: ${(Buffer.byteLength(JSON.stringify(conversations)) / 1024 / 1024).toFixed(1)} MB`
  )
}

main()
