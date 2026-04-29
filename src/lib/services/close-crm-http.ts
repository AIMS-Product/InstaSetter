/**
 * Low-level HTTP helpers for the Close CRM client. Extracted from
 * close-crm.ts to keep the public-surface module under the 300 LOC limit.
 *
 * Responsibilities:
 * - Build the Basic auth header from an API key (per
 *   https://developer.close.com/api/overview/api-key-authentication).
 * - Parse `retry-after` and `RateLimit: reset=N` headers (per
 *   https://developer.close.com/api/overview/rate-limits).
 * - Fire a single JSON request and decode the body.
 * - Drive a retry loop with exponential backoff for transient failures.
 */

export interface RawHttpResult {
  ok: boolean
  status: number
  body: unknown
  retryAfterMs?: number
}

export const MAX_ATTEMPTS = 5
const BASE_BACKOFF_MS = 250

export function authHeader(apiKey: string): string {
  // node has Buffer; jsdom has it via globalThis.Buffer too. btoa is not
  // reliably global on Node 18.
  const encoded =
    typeof Buffer !== 'undefined'
      ? Buffer.from(`${apiKey}:`).toString('base64')
      : globalThis.btoa(`${apiKey}:`)
  return `Basic ${encoded}`
}

export function readRetryAfterMs(headers: Headers): number | undefined {
  const retryAfter = headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter)
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return Math.round(seconds * 1000)
    }
  }
  const rateLimit = headers.get('ratelimit') ?? headers.get('RateLimit')
  if (rateLimit) {
    const match = /reset\s*=\s*([\d.]+)/i.exec(rateLimit)
    if (match) {
      const seconds = Number.parseFloat(match[1] ?? '')
      if (!Number.isNaN(seconds) && seconds >= 0) {
        return Math.round(seconds * 1000)
      }
    }
  }
  return undefined
}

export async function httpJsonRequest(
  url: string,
  init: RequestInit
): Promise<RawHttpResult> {
  const res = await fetch(url, init)
  let body: unknown = undefined
  try {
    body = await res.json()
  } catch {
    body = undefined
  }
  return {
    ok: res.ok,
    status: res.status,
    body,
    retryAfterMs: readRetryAfterMs(res.headers),
  }
}

export function isTransient(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600)
}

export function backoffMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) return retryAfterMs
  // 0.25s, 0.5s, 1s, 2s, 4s — exponential with no jitter.
  return BASE_BACKOFF_MS * 2 ** attempt
}

let sleepImpl: (ms: number) => Promise<void> = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Test seam — replace the sleep implementation. */
export function _setSleepImpl(impl: (ms: number) => Promise<void>) {
  sleepImpl = impl
}

export async function withRetries<T>(
  attempt: () => Promise<RawHttpResult>,
  resolveOk: (raw: RawHttpResult) => T,
  resolveErr: (raw: RawHttpResult, transient: boolean) => T
): Promise<T> {
  let lastErr: T | undefined
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    let raw: RawHttpResult
    try {
      raw = await attempt()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (i < MAX_ATTEMPTS - 1) {
        await sleepImpl(backoffMs(i))
        continue
      }
      return resolveErr(
        { ok: false, status: 0, body: { error: errorMessage } },
        true
      )
    }

    if (raw.ok) return resolveOk(raw)

    if (!isTransient(raw.status)) {
      return resolveErr(raw, false)
    }

    lastErr = resolveErr(raw, true)
    if (i < MAX_ATTEMPTS - 1) {
      await sleepImpl(backoffMs(i, raw.retryAfterMs))
    }
  }
  return (
    lastErr ??
    resolveErr({ ok: false, status: 0, body: { error: 'unknown error' } }, true)
  )
}

export function extractErrorMessage(raw: RawHttpResult): string {
  if (raw.body && typeof raw.body === 'object') {
    const body = raw.body as Record<string, unknown>
    if (typeof body.error === 'string') return body.error
    if (typeof body.message === 'string') return body.message
  }
  return raw.status ? `http_${raw.status}` : 'network_error'
}
