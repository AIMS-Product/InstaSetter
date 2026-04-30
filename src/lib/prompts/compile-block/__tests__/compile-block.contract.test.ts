import { describe, it, expect, vi } from 'vitest'
import { compileBlock } from '../compile-block'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import { DEFAULT_PRE_BOOKING_STEP } from '@/lib/prompts/pre-booking-step'

const BRAND = 'VendingPreneurs'
const BOOKING_URL = 'https://calendly.com/x'

// `compileBlock` is now async (the stored-asset path resolves a Supabase
// signed URL via `resolveStoredAssetUrl`). The default-config + legacy
// URL paths never call the resolver, so omitting it from CompileBlockInput
// in those tests is intentional — it confirms the resolver is not
// invoked for those code paths.

describe('compileBlock — contract (no overrides)', () => {
  it('matches buildSystemPrompt byte-for-byte without bookingUrl', async () => {
    expect(await compileBlock({ brand: BRAND })).toBe(
      buildSystemPrompt({ brandName: BRAND })
    )
  })

  it('matches buildSystemPrompt byte-for-byte with bookingUrl', async () => {
    expect(await compileBlock({ brand: BRAND, bookingUrl: BOOKING_URL })).toBe(
      buildSystemPrompt({ brandName: BRAND, bookingUrl: BOOKING_URL })
    )
  })

  it('explicit undefined overrides is identical to omitted overrides', async () => {
    expect(
      await compileBlock({
        brand: BRAND,
        bookingUrl: BOOKING_URL,
        overrides: undefined,
      })
    ).toBe(buildSystemPrompt({ brandName: BRAND, bookingUrl: BOOKING_URL }))
  })

  it('includes the default rapport bridge in the baseline (P1.02)', () => {
    const compiled = compileBlock({ brand: BRAND, bookingUrl: BOOKING_URL })
    expect(compiled).toContain(
      '### Rapport Bridge (one message before the link)'
    )
    expect(compiled).toContain(`"${DEFAULT_PRE_BOOKING_STEP.question}"`)
  })
})

describe('compileBlock — active block directive (no overrides)', () => {
  it('appends a directive section to the baseline prompt', async () => {
    const baseline = buildSystemPrompt({ brandName: BRAND })
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled.startsWith(baseline)).toBe(true)
    expect(compiled).toContain('## Active Block Directive')
    expect(compiled).toContain('Block: Opening')
  })

  it('appends the directive as a stable suffix with heading spacing', async () => {
    const baseline = buildSystemPrompt({ brandName: BRAND })
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    const directive = compiled.slice(baseline.length)

    expect(directive).toBe(
      '\n\n## Active Block Directive\n\n' +
        'Block: Opening\n' +
        'Goal: Greet warmly, detect initial interest, and ask for location as the first qualifier.\n' +
        "Guidance: Match the prospect's energy. Don't interrogate. Ask ONE question — start with area. Run the location gate BEFORE qualification.\n"
    )
  })

  it('uses the default opening goal verbatim', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled).toContain(
      'Greet warmly, detect initial interest, and ask for location as the first qualifier.'
    )
  })

  it('uses the default opening guidance verbatim', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled).toContain(
      "Match the prospect's energy. Don't interrogate. Ask ONE question — start with area. Run the location gate BEFORE qualification."
    )
  })

  it('uses qualifier defaults when activeBlockType is qualifier', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'qualifier' },
    })
    expect(compiled).toContain('Block: Questions')
    expect(compiled).toContain(
      'Collect at least two of five qualifiers through natural conversation — location first, budget last.'
    )
  })
})

