import { describe, it, expect } from 'vitest'
import { parseClaudeResponse } from '@/lib/services/claude'
import type Anthropic from '@anthropic-ai/sdk'

type Message = Anthropic.Messages.Message

/** Build a minimal Message-shaped object for testing parseClaudeResponse. */
function makeMessage(content: Message['content']): Message {
  return { content } as Message
}

describe('parseClaudeResponse', () => {
  it('extracts reply text from single text block', () => {
    const result = parseClaudeResponse(
      makeMessage([{ type: 'text', text: 'Hey!', citations: null }])
    )
    expect(result.replyText).toBe('Hey!')
    expect(result.toolCalls).toEqual([])
    expect(result.truncated).toBe(false)
  })

  it('extracts tool calls', () => {
    const result = parseClaudeResponse(
      makeMessage([
        { type: 'text', text: 'Got it.', citations: null },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'capture_email',
          input: { email: 'a@b.com' },
          caller: { type: 'direct' },
        },
      ])
    )
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].name).toBe('capture_email')
    expect(result.toolCalls[0].toolUseId).toBe('toolu_1')
    expect(result.toolCalls[0].input).toEqual({ email: 'a@b.com' })
  })

  it('handles no text blocks', () => {
    const result = parseClaudeResponse(
      makeMessage([
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'generate_summary',
          input: {},
          caller: { type: 'direct' },
        },
      ])
    )
    expect(result.replyText).toBe('')
  })

  it('concatenates multiple text blocks with space', () => {
    const result = parseClaudeResponse(
      makeMessage([
        { type: 'text', text: 'Part 1.', citations: null },
        { type: 'text', text: 'Part 2.', citations: null },
      ])
    )
    expect(result.replyText).toBe('Part 1. Part 2.')
  })

  it('handles multiple tool_use blocks', () => {
    const result = parseClaudeResponse(
      makeMessage([
        { type: 'text', text: 'Done.', citations: null },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'capture_email',
          input: { email: 'a@b.com' },
          caller: { type: 'direct' },
        },
        {
          type: 'tool_use',
          id: 'toolu_2',
          name: 'generate_summary',
          input: { instagram_handle: 'x' },
          caller: { type: 'direct' },
        },
      ])
    )
    expect(result.toolCalls).toHaveLength(2)
  })

  it('truncates over 2000 chars and sets truncated flag', () => {
    const result = parseClaudeResponse(
      makeMessage([{ type: 'text', text: 'A'.repeat(2500), citations: null }])
    )
    expect(result.replyText.length).toBeLessThanOrEqual(2000)
    expect(result.truncated).toBe(true)
  })

  it('does not set truncated when under limit', () => {
    const result = parseClaudeResponse(
      makeMessage([{ type: 'text', text: 'Short message', citations: null }])
    )
    expect(result.truncated).toBe(false)
  })

  it('handles empty content array', () => {
    const result = parseClaudeResponse(makeMessage([]))
    expect(result.replyText).toBe('')
    expect(result.toolCalls).toEqual([])
    expect(result.truncated).toBe(false)
  })
})
