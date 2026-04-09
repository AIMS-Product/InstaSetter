import { describe, it, expect, expectTypeOf } from 'vitest'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

// These type aliases will cause TS errors if the tables don't exist in the Database type.
// This is the actual RED test — the compile step fails.
type ContactRow = Tables['contacts']['Row']
type ContactInsert = Tables['contacts']['Insert']
type ContactUpdate = Tables['contacts']['Update']

type ConversationRow = Tables['conversations']['Row']
type ConversationInsert = Tables['conversations']['Insert']
type ConversationUpdate = Tables['conversations']['Update']

type MessageRow = Tables['messages']['Row']
type MessageInsert = Tables['messages']['Insert']
type MessageUpdate = Tables['messages']['Update']

type LeadRow = Tables['leads']['Row']
type LeadInsert = Tables['leads']['Insert']
type LeadUpdate = Tables['leads']['Update']

type IntegrationEventRow = Tables['integration_events']['Row']
type IntegrationEventInsert = Tables['integration_events']['Insert']
type IntegrationEventUpdate = Tables['integration_events']['Update']

// Runtime assertions that verify the shape of the types.
// These use conditional types to produce true/false at compile time,
// then assert the result at runtime.
type HasKey<T, K extends string> = K extends keyof T ? true : false

// Helper: assert a type equals true (compile-time + runtime check)
function assertHasKey<T, K extends string>(
  _value: HasKey<T, K> extends true ? true : never
) {
  expect(true).toBe(true)
}

describe('core domain tables exist in generated types', () => {
  describe('contacts table', () => {
    it('has identity columns', () => {
      assertHasKey<ContactRow, 'id'>(true)
      assertHasKey<ContactRow, 'inro_contact_id'>(true)
      assertHasKey<ContactRow, 'instagram_handle'>(true)
    })

    it('has profile columns', () => {
      assertHasKey<ContactRow, 'name'>(true)
      assertHasKey<ContactRow, 'email'>(true)
      assertHasKey<ContactRow, 'source'>(true)
    })

    it('has status columns', () => {
      assertHasKey<ContactRow, 'opted_out'>(true)
      assertHasKey<ContactRow, 'first_seen_at'>(true)
      assertHasKey<ContactRow, 'last_message_at'>(true)
    })

    it('has Insert and Update types', () => {
      assertHasKey<ContactInsert, 'inro_contact_id'>(true)
      assertHasKey<ContactUpdate, 'inro_contact_id'>(true)
    })
  })

  describe('conversations table', () => {
    it('has core columns', () => {
      assertHasKey<ConversationRow, 'id'>(true)
      assertHasKey<ConversationRow, 'contact_id'>(true)
      assertHasKey<ConversationRow, 'status'>(true)
      assertHasKey<ConversationRow, 'prompt_version'>(true)
    })

    it('has metadata columns', () => {
      assertHasKey<ConversationRow, 'summary'>(true)
      assertHasKey<ConversationRow, 'started_at'>(true)
      assertHasKey<ConversationRow, 'ended_at'>(true)
    })

    it('has Insert and Update types', () => {
      assertHasKey<ConversationInsert, 'contact_id'>(true)
      assertHasKey<ConversationUpdate, 'status'>(true)
    })
  })

  describe('messages table', () => {
    it('has core columns', () => {
      assertHasKey<MessageRow, 'id'>(true)
      assertHasKey<MessageRow, 'conversation_id'>(true)
      assertHasKey<MessageRow, 'role'>(true)
      assertHasKey<MessageRow, 'content'>(true)
    })

    it('has dedup and tracking columns', () => {
      assertHasKey<MessageRow, 'inro_message_id'>(true)
      assertHasKey<MessageRow, 'dedup_hash'>(true)
      assertHasKey<MessageRow, 'token_count'>(true)
    })

    it('has Insert and Update types', () => {
      assertHasKey<MessageInsert, 'conversation_id'>(true)
      assertHasKey<MessageUpdate, 'content'>(true)
    })
  })

  describe('leads table', () => {
    it('has identity columns', () => {
      assertHasKey<LeadRow, 'id'>(true)
      assertHasKey<LeadRow, 'contact_id'>(true)
      assertHasKey<LeadRow, 'conversation_id'>(true)
      assertHasKey<LeadRow, 'instagram_handle'>(true)
    })

    it('has qualification columns', () => {
      assertHasKey<LeadRow, 'qualification_status'>(true)
      assertHasKey<LeadRow, 'call_booked'>(true)
      assertHasKey<LeadRow, 'call_outcome'>(true)
    })

    it('has profile columns', () => {
      assertHasKey<LeadRow, 'name'>(true)
      assertHasKey<LeadRow, 'email'>(true)
      assertHasKey<LeadRow, 'machine_count'>(true)
      assertHasKey<LeadRow, 'location_type'>(true)
      assertHasKey<LeadRow, 'revenue_range'>(true)
    })

    it('has action columns', () => {
      assertHasKey<LeadRow, 'calendly_slot'>(true)
      assertHasKey<LeadRow, 'key_notes'>(true)
      assertHasKey<LeadRow, 'recommended_action'>(true)
      assertHasKey<LeadRow, 'summary_json'>(true)
    })

    it('has Insert and Update types', () => {
      assertHasKey<LeadInsert, 'contact_id'>(true)
      assertHasKey<LeadUpdate, 'qualification_status'>(true)
    })
  })

  describe('integration_events table', () => {
    it('has core columns', () => {
      assertHasKey<IntegrationEventRow, 'id'>(true)
      assertHasKey<IntegrationEventRow, 'contact_id'>(true)
      assertHasKey<IntegrationEventRow, 'conversation_id'>(true)
    })

    it('has event detail columns', () => {
      assertHasKey<IntegrationEventRow, 'integration'>(true)
      assertHasKey<IntegrationEventRow, 'action'>(true)
      assertHasKey<IntegrationEventRow, 'status'>(true)
      assertHasKey<IntegrationEventRow, 'payload'>(true)
      assertHasKey<IntegrationEventRow, 'error_message'>(true)
    })

    it('has Insert and Update types', () => {
      assertHasKey<IntegrationEventInsert, 'integration'>(true)
      assertHasKey<IntegrationEventUpdate, 'status'>(true)
    })
  })
})
