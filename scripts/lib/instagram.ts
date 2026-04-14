import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type {
  RawInstagramConversation,
  RawInstagramMessage,
  NormalizedConversation,
  NormalizedMessage,
  ConversationMeta,
  OpenerType,
  Tier,
} from '../types.js'

const OWNER_NAME = 'Mike Hoffmann'

// ---------------------------------------------------------------------------
// UTF-8 decoding — Instagram double-encodes UTF-8 as Latin-1
// e.g. \u00e2\u0080\u0099 → right single quote (')
// ---------------------------------------------------------------------------

export function decodeInstagramText(s: string): string {
  try {
    // Convert each char code (Latin-1) back to a byte, then decode as UTF-8
    const bytes = new Uint8Array(s.split('').map((c) => c.charCodeAt(0)))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    // If decoding fails, return the original string
    return s
  }
}

// ---------------------------------------------------------------------------
// System message detection
// ---------------------------------------------------------------------------

const SYSTEM_PATTERNS = [
  /liked a message/i,
  /reacted .+ to your message/i,
  /sent an attachment/i,
  /sent a private reply/i,
  /You sent a private reply/i,
  /started a video chat/i,
  /missed .+ video chat/i,
  /named the group/i,
  /changed the group/i,
  /added .+ to the group/i,
  /removed .+ from the group/i,
  /is now an admin/i,
  /left the group/i,
]

export function isSystemMessage(content: string): boolean {
  if (!content) return true
  return SYSTEM_PATTERNS.some((p) => p.test(content))
}

// ---------------------------------------------------------------------------
// Email and link extraction
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

export function extractEmails(text: string): string[] {
  return [...new Set(text.match(EMAIL_RE) ?? [])]
}

interface ExtractedLink {
  url: string
  type: 'calendly' | 'oncehub' | 'clkmg' | 'other'
}

