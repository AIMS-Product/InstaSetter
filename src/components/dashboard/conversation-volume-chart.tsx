'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ConversationVolumePoint } from '@/types/dashboard'

export function ConversationVolumeChart({
  data,
}: {
  data: ConversationVolumePoint[]
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-[0_1px_3px_0_oklch(0_0_0/0.04)]">
        <h3 className="text-[13px] font-semibold text-muted-foreground">
          Conversation Volume
        </h3>
        <p className="mt-4 text-sm text-muted-foreground/50">No data yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-[0_1px_3px_0_oklch(0_0_0/0.04)]">
      <h3 className="mb-6 text-[13px] font-semibold text-muted-foreground">
        Conversation Volume
        <span className="ml-1.5 font-normal text-muted-foreground/50">30d</span>
      </h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.93 0.003 260)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 11,
                fill: 'oklch(0.46 0.01 260)',
                fontFamily: 'var(--font-sans)',
              }}
              tickFormatter={(v: string) => v.slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 11,
                fill: 'oklch(0.46 0.01 260)',
                fontFamily: 'var(--font-geist-mono)',
              }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid oklch(0.92 0.004 260)',
                borderRadius: '10px',
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 16px oklch(0 0 0 / 0.08)',
                padding: '8px 12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="started"
              stroke="oklch(0.52 0.18 265)"
              fill="oklch(0.52 0.18 265 / 0.06)"
              strokeWidth={2}
              name="Started"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="oklch(0.58 0.15 160)"
              fill="oklch(0.58 0.15 160 / 0.06)"
              strokeWidth={2}
              name="Completed"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
