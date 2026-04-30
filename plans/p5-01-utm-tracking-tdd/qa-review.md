# P5.01 — UTM-style lead source tracking · QA Review

Manual verification checklist after the agent commits and pushes the branch.

## Prerequisites

- Local Supabase reset (`supabase db reset`) so the new migration runs cleanly.
- Browser logged into the dashboard at `/dashboard/marketing-sources`.

## Migration

- [ ] Run `supabase db reset`. New migration `20260505000000_marketing_sources_utm.sql` applies
      with no errors.
- [ ] `psql` confirms `marketing_sources` has `utm_source`, `utm_medium`, `utm_campaign`,
      `utm_content`, `utm_term`, `ad_set_id`, `landing_page_url`.
- [ ] `psql` confirms `conversation_attributions` has the same seven columns plus `ad_id`.
- [ ] `psql \di idx_conversation_attributions_utm_*` shows two indexes (`utm_source`,
      `utm_campaign`) and `idx_conversation_attributions_ad_*` shows two more (`ad_id`,
      `ad_set_id`).
- [ ] Inserting a row with all UTM fields populated round-trips correctly.

## Lead Sources page (`/dashboard/marketing-sources`)

- [ ] Page loads with no console errors.
- [ ] "UTM tagging (optional)" `<details>` toggle is collapsed by default.
- [ ] Expanding it reveals the five UTM fields + `ad_set_id` + `landing_page_url`.
- [ ] Submitting the form with channel=Instagram, campaign=Free Masterclass,
      utm_source=meta, utm_medium=cpc, utm_campaign=apr_masterclass, utm_content=reel_a creates
      a new source row.
- [ ] The new row's setup card surfaces:
  - Existing variable list (`lead_*` keys).
  - The `src:<source_key>` tag.
  - A new "Instagram deep link" code block with the full
    `ig.me/m/<handle>?ref=<source_key>__utm_source=meta__utm_medium=cpc__…` URL.
  - "Copy link" button copies the URL to the clipboard.
  - "Test on Instagram mobile only — desktop ignores ref tags" caveat is visible.
- [ ] Submitting the form WITHOUT UTM fields still creates the source (legacy mode); the deep
      link block falls back to the `lead_*`-only payload.

## SendPulse webhook end-to-end

- [ ] Send a test webhook with `contact.variables.utm_source=meta`,
      `contact.variables.utm_campaign=apr_masterclass`, plus the existing `lead_*` mirror.
- [ ] `conversation_attributions` row is upserted with both the UTM and lead\_\* fields.
- [ ] Send a webhook with ONLY `lead_*` (no `utm_*`). The fallback path still records the
      attribution; UTM columns are NULL.
- [ ] Send a webhook where the source has UTMs in `marketing_sources` but the webhook payload
      omits them. Persisted UTMs come from the source row.

## Conversation detail (`/dashboard/conversations/<id>`)

- [ ] For a conversation with UTMs, the Lead source card renders a third row showing
      `utm_source · utm_medium · utm_campaign`.
- [ ] For a conversation without UTMs, that line is omitted.

## Prompt safety

- [ ] `npm run test src/lib/prompts/__tests__/setter-v2.test.ts` passes; the new regression
      asserting `prompt` does NOT contain `utm_source` is green.
- [ ] Run `scripts/test-prompt.ts` with a `leadSourceContext` carrying both UTM and legacy
      fields. Captured Claude reply contains zero `utm_*` substrings.

## Tests

- [ ] `npm test` — full suite green (no broken existing tests).
- [ ] `npm run lint` clean.
- [ ] `npm run type-check` clean.
- [ ] `compile-block.contract.test.ts` byte-identical (sacred guard).
