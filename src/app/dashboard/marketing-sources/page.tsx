import Link from 'next/link'
import { Archive, CheckCircle2, Copy, Plus, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  buildSourceSetupValues,
  listMarketingSources,
} from '@/lib/services/marketing-sources'
import {
  archiveMarketingSourceAction,
  createMarketingSourceAction,
} from './actions'

export const revalidate = 0

const inputStyle = {
  border: '1px solid #D9DAE5',
  borderRadius: 8,
  height: 42,
  padding: '10px 11px',
  fontSize: 13,
  color: '#161528',
  background: 'white',
  boxSizing: 'border-box',
} satisfies CSSProperties

const sectionLabelStyle = {
  fontSize: 10.5,
  fontWeight: 800,
  color: '#6B6A7E',
  textTransform: 'uppercase',
  letterSpacing: 0.7,
} satisfies CSSProperties

function Field({
  name,
  label,
  required,
  placeholder,
}: {
  name: string
  label: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateRows: '18px 42px',
        gap: 5,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 11.5, fontWeight: 800, color: '#4B4A5E' }}>
        {label}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  )
}

function WorkflowStep({
  n,
  title,
  detail,
}: {
  n: string
  title: string
  detail: string
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr',
        gap: 10,
        alignItems: 'start',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: '#ECEBF7',
          color: '#3B2E72',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#161528' }}>
          {title}
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: '#6B6A7E' }}>
          {detail}
        </div>
      </div>
    </div>
  )
}

