import { z } from 'zod'

/**
 * Operator-owned forbidden-phrase entry. Stacks on top of the data-driven
 * `### Forbidden Phrases` block in `persona.ts`. Persisted on the flow draft
 * (`ins_flow_drafts.state`) so brand teams can curate without engineering.
 */
export const BrandGuardrailSchema = z
  .object({
    id: z.string().uuid(),
    phrase: z.string().trim().min(1).max(280),
    note: z.string().trim().max(500).nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()

export const BrandGuardrailsArraySchema = z.array(BrandGuardrailSchema).max(50)

export type BrandGuardrail = z.infer<typeof BrandGuardrailSchema>

export const DEFAULT_BRAND_GUARDRAILS: BrandGuardrail[] = []

/**
 * Returns the prompt section listing operator-added forbidden phrases.
 * Returns the empty string when the list is empty so the assembler emits no
 * extra bytes — preserving the byte-identical baseline guarantee for the
 * compile-block contract test.
 */
export function buildBrandGuardrails(guardrails: BrandGuardrail[]): string {
  if (guardrails.length === 0) return ''
  const lines = [
    '## Brand Guardrails — Never Say (operator-owned)',
    '',
    "These are the brand's operator-curated forbidden phrases. They stack on top of the data-driven Forbidden Phrases section in the persona. Treat them as hard rules.",
    '',
  ]
  for (const guardrail of guardrails) {
    const trimmedNote = guardrail.note?.trim()
    const noteSuffix = trimmedNote ? ` — note: ${trimmedNote}` : ''
    lines.push(`- Never say "${guardrail.phrase}"${noteSuffix}`)
  }
  return lines.join('\n')
}
