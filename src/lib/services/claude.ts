import type Anthropic from '@anthropic-ai/sdk'
import { MESSAGE_LIMIT } from '@/types/enums'

type Tool = Anthropic.Messages.Tool
type MessageParam = Anthropic.Messages.MessageParam
type Message = Anthropic.Messages.Message

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1024

const TOOLS: Tool[] = [
  {
    name: 'capture_email',
    description:
      "Capture the lead's email address once they provide it in conversation.",
    input_schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'The email address provided by the lead',
        },
      },
      required: ['email'],
    },
  },
  {
    name: 'qualify_lead',
    description:
      'Record qualification signals gathered during conversation. Call when the lead shares details about their business.',
    input_schema: {
      type: 'object',
      properties: {
        machine_count: {
          type: 'number',
          description: 'Number of vending machines the lead operates',
        },
        location_type: {
          type: 'string',
          description: 'Type of location (e.g. office, gym, school)',
        },
        revenue_range: {
          type: 'string',
          description: 'Approximate monthly revenue range',
        },
      },
    },
  },
  {
    name: 'generate_summary',
    description:
      'MANDATORY: Generate a structured lead summary. You MUST call this when the prospect confirms a booking, says goodbye, opts out, or the conversation ends for any reason. Call in the same response as your final message.',
    input_schema: {
      type: 'object',
      properties: {
        instagram_handle: {
          type: 'string',
          description: "The lead's Instagram handle",
        },
        qualification_status: {
          type: 'string',
          enum: ['hot', 'warm', 'cold'],
          description: 'Lead temperature based on qualification signals',
        },
        call_booked: {
          type: 'boolean',
          description: 'Whether a call has been booked',
        },
        name: { type: 'string', description: "The lead's name if provided" },
        email: {
          type: 'string',
          description: "The lead's email if captured",
        },
        machine_count: {
          type: 'number',
          description: 'Number of machines if provided',
        },
        location_type: {
          type: 'string',
          description: 'Location type if provided',
        },
        revenue_range: {
          type: 'string',
          description: 'Revenue range if provided',
        },
        calendly_slot: {
          type: 'string',
          description: 'Booked Calendly slot if available',
        },
        key_notes: {
          type: 'string',
          description: 'Notable observations from the conversation',
        },
        recommended_action: {
          type: 'string',
          description: 'Suggested next step for the sales team',
        },
      },
      required: ['instagram_handle', 'qualification_status', 'call_booked'],
    },
  },
  {
    name: 'book_call',
    description:
      'MANDATORY: You MUST call this tool whenever a prospect confirms they have booked, are booking, or agree to book a call. Call in the same response as your confirmation message.',
    input_schema: {
      type: 'object',
      properties: {
        calendly_slot: {
          type: 'string',
          description: 'The selected Calendly time slot',
        },
      },
    },
  },
]

interface ClaudeRequest {
  model: string
  system: string
  messages: MessageParam[]
  max_tokens: number
  tools: Tool[]
}

export function buildClaudeRequest(
  systemPrompt: string,
  messages: MessageParam[]
): ClaudeRequest {
  return {
    model: CLAUDE_MODEL,
    system: systemPrompt,
    messages,
    max_tokens: MAX_TOKENS,
    tools: TOOLS,
  }
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

export interface ToolCall {
  name: string
  toolUseId: string
  input: Record<string, unknown>
}

export interface ParsedClaudeResponse {
  replyText: string
  toolCalls: ToolCall[]
  truncated: boolean
}

export function parseClaudeResponse(message: Message): ParsedClaudeResponse {
  const textParts: string[] = []
  const toolCalls: ToolCall[] = []

  for (const block of message.content) {
    if (block.type === 'text') {
      textParts.push(block.text)
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        toolUseId: block.id,
        input: block.input as Record<string, unknown>,
      })
    }
  }

  let replyText = textParts.join(' ')
  let truncated = false

  if (replyText.length > MESSAGE_LIMIT) {
    replyText = replyText.slice(0, MESSAGE_LIMIT)
    truncated = true
  }

  return { replyText, toolCalls, truncated }
}
