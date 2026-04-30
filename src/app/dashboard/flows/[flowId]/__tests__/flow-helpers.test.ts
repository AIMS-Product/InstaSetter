import { describe, expect, it } from 'vitest'

import {
  FLOW_BUILDER_LABELS,
  getBlockDisplayLabel,
} from '@/lib/dashboard/flow-builder-labels'
import {
  DEFAULT_FLOW_BOOKING_URL,
  KNOWN_FLOWS,
  isKnownFlowId,
  resolveFlowBookingUrl,
  resolveFlowBrand,
} from '../flow-config'
import {
  BLOCK_BY_TYPE,
  BLOCK_CATALOG,
  blockColor,
  blockInk,
  blockTint,
} from '../shared-data'
import { buildInitialFlow } from '../store'
import { BLOCK_TYPES, type BlockType } from '../types'
import {
  diffFlowDraft,
  extractPersistedFlowDraft,
  isSuspectFlowDraft,
  normalizePersistedFlowDraft,
  type PersistedFlowDraft,
} from '../draft-persistence'
import { DEFAULT_POST_EMAIL_BEHAVIOR } from '@/lib/prompts/post-email-behavior'
import type { EmailConfig, Flow, FlowNode, Variable } from '../types'

const baseNode: FlowNode = {
  id: 'opening',
  type: 'opening',
  name: 'Opening',
  goal: 'Start the conversation',
  guidance: 'Ask where the prospect is located.',
  examples: [],
  captures: [],
  branches: [],
  pos: { x: 0, y: 0 },
}

const baseFlow: Flow = {
  id: 'lg-organic-dm',
  brand: 'VendingPreneurs',
  name: 'Organic DM',
  channel: 'instagram',
  draft: 4,
  published: 3,
  nodes: [baseNode],
}

const emailNode: FlowNode = {
  ...baseNode,
  id: 'email',
  type: 'email',
  name: 'Email Capture',
  blockConfig: {
    kind: 'email',
    triggers: [],
    confirmationScript: DEFAULT_POST_EMAIL_BEHAVIOR.confirmationMessage,
    postEmailBehavior: DEFAULT_POST_EMAIL_BEHAVIOR,
    hesitationScript: 'No spam, just the details we talked about.',
  } satisfies EmailConfig,
}

function persistedDraft(overrides: Partial<PersistedFlowDraft> = {}) {
  return {
    flow: baseFlow,
    triggers: [],
    bot: {
      name: 'Ava',
      persona: 'Peer mentor',
      messageConstraints: 'Two sentences max',
      forbiddenPhrases: [],
    },
    variables: [],
    versions: [],
    publishedVersion: 3,
    draftVersion: 4,
    dirtySincePublish: false,
    ...overrides,
  } satisfies PersistedFlowDraft
}

describe('flow config helpers', () => {
  it('uses the default booking URL for missing, blank, or invalid input', () => {
    expect(resolveFlowBookingUrl(undefined)).toBe(DEFAULT_FLOW_BOOKING_URL)
    expect(resolveFlowBookingUrl('   ')).toBe(DEFAULT_FLOW_BOOKING_URL)
    expect(resolveFlowBookingUrl('not a url')).toBe(DEFAULT_FLOW_BOOKING_URL)
  })

  it('trims and normalizes a valid booking URL', () => {
    expect(resolveFlowBookingUrl(' https://example.com/book?slot=1 ')).toBe(
      'https://example.com/book?slot=1'
    )
  })

  it('trims the flow brand and falls back to VendingPreneurs', () => {
    expect(resolveFlowBrand('  Modern Amenities  ')).toBe('Modern Amenities')
    expect(resolveFlowBrand('   ')).toBe('VendingPreneurs')
    expect(resolveFlowBrand(undefined)).toBe('VendingPreneurs')
  })

  it('guards flow routes to configured ids only', () => {
    expect(KNOWN_FLOWS.map((flow) => flow.id)).toEqual(['ig-organic-dm'])
    expect(isKnownFlowId('ig-organic-dm')).toBe(true)
    expect(isKnownFlowId('garbage-id')).toBe(false)
  })
})

