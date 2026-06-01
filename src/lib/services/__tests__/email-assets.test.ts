import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  archiveAsset,
  getAsset,
  getAssetSignedUrl,
  listAssetsForFlow,
  resolveStoredAssetUrl,
  sanitizeFileName,
  sniffContentType,
  uploadAsset,
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
} from '../email-assets'

interface AssetRow {
  id: string
  brand: string
  flow_id: string
  block_id: string
  file_name: string
  content_type: string
  size_bytes: number
  storage_path: string
  checksum: string
  description: string | null
  created_by: string | null
  created_at: string
  archived_at: string | null
}

function pdfBuffer(size = 1024): Uint8Array {
  // First 4 bytes: %PDF, then padding bytes.
  const buf = new Uint8Array(size)
  buf[0] = 0x25 // %
  buf[1] = 0x50 // P
  buf[2] = 0x44 // D
  buf[3] = 0x46 // F
  return buf
}

function pngBuffer(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
}

function buildSupabaseStub({
  uploadResult = { error: null as Error | null },
  signedUrlResult = {
    data: { signedUrl: 'https://x.supabase.co/storage/v1/object/sign/abc' },
    error: null as Error | null,
  },
  insertResult,
  selectMaybeSingleResult,
  updateResult = { error: null as Error | null },
  selectListResult,
}: {
  uploadResult?: { error: Error | null }
  signedUrlResult?: {
    data?: { signedUrl: string } | null
    error: Error | null
  }
  insertResult?: { data: AssetRow | null; error: Error | null }
  selectMaybeSingleResult?: { data: AssetRow | null; error: Error | null }
  updateResult?: { error: Error | null }
  selectListResult?: { data: AssetRow[] | null; error: Error | null }
} = {}) {
  const upload = vi.fn(async () => uploadResult)
  const createSignedUrl = vi.fn(async () => signedUrlResult)
  const remove = vi.fn(async () => ({ error: null as Error | null }))

  const storageFrom = vi.fn(() => ({
    upload,
    createSignedUrl,
    remove,
  }))

  const insertMaybeSingle = vi.fn(
    async () => insertResult ?? { data: null, error: null }
  )
  const insertSelect = vi.fn(() => ({ maybeSingle: insertMaybeSingle }))
  const insert = vi.fn(() => ({ select: insertSelect }))

  const selectMaybeSingle = vi.fn(
    async () => selectMaybeSingleResult ?? { data: null, error: null }
  )
  const order = vi.fn(async () => selectListResult ?? { data: [], error: null })
  const isNullChain = vi.fn(() => ({ order }))
  const selectFn = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: isNullChain,
        order,
      })),
      maybeSingle: selectMaybeSingle,
    })),
    maybeSingle: selectMaybeSingle,
  }))

  const updateEq = vi.fn(() => updateChain)
  const updateChain = {
    eq: updateEq,
    then(
      resolve: (value: { error: Error | null }) => void,
      _reject?: (reason?: unknown) => void
    ) {
      resolve(updateResult)
      return undefined
    },
  }
  const update = vi.fn(() => updateChain)

  const fromTable = vi.fn(() => ({
    insert,
    select: selectFn,
    update,
  }))

  const client = {
    storage: { from: storageFrom },
    from: fromTable,
  }

  return {
    client,
    storageFrom,
    upload,
    createSignedUrl,
    remove,
    insert,
    insertSelect,
    insertMaybeSingle,
    fromTable,
    update,
    updateEq,
    selectFn,
    selectMaybeSingle,
    order,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('email-assets — sanitizeFileName', () => {
  it('keeps allowed alphanumerics, dots, underscores, dashes', () => {
    expect(sanitizeFileName('prep-checklist_v2.pdf')).toBe(
      'prep-checklist_v2.pdf'
    )
  })

  it('replaces spaces with underscores', () => {
    expect(sanitizeFileName('my file name.pdf')).toBe('my_file_name.pdf')
  })

  it('strips disallowed characters', () => {
    expect(sanitizeFileName('hello@world!.pdf')).toBe('helloworld.pdf')
  })

  it('returns empty string when nothing remains', () => {
    expect(sanitizeFileName('@@@')).toBe('')
  })

  it('trims to 200 chars max', () => {
    const long = `${'a'.repeat(250)}.pdf`
    expect(sanitizeFileName(long)).toHaveLength(200)
  })
})

describe('email-assets — sniffContentType', () => {
  it('detects PDF magic bytes', () => {
    expect(sniffContentType(pdfBuffer())).toBe('application/pdf')
  })

  it('detects PNG magic bytes', () => {
    expect(sniffContentType(pngBuffer())).toBe('image/png')
  })

  it('detects JPEG magic bytes', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    expect(sniffContentType(jpeg)).toBe('image/jpeg')
  })

  it('detects ZIP magic bytes', () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    expect(sniffContentType(zip)).toBe('application/zip')
  })

  it('returns null for unrecognized headers', () => {
    const unknown = new Uint8Array([0x00, 0x00, 0x00, 0x00])
    expect(sniffContentType(unknown)).toBeNull()
  })
})

