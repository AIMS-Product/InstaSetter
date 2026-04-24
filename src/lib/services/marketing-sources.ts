import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'
import { generateSourceKey } from '@/lib/services/marketing-attribution'

export type MarketingSource =
  Database['public']['Tables']['marketing_sources']['Row'] & {
    conversation_count?: number
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
  >
) {
  return {
    tag: `src:${source.source_key}`,
    variables: {
      lead_channel: source.channel,
      lead_campaign: source.campaign,
      lead_material: source.material,
      lead_entry_action: source.entry_action,
      lead_trigger: source.trigger_label,
      lead_source_key: source.source_key,
    },
  }
}

export async function listMarketingSources(): Promise<MarketingSource[]> {
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
    return []
  }

  const counts = new Map<string, number>()
  for (const row of attributions ?? []) {
    if (!row.source_id) continue
    counts.set(row.source_id, (counts.get(row.source_id) ?? 0) + 1)
  }

  return sources.map((source) => ({
    ...source,
    conversation_count: counts.get(source.id) ?? 0,
  }))
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
}): Promise<{ success: true } | { success: false; error: string }> {
  const client = createServiceRoleClient()
  const sourceKey = generateSourceKey({
    channel: input.channel,
    campaign: input.campaign,
    material: input.material,
    entryAction: input.entryAction,
    triggerLabel: input.triggerLabel,
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
