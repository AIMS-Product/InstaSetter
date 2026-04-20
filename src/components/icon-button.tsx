import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

// Shared wrapper for icon-only buttons. Requiring `label` at the type level is
// the whole point — every persona in the UX review flagged the Unicode-glyph
// buttons (×, +, −, ⤢, ⊞, ↻) as undiscoverable and invisible to screen readers.
// Passing an IconButton without a label is a type error.
export function IconButton({
  icon: Icon,
  label,
  size = 28,
  iconSize = 14,
  children,
  style,
  type = 'button',
  ...rest
}: Omit<ComponentPropsWithoutRef<'button'>, 'aria-label'> & {
  icon: LucideIcon
  label: string
  size?: number
  iconSize?: number
  children?: ReactNode
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRadius: 6,
        padding: 0,
        color: 'inherit',
        ...style,
      }}
      {...rest}
    >
      <Icon aria-hidden size={iconSize} strokeWidth={1.75} />
      {children}
    </button>
  )
}
