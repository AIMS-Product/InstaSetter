import { describe, it, expect } from 'vitest'
import { buildClaudeRequest } from '@/lib/services/claude'

type SchemaProps = Record<string, unknown>

/** Safely extract properties from a tool's input_schema (typed as unknown). */
function getProps(
  tool: { input_schema: { properties?: unknown } } | undefined
): SchemaProps {
  return (tool?.input_schema.properties ?? {}) as SchemaProps
}

describe('buildClaudeRequest', () => {
  const prompt = 'You are a setter...'
  const msgs = [{ role: 'user' as const, content: 'Hey' }]

  it('sets correct model', () => {
    expect(buildClaudeRequest(prompt, msgs).model).toBe(
      'claude-sonnet-4-20250514'
    )
  })

  it('includes system prompt', () => {
    expect(buildClaudeRequest(prompt, msgs).system).toBe(prompt)
  })

  it('passes messages through', () => {
    expect(buildClaudeRequest(prompt, msgs).messages).toEqual(msgs)
  })

  it('sets max_tokens', () => {
    expect(buildClaudeRequest(prompt, msgs).max_tokens).toBe(1024)
  })

  it('defines all 4 tools', () => {
    const req = buildClaudeRequest(prompt, msgs)
    const names = req.tools.map((t) => t.name)
    expect(names).toContain('capture_email')
    expect(names).toContain('qualify_lead')
    expect(names).toContain('book_call')
    expect(names).toContain('generate_summary')
  })

  it('all tools have descriptions', () => {
    for (const tool of buildClaudeRequest(prompt, msgs).tools) {
      expect(tool.description).toBeTruthy()
    }
  })

  it('capture_email requires email string', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'capture_email'
    )
    expect(getProps(tool).email).toBeDefined()
    expect(tool?.input_schema.required).toContain('email')
  })

  it('qualify_lead has optional qualification fields', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'qualify_lead'
    )
    const props = getProps(tool)
    expect(props.machine_count).toBeDefined()
    expect(props.location_type).toBeDefined()
    expect(props.revenue_range).toBeDefined()
  })

  it('generate_summary has required fields', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'generate_summary'
    )
    const props = getProps(tool)
    expect(props.instagram_handle).toBeDefined()
    expect(props.qualification_status).toBeDefined()
    expect(props.call_booked).toBeDefined()
    expect(tool?.input_schema.required).toContain('instagram_handle')
    expect(tool?.input_schema.required).toContain('qualification_status')
    expect(tool?.input_schema.required).toContain('call_booked')
  })

  it('book_call has optional calendly_slot', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'book_call'
    )
    expect(getProps(tool).calendly_slot).toBeDefined()
  })
})