describe('compileBlock — goal/guidance overrides', () => {
  const DEFAULT_OPENING_GOAL =
    'Greet warmly, detect initial interest, and ask for location'
  const DEFAULT_OPENING_GUIDANCE =
    "Match the prospect's energy. Don't interrogate. Ask ONE question — start with area. Run the location gate BEFORE qualification."

  it('replaces default goal with override.goal', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', goal: 'Ask for city' },
    })
    expect(compiled).toContain('Ask for city')
    expect(compiled).not.toContain(DEFAULT_OPENING_GOAL)
  })

  it('replaces default guidance with override.guidance', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'opening',
        guidance: 'Only one question, peer-to-peer tone.',
      },
    })
    expect(compiled).toContain('Only one question, peer-to-peer tone.')
    expect(compiled).not.toContain(DEFAULT_OPENING_GUIDANCE)
  })

  it('falls back to default goal when override.goal is absent', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled).toContain(DEFAULT_OPENING_GOAL)
  })

  it('falls back to default goal when override.goal is empty string', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', goal: '' },
    })
    expect(compiled).toContain(DEFAULT_OPENING_GOAL)
  })

  it('falls back to default goal when override.goal is only whitespace', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', goal: '   ' },
    })
    expect(compiled).toContain(`Goal: ${DEFAULT_OPENING_GOAL}`)
    expect(compiled).not.toContain('Goal:    ')
  })

  it('falls back to default guidance when override.guidance is empty string', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', guidance: '' },
    })
    expect(compiled).toContain(DEFAULT_OPENING_GUIDANCE)
  })

  it('falls back to default guidance when override.guidance is only whitespace', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', guidance: '   ' },
    })
    expect(compiled).toContain(`Guidance: ${DEFAULT_OPENING_GUIDANCE}`)
    expect(compiled).not.toContain('Guidance:    ')
  })

  it('appends capture overrides when provided', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'booking',
        captures: [{ label: 'Email', variable: 'contact.email' }],
      },
    })
    expect(compiled).toContain('Captures:')
    expect(compiled).toContain('- Email -> contact.email')
  })

  it('appends route overrides when provided', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'booking',
        branches: [
          {
            label: 'Booked',
            when: 'contact.email is set',
            target: 'summary',
          },
        ],
      },
    })
    expect(compiled).toContain('Routes:')
    expect(compiled).toContain('- Booked -> Summary when contact.email is set')
  })

  it('appends ambient trigger overrides when provided', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'followup',
        triggers: [
          {
            name: 'Nudge',
            afterMinutes: 1440,
            cancelOnReply: true,
            mode: 'human_agent_tag',
            target: 'booking',
          },
        ],
      },
    })
    expect(compiled).toContain('Ambient triggers:')
    expect(compiled).toContain(
      '- Nudge: after 1440 minutes, cancel on reply, send with the HUMAN_AGENT tag, then Booking'
    )
  })

  it('marks explicitly empty override arrays as none', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'booking',
        captures: [],
        branches: [],
        triggers: [],
      },
    })

    expect(compiled).toContain('Captures:\n- none')
    expect(compiled).toContain('Routes:\n- none')
    expect(compiled).toContain('Ambient triggers:\n- none')
  })

  it('uses display fallbacks for blank capture and route fields', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'booking',
        captures: [{ label: '', variable: '' }],
        branches: [{ label: '', when: '', target: 'summary' }],
      },
    })

    expect(compiled).toContain('- (unnamed capture) -> (missing variable)')
    expect(compiled).toContain(
      '- (unnamed route) -> Summary when (no condition provided)'
    )
  })

  it('uses trigger display text for non-cancelling triggers', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'followup',
        triggers: [
          {
            name: '',
            afterMinutes: 30,
            cancelOnReply: false,
            mode: 'in_window_only',
            target: 'summary',
          },
        ],
      },
    })

    expect(compiled).toContain(
      '- (unnamed trigger): after 30 minutes, keep running after reply, send only within the 24h window, then Summary'
    )
  })

  it('appends post-email behavior overrides when provided (legacy URL attachment)', async () => {
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'email',
        postEmailBehavior: {
          confirmationMessage: "Got it, I've saved that email.",
          deliveryMode: 'none',
          resourceLabel: null,
          nextStep: 'summary',
          emailTemplate: {
            subject: 'Your vending call prep',
            body: 'Here are the details we discussed.',
            attachment: {
              kind: 'url',
              fileName: 'prep-checklist.pdf',
              url: 'https://assets.example.com/prep-checklist.pdf',
              description: 'Prep checklist PDF',
            },
          },
        },
      },
    })

    expect(compiled).toContain('Post-email behavior:')
    expect(compiled).toContain("Confirmation: Got it, I've saved that email.")
    expect(compiled).toContain('Delivery mode: none')
    expect(compiled).toContain('Email subject: Your vending call prep')
    expect(compiled).toContain(
      '- Attachment: prep-checklist.pdf (https://assets.example.com/prep-checklist.pdf)'
    )
  })

  it('renders the stored-asset variant via the injected resolver and embeds the signed URL', async () => {
    const SIGNED_URL =
      'https://grkpgfphwqsawinsdbtc.supabase.co/storage/v1/object/sign/email-assets/VP/ig/abc/prep-checklist.pdf?token=xyz'
    const resolver = vi.fn().mockResolvedValue(SIGNED_URL)
    const ASSET_ID = '11111111-2222-4333-8444-555555555555'

    const compiled = await compileBlock({
      brand: BRAND,
      resolveStoredAssetUrl: resolver,
      overrides: {
        activeBlockType: 'email',
        postEmailBehavior: {
          confirmationMessage: "Got it, I've saved that email.",
          deliveryMode: 'manual',
          resourceLabel: 'prep-checklist.pdf',
          nextStep: 'summary',
          emailTemplate: {
            subject: 'Your vending call prep',
            body: 'Here are the details we discussed.',
            attachment: {
              kind: 'asset',
              assetId: ASSET_ID,
              fileName: 'prep-checklist.pdf',
              description: null,
            },
          },
        },
      },
    })

    expect(resolver).toHaveBeenCalledWith(ASSET_ID)
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(compiled).toContain(
      `- Attachment: prep-checklist.pdf (${SIGNED_URL})`
    )
    // Make sure the stored-asset rendering still embeds a Supabase signed URL.
    expect(compiled).toMatch(/supabase\.co\/storage\/v1\/object\/sign\//)
  })

  it('falls back to legacy URL rendering for attachments missing kind (back-compat)', async () => {
    // Operator drafts authored before this PR omit `kind`; the schema's
    // `.default('url')` fills it in so the renderer treats it as legacy.
    const compiled = await compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'email',
        postEmailBehavior: {
          confirmationMessage: "Got it, I've saved that email.",
          deliveryMode: 'none',
          resourceLabel: null,
          nextStep: 'summary',
          emailTemplate: {
            subject: 'Subject',
            body: 'Body.',
            attachment: {
              fileName: 'legacy.pdf',
              url: 'https://example.com/legacy.pdf',
              description: null,
              // kind omitted on purpose — schema fills in 'url' default.
            } as unknown as never,
          },
        },
      },
    })

    expect(compiled).toContain(
      '- Attachment: legacy.pdf (https://example.com/legacy.pdf)'
    )
  })
})

