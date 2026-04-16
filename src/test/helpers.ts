import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Simple chainable mock client. Every method returns the same chain object.
 * Use for tests that don't need to verify which table was targeted.
 */
export function createMockClient() {
  const client: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(() => client),
    select: vi.fn(() => client),
    insert: vi.fn(() => client),
    update: vi.fn(() => client),
    eq: vi.fn(() => client),
    order: vi.fn(() => client),
    limit: vi.fn(() => client),
    single: vi.fn(() => client),
    maybeSingle: vi.fn(() => client),
    is: vi.fn(() => client),
    not: vi.fn(() => client),
  }
  return client
}

/**
 * Table-aware mock client. Each `.from(tableName)` call returns a separate
 * chain so tests can assert which table was targeted.
 *
 * Usage:
 *   const client = createTableAwareMockClient()
 *   client.forTable('contacts').single.mockResolvedValueOnce({ data: {...}, error: null })
 *   // after calling code:
 *   expect(client.forTable('contacts').update).toHaveBeenCalledWith({ email: 'a@b.com' })
 */
export function createTableAwareMockClient() {
  const tables: Record<string, ReturnType<typeof createChain>> = {}

  function createChain() {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(() => chain),
      maybeSingle: vi.fn(() => chain),
      is: vi.fn(() => chain),
      not: vi.fn(() => chain),
    }
    return chain
  }

  function forTable(name: string) {
    if (!tables[name]) tables[name] = createChain()
    return tables[name]
  }

  const client = {
    from: vi.fn((name: string) => forTable(name)),
    forTable,
  }

  return client
}

/** Cast a mock client to the Supabase client type for use in function args. */
export function asSupabaseClient(
  mock:
    | ReturnType<typeof createMockClient>
    | ReturnType<typeof createTableAwareMockClient>
): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>
}
