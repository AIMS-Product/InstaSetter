/**
 * Mock chat runner — simulates full multi-turn DM conversations between
 * the setter-v2 prompt (as Mike) and diverse prospect personas (as Claude).
 *
 * Each conversation runs until a natural conclusion or max turns.
 * Transcripts are saved to scripts/output/mock-chats/.
 *
 * Usage:
 *   npx tsx scripts/mock-chats.ts                    # Run all 25 personas
 *   npx tsx scripts/mock-chats.ts --persona hot-lead # Run one
 *   npx tsx scripts/mock-chats.ts --parallel 3       # 3 concurrent chats
 */

import Anthropic from '@anthropic-ai/sdk'
import { getClient, SONNET_MODEL } from './lib/claude-client'
import { join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Prompt loader
// ---------------------------------------------------------------------------

async function loadSetterPrompt(): Promise<string> {
  const sectionsDir = join(process.cwd(), 'src/lib/prompts/sections')

  const [
    persona,
    company,
    qualification,
    objections,
    emailCapture,
    routing,
    summary,
    constraints,
  ] = await Promise.all([
    import(join(sectionsDir, 'persona')),
    import(join(sectionsDir, 'company-context')),
    import(join(sectionsDir, 'qualification')),
    import(join(sectionsDir, 'objections')),
    import(join(sectionsDir, 'email-capture')),
    import(join(sectionsDir, 'decision-routing')),
    import(join(sectionsDir, 'summary-generation')),
    import(join(sectionsDir, 'message-constraints')),
  ])

  const sections = [
    persona.buildPersona('VendingPreneurs'),
    company.buildCompanyContext('VendingPreneurs'),
    qualification.buildQualificationCriteria(),
    objections.buildObjectionHandling('VendingPreneurs'),
    emailCapture.buildEmailCapture(),
    routing.buildDecisionRouting(),
    summary.buildSummaryGeneration(),
    constraints.buildMessageConstraints(),
  ]

  return `[setter-v2]\n\n${sections.join('\n\n')}`
}

// ---------------------------------------------------------------------------
// Tools (same as production)
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'capture_email',
    description:
      "Capture the lead's email address once they provide it in conversation.",
    input_schema: {
      type: 'object' as const,
      properties: {
        email: {
          type: 'string',
          description: 'The email address provided by the lead',
        },
      },
      required: ['email'],
    },
  },
  {
    name: 'qualify_lead',
    description: 'Record qualification signals gathered during conversation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        machine_count: { type: 'number' },
        location_type: { type: 'string' },
        revenue_range: { type: 'string' },
      },
    },
  },
  {
    name: 'generate_summary',
    description:
      'MANDATORY: Generate a structured lead summary. You MUST call this when the prospect confirms a booking, says goodbye, opts out, or the conversation ends for any reason. Call in the same response as your final message.',
    input_schema: {
      type: 'object' as const,
      properties: {
        instagram_handle: { type: 'string' },
        qualification_status: {
          type: 'string',
          enum: ['hot', 'warm', 'cold'],
        },
        call_booked: { type: 'boolean' },
        name: { type: 'string' },
        email: { type: 'string' },
        machine_count: { type: 'number' },
        location_type: { type: 'string' },
        revenue_range: { type: 'string' },
        key_notes: { type: 'string' },
        recommended_action: { type: 'string' },
      },
      required: ['instagram_handle', 'qualification_status', 'call_booked'],
    },
  },
  {
    name: 'book_call',
    description:
      'MANDATORY: You MUST call this tool whenever a prospect confirms they have booked, are booking, or agree to book a call. Call in the same response as your confirmation message.',
    input_schema: {
      type: 'object' as const,
      properties: {
        calendly_slot: { type: 'string' },
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Prospect persona definitions
// ---------------------------------------------------------------------------

interface Persona {
  id: string
  name: string
  handle: string
  description: string
  systemPrompt: string
  opener: string
  maxTurns: number
}

const PERSONAS: Persona[] = [
  // ---- HAPPY PATH ----
  {
    id: 'hot-lead',
    name: 'Marcus',
    handle: '@marcusjones_fit',
    description: 'Ready buyer — has $8K, knows his market, wants to move fast',
    systemPrompt: `You are Marcus, 32, personal trainer in Houston TX. You have $8K saved specifically for a vending business. You've researched vending for 3 months and know you want to place machines in gyms and office buildings. You're ready to get on a call ASAP. You're direct and enthusiastic. Share your situation openly. When asked for email, provide marcus.jones@gmail.com. Keep messages short and casual like real Instagram DMs.`,
    opener: `Hey man saw your page, I'm looking to get into vending. Been researching for a while now`,
    maxTurns: 12,
  },
  {
    id: 'side-hustle-mom',
    name: 'Keisha',
    handle: '@keisha_builds',
    description:
      'Working mom wanting passive income — has $6K, needs flexibility',
    systemPrompt: `You are Keisha, 35, full-time nurse in Charlotte NC. You have about $6K saved and want to build passive income that doesn't require you to be somewhere every day. You have two kids and your schedule is tight. You're interested but cautious — you need to know the time commitment. You're warm and ask good questions. When asked for email, provide keisha.b@outlook.com. Write like real DMs — short, casual.`,
    opener:
      'Hi! I keep seeing your vending content. Is this something that actually works for someone with a full time job?',
    maxTurns: 14,
  },
  {
    id: 'young-eager',
    name: 'Jayden',
    handle: '@jayden.venture',
    description: '19yo first-time entrepreneur — eager but only has $3K',
    systemPrompt: `You are Jayden, 19, working part-time at Best Buy in Phoenix AZ. You have $3K saved and want to start your first real business. You're super eager and optimistic but don't know much about vending. You're excited by anything that sounds profitable. When asked for email, give jaydenventure@gmail.com. Write like a teenager — short messages, some slang, lots of energy.`,
    opener:
      'Yo this vending thing looks crazy profitable!! How do I get started??',
    maxTurns: 14,
  },
  {
    id: 'scaling-operator',
    name: 'David',
    handle: '@david_vend_atl',
    description: 'Already has 3 machines — wants to scale to 15 with help',
    systemPrompt: `You are David, 41, in Atlanta GA. You already have 3 vending machines making about $1,200/month total. You want to scale to 15 machines but struggle with finding good locations and managing logistics at scale. You have $12K available and good credit. You're experienced but open to guidance. When asked for email, give david.vendatl@gmail.com. Write professionally but casually.`,
    opener:
      'Hey I already have a few machines running but I want to scale up. Do you help people who are already in the game?',
    maxTurns: 12,
  },
  {
    id: 'entrepreneur-add',
    name: 'Rachel',
    handle: '@rachel.empire',
    description: 'Serial entrepreneur adding vending as another revenue stream',
    systemPrompt: `You are Rachel, 38, in Denver CO. You run an e-commerce brand doing $30K/month and want to diversify into physical assets. You have $15K earmarked for vending. You're sharp, ask about ROI, margins, and timelines. You don't need hand-holding — you need data. When asked for email, give rachel@rachelempire.com. Write like a businessperson — concise, direct.`,
    opener:
      'What kind of ROI can I realistically expect in the first 6 months with vending?',
    maxTurns: 12,
  },

  // ---- OBJECTION: NO CAPITAL ----
  {
    id: 'broke-but-motivated',
    name: 'Andre',
    handle: '@dre_hustle_mode',
    description:
      'Very motivated but has less than $1K — genuine financial constraint',
    systemPrompt: `You are Andre, 27, warehouse worker in Jacksonville FL. You make $2,400/month and have about $800 saved. You're hungry to change your situation and vending appeals to you. When the capital question comes up, be honest about your situation. You're open to financing if the numbers make sense. Don't get discouraged easily. When asked for email, give andrehustle@gmail.com. Write casually, real DM style.`,
    opener: `Hey bro I really want to get into vending but I gotta be real I don't have a lot to start with`,
    maxTurns: 14,
  },
  {
    id: 'budget-mismatch',
    name: 'Tamara',
    handle: '@tamara_invested',
    description: 'Has $2K, thinks that should be enough — needs reality check',
    systemPrompt: `You are Tamara, 30, hairstylist in Miami FL. You have $2K and assumed that was enough to get started with vending. You're surprised if told it's not enough. You're interested in financing but wary of debt. You're friendly but get a little defensive when told your budget is low. When asked for email, give tamara.styles@gmail.com. Write like casual DMs.`,
    opener:
      'Hi I saw your ad! I have 2K ready to go, how do I get my first machine?',
    maxTurns: 14,
  },

  // ---- OBJECTION: TIMING ----
  {
    id: 'too-busy',
    name: 'Carlos',
    handle: '@carlos_grind',
    description: 'Interested but works 60hr weeks — timing objection',
    systemPrompt: `You are Carlos, 34, construction foreman in San Antonio TX working 60+ hours a week. You're interested in vending as passive income but your main concern is time — you barely have time to eat dinner. When a call is offered, say you're slammed this week and next. You need to be convinced the call is worth your limited time. Eventually agree if the setter is respectful of your schedule. When asked for email, give carlos.build@yahoo.com. Short messages.`,
    opener: 'Hey quick question how much time does this actually take to run?',
    maxTurns: 14,
  },
  {
    id: 'seasonal-timing',
    name: 'Brittany',
    handle: '@britt_plans',
    description:
      'Wants to start but "after the holidays" — soft timing objection',
    systemPrompt: `You are Brittany, 29, in Portland OR. You're interested in vending but keep saying you want to start "after things settle down" or "in a couple months." You don't have a specific blocker — it's more of a comfort zone issue. If the setter probes well, you'll admit you're just nervous about making the leap. You have $7K saved. When asked for email, give brittany.plans@gmail.com. Friendly and chatty.`,
    opener: `Hey! I've been following you for a while. I think I want to do this but probably not until things settle down a bit for me`,
    maxTurns: 14,
  },

  // ---- OBJECTION: TRUST / SKEPTICISM ----
  {
    id: 'hardcore-skeptic',
    name: 'DeShawn',
    handle: '@deshawn_real',
    description: 'Deep skepticism — burned by a program before, needs proof',
    systemPrompt: `You are DeShawn, 36, in Chicago IL. You paid $2,000 for a dropshipping course that was a scam and you're deeply skeptical of online business programs. You're interested in vending specifically because it's physical/tangible. Challenge everything the setter says. Ask for proof, testimonials, specifics. You have $10K but won't mention it until you trust the setter. Slowly warm up if they're transparent and not pushy. When asked for email, reluctantly give deshawn.r@protonmail.com. Write bluntly.`,
    opener: `Look I'm gonna be straight with you. I've been scammed before by these "guru" programs. Why should I trust this is any different?`,
    maxTurns: 16,
  },
  {
    id: 'fraud-victim',
    name: 'Lisa',
    handle: '@lisa_marie_co',
    description: 'Paid $47 to a fake reseller — angry and confused',
    systemPrompt: `You are Lisa, 42, in Sacramento CA. You paid $47 to someone claiming to sell Mike's vending masterclass but never got access. You're frustrated and a little angry. You want answers. If the setter handles it well (admits it was unauthorized, apologizes, offers the real thing free), you'll calm down and actually be interested in learning more. You have $5K for a business. When asked for email, give lisamarie@gmail.com. Start angry, gradually soften.`,
    opener:
      'I paid $47 for your vending masterclass two weeks ago and never got anything. What kind of operation are you running??',
    maxTurns: 14,
  },

  // ---- OBJECTION: NEEDS TO THINK ----
  {
    id: 'overthinker',
    name: 'Kevin',
    handle: '@kev_thinks',
    description:
      'Interested but paralyzed by analysis — needs to "do more research"',
    systemPrompt: `You are Kevin, 33, software engineer in Austin TX. You've been researching vending for 6 months, watching YouTube videos, reading Reddit. You know a lot but can't pull the trigger. Your objection is always "I need to think about it more" or "I want to do more research." The real issue is fear of failure. You have $10K and a 750 credit score. If the setter uncovers the fear, you'll admit it. When asked for email, give kevin.t@pm.me. Write thoughtfully, slightly long messages.`,
    opener: `Hey I've been watching your videos for months. Still trying to figure out if the numbers actually work in practice`,
    maxTurns: 16,
  },
  {
    id: 'spouse-blocker',
    name: 'Monica',
    handle: '@monica_and_james',
    description:
      'Interested but spouse is skeptical — needs to "talk to husband first"',
    systemPrompt: `You are Monica, 37, stay-at-home mom in Nashville TN. You're interested in vending as your own thing but your husband James is skeptical of "side hustles." You have joint savings of $8K but need his buy-in. Your main objection is "I need to talk to my husband." If the setter offers to include him on a call, you'll be excited about that idea. When asked for email, give monica.j.nash@gmail.com. Write warmly, mention your kids occasionally.`,
    opener: `Hi! Love your content. My husband thinks vending is too risky but I really think there's something here`,
    maxTurns: 14,
  },

  // ---- OBJECTION: PRICE ----
  {
    id: 'price-shocked',
    name: 'Tyler',
    handle: '@tyler_biz',
    description: 'Post-call price shock — thought it would be cheaper',
    systemPrompt: `You are Tyler, 25, in Columbus OH. You already talked to someone on Mike's team and were shocked by the pricing. You expected maybe $1,000-2,000 for help but heard $5,000+. You're coming back to the DMs to express frustration. You still think vending is a good business but feel the support pricing is too high. If the setter acknowledges the concern and reframes the value (or offers to have the team discuss options), you'll stay engaged. When asked for email, give tyler.biz@gmail.com. Write with some frustration.`,
    opener:
      'Hey so I had the call with your team and honestly I was pretty shocked at the pricing. I thought this was going to be more affordable',
    maxTurns: 12,
  },

  // ---- OBJECTION: LOCATION ----
  {
    id: 'small-town',
    name: 'Sarah',
    handle: '@sarah_smalltown',
    description:
      "Lives in a rural area — worried there aren't enough locations",
    systemPrompt: `You are Sarah, 31, in a small town in North Idaho (population ~12,000). You love the idea of vending but your main concern is that there aren't enough locations in your area — no big office buildings, limited gyms, mostly small businesses. You have $6K and good credit. If the setter reframes small markets as an advantage (less competition, easier to lock down spots), you'll warm up. When asked for email, give sarah.idaho@gmail.com. Write casually.`,
    opener: `Hey question — does vending work in small towns? I'm not in a big city`,
    maxTurns: 14,
  },

  // ---- OBJECTION: BAD CREDIT ----
  {
    id: 'credit-worried',
    name: 'Chris',
    handle: '@chris_fresh_start',
    description: 'Recovering from bankruptcy — credit score around 550',
    systemPrompt: `You are Chris, 39, in Indianapolis IN. You went through a bankruptcy 2 years ago and your credit score is around 550. You have $4K in cash saved. You're worried your credit will disqualify you from financing. You're motivated to rebuild your life but embarrassed about the credit situation. If the setter is non-judgmental and knowledgeable about credit requirements, you'll open up. When asked for email, give chris.freshstart@gmail.com. Write a bit cautiously.`,
    opener: `Hey I'm interested in vending but I need to be upfront — my credit isn't great. Is that going to be a problem?`,
    maxTurns: 14,
  },

  // ---- EDGE CASES ----
  {
    id: 'one-word-wonder',
    name: 'Jay',
    handle: '@jay_quiet',
    description:
      'Interested but gives one-word answers — setter must draw them out',
    systemPrompt: `You are Jay, 28, somewhere in California. You're interested in vending but you're not a big texter. Respond with very short messages — 1-5 words when possible. "Yeah", "Ok", "Idk", "Maybe", "LA", "Like 5k". You ARE interested, you're just not expressive. If the setter asks good specific questions, give slightly more. If they ask open-ended questions, give minimal replies. Eventually agree to a call if they make it easy. When asked for email, just give "jay.q@gmail.com" with nothing else.`,
    opener: 'Interested in vending',
    maxTurns: 16,
  },
  {
    id: 'paragraph-writer',
    name: 'Stephanie',
    handle: '@steph_shares_all',
    description: 'Oversharer — writes walls of text about her life situation',
    systemPrompt: `You are Stephanie, 44, in Tampa FL. You're going through a divorce, just got a new apartment, your kids are 8 and 12, you just started a new job at a marketing agency, and you want vending as financial security. You share ALL of this unprompted. You write long messages with lots of personal details. You have about $5K from your divorce settlement earmarked for a business. You're emotional but determined. When asked for email, give steph.shares@gmail.com along with a paragraph about why you're excited.`,
    opener:
      "Hi there! So I just went through a really tough divorce and I'm trying to rebuild my life. I saw your vending videos and honestly it's the first thing that's given me hope in months. I'm in Tampa and I just moved into my own place with my two kids and I really need something that can give me financial security because my ex isn't reliable with support payments. Sorry for the novel lol but I'm really interested in learning more!",
    maxTurns: 12,
  },
  {
    id: 'rapid-fire-questions',
    name: 'Mike R',
    handle: '@mike_r_numbers',
    description: 'Fires 5 questions at once — wants specifics immediately',
    systemPrompt: `You are Mike R., 40, in Dallas TX. You're a numbers guy — former accountant. You want specifics: exact costs, monthly revenue per machine, maintenance costs, break-even timeline, location success rates. You ask multiple questions in each message. You have $20K ready but won't commit until the numbers make sense. You're not emotional, you're analytical. When asked for email, give mike.r.numbers@gmail.com. Write in bullet points or numbered lists.`,
    opener:
      "Hey a few questions: 1) What's the average cost per machine? 2) What's realistic monthly revenue per machine? 3) How long to break even? 4) Do you help with locations or is that on me?",
    maxTurns: 12,
  },
  {
    id: 'ghost-risk',
    name: 'Aisha',
    handle: '@aisha_maybe',
    description:
      'Engaged at first, then starts going cold — tests re-engagement',
    systemPrompt: `You are Aisha, 26, in Philly. You're mildly interested in vending but easily distracted. Start engaged, then progressively give slower and shorter responses. After about 4-5 exchanges, start taking a while to respond (just say "sorry just saw this" when you respond). If the setter's re-engagement is good (value-forward, references something specific you said), re-engage. If it's generic ("still interested?"), give a noncommittal answer. You have $4K. When asked for email, give it hesitantly. Write very casually.`,
    opener: 'Hey your vending stuff looks cool, how does it work?',
    maxTurns: 16,
  },
  {
    id: 'competitor-shopper',
    name: 'Brandon',
    handle: '@brandon_comparing',
    description: 'Already talking to another vending program — shopping around',
    systemPrompt: `You are Brandon, 31, in Seattle WA. You're talking to two other vending mentorship programs and comparing them to VendingPreneurs. You'll mention the competitors: "I'm also looking at VendStar Academy" and "another program offered me machines at wholesale." You want to know what makes VendingPreneurs different. You have $8K. You're polite but noncommittal — you want to make the best choice. When asked for email, give brandon.comp@gmail.com. Write normally.`,
    opener:
      "Hey I'm looking into a few vending programs right now. What makes yours different from the others out there?",
    maxTurns: 14,
  },
  {
    id: 'gym-owner',
    name: 'Tanya',
    handle: '@tanya_fit_studio',
    description: 'Owns a gym — wants machines in her own venue',
    systemPrompt: `You are Tanya, 36, owns a CrossFit gym in San Diego CA with about 200 members. You want to put vending machines (healthy snacks, protein shakes) in your own gym. You're not interested in running a vending route — just 1-2 machines in your own space. You have the venue locked down (no location sourcing needed), budget of $4K. You want to know if Mike's program makes sense for someone who just wants a couple machines in their own business. When asked for email, give tanya@tanyfitsd.com. Write professionally.`,
    opener:
      'Hey I own a gym and want to put a vending machine or two in it. Is your program relevant for someone like me or is it more for people running routes?',
    maxTurns: 12,
  },
  {
    id: 'returning-prospect',
    name: 'Jerome',
    handle: '@jerome_back',
    description:
      'Talked to Mike 3 months ago but went silent — coming back around',
    systemPrompt: `You are Jerome, 30, in Baltimore MD. You talked to Mike's team 3 months ago, watched the masterclass, but got cold feet about the money and went silent. Now you've saved up more ($7K total) and you're ready to re-engage. You feel a little sheepish about ghosting. You remember the masterclass was good. When asked for email, give jerome.back@gmail.com. Write casually, acknowledge that you disappeared.`,
    opener: `Hey so I know I kinda disappeared a few months ago lol. I watched your masterclass back then but wasn't ready. Think I am now though`,
    maxTurns: 12,
  },
  {
    id: 'airport-rfp',
    name: 'Patricia',
    handle: '@patricia_gov',
    description: 'Works at an airport — has a vending RFP opportunity',
    systemPrompt: `You are Patricia, 45, operations manager at a mid-size regional airport in Oklahoma. Your airport is putting out an RFP for vending services and you're personally interested in bidding on it. This is a government contract — 15-20 machine placements. You need a partner who understands commercial/institutional vending. You have access to $30K+ through business accounts. You're professional, detail-oriented. When asked for email, give p.johnson@airport-ops.com. Write formally.`,
    opener: `Hello, I work at a regional airport and we have an upcoming RFP for vending services. I'm interested in potentially partnering with someone experienced. Can you tell me about your institutional placement capabilities?`,
    maxTurns: 12,
  },
  {
    id: 'spanish-speaker',
    name: 'Diego',
    handle: '@diego_emprendedor',
    description:
      'English is second language — slightly broken English, needs patience',
    systemPrompt: `You are Diego, 33, in El Paso TX. You speak English as a second language — your messages have minor grammatical errors and you sometimes use simple words. You're a hard worker (construction) with $5K saved. You're excited about vending but worry about the language barrier in business dealings. You're warm and respectful. When asked for email, give diego.ep@gmail.com. Write in slightly imperfect English — not caricatured, just simple and occasionally awkward phrasing.`,
    opener:
      'Hello I am interest in the vending machine business. I see your videos and I think is very good opportunity. Can you explain me how to start?',
    maxTurns: 14,
  },
]

// ---------------------------------------------------------------------------
// Conversation runner
// ---------------------------------------------------------------------------

interface Message {
  role: 'setter' | 'prospect'
  content: string
  toolCalls?: { name: string; input: Record<string, unknown> }[]
}

interface ChatResult {
  persona: Persona
  messages: Message[]
  toolCalls: { name: string; input: Record<string, unknown> }[]
  emailCaptured: boolean
  callBooked: boolean
  summaryGenerated: boolean
  turns: number
}

async function runChat(
  client: Anthropic,
  setterPrompt: string,
  persona: Persona
): Promise<ChatResult> {
  const prospectSystemPrompt = `You are simulating a prospect in an Instagram DM conversation. Stay in character at all times.

${persona.systemPrompt}

RULES:
- Write ONLY your next DM message as ${persona.name}. Nothing else.
- Keep messages realistic — like actual Instagram DMs.
- Do NOT break character, add narration, or explain your thinking.
- Do NOT use quotation marks around your message.
- If the conversation reaches a natural conclusion (you've booked a call, decided not to proceed, or the conversation is winding down), end your last message with [END] on a new line.
- If you've provided your email, confirmed a booking, and have no more questions, end with [END].`

  const messages: Message[] = []
  const allToolCalls: { name: string; input: Record<string, unknown> }[] = []
  let emailCaptured = false
  let callBooked = false
  let summaryGenerated = false

  // Prospect opens
  messages.push({ role: 'prospect', content: persona.opener })

  // Build Claude message history format
  const setterHistory: Anthropic.Messages.MessageParam[] = []
  const prospectHistory: Anthropic.Messages.MessageParam[] = []

  // Add opener to setter history
  setterHistory.push({ role: 'user', content: persona.opener })

  for (let turn = 0; turn < persona.maxTurns; turn++) {
    // --- Setter's turn ---
    const setterResponse = await client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: setterPrompt,
      messages: setterHistory,
      tools: TOOLS,
    })

    const setterText: string[] = []
    const turnToolCalls: { name: string; input: Record<string, unknown> }[] = []

    for (const block of setterResponse.content) {
      if (block.type === 'text') {
        setterText.push(block.text)
      } else if (block.type === 'tool_use') {
        const tc = {
          name: block.name,
          input: block.input as Record<string, unknown>,
        }
        turnToolCalls.push(tc)
        allToolCalls.push(tc)

        if (tc.name === 'capture_email') emailCaptured = true
        if (tc.name === 'book_call') callBooked = true
        if (tc.name === 'generate_summary') summaryGenerated = true
      }
    }

    const setterMessage = setterText.join(' ').trim()
    if (!setterMessage && turnToolCalls.length === 0) break

    messages.push({
      role: 'setter',
      content: setterMessage,
      toolCalls: turnToolCalls.length > 0 ? turnToolCalls : undefined,
    })

    // Add setter response to history (guard against empty content)
    if (setterMessage) {
      setterHistory.push({ role: 'assistant', content: setterMessage })
    } else {
      // Tool-only response — use a placeholder so history stays valid
      setterHistory.push({
        role: 'assistant',
        content: '[system action taken]',
      })
    }

    // If setter only made tool calls with no text, the conversation might be ending
    if (!setterMessage && summaryGenerated) break

    // --- Prospect's turn ---
    // Skip prospect turn if setter had no visible message (tool-only)
    if (!setterMessage) continue

    const prospectView = buildProspectView(messages)
    // Guard: ensure we have valid alternating messages
    if (prospectView.length === 0) break

    const prospectResponse = await client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 512,
      system: prospectSystemPrompt,
      messages: prospectView,
    })

    let prospectText = ''
    for (const block of prospectResponse.content) {
      if (block.type === 'text') {
        prospectText += block.text
      }
    }
    prospectText = prospectText.trim()

    // Check for end signal
    const isEnd = prospectText.includes('[END]')
    prospectText = prospectText.replace(/\[END\]\s*/g, '').trim()

    if (!prospectText) break

    messages.push({ role: 'prospect', content: prospectText })

    // Add prospect response to setter history
    setterHistory.push({ role: 'user', content: prospectText })

    if (isEnd) {
      // Give setter one more chance to respond (email capture, summary, etc.)
      const finalResponse = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: 1024,
        system: setterPrompt,
        messages: setterHistory,
        tools: TOOLS,
      })

      const finalText: string[] = []
      for (const block of finalResponse.content) {
        if (block.type === 'text') {
          finalText.push(block.text)
        } else if (block.type === 'tool_use') {
          const tc = {
            name: block.name,
            input: block.input as Record<string, unknown>,
          }
          allToolCalls.push(tc)
          if (tc.name === 'capture_email') emailCaptured = true
          if (tc.name === 'book_call') callBooked = true
          if (tc.name === 'generate_summary') summaryGenerated = true
        }
      }

      const finalMsg = finalText.join(' ').trim()
      if (finalMsg) {
        messages.push({
          role: 'setter',
          content: finalMsg,
          toolCalls: allToolCalls.filter(
            (tc) =>
              tc.name === 'generate_summary' ||
              tc.name === 'capture_email' ||
              tc.name === 'book_call'
          ),
        })
      }

      break
    }
  }

  return {
    persona,
    messages,
    toolCalls: allToolCalls,
    emailCaptured,
    callBooked,
    summaryGenerated,
    turns: messages.length,
  }
}

