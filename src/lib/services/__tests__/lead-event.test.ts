import { describe, it, expect, vi, beforeEach } from 'vitest'
import { persistLeadEvents } from '@/lib/services/lead-event'
import { createTableAwareMockClient, asSupabaseClient } from '@/test/helpers'
import type { ToolCall } from '@/lib/services/claude'

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    name: 'capture_email',
    toolUseId: 'toolu_001',
    input: { email: 'lead@example.com' },
    ...overrides,
  }
}

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: '00000000-0000-0000-0000-000000000000',
    contactId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    integration: 'sendpulse',
    toolCalls: [makeToolCall()],
    ...overrides,
  }
}

describe('persistLeadEvents', () => {
  let client: ReturnType<typeof createTableAwareMockClient>

  beforeEach(() => {
    client = createTableAwareMockClient()
    vi.clearAllMocks()
  })

  // --- Empty toolCalls early return ---

  it('returns { inserted: 0 } when toolCalls is empty, no DB call', async () => {
    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput({ toolCalls: [] })
    )

    expect(result).toEqual({ inserted: 0 })
    expect(client.from).not.toHaveBeenCalled()
  })

  // --- Successful path ---

  it('inserts a single row and returns the count', async () => {
    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: null,
      count: 1,
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput()
    )

    expect(result).toEqual({ inserted: 1 })
    expect(client.from).toHaveBeenCalledWith('lead_events')
  })

  it('inserts multiple rows and returns the count', async () => {
    const toolCalls = [
      makeToolCall({ toolUseId: 'toolu_001' }),
      makeToolCall({ toolUseId: 'toolu_002', name: 'qualify_lead' }),
      makeToolCall({ toolUseId: 'toolu_003', name: 'book_call' }),
    ]

    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: null,
      count: 3,
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput({ toolCalls })
    )

    expect(result).toEqual({ inserted: 3 })
  })

  // --- Field mapping ---

  it('maps all fields correctly on the inserted row', async () => {
    const upsertSpy = client.forTable('lead_events').upsert
    upsertSpy.mockResolvedValueOnce({ data: null, error: null, count: 1 })

    await persistLeadEvents(
      asSupabaseClient(client),
      makeInput({
        messageId: 'msg-42',
        toolCalls: [
          makeToolCall({
            name: 'book_call',
            toolUseId: 'toolu_abc',
            input: { calendly_slot: '2pm' },
          }),
        ],
      })
    )

    expect(upsertSpy).toHaveBeenCalledWith(
      [
        {
          conversation_id: '00000000-0000-0000-0000-000000000000',
          contact_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          message_id: 'msg-42',
          tool_name: 'book_call',
          tool_use_id: 'toolu_abc',
          tool_input: { calendly_slot: '2pm' },
          integration: 'sendpulse',
        },
      ],
      {
        count: 'exact',
        ignoreDuplicates: true,
        onConflict: 'tool_use_id',
      }
    )
  })

  it('passes integration field through', async () => {
    const upsertSpy = client.forTable('lead_events').upsert
    upsertSpy.mockResolvedValueOnce({ data: null, error: null, count: 1 })

    await persistLeadEvents(
      asSupabaseClient(client),
      makeInput({ integration: 'instagram' })
    )

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ integration: 'instagram' }),
      ]),
      expect.anything()
    )
  })

  // --- messageId variations ---

  it('sets message_id to the provided string value', async () => {
    const upsertSpy = client.forTable('lead_events').upsert
    upsertSpy.mockResolvedValueOnce({ data: null, error: null, count: 1 })

    await persistLeadEvents(
      asSupabaseClient(client),
      makeInput({ messageId: 'msg-99' })
    )

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ message_id: 'msg-99' }),
      ]),
      expect.anything()
    )
  })

  it('sets message_id to null when messageId is undefined', async () => {
    const upsertSpy = client.forTable('lead_events').upsert
    upsertSpy.mockResolvedValueOnce({ data: null, error: null, count: 1 })

    const input = makeInput()
    delete (input as Record<string, unknown>).messageId

    await persistLeadEvents(asSupabaseClient(client), input)

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ message_id: null })]),
      expect.anything()
    )
  })

  it('sets message_id to null when messageId is explicitly null', async () => {
    const upsertSpy = client.forTable('lead_events').upsert
    upsertSpy.mockResolvedValueOnce({ data: null, error: null, count: 1 })

    await persistLeadEvents(
      asSupabaseClient(client),
      makeInput({ messageId: null })
    )

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ message_id: null })]),
      expect.anything()
    )
  })

  // --- count ?? 0 fallback ---

  it('returns { inserted: 0 } when insert succeeds but count is null', async () => {
    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: null,
      count: null,
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput()
    )

    expect(result).toEqual({ inserted: 0 })
  })

  it('returns { inserted: 0 } when insert succeeds but count is undefined', async () => {
    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: null,
      // count omitted entirely
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput()
    )

    expect(result).toEqual({ inserted: 0 })
  })

  // --- Idempotency ---

  it('uses upsert ignoreDuplicates so duplicate tool_use_id rows do not reject the whole batch', async () => {
    const upsertSpy = client.forTable('lead_events').upsert
    upsertSpy.mockResolvedValueOnce({
      data: null,
      error: null,
      count: 1,
    })

    const toolCalls = [
      makeToolCall({ toolUseId: 'toolu_existing' }),
      makeToolCall({ toolUseId: 'toolu_new', name: 'book_call' }),
    ]
    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput({ toolCalls })
    )

    expect(result).toEqual({ inserted: 1 })
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ tool_use_id: 'toolu_existing' }),
        expect.objectContaining({ tool_use_id: 'toolu_new' }),
      ]),
      {
        count: 'exact',
        ignoreDuplicates: true,
        onConflict: 'tool_use_id',
      }
    )
  })

  // --- Other DB errors ---

  it('returns { inserted: 0 } on foreign key violation (23503)', async () => {
    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: {
        code: '23503',
        message: 'foreign key violation',
        details: '',
        hint: '',
      },
      count: null,
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput()
    )

    expect(result).toEqual({ inserted: 0 })
  })

  it('returns { inserted: 0 } on undefined table error (42P01)', async () => {
    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: {
        code: '42P01',
        message: 'relation does not exist',
        details: '',
        hint: '',
      },
      count: null,
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput()
    )

    expect(result).toEqual({ inserted: 0 })
  })

  it('returns { inserted: 0 } when error has no code', async () => {
    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: { message: 'something went wrong' },
      count: null,
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput()
    )

    expect(result).toEqual({ inserted: 0 })
  })

  it('returns { inserted: 0 } when error code is an unexpected string', async () => {
    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: {
        code: '08000',
        message: 'connection exception',
        details: '',
        hint: '',
      },
      count: null,
    })

    const result = await persistLeadEvents(
      asSupabaseClient(client),
      makeInput()
    )

    expect(result).toEqual({ inserted: 0 })
  })

  // --- console.error on DB errors ---

  it('logs to console.error on DB errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: { code: '23503', message: 'fk violation', details: '', hint: '' },
      count: null,
    })

    await persistLeadEvents(asSupabaseClient(client), makeInput())

    expect(consoleSpy).toHaveBeenCalledWith(
      'persistLeadEvents failed',
      expect.objectContaining({ code: '23503' })
    )

    consoleSpy.mockRestore()
  })

  it('logs to console.error if the upsert still returns a unique violation', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    client.forTable('lead_events').upsert.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate', details: '', hint: '' },
      count: null,
    })

    await persistLeadEvents(asSupabaseClient(client), makeInput())

    expect(consoleSpy).toHaveBeenCalledWith(
      'persistLeadEvents failed',
      expect.objectContaining({ code: '23505' })
    )

    consoleSpy.mockRestore()
  })

  // -----------------------------------------------------------------------
  // Zod validation — invalid input cases
  // -----------------------------------------------------------------------

  describe('Zod validation failures', () => {
    // --- Invalid UUID for conversationId ---

    it('returns { inserted: 0 } when conversationId is not a UUID, no DB call', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await persistLeadEvents(
        asSupabaseClient(client),
        makeInput({ conversationId: 'not-a-uuid' })
      )

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    // --- Invalid UUID for contactId ---

    it('returns { inserted: 0 } when contactId is not a UUID, no DB call', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await persistLeadEvents(
        asSupabaseClient(client),
        makeInput({ contactId: 'not-a-uuid' })
      )

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    // --- Missing required fields ---

    it('returns { inserted: 0 } when conversationId is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const input = makeInput()
      delete (input as Record<string, unknown>).conversationId

      const result = await persistLeadEvents(asSupabaseClient(client), input)

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('returns { inserted: 0 } when contactId is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const input = makeInput()
      delete (input as Record<string, unknown>).contactId

      const result = await persistLeadEvents(asSupabaseClient(client), input)

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('returns { inserted: 0 } when integration is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const input = makeInput()
      delete (input as Record<string, unknown>).integration

      const result = await persistLeadEvents(asSupabaseClient(client), input)

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('returns { inserted: 0 } when toolCalls is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const input = makeInput()
      delete (input as Record<string, unknown>).toolCalls

      const result = await persistLeadEvents(asSupabaseClient(client), input)

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    // --- Malformed toolCalls ---

    it('returns { inserted: 0 } when a toolCall is missing name', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const badToolCall = { toolUseId: 'toolu_001', input: {} }
      const result = await persistLeadEvents(
        asSupabaseClient(client),
        makeInput({ toolCalls: [badToolCall] })
      )

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('returns { inserted: 0 } when a toolCall is missing toolUseId', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const badToolCall = { name: 'capture_email', input: {} }
      const result = await persistLeadEvents(
        asSupabaseClient(client),
        makeInput({ toolCalls: [badToolCall] })
      )

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('returns { inserted: 0 } when a toolCall name is not a string', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const badToolCall = { name: 123, toolUseId: 'toolu_001', input: {} }
      const result = await persistLeadEvents(
        asSupabaseClient(client),
        makeInput({ toolCalls: [badToolCall] })
      )

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    // --- messageId wrong type ---

    it('returns { inserted: 0 } when messageId is not a string or null', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await persistLeadEvents(
        asSupabaseClient(client),
        makeInput({ messageId: 12345 })
      )

      expect(result).toEqual({ inserted: 0 })
      expect(client.from).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'persistLeadEvents validation failed',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    // --- Validation still allows legitimate inputs through ---

    it('does NOT trigger validation error for valid UUID inputs', async () => {
      client.forTable('lead_events').upsert.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 1,
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await persistLeadEvents(
        asSupabaseClient(client),
        makeInput()
      )

      expect(result).toEqual({ inserted: 1 })
      // Validation error log should NOT have been called
      const validationCalls = consoleSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('validation failed')
      )
      expect(validationCalls).toHaveLength(0)

      consoleSpy.mockRestore()
    })
  })
})
