import type { Database } from '@/types/database'

/**
 * Builds the JSON body sent to Close's `POST /api/v1/lead/` (create) and
 * `PUT /api/v1/lead/{id}/` (update) endpoints. Pure — no fetch, no
 * Supabase, no env access. Trivially unit-testable.
 *
 * Custom fields are rendered as `custom.{lcf_xxx}` keys. The mapping of
 * logical name → Close field id arrives via `customFieldIds` (sourced from
 * the `CLOSE_CUSTOM_FIELD_IDS` env var). Logical fields with no
 * configured ID are silently skipped — operators add IDs as they wire up
 * each Close custom field.
 *
 * Grounded against:
 * - https://developer.close.com/api/resources/leads/create
 * - https://developer.close.com/api/resources/leads/update
 *
 * The same shape is accepted by both create and update: update is a
 * non-destructive partial PATCH, so omitted fields stay untouched.
 */

type LeadRow = Database['public']['Tables']['leads']['Row']
type ContactRow = Database['public']['Tables']['contacts']['Row']
type ConversationRow = Database['public']['Tables']['conversations']['Row']
type AttributionRow =
  Database['public']['Tables']['conversation_attributions']['Row']

export type CloseLogicalField =
  | 'instagram_handle'
  | 'instasetter_conversation_url'
  | 'lead_source_channel'
  | 'lead_source_campaign'
  | 'lead_source_material'
  | 'qualification_status'
  | 'qualification_location'
  | 'qualification_motivation'
  | 'qualification_budget'
  | 'instasetter_lead_id'

export type CloseCustomFieldIds = Partial<Record<CloseLogicalField, string>>

export interface CloseLeadPayloadInput {
  lead: Pick<
    LeadRow,
    | 'id'
    | 'instagram_handle'
    | 'qualification_status'
    | 'location_type'
    | 'revenue_range'
    | 'name'
    | 'email'
  >
  contact: Pick<ContactRow, 'name' | 'email' | 'instagram_handle' | 'tags'>
  conversation: Pick<ConversationRow, 'id'>
  attribution?: Pick<AttributionRow, 'channel' | 'campaign' | 'material'> | null
  customFieldIds: CloseCustomFieldIds
  /** e.g. https://insta-setter.vercel.app */
  appBaseUrl: string
  /** Default Close lead status to drop new InstaSetter leads into. */
  statusId?: string
}

export interface CloseLeadPayload {
  name: string
  status_id?: string
  contacts: Array<{
    name: string
    emails: Array<{ email: string; type: 'office' }>
  }>
  // Index signature for `custom.lcf_xxx` keys.
  [customField: `custom.${string}`]: string | undefined
}

const CONVERSATION_PATH = '/dashboard/conversations'

/**
 * Render the conversation URL for the closer to click through and read the
 * full transcript. Centralised here so a route rename only changes one
 * constant.
 */
export function buildConversationUrl(
  appBaseUrl: string,
  conversationId: string
): string {
  // Trim a trailing slash so we don't double up.
  const base = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl
  return `${base}${CONVERSATION_PATH}/${conversationId}`
}

function pickMotivationFromTags(
  tags: string[] | null | undefined
): string | undefined {
  if (!tags) return undefined
  return tags
    .find((t) => t.startsWith('motivation:'))
    ?.replace('motivation:', '')
}

function pickLocationFromTags(
  tags: string[] | null | undefined
): string | undefined {
  if (!tags) return undefined
  return tags.find((t) => t.startsWith('location:'))?.replace('location:', '')
}

function pickBudgetFromTags(
  tags: string[] | null | undefined
): string | undefined {
  if (!tags) return undefined
  return tags.find((t) => t.startsWith('budget:'))?.replace('budget:', '')
}

function trimToCloseLimit(
  value: string | undefined | null
): string | undefined {
  if (!value) return undefined
  // Close caps custom field values at 500 chars; we cap at 480 to leave
  // room for any future suffixing.
  return value.length > 480 ? value.slice(0, 480) : value
}

export function buildCloseLeadPayload(
  input: CloseLeadPayloadInput
): CloseLeadPayload {
  const { lead, contact, conversation, attribution, customFieldIds, statusId } =
    input

  const handle = lead.instagram_handle ?? contact.instagram_handle ?? ''
  const displayName =
    contact.name?.trim() ||
    lead.name?.trim() ||
    (handle ? `@${handle}` : 'InstaSetter Lead')

  const email = (contact.email ?? lead.email ?? '').trim()

  const payload: CloseLeadPayload = {
    name: displayName,
    contacts: [
      {
        name: displayName,
        emails: email ? [{ email, type: 'office' }] : [],
      },
    ],
  }

  if (statusId) payload.status_id = statusId

  const conversationUrl = buildConversationUrl(
    input.appBaseUrl,
    conversation.id
  )
  const tagLocation = pickLocationFromTags(contact.tags)
  const tagMotivation = pickMotivationFromTags(contact.tags)
  const tagBudget = pickBudgetFromTags(contact.tags)

  const fieldValues: Record<CloseLogicalField, string | undefined> = {
    instagram_handle: handle ? `@${handle}` : undefined,
    instasetter_conversation_url: conversationUrl,
    lead_source_channel: attribution?.channel ?? undefined,
    lead_source_campaign: attribution?.campaign ?? undefined,
    lead_source_material: attribution?.material ?? undefined,
    qualification_status: lead.qualification_status,
    qualification_location: lead.location_type ?? tagLocation,
    qualification_motivation: tagMotivation,
    qualification_budget: lead.revenue_range ?? tagBudget,
    instasetter_lead_id: lead.id,
  }

  // Render every configured custom field. Logical fields with no
  // configured Close `lcf_xxx` ID are skipped silently.
  for (const logical of Object.keys(fieldValues) as CloseLogicalField[]) {
    const closeId = customFieldIds[logical]
    if (!closeId) continue
    const value = trimToCloseLimit(fieldValues[logical])
    if (value === undefined) continue
    payload[`custom.${closeId}` as `custom.${string}`] = value
  }

  return payload
}
