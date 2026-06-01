import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `actions.ts` pulls in the conversation-viewer + flow-drafts +
// flow-runtime services which transitively import `config.ts`. The
// config schema validates at import time and fails when Supabase env
// vars aren't set in the test environment. Mock at the module
// boundary (matches the pattern in the SendPulse webhook route test).
vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getSupabaseServerConfig: () => ({ SUPABASE_SERVICE_ROLE_KEY: 'test' }),
  getServerConfig: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    ANTHROPIC_API_KEY: 'sk-test',
    BRAND_NAME: 'TestBrand',
    BOOKING_URL: 'https://test/book',
  }),
  getBrandConfig: () => ({
    BRAND_NAME: 'TestBrand',
    BOOKING_URL: 'https://test/book',
  }),
  getAnthropicConfig: () => ({ ANTHROPIC_API_KEY: 'sk-test' }),
  isBotEnabled: () => true,
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/services/conversation-viewer', () => ({
  countConversationsStartedSince: vi.fn(),
  getConversation: vi.fn(),
  listConversations: vi.fn(),
}))

vi.mock('@/lib/services/flow-drafts', () => ({
  loadFlowDraft: vi.fn(),
  saveFlowDraft: vi.fn(),
}))

vi.mock('@/lib/services/flow-runtime', () => ({
  getFlowRuntimeControl: vi.fn(),
  setFlowRuntimePause: vi.fn(),
}))

vi.mock('@/lib/services/email-assets', () => ({
  uploadAsset: vi.fn(),
  archiveAsset: vi.fn(),
  listAssetsForFlow: vi.fn(),
  ALLOWED_CONTENT_TYPES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/zip',
  ] as const,
  MAX_UPLOAD_BYTES: 20 * 1024 * 1024,
}))

import {
  archiveAsset,
  listAssetsForFlow,
  uploadAsset,
} from '@/lib/services/email-assets'
import {
  archiveEmailAssetAction,
  listEmailAssetsAction,
  uploadEmailAssetAction,
} from '../actions'

function pdfFile(size: number, type = 'application/pdf'): File {
  const bytes = new Uint8Array(size)
  bytes.set([0x25, 0x50, 0x44, 0x46], 0) // %PDF
  return new File([bytes], 'prep-checklist.pdf', { type })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('uploadEmailAssetAction', () => {
  it('rejects missing file', async () => {
    const fd = new FormData()
    fd.append('brand', 'VendingPreneurs')
    fd.append('flowId', 'ig-organic-dm')

    const result = await uploadEmailAssetAction(fd)

    expect(result.success).toBe(false)
  })

  it('rejects empty file', async () => {
    const fd = new FormData()
    fd.append('file', new File([], 'empty.pdf', { type: 'application/pdf' }))
    fd.append('brand', 'VendingPreneurs')
    fd.append('flowId', 'ig-organic-dm')

    const result = await uploadEmailAssetAction(fd)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/empty/i)
    }
  })

  it('rejects oversized file', async () => {
    const fd = new FormData()
    fd.append('file', pdfFile(20 * 1024 * 1024 + 1))
    fd.append('brand', 'VendingPreneurs')
    fd.append('flowId', 'ig-organic-dm')

    const result = await uploadEmailAssetAction(fd)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/too large/i)
    }
  })

  it('rejects unknown content type', async () => {
    const fd = new FormData()
    fd.append('file', pdfFile(1024, 'image/gif'))
    fd.append('brand', 'VendingPreneurs')
    fd.append('flowId', 'ig-organic-dm')

    const result = await uploadEmailAssetAction(fd)

    expect(result.success).toBe(false)
  })

  it('rejects missing brand / flowId', async () => {
    const fd = new FormData()
    fd.append('file', pdfFile(1024))

    const result = await uploadEmailAssetAction(fd)

    expect(result.success).toBe(false)
  })

  it('uploads via uploadAsset on the happy path', async () => {
    vi.mocked(uploadAsset).mockResolvedValue({
      success: true,
      data: {
        assetId: 'asset-1',
        storagePath: 'VendingPreneurs/ig-organic-dm/asset-1/prep-checklist.pdf',
        fileName: 'prep-checklist.pdf',
        sizeBytes: 1024,
        checksum: 'a'.repeat(64),
      },
    })

    const fd = new FormData()
    fd.append('file', pdfFile(1024))
    fd.append('brand', 'VendingPreneurs')
    fd.append('flowId', 'ig-organic-dm')

    const result = await uploadEmailAssetAction(fd)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.assetId).toBe('asset-1')
      expect(result.fileName).toBe('prep-checklist.pdf')
    }
    expect(uploadAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'VendingPreneurs',
        flowId: 'ig-organic-dm',
        fileName: 'prep-checklist.pdf',
        contentType: 'application/pdf',
      })
    )
  })

  it('surfaces uploadAsset failures', async () => {
    vi.mocked(uploadAsset).mockResolvedValue({
      success: false,
      error: 'Storage upload failed',
    })

    const fd = new FormData()
    fd.append('file', pdfFile(1024))
    fd.append('brand', 'VendingPreneurs')
    fd.append('flowId', 'ig-organic-dm')

    const result = await uploadEmailAssetAction(fd)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/storage/i)
    }
  })
})

describe('archiveEmailAssetAction', () => {
  it('rejects non-UUID asset ids', async () => {
    const result = await archiveEmailAssetAction({
      assetId: 'not-a-uuid',
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    expect(result.success).toBe(false)
  })

  it('delegates to archiveAsset on valid uuid', async () => {
    vi.mocked(archiveAsset).mockResolvedValue({ success: true })

    const result = await archiveEmailAssetAction({
      assetId: '11111111-2222-4333-8444-555555555555',
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    expect(result.success).toBe(true)
    expect(archiveAsset).toHaveBeenCalledWith({
      assetId: '11111111-2222-4333-8444-555555555555',
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })
  })
})

describe('listEmailAssetsAction', () => {
  it('returns [] on invalid args', async () => {
    const result = await listEmailAssetsAction({ brand: '', flowId: 'foo' })

    expect(result).toEqual([])
  })

  it('delegates to listAssetsForFlow on valid args', async () => {
    vi.mocked(listAssetsForFlow).mockResolvedValue([])

    const result = await listEmailAssetsAction({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    expect(result).toEqual([])
    expect(listAssetsForFlow).toHaveBeenCalledWith({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })
  })
})
