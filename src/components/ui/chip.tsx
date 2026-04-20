import type { ComponentPropsWithoutRef } from 'react'

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-[#EEEFF3] text-[#4B4A5E]',
  accent: 'bg-[#EDECF9] text-[#2E297A]',
  success: 'bg-[#E6F4EA] text-[#1F6B3A]',
  warn: 'bg-[#FBE7D9] text-[#8B4316]',
  danger: 'bg-[#F5D9D9] text-[#8E2A2A]',
}

export function Chip({
  tone = 'neutral',
  dot = false,
  className = '',
  children,
  ...rest
}: ComponentPropsWithoutRef<'span'> & {
  tone?: Tone
  dot?: boolean
}) {
  const dotColor: Record<Tone, string> = {
    neutral: '#8A8A9B',
    accent: '#4F46BA',
    success: '#3FB37F',
    warn: '#E08040',
    danger: '#C13A3A',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dotColor[tone] }}
        />
      )}
      {children}
    </span>
  )
}
