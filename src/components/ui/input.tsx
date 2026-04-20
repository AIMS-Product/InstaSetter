import type { ComponentPropsWithoutRef, ForwardedRef } from 'react'
import { forwardRef } from 'react'

const base =
  'w-full rounded-md border border-[#E5E6EC] bg-white px-3 text-sm text-[#161528] placeholder:text-[#8A8A9B] focus:border-[#4F46BA] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'

export const Input = forwardRef(function Input(
  { className = '', ...rest }: ComponentPropsWithoutRef<'input'>,
  ref: ForwardedRef<HTMLInputElement>
) {
  return <input ref={ref} className={`${base} h-10 ${className}`} {...rest} />
})

export const Textarea = forwardRef(function Textarea(
  { className = '', ...rest }: ComponentPropsWithoutRef<'textarea'>,
  ref: ForwardedRef<HTMLTextAreaElement>
) {
  return (
    <textarea
      ref={ref}
      className={`${base} min-h-[80px] py-2 leading-relaxed ${className}`}
      {...rest}
    />
  )
})
