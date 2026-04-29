import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

// Split server env into independent slices so a missing var in one slice does
// not break routes that don't need it. Before: listConversations() transitively
// called getServerConfig() via the service-role client and threw on a missing
// ANTHROPIC_API_KEY — a read that never touches Anthropic. Each getter below
// validates only what its callers actually require.
const supabaseServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

const anthropicEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
})

const brandEnvSchema = z.object({
  BRAND_NAME: z.string().min(1),
  // Optional so deployments that haven't set it still work; defaults to the
  // VendingPreneurs booking link which was hardcoded across the prompt
  // sections. For a second brand, set BOOKING_URL and the section builders
  // will interpolate it.
  BOOKING_URL: z
    .string()
    .url()
    .default('https://booking.vendingpreneurs.com/AK-DM'),
})

const sendpulseEnvSchema = z.object({
  SENDPULSE_API_KEY: z.string().min(1),
  SENDPULSE_BOT_ID: z.string().min(1),
  SENDPULSE_WEBHOOK_SECRET: z.string().min(1),
})

// Email provider (Resend) — added by P2.01. All fields are optional/nullable
// today: P2.04 wires the real send and tightens validation when the channel
// goes live. Until then, missing vars must NOT crash unrelated routes that
// transitively load this slice. The single env-var-per-concern pattern
// (`RESEND_API_KEY` rather than `_LIVE` / `_TEST`) relies on Vercel's
// per-environment scope for sandbox-vs-production separation; the runtime
// guard is the `livemode` flag on incoming Resend webhook events
// (cross-checked against NODE_ENV in the P2.04 webhook route).
const emailProviderEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1).nullable().optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1).nullable().optional(),
  RESEND_FROM_ADDRESS: z.string().email().nullable().optional(),
  RESEND_FROM_DISPLAY_NAME: z.string().min(1).nullable().optional(),
  RESEND_REPLY_TO: z.string().email().nullable().optional(),
})

// Client-safe config — validated at import time
export const config = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

export function getSupabaseServerConfig() {
  return supabaseServerEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}

export function getAnthropicConfig() {
  return anthropicEnvSchema.parse({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  })
}

export function getBrandConfig() {
  return brandEnvSchema.parse({
    BRAND_NAME: process.env.BRAND_NAME,
    BOOKING_URL: process.env.BOOKING_URL,
  })
}

// Aggregate for callers (webhooks, engine) that genuinely need all three.
// Internally composes the slices so failure messages still name the specific
// missing var.
export function getServerConfig() {
  return {
    ...getSupabaseServerConfig(),
    ...getAnthropicConfig(),
    ...getBrandConfig(),
  }
}

// SendPulse config — validated separately so non-SendPulse code doesn't require these vars
export function getSendPulseConfig() {
  return sendpulseEnvSchema.parse({
    SENDPULSE_API_KEY: process.env.SENDPULSE_API_KEY,
    SENDPULSE_BOT_ID: process.env.SENDPULSE_BOT_ID,
    SENDPULSE_WEBHOOK_SECRET: process.env.SENDPULSE_WEBHOOK_SECRET,
  })
}

// Email provider (Resend) config — added by P2.01. Returns all-null when env
// vars are unset so that routes which transitively touch this slice keep
// working until P2.04 wires the live send path. P2.04 will introduce a
// stricter `getResendLiveConfig()` getter that requires the full set when
// the per-brand `EMAIL_DELIVERY_LIVE` flag flips on.
export function getEmailProviderConfig() {
  return emailProviderEnvSchema.parse({
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? null,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET ?? null,
    RESEND_FROM_ADDRESS: process.env.RESEND_FROM_ADDRESS ?? null,
    RESEND_FROM_DISPLAY_NAME: process.env.RESEND_FROM_DISPLAY_NAME ?? null,
    RESEND_REPLY_TO: process.env.RESEND_REPLY_TO ?? null,
  })
}

// Global kill switch. Set BOT_ENABLED=false on Vercel to silence the bot on all
// incoming webhooks without tearing down the integration.
// Default: enabled. Any value other than the literal string "false" is treated as enabled.
export function isBotEnabled(): boolean {
  return process.env.BOT_ENABLED !== 'false'
}
