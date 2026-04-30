'use server'

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  buildClaudeRequest,
  parseClaudeResponse,
  type ToolCall,
} from '@/lib/services/claude'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import { BlockOverridesSchema } from '@/lib/prompts/compile-block/schemas'
import { compileBlock } from '@/lib/prompts/compile-block/compile-block'
import { resolveFlowBookingUrl } from '../../flow-config'
import { isFlowCompileEnabled } from './simulator-overrides'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

type SimulatorMessage = z.infer<typeof messageSchema>

const inputSchema = z.object({
  brand: z.string().min(1),
  messages: z.array(messageSchema).min(1),
  overrides: BlockOverridesSchema.optional(),
})

const MAX_HISTORY_MESSAGES = 40

const MAX_TOOL_ROUNDS = 3

// Lazy singleton — one Anthropic client per process, shared across calls.
// Avoids allocating a new HTTP agent pool per simulateReplyAction invocation.
let _anthropic: Anthropic | null = null
function getAnthropicClient(apiKey: string): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

export interface SimulateReplyData {
  replyText: string
  toolCalls: ToolCall[]
  truncated: boolean
}

export type SimulateReplyResult =
  | { success: true; data: SimulateReplyData }
  | { success: false; error: string }

export async function simulateReplyAction(
  input: unknown
): Promise<SimulateReplyResult> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid simulator input' }
  }

  const messages = normalizeMessages(parsed.data.messages)
  if (messages.length === 0) {
    return { success: false, error: 'Invalid simulator input' }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return { success: false, error: 'Simulator not configured' }
  }

  try {
    const bookingUrl = resolveFlowBookingUrl(process.env.BOOKING_URL)
    const useCompile = isFlowCompileEnabled()
    // `compileBlock` is async — the stored-asset attachment path
    // resolves a Supabase signed URL at compile time. The legacy URL
    // path returns immediately; only the stored variant awaits I/O.
    const systemPrompt = useCompile
      ? await compileBlock({
          brand: parsed.data.brand,
          bookingUrl,
          ...(parsed.data.overrides
            ? { overrides: parsed.data.overrides }
            : {}),
        })
      : buildSystemPrompt({ brandName: parsed.data.brand, bookingUrl })
    const initialRequest = buildClaudeRequest(
      systemPrompt,
      messages as Anthropic.Messages.MessageParam[]
    )
    const anthropic = getAnthropicClient(apiKey)

    let response = await anthropic.messages.create(
      initialRequest as Anthropic.Messages.MessageCreateParamsNonStreaming
    )
    let parsedResponse = parseClaudeResponse(response)
    const allToolCalls: ToolCall[] = [...parsedResponse.toolCalls]
    let replyText = parsedResponse.replyText
    let truncated = parsedResponse.truncated

    let runningMessages = [...messages] as Anthropic.Messages.MessageParam[]
    let round = 0
    while (
      response.stop_reason === 'tool_use' &&
      !replyText &&
      round < MAX_TOOL_ROUNDS
    ) {
      round++
      runningMessages = [
        ...runningMessages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: parsedResponse.toolCalls.map((tc) => ({
            type: 'tool_result' as const,
            tool_use_id: tc.toolUseId,
            content: JSON.stringify({ success: true }),
          })),
        },
      ]
      const followUp = buildClaudeRequest(systemPrompt, runningMessages)
      response = await anthropic.messages.create(
        followUp as Anthropic.Messages.MessageCreateParamsNonStreaming
      )
      parsedResponse = parseClaudeResponse(response)
      allToolCalls.push(...parsedResponse.toolCalls)
      if (parsedResponse.replyText) {
        replyText = parsedResponse.replyText
      }
      truncated = truncated || parsedResponse.truncated
    }

    return {
      success: true,
      data: {
        replyText,
        toolCalls: allToolCalls,
        truncated,
      },
    }
  } catch (err) {
    console.error('simulateReplyAction failed', err)
    return { success: false, error: 'Claude call failed' }
  }
}

function normalizeMessages(messages: SimulatorMessage[]): SimulatorMessage[] {
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES)
  const firstUserIndex = recentMessages.findIndex(
    (message) => message.role === 'user'
  )

  if (firstUserIndex === -1) return recentMessages
  return recentMessages.slice(firstUserIndex)
}
