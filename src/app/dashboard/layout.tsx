import { DashboardShell } from '@/components/dashboard-shell'
import { ToastProvider } from '@/components/ui/toast'

function resolveBrand(): string {
  return process.env.BRAND_NAME ?? 'VendingPreneurs'
}

function resolveEnv(): 'development' | 'production' | 'preview' {
  const v = process.env.VERCEL_ENV ?? process.env.NODE_ENV
  if (v === 'production') return 'production'
  if (v === 'preview') return 'preview'
  return 'development'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <DashboardShell brand={resolveBrand()} env={resolveEnv()}>
        {children}
      </DashboardShell>
    </ToastProvider>
  )
}
