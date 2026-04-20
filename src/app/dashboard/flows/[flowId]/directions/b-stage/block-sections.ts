import { buildCompanyContext } from '@/lib/prompts/sections/company-context'
import { buildDecisionRouting } from '@/lib/prompts/sections/decision-routing'
import { buildEmailCapture } from '@/lib/prompts/sections/email-capture'
import { buildLocationGate } from '@/lib/prompts/sections/location-gate'
import { buildMessageConstraints } from '@/lib/prompts/sections/message-constraints'
import { buildObjectionHandling } from '@/lib/prompts/sections/objections'
import { buildPersona } from '@/lib/prompts/sections/persona'
import { buildQualificationCriteria } from '@/lib/prompts/sections/qualification'
import { buildSummaryGeneration } from '@/lib/prompts/sections/summary-generation'

import type { BlockType } from '../../types'

export interface SectionRationale {
  stat?: string
  insights: string[]
}

export interface PromptSection {
  id: string
  title: string
  source: string
  text: string
  primaryFor?: string
  rationale?: SectionRationale
}

export interface BlockPromptPlan {
  primary: PromptSection[]
  global: PromptSection[]
}

const sections = (brand: string): Record<string, PromptSection> => ({
  persona: {
    id: 'persona',
    title: 'Persona',
    source: 'src/lib/prompts/sections/persona.ts',
    text: buildPersona(brand),
    primaryFor: 'Who the bot is and how it speaks',
    rationale: {
      stat: '3,619 analyzed conversations',
      insights: [
        'Generic affirmations ("Nice man", "Okay smooth") kill rapport',
        'Repeated canned phrases signal automation and erode trust',
        'Peer-mentor tone outperforms salesperson tone 3:1 on bookings',
        'Identity-verification standoffs caused trust collapse in 15+ convos',
      ],
    },
  },
  'company-context': {
    id: 'company-context',
    title: 'Company Context',
    source: 'src/lib/prompts/sections/company-context.ts',
    text: buildCompanyContext(brand),
    primaryFor: 'What the business does and key facts',
    rationale: {
      insights: [
        'Prospects had zero context on pricing, program structure, or team roles',
        'Third-party pricing fraud ($27/$47/$197) created trust breakdowns',
        'Framing masterclass value proactively prevents objections',
        'Prospects arrive algorithm-driven with zero vending knowledge',
      ],
    },
  },
  'location-gate': {
    id: 'location-gate',
    title: 'Location Gate',
    source: 'src/lib/prompts/sections/location-gate.ts',
    text: buildLocationGate(brand),
    primaryFor: 'Hard filter for supported markets (US/CA)',
    rationale: {
      insights: [
        'Only US and Canada are currently supported — no exceptions',
        'Out-of-region prospects must be declined warmly, flagged out_of_area',
        'Runs BEFORE qualification so ineligible leads never reach booking',
      ],
    },
  },
  qualification: {
    id: 'qualification',
    title: 'Qualification Criteria',
    source: 'src/lib/prompts/sections/qualification.ts',
    text: buildQualificationCriteria(),
    primaryFor: 'What to collect and in what order',
    rationale: {
      insights: [
        'Zero qualification attempted in many conversations that died at value delivery',
        'Budget asked before value established killed conversations consistently',
        'Location is the highest-rapport qualifier and easiest entry point',
        'Volunteered hesitations ("money and time") were ignored as signals',
        'Minimum 2 qualifiers before booking link prevents calendar flooding',
      ],
    },
  },
  objections: {
    id: 'objections',
    title: 'Objection Handling',
    source: 'src/lib/prompts/sections/objections.ts',
    text: buildObjectionHandling(brand),
    primaryFor: 'Acknowledge → probe → respond for every objection type',
    rationale: {
      stat: '5,438 classified conversations · 9 objection types · 11-31% resolution',
      insights: [
        'Top three: timing (381×, 23%), no-capital (356×, 22%), location (186×, 12%)',
        'Objections ignored, deflected, or escalated without probing → lost leads',
        'Acknowledge-Probe-Respond structure outperforms all other patterns',
        'Budget questions before value = conversation death',
      ],
    },
  },
  'email-capture': {
    id: 'email-capture',
    title: 'Email Capture',
    source: 'src/lib/prompts/sections/email-capture.ts',
    text: buildEmailCapture(),
    primaryFor: 'When and how to ask for email',
    rationale: {
      stat: '20 emails captured across 5,438 conversations (0.4%)',
      insights: [
        '14+ conversations had zero email request at any point',
        'Post-booking is the highest-acceptance-probability trigger point',
        'Value exchange framing ("prep materials") outperforms bare asks',
        'Explicit confirmation loop validates the data',
      ],
    },
  },
  'decision-routing': {
    id: 'decision-routing',
    title: 'Decision Routing',
    source: 'src/lib/prompts/sections/decision-routing.ts',
    text: buildDecisionRouting(),
    primaryFor:
      'Gates that guard every action (booking, follow-up, escalation)',
    rationale: {
      stat: '2,147 went silent (39.5%)',
      insights: [
        'Systemic failure to re-engage after content delivery',
        'Booking links sent after zero qualification flooded the calendar',
        'No post-call follow-up branch existed — conversations dropped after call',
        'Post-call price objections handled by AI instead of escalated to closer',
        'Premature loop closure — link-send treated as conversation-complete',
      ],
    },
  },
  'summary-generation': {
    id: 'summary-generation',
    title: 'Summary Generation',
    source: 'src/lib/prompts/sections/summary-generation.ts',
    text: buildSummaryGeneration(),
    primaryFor: 'Structured lead data written at end of conversation',
    rationale: {
      insights: [
        'No prospect summaries generated in any historical conversations',
        'Qualification data gathered through rapport was never synthesized',
        'Mirroring back gathered info before booking creates personalized close',
        'Closers received zero context — cold handoff every time',
        'Under-qualified leads hitting the calendar wasted team time',
      ],
    },
  },
  'message-constraints': {
    id: 'message-constraints',
    title: 'Message Constraints',
    source: 'src/lib/prompts/sections/message-constraints.ts',
    text: buildMessageConstraints(),
    primaryFor: 'Format rules: 2 sentences max, no markdown',
    rationale: {
      insights: [
        'Multiple consecutive short messages without waiting for replies (2-4 stacks)',
        'Raw automation text surfaced visibly ("You sent a private reply...")',
        'Bare URLs sent as final messages with no CTA',
        'Top-of-funnel automations fired at post-booking prospects',
        'Identical canned phrases repeated verbatim in the same conversation',
      ],
    },
  },
})

const BLOCK_PRIMARY_SECTIONS: Record<BlockType, string[]> = {
  opening: ['location-gate'],
  qualifier: ['qualification', 'location-gate'],
  objection: ['objections'],
  booking: ['decision-routing', 'email-capture'],
  email: ['email-capture'],
  followup: ['decision-routing'],
  escalation: ['decision-routing'],
  summary: ['summary-generation'],
}

const GLOBAL_IDS = ['persona', 'company-context', 'message-constraints']

export function getBlockPromptPlan(
  brand: string,
  type: BlockType
): BlockPromptPlan {
  const bank = sections(brand)
  const primary = BLOCK_PRIMARY_SECTIONS[type].map((id) => bank[id])
  const global = GLOBAL_IDS.map((id) => bank[id])
  return { primary, global }
}

export function countLines(text: string): number {
  return text.split('\n').length
}
