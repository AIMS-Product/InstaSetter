import FlowBuilder from './flow-builder'

function resolveBrand(): string {
  return process.env.BRAND_NAME ?? 'VendingPreneurs'
}

function resolveBookingUrl(): string {
  return (
    process.env.BOOKING_URL?.trim() ||
    'https://booking.vendingpreneurs.com/AK-DM'
  )
}

export default function FlowPage() {
  return <FlowBuilder brand={resolveBrand()} bookingUrl={resolveBookingUrl()} />
}
