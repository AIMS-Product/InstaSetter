export const DEFAULT_FLOW_BOOKING_URL =
  'https://booking.vendingpreneurs.com/AK-DM'

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
