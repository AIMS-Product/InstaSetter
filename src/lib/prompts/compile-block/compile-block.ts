import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import type { BlockOverrides } from '@/lib/prompts/compile-block/schemas'

export interface CompileBlockInput {
  brand: string
  bookingUrl?: string
  overrides?: BlockOverrides | undefined
}

export function compileBlock(input: CompileBlockInput): string {
  return buildSystemPrompt({
    brandName: input.brand,
    bookingUrl: input.bookingUrl,
  })
}
