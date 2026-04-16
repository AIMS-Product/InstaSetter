import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  BRAND_NAME: z.string().min(1),
})

const sendpulseEnvSchema = z.object({
  SENDPULSE_API_KEY: z.string().min(1),
  SENDPULSE_BOT_ID: z.string().min(1),
  SENDPULSE_WEBHOOK_SECRET: z.string().min(1),
})

// Client-safe config — validated at import time
export const config = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

// Server-only config — call this in server code only
export function getServerConfig() {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    BRAND_NAME: process.env.BRAND_NAME,
  })
}

// SendPulse config — validated separately so non-SendPulse code doesn't require these vars
export function getSendPulseConfig() {
  return sendpulseEnvSchema.parse({
    SENDPULSE_API_KEY: process.env.SENDPULSE_API_KEY,
    SENDPULSE_BOT_ID: process.env.SENDPULSE_BOT_ID,
    SENDPULSE_WEBHOOK_SECRET: process.env.SENDPULSE_WEBHOOK_SECRET,
  })
}
