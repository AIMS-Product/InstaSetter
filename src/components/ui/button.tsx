import type { ComponentPropsWithoutRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-[#4F46BA] text-white hover:bg-[#3d36a0] disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white border border-[#E5E6EC] text-[#161528] hover:bg-[#FAFAFB] disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-[#4B4A5E] hover:bg-[#EFEFF3] disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-[#C13A3A] text-white hover:bg-[#a63131] disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}: ComponentPropsWithoutRef<'button'> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  )
}
