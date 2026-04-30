'use client'

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type CSSProperties,
} from 'react'
import { B } from '../palette'
import {
  archiveEmailAssetAction,
  uploadEmailAssetAction,
  type UploadEmailAssetActionResult,
} from '../../../actions'

const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/zip',
] as const

const MAX_BYTES = 20 * 1024 * 1024

const ACCEPT_ATTR = ALLOWED_MIME.join(',')

export type AttachmentMode = 'asset' | 'url'

export interface StoredAttachmentValue {
  kind: 'asset'
  assetId: string
  fileName: string
  description: string | null
}

export interface LegacyAttachmentValue {
  kind?: 'url'
  fileName: string
  url: string
  description: string | null
}

export type EmailAttachmentValue = StoredAttachmentValue | LegacyAttachmentValue

type UploadFn = (formData: FormData) => Promise<UploadEmailAssetActionResult>
type ArchiveFn = (args: {
  assetId: string
}) => Promise<{ success: true } | { success: false; error: string }>

export interface EmailAssetUploaderProps {
  brand: string
  flowId: string
  blockId?: string
  attachment: EmailAttachmentValue | null
  onAttachmentChange: (next: EmailAttachmentValue | null) => void
  /** Override for tests. Defaults to the live Server Action. */
  uploadAction?: UploadFn
  /** Override for tests. Defaults to the live Server Action. */
  archiveAction?: ArchiveFn
}

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; fileName: string }
  | { kind: 'error'; message: string }

export function EmailAssetUploader({
  brand,
  flowId,
  blockId = 'email',
  attachment,
  onAttachmentChange,
  uploadAction = uploadEmailAssetAction,
  archiveAction = archiveEmailAssetAction,
}: EmailAssetUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [mode, setMode] = useState<AttachmentMode>(() =>
    attachment && attachment.kind === 'url' ? 'url' : 'asset'
  )
  const [uploadState, setUploadState] = useState<UploadState>({ kind: 'idle' })
  const [isDragging, setIsDragging] = useState(false)

  const isAsset = attachment?.kind === 'asset'
  const isLegacyUrl =
    attachment != null &&
    (attachment.kind === 'url' || !('assetId' in attachment))

  async function uploadFile(file: File) {
    if (file.size === 0) {
      setUploadState({ kind: 'error', message: 'File is empty' })
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadState({
        kind: 'error',
        message: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB)`,
      })
      return
    }
    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      setUploadState({
        kind: 'error',
        message: `Unsupported file type: ${file.type || 'unknown'}`,
      })
      return
    }

    setUploadState({ kind: 'uploading', fileName: file.name })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('brand', brand)
    formData.append('flowId', flowId)
    formData.append('blockId', blockId)

    try {
      const result = await uploadAction(formData)
      if (!result.success) {
        setUploadState({ kind: 'error', message: result.error })
        return
      }
      setUploadState({ kind: 'idle' })
      onAttachmentChange({
        kind: 'asset',
        assetId: result.assetId,
        fileName: result.fileName,
        description: attachment?.description ?? null,
      })
    } catch {
      setUploadState({ kind: 'error', message: 'Upload failed' })
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void uploadFile(file)
    }
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void uploadFile(file)
  }

  async function handleRemove() {
    if (!attachment || attachment.kind !== 'asset') {
      onAttachmentChange(null)
      return
    }
    const assetId = attachment.assetId
    try {
      await archiveAction({ assetId })
    } catch {
      // Even on archive failure, drop the local reference; the row
      // can be archived manually if needed. Past published-flow
      // versions still resolve via the original asset id.
    }
    onAttachmentChange(null)
  }

  function updateLegacyAttachment(patch: Partial<LegacyAttachmentValue>): void {
    const current: LegacyAttachmentValue =
      attachment && attachment.kind !== 'asset'
        ? attachment
        : { kind: 'url', fileName: '', url: '', description: null }
    const next: LegacyAttachmentValue = {
      ...current,
      ...patch,
      kind: 'url',
    }
    if (
      !next.fileName.trim() &&
      !next.url.trim() &&
      !next.description?.trim()
    ) {
      onAttachmentChange(null)
      return
    }
    onAttachmentChange(next)
  }

  function updateAssetDescription(description: string | null) {
    if (!attachment || attachment.kind !== 'asset') return
    onAttachmentChange({ ...attachment, description })
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: B.ink3,
          }}
        >
          Attachment
        </span>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'asset' ? 'url' : 'asset'))}
          aria-pressed={mode === 'url'}
          style={{
            background: 'transparent',
            border: 'none',
            color: B.accent,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          {mode === 'asset'
            ? 'Use external URL instead'
            : 'Upload a file instead'}
        </button>
      </div>

      {mode === 'asset' ? (
        <>
          {isAsset ? (
            <UploadedState
              fileName={attachment.fileName}
              description={attachment.description}
              onChangeDescription={updateAssetDescription}
              onRemove={handleRemove}
            />
          ) : (
            <DropZone
              inputId={inputId}
              inputRef={inputRef}
              isDragging={isDragging}
              uploadState={uploadState}
              onFileChange={handleFileInput}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
            />
          )}
          {uploadState.kind === 'error' && (
            <div
              role="alert"
              style={{
                marginTop: 6,
                color: '#B42318',
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              {uploadState.message}
            </div>
          )}
          {isAsset && (
            <p
              style={{
                marginTop: 6,
                fontSize: 11,
                color: B.ink3,
                lineHeight: 1.4,
              }}
            >
              Removed assets stay in version history but are hidden here.
            </p>
          )}
        </>
      ) : (
        <LegacyUrlFields
          attachment={
            attachment && attachment.kind !== 'asset' ? attachment : null
          }
          onUpdate={updateLegacyAttachment}
          onClear={() => onAttachmentChange(null)}
          isLegacyUrl={isLegacyUrl}
        />
      )}
    </div>
  )
}

function DropZone({
  inputId,
  inputRef,
  isDragging,
  uploadState,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  inputId: string
  inputRef: React.MutableRefObject<HTMLInputElement | null>
  isDragging: boolean
  uploadState: UploadState
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
}) {
  const isUploading = uploadState.kind === 'uploading'
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="region"
      aria-label="Email attachment upload area"
      style={{
        border: `1.5px dashed ${isDragging ? B.accent : B.line}`,
        background: isDragging ? B.accentSoft : B.lineSoft,
        borderRadius: 8,
        padding: '18px 12px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'background 100ms, border-color 100ms',
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        aria-label="Upload email attachment"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
      {isUploading ? (
        <div style={{ fontSize: 12, color: B.ink2 }}>
          Uploading {uploadState.fileName}…
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: B.ink2 }}>
            Drop a file or click to browse
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10.5,
              color: B.ink3,
              lineHeight: 1.4,
            }}
          >
            PDF, PNG, JPEG, ZIP — max 20 MB
          </div>
        </>
      )}
    </div>
  )
}

function UploadedState({
  fileName,
  description,
  onChangeDescription,
  onRemove,
}: {
  fileName: string
  description: string | null
  onChangeDescription: (value: string | null) => void
  onRemove: () => void
}) {
  return (
    <div
      style={{
        border: `1px solid ${B.line}`,
        borderRadius: 8,
        padding: 10,
        background: B.panel,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: B.ink,
            wordBreak: 'break-all',
          }}
        >
          {fileName}
        </div>
        <button
          type="button"
          aria-label="Remove attachment"
          onClick={onRemove}
          style={{
            background: 'transparent',
            border: `1px solid ${B.line}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: B.ink2,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Remove
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        <label
          htmlFor="email-attachment-description-asset"
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: B.ink3,
            display: 'block',
            marginBottom: 4,
          }}
        >
          Attachment description
        </label>
        <input
          id="email-attachment-description-asset"
          value={description ?? ''}
          onChange={(e) => onChangeDescription(e.target.value.trim() || null)}
          placeholder="Optional"
          style={inputStyle}
        />
      </div>
    </div>
  )
}