describe('compileBlock contract — no overrides matches buildSystemPrompt across all block types', () => {
  const TYPES = [
    'opening',
    'qualifier',
    'objection',
    'booking',
    'email',
    'followup',
    'escalation',
    'summary',
  ] as const
  const URLS = [undefined, 'https://calendly.com/vending'] as const

  // No-overrides path: compileBlock must equal buildSystemPrompt regardless of bookingUrl.
  for (const bookingUrl of URLS) {
    it(`no overrides, bookingUrl=${bookingUrl ?? 'undefined'}`, async () => {
      const baseline = buildSystemPrompt({
        brandName: BRAND,
        ...(bookingUrl ? { bookingUrl } : {}),
      })
      expect(
        await compileBlock({
          brand: BRAND,
          ...(bookingUrl ? { bookingUrl } : {}),
        })
      ).toBe(baseline)
    })
  }

  // activeBlockType path for EVERY block type — the output must START WITH the baseline
  // and contain the directive heading. This locks Issue 3's invariant per type.
  for (const type of TYPES) {
    it(`activeBlockType=${type} preserves baseline prefix and names the block`, async () => {
      const baseline = buildSystemPrompt({ brandName: BRAND })
      const compiled = await compileBlock({
        brand: BRAND,
        overrides: { activeBlockType: type },
      })
      expect(compiled.startsWith(baseline)).toBe(true)
      expect(compiled).toContain('## Active Block Directive')
    })
  }

  it('renders each block label in the directive', async () => {
    const expectedLabels = {
      opening: 'Opening',
      qualifier: 'Questions',
      objection: 'Concerns',
      booking: 'Booking',
      email: 'Email Capture',
      followup: 'Follow-up',
      escalation: 'Human Help',
      summary: 'Summary',
    } as const

    for (const type of TYPES) {
      const compiled = await compileBlock({
        brand: BRAND,
        overrides: { activeBlockType: type },
      })

      expect(compiled).toContain(`Block: ${expectedLabels[type]}`)
    }
  })
})
