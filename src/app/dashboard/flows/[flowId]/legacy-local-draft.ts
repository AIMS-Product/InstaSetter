import {
  FLOW_DRAFT_SCHEMA,
  isSuspectFlowDraft,
  normalizePersistedFlowDraft,
  type PersistedFlowDraft,
} from './draft-persistence'

const LEGACY_STORAGE_KEY = 'instasetter.flow-builder.v1'

export function legacyStorageKeyFor(brand: string, flowId: string): string {
  return `instasetter.flow-builder.v3.${brand}.${flowId}`
}

type LegacyLocalDraft = Partial<PersistedFlowDraft> & {
  __schema?: number
  __brand?: string
  __flowId?: string
  __bookingUrl?: string | null
}

export function loadLegacyLocalFlowDraft({
  brand,
  flowId,
  bookingUrl,
}: {
  brand: string
  flowId: string
  bookingUrl?: string
}): PersistedFlowDraft | null {
  if (typeof window === 'undefined') return null

  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* noop */
  }

  try {
    const key = legacyStorageKeyFor(brand, flowId)
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as LegacyLocalDraft
    const metadataMismatch =
      parsed.__schema !== FLOW_DRAFT_SCHEMA ||
      (parsed.__brand && parsed.__brand !== brand) ||
      (parsed.__flowId && parsed.__flowId !== flowId) ||
      (parsed.__bookingUrl ?? null) !== (bookingUrl ?? null)

    if (metadataMismatch || isSuspectFlowDraft(parsed, { brand })) {
      window.localStorage.removeItem(key)
      return null
    }

    const {
      __schema: _schema,
      __brand: _brand,
      __flowId: _flowId,
      __bookingUrl: _bookingUrl,
      ...rest
    } = parsed

    void _schema
    void _brand
    void _flowId
    void _bookingUrl

    return normalizePersistedFlowDraft(
      rest as PersistedFlowDraft
    ) as PersistedFlowDraft
  } catch {
    return null
  }
}

export function clearLegacyLocalFlowDraft({
  brand,
  flowId,
}: {
  brand: string
  flowId: string
}): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(legacyStorageKeyFor(brand, flowId))
  } catch {
    /* noop */
  }
}
