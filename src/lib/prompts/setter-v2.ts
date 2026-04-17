import { buildPersona } from './sections/persona'
import { buildCompanyContext } from './sections/company-context'
import { buildLocationGate } from './sections/location-gate'
import { buildQualificationCriteria } from './sections/qualification'
import { buildObjectionHandling } from './sections/objections'
import { buildEmailCapture } from './sections/email-capture'
import { buildDecisionRouting } from './sections/decision-routing'
import { buildSummaryGeneration } from './sections/summary-generation'
import { buildMessageConstraints } from './sections/message-constraints'

const PROMPT_VERSION = 'setter-v2'

export interface ContactContext {
  tags: string[]
  name?: string
  email?: string
  lastQualification?: {
    status: string
    location?: string
    motivation?: string
    budget?: string
  }
}

interface BuildSystemPromptOptions {
  brandName: string
  isReturningContact?: boolean
  priorSummaries?: string[]
  contactContext?: ContactContext
}

export function buildSystemPrompt({
  brandName,
  isReturningContact,
  priorSummaries,
  contactContext,
}: BuildSystemPromptOptions): string {
  const sections = [
    buildPersona(brandName),
    buildCompanyContext(brandName),
    buildLocationGate(brandName),
    buildQualificationCriteria(),
    buildObjectionHandling(brandName),
    buildEmailCapture(),
    buildDecisionRouting(),
    buildSummaryGeneration(),
    buildMessageConstraints(),
  ]

  if (isReturningContact && priorSummaries?.length) {
    sections.push(buildReturningContactSection(priorSummaries))
  }

  if (contactContext) {
    sections.push(buildContactContextSection(contactContext))
  }

  return `[${PROMPT_VERSION}]\n\n${sections.join('\n\n')}`
}

function buildContactContextSection(ctx: ContactContext): string {
  const lines: string[] = [
    '## Contact Context (DO NOT re-ask information you already have)',
  ]

  if (ctx.name) lines.push(`Name: ${ctx.name}`)
  if (ctx.email) lines.push(`Email: ${ctx.email}`)
  if (ctx.tags.length > 0) lines.push(`Tags: ${ctx.tags.join(', ')}`)

  const q = ctx.lastQualification
  if (q) {
    lines.push('')
    lines.push('Known qualification data:')
    if (q.location) lines.push(`- Location: ${q.location}`)
    if (q.motivation) lines.push(`- Motivation: ${q.motivation}`)
    if (q.budget) lines.push(`- Budget: ${q.budget}`)
    lines.push(`- Status: ${q.status}`)
  }

  // Inject booking directive if both qualifiers are known
  const hasLocation =
    ctx.tags.some((t) => t.startsWith('location:')) || q?.location
  const hasMotivation =
    ctx.tags.some((t) => t.startsWith('motivation:')) || q?.motivation

  if (hasLocation && hasMotivation) {
    lines.push('')
    lines.push(
      'ACTION: Both location and motivation are known. Your NEXT message MUST include the booking link. Do not ask more qualification questions.'
    )
  }

  return lines.join('\n')
}

function buildReturningContactSection(priorSummaries: string[]): string {
  const summaryList = priorSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')

  return `## Returning Contact
This is a returning contact. Reference prior conversation context naturally — do not repeat qualification questions already answered. Pick up where you left off.

Prior conversation summaries:
${summaryList}`
}
