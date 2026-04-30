# P1.04 — Brand Guardrails (Forbidden Phrases v0) — Progress

**Spec:** `plans/dm-setter-roadmap/p1-trust-conversation/04-forbidden-phrases.md`
**Branch:** `feat/p1-04-forbidden-phrases`
**PR target:** `feat/sofia-roadmap`

## Status

- [x] Spec read end-to-end
- [x] Tracking scaffolding (progress.md + qa-review.md)
- [x] RED: schema + builder tests (`brand-guardrails.test.ts`, 20 tests)
- [x] GREEN: `src/lib/prompts/brand-guardrails.ts`
- [x] RED: setter-v2 tests (4 new tests covering empty/populated and placement)
- [x] GREEN: setter-v2 threading
- [x] RED: compile-block contract tests (2 new tests — sandbox directive + empty-list omission)
- [x] GREEN: compile-block + schema extension (`appendBrandGuardrailLines`, `BlockOverridesSchema.brandGuardrails`)
- [x] Types extended (`types.ts` re-exports `BrandGuardrail`)
- [x] Draft persistence: `BotSettings.brandGuardrails`, normalizer with backfill + drop-invalid (3 new tests)
- [x] Panel `block-panels/guardrails.tsx` + 8 tests (RTL)
- [x] Wired into Bot tab (`page-bot.tsx`); deviates from canvas-node placement per spec's recommended Bot-tab placement
- [x] config flag `LIVE_BRAND_GUARDRAILS_ENABLED` (default true) + resolver `brand-guardrails-resolver.ts` (3 tests)
- [x] engine integration (`processMessage` calls `resolveLiveBrandGuardrails(BRAND_NAME)`); 2 new tests
- [x] simulator-overrides accepts `brandGuardrails`; wired in `index.tsx`; 2 new tests
- [x] live-verification scenario added to `scripts/test-prompt.ts`: `brand-guardrail-respected`
- [x] lint / type-check / build green
- [x] vitest server-only shim added (`src/test/server-only.shim.ts`) so server-side modules can be unit-tested under jsdom
- [ ] commit + push + PR

## Notes

- Default `brandGuardrails: []` MUST keep `compileBlock` byte-identical to today.
- Section placed in `setter-v2.ts` between `buildPersona` and `buildCompanyContext`.
- Live wiring gated by `LIVE_BRAND_GUARDRAILS_ENABLED` (default `true`); empty list is a no-op so this is safe-by-default.
- Hardcoded persona forbidden phrases stay locked in `persona.ts`. Brand guardrails stack on top.