describe('block catalog helpers', () => {
  it('indexes every catalog entry by its block type', () => {
    expect(Object.keys(BLOCK_BY_TYPE).sort()).toEqual(
      BLOCK_CATALOG.map((block) => block.type).sort()
    )
    // BLOCK_BY_TYPE.label feeds the compiled prompt directive (asserted byte-
    // for-byte by compile-block.contract.test.ts) — never coupled to operator
    // display copy.
    expect(BLOCK_BY_TYPE.booking).toEqual(
      expect.objectContaining({
        label: 'Booking',
      })
    )
    // Display blurbs come from the operator-facing flow-builder-labels catalog.
    expect(BLOCK_BY_TYPE.booking.blurb).toBe(
      FLOW_BUILDER_LABELS.blocks.booking.blurb
    )
  })

  it('builds OKLCH colors from catalog hues and respects custom lightness/chroma', () => {
    expect(blockColor('booking')).toBe('oklch(0.68 0.12 152)')
    expect(blockColor('booking', { l: 0.5, c: 0.08 })).toBe(
      'oklch(0.5 0.08 152)'
    )
    expect(blockTint('summary')).toBe('oklch(0.97 0.022 260)')
    expect(blockInk('opening')).toBe('oklch(0.38 0.09 18)')
  })
})

describe('flow node display labels', () => {
  // BLOCK_LABELS in store.tsx seeds FlowNode.name, which is shown in the
  // canvas, inspector header, palette, and route selector. It must read from
  // the operator-facing flow-builder-labels catalog so a marketer never sees
  // engineering vocabulary like "Booking Handoff" or "Objection Handler".
  it('seeds FlowNode.name from FLOW_BUILDER_LABELS for every block type', () => {
    const flow = buildInitialFlow('VendingPreneurs')
    const namesByType = new Map<BlockType, string>(
      flow.nodes.map((node) => [node.type, node.name])
    )
    for (const type of BLOCK_TYPES) {
      expect(namesByType.get(type)).toBe(getBlockDisplayLabel(type))
    }
  })
})

describe('draft persistence helpers', () => {
  it('extracts only the persisted draft fields', () => {
    const source = {
      ...persistedDraft(),
      selectedId: 'opening',
      paletteOpen: true,
    }

    expect(extractPersistedFlowDraft(source)).toEqual(persistedDraft())
  })

  it('preserves email post-email behavior in persisted drafts', () => {
    const customConfirmation = "Got it, I've saved that email."
    const draft = persistedDraft({
      flow: {
        ...baseFlow,
        nodes: [
          {
            ...emailNode,
            blockConfig: {
              ...(emailNode.blockConfig as EmailConfig),
              kind: 'email',
              postEmailBehavior: {
                ...DEFAULT_POST_EMAIL_BEHAVIOR,
                confirmationMessage: customConfirmation,
              },
            },
          },
        ],
      },
    })

    const persisted = extractPersistedFlowDraft(draft)
    const email = persisted.flow.nodes.find((node) => node.id === 'email')

    expect(email?.blockConfig?.kind).toBe('email')
    if (email?.blockConfig?.kind === 'email') {
      expect(email.blockConfig.postEmailBehavior.confirmationMessage).toBe(
        customConfirmation
      )
    }
  })

  it('backfills default post-email behavior for older email drafts', () => {
    const legacyEmailNode = {
      ...emailNode,
      blockConfig: {
        kind: 'email',
        triggers: [],
        confirmationScript: 'Legacy confirmation script',
        hesitationScript: 'No spam.',
      },
    } as unknown as FlowNode
    const normalized = normalizePersistedFlowDraft({
      flow: { ...baseFlow, nodes: [legacyEmailNode] },
    })
    const email = normalized.flow?.nodes.find((node) => node.id === 'email')

    expect(email?.blockConfig?.kind).toBe('email')
    if (email?.blockConfig?.kind === 'email') {
      expect(email.blockConfig.postEmailBehavior).toEqual(
        DEFAULT_POST_EMAIL_BEHAVIOR
      )
    }
  })

  it('backfills default email template for drafts with legacy post-email behavior', () => {
    const legacyEmailNode = {
      ...emailNode,
      blockConfig: {
        ...(emailNode.blockConfig as EmailConfig),
        kind: 'email',
        postEmailBehavior: {
          confirmationMessage: "Got it, I've saved that email.",
          deliveryMode: 'manual',
          resourceLabel: null,
          nextStep: 'human_review',
        },
      },
    } as unknown as FlowNode
    const normalized = normalizePersistedFlowDraft({
      flow: { ...baseFlow, nodes: [legacyEmailNode] },
    })
    const email = normalized.flow?.nodes.find((node) => node.id === 'email')

    expect(email?.blockConfig?.kind).toBe('email')
    if (email?.blockConfig?.kind === 'email') {
      expect(email.blockConfig.postEmailBehavior.confirmationMessage).toBe(
        "Got it, I've saved that email."
      )
      expect(email.blockConfig.postEmailBehavior.emailTemplate).toEqual(
        DEFAULT_POST_EMAIL_BEHAVIOR.emailTemplate
      )
    }
  })

  it('strips bot-level guardrails from current flow and version snapshots', () => {
    const withGuardrails: Flow = {
      ...baseFlow,
      nodes: [
        {
          ...baseNode,
          guardrails: [
            {
              id: 'global',
              text: 'Never send raw automation text',
              why: 'Universal DM rule',
              source: 'src/lib/prompts/sections/message-constraints.ts',
            },
            {
              id: 'local',
              text: 'Always ask location first',
              why: 'Opening-specific rule',
              source: 'src/lib/prompts/sections/location-gate.ts',
            },
          ],
        },
      ],
    }

    const normalized = normalizePersistedFlowDraft({
      flow: withGuardrails,
      versions: [
        {
          v: 3,
          at: '2026-04-24T00:00:00.000Z',
          status: 'live',
          snapshot: {
            flow: withGuardrails,
            triggers: [],
            bot: persistedDraft().bot,
            variables: [],
          },
        },
      ],
    })

    expect(normalized.flow?.nodes[0]?.guardrails).toEqual([
      expect.objectContaining({ id: 'local' }),
    ])
    expect(
      normalized.versions?.[0]?.snapshot.flow.nodes[0]?.guardrails
    ).toEqual([expect.objectContaining({ id: 'local' })])
  })

  it('keeps nodes by reference when no global guardrails are present', () => {
    const localOnly = {
      ...baseNode,
      guardrails: [
        {
          id: 'local',
          text: 'Always ask location first',
          why: 'Opening-specific rule',
          source: 'src/lib/prompts/sections/location-gate.ts',
        },
      ],
    }
    const flow = { ...baseFlow, nodes: [localOnly] }

    const normalized = normalizePersistedFlowDraft({ flow })

    expect(normalized.flow?.nodes[0]).toBe(localOnly)
  })

  it('flags old prototype drafts by bot name, contact variable, brand, or Dallas guidance', () => {
    const dallasVariable = {
      scope: 'contact',
      key: 'city',
      value: 'Dallas',
      kind: 'text',
    } satisfies Variable

    expect(
      isSuspectFlowDraft(
        { bot: { ...persistedDraft().bot, name: 'Mike' } },
        { brand: 'VendingPreneurs' }
      )
    ).toBe(true)
    expect(
      isSuspectFlowDraft(
        { variables: [dallasVariable] },
        { brand: 'VendingPreneurs' }
      )
    ).toBe(true)
    expect(
      isSuspectFlowDraft(
        { flow: { ...baseFlow, brand: 'Other' } },
        { brand: 'VendingPreneurs' }
      )
    ).toBe(true)
    expect(
      isSuspectFlowDraft(
        {
          flow: {
            ...baseFlow,
            nodes: [{ ...baseNode, guidance: 'Mention Dallas' }],
          },
        },
        { brand: 'VendingPreneurs' }
      )
    ).toBe(true)
  })

  it('does not flag a clean current draft', () => {
    expect(
      isSuspectFlowDraft(persistedDraft(), { brand: 'VendingPreneurs' })
    ).toBe(false)
  })
})

