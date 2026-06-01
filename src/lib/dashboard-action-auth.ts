import 'server-only'

import { headers } from 'next/headers'
import { checkDashboardBasicAuth } from '@/lib/dashboard-auth'

export async function assertDashboardActionAuthorized(): Promise<void> {
  const unauthenticatedDecision = checkDashboardBasicAuth(null)
  if (unauthenticatedDecision.ok) return

  const headerStore = await headers()
  const decision = checkDashboardBasicAuth(headerStore.get('authorization'))
  if (!decision.ok) {
    throw new Error(decision.message)
  }
}
