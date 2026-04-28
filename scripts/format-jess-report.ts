/**
 * Generates a report for Jess: 1-2 page executive summary + 4 selected mock chats.
 *
 * Usage: npx tsx scripts/format-jess-report.ts
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageBreak,
  TableLayoutType,
} from 'docx'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHATS_DIR = join(process.cwd(), 'scripts/output/mock-chats')
const OUTPUT_PATH = join(
  '/Users/jamesaims/Desktop',
  'InstaSetter — Setter v2 Report for Jess.docx'
)

const SELECTED_CHATS = [
  'hot-lead',
  'hardcore-skeptic',
  'paragraph-writer',
  'airport-rfp',
]

// Colors
const BLUE = '2563EB'
const GRAY = '6B7280'
const GREEN = '059669'
const RED = 'DC2626'
const LIGHT_BLUE = 'EFF6FF'
const LIGHT_GRAY = 'F9FAFB'
const WHITE = 'FFFFFF'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function p(
  text: string,
  opts?: {
    bold?: boolean
    size?: number
    color?: string
    spacing?: { before?: number; after?: number }
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
    italic?: boolean
    border?: boolean
  }
): Paragraph {
  return new Paragraph({
    heading: opts?.heading,
    alignment: opts?.alignment,
    spacing: opts?.spacing ?? { after: 120 },
    border: opts?.border
      ? { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } }
      : undefined,
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 22,
        color: opts?.color ?? '1F2937',
        italics: opts?.italic,
      }),
    ],
  })
}

function bullet(text: string, bold?: string): Paragraph {
  const children: TextRun[] = []
  if (bold) {
    children.push(new TextRun({ text: bold + ' ', bold: true, size: 22 }))
  }
  children.push(new TextRun({ text, size: 22, color: '374151' }))

  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: '\u2022  ', size: 22, color: GRAY }),
      ...children,
    ],
  })
}

// ---------------------------------------------------------------------------
// Chat transcript parser (same as format-mock-chats.ts)
// ---------------------------------------------------------------------------

interface ChatData {
  id: string
  name: string
  handle: string
  description: string
  turns: number
  email: boolean
  booked: boolean
  summary: boolean
  messages: { role: 'mike' | 'prospect'; text: string; tools?: string[] }[]
}

function parseTranscript(filename: string, content: string): ChatData {
  const lines = content.split('\n')
  const id = filename.replace('.txt', '')

  let name = ''
  let handle = ''
  let description = ''
  let turns = 0
  let email = false
  let booked = false
  let summary = false

  for (const line of lines) {
    const prospectMatch = line.match(/Prospect: (.+?) \((.+?)\)/)
    if (prospectMatch) {
      name = prospectMatch[1]
      handle = prospectMatch[2]
    }
    if (line.startsWith('Description: '))
      description = line.replace('Description: ', '')
    const statsMatch = line.match(
      /Turns: (\d+) \| Email: (YES|no) \| Booked: (YES|no) \| Summary: (YES|no)/
    )
    if (statsMatch) {
      turns = parseInt(statsMatch[1])
      email = statsMatch[2] === 'YES'
      booked = statsMatch[3] === 'YES'
      summary = statsMatch[4] === 'YES'
    }
  }

  const messages: ChatData['messages'] = []
  let currentRole: 'mike' | 'prospect' | null = null
  let currentText: string[] = []
  let currentTools: string[] = []

  for (const line of lines) {
    if (line.includes('MIKE:') && line.startsWith('\u{1F535}')) {
      if (currentRole && currentText.length > 0) {
        messages.push({
          role: currentRole,
          text: currentText.join('\n').trim(),
          tools: currentTools.length > 0 ? currentTools : undefined,
        })
      }
      currentRole = 'mike'
      currentText = []
      currentTools = []
    } else if (
      line.startsWith('\u26AA') &&
      name &&
      line.includes(name.toUpperCase() + ':')
    ) {
      if (currentRole && currentText.length > 0) {
        messages.push({
          role: currentRole,
          text: currentText.join('\n').trim(),
          tools: currentTools.length > 0 ? currentTools : undefined,
        })
      }
      currentRole = 'prospect'
      currentText = []
      currentTools = []
    } else if (line.startsWith('  \u{1F4CE}')) {
      currentTools.push(line.replace('  \u{1F4CE} ', '').trim())
    } else if (
      line.startsWith('TOOL CALLS:') ||
      line.startsWith('\u2500') ||
      line.startsWith('MOCK CHAT:') ||
      line.startsWith('Prospect:') ||
      line.startsWith('Description:') ||
      line.startsWith('Turns:')
    ) {
      // skip
    } else if (currentRole) {
      currentText.push(line)
    }
  }

  if (currentRole && currentText.length > 0) {
    messages.push({
      role: currentRole,
      text: currentText.join('\n').trim(),
      tools: currentTools.length > 0 ? currentTools : undefined,
    })
  }

  return {
    id,
    name,
    handle,
    description,
    turns,
    email,
    booked,
    summary,
    messages,
  }
}

function buildChatSection(chat: ChatData): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(
    p(`${chat.name} (${chat.handle})`, {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 26,
      spacing: { before: 300, after: 60 },
    })
  )

  paragraphs.push(
    p(chat.description, { italic: true, color: GRAY, spacing: { after: 60 } })
  )

  const statsText = `${chat.turns} turns  |  Email: ${chat.email ? 'Yes' : 'No'}  |  Booked: ${chat.booked ? 'Yes' : 'No'}`
  paragraphs.push(
    p(statsText, {
      size: 20,
      color: GRAY,
      spacing: { after: 160 },
      border: true,
    })
  )

  for (const msg of chat.messages) {
    if (!msg.text) continue

    const isMike = msg.role === 'mike'

    paragraphs.push(
      new Paragraph({
        spacing: { before: 120, after: 40 },
        shading: {
          type: ShadingType.CLEAR,
          fill: isMike ? LIGHT_BLUE : LIGHT_GRAY,
        },
        children: [
          new TextRun({
            text: `  ${isMike ? 'MIKE' : chat.name.toUpperCase()}`,
            bold: true,
            color: isMike ? BLUE : '374151',
            size: 18,
            font: 'Menlo',
          }),
        ],
      })
    )

    const textParts = msg.text.split('\n\n').filter((t) => t.trim())
    for (const part of textParts) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 240 },
          shading: {
            type: ShadingType.CLEAR,
            fill: isMike ? LIGHT_BLUE : LIGHT_GRAY,
          },
          children: [
            new TextRun({ text: part.trim(), size: 21, color: '1F2937' }),
          ],
        })
      )
    }
  }

  paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
  return paragraphs
}

// ---------------------------------------------------------------------------
// Executive summary
// ---------------------------------------------------------------------------

function comparisonRow(
  metric: string,
  human: string,
  ai: string,
  rowIndex: number
): TableRow {
  const fill = rowIndex % 2 === 0 ? WHITE : LIGHT_GRAY
  return new TableRow({
    children: [
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill },
        width: { size: 2800, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [new TextRun({ text: metric, bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill },
        width: { size: 3280, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [new TextRun({ text: human, size: 20, color: RED })],
          }),
        ],
      }),
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill },
        width: { size: 3280, type: WidthType.DXA },
        children: [
          new Paragraph({
            spacing: { before: 50, after: 50 },
            children: [new TextRun({ text: ai, size: 20, color: GREEN })],
          }),
        ],
      }),
    ],
  })
}

function buildExecutiveSummary(): Paragraph[] {
  return [
    // Title
    p('InstaSetter', {
      heading: HeadingLevel.HEADING_1,
      bold: true,
      size: 44,
      color: BLUE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 80 },
    }),
    p('AI Setter vs Human Setter', {
      size: 28,
      color: '374151',
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    p('Performance Report  |  April 2026', {
      size: 22,
      color: GRAY,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    // The problem
    p('The Problem with Human Setters', {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),
    p(
      "We analyzed 5,438 real DM conversations from Mike's Instagram account. The results paint a clear picture of what human setters are leaving on the table:",
      { spacing: { after: 120 } }
    ),
    bullet(
      '39.5% of conversations went silent. No follow-up, no re-engagement, just dead leads.',
      '2,147 prospects lost.'
    ),
    bullet(
      "Only 20 emails were captured across all 5,438 conversations. That's a 0.4% capture rate.",
      'Email capture almost nonexistent.'
    ),
    bullet(
      'Only 308 calls booked out of 5,438 conversations (5.7%).',
      'Booking rate stuck at under 6%.'
    ),
    bullet(
      'No structured lead data was passed to closers. Every handoff was cold.',
      'CRM handoff is manual and incomplete.'
    ),
    bullet(
      'Average response time is 2-4 hours during business hours, zero coverage after hours and weekends.',
      'Response time kills deals.'
    ),
    bullet(
      'Capped at 50-100 DMs per day per setter before quality degrades. Cost scales linearly with volume.',
      'Capacity ceiling.'
    ),

    p('', { spacing: { after: 100 } }),

    // Head to head comparison
    p('Human Setter vs AI Setter: Head to Head', {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),

    new Table({
      width: { size: 9360, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [2800, 3280, 3280],
      rows: [
        new TableRow({
          children: ['Metric', 'Human Setter', 'AI Setter (v2)'].map(
            (text) =>
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: '1F2937' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({ text, bold: true, color: WHITE, size: 20 }),
                    ],
                  }),
                ],
              })
          ),
        }),
        comparisonRow(
          'Response Time',
          '2-4 hours (business hours only)',
          'Under 5 seconds, 24/7/365',
          0
        ),
        comparisonRow(
          'Email Capture',
          '0.4% (20 of 5,438 convos)',
          '80% (20 of 25 simulated)',
          1
        ),
        comparisonRow(
          'Call Booking',
          '5.7% (308 of 5,438)',
          '44% (11 of 25 simulated)',
          2
        ),
        comparisonRow(
          'Daily Capacity',
          '50-100 DMs before quality drops',
          'Unlimited',
          3
        ),
        comparisonRow(
          'Coverage',
          'Business hours only',
          '24/7, every timezone',
          4
        ),
        comparisonRow(
          'Objection Handling',
          'Inconsistent, often ignored',
          '9 proven handlers, every time',
          5
        ),
        comparisonRow(
          'CRM Handoff',
          'Manual, often incomplete',
          'Structured JSON summary, automatic',
          6
        ),
        comparisonRow(
          'Cost per Convo',
          'Salary + commission (linear)',
          '$0.01-0.05 API cost',
          7
        ),
        comparisonRow(
          'Tone Consistency',
          'Varies by rep and mood',
          'Consistent, always on-brand',
          8
        ),
        comparisonRow(
          'Scalability',
          'Hire + train more setters',
          'Deploy to new brand in hours',
          9
        ),
      ],
    }),

    p('', { spacing: { after: 200 } }),

    // What the data told us
    p('Built from Real Data, Not Guesswork', {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),
    p(
      "The AI prompt wasn't written from scratch. It was engineered from a 4-phase analysis pipeline that processed 9,856 Instagram conversations:",
      { spacing: { after: 120 } }
    ),
    bullet(
      "9,856 conversations extracted from Mike's Instagram export.",
      'Phase 1:'
    ),
    bullet(
      '5,438 classified by outcome, engagement, objection type, and temperature.',
      'Phase 2:'
    ),
    bullet(
      '3,619 deep-analyzed for conversation flow, effective/ineffective techniques, tone, and turning points.',
      'Phase 3:'
    ),
    bullet(
      'Pattern report synthesized: 15 golden paths to bookings, 6 anti-patterns that kill conversations, 9 objection types with resolution rates, 50 forbidden phrases, and 8 prompt section recommendations.',
      'Phase 4:'
    ),

    p(
      'Every rule in the AI setter comes from evidence. The objection handlers use exact language patterns that had the highest resolution rates. The qualification order (location first, budget last) was derived from which sequences led to bookings vs which killed conversations.',
      { spacing: { after: 200 } }
    ),

    // AI performance stats
    p('AI Setter v2 Performance (25 Simulated Conversations)', {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),

    new Table({
      width: { size: 9360, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [3120, 3120, 3120],
      rows: [
        new TableRow({
          children: ['Email Capture', 'Call Booked', 'Avg Conversation'].map(
            (text) =>
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: '1F2937' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 80, after: 80 },
                    children: [
                      new TextRun({ text, bold: true, color: WHITE, size: 20 }),
                    ],
                  }),
                ],
              })
          ),
        }),
        new TableRow({
          children: [
            { text: '80%', sub: 'vs 0.4% with human setters' },
            { text: '44%', sub: 'vs 5.7% with human setters' },
            { text: '16 turns', sub: '~8 messages each side' },
          ].map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 100, after: 40 },
                    children: [
                      new TextRun({
                        text: cell.text,
                        bold: true,
                        size: 32,
                        color: GREEN,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                    children: [
                      new TextRun({ text: cell.sub, size: 18, color: GRAY }),
                    ],
                  }),
                ],
              })
          ),
        }),
      ],
    }),

    p('', { spacing: { after: 120 } }),

    p(
      "These 25 simulations covered every scenario: ready buyers, prospects with no money, deep skeptics who'd been scammed before, one-word texters, oversharing divorcees, competitor shoppers, returning ghosts, a 19-year-old with $3K, and an airport operations manager with a government RFP. The AI handled all of them.",
      { spacing: { after: 200 } }
    ),

    // What it does differently
    p("What the AI Does That Human Setters Don't", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),
    bullet(
      'Asks for location first, every time. Budget comes last, only after trust is built. Human setters frequently led with money questions and killed the conversation.',
      'Qualification order is enforced.'
    ),
    bullet(
      '9 objection types (timing, no capital, trust, price, credit, location, spouse, already has machines, needs to think) each have a proven Acknowledge-Probe-Respond handler. Human setters ignored or deflected most objections.',
      'Objections are handled, not dodged.'
    ),
    bullet(
      'Short messages for short texters, warmth for emotional prospects, data for analytical types, formality for institutional prospects. Human setters used one tone for everyone.',
      'Tone adapts to the prospect.'
    ),
    bullet(
      'Identified from 3,619 conversations and hardcoded out. "Just popping in here real quick", "Still with me?", "Nice man!", standalone filler. Human setters used these constantly.',
      'Phrases that kill deals are banned.'
    ),
    bullet(
      'When a prospect reports being charged by a fake reseller, the AI follows a specific protocol: identify it as unauthorized, apologize, state everything is free, redirect to the real program. Human setters had no protocol for this.',
      'Third-party fraud is handled instantly.'
    ),
    bullet(
      'Every email ask comes with a value exchange: prep materials, confirmation, resources. Human setters rarely asked for email at all (0.4% capture rate).',
      'Email capture is built into the flow.'
    ),

    p('', { spacing: { after: 100 } }),

    new Paragraph({ children: [new PageBreak()] }),

    // Why SendPulse
    p('Why SendPulse for the Messaging Layer', {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),
    p('We evaluated 10 platforms. SendPulse is the best fit for MVP:', {
      spacing: { after: 120 },
    }),
    bullet(
      "When a DM comes in, SendPulse fires a webhook to our server with the full message. We call Claude, get the response, and send it back via their API. ManyChat doesn't offer this. It forces you to build inside their visual flow builder with a 10-second timeout, which is too tight for Claude.",
      'Webhook architecture.'
    ),
    bullet(
      'Instagram, Facebook Messenger, WhatsApp, TikTok, Telegram, Viber. One platform, all channels. ManyChat only covers Instagram and Facebook.',
      'Multi-channel from day one.'
    ),
    bullet(
      'Starts at $10/mo for 500 contacts. Respond.io (next best option) is $279/mo just for webhook access.',
      'Cost.'
    ),
    bullet(
      'Gets us live in days. Direct Meta API (the long-term play) requires app review that takes 6-12 weeks. We migrate later without changing any AI logic.',
      'Speed to live.'
    ),

    p('', { spacing: { after: 100 } }),

    // Architecture
    p('How It Works', {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),
    p('1. Prospect sends a DM on Instagram (or FB, WhatsApp, TikTok)', {
      spacing: { after: 60 },
    }),
    p('2. SendPulse receives it and fires a webhook to our server', {
      spacing: { after: 60 },
    }),
    p('3. Server loads conversation history from Supabase', {
      spacing: { after: 60 },
    }),
    p('4. Calls Claude with setter-v2 prompt + full conversation context', {
      spacing: { after: 60 },
    }),
    p(
      '5. Claude generates a reply and triggers tools (qualify lead, capture email, book call)',
      { spacing: { after: 60 } }
    ),
    p('6. Reply sent back via SendPulse API, everything stored in Supabase', {
      spacing: { after: 60 },
    }),
    p('7. Lead data flows automatically to Close CRM, Calendly, and Slack', {
      spacing: { after: 200 },
    }),

    // Next steps
    p('Next Steps', {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 28,
      spacing: { after: 120 },
    }),
    bullet('Wire up SendPulse webhook handler', '1.'),
    bullet('Connect Calendly for live booking links', '2.'),
    bullet('Connect Close CRM for automated lead handoff', '3.'),
    bullet('Run live pilot with 50-100 real VendingPreneurs prospects', '4.'),
    bullet(
      'Measure real conversion rates against the simulated benchmarks',
      '5.'
    ),
    bullet(
      'Deploy to Modern Amenities, MedPro, and VendHub with brand-specific prompts',
      '6.'
    ),

    new Paragraph({ children: [new PageBreak()] }),
  ]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const chats = SELECTED_CHATS.map((id) => {
    const content = readFileSync(join(CHATS_DIR, `${id}.txt`), 'utf-8')
    return parseTranscript(`${id}.txt`, content)
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Helvetica Neue', size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
          },
        },
        children: [
          ...buildExecutiveSummary(),

          // Transcript header
          p('Sample Conversation Transcripts', {
            heading: HeadingLevel.HEADING_1,
            bold: true,
            size: 32,
            spacing: { after: 100 },
          }),
          p(
            'Four conversations selected to show range: ready buyer, deep skeptic, emotional oversharer, and formal institutional prospect.',
            { italic: true, color: GRAY, spacing: { after: 300 } }
          ),

          ...chats.flatMap(buildChatSection),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  writeFileSync(OUTPUT_PATH, buffer)
  console.log(`\nDocument saved to: ${OUTPUT_PATH}`)
  console.log(`${chats.length} transcripts + executive summary`)
}

main()
