import { describe, it, expect } from 'vitest'
import { parseClaudeResponse } from '@/lib/services/claude'
import type Anthropic from '@anthropic-ai/sdk'

type Message = Anthropic.Messages.Message

/** Build a minimal Message-shaped object for testing parseClaudeResponse. */
function makeMessage(content: Message['content']): Message {
  return { content } as Message
}

describe('parseClaudeResponse', () => {
  it('extracts text from a single text block', () => {
    const msg = makeMessage([
      { type: 'text', text: 'Hello there!', citations: null },
    ])
    const result = parseClaudeResponse(msg)
    expect(result.text).toBe('Hello there!')
  })

  it('concatenates multiple text blocks', () => {
    const msg = makeMessage([
      { type: 'text', text: 'Part one. ', citations: null },
      { type: 'text', text: 'Part two.', citations: null },
    ])
    const result = parseClaudeResponse(msg)
    expect(result.text).toBe('Part one. Part two.')
  })

  it('truncates text at 2000 characters', () => {
    const longText = 'a'.repeat(2500)
    const msg = makeMessage([{ type: 'text', text: longText, citations: null }])
    const result = parseClaudeResponse(msg)
    expect(result.text.length).toBe(2000)
  })

  it('returns empty string when no text blocks', () => {
    const msg = makeMessage([
      {
        type: 'tool_use',
        id: 'tu_1',
        name: 'capture_email',
        input: { email: 'test@example.com' },
        caller: { type: 'direct' },
      },
    ])
    const result = parseClaudeResponse(msg)
    expect(result.text).toBe('')
  })

  it('extracts tool_use blocks', () => {
    const msg = makeMessage([
      { type: 'text', text: 'Got it!', citations: null },
      {
        type: 'tool_use',
        id: 'tu_1',
        name: 'capture_email',
        input: { email: 'lead@example.com' },
        caller: { type: 'direct' },
      },
    ])
    const result = parseClaudeResponse(msg)
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].name).toBe('capture_email')
    expect(result.toolCalls[0].input).toEqual({ email: 'lead@example.com' })
    expect(result.toolCalls[0].id).toBe('tu_1')
  })

  it('returns empty toolCalls when no tool_use blocks', () => {
    const msg = makeMessage([
      { type: 'text', text: 'Just text.', citations: null },
    ])
    const result = parseClaudeResponse(msg)
    expect(result.toolCalls).toEqual([])
  })

  it('handles multiple tool_use blocks', () => {
    const msg = makeMessage([
      {
        type: 'tool_use',
        id: 'tu_1',
        name: 'qualify_lead',
        input: { machine_count: 10 },
        caller: { type: 'direct' },
      },
      {
        type: 'tool_use',
        id: 'tu_2',
        name: 'generate_summary',
        input: {
          instagram_handle: '@test',
          qualification_status: 'hot',
          call_booked: true,
        },
        caller: { type: 'direct' },
      },
    ])
    const result = parseClaudeResponse(msg)
    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls[0].name).toBe('qualify_lead')
    expect(result.toolCalls[1].name).toBe('generate_summary')
  })

  it('handles empty content array', () => {
    const msg = makeMessage([])
    const result = parseClaudeResponse(msg)
    expect(result.text).toBe('')
    expect(result.toolCalls).toEqual([])
  })
})
