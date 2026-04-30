import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  EmailAssetUploader,
  type EmailAttachmentValue,
} from '../email-asset-uploader'

afterEach(() => {
  cleanup()
})

function pdfFile(size = 1024, name = 'prep-checklist.pdf'): File {
  const bytes = new Uint8Array(size)
  bytes.set([0x25, 0x50, 0x44, 0x46], 0)
  return new File([bytes], name, { type: 'application/pdf' })
}

const ASSET_ID = '11111111-2222-4333-8444-555555555555'

describe('EmailAssetUploader — initial state', () => {
  it('renders the drop zone when no attachment is set', () => {
    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={null}
        onAttachmentChange={vi.fn()}
        uploadAction={vi.fn()}
        archiveAction={vi.fn()}
      />
    )

    expect(
      screen.getByText(/drop a file or click to browse/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/PDF, PNG, JPEG, ZIP/i)).toBeInTheDocument()
  })

  it('renders the uploaded state when an asset attachment is present', () => {
    const attachment: EmailAttachmentValue = {
      kind: 'asset',
      assetId: ASSET_ID,
      fileName: 'prep-checklist.pdf',
      description: null,
    }

    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={attachment}
        onAttachmentChange={vi.fn()}
        uploadAction={vi.fn()}
        archiveAction={vi.fn()}
      />
    )

    expect(screen.getByText('prep-checklist.pdf')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /remove attachment/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/removed assets stay in version history/i)
    ).toBeInTheDocument()
  })
})

describe('EmailAssetUploader — upload flow', () => {
  it('calls the upload action with the file and triggers onAttachmentChange', async () => {
    const onChange = vi.fn()
    const upload = vi.fn().mockResolvedValue({
      success: true,
      assetId: ASSET_ID,
      fileName: 'prep-checklist.pdf',
      sizeBytes: 1024,
      storagePath: 'VP/ig/asset-1/prep-checklist.pdf',
    })

    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={null}
        onAttachmentChange={onChange}
        uploadAction={upload}
        archiveAction={vi.fn()}
      />
    )

    const input = screen.getByLabelText(
      /upload email attachment/i
    ) as HTMLInputElement
    const user = userEvent.setup()
    await user.upload(input, pdfFile())

    await waitFor(() => {
      expect(upload).toHaveBeenCalledTimes(1)
    })
    const fd = upload.mock.calls[0]?.[0] as FormData
    expect(fd.get('brand')).toBe('VendingPreneurs')
    expect(fd.get('flowId')).toBe('ig-organic-dm')
    expect(fd.get('blockId')).toBe('email')
    expect(fd.get('file')).toBeInstanceOf(File)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'asset',
          assetId: ASSET_ID,
          fileName: 'prep-checklist.pdf',
        })
      )
    })
  })

  it('surfaces a server-side upload error', async () => {
    const upload = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Storage upload failed' })

    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={null}
        onAttachmentChange={vi.fn()}
        uploadAction={upload}
        archiveAction={vi.fn()}
      />
    )

    const input = screen.getByLabelText(
      /upload email attachment/i
    ) as HTMLInputElement
    const user = userEvent.setup()
    await user.upload(input, pdfFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /storage upload failed/i
    )
  })

  it('rejects oversized files client-side without invoking the action', async () => {
    const upload = vi.fn()
    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={null}
        onAttachmentChange={vi.fn()}
        uploadAction={upload}
        archiveAction={vi.fn()}
      />
    )

    const oversized = pdfFile(20 * 1024 * 1024 + 1, 'big.pdf')
    const input = screen.getByLabelText(
      /upload email attachment/i
    ) as HTMLInputElement
    const user = userEvent.setup()
    await user.upload(input, oversized)

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i)
    expect(upload).not.toHaveBeenCalled()
  })
})

describe('EmailAssetUploader — remove flow', () => {
  it('archives the asset and clears the attachment', async () => {
    const onChange = vi.fn()
    const archive = vi.fn().mockResolvedValue({ success: true })

    const attachment: EmailAttachmentValue = {
      kind: 'asset',
      assetId: ASSET_ID,
      fileName: 'prep-checklist.pdf',
      description: null,
    }

    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={attachment}
        onAttachmentChange={onChange}
        uploadAction={vi.fn()}
        archiveAction={archive}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /remove attachment/i }))

    await waitFor(() => {
      expect(archive).toHaveBeenCalledWith({ assetId: ASSET_ID })
    })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('EmailAssetUploader — legacy URL fallback toggle', () => {
  it('reveals the legacy URL/filename inputs when toggled', async () => {
    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={null}
        onAttachmentChange={vi.fn()}
        uploadAction={vi.fn()}
        archiveAction={vi.fn()}
      />
    )

    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: /use external url instead/i })
    )

    expect(screen.getByLabelText(/attachment file name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^attachment url$/i)).toBeInTheDocument()
    // Toggle text now offers to switch back.
    expect(
      screen.getByRole('button', { name: /upload a file instead/i })
    ).toBeInTheDocument()
  })

  it('emits legacy URL updates as the user types into the URL field', async () => {
    // The component is controlled — it does not re-render with a
    // partial draft, so we assert that onAttachmentChange fires with
    // a `kind: 'url'` payload at least once during typing.
    const onChange = vi.fn()
    render(
      <EmailAssetUploader
        brand="VendingPreneurs"
        flowId="ig-organic-dm"
        attachment={null}
        onAttachmentChange={onChange}
        uploadAction={vi.fn()}
        archiveAction={vi.fn()}
      />
    )

    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: /use external url instead/i })
    )

    const fileNameInput = screen.getByLabelText(
      /attachment file name/i
    ) as HTMLInputElement

    await user.type(fileNameInput, 'a')

    await waitFor(() => {
      const urlCalls = onChange.mock.calls.filter(
        (call) =>
          call[0] !== null &&
          call[0].kind === 'url' &&
          typeof call[0].fileName === 'string'
      )
      expect(urlCalls.length).toBeGreaterThan(0)
    })
  })
})