export function extractLinks(text: string): ExtractedLink[] {
  const urlRe = /https?:\/\/[^\s"<>]+/gi
  const urls = text.match(urlRe) ?? []
  return urls.map((url) => {
    if (/calendly\.com/i.test(url)) return { url, type: 'calendly' }
    if (/oncehub\.com/i.test(url)) return { url, type: 'oncehub' }
    if (/clkmg\.com/i.test(url)) return { url, type: 'clkmg' }
    return { url, type: 'other' }
  })
}

// ---------------------------------------------------------------------------
// Conversation loading
// ---------------------------------------------------------------------------

export function loadConversation(
  dirPath: string
): RawInstagramConversation | null {
  const msgFile = join(dirPath, 'message_1.json')
  try {
    const raw = readFileSync(msgFile, 'utf-8')
    return JSON.parse(raw) as RawInstagramConversation
  } catch {
    return null
  }
}

export function loadAllConversationPaths(inboxPath: string): string[] {
  const entries = readdirSync(inboxPath)
  return entries
    .map((e) => join(inboxPath, e))
    .filter((p) => {
      try {
        return statSync(p).isDirectory()
      } catch {
        return false
      }
    })
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function getOpenerType(messages: RawInstagramMessage[]): OpenerType {
  // Messages are in reverse chronological order in the export
  const first = messages[messages.length - 1]
  if (!first?.content) return 'system'

  const decoded = decodeInstagramText(first.content)
  if (/private reply/i.test(decoded)) return 'private_reply'
  if (first.sender_name === OWNER_NAME) return 'owner_first'
  return 'prospect_first'
}

const QUALIFICATION_KEYWORDS =
  /\b(machine|vending|location|gym|office|warehouse|hospital|school|apartment|credit|score|budget|capital|invest|partner|monthly payment)/i
const MASTERCLASS_KEYWORDS =
  /\b(masterclass|master class|blueprint|free course|vending.*course)/i
const PARTNER_CALL_KEYWORDS = /\b(partner|call|schedule|book|oncehub|calendly)/i
const CREDIT_KEYWORDS =
  /\b(credit.*score|credit.*check|financing|loan|payment.*plan)/i
const LOCATION_KEYWORDS =
  /\b(location|placed?|where.*machine|where.*based|city|state|area)/i
const OPT_OUT_KEYWORDS =
  /\b(stop|unsubscribe|not interested|remove me|don't message|dont message|leave me alone)/i
const CANT_RECEIVE =
  /can't receive your message|can.t receive your message|couldn.t send your message/i

function computeTier(meta: Omit<ConversationMeta, 'tier'>): Tier {
  // Skip: group chats, dead threads, system-only, very short dead threads
  if (meta.participantCount > 2) return 'skip'
  if (meta.hasCantReceive && meta.substantiveMessageCount <= 2) return 'skip'
  if (meta.substantiveMessageCount === 0) return 'skip'
  if (meta.hasOptOut && meta.substantiveMessageCount <= 2) return 'skip'

  // 2-message threads where prospect never replied substantively
  if (meta.messageCount <= 2 && meta.prospectMessageCount === 0) return 'skip'

  // Deep: high-value signals
  if (meta.hasBookingLink) return 'deep'
  if (meta.hasEmail) return 'deep'
  if (meta.substantiveMessageCount >= 20) return 'deep'
  if (meta.substantiveMessageCount >= 6 && meta.mentionsMasterclass)
    return 'deep'
  if (meta.substantiveMessageCount >= 6 && meta.mentionsPartnerCall)
    return 'deep'
  if (meta.substantiveMessageCount >= 6 && meta.mentionsCredit) return 'deep'

  // Shallow: everything else with enough content
  if (meta.substantiveMessageCount >= 3) return 'shallow'

  return 'skip'
}

export function normalizeConversation(
  raw: RawInstagramConversation
): NormalizedConversation {
  // Instagram exports messages in reverse chronological order
  const chronological = [...raw.messages].reverse()

  const allContent = chronological
    .map((m) => (m.content ? decodeInstagramText(m.content) : ''))
    .join(' ')

  const allSharedLinks = chronological
    .filter((m) => m.share?.link)
    .map((m) => m.share!.link)
    .join(' ')

  const fullText = `${allContent} ${allSharedLinks}`

  const links = extractLinks(fullText)
  const bookingLink = links.find((l) => l.type !== 'other')

  const messages: NormalizedMessage[] = chronological.map((m) => {
    const content = m.content ? decodeInstagramText(m.content) : ''
    const shareLink = m.share?.link ?? ''
    const msgLinks = extractLinks(`${content} ${shareLink}`)
    return {
      sender: decodeInstagramText(m.sender_name),
      timestamp: new Date(m.timestamp_ms).toISOString(),
      content,
      isOwner: m.sender_name === OWNER_NAME,
      hasLink: msgLinks.length > 0,
      linkUrl: msgLinks[0]?.url,
    }
  })

  const substantiveMessages = chronological.filter(
    (m) => m.content && !isSystemMessage(decodeInstagramText(m.content))
  )

  const ownerMessages = substantiveMessages.filter(
    (m) => m.sender_name === OWNER_NAME
  )
  const prospectMessages = substantiveMessages.filter(
    (m) => m.sender_name !== OWNER_NAME
  )
  const systemMessages = chronological.filter(
    (m) => !m.content || isSystemMessage(decodeInstagramText(m.content ?? ''))
  )

  const firstTs = chronological[0]?.timestamp_ms ?? 0
  const lastTs = chronological[chronological.length - 1]?.timestamp_ms ?? 0
  const durationMs = Math.abs(lastTs - firstTs)

  const partialMeta: Omit<ConversationMeta, 'tier'> = {
    id: raw.thread_path
      .replace(/^inbox\//, '')
      .replace(/^message_requests\//, 'req_'),
    title: decodeInstagramText(raw.title),
    participantCount: raw.participants.length,
    participantNames: raw.participants.map((p) => decodeInstagramText(p.name)),
    messageCount: raw.messages.length,
    ownerMessageCount: ownerMessages.length,
    prospectMessageCount: prospectMessages.length,
    systemMessageCount: systemMessages.length,
    substantiveMessageCount: substantiveMessages.length,
    firstMessageTimestamp: firstTs ? new Date(firstTs).toISOString() : '',
    lastMessageTimestamp: lastTs ? new Date(lastTs).toISOString() : '',
    durationDays: Math.round(durationMs / (1000 * 60 * 60 * 24)),
    openerType: getOpenerType(raw.messages),
    hasBookingLink: !!bookingLink,
    bookingLinkType: bookingLink?.type as ConversationMeta['bookingLinkType'],
    hasEmail: extractEmails(fullText).length > 0,
    extractedEmails: extractEmails(fullText),
    hasCantReceive: CANT_RECEIVE.test(fullText),
    hasOptOut: OPT_OUT_KEYWORDS.test(fullText),
    mentionsMasterclass: MASTERCLASS_KEYWORDS.test(fullText),
    mentionsPartnerCall: PARTNER_CALL_KEYWORDS.test(fullText),
    mentionsCredit: CREDIT_KEYWORDS.test(fullText),
    mentionsLocation: LOCATION_KEYWORDS.test(fullText),
  }

  return {
    meta: { ...partialMeta, tier: computeTier(partialMeta) },
    messages,
  }
}

// ---------------------------------------------------------------------------
// Format conversation for Claude API calls
// ---------------------------------------------------------------------------

export function formatConversationForClaude(
  conv: NormalizedConversation
): string {
  const lines = conv.messages
    .filter((m) => m.content.trim())
    .map((m) => {
      const role = m.isOwner ? 'MIKE' : 'PROSPECT'
      return `[${role}]: ${m.content}`
    })

  return lines.join('\n')
}
