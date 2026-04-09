import { vi } from 'vitest'

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
