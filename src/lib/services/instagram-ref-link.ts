// Instagram deep-link helper for SendPulse `ref=` payloads.
//
// SendPulse documents that an `ig.me/m/{handle}?ref=...` link can carry chatbot
// variables by joining `var=value` pairs with the literal substring `__`.
// See https://sendpulse.com/knowledge-base/chatbot/custom-variables-chatbot —
// the delimiter is exactly two underscores, NOT URL-encoded.
//
// We always lead the payload with the source key so the SendPulse trigger can
// route on the `ref=<source_key>__...` prefix without parsing the rest. Each
// value is `encodeURIComponent`'d so spaces, `+`, `&`, and `=` round-trip
// correctly through Meta's URL handling.
//
// IMPORTANT: this module is intentionally pure and dependency-free. It is
// imported by both Server Components (Setup Copy Panel render) and Client
// Components (copy-to-clipboard button), so it must NOT carry the
// `server-only` import.

const SENDPULSE_DELIMITER = '__'

// Meta truncates the ref payload around the 512-char URL cap. Operators paste
// these into the Ad destination field, so we throw early at 480 chars to give
// the operator headroom for the `https://ig.me/m/<handle>?ref=` prefix and
// future field additions.
const MAX_REF_LENGTH = 480

export interface InstagramRefLinkInput {
  /** Handle WITHOUT the `@` prefix. e.g. `'vendingpreneurs'`. */
  handle: string
  /** `marketing_sources.source_key`. Always emitted as the first ref segment. */
  sourceKey: string
  utm?: Partial<{
    source: string
    medium: string
    campaign: string
    content: string
    term: string
  }>
  adId?: string
  adSetId?: string
  landingPageUrl?: string
  /**
   * Legacy `lead_*` mirror — kept so existing SendPulse flows that key off
   * `lead_source_key` / `lead_channel` etc. continue to work even when UTM
   * fields are populated. Callers pass the same shape that
   * `buildSourceSetupValues().variables` returns.
   */
  leadVariables?: Record<string, string | undefined | null>
}

export class InstagramRefLinkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InstagramRefLinkError'
  }
}

function normalizeHandle(handle: string): string {
  const trimmed = handle.trim().replace(/^@+/, '')
  if (!trimmed) {
    throw new InstagramRefLinkError('handle is required')
  }
  if (!/^[A-Za-z0-9._]+$/.test(trimmed)) {
    throw new InstagramRefLinkError(`invalid handle: ${handle}`)
  }
  return trimmed
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Build the `ig.me/m/{handle}?ref=...` deep link. Empty values are omitted from
 * the payload. Throws an `InstagramRefLinkError` if the resulting `ref` exceeds
 * 480 chars or if the handle is invalid.
 */
export function buildInstagramRefLink(input: InstagramRefLinkInput): string {
  const handle = normalizeHandle(input.handle)
  const sourceKey = input.sourceKey?.trim()
  if (!sourceKey) {
    throw new InstagramRefLinkError('sourceKey is required')
  }

  // Order is deliberate: source key first, then UTM (the canonical reporting
  // axis), then ad identifiers, then landing page, then legacy lead_* mirror.
  // Stable order keeps copy-pasted links diffable in the operator UI.
  const segments: string[] = [sourceKey]

  const utmEntries: Array<[string, string | undefined]> = [
    ['utm_source', input.utm?.source],
    ['utm_medium', input.utm?.medium],
    ['utm_campaign', input.utm?.campaign],
    ['utm_content', input.utm?.content],
    ['utm_term', input.utm?.term],
  ]
  for (const [key, value] of utmEntries) {
    if (isNonEmpty(value)) {
      segments.push(`${key}=${encodeRefValue(value)}`)
    }
  }

  if (isNonEmpty(input.adId)) {
    segments.push(`ad_id=${encodeRefValue(input.adId)}`)
  }
  if (isNonEmpty(input.adSetId)) {
    segments.push(`ad_set_id=${encodeRefValue(input.adSetId)}`)
  }
  if (isNonEmpty(input.landingPageUrl)) {
    segments.push(`landing_page_url=${encodeRefValue(input.landingPageUrl)}`)
  }

  if (input.leadVariables) {
    for (const [key, value] of Object.entries(input.leadVariables)) {
      if (isNonEmpty(value)) {
        segments.push(`${key}=${encodeRefValue(value)}`)
      }
    }
  }

  const ref = segments.join(SENDPULSE_DELIMITER)
  if (ref.length > MAX_REF_LENGTH) {
    throw new InstagramRefLinkError(
      `ref payload is ${ref.length} chars; exceeds Meta's safe ${MAX_REF_LENGTH}-char cap. Drop optional fields (ad_id, landing_page_url, lead_* mirror) or shorten campaign names.`
    )
  }

  return `https://ig.me/m/${handle}?ref=${ref}`
}

/**
 * Inverse of `buildInstagramRefLink`. Returns `null` if the URL doesn't follow
 * the `ig.me/m/<handle>?ref=...` shape. Used in tests for round-trip
 * verification and may be used by the operator UI to detect existing payloads.
 */
export function parseInstagramRefLink(url: string): {
  handle: string
  sourceKey: string
  utm: Partial<
    Record<'source' | 'medium' | 'campaign' | 'content' | 'term', string>
  >
  adId?: string
  adSetId?: string
  landingPageUrl?: string
  leadVariables: Record<string, string>
} | null {
  const match = url.match(/^https?:\/\/ig\.me\/m\/([^/?]+)\?ref=(.*)$/)
  if (!match) return null

  const handle = match[1]
  const ref = match[2]
  const segments = ref.split(SENDPULSE_DELIMITER)
  if (segments.length === 0) return null

  const sourceKey = segments[0]
  const utm: Partial<
    Record<'source' | 'medium' | 'campaign' | 'content' | 'term', string>
  > = {}
  let adId: string | undefined
  let adSetId: string | undefined
  let landingPageUrl: string | undefined
  const leadVariables: Record<string, string> = {}

  for (let i = 1; i < segments.length; i++) {
    const eq = segments[i].indexOf('=')
    if (eq === -1) continue
    const key = segments[i].slice(0, eq)
    const rawValue = segments[i].slice(eq + 1)
    const value = decodeRefValue(rawValue)
    switch (key) {
      case 'utm_source':
        utm.source = value
        break
      case 'utm_medium':
        utm.medium = value
        break
      case 'utm_campaign':
        utm.campaign = value
        break
      case 'utm_content':
        utm.content = value
        break
      case 'utm_term':
        utm.term = value
        break
      case 'ad_id':
        adId = value
        break
      case 'ad_set_id':
        adSetId = value
        break
      case 'landing_page_url':
        landingPageUrl = value
        break
      default:
        leadVariables[key] = value
    }
  }

  return {
    handle,
    sourceKey,
    utm,
    adId,
    adSetId,
    landingPageUrl,
    leadVariables,
  }
}

function encodeRefValue(value: string): string {
  return encodeURIComponent(value.trim())
}

function decodeRefValue(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
