import FlowBuilder from './flow-builder'
import { resolveFlowBookingUrl, resolveFlowBrand } from './flow-config'

export default async function FlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>
}) {
  const { flowId } = await params

  return (
    <FlowBuilder
      flowId={flowId}
      brand={resolveFlowBrand(process.env.BRAND_NAME)}
      bookingUrl={resolveFlowBookingUrl(process.env.BOOKING_URL)}
    />
  )
}