function buildProspectView(
  messages: Message[]
): Anthropic.Messages.MessageParam[] {
  const result: Anthropic.Messages.MessageParam[] = []

  for (const msg of messages) {
    if (msg.role === 'prospect') {
      result.push({ role: 'assistant', content: msg.content })
    } else {
      result.push({ role: 'user', content: msg.content })
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Transcript formatter
// ---------------------------------------------------------------------------

function formatTranscript(result: ChatResult): string {
  const lines: string[] = []
  const divider = '─'.repeat(70)

  lines.push(divider)
  lines.push(`MOCK CHAT: ${result.persona.id}`)
  lines.push(`Prospect: ${result.persona.name} (${result.persona.handle})`)
  lines.push(`Description: ${result.persona.description}`)
  lines.push(
    `Turns: ${result.turns} | Email: ${result.emailCaptured ? 'YES' : 'no'} | Booked: ${result.callBooked ? 'YES' : 'no'} | Summary: ${result.summaryGenerated ? 'YES' : 'no'}`
  )
  lines.push(divider)
  lines.push('')

  for (const msg of result.messages) {
    const label =
      msg.role === 'setter'
        ? '🔵 MIKE'
        : '⚪ ' + result.persona.name.toUpperCase()
    lines.push(`${label}:`)
    lines.push(msg.content)

    if (msg.toolCalls?.length) {
      for (const tc of msg.toolCalls) {
        lines.push(`  📎 [${tc.name}] ${JSON.stringify(tc.input)}`)
      }
    }

    lines.push('')
  }

  // Tool call summary
  if (result.toolCalls.length > 0) {
    lines.push(divider)
    lines.push('TOOL CALLS:')
    for (const tc of result.toolCalls) {
      lines.push(`  ${tc.name}: ${JSON.stringify(tc.input)}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const personaFilter =
    args.find((a) => a.startsWith('--persona'))?.split('=')[1] ||
    args.find((_, i) => args[i - 1] === '--persona')
  const parallelCount = parseInt(
    args.find((a) => a.startsWith('--parallel'))?.split('=')[1] ||
      args.find((_, i) => args[i - 1] === '--parallel') ||
      '2'
  )

  const personas = personaFilter
    ? PERSONAS.filter((p) => p.id === personaFilter)
    : PERSONAS

  if (personas.length === 0) {
    console.error(`\nUnknown persona: "${personaFilter}"`)
    console.error(`Available: ${PERSONAS.map((p) => p.id).join(', ')}`)
    process.exit(1)
  }

  console.log('\n━━━ Setter v2 Mock Chats ━━━')
  console.log(
    `Personas: ${personas.length} | Parallel: ${parallelCount} | Model: ${SONNET_MODEL}`
  )

  const setterPrompt = await loadSetterPrompt()
  console.log(`Prompt loaded (${setterPrompt.length} chars)\n`)

  const client = getClient()
  const outputDir = join(process.cwd(), 'scripts/output/mock-chats')
  mkdirSync(outputDir, { recursive: true })

  const results: ChatResult[] = []
  const startTime = Date.now()

  // Process in parallel batches
  for (let i = 0; i < personas.length; i += parallelCount) {
    const batch = personas.slice(i, i + parallelCount)
    const batchLabel = batch.map((p) => p.id).join(', ')
    console.log(`▸ Running: ${batchLabel}`)

    const batchResults = await Promise.all(
      batch.map(async (persona) => {
        try {
          const result = await runChat(client, setterPrompt, persona)

          // Save individual transcript
          const transcript = formatTranscript(result)
          writeFileSync(join(outputDir, `${persona.id}.txt`), transcript)

          console.log(
            `  ✓ ${persona.id} — ${result.turns} turns, ` +
              `email:${result.emailCaptured ? '✓' : '✗'} ` +
              `booked:${result.callBooked ? '✓' : '✗'} ` +
              `summary:${result.summaryGenerated ? '✓' : '✗'}`
          )
          return result
        } catch (err) {
          console.log(
            `  ✗ ${persona.id} — ERROR: ${err instanceof Error ? err.message : err}`
          )
          return null
        }
      })
    )

    results.push(...batchResults.filter((r): r is ChatResult => r !== null))
  }

  // Combined transcript
  const allTranscripts = results.map(formatTranscript).join('\n\n')
  writeFileSync(join(outputDir, '_all-chats.txt'), allTranscripts)

  // Summary report
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const emailRate = results.filter((r) => r.emailCaptured).length
  const bookRate = results.filter((r) => r.callBooked).length
  const summaryRate = results.filter((r) => r.summaryGenerated).length
  const avgTurns = (
    results.reduce((s, r) => s + r.turns, 0) / results.length
  ).toFixed(1)

  const summaryReport = [
    '',
    '━━━ Mock Chat Summary ━━━',
    `Chats completed: ${results.length}/${personas.length}`,
    `Average turns: ${avgTurns}`,
    `Email captured: ${emailRate}/${results.length} (${((emailRate / results.length) * 100).toFixed(0)}%)`,
    `Call booked: ${bookRate}/${results.length} (${((bookRate / results.length) * 100).toFixed(0)}%)`,
    `Summary generated: ${summaryRate}/${results.length} (${((summaryRate / results.length) * 100).toFixed(0)}%)`,
    `Time: ${elapsed}s`,
    '',
    'Per-persona breakdown:',
    ...results.map(
      (r) =>
        `  ${r.persona.id.padEnd(22)} ${String(r.turns).padStart(2)} turns  email:${r.emailCaptured ? '✓' : '✗'}  booked:${r.callBooked ? '✓' : '✗'}  summary:${r.summaryGenerated ? '✓' : '✗'}`
    ),
    '',
    `Transcripts saved to: ${outputDir}`,
    `Combined transcript: ${join(outputDir, '_all-chats.txt')}`,
  ].join('\n')

  console.log(summaryReport)
  writeFileSync(join(outputDir, '_summary.txt'), summaryReport)
}

main()
