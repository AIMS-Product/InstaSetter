// Flow Builder display labels — single source of truth for operator-facing
// copy across the workspace.
//
// Why this file exists
// --------------------
// Marketers (not engineers) edit the Flow Builder. Internal vocabulary like
// "qualifier", "objection handler", "ambient triggers", or "fixed safety
// rules" is dense; the catalog renames every operator-facing string to plain
// English so a non-technical user can answer questions like "where do I
// change the booking link?" without asking the team.
//
// What MUST NOT happen
// --------------------
// - These strings must NEVER reach `compileBlock` or any builder under
//   `src/lib/prompts/`. The compiled prompt has its own labels (see
//   `BLOCK_BY_TYPE.label` in `src/app/dashboard/flows/[flowId]/shared-data.ts`)
//   which are asserted byte-for-byte by `compile-block.contract.test.ts`.
//   Display labels are UI-only.
// - No engineering vocabulary may leak in (file paths, framework slang, week
//   numbers from internal rollout docs). The catalog test enforces this.
//
// Schema is i18n-shaped (key -> string) so a future locale layer can wrap it
// without rewriting callsites. Translation itself is deferred indefinitely.

import type { BlockType } from '@/app/dashboard/flows/[flowId]/types'

export interface LabelEntry {
  /** Operator-facing string. Always present, never empty. */
  display: string
  /** Optional one-sentence tooltip. Max 140 chars. */
  tooltip?: string
}

export interface PageNavEntry extends LabelEntry {
  /** Subtitle rendered under the nav label. */
  description: string
}

export interface BlockEntry extends LabelEntry {
  /** Short blurb shown in the palette drawer next to the block name. */
  blurb: string
}

export type InspectorTabKey = 'design' | 'routing' | 'triggers' | 'data'
export type PageNavKey = 'flow' | 'variables' | 'bot'

export type InspectorFieldKey =
  | 'goal'
  | 'guidance'
  | 'examples'
  | 'marketerExamples'
  | 'captures'
  | 'routesOut'
  | 'routesOutEmpty'
  | 'triggers'
  | 'triggersEmpty'
  | 'memorySaves'
  | 'memoryReads'

export type PanelSectionKey =
  | 'emailCaptureTriggers'
  | 'emailAfterCapture'
  | 'emailToSend'
  | 'emailHesitation'
  | 'bookingMirrorTemplate'
  | 'bookingLinkCopy'
  | 'bookingReengagement'
  | 'escalationTriggers'
  | 'qualifierList'
  | 'qualifierThresholds'
  | 'lockedSafetyRules'
  | 'lockedSafetyRulesNote'
  | 'stepActions'

export interface FlowBuilderLabels {
  pageNav: Record<PageNavKey, PageNavEntry>
  blocks: Record<BlockType, BlockEntry>
  inspectorTabs: Record<InspectorTabKey, LabelEntry>
  inspectorFields: Record<InspectorFieldKey, LabelEntry>
  panelSections: Record<PanelSectionKey, LabelEntry>
}

