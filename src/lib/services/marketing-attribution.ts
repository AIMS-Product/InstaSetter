import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { SendPulseWebhookPayload } from '@/types/sendpulse'

export const SOURCE_TAG_PREFIX = 'src:'

export interface LeadSourceContext {
  sourceKey?: string
  label?: string
  channel?: string
  campaign?: string
  material?: string
  entryAction?: string
  triggerLabel?: string
  postUrl?: string
  adId?: string
}

export interface NormalizedAttribution extends LeadSourceContext {
  sourceId: string | null
  rawMessageId: string | null
}

export function generateSourceKey(input: {
  channel: string
  campaign: string
  material: string
  entryAction: string
  triggerLabel: string
}): string {
  return [
    input.channel,
    input.campaign,
    input.material,
    input.entryAction,
    input.triggerLabel,
  ]
    .map(slugPart)
    .filter(Boolean)
    .join('_')
}

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readVariables(
  event: SendPulseWebhookPayload
): Record<string, unknown> {
  const contact = readRecord(event.contact)
  const info = readRecord((event as Record<string, unknown>).info)
  return {
    ...readRecord(info.variables),
    ...readRecord(contact.variables),
  }
}

function readTags(event: SendPulseWebhookPayload): string[] {
  const contact = readRecord(event.contact)
  const info = readRecord((event as Record<string, unknown>).info)
  const values = [contact.tags, info.tags]
  return values.flatMap((value) =>
    Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === 'string')
      : []
  )
}

function readRawMessageId(event: SendPulseWebhookPayload): string | null {
  const raw = event as Record<string, unknown>
  const info = readRecord(raw.info)
  const message = readRecord(raw.message)
  return (
    readString(raw.message_id) ??
    readString(info.message_id) ??
    readString(message.id) ??
    null
  )
}

export function extractSendPulseAttribution(
  event: SendPulseWebhookPayload
): Omit<NormalizedAttribution, 'sourceId'> {
  const variables = readVariables(event)
  const tags = readTags(event)
  const sourceKeyFromTag = tags
    .find((tag) => tag.startsWith(SOURCE_TAG_PREFIX))
    ?.slice(SOURCE_TAG_PREFIX.length)

  return {
    sourceKey:
      readString(variables.lead_source_key) ?? sourceKeyFromTag ?? undefined,
    channel: readString(variables.lead_channel),
    campaign: readString(variables.lead_campaign),
    material: readString(variables.lead_material),
    entryAction: readString(variables.lead_entry_action),
    triggerLabel: readString(variables.lead_trigger),
    rawMessageId: readRawMessageId(event),
  }
}

export async function persistSendPulseAttribution(
  client: SupabaseClient<Database>,
  input: {
    event: SendPulseWebhookPayload
    contactId: string
    conversationId: string
  }
): Promise<{
  leadSourceContext?: LeadSourceContext
  webhookEventId: string | null
}> {
  const extracted = extractSendPulseAttribution(input.event)
  const { data: webhookEvent } = await client
    .from('integration_events')
    .insert({
      integration: 'sendpulse',
      action: 'incoming_message_webhook',
      status: 'received',
      contact_id: input.contactId,
      conversation_id: input.conversationId,
      payload: input.event as unknown as Json,
    })
    .select('id')
    .single()

  const hasAttribution = Boolean(
    extracted.sourceKey ||
    extracted.channel ||
    extracted.campaign ||
    extracted.material ||
    extracted.entryAction ||
    extracted.triggerLabel
  )

  if (!hasAttribution) {
    return { webhookEventId: webhookEvent?.id ?? null }
  }

  let source: Database['public']['Tables']['marketing_sources']['Row'] | null =
    null
  if (extracted.sourceKey) {
    const { data } = await client
      .from('marketing_sources')
      .select('*')
      .eq('source_key', extracted.sourceKey)
      .maybeSingle()
    source = data
  }

  const attribution: NormalizedAttribution = {
    sourceId: source?.id ?? null,
    sourceKey: extracted.sourceKey ?? source?.source_key,
    label: source?.label ?? undefined,
    channel: source?.channel ?? extracted.channel,
    campaign: source?.campaign ?? extracted.campaign,
    material: source?.material ?? extracted.material,
    entryAction: source?.entry_action ?? extracted.entryAction,
    triggerLabel: source?.trigger_label ?? extracted.triggerLabel,
    postUrl: source?.post_url ?? undefined,
    adId: source?.ad_id ?? undefined,
    rawMessageId: extracted.rawMessageId,
  }

  await client.from('conversation_attributions').upsert(
    {
      conversation_id: input.conversationId,
      source_id: attribution.sourceId,
      source_key: attribution.sourceKey ?? null,
      channel: attribution.channel ?? null,
      campaign: attribution.campaign ?? null,
      material: attribution.material ?? null,
      entry_action: attribution.entryAction ?? null,
      trigger_label: attribution.triggerLabel ?? null,
      raw_message_id: attribution.rawMessageId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'conversation_id' }
  )

  return {
    webhookEventId: webhookEvent?.id ?? null,
    leadSourceContext: attribution,
  }
}

export function formatAttributionLabel(
  attribution?: LeadSourceContext | null
): string {
  if (!attribution) return 'Unknown source'
  return [
    attribution.channel,
    attribution.entryAction,
    attribution.material ?? attribution.campaign,
  ]
    .filter(Boolean)
    .join(' · ')
}
