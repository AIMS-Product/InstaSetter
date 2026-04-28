import { DEFAULT_FLOW_ID } from '@/lib/flows'

export const DEFAULT_FLOW_BOOKING_URL =
  'https://booking.vendingpreneurs.com/AK-DM'

export const KNOWN_FLOWS = [
  {
    id: DEFAULT_FLOW_ID,
    name: 'Instagram organic DM',
    channel: 'Instagram DM',
    description:
      'Appointment-setting flow for organic Instagram conversations.',
  },
] as const

export type KnownFlowId = (typeof KNOWN_FLOWS)[number]['id']

export function isKnownFlowId(flowId: string): flowId is KnownFlowId {
  return KNOWN_FLOWS.some((flow) => flow.id === flowId)
}

export function resolveFlowBookingUrl(raw: string | undefined): string {
  const trimmed = raw?.trim()
  if (!trimmed) return DEFAULT_FLOW_BOOKING_URL

  try {
    return new URL(trimmed).toString()
  } catch {
    return DEFAULT_FLOW_BOOKING_URL
  }
}

export function resolveFlowBrand(raw: string | undefined): string {
  return raw?.trim() || 'VendingPreneurs'
}