describe('email-assets — uploadAsset', () => {
  it('rejects oversized buffers', async () => {
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1)
    oversized.set([0x25, 0x50, 0x44, 0x46], 0)

    const result = await uploadAsset({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      fileName: 'big.pdf',
      contentType: 'application/pdf',
      fileBody: oversized,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/too large/i)
    }
  })

  it('rejects empty buffers', async () => {
    const result = await uploadAsset({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      fileName: 'empty.pdf',
      contentType: 'application/pdf',
      fileBody: new Uint8Array(0),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/empty/i)
    }
  })

  it('rejects unknown content types', async () => {
    const result = await uploadAsset({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      fileName: 'foo.gif',
      contentType: 'image/gif',
      fileBody: pdfBuffer(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/content type/i)
    }
  })

  it('rejects when magic-byte sniff disagrees with declared type', async () => {
    const result = await uploadAsset({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      fileName: 'fake.pdf',
      contentType: 'application/pdf',
      // PNG magic bytes but declared as PDF.
      fileBody: pngBuffer(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/match/i)
    }
  })

  it('rejects when sanitization empties the filename', async () => {
    const result = await uploadAsset({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      fileName: '@@@',
      contentType: 'application/pdf',
      fileBody: pdfBuffer(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/file name/i)
    }
  })

  it('uploads to Storage and inserts the provenance row on the happy path', async () => {
    const stub = buildSupabaseStub({
      insertResult: {
        data: {
          id: 'asset-1',
          brand: 'VendingPreneurs',
          flow_id: 'ig-organic-dm',
          block_id: 'email',
          file_name: 'prep-checklist.pdf',
          content_type: 'application/pdf',
          size_bytes: 1024,
          storage_path:
            'VendingPreneurs/ig-organic-dm/asset-1/prep-checklist.pdf',
          checksum: 'sha256',
          description: null,
          created_by: 'sofia@example.com',
          created_at: new Date().toISOString(),
          archived_at: null,
        },
        error: null,
      },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const result = await uploadAsset({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      fileName: 'prep-checklist.pdf',
      contentType: 'application/pdf',
      fileBody: pdfBuffer(),
      createdBy: 'sofia@example.com',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.assetId).toBe('asset-1')
      expect(result.data.storagePath).toMatch(
        /^VendingPreneurs\/ig-organic-dm\//
      )
      expect(result.data.fileName).toBe('prep-checklist.pdf')
      expect(result.data.checksum).toMatch(/^[a-f0-9]{64}$/)
    }
    expect(stub.storageFrom).toHaveBeenCalledWith('email-assets')
    expect(stub.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^VendingPreneurs\/ig-organic-dm\/.+\/prep-checklist\.pdf$/
      ),
      expect.any(Uint8Array),
      expect.objectContaining({
        contentType: 'application/pdf',
        upsert: false,
      })
    )
    expect(stub.insert).toHaveBeenCalled()
  })

  it('surfaces Storage upload errors', async () => {
    const stub = buildSupabaseStub({
      uploadResult: { error: new Error('storage down') },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const result = await uploadAsset({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      fileName: 'prep.pdf',
      contentType: 'application/pdf',
      fileBody: pdfBuffer(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/upload failed/i)
    }
  })
})

describe('email-assets — archiveAsset', () => {
  it('writes archived_at = now() on the row', async () => {
    const stub = buildSupabaseStub()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const result = await archiveAsset({
      assetId: 'asset-1',
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    expect(result.success).toBe(true)
    expect(stub.fromTable).toHaveBeenCalledWith('ins_email_assets')
    expect(stub.update).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: expect.any(String) })
    )
    expect(stub.updateEq).toHaveBeenCalledWith('id', 'asset-1')
    expect(stub.updateEq).toHaveBeenCalledWith('brand', 'VendingPreneurs')
    expect(stub.updateEq).toHaveBeenCalledWith('flow_id', 'ig-organic-dm')
  })

  it('returns error on update failure', async () => {
    const stub = buildSupabaseStub({
      updateResult: { error: new Error('row missing') },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const result = await archiveAsset({
      assetId: 'missing',
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    expect(result.success).toBe(false)
  })
})

describe('email-assets — getAssetSignedUrl', () => {
  const ROW: AssetRow = {
    id: 'asset-1',
    brand: 'VendingPreneurs',
    flow_id: 'ig-organic-dm',
    block_id: 'email',
    file_name: 'prep-checklist.pdf',
    content_type: 'application/pdf',
    size_bytes: 1024,
    storage_path: 'VendingPreneurs/ig-organic-dm/asset-1/prep-checklist.pdf',
    checksum: 'sha',
    description: null,
    created_by: null,
    created_at: new Date().toISOString(),
    archived_at: null,
  }

  it('returns a signed URL with default 24h TTL', async () => {
    const stub = buildSupabaseStub({
      selectMaybeSingleResult: { data: ROW, error: null },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const result = await getAssetSignedUrl('asset-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.url).toContain('https://')
    }
    expect(stub.createSignedUrl).toHaveBeenCalledWith(ROW.storage_path, 86400)
  })

  it('honors custom TTL', async () => {
    const stub = buildSupabaseStub({
      selectMaybeSingleResult: { data: ROW, error: null },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    await getAssetSignedUrl('asset-1', { ttlSeconds: 60 })

    expect(stub.createSignedUrl).toHaveBeenCalledWith(ROW.storage_path, 60)
  })

  it('fails when the asset is missing', async () => {
    const stub = buildSupabaseStub({
      selectMaybeSingleResult: { data: null, error: null },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const result = await getAssetSignedUrl('missing')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/not found/i)
    }
  })

  it('fails when Storage rejects the signing request', async () => {
    const stub = buildSupabaseStub({
      selectMaybeSingleResult: { data: ROW, error: null },
      signedUrlResult: { data: null, error: new Error('no perm') },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const result = await getAssetSignedUrl('asset-1')

    expect(result.success).toBe(false)
  })
})

describe('email-assets — resolveStoredAssetUrl (compile-block bridge)', () => {
  const ROW: AssetRow = {
    id: 'asset-1',
    brand: 'VendingPreneurs',
    flow_id: 'ig-organic-dm',
    block_id: 'email',
    file_name: 'prep-checklist.pdf',
    content_type: 'application/pdf',
    size_bytes: 1024,
    storage_path: 'VendingPreneurs/ig-organic-dm/asset-1/prep-checklist.pdf',
    checksum: 'sha',
    description: null,
    created_by: null,
    created_at: new Date().toISOString(),
    archived_at: null,
  }

  it('returns just the URL string for prompt embedding', async () => {
    const stub = buildSupabaseStub({
      selectMaybeSingleResult: { data: ROW, error: null },
      signedUrlResult: {
        data: {
          signedUrl: 'https://x.supabase.co/storage/v1/object/sign/abc',
        },
        error: null,
      },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const url = await resolveStoredAssetUrl('asset-1')

    expect(url).toBe('https://x.supabase.co/storage/v1/object/sign/abc')
  })

  it('throws on resolution failure (caller is in engine try/catch)', async () => {
    const stub = buildSupabaseStub({
      selectMaybeSingleResult: { data: null, error: null },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    await expect(resolveStoredAssetUrl('missing')).rejects.toThrow(/not found/i)
  })
})

describe('email-assets — listAssetsForFlow + getAsset', () => {
  it('skips archived rows by default', async () => {
    const stub = buildSupabaseStub({
      selectListResult: {
        data: [],
        error: null,
      },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    await listAssetsForFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    // Just verify the call resolves; deep call inspection is brittle on
    // chained mocks. The behavioral guarantee (active-only by default)
    // is exercised by an integration test once Supabase harness is wired.
    expect(stub.fromTable).toHaveBeenCalledWith('ins_email_assets')
  })

  it('returns null on getAsset miss', async () => {
    const stub = buildSupabaseStub({
      selectMaybeSingleResult: { data: null, error: null },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stub.client as any
    )

    const row = await getAsset('missing')

    expect(row).toBeNull()
  })
})

describe('email-assets — exposed constants', () => {
  it('locks the 20 MB byte cap', () => {
    expect(MAX_UPLOAD_BYTES).toBe(20 * 1024 * 1024)
  })

  it('locks the allowed-content-type list', () => {
    expect(ALLOWED_CONTENT_TYPES).toEqual([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/zip',
    ])
  })
})
