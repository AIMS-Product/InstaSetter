import { buildPersona } from './sections/persona'
import { buildCompanyContext } from './sections/company-context'
import { buildQualificationCriteria } from './sections/qualification'
import { buildObjectionHandling } from './sections/objections'
import { buildEmailCapture } from './sections/email-capture'
import { buildDecisionRouting } from './sections/decision-routing'
import { buildSummaryGeneration } from './sections/summary-generation'
import { buildMessageConstraints } from './sections/message-constraints'

const PROMPT_VERSION = 'setter-v2'

interface BuildSystemPromptOptions {
  brandName: string
  isReturningContact?: boolean
  priorSummaries?: string[]
}

export function buildSystemPrompt({
  brandName,
  isReturningContact,
  priorSummaries,
}: BuildSystemPromptOptions): string {
  const sections = [
    buildPersona(brandName),
    buildCompanyContext(brandName),
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

  return `[${PROMPT_VERSION}]\n\n${sections.join('\n\n')}`
}

function buildReturningContactSection(priorSummaries: string[]): string {
  const summaryList = priorSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')

  return `## Returning Contact
This is a returning contact. Reference prior conversation context naturally — do not repeat qualification questions already answered. Pick up where you left off.

Prior conversation summaries:
${summaryList}`
}
