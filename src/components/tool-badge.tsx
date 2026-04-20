export interface ToolBadgeData {
  name: string
  input: Record<string, unknown>
}

export function formatToolBadge(call: ToolBadgeData): {
  label: string
  body?: string
} {
  const input = call.input ?? {}
  switch (call.name) {
    case 'capture_email': {
      const email = typeof input.email === 'string' ? input.email : undefined
      return { label: 'Captured email', body: email }
    }
    case 'qualify_lead': {
      const parts: string[] = []
      if (typeof input.location_type === 'string')
        parts.push(`${input.location_type}`)
      if (typeof input.machine_count === 'number')
        parts.push(`${input.machine_count} machines`)
      if (typeof input.revenue_range === 'string')
        parts.push(`${input.revenue_range}`)
      return {
        label: 'Qualified',
        body: parts.length > 0 ? parts.join(' · ') : undefined,
      }
    }
    case 'book_call': {
      const slot =
        typeof input.calendly_slot === 'string'
          ? input.calendly_slot
          : undefined
      return { label: 'Booked call', body: slot }
    }
    case 'generate_summary': {
      const status =
        typeof input.qualification_status === 'string'
          ? input.qualification_status
          : 'summary'
      const booked = input.call_booked === true ? ' · call booked' : ''
      return { label: `Summary (${status})${booked}` }
    }
    default:
      return { label: call.name }
  }
}

interface Props {
  call: ToolBadgeData
  tone?: 'inline' | 'block'
  bg?: string
  ink?: string
}

export function ToolBadge({
  call,
  tone = 'inline',
  bg = '#EAE6FE',
  ink = '#3B2E72',
}: Props) {
  const f = formatToolBadge(call)
  return (
    <div
      style={{
        fontSize: tone === 'block' ? 12 : 10.5,
        padding: tone === 'block' ? '5px 10px' : '3px 8px',
        borderRadius: 6,
        background: bg,
        color: ink,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
      }}
    >
      <span
        style={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: ink,
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600 }}>{f.label}</span>
      {f.body && (
        <span
          style={{
            opacity: 0.75,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          · {f.body}
        </span>
      )}
    </div>
  )
}
