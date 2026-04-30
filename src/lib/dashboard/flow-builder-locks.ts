// Flow Builder lock catalog — single source of truth for which surfaces are
// safety-locked vs admin-locked.
//
// Why this file exists
// --------------------
// Sofia (Apr 29 walkthrough): "Some global rules are locked and some may
// become editable" — operators couldn't tell at a glance which fields were
// permanent compliance gates and which were just not-yet-built editor UI.
// This catalog classifies every locked surface so the LockPill / popover can
// show the right tooltip + escalation path.
//
// Two kinds of lock:
//   - `safety`: enforced for legal/compliance/model-safety reasons. Cannot be
//     edited from the dashboard. No escalation — these are permanent.
//   - `admin`:  currently engineering-only. Could become editable in a future
//     build. The popover surfaces an "Ask James" escalation note.
//
// What MUST NOT happen
// --------------------
// - These strings must NEVER reach `compileBlock` or any builder under
//   `src/lib/prompts/`. The compiled prompt has its own assertions; lock
//   metadata is presentation-only.
// - No engineering vocabulary (file paths, framework slang, week numbers
//   from internal rollout docs) leaks into operator copy. The catalog test
//   enforces this with the same substring ban as the labels catalog.
//
// Future
// ------
// - P4.04 reads this catalog to decide which edits warrant a warning modal.
// - A future task may add `ins_flow_lock_overrides` to allow operators to
//   request promoting an `admin` lock to editable. Until then, the catalog
//   is hand-curated and the "Ask James" escalation is the v0 affordance.

export const LOCK_KINDS = ['safety', 'admin'] as const
export type LockKind = (typeof LOCK_KINDS)[number]

export interface LockEntry {
  /** Stable lookup key, e.g. `qualifier.list`. Used by every callsite. */
  id: string
  /** Why this surface is locked. Drives popover tone + escalation copy. */
  kind: LockKind
  /** Short scope shown in the popover header, e.g. "Qualifier order". */
  surface: string
  /** One-sentence operator-facing explanation. Max 200 chars. */
  tooltip: string
  /** Null for safety locks; "Ask James..." string for admin locks. */
  escalation: string | null
  /** Optional file path for a future "View source" deep-link. */
  sourceHint?: string
}

const ASK_JAMES = 'Ask James in #dm-setter Slack to change this.'

