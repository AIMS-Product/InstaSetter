import { notFound } from 'next/navigation'
import { isBotEnabled } from '@/lib/config'
import FlowBuilder from './flow-builder'
import {
  KNOWN_FLOWS,
  isKnownFlowId,
  resolveFlowBookingUrl,
  resolveFlowBrand,
} from './flow-config'

export const dynamicParams = false

export function generateStaticParams() {
  return KNOWN_FLOWS.map((flow) => ({ flowId: flow.id }))
}

export default async function FlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>
}) {
  const { flowId } = await params
  if (!isKnownFlowId(flowId)) notFound()

  return (
    <FlowBuilder
      flowId={flowId}
      brand={resolveFlowBrand(process.env.BRAND_NAME)}
      bookingUrl={resolveFlowBookingUrl(process.env.BOOKING_URL)}
      botEnabled={isBotEnabled()}
    />
  )
}
