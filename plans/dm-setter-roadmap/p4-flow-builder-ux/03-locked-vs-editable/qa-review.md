# P4.03 — Locked vs editable rule indicators · QA checklist

Manual verification steps for a marketer (Sofia) walking the workspace at
`/dashboard/flows/ig-organic-dm`. Run the dev server (`npm run dev`) and
work through each block.

## LockPill catalog wiring (every block)

- [ ] Open the **Opening** block. The `Supported markets` card title row
      shows a grey `LOCKED` pill. The inline pill next to the markets list
      also reads `LOCKED`. Click either: a popover opens with the surface
      name (`US/Canada market gate`) and the safety-lock tooltip. No
      "Ask James" line.
- [ ] In the same block, the `Out-of-area decline script` card has a grey
      `LOCKED` pill. Click → popover shows `Out-of-area decline script`
      surface, no escalation.

## Admin locks render amber

- [ ] Open the **Qualifier** block. The `Things to learn before booking`
      card shows an amber `LOCKED (ADMIN)` pill. Click → popover shows the
      surface (`Qualifier list`), the tooltip explains why, and a yellow
      "Ask James in #dm-setter Slack…" panel is visible.
- [ ] In the same block, the entry tagged `q.locked` shows an amber pill
      reading `LOCKED (ADMIN)`. Click → surface reads `Qualifier order`.
- [ ] The `Lead temperature thresholds` card shows another amber pill
      with surface `Lead temperature thresholds`.

## Mixed kinds in one panel

- [ ] Open the **Email capture** block. The `When to ask for email` card
      shows two pills:
  - title-row amber `LOCKED (ADMIN)` (catalog `email.captureTriggers`)
  - action-slot grey `LOCKED` (catalog `email.timingFloor`)
- [ ] Click the timing-floor pill → popover surface is
      `Email-ask timing floor`, no escalation (safety lock).
- [ ] Scroll to the hesitation-response card. Inline pill is grey,
      surface `capture_email tool firing`, no escalation.

## Escalation, summary, follow-up

- [ ] Open **Send the booking link** (booking). The `Booking link copy`
      card shows amber pill `Booking link pattern`. The
      `If they go quiet` card shows amber pill `Booking re-engagement timing`.
      The reminder-script footer pill matches.
- [ ] Open **Escalation**. The `When to escalate` card is amber
      (`Escalation triggers`). The `Capture method` card has a grey pill
      (`Human handoff tag`, safety lock).
- [ ] Open **Summary**. `Required fields · N` is amber
      (`Summary required fields`). The trigger-words footer pill is amber
      (`Summary trigger words`).
- [ ] Open **Follow up after the call**. `Timing` card is amber
      (`Follow-up delay`). Branch-outcomes footer pill is amber
      (`Follow-up branch outcomes`).

## Guardrails drawer

- [ ] Inside the inspector, expand the `Locked safety rules · N` drawer.
      The trailing element is now a clickable grey `LOCKED` pill referencing
      `Global safety rules`. Disclosure button still toggles the list.
- [ ] Inside the list, any guardrail parsed from
      `message-constraints.ts` shows an amber `LOCKED (ADMIN)` pill with
      escalation `Ask James…`. Persona-derived guardrails (no admin map yet)
      show no extra pill — this is intentional (their lock id is the
      page-bot persona section, not the per-row guardrail).

## Bot page (persona drawer)

- [ ] Open the **Bot** page. The `Identity` persona section shows a
      grey `LOCKED` pill (catalog `bot.persona.namelessRule`). Click →
      popover surface is `No-name rule`, tooltip explains the IG-account
      shared-inbox rationale.
- [ ] The `Message Length` section shows an amber `LOCKED (ADMIN)` pill
      (`Message constraints`). Click → escalation visible.
- [ ] Other locked sections (Voice, Forbidden Phrases, Off-Topic) show
      an amber pill (`Persona body`) with escalation. Editable sections
      retain the small accent `Editable` chip — no change.

## Popover behaviour

- [ ] Click any LockPill → popover opens, focus moves into the popover
      (Close button receives focus).
- [ ] Press `Escape` → popover closes, focus returns to the trigger pill.
- [ ] Click outside the popover (anywhere on the page that isn't the
      trigger or popover) → popover closes.
- [ ] Tab order inside the popover wraps: only the Close button receives
      Tab focus.
- [ ] Hovering the pill (without clicking) still surfaces the same
      tooltip via the native `title` attribute.

## A11y / keyboard

- [ ] Tab into the inspector, press Enter on a LockPill → popover opens,
      focus inside.
- [ ] Screen reader announces the pill as `Locked: <surface>` for safety
      locks and `Locked (admin): <surface>` for admin locks.
- [ ] Popover header announces `Why this is locked` (visually-hidden
      inside the popover layout — verify with VoiceOver / NVDA if possible).

## Visual / design

- [ ] Pills are small enough not to crowd the existing `Mandatory` orange
      pill on email triggers — both fit on the same row at 1280px width.
- [ ] Amber treatment uses `#FFF4D9` background + `#7A4B00` ink — light,
      matches the existing "No automatic delivery is live" warning.
- [ ] Popover uses `#FFFFFF` background + `#E5E6EC` border + Linear-style
      shadow. No dark theme anywhere.

## Cross-checks

- [ ] `npm run lint` clean (0 errors).
- [ ] `npm run type-check` clean.
- [ ] `npm run build` succeeds.
- [ ] `npx vitest run` → all tests pass (451+ from baseline).
- [ ] `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
      → all green (lock metadata never reaches the prompt).

## Sofia rubric

- [ ] Did anything feel risky to edit? — every locked surface explains
      _why_ it's locked and what to do (admin) or that it's permanent
      (safety).
- [ ] Did the tooltip language make sense? — no engineering jargon, no
      file paths, no week-N labels.
- [ ] Was the difference between safety and admin obvious? — grey pill
      vs amber pill is the primary cue; popover reinforces with the kind
      badge.
