import { HelpCircle } from 'lucide-react'

/**
 * Small icon-only tooltip used in operator-facing surfaces (Lead Sources,
 * Reports, Conversations). Mirrors the inline `HelpTip` pattern from
 * `src/app/dashboard/marketing-sources/page.tsx` so visual style stays
 * consistent across pages. The native `title` attribute is the keyboard
 * fallback; CSS hover/focus reveals the styled bubble underneath. Pure
 * client-safe component — no `"use client"` needed.
 */
export function HelpTooltip({
  text,
  example,
  size = 13,
}: {
  text: string
  example?: string
  size?: number
}) {
  const label = example ? `${text} Example: ${example}` : text
  return (
    <span
      className="source-help-tip"
      tabIndex={0}
      aria-label={label}
      title={label}
    >
      <HelpCircle aria-hidden size={size} strokeWidth={2} />
      <span className="source-help-tip__bubble" role="tooltip">
        <span>{text}</span>
        {example && <strong>Example: {example}</strong>}
      </span>
    </span>
  )
}
