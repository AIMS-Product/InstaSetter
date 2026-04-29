import { getCloseConfig } from '@/lib/config'
import type { CloseLeadPayload } from '@/lib/services/close-crm-payload'
import {
  authHeader,
  extractErrorMessage,
  httpJsonRequest,
  withRetries,
  _setSleepImpl as _setHttpSleepImpl,
} from '@/lib/services/close-crm-http'

/**
 * Close CRM HTTP client. Two operations:
 *
 * - `findCloseLeadByEmail(email)` — Advanced Filtering API
 *   (`POST /api/v1/data/search/`). Returns the first matching lead or
 *   "not found".
 * - `pushLeadToClose({ email, payload })` — search-then-upsert. If a
 *   match exists, issues `PUT /api/v1/lead/{id}/`. If not, issues
 *   `POST /api/v1/lead/`.
 *
 * Auth, retries, and header parsing live in `close-crm-http.ts`.
 *
 * Idempotency: there is no client-supplied idempotency key in Close.
 * The search-then-upsert flow is the idempotency strategy. Race window
 * (two concurrent capture_email events for the same address) is rare;
 * if it triggers, Close creates two leads and the closer can merge.
 */

export type CloseSyncResult =
  | { success: true; closeLeadId: string; created: boolean }
  | { success: false; error: string; status?: number; transient: boolean }

export type CloseFindResult =
  | { found: true; leadId: string }
  | { found: false }
  | { error: string; status?: number; transient: boolean }

/** Test seam — replace the sleep implementation. */
export const _setSleepImpl = _setHttpSleepImpl

interface CloseConfig {
  apiKey: string
  baseUrl: string
}

function loadConfig(): CloseConfig | { error: string } {
  const cfg = getCloseConfig()
  if (!cfg.CLOSE_API_KEY) {
    return { error: 'missing_api_key' }
  }
  return { apiKey: cfg.CLOSE_API_KEY, baseUrl: cfg.CLOSE_BASE_URL }
}

function buildSearchBody(email: string): string {
  return JSON.stringify({
    query: {
      type: 'and',
      queries: [
        { type: 'object_type', object_type: 'lead' },
        {
          type: 'has_related',
          this_object_type: 'lead',
          related_object_type: 'contact_email',
          related_query: {
            type: 'field_condition',
            field: {
              type: 'regular_field',
              object_type: 'contact_email',
              field_name: 'email',
            },
            condition: {
              type: 'text',
              mode: 'phrase',
              value: email,
            },
          },
        },
      ],
    },
    _limit: 5,
  })
}

export async function findCloseLeadByEmail(
  email: string
): Promise<CloseFindResult> {
  const cfg = loadConfig()
  if ('error' in cfg) {
    return { error: cfg.error, transient: false }
  }

  const headers: HeadersInit = {
    Authorization: authHeader(cfg.apiKey),
    'Content-Type': 'application/json',
  }

  return withRetries(
    () =>
      httpJsonRequest(`${cfg.baseUrl}/data/search/`, {
        method: 'POST',
        headers,
        body: buildSearchBody(email),
      }),
    (raw): CloseFindResult => {
      const responseBody = raw.body as
        | { data?: Array<{ id?: string }> }
        | undefined
      const first = responseBody?.data?.[0]
      if (first?.id) {
        return { found: true, leadId: first.id }
      }
      return { found: false }
    },
    (raw, transient): CloseFindResult => ({
      error: extractErrorMessage(raw),
      status: raw.status || undefined,
      transient,
    })
  )
}

export async function pushLeadToClose(input: {
  email: string
  payload: CloseLeadPayload
}): Promise<CloseSyncResult> {
  const cfg = loadConfig()
  if ('error' in cfg) {
    return { success: false, error: cfg.error, transient: false }
  }

  const found = await findCloseLeadByEmail(input.email)
  if ('error' in found) {
    return {
      success: false,
      error: found.error,
      status: found.status,
      transient: found.transient,
    }
  }

  const headers: HeadersInit = {
    Authorization: authHeader(cfg.apiKey),
    'Content-Type': 'application/json',
  }
  const body = JSON.stringify(input.payload)

  if (found.found) {
    return withRetries(
      () =>
        httpJsonRequest(`${cfg.baseUrl}/lead/${found.leadId}/`, {
          method: 'PUT',
          headers,
          body,
        }),
      (raw): CloseSyncResult => {
        const responseBody = raw.body as { id?: string } | undefined
        return {
          success: true,
          closeLeadId: responseBody?.id ?? found.leadId,
          created: false,
        }
      },
      (raw, transient): CloseSyncResult => ({
        success: false,
        error: extractErrorMessage(raw),
        status: raw.status || undefined,
        transient,
      })
    )
  }

  return withRetries(
    () =>
      httpJsonRequest(`${cfg.baseUrl}/lead/`, {
        method: 'POST',
        headers,
        body,
      }),
    (raw): CloseSyncResult => {
      const responseBody = raw.body as { id?: string } | undefined
      if (!responseBody?.id) {
        return {
          success: false,
          error: 'close_response_missing_id',
          status: raw.status,
          transient: false,
        }
      }
      return {
        success: true,
        closeLeadId: responseBody.id,
        created: true,
      }
    },
    (raw, transient): CloseSyncResult => ({
      success: false,
      error: extractErrorMessage(raw),
      status: raw.status || undefined,
      transient,
    })
  )
}
