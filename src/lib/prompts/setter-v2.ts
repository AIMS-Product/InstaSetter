import { buildPersona } from './sections/persona'
import { buildCompanyContext } from './sections/company-context'
import { buildLocationGate } from './sections/location-gate'
import { buildQualificationCriteria } from './sections/qualification'
import { buildObjectionHandling } from './sections/objections'
import { buildEmailCapture } from './sections/email-capture'
import { buildDecisionRouting } from './sections/decision-routing'
import { buildSummaryGeneration } from './sections/summary-generation'
import { buildMessageConstraints } from './sections/message-constraints'
import type { PostEmailBehavior } from '@/lib/prompts/post-email-behavior'
import {
  DEFAULT_PRE_BOOKING_STEP,
  type PreBookingStep,
} from './pre-booking-step'
import type { LeadSourceContext } from '@/lib/services/marketing-attribution'

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
  bookingUrl?: string
  isReturningContact?: boolean
  priorSummaries?: string[]
  contactContext?: ContactContext
  leadSourceContext?: LeadSourceContext
  /**
   * Operator-published Email Capture configuration. When omitted, the
   * code-owned `DEFAULT_POST_EMAIL_BEHAVIOR` is used so output is
   * byte-identical to the pre-snapshot behaviour. The compile-block
   * contract test enforces this invariant on every PR.
   */
  postEmailBehavior?: PostEmailBehavior
  /**
   * Pre-booking rapport step. When omitted, defaults to
   * `DEFAULT_PRE_BOOKING_STEP` (enabled with the code-shipped question).
   * Callers that need to disable the bridge — including the engine when
   * `LIVE_PRE_BOOKING_STEP_ENABLED=false` — should pass an explicit step with
   * `enabled: false`. See `@/lib/services/pre-booking-resolver`.
   */
  preBookingStep?: PreBookingStep
}

export function buildSystemPrompt({
  brandName,
  bookingUrl,
  isReturningContact,
  priorSummaries,
  contactContext,
  leadSourceContext,
  postEmailBehavior,
  preBookingStep = DEFAULT_PRE_BOOKING_STEP,
}: BuildSystemPromptOptions): string {
  const sections = [
    buildPersona(brandName),
    buildCompanyContext(brandName),
    buildLocationGate(brandName),
    buildQualificationCriteria(),
    buildObjectionHandling(brandName),
    postEmailBehavior
      ? buildEmailCapture(bookingUrl, postEmailBehavior)
      : buildEmailCapture(bookingUrl),
    buildDecisionRouting(bookingUrl, preBookingStep),
    buildSummaryGeneration(),
    buildMessageConstraints(bookingUrl),
  ]

  if (isReturningContact && priorSummaries?.length) {
    sections.push(buildReturningContactSection(priorSummaries))
  }

  if (contactContext) {
    sections.push(buildContactContextSection(contactContext))
  }

  if (leadSourceContext) {
    sections.push(buildLeadSourceContextSection(leadSourceContext))
  }

  return `[${PROMPT_VERSION}]\n\n${sections.join('\n\n')}`
}

function buildLeadSourceContextSection(ctx: LeadSourceContext): string {
  const lines = [
    '## Lead Source Context (private operator context)',
    'Use this to interpret intent and route the conversation. Do not quote raw tags, variables, IDs, source keys, ad IDs, or URLs to the prospect.',
  ]

  if (ctx.label) lines.push(`Source label: ${ctx.label}`)
  if (ctx.channel) lines.push(`Channel: ${ctx.channel}`)
  if (ctx.campaign) lines.push(`Campaign: ${ctx.campaign}`)
  if (ctx.material) lines.push(`Material: ${ctx.material}`)
  if (ctx.entryAction) lines.push(`Entry action: ${ctx.entryAction}`)
  if (ctx.triggerLabel) lines.push(`Trigger: ${ctx.triggerLabel}`)

  lines.push(
    'If the prospect sends a short affirmative such as "yes", "yep", "sure", "tell me more", or "interested", treat it as interest in the source material above and continue from that context.'
  )

  return lines.join('\n')
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
