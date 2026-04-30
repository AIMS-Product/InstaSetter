# P5.01 — UTM-style lead source tracking · Progress

Tracking file for the implementation of `plans/dm-setter-roadmap/p5-attribution/01-utm-tracking.md`.

## Status

In progress.

Branch: `feat/p5-01-utm-tracking`
Migration timestamp: `20260505000000` (Phase 5 reserved block).

## Log

### Setup

- Created branch from `main` (`80d5d98`).
- Read commits `7af70f9` and `2c06e41` to understand existing attribution + source UI.
- Confirmed Phase 5 migration block is unused.

### Schema (RED → GREEN)

- Added migration `supabase/migrations/20260505000000_marketing_sources_utm.sql` extending
  `marketing_sources` and `conversation_attributions` with `utm_*` columns + `ad_set_id` +
  `landing_page_url` + (on attributions only) `ad_id`.
- Added 4 BTREE indexes on `conversation_attributions` for `utm_source`, `utm_campaign`,
  `ad_id`, `ad_set_id`.
- Regenerated `src/types/database.ts` to include the new columns.

### Service layer

- `src/lib/services/instagram-ref-link.ts` — `buildInstagramRefLink()` + `parseInstagramRefLink()`
  using SendPulse's literal `__delim__` separator. Length-guarded at 480 chars to stay below
  Meta's URL cap. Unit tested in `instagram-ref-link.test.ts`.
- `src/lib/services/marketing-attribution.ts` — extended `LeadSourceContext` /
  `NormalizedAttribution` with `utm` + `adSetId` + `landingPageUrl` + `adId`.
  `extractSendPulseAttribution()` reads `utm_*` first, falls back to `lead_*`.
  `persistSendPulseAttribution()` writes UTM fields and the source row's UTMs win when present.
  `generateSourceKey()` accepts an optional UTM block and prefers UTM-driven slugs.
- `src/lib/services/marketing-sources.ts` — `createMarketingSource()` accepts the optional UTM
  payload. `buildSourceSetupValues()` returns `{ tag, variables, refLink }` (refLink built when
  any UTM or `lead_*` value exists).

### UI

- Lead Sources page: collapsed-by-default `<details>` "UTM tagging (optional)" panel with five
  UTM fields + `ad_set_id` + `landing_page_url`.
- `SetupCopyPanel`: renders the `ig.me/m/{handle}?ref=…` deep link with copy button when present,
  plus the "Test on Instagram mobile only" caveat.
- `createMarketingSourceAction` reads + trims the UTM fields.
- Conversation detail: renders `utm_source · utm_medium · utm_campaign` row when present.

### Tests

- `instagram-ref-link.test.ts` (10 cases): full + minimal payloads, special-character escaping,
  SendPulse `__` literal preservation, length guard, builder ↔ parser symmetry.
- `marketing-attribution.test.ts` (existing 11 + 5 new): UTM extraction, fallback to `lead_*`,
  persistence, source-vs-webhook precedence, key precedence.
- `setter-v2.test.ts` (existing 49 + 1 new): regression — `utm_source` substring never in the
  assembled prompt.

### Verification

- `npm run type-check` ✅
- `npm run lint` ✅
- `npm test` — full suite green; the `compile-block.contract.test.ts` is byte-identical (no
  prompt assembly changes were introduced).
