# Pausing the Bot — Runbook

How to silence the InstaSetter bot in production without tearing down the SendPulse or Inro integrations.

---

## When to use

- A team member needs to take over conversations manually and you don't want the bot double-replying.
- Production incident: the bot is sending wrong replies and you need to stop it **now**.
- Scheduled downtime (e.g. changing flows, rotating credentials, running migrations).

This is a **global** kill switch — it silences the bot for every contact on every channel. There is currently no per-contact pause.

## How it works

- Env var `BOT_ENABLED` on the Vercel production environment.
- **Unset** or `true` → bot runs normally (default).
- `false` → both webhooks (`/api/webhooks/sendpulse` and `/api/webhooks/inro`) short-circuit after schema validation and return `200 { skipped: true, reason: 'bot_paused' }`.
- SendPulse will stop retrying and won't treat it as a webhook failure.

## What happens while paused

- ✅ Incoming webhooks still return 200 (SendPulse/Inro stay happy, no retry storm).
- ❌ No Claude calls, no replies sent, no messages stored in our DB, no contact upserts from these webhooks.
- ❌ No tool events logged (no `qualify_lead`, `generate_summary`, `book_call` etc.).
- ✅ Manual replies sent by the team via SendPulse UI still reach the user (we don't touch SendPulse's own message pipeline).

**Important:** while paused we lose observability of incoming messages in our own DB. If leadership needs continuity of conversation history through a pause window, don't use the global kill — use SendPulse's native pause per contact instead (see "Alternatives" below).

## Pause the bot

```bash
printf '%s' 'false' | vercel env add BOT_ENABLED production --scope aimanagingservices
vercel deploy --prod --scope aimanagingservices
```

**Why `printf` not `echo`:** `echo` appends a trailing newline that Vercel stores as part of the value, breaking the string match. Always use `printf '%s'`.

**Verify it's live:**

```bash
vercel env ls production --scope aimanagingservices | grep BOT_ENABLED
```

Then tail logs and confirm incoming webhooks return `skipped: 'bot_paused'`:

```bash
vercel logs --scope aimanagingservices | grep bot_paused
```

## Resume the bot

```bash
vercel env rm BOT_ENABLED production --scope aimanagingservices -y
vercel deploy --prod --scope aimanagingservices
```

Or set the value to anything other than the literal string `false`:

```bash
printf '%s' 'true' | vercel env add BOT_ENABLED production --scope aimanagingservices
vercel deploy --prod --scope aimanagingservices
```

## Verification after resume

Send a test DM to the connected Instagram account. Confirm:

1. `vercel logs` shows the webhook hit and processed normally (no `bot_paused`).
2. The bot replies within ~10 seconds.
3. A row appears in `messages` table in Supabase for the incoming message + assistant reply.

## Caveats

- **Env var changes only take effect on new deployments.** Always `vercel deploy --prod` after touching the var.
- **Trailing newline trap.** After every `vercel env pull`, re-check `.env.local` for literal `\n` on the `BOT_ENABLED` line and strip it if present.
- **Default is enabled.** Absence of the var means the bot runs. Don't rely on "unset" to mean paused.
- **This does not stop SendPulse's own autoflows** — if flows are configured inside SendPulse directly, they keep running. Pause those in the SendPulse dashboard if needed (Bot Settings → Flows → disable).

## Alternatives (not yet implemented)

For fine-grained, per-contact pause (rather than stopping all traffic), see the options in [bot-pause-research.md](bot-pause-research.md). Leadership direction pending.

## Code pointers

- Kill switch: [src/lib/config.ts — isBotEnabled()](../src/lib/config.ts)
- SendPulse short-circuit: [src/app/api/webhooks/sendpulse/route.ts](../src/app/api/webhooks/sendpulse/route.ts)
- Inro short-circuit: [src/app/api/webhooks/inro/route.ts](../src/app/api/webhooks/inro/route.ts)
- Tests: each route's `__tests__/route.test.ts`