export default async function MarketingSourcesPage() {
  const sources = await listMarketingSources()

  return (
    <main
      id="main"
      tabIndex={-1}
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 40px',
        background: '#FAFAFB',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily:
                  'var(--font-instrument-serif), ui-serif, Georgia, serif',
                fontSize: 32,
                fontWeight: 400,
                margin: 0,
                color: '#161528',
              }}
            >
              Marketing Sources
            </h1>
            <p style={{ fontSize: 13, color: '#6B6A7E', margin: '4px 0 0' }}>
              Create one source for each Instagram post, ad, keyword, story
              reply, or comment trigger you want to recognize in conversations.
            </p>
          </div>
          <Link
            href="/dashboard/conversations"
            style={{ fontSize: 12, color: '#6B6A7E', textDecoration: 'none' }}
          >
            Conversations
          </Link>
        </div>

        <section
          style={{
            background: 'white',
            border: '1px solid #EEEFF3',
            borderRadius: 8,
            padding: 18,
            marginBottom: 18,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, margin: 0, color: '#161528' }}>
              Track where new Instagram chats came from
            </h2>
            <p
              style={{
                margin: '6px 0 14px',
                fontSize: 13,
                lineHeight: 1.5,
                color: '#6B6A7E',
              }}
            >
              When someone replies from a configured source, conversations show
              the source label and Claude privately understands what they are
              responding to.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              <WorkflowStep
                n="1"
                title="Define the Instagram entry point"
                detail="Name the post, ad, keyword, story reply, or comment trigger."
              />
              <WorkflowStep
                n="2"
                title="Copy the SendPulse setup"
                detail="Add the generated variables and tag to that SendPulse flow."
              />
              <WorkflowStep
                n="3"
                title="Review attributed conversations"
                detail="New chats show the campaign context without exposing internal keys to prospects."
              />
            </div>
          </div>
          <div
            style={{
              border: '1px solid #EEEFF3',
              borderRadius: 8,
              padding: 14,
              background: '#FAFAFB',
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: '#6B6A7E',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              Example conversation label
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                background: '#ECEBF7',
                color: '#3B2E72',
                fontSize: 13,
                fontWeight: 800,
                padding: '7px 11px',
              }}
            >
              Instagram · Comment Reply · Masterclass Reel
            </div>
            <p
              style={{
                margin: '12px 0 0',
                color: '#6B6A7E',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Short replies like “yes” or “tell me more” can be routed as
              interest in that specific source material.
            </p>
          </div>
        </section>

        <section
          style={{
            background: 'white',
            border: '1px solid #EEEFF3',
            borderRadius: 8,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <form action={createMarketingSourceAction}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 300px',
                gap: 22,
                alignItems: 'start',
              }}
            >
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={sectionLabelStyle}>Step 1</div>
                  <h2
                    style={{
                      fontSize: 18,
                      margin: '4px 0 0',
                      color: '#161528',
                    }}
                  >
                    Create a source
                  </h2>
                  <p
                    style={{
                      margin: '5px 0 0',
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      color: '#6B6A7E',
                    }}
                  >
                    Use this for one Instagram entry point. Required fields are
                    the pieces operators need to recognize the source later.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 14,
                  }}
                >
                  <Field
                    name="label"
                    label="Dashboard label"
                    placeholder="Masterclass Reel"
                  />
                  <Field
                    name="channel"
                    label="Lead source"
                    required
                    placeholder="Instagram"
                  />
                  <Field
                    name="campaign"
                    label="Campaign"
                    required
                    placeholder="Free Masterclass"
                  />
                  <Field
                    name="material"
                    label="Post, reel, ad, or keyword"
                    required
                    placeholder="April 24 reel: startup mistakes"
                  />
                  <Field
                    name="entryAction"
                    label="Entry action"
                    required
                    placeholder="Comment reply"
                  />
                  <Field
                    name="triggerLabel"
                    label="SendPulse trigger"
                    required
                    placeholder="comment keyword: info"
                  />
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid #EEEFF3',
                  }}
                >
                  <div style={{ ...sectionLabelStyle, marginBottom: 10 }}>
                    Optional references
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 14,
                    }}
                  >
                    <Field
                      name="postUrl"
                      label="Post URL"
                      placeholder="https://..."
                    />
                    <Field name="adId" label="Ad ID" placeholder="Optional" />
                    <Field
                      name="notes"
                      label="Notes"
                      placeholder="Internal setup notes"
                    />
                  </div>
                </div>
              </div>

              <aside
                style={{
                  border: '1px solid #EEEFF3',
                  borderRadius: 8,
                  background: '#FAFAFB',
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#161528',
                  }}
                >
                  <Sparkles aria-hidden size={15} color="#4F46BA" />
                  After saving
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                    marginTop: 12,
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: '#5D5C70',
                  }}
                >
                  <div
                    style={{
                      borderRadius: 8,
                      background: 'white',
                      border: '1px solid #EEEFF3',
                      padding: 10,
                    }}
                  >
                    <div style={{ ...sectionLabelStyle, marginBottom: 4 }}>
                      Conversation label
                    </div>
                    Instagram · Comment reply · Masterclass Reel
                  </div>
                  <div
                    style={{
                      borderRadius: 8,
                      background: 'white',
                      border: '1px solid #EEEFF3',
                      padding: 10,
                    }}
                  >
                    <div style={{ ...sectionLabelStyle, marginBottom: 4 }}>
                      Generated setup
                    </div>
                    Source key, SendPulse tag, and variables.
                  </div>
                  <div style={{ color: '#6B6A7E' }}>
                    These values stay internal. Prospects will not see tags,
                    keys, IDs, or URLs.
                  </div>
                </div>
              </aside>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 18,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="submit"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  border: 0,
                  borderRadius: 8,
                  background: '#4F46BA',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '10px 14px',
                }}
              >
                <Plus aria-hidden size={14} />
                Create source
              </button>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#6B6A7E',
                }}
              >
                <CheckCircle2 aria-hidden size={14} />
                Setup values are generated automatically.
              </div>
            </div>
          </form>
        </section>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '2px 0 12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, margin: 0, color: '#161528' }}>
              Step 2: copy setup into SendPulse
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#6B6A7E' }}>
              {sources.length} configured. Archived sources stay available for
              historical conversations.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {sources.length === 0 && (
            <section
              style={{
                background: 'white',
                border: '1px dashed #C9C9D8',
                borderRadius: 8,
                padding: 18,
                color: '#4B4A5E',
              }}
            >
              <div style={{ fontWeight: 800, color: '#161528' }}>
                No sources yet
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5 }}>
                Create your first Instagram source above. Good first sources are
                a top-performing reel, a paid ad, a story reply, or a comment
                keyword that starts a SendPulse flow.
              </p>
            </section>
          )}
          {sources.map((source) => {
            const setup = buildSourceSetupValues(source)
            return (
              <section
                key={source.id}
                style={{
                  background: 'white',
                  border: '1px solid #EEEFF3',
                  borderRadius: 8,
                  padding: 18,
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(260px, 1fr) minmax(360px, 1.4fr)',
                  gap: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 16,
                        color: '#161528',
                      }}
                    >
                      {source.label}
                    </h2>
                    <span
                      style={{
                        height: 22,
                        borderRadius: 999,
                        padding: '3px 8px',
                        background:
                          source.status === 'active' ? '#E6F4EA' : '#EEEFF3',
                        color:
                          source.status === 'active' ? '#1F6B3A' : '#4B4A5E',
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {source.status}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '6px 0 0',
                      color: '#4B4A5E',
                      fontSize: 13,
                    }}
                  >
                    {source.channel} · {source.entry_action} · {source.material}
                  </p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      color: '#6B6A7E',
                      fontSize: 12,
                    }}
                  >
                    {source.conversation_count ?? 0} conversations · key{' '}
                    <code>{source.source_key}</code>
                  </p>
                  {source.status === 'active' && (
                    <form action={archiveMarketingSourceAction}>
                      <input type="hidden" name="id" value={source.id} />
                      <button
                        type="submit"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 12,
                          border: '1px solid #D9DAE5',
                          borderRadius: 8,
                          background: 'white',
                          color: '#4B4A5E',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '7px 10px',
                        }}
                      >
                        <Archive aria-hidden size={13} />
                        Archive
                      </button>
                    </form>
                  )}
                </div>

                <div
                  style={{
                    borderLeft: '1px solid #EEEFF3',
                    paddingLeft: 18,
                    display: 'grid',
                    gap: 10,
                    fontSize: 12,
                    color: '#4B4A5E',
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#161528' }}>
                    <Copy aria-hidden size={13} style={{ marginRight: 6 }} />
                    Copy these into SendPulse
                  </div>
                  <div>
                    In the matching SendPulse flow, add an action to set these
                    variable values:
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 10,
                      borderRadius: 8,
                      background: '#F7F7FA',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(setup.variables, null, 2)}
                  </pre>
                  <div>
                    Add a second action to apply this tag:{' '}
                    <code>{setup.tag}</code>
                  </div>
                  <div>
                    Confirm global incoming message webhooks are enabled.
                  </div>
                  <div>
                    API capability check: manual flow trigger setup required for
                    v1.
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}