describe('diffFlowDraft', () => {
  it('returns an empty list for identical drafts', () => {
    const a = persistedDraft()
    expect(diffFlowDraft(a, a)).toEqual([])
  })

  it('detects changes to bot.persona', () => {
    const a = persistedDraft()
    const b = persistedDraft({
      bot: { ...a.bot, persona: 'New voice' },
    })
    expect(diffFlowDraft(a, b)).toContain('bot.persona')
  })

  it('detects changes to email post-email confirmation copy', () => {
    const baseFlowWithEmail: Flow = {
      ...baseFlow,
      nodes: [emailNode],
    }
    const a = persistedDraft({ flow: baseFlowWithEmail })
    const b = persistedDraft({
      flow: {
        ...baseFlowWithEmail,
        nodes: [
          {
            ...emailNode,
            blockConfig: {
              ...(emailNode.blockConfig as EmailConfig),
              kind: 'email',
              postEmailBehavior: {
                ...DEFAULT_POST_EMAIL_BEHAVIOR,
                confirmationMessage: 'A new confirmation line.',
              },
            },
          },
        ],
      },
    })
    const changes = diffFlowDraft(a, b)
    expect(
      changes.some((path) =>
        path.startsWith('flow.nodes.email.blockConfig.postEmailBehavior')
      )
    ).toBe(true)
  })

  it('keys nodes by id so reordering does not show every node as dirty', () => {
    const flowA: Flow = {
      ...baseFlow,
      nodes: [
        { ...baseNode },
        { ...baseNode, id: 'qualifier', type: 'qualifier' },
      ],
    }
    const flowB: Flow = {
      ...baseFlow,
      nodes: [
        { ...baseNode, id: 'qualifier', type: 'qualifier' },
        { ...baseNode },
      ],
    }
    const a = persistedDraft({ flow: flowA })
    const b = persistedDraft({ flow: flowB })
    expect(diffFlowDraft(a, b)).toEqual([])
  })
})
