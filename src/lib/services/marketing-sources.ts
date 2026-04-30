import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'
import {
  generateSourceKey,
  type LeadSourceUtm,
} from '@/lib/services/marketing-attribution'
import {
  buildInstagramRefLink,
  InstagramRefLinkError,
} from '@/lib/services/instagram-ref-link'

export type MarketingSource =
  Database['public']['Tables']['marketing_sources']['Row'] & {
    conversation_count?: number
  }

export type MarketingSourcesListResult =
  | { success: true; sources: MarketingSource[] }
  | { success: false; sources: []; error: string }

export interface SourceSetupValues {
  tag: string
  variables: Record<string, string>
  /**
   * `ig.me/m/{handle}?ref=...` deep link for the source. Present only when a
   * brand handle is configured (`BRAND_INSTAGRAM_HANDLE` env var) AND at least
   * one of: any UTM field on the source row, or any `lead_*` variable. When
   * any optional component would push the ref payload over Meta's 480-char
   * cap, the link is built with the legacy lead_* mirror omitted; if it still
   * exceeds the cap, the link is omitted entirely with the error message
   * surfaced for the operator UI.
   */
  refLink?: string
  refLinkError?: string
}

export function buildSourceSetupValues(
  source: Pick<
    MarketingSource,
    | 'source_key'
    | 'channel'
    | 'campaign'
    | 'material'
    | 'entry_action'
    | 'trigger_label'
    | 'utm_source'
    | 'utm_medium'
    | 'utm_campaign'
    | 'utm_content'
    | 'utm_term'
    | 'ad_id'
    | 'ad_set_id'
    | 'landing_page_url'
  >,
  options: { handle?: string } = {}
): SourceSetupValues {
  const variables: Record<string, string> = {
    lead_channel: source.channel,
    lead_campaign: source.campaign,
    lead_material: source.material,
    lead_entry_action: source.entry_action,
    lead_trigger: source.trigger_label,
    lead_source_key: source.source_key,
  }

  const utm: LeadSourceUtm = {
    source: source.utm_source ?? undefined,
    medium: source.utm_medium ?? undefined,
    campaign: source.utm_campaign ?? undefined,
    content: source.utm_content ?? undefined,
    term: source.utm_term ?? undefined,
  }
  const hasUtm = Object.values(utm).some((v) => Boolean(v))

  const tag = `src:${source.source_key}`
  const setup: SourceSetupValues = { tag, variables }

  // Only emit a deep link when we actually have a handle to paste into. Without
  // a handle, the URL would be malformed and confuse operators.
  if (options.handle) {
    try {
      setup.refLink = buildInstagramRefLink({
        handle: options.handle,
        sourceKey: source.source_key,
        utm: hasUtm ? utm : undefined,
        adId: source.ad_id ?? undefined,
        adSetId: source.ad_set_id ?? undefined,
        landingPageUrl: source.landing_page_url ?? undefined,
        leadVariables: variables,
      })
    } catch (e) {
      // First fallback: drop the legacy lead_* mirror to free up bytes. UTMs
      // are the canonical reporting axis and must not be dropped.
      try {
        setup.refLink = buildInstagramRefLink({
          handle: options.handle,
          sourceKey: source.source_key,
          utm: hasUtm ? utm : undefined,
          adId: source.ad_id ?? undefined,
          adSetId: source.ad_set_id ?? undefined,
          landingPageUrl: source.landing_page_url ?? undefined,
        })
      } catch (e2) {
        setup.refLinkError =
          e2 instanceof InstagramRefLinkError
            ? e2.message
            : e instanceof InstagramRefLinkError
              ? e.message
              : 'Could not build Instagram deep link.'
      }
    }
  }

  return setup
}

export async function listMarketingSources(): Promise<MarketingSourcesListResult> {
  const client = createServiceRoleClient()
  const [{ data: sources, error }, { data: attributions }] = await Promise.all([
    client
      .from('marketing_sources')
      .select('*')
      .order('created_at', { ascending: false }),
    client.from('conversation_attributions').select('source_id'),
  ])

  if (error || !sources) {
    console.error('listMarketingSources failed', error)
    return {
      success: false,
      sources: [],
      error:
        error?.message ??
        'Sources could not be loaded. Check the database connection.',
    }
  }

  const counts = new Map<string, number>()
  for (const row of attributions ?? []) {
    if (!row.source_id) continue
    counts.set(row.source_id, (counts.get(row.source_id) ?? 0) + 1)
  }

  return {
    success: true,
    sources: sources.map((source) => ({
      ...source,
      conversation_count: counts.get(source.id) ?? 0,
    })),
  }
}

export async function createMarketingSource(input: {
  label?: string
  channel: string
  campaign: string
  material: string
  entryAction: string
  triggerLabel: string
  postUrl?: string
  adId?: string
  notes?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  adSetId?: string
  landingPageUrl?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const client = createServiceRoleClient()

  const utm: LeadSourceUtm = {
    source: input.utmSource?.trim() || undefined,
    medium: input.utmMedium?.trim() || undefined,
    campaign: input.utmCampaign?.trim() || undefined,
    content: input.utmContent?.trim() || undefined,
    term: input.utmTerm?.trim() || undefined,
  }

  const sourceKey = generateSourceKey({
    channel: input.channel,
    campaign: input.campaign,
    material: input.material,
    entryAction: input.entryAction,
    triggerLabel: input.triggerLabel,
    utm,
  })

  const { error } = await client.from('marketing_sources').insert({
    source_key: sourceKey,
    label: input.label?.trim() || input.material.trim(),
    channel: input.channel.trim(),
    campaign: input.campaign.trim(),
    material: input.material.trim(),
    entry_action: input.entryAction.trim(),
    trigger_label: input.triggerLabel.trim(),
    post_url: input.postUrl?.trim() || null,
    ad_id: input.adId?.trim() || null,
    notes: input.notes?.trim() || null,
    utm_source: utm.source ?? null,
    utm_medium: utm.medium ?? null,
    utm_campaign: utm.campaign ?? null,
    utm_content: utm.content ?? null,
    utm_term: utm.term ?? null,
    ad_set_id: input.adSetId?.trim() || null,
    landing_page_url: input.landingPageUrl?.trim() || null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function archiveMarketingSource(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const client = createServiceRoleClient()
  const { error } = await client
    .from('marketing_sources')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
