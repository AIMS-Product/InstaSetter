import type { Metadata } from 'next'
import { Shell } from '@/components/dashboard/shell'

export const metadata: Metadata = {
  title: 'Dashboard | InstaSetter',
  description: 'InstaSetter operations dashboard',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Shell>{children}</Shell>
}
