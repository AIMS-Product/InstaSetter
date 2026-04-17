import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sendpulseWebhookSchema } from '@/types/sendpulse'
import type { SendPulseWebhookPayload } from '@/types/sendpulse'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getServerConfig, getSendPulseConfig, isBotEnabled } from '@/lib/config'
import { upsertSendPulseContact } from '@/lib/services/contact'
import { processMessage } from '@/lib/services/engine'
import { sendInstagramMessage, pauseAutomation } from '@/lib/services/sendpulse'

async function handleEvent(
  event: SendPulseWebhookPayload,
  anthropicApiKey: string
): Promise<{ ok: boolean; conversationId?: string; skipped?: string }> {
  // Only process incoming messages
  if (event.title !== 'incoming_message') {
    return { ok: true, skipped: event.title }
  }

  const client = createServiceRoleClient()

  // Upsert contact
  const contactResult = await upsertSendPulseContact(client, event)
  if (!contactResult.success) {
    throw new Error(contactResult.error)
  }

  if (contactResult.data.opted_out) {
    return { ok: true, skipped: 'opted_out' }
  }

  // Pause SendPulse automation to prevent double-responding
  pauseAutomation(event.contact.id).catch(() => {})

  // Process through engine
  const timestamp = new Date(event.date * 1000).toISOString()
  const messageContent = event.contact.last_message
  const anthropic = new Anthropic({ apiKey: anthropicApiKey })

  const result = await processMessage(
    client,
    contactResult.data,
    undefined,
    messageContent,
    timestamp,
    (req) =>
      anthropic.messages.create(
        req as Anthropic.Messages.MessageCreateParamsNonStreaming
      ),
    'sendpulse'
  )

  if (!result.success) {
    throw new Error(result.error)
  }

  // Send reply via SendPulse API
  if (result.data.reply) {
    const sendResult = await sendInstagramMessage(
      event.contact.id,
      result.data.reply
    )
    if (!sendResult.success) {
      console.error('SendPulse send failed:', sendResult.error)
    }
  }

  return { ok: true, conversationId: result.data.conversationId }
}

export async function POST(request: Request) {
  try {
    // Step 1: Validate webhook secret via query param
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const { ANTHROPIC_API_KEY } = getServerConfig()
    const { SENDPULSE_WEBHOOK_SECRET } = getSendPulseConfig()

    if (token !== SENDPULSE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Parse JSON body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Step 3: Validate payload (SendPulse sends an array of events)
    const parsed = sendpulseWebhookSchema.safeParse(body)
    if (!parsed.success) {
      console.error(
        'SendPulse validation failed:',
        JSON.stringify(parsed.error.flatten())
      )
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Step 4: Global kill switch — short-circuit before any processing.
    if (!isBotEnabled()) {
      return NextResponse.json({
        ok: true,
        results: parsed.data.map(() => ({ ok: true, skipped: 'bot_paused' })),
      })
    }

    // Step 5: Process each event
    const results = []
    for (const event of parsed.data) {
      const result = await handleEvent(event, ANTHROPIC_API_KEY)
      results.push(result)
    }

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    console.error('SendPulse webhook error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
