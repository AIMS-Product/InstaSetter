import 'server-only'

import { DEFAULT_FLOW_ID } from '@/lib/flows'
import { isBotEnabled } from '@/lib/config'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type FlowRuntimeControl = {
  flowId: string
  envBotEnabled: boolean
  botPaused: boolean
  pausedUntil: string | null
  botEnabled: boolean
}

type FlowRuntimeRow = {
  flow_id: string
  bot_paused: boolean
  paused_until: string | null
}

function rowToRuntime(
  row: FlowRuntimeRow | null,
  flowId: string
): FlowRuntimeControl {
  const envBotEnabled = isBotEnabled()
  const pausedUntil = row?.paused_until ?? null
  const pauseExpired = pausedUntil
    ? new Date(pausedUntil).getTime() <= Date.now()
    : false
  const botPaused = Boolean(row?.bot_paused) && !pauseExpired

  return {
    flowId,
    envBotEnabled,
    botPaused,
    pausedUntil: botPaused ? pausedUntil : null,
    botEnabled: envBotEnabled && !botPaused,
  }
}

export async function getFlowRuntimeControl(
  flowId: string = DEFAULT_FLOW_ID
): Promise<FlowRuntimeControl> {
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('flow_runtime_controls')
    .select('flow_id, bot_paused, paused_until')
    .eq('flow_id', flowId)
    .maybeSingle()

  if (error) {
    console.error('getFlowRuntimeControl failed', error)
    return rowToRuntime(null, flowId)
  }

  return rowToRuntime(data, flowId)
}

export async function setFlowRuntimePause({
  flowId = DEFAULT_FLOW_ID,
  paused,
  durationMinutes,
}: {
  flowId?: string
  paused: boolean
  durationMinutes?: number
}): Promise<FlowRuntimeControl> {
  const pausedUntil =
    paused && durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('flow_runtime_controls')
    .upsert(
      {
        flow_id: flowId,
        bot_paused: paused,
        paused_until: pausedUntil,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'flow_id' }
    )
    .select('flow_id, bot_paused, paused_until')
    .single()

  if (error) {
    console.error('setFlowRuntimePause failed', error)
    return rowToRuntime(null, flowId)
  }

  return rowToRuntime(data, flowId)
}
