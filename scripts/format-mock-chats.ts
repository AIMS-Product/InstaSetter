/**
 * Formats all mock chat transcripts into a nicely styled Word document.
 *
 * Usage: npx tsx scripts/format-mock-chats.ts
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
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHATS_DIR = join(process.cwd(), 'scripts/output/mock-chats')
const OUTPUT_PATH = join(
  '/Users/jamesaims/Desktop',
  'InstaSetter Mock Chats — Setter v2.docx'
)

// Colors
const BLUE = '2563EB'
const GRAY = '6B7280'
const GREEN = '059669'
const RED = 'DC2626'
const AMBER = 'D97706'
const LIGHT_BLUE = 'EFF6FF'
const LIGHT_GRAY = 'F9FAFB'
const WHITE = 'FFFFFF'

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

  // Parse header
  let name = ''
  let handle = ''
  let description = ''
  let turns = 0
  let email = false
  let booked = false
  let summary = false

  for (const line of lines) {
    if (line.startsWith('Prospect: ')) {
      const match = line.match(/Prospect: (.+?) \((.+?)\)/)
      if (match) {
        name = match[1]
        handle = match[2]
      }
    }
    if (line.startsWith('Description: ')) {
      description = line.replace('Description: ', '')
    }
    if (line.startsWith('Turns: ')) {
      const match = line.match(
        /Turns: (\d+) \| Email: (YES|no) \| Booked: (YES|no) \| Summary: (YES|no)/
      )
      if (match) {
        turns = parseInt(match[1])
        email = match[2] === 'YES'
        booked = match[3] === 'YES'
        summary = match[4] === 'YES'
      }
    }
  }

  // Parse messages
  const messages: ChatData['messages'] = []
  let currentRole: 'mike' | 'prospect' | null = null
  let currentText: string[] = []
  let currentTools: string[] = []
  const prospectLabel = name ? `${name.toUpperCase()}:` : null

  for (const line of lines) {
    if (
      line.startsWith('MIKE:') ||
      (line.includes('MIKE:') && line.startsWith('\u{1F535}'))
    ) {
      // Save previous message
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
      prospectLabel &&
      line.includes(prospectLabel) &&
      line.startsWith('\u26AA')
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
      // Tool call line
      currentTools.push(line.replace('  \u{1F4CE} ', '').trim())
    } else if (
      line.startsWith('TOOL CALLS:') ||
      line.startsWith('\u2500') ||
      line.startsWith('MOCK CHAT:') ||
      line.startsWith('Prospect:') ||
      line.startsWith('Description:') ||
      line.startsWith('Turns:')
    ) {
      // Skip header/footer lines
    } else if (currentRole) {
      currentText.push(line)
    }
  }

  // Save last message
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

function buildStatusBadge(value: boolean): TextRun {
  return new TextRun({
    text: value ? ' YES ' : ' NO ',
    bold: true,
    color: value ? GREEN : RED,
    font: 'Menlo',
    size: 18,
  })
}

function buildChatSection(chat: ChatData): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Chat title
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({
          text: `${chat.name} `,
          bold: true,
          size: 28,
          color: '111827',
        }),
        new TextRun({
          text: chat.handle,
          color: GRAY,
          size: 24,
        }),
      ],
    })
  )

  // Description
  paragraphs.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: chat.description,
          italics: true,
          color: GRAY,
          size: 22,
        }),
      ],
    })
  )

  // Stats line
  paragraphs.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${chat.turns} turns`,
          bold: true,
          size: 20,
          color: '374151',
        }),
        new TextRun({ text: '    Email: ', size: 20, color: GRAY }),
        buildStatusBadge(chat.email),
        new TextRun({ text: '    Booked: ', size: 20, color: GRAY }),
        buildStatusBadge(chat.booked),
        new TextRun({ text: '    Summary: ', size: 20, color: GRAY }),
        buildStatusBadge(chat.summary),
      ],
    })
  )

  // Separator
  paragraphs.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      },
      children: [],
    })
  )

  // Messages
  for (const msg of chat.messages) {
    if (!msg.text) continue

    const isMike = msg.role === 'mike'
    const labelColor = isMike ? BLUE : '374151'
    const label = isMike ? 'MIKE' : chat.name.toUpperCase()
    const bgColor = isMike ? LIGHT_BLUE : LIGHT_GRAY

    paragraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 40 },
        shading: { type: ShadingType.CLEAR, fill: bgColor },
        children: [
          new TextRun({
            text: `  ${label}`,
            bold: true,
            color: labelColor,
            size: 18,
            font: 'Menlo',
          }),
        ],
      })
    )

    // Message text — split by paragraphs
    const textParts = msg.text.split('\n\n').filter((p) => p.trim())
    for (const part of textParts) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 80 },
          indent: { left: 240 },
          shading: { type: ShadingType.CLEAR, fill: bgColor },
          children: [
            new TextRun({
              text: part.trim(),
              size: 21,
              color: '1F2937',
            }),
          ],
        })
      )
    }

    // Tool calls
    if (msg.tools?.length) {
      for (const tool of msg.tools) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: 480 },
            children: [
              new TextRun({
                text: `\u{1F4CE} ${tool}`,
                size: 17,
                color: AMBER,
                font: 'Menlo',
              }),
            ],
          })
        )
      }
    }
  }

  // Page break after each chat
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  return paragraphs
}

// Column widths in twips (1 inch = 1440 twips)
// Total page width ~9360 twips (6.5" printable area)
const COL_PERSONA = 5000
const COL_NARROW = 1090 // for Turns, Email, Booked, Summary

function makeHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: '1F2937' },
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment:
          text === 'Persona' ? AlignmentType.LEFT : AlignmentType.CENTER,
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text, bold: true, color: WHITE, size: 20 })],
      }),
    ],
  })
}

function makeDataCell(
  text: string,
  width: number,
  fill: string,
  align: typeof AlignmentType.LEFT | typeof AlignmentType.CENTER,
  runs: TextRun[]
): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill },
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 40, after: 40 },
        children: runs,
      }),
    ],
  })
}

function buildSummaryTable(chats: ChatData[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeHeaderCell('Persona', COL_PERSONA),
      makeHeaderCell('Turns', COL_NARROW),
      makeHeaderCell('Email', COL_NARROW),
      makeHeaderCell('Booked', COL_NARROW),
      makeHeaderCell('Summary', COL_NARROW),
    ],
  })

  const dataRows = chats.map((chat, i) => {
    const fill = i % 2 === 0 ? WHITE : LIGHT_GRAY
    const statusValues = [
      { val: chat.email },
      { val: chat.booked },
      { val: chat.summary },
    ]

    return new TableRow({
      children: [
        makeDataCell('', COL_PERSONA, fill, AlignmentType.LEFT, [
          new TextRun({ text: chat.name, bold: true, size: 20 }),
          new TextRun({ text: `  ${chat.handle}`, color: GRAY, size: 18 }),
        ]),
        makeDataCell('', COL_NARROW, fill, AlignmentType.CENTER, [
          new TextRun({ text: String(chat.turns), size: 20, color: '374151' }),
        ]),
        ...statusValues.map((s) =>
          makeDataCell('', COL_NARROW, fill, AlignmentType.CENTER, [
            new TextRun({
              text: s.val ? '\u2713' : '\u2717',
              size: 22,
              bold: true,
              color: s.val ? GREEN : RED,
            }),
          ])
        ),
      ],
    })
  })

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [COL_PERSONA, COL_NARROW, COL_NARROW, COL_NARROW, COL_NARROW],
    rows: [headerRow, ...dataRows],
  })
}

async function main() {
  // Load all chat files
  const files = readdirSync(CHATS_DIR)
    .filter((f) => f.endsWith('.txt') && !f.startsWith('_'))
    .sort()

  const chats = files.map((f) => {
    const content = readFileSync(join(CHATS_DIR, f), 'utf-8')
    return parseTranscript(f, content)
  })

  const emailCount = chats.filter((c) => c.email).length
  const bookCount = chats.filter((c) => c.booked).length
  const summaryCount = chats.filter((c) => c.summary).length
  const avgTurns = (
    chats.reduce((s, c) => s + c.turns, 0) / chats.length
  ).toFixed(1)

  // Build document
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
          // Title page
          new Paragraph({ spacing: { before: 2000 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'InstaSetter',
                bold: true,
                size: 56,
                color: BLUE,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Mock Chat Transcripts',
                size: 40,
                color: '374151',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Setter v2 System Prompt',
                size: 28,
                color: GRAY,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `${chats.length} Simulated Conversations`,
                size: 24,
                color: '374151',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: new Date().toLocaleDateString('en-AU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                size: 22,
                color: GRAY,
              }),
            ],
          }),

          // Stats summary
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            },
            children: [],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Email Capture: ', size: 24, color: GRAY }),
              new TextRun({
                text: `${emailCount}/${chats.length} (${Math.round((emailCount / chats.length) * 100)}%)`,
                bold: true,
                size: 24,
                color: GREEN,
              }),
              new TextRun({
                text: '     Call Booked: ',
                size: 24,
                color: GRAY,
              }),
              new TextRun({
                text: `${bookCount}/${chats.length} (${Math.round((bookCount / chats.length) * 100)}%)`,
                bold: true,
                size: 24,
                color: GREEN,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: 'Summary Generated: ',
                size: 24,
                color: GRAY,
              }),
              new TextRun({
                text: `${summaryCount}/${chats.length} (${Math.round((summaryCount / chats.length) * 100)}%)`,
                bold: true,
                size: 24,
                color: AMBER,
              }),
              new TextRun({ text: `     Avg Turns: `, size: 24, color: GRAY }),
              new TextRun({
                text: avgTurns,
                bold: true,
                size: 24,
                color: '374151',
              }),
            ],
          }),

          // Page break
          new Paragraph({ children: [new PageBreak()] }),

          // Overview table
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Overview',
                bold: true,
                size: 32,
                color: '111827',
              }),
            ],
          }),
          buildSummaryTable(chats),
          new Paragraph({ children: [new PageBreak()] }),

          // All chat transcripts
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Conversation Transcripts',
                bold: true,
                size: 32,
                color: '111827',
              }),
            ],
          }),

          ...chats.flatMap(buildChatSection),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  writeFileSync(OUTPUT_PATH, buffer)
  console.log(`\nDocument saved to: ${OUTPUT_PATH}`)
  console.log(
    `${chats.length} conversations, ${buffer.length.toLocaleString()} bytes`
  )
}

main()
