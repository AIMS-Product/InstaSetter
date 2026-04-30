import { describe, it, expect } from 'vitest'
import { buildClaudeRequest } from '@/lib/services/claude'

type SchemaProps = Record<string, unknown>
type JsonSchemaProperty = {
  type?: string
  enum?: string[]
  description?: string
}

/** Safely extract properties from a tool's input_schema (typed as unknown). */
function getProps(
  tool: { input_schema: { properties?: unknown } } | undefined
): SchemaProps {
  return (tool?.input_schema.properties ?? {}) as SchemaProps
}

function getProp(
  tool: { input_schema: { properties?: unknown } } | undefined,
  name: string
): JsonSchemaProperty {
  return getProps(tool)[name] as JsonSchemaProperty
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

  it('defines all 5 tools', () => {
    const req = buildClaudeRequest(prompt, msgs)
    const names = req.tools.map((t) => t.name)
    expect(names).toContain('capture_email')
    expect(names).toContain('qualify_lead')
    expect(names).toContain('book_call')
    expect(names).toContain('generate_summary')
    expect(names).toContain('request_human_review')
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
    expect(getProp(tool, 'email')).toMatchObject({
      type: 'string',
      description: expect.stringContaining('email address'),
    })
    expect(tool?.input_schema.required).toContain('email')
  })

  it('qualify_lead has optional qualification fields', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'qualify_lead'
    )
    const props = getProps(tool)
    expect(props.machine_count).toMatchObject({
      type: 'number',
      description: expect.stringContaining('Number of vending machines'),
    })
    expect(props.location_type).toMatchObject({
      type: 'string',
      description: expect.stringContaining('Type of location'),
    })
    expect(props.revenue_range).toMatchObject({
      type: 'string',
      description: expect.stringContaining('monthly revenue'),
    })
    expect(tool?.input_schema.required).toBeUndefined()
  })

  it('generate_summary has required fields', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'generate_summary'
    )
    const props = getProps(tool)
    expect(props.instagram_handle).toMatchObject({ type: 'string' })
    expect(props.qualification_status).toMatchObject({
      type: 'string',
      enum: ['hot', 'warm', 'cold', 'out_of_area'],
    })
    expect(props.call_booked).toMatchObject({ type: 'boolean' })
    expect(props.machine_count).toMatchObject({ type: 'number' })
    expect(props.calendly_slot).toMatchObject({ type: 'string' })
    expect(props.recommended_action).toMatchObject({ type: 'string' })
    expect(tool?.input_schema.required).toContain('instagram_handle')
    expect(tool?.input_schema.required).toContain('qualification_status')
    expect(tool?.input_schema.required).toContain('call_booked')
  })

  it('book_call has optional calendly_slot', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'book_call'
    )
    expect(getProp(tool, 'calendly_slot')).toMatchObject({
      type: 'string',
      description: expect.stringContaining('Calendly time slot'),
    })
    expect(tool?.input_schema.required).toBeUndefined()
  })

  it('request_human_review has required reason and optional severity enum', () => {
    const tool = buildClaudeRequest(prompt, msgs).tools.find(
      (t) => t.name === 'request_human_review'
    )
    expect(tool).toBeDefined()
    expect(tool?.description).toMatch(/human/i)

    const props = getProps(tool)
    expect(props.reason).toMatchObject({ type: 'string' })
    expect(props.severity).toMatchObject({
      type: 'string',
      enum: ['concern', 'hostile', 'compliance'],
    })
    expect(tool?.input_schema.required).toContain('reason')
    expect(tool?.input_schema.required).not.toContain('severity')
  })
})
