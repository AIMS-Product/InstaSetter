export function LeadPipelineBar({
  hot,
  warm,
  cold,
}: {
  hot: number
  warm: number
  cold: number
}) {
  const total = hot + warm + cold

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-[0_1px_3px_0_oklch(0_0_0/0.04)]">
        <h3 className="text-[13px] font-semibold text-muted-foreground">
          Lead Pipeline
        </h3>
        <p className="mt-4 text-sm text-muted-foreground/50">No leads yet</p>
      </div>
    )
  }

  const hotPct = (hot / total) * 100
  const warmPct = (warm / total) * 100
  const coldPct = (cold / total) * 100

  return (
    <div className="rounded-xl border bg-card p-6 shadow-[0_1px_3px_0_oklch(0_0_0/0.04)]">
      <h3 className="mb-6 text-[13px] font-semibold text-muted-foreground">
        Lead Pipeline
        <span className="ml-1.5 font-normal text-muted-foreground/50">
          {total} total
        </span>
      </h3>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {hotPct > 0 && (
          <div
            className="bg-rose-500 transition-all"
            style={{ width: `${hotPct}%` }}
          />
        )}
        {warmPct > 0 && (
          <div
            className="bg-amber-400 transition-all"
            style={{ width: `${warmPct}%` }}
          />
        )}
        {coldPct > 0 && (
          <div
            className="bg-sky-400 transition-all"
            style={{ width: `${coldPct}%` }}
          />
        )}
      </div>
      <div className="mt-4 flex gap-5 text-[12px]">
        <span className="flex items-center gap-2 font-medium text-foreground/60">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Hot {hot}
        </span>
        <span className="flex items-center gap-2 font-medium text-foreground/60">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Warm {warm}
        </span>
        <span className="flex items-center gap-2 font-medium text-foreground/60">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Cold {cold}
        </span>
      </div>
    </div>
  )
}