function LegacyUrlFields({
  attachment,
  onUpdate,
  onClear,
  isLegacyUrl,
}: {
  attachment: LegacyAttachmentValue | null
  onUpdate: (patch: Partial<LegacyAttachmentValue>) => void
  onClear: () => void
  isLegacyUrl: boolean
}) {
  return (
    <div
      style={{
        border: `1px solid ${B.line}`,
        borderRadius: 8,
        padding: 10,
        background: B.panel,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <label
          htmlFor="email-attachment-file-name"
          style={{ fontSize: 10.5, fontWeight: 700, color: B.ink3 }}
        >
          Attachment file name
        </label>
        <input
          id="email-attachment-file-name"
          value={attachment?.fileName ?? ''}
          onChange={(e) => onUpdate({ fileName: e.target.value })}
          placeholder="prep-checklist.pdf"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <label
          htmlFor="email-attachment-url"
          style={{ fontSize: 10.5, fontWeight: 700, color: B.ink3 }}
        >
          Attachment URL
        </label>
        <input
          id="email-attachment-url"
          value={attachment?.url ?? ''}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <label
          htmlFor="email-attachment-description"
          style={{ fontSize: 10.5, fontWeight: 700, color: B.ink3 }}
        >
          Attachment description
        </label>
        <input
          id="email-attachment-description"
          value={attachment?.description ?? ''}
          onChange={(e) =>
            onUpdate({ description: e.target.value.trim() || null })
          }
          placeholder="Optional"
          style={inputStyle}
        />
      </div>
      {isLegacyUrl && (
        <button
          type="button"
          onClick={onClear}
          style={{
            justifySelf: 'start',
            background: 'transparent',
            border: 'none',
            color: B.accent,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          Clear external URL
        </button>
      )}
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${B.line}`,
  borderRadius: 7,
  padding: '7px 9px',
  background: B.panel,
  color: B.ink,
  fontSize: 12.5,
  fontFamily: 'inherit',
}
