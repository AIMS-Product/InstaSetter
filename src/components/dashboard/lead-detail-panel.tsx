import type { LeadListItem } from '@/types/dashboard'

function Field({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] text-foreground/80">{value}</dd>
    </div>
  )
}

export function LeadDetailPanel({ lead }: { lead: LeadListItem }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      <Field label="Location" value={lead.locationType} />
      <Field label="Revenue" value={lead.revenueRange} />
      <Field label="Machines" value={lead.machineCount?.toString() ?? null} />
      <Field label="Calendly" value={lead.calendlySlot} />
      <Field label="Outcome" value={lead.callOutcome} />
      <Field label="Action" value={lead.recommendedAction} />
      <Field label="Notes" value={lead.keyNotes} />
    </dl>
  )
}