const ENTRIES = [
  {
    id: 'opening.usCanadaGate',
    kind: 'safety',
    surface: 'US/Canada market gate',
    tooltip:
      'Only US and Canada are supported today. Out-of-region prospects are warmly declined before any qualification.',
    escalation: null,
    sourceHint: 'src/lib/prompts/sections/location-gate.ts',
  },
  {
    id: 'opening.outOfAreaScript',
    kind: 'safety',
    surface: 'Out-of-area decline script',
    tooltip:
      'Wording for the warm decline when a prospect is outside the supported markets. Locked so the message stays kind and consistent.',
    escalation: null,
    sourceHint: 'src/lib/prompts/sections/location-gate.ts',
  },
  {
    id: 'qualifier.list',
    kind: 'admin',
    surface: 'Qualifier list',
    tooltip:
      'The set of things to learn before booking. Adding or removing a qualifier needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/qualification.ts',
  },
  {
    id: 'qualifier.order',
    kind: 'admin',
    surface: 'Qualifier order',
    tooltip:
      'The order qualifiers are asked in. Location is first because it builds the most rapport. Reordering needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/qualification.ts',
  },
  {
    id: 'qualifier.thresholds',
    kind: 'admin',
    surface: 'Lead temperature thresholds',
    tooltip:
      'Hot/warm/cold scoring criteria. Adjusting these needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/qualification.ts',
  },
  {
    id: 'objection.handlers',
    kind: 'admin',
    surface: 'Typed objection handlers',
    tooltip:
      'The library of objection types and their openers. Editing these needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/objections.ts',
  },
  {
    id: 'objection.followUps',
    kind: 'admin',
    surface: 'Objection follow-ups',
    tooltip:
      'Per-handler follow-up lines. Editing these needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/objections.ts',
  },
  {
    id: 'objection.structure',
    kind: 'admin',
    surface: 'Objection response structure',
    tooltip:
      'Every objection reply follows acknowledge then probe then respond. Skipping the probe kills conversion.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/objections.ts',
  },
  {
    id: 'booking.linkPattern',
    kind: 'admin',
    surface: 'Booking link pattern',
    tooltip:
      'The URL template the bot pastes when sending the link. Editing the pattern needs an engineering change.',
    escalation: ASK_JAMES,
  },
  {
    id: 'booking.reengagement',
    kind: 'admin',
    surface: 'Booking re-engagement timing',
    tooltip:
      'How long to wait before nudging a prospect who went quiet after the link, plus how many times to send. Tuning needs an engineering change.',
    escalation: ASK_JAMES,
  },
  {
    id: 'email.captureEmailTool',
    kind: 'safety',
    surface: 'capture_email tool firing',
    tooltip:
      'After the prospect gives an email the bot must call the capture tool immediately. This is a compliance rule.',
    escalation: null,
    sourceHint: 'src/lib/prompts/sections/email-capture.ts',
  },
  {
    id: 'email.timingFloor',
    kind: 'safety',
    surface: 'Email-ask timing floor',
    tooltip:
      'The bot is never allowed to ask for an email in the first or second message. This protects the conversation from feeling transactional.',
    escalation: null,
    sourceHint: 'src/lib/prompts/sections/email-capture.ts',
  },
  {
    id: 'email.captureTriggers',
    kind: 'admin',
    surface: 'Email capture trigger windows',
    tooltip:
      'The three moments the bot is allowed to ask for an email. Editing the windows needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/email-capture.ts',
  },
  {
    id: 'escalation.requiredTriggers',
    kind: 'admin',
    surface: 'Escalation triggers',
    tooltip:
      'The conditions that hand the conversation to a human closer. Editing the triggers needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/decision-routing.ts',
  },
  {
    id: 'escalation.captureMethod',
    kind: 'safety',
    surface: 'Human handoff tag',
    tooltip:
      'Hand-offs to a human closer use the HUMAN_AGENT tag. The tag itself is fixed for compliance reasons.',
    escalation: null,
    sourceHint: 'src/lib/prompts/sections/decision-routing.ts',
  },
  {
    id: 'summary.requiredFields',
    kind: 'admin',
    surface: 'Summary required fields',
    tooltip:
      'Fields every generate_summary call must include. Editing this list needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/summary-generation.ts',
  },
  {
    id: 'summary.triggerWords',
    kind: 'admin',
    surface: 'Summary trigger words',
    tooltip:
      'If the prospect uses any of these the bot must call generate_summary. Editing this list needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/summary-generation.ts',
  },
  {
    id: 'followup.timing',
    kind: 'admin',
    surface: 'Follow-up delay',
    tooltip:
      'How many hours after the call before the post-call follow-up fires. Tuning needs an engineering change.',
    escalation: ASK_JAMES,
  },
  {
    id: 'followup.outcomes',
    kind: 'admin',
    surface: 'Follow-up branch outcomes',
    tooltip:
      'How the bot reads the follow-up reply. One touch only, then let it rest. Tuning needs an engineering change.',
    escalation: ASK_JAMES,
  },
  // NOTE for Sofia: persona body is currently classified `admin` — operators
  // may eventually be allowed to edit voice copy. The nameless rule is a
  // separate `safety` lock since it's a hard product invariant.
  {
    id: 'bot.persona.body',
    kind: 'admin',
    surface: 'Persona body',
    tooltip:
      'The full voice and tone guide for the bot. Editing the body needs an engineering change today.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/persona.ts',
  },
  {
    id: 'bot.persona.namelessRule',
    kind: 'safety',
    surface: 'No-name rule',
    tooltip:
      'The bot must never state a name. The Instagram account is a shared team inbox.',
    escalation: null,
    sourceHint: 'src/lib/prompts/sections/persona.ts',
  },
  {
    id: 'bot.messageConstraints',
    kind: 'admin',
    surface: 'Message constraints',
    tooltip:
      'Word counts and formatting limits the bot follows. Tuning needs an engineering change.',
    escalation: ASK_JAMES,
    sourceHint: 'src/lib/prompts/sections/message-constraints.ts',
  },
  {
    id: 'guardrails.global',
    kind: 'safety',
    surface: 'Global safety rules',
    tooltip:
      'Rules that apply across every conversation. Locked for legal and compliance reasons.',
    escalation: null,
  },
] as const satisfies readonly LockEntry[]

type EntryId = (typeof ENTRIES)[number]['id']

export type LockId = EntryId

function buildCatalog(): Record<EntryId, LockEntry> {
  const out = {} as Record<string, LockEntry>
  for (const raw of ENTRIES) {
    out[raw.id] = raw as LockEntry
  }
  return Object.freeze(out) as Record<EntryId, LockEntry>
}

export const FLOW_BUILDER_LOCKS: Readonly<Record<LockId, LockEntry>> =
  buildCatalog()

const SOURCE_HINT_INDEX: Map<string, LockEntry> = new Map()
for (const raw of ENTRIES) {
  const entry = raw as LockEntry
  if (entry.sourceHint) {
    SOURCE_HINT_INDEX.set(entry.sourceHint, entry)
  }
}

/**
 * Returns the catalog entry for `id`. Throws if the id is unknown — every
 * caller is expected to pass a literal `LockId` so a typo surfaces at type
 * check, not at runtime.
 */
export function getLock(id: LockId): LockEntry {
  const entry = FLOW_BUILDER_LOCKS[id]
  if (!entry) {
    throw new Error(`Unknown lock id: ${id}`)
  }
  return entry
}

/**
 * Resolves a Guardrail.source path to a catalog entry by exact match.
 * Returns `undefined` when the source path is not registered. Used by the
 * guardrails panel to render per-row lock metadata without hand-mapping.
 */
export function getLockBySourceHint(source: string): LockEntry | undefined {
  return SOURCE_HINT_INDEX.get(source)
}
