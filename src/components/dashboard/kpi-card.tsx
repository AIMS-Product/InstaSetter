import type { LucideIcon } from 'lucide-react'

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[0_1px_3px_0_oklch(0_0_0/0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
            <Icon className="h-4 w-4 text-primary/70" strokeWidth={1.8} />
          </div>
        )}
      </div>
      <p className="mt-3 text-[28px] font-bold tracking-tight font-mono text-foreground">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
