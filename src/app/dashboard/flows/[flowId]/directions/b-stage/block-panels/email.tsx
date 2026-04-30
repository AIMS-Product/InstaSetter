'use client'

import { useState, type CSSProperties } from 'react'
import {
  PostEmailBehaviorSchema,
  type EmailAttachment,
  type PostEmailBehavior,
} from '@/lib/prompts/post-email-behavior'
import type { EmailConfig, EmailTrigger } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'
import {
  EmailAssetUploader,
  type EmailAttachmentValue,
} from './email-asset-uploader'

const LABEL: Record<EmailTrigger['priority'], string> = {
  primary: 'Primary',
  backup: 'Backup',
  secondary: 'Secondary',
}

export function EmailPanel({
  config,
  onChange,
  brand,
  flowId,
}: {
  config: EmailConfig
  onChange?: (config: EmailConfig) => void
  brand?: string
  flowId?: string
}) {
  const [tab, setTab] = useState<EmailTrigger['priority']>(
    config.triggers[0]?.priority ?? 'primary'
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [emailTemplateDraft, setEmailTemplateDraft] = useState(
    config.postEmailBehavior.emailTemplate
  )
  const trigger =
    config.triggers.find((t) => t.priority === tab) ?? config.triggers[0]

  function commitPostEmailBehavior(next: PostEmailBehavior) {
    const parsed = PostEmailBehaviorSchema.safeParse(next)

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Invalid settings.')
      return
    }

    setValidationError(null)
    onChange?.({
      ...config,
      confirmationScript: parsed.data.confirmationMessage,
      postEmailBehavior: parsed.data,
    })
  }

  function updatePostEmailBehavior(patch: Partial<PostEmailBehavior>) {
    commitPostEmailBehavior({
      ...config.postEmailBehavior,
      ...patch,
    })
  }

  function updateEmailTemplate(
    patch: Partial<PostEmailBehavior['emailTemplate']>
  ) {
    setEmailTemplateDraft((current) => {
      const next = {
        ...current,
        ...patch,
      }

      commitPostEmailBehavior({
        ...config.postEmailBehavior,
        emailTemplate: next,
      })

      return next
    })
  }

  function setAttachment(next: EmailAttachmentValue | null) {
    setEmailTemplateDraft((currentTemplate) => {
      const nextTemplate = {
        ...currentTemplate,
        attachment: (next as EmailAttachment | null) ?? null,
      }

      commitPostEmailBehavior({
        ...config.postEmailBehavior,
        emailTemplate: nextTemplate,
      })

      return nextTemplate
    })
  }

  return (
    <>
      <PanelCard
        title="Capture triggers"
        subtitle="Three moments at which the bot is allowed to ask for email."
      >
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 4,
            background: B.lineSoft,
            borderRadius: 8,
            padding: 3,
            marginBottom: 10,
          }}
        >
          {config.triggers.map((t) => (
            <button
              key={t.priority}
              type="button"
              role="tab"
              aria-selected={tab === t.priority}
              onClick={() => setTab(t.priority)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                background: tab === t.priority ? B.panel : 'transparent',
                color: tab === t.priority ? B.ink : B.ink2,
                fontSize: 12,
                fontWeight: tab === t.priority ? 600 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {LABEL[t.priority]}
              {t.mandatory && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    color: '#8B4316',
                    fontWeight: 700,
                  }}
                >
                  ●
                </span>
              )}
            </button>
          ))}
        </div>
        {trigger && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5,
                color: B.ink3,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontSize: 10.5,
                }}
              >
                When
              </span>
              <span style={{ color: B.ink2, flex: 1 }}>{trigger.when}</span>
              {trigger.mandatory && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#8B4316',
                    background: '#FBE7D9',
                    padding: '2px 7px',
                    borderRadius: 999,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Mandatory
                </span>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: B.ink3,
                  marginBottom: 4,
                }}
              >
                Script
              </div>
              <ReadOnlyText value={trigger.script} rows={2} />
            </div>
          </div>
        )}
      </PanelCard>

      <PanelCard
        title="After email is captured"
        subtitle="Operator-owned confirmation copy and delivery context."
      >
        <label
          htmlFor="email-post-confirmation"
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: B.ink3,
          }}
        >
          After email is captured
        </label>
        <textarea
          id="email-post-confirmation"
          defaultValue={config.postEmailBehavior.confirmationMessage}
          rows={3}
          onChange={(e) =>
            updatePostEmailBehavior({ confirmationMessage: e.target.value })
          }
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '9px 11px',
            border: `1px solid ${validationError ? '#B42318' : B.line}`,
            borderRadius: 7,
            background: B.panel,
            color: B.ink,
            fontSize: 12.5,
            lineHeight: 1.5,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        {validationError && (
          <div
            role="alert"
            style={{
              marginTop: 6,
              color: '#B42318',
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            {validationError}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 10,
          }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: B.ink3 }}>
              Delivery mode
            </span>
            <select
              value={config.postEmailBehavior.deliveryMode}
              onChange={(e) =>
                updatePostEmailBehavior({
                  deliveryMode: e.target
                    .value as PostEmailBehavior['deliveryMode'],
                })
              }
              style={selectStyle}
            >
              <option value="none">None</option>
              <option value="manual">Manual</option>
              <option value="customerio">Customer.io</option>
              <option value="close">Close</option>
              <option value="webhook">Webhook</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: B.ink3 }}>
              Next step
            </span>
            <select
              value={config.postEmailBehavior.nextStep}
              onChange={(e) =>
                updatePostEmailBehavior({
                  nextStep: e.target.value as PostEmailBehavior['nextStep'],
                })
              }
              style={selectStyle}
            >
              <option value="summary">Summary</option>
              <option value="booking">Booking</option>
              <option value="nurture">Nurture</option>
              <option value="human_review">Human review</option>
            </select>
          </label>
        </div>
        <label
          style={{
            display: 'grid',
            gap: 4,
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: B.ink3 }}>
            Resource label
          </span>
          <input
            value={config.postEmailBehavior.resourceLabel ?? ''}
            onChange={(e) =>
              updatePostEmailBehavior({
                resourceLabel: e.target.value.trim() || null,
              })
            }
            placeholder="No live resource"
            style={selectStyle}
          />
        </label>
        {config.postEmailBehavior.deliveryMode === 'none' && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 10px',
              borderRadius: 7,
              background: '#FFF7E6',
              color: '#7A4B00',
              fontSize: 11.5,
              lineHeight: 1.4,
            }}
          >
            No automatic delivery is live.
          </div>
        )}
      </PanelCard>

      <PanelCard
        title="Email to send"
        subtitle="Draft content for the configured follow-up email."
      >
        <label
          htmlFor="email-template-subject"
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: B.ink3,
          }}
        >
          Email subject
        </label>
        <input
          id="email-template-subject"
          value={emailTemplateDraft.subject}
          onChange={(e) => updateEmailTemplate({ subject: e.target.value })}
          style={selectStyle}
        />
        <label
          htmlFor="email-template-body"
          style={{
            display: 'block',
            marginTop: 10,
            marginBottom: 4,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: B.ink3,
          }}
        >
          Email body
        </label>
        <textarea
          id="email-template-body"
          value={emailTemplateDraft.body}
          rows={5}
          onChange={(e) => updateEmailTemplate({ body: e.target.value })}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '9px 11px',
            border: `1px solid ${B.line}`,
            borderRadius: 7,
            background: B.panel,
            color: B.ink,
            fontSize: 12.5,
            lineHeight: 1.5,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ marginTop: 10 }}>
          {brand && flowId ? (
            <EmailAssetUploader
              brand={brand}
              flowId={flowId}
              attachment={
                (emailTemplateDraft.attachment as EmailAttachmentValue | null) ??
                null
              }
              onAttachmentChange={setAttachment}
            />
          ) : (
            <div
              style={{
                fontSize: 11,
                color: B.ink3,
                lineHeight: 1.4,
                fontStyle: 'italic',
              }}
            >
              Asset uploader needs an active flow context.
            </div>
          )}
        </div>
      </PanelCard>

      {config.hesitationScript && (
        <PanelCard title="Hesitation response">
          <ReadOnlyText value={config.hesitationScript} />
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: B.ink3,
            }}
          >
            <LockPill /> tool: capture_email called immediately after email
            received
          </div>
        </PanelCard>
      )}
    </>
  )
}

const selectStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${B.line}`,
  borderRadius: 7,
  padding: '7px 9px',
  background: B.panel,
  color: B.ink,
  fontSize: 12.5,
  fontFamily: 'inherit',
} satisfies CSSProperties