export const FLOW_BUILDER_LABELS: FlowBuilderLabels = Object.freeze({
  pageNav: {
    flow: {
      display: 'Flow',
      description: 'Edit how the bot replies',
    },
    variables: {
      display: 'Saved details',
      description: 'Brand and contact info the bot remembers',
    },
    bot: {
      display: 'Bot',
      description: 'Voice, safety, never-say list',
    },
  },
  blocks: {
    opening: {
      display: 'Opening',
      blurb: 'First reply when a prospect DMs in',
    },
    qualifier: {
      display: 'Qualifier',
      tooltip: 'Asks for location, motivation, and capital before booking',
      blurb: 'Asks for location, motivation, and capital before booking',
    },
    objection: {
      display: 'Handle objections',
      blurb: 'Acknowledge, probe, then respond to the most common pushbacks',
    },
    booking: {
      display: 'Send the booking link',
      blurb: 'Mirror what is known, ask one more question, then send the link',
    },
    email: {
      display: 'Capture email',
      blurb: 'Pair the email ask with the booking link',
    },
    followup: {
      display: 'Follow up after the call',
      blurb: 'Check in 48h after the call to escalate price',
    },
    escalation: {
      display: 'Escalation',
      blurb: 'Hand off to a human closer when the bot is stuck',
    },
    summary: {
      display: 'Summary',
      blurb: 'End-of-conversation write-up to the lead record',
    },
  },
  inspectorTabs: {
    design: {
      display: 'Reply',
      tooltip:
        "Edit the bot's goal, instructions, and sample replies for this step",
    },
    routing: {
      display: 'Paths',
    },
    triggers: {
      display: 'Follow-ups',
    },
    data: {
      display: 'What this step remembers',
    },
  },
  inspectorFields: {
    goal: {
      display: 'Goal',
      tooltip: 'What this step is trying to achieve in one sentence',
    },
    guidance: {
      display: 'Step instructions',
      tooltip:
        "What to say in this step. The bot's overall voice is set in Bot.",
    },
    examples: {
      display: 'Sample replies',
      tooltip: 'Side-by-side good/bad examples from real conversations',
    },
    marketerExamples: {
      display: 'Your draft examples',
      tooltip: 'Examples you add for this step. Saved with the team draft.',
    },
    captures: {
      display: 'What to save from the reply',
      tooltip:
        "Pieces of info to extract and remember from the prospect's message",
    },
    routesOut: {
      display: 'Where to go next',
      tooltip: 'When this rule matches, the bot moves to that step',
    },
    routesOutEmpty: {
      display: 'No next step yet. Add one, or leave this as the ending.',
    },
    triggers: {
      display: 'Scheduled follow-ups',
      tooltip:
        "Send a message later if the prospect goes quiet. Respects Instagram's 24-hour window.",
    },
    triggersEmpty: {
      display: 'No scheduled follow-ups on this step.',
    },
    memorySaves: {
      display: 'Saved in this step',
    },
    memoryReads: {
      display: 'Used by this step',
      tooltip: "Saved info this step's rules look at",
    },
  },
  panelSections: {
    emailCaptureTriggers: {
      display: 'When to ask for email',
      tooltip: 'Three moments the bot is allowed to ask for an email address',
    },
    emailAfterCapture: {
      display: 'After email is captured',
      tooltip:
        'What the bot says immediately after the prospect gives their email',
    },
    emailToSend: {
      display: 'Email to send',
    },
    emailHesitation: {
      display: 'Hesitation response',
    },
    bookingMirrorTemplate: {
      display: 'Recap before sending the link',
      tooltip:
        'Reflect what is known about the prospect before pasting the booking link',
    },
    bookingLinkCopy: {
      display: 'Booking link copy',
      tooltip: 'What the bot says when sending the link',
    },
    bookingReengagement: {
      display: 'If they go quiet',
      tooltip:
        "Reminder timing if the prospect doesn't respond after the booking link",
    },
    escalationTriggers: {
      display: 'When to escalate',
      tooltip: 'Conditions that hand the conversation to a human closer',
    },
    qualifierList: {
      display: 'Things to learn before booking',
      tooltip:
        "Ordered list. Location is first because it's the highest-rapport opener.",
    },
    qualifierThresholds: {
      display: 'Lead temperature thresholds',
    },
    lockedSafetyRules: {
      display: 'Locked safety rules',
      tooltip:
        'Rules InstaSetter enforces for legal/compliance reasons. Ask James to change.',
    },
    lockedSafetyRulesNote: {
      display: 'locked by InstaSetter',
    },
    stepActions: {
      display: 'Step actions',
    },
  },
})

/**
 * Returns the operator-facing display label for a block type.
 *
 * Distinct from the prompt-side `BLOCK_BY_TYPE[type].label`, which feeds the
 * compiled prompt directive and is asserted byte-for-byte by the compile-block
 * contract test. UI callers should always use this helper.
 */
export function getBlockDisplayLabel(type: BlockType): string {
  return FLOW_BUILDER_LABELS.blocks[type].display
}

/**
 * Returns the operator-facing display label for an inspector tab key.
 */
export function getInspectorTabLabel(key: InspectorTabKey): string {
  return FLOW_BUILDER_LABELS.inspectorTabs[key].display
}

/**
 * Returns the palette blurb for a block type — the one-line description
 * shown next to the block name in the palette drawer.
 */
export function getBlockBlurb(type: BlockType): string {
  return FLOW_BUILDER_LABELS.blocks[type].blurb
}
