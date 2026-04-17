import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { inroWebhookSchema } from '@/types/inro'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getServerConfig, isBotEnabled } from '@/lib/config'
import { upsertContact } from '@/lib/services/contact'
import { findOrCreateActiveConversation } from '@/lib/services/conversation'
import { storeMessage } from '@/lib/services/message'
import { processMessage } from '@/lib/services/engine'

export async function POST(request: Request) {
  try {
    // Step 1: Parse JSON body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Step 2: Validate payload
    const parsed = inroWebhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const payload = parsed.data

    // Global kill switch — short-circuit before any processing.
    if (!isBotEnabled()) {
      return NextResponse.json({ skipped: true, reason: 'bot_paused' })
    }

    // Step 3: Create service role client
    const client = createServiceRoleClient()

    // Step 4: Upsert contact and check opted_out
    const contactResult = await upsertContact(client, payload)
    if (!contactResult.success) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    if (contactResult.data.opted_out) {
      return NextResponse.json({ skipped: true, reason: 'opted_out' })
    }

    // Step 5: Find or create active conversation
    const convResult = await findOrCreateActiveConversation(
      contactResult.data.id
    )
    if (!convResult.success) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    // Step 6: Store user message for early dedup check
    const storeResult = await storeMessage(client, {
      conversationId: convResult.data.id,
      role: 'user',
      content: payload.message,
      timestamp: payload.timestamp,
      inroMessageId: payload.contact_id,
    })

    if (!storeResult.success) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    if (storeResult.isDuplicate) {
      return NextResponse.json({ skipped: true, reason: 'duplicate' })
    }

    // Step 7: Process message through the engine
    const { ANTHROPIC_API_KEY } = getServerConfig()
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const result = await processMessage(
      client,
      { id: contactResult.data.id },
      payload.contact_id,
      payload.message,
      payload.timestamp,
      (req) =>
        anthropic.messages.create(
          req as Anthropic.Messages.MessageCreateParamsNonStreaming
        )
    )

    if (!result.success) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reply: result.data.reply,
      conversationId: result.data.conversationId,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
