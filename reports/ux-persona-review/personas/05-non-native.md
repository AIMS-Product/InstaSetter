### Persona

Yuki, 31, Japanese software engineer. I read English well — I read English documentation every day at work. But idioms, slang, and culture-specific words slow me down. I translate in my head. When a word can mean two things, I pause. When I pause too many times, I lose the meaning of the whole sentence.

I am the user this app is not designed for. The product is for English-native marketers in the US and Canada. But I speak for every reader who is not from those places — junior staff at agencies, a brand owner in Quebec whose first language is French, anyone outside the bubble. If the words are clear for me, they will be clear for them too.

I will tell you exactly which words made me stop, and why.

---

### First impression of `/dashboard/flows/ig-organic-dm`

I open the page. The header says **"Instagram DM Flow"**. Good — I know Instagram, I know DM (direct message). "Flow" — okay, this is the canvas word, like in software diagrams. I can guess.

Then below: **"Edit the shared draft and sanity-check tone before anything ships."**

Three idioms in one sentence. I have to stop.

1. **"sanity-check"** — what is sanity? Mental health? In English-native engineering culture I have heard "sanity check" but it is jargon. A direct translation in Japanese would be "正気チェック" — this sounds rude, like "are you crazy?". Replace with "double-check" or simply "check".
2. **"before anything ships"** — ships? Like a boat? I know in English-native software this means "to release", but the verb "ship" is a metaphor. For a non-native reader the literal meaning (a boat) is the dictionary's first definition. Replace with "before publishing" or "before it goes live".
3. **"shared draft"** — shared with whom? My team? Other brands? The bot? I cannot tell from the words alone.

This is one subtitle. I have not even started. Already three things to translate.

---

### The status pills

Three small pills on the right of the header:

- **"Unpublished edits"** (orange dot)
- **"Saved to Supabase"** (green dot)
- **"Live: setter-v2"** (green dot)

Each pill uses a different word for the same idea (state of saved-ness):

- "Unpublished" — okay, I understand.
- "Saved" — okay.
- "Live" — three meanings in English: alive, live broadcast, currently active. Which one? Here it must mean "currently running in production". But I had to think.

These three pills together create more confusion than they solve. The reader has to assemble: "draft is saved to a database called Supabase, but the live version is still the previous one called setter-v2, and there are unpublished changes." That is one sentence to think about. The user has to combine three different vocabulary words to understand the same concept (release state).

Also: **"Supabase"** is a brand name. Most marketing users do not know what it is. Why do I, a marketer reviewing a flow, need to know which database the company uses? This is a leak from the engineering team into the user-facing copy. Internal vocabulary should not appear in marketer UI.

**"setter-v2"** — what is "setter"? I went and read the README. Setter = "appointment setter" = person who books appointments. So the bot is the person who sets the appointment. In Japanese business culture we do not have this exact role; the closest term is 営業アシスタント (sales assistant). A first-time user has no chance of guessing what "setter" means. The product is named **InstaSetter** so the word is everywhere. It needs an explainer somewhere on the dashboard the first time someone arrives.

---

### Brand name: VendingPreneurs

Top-right of the screen: **"VendingPreneurs"**. This is a compound word: "vending" (machines that sell things) + "entrepreneurs" (people who start businesses). I had to read it three times — the second half of the word is hidden until you parse the first half. This is the user's brand, not the product's choice, so it cannot be changed. But the dashboard does not need to render it in a small grey label with no spacing — let it breathe. Right now it sits next to a yellow "DEV" badge and looks like part of the brand name.

---

### Left navigation: the five workspace items

This is the part that hurt the most. The navigation is:

| Label     | Subtitle          |
| --------- | ----------------- |
| Flow      | Edit the draft    |
| Inbox     | Review real chats |
| Variables | Check memory      |
| Release   | What's live       |
| Bot       | Global rules      |

Each label is a single English word and each carries multiple meanings. A non-native reader has to disambiguate every one.

1. **Flow** — water flow? Process flow? Cash flow? Here it is the conversation diagram. Okay.
2. **Inbox** — email inbox? Yes I understand, email is universal.
3. **Variables** — math variables? Programming variables? Both fit here. The subtitle "Check memory" is itself confusing — whose memory? The bot's? Mine? "Memory" in Japanese (記憶) is a person's memory. A computer's memory is RAM, also called メモリ. Here it means "what the bot remembers about a person", but that meaning is not obvious until you click in. Use "Stored values" or "Saved info" instead.
4. **Release** — three meanings: (a) release someone from prison, (b) release a movie/album, (c) release software. Without a subtitle I do not know which. The subtitle "What's live" then introduces a fourth ambiguous word: "live" again. Two ambiguous words stacked together = no signal. Use **"Live version"** or **"Current release"**.
5. **Bot** — okay.

Across the five items, the subtitles use four different verbs ("Edit", "Review", "Check", "What's"), one missing verb ("Bot — Global rules"), and one of the subtitles itself contains an idiom-prone word ("memory"). Inconsistent grammar and inconsistent vocabulary make this hard to scan even for me, an engineer. A baker in Iowa with English as her first language will scan it fine. A French-Canadian brand owner won't.

---

### Footer of left nav: "Shared draft workspace."

Bottom of the left rail. **"Shared draft workspace."** with a period at the end, as if it is a complete sentence, but it is actually a label.

- "Shared" — with whom?
- "Draft" — what kind of draft?
- "Workspace" — Slack uses this word, Notion uses this word. Each app means something different by it.

Three words, no anchor. I think this is supposed to mean "this is the team's editing area, not the live version". But the words alone do not communicate that. Even my native-speaker husband, who works in software in Australia, said "Shared draft workspace" — "shared with whom?".

---

### Canvas: block titles and descriptions

Open the **Flow** tab. There are eight blocks. Reading them in order:

#### 1. OPENING → Opening

> "Greet warmly, detect initial interest, and ask for location as the first qualifier."

- **"qualifier"** — in English grammar, a qualifier modifies a word. In sales English, a "qualifier" is something that decides if a person is a good prospect. A non-native sales reader does not know the second meaning. Suggest: **"qualifying question"**.

#### 2. QUALIFIER → Qualifier

> "Collect at least two of five qualifiers through natural conversation — location first, budget last."

Same word "qualifier" repeated. Now I am sure it is sales jargon, but new readers learning the app meet "qualifier" for the first time on this canvas with no definition. There should be a tooltip or a short glossary.

#### 3. OBJECTION → Objection Handler

> "Acknowledge → probe → respond. Never skip to resolution."

Three things wrong:

- **"probe"** — in English-native sales training this is a technical term. In Japanese business "probe" translates as 探る (to feel out), which carries a slightly invasive feeling. Suggest: **"ask follow-up questions"**.
- **"skip to resolution"** — "resolution" has two meanings (high-resolution image, OR an answer). A non-native reader hits both at once. Also "skip to" is a phrasal verb. Suggest: **"do not jump straight to the answer"**.
- The arrow notation `→` is universal, that part is fine.

#### 4. BOOKING → Booking Handoff

> "Mirror back what you know, drop the booking link, and ask for email in the same message."

This is the worst sentence on the page. Three idioms in one line:

- **"Booking Handoff"** — handoff from whom to whom? Football term (American football) where the ball is passed between players. Japanese business uses 引き継ぎ (literally "take over") which is closer to "transition". Suggest: **"Booking transition"** or simply **"Booking step"**.
- **"Mirror back"** — what does this mean? In Japanese, 鏡のように映す (reflect like a mirror) is a figurative phrase that does not appear in business contexts. Here it must mean "summarise what you've heard". Suggest: **"Summarise what you've heard"**.
- **"drop the booking link"** — drop? Drop what? Drop the link on the floor? In English-native casual speech "drop a link" = "send the link". For a non-native reader the literal meaning (drop = let fall) is the first meaning. Suggest: **"send the booking link"**.

I read this sentence four times. Each idiom has to be unpicked separately, and only after I understand all three can I assemble the full meaning.

---

### Inspector panel (after clicking Opening block)

Right panel shows tabs: **Design / Routing / Triggers / Live**.

- **"Routing"** — networking term. For a marketer, "what comes next" or "next step" is clearer.
- **"Triggers"** — what triggers what? "Activates" is more universal.
- **"Live"** — fourth time we've seen this word in the UI, with potentially a different meaning here.

Below the tabs: **"Watch the prospect's energy. Don't interrogate. Ask one question — start with area. For the location gate (US/CA) just confirm city and state."**

- **"Watch the prospect's energy"** — how do you watch someone's energy in a written DM? "Energy" here is a Western pop-psychology word (vibe, mood). For a non-native reader, "energy" means electrical energy or stamina. Suggest: **"Read the prospect's mood"** or **"Match how engaged they are"**.
- **"interrogate"** — police interrogation. Heavy word. Suggest: **"don't ask too many questions in a row"**.
- **"location gate"** — gate as in fence/door. In software English a "gate" is a check that blocks something. For a non-native reader, the first meaning is the literal one. Suggest: **"location check"**.

Then on the right: a list — **"Why This Exists / Examples / Data Capture / Runtime Details"**.

- **"Why This Exists"** — okay, that is clear.
- **"Data Capture"** — capture is a strong word, like capture a soldier. Most non-native readers would understand "Captured info" or "What is collected".
- **"Runtime Details"** — runtime is a software-engineering term. For marketers it means nothing. Suggest: **"How it runs"** or hide this from non-engineering users entirely.

---

### Simulator (after clicking "Preview replies")

A small panel pops up titled **"Simulator — Live preview"**. There are two modes: **"Edit mode"** and **"Run mode"**, plus a button **"Ready to test"**.

Wait. The button on send was disabled and labelled **"Send"**, but pressing the visible **"Run"** button worked. Two verbs for the same action ("send" vs "run") in the same widget. Pick one.

Above the input field: **"Try a real prospect opener"**.

- **"prospect"** — sales jargon for "potential customer". Non-native readers know "future prospect = future possibility". The sales meaning is a US-business specific shortening.
- **"opener"** — first message. This is a word from improv comedy, dating apps, and stand-up comedy. Not a word a global business user would recognise. Suggest: **"Try a sample first message"**.

---

### Block library (palette drawer)

Opening the palette shows the categories: **"Opening / Qualifier / Objection / Booking / Email Capture / Follow-Up / Escalation / Summary"**.

- **"Escalation"** — climb up? Escalating a conflict? In support-team jargon "escalation" = pass to a senior. For a non-native reader, escalation is most often associated with conflict (an argument escalating). Suggest: **"Hand off to human"**.
- **"Follow-Up"** — okay, this one I know. Common business term.
- **"Capture"** — already mentioned above.

---

### Inbox tab — the worst label confusion

The tab is called **"Inbox"** but the page heading says **"Brand inbox"** and there is a status pill **"Brand-wide only"**. Then below, an orange notice:

> "Inbox metrics and transcripts below include all VendingPreneurs conversations until flow_id lands on the conversations table."

Words I have to translate:

- **"Brand-wide"** — "wide" means "across the whole brand", not "wide" as in physical width. Compound adjective. Suggest: **"all brand conversations"** or **"brand-level"**.
- **"flow_id lands on the conversations table"** — three idioms stacked: (a) "lands on" is a metaphor (planes land), (b) "flow_id" is a technical column name, (c) "the conversations table" is database terminology. This sentence is written for a backend engineer, not a marketer. The marketer who opens this page does not know what any of these words mean, in any language. Suggest: **"Until we can split conversations by flow, this inbox shows all conversations for VendingPreneurs."**

Then four metric cards: **STARTED TODAY / BOOKED / COMPLETED / STALLED**.

- **"STALLED"** — a car stalls. A motor stalls. A negotiation stalls. Three different mechanical meanings. For a non-native reader, the dictionary meaning is "the engine stopped working". Here it must mean "no recent activity". Suggest: **"NO REPLY"** or **"INACTIVE"**.
- **"BOOKED"** vs **"COMPLETED"** — what is the difference? Booked an appointment? Completed the conversation? Completed the booking? I cannot tell from the labels alone.

---

### Variables tab

> "A plain-English map of what the bot remembers, where those values are captured, and which details persist across conversations."

- **"plain-English map"** — "plain English" itself means "easy English", but for non-native readers it sounds like an idiom. We say "simple language" or "easy to read". Also a "map" is geographic — for a marketer, a "map" of variables is metaphorical and unclear.
- **"persist across conversations"** — "persist" is a programming term for "stays in storage". In normal English, "persist" means "to keep doing something stubbornly". Different meaning. Suggest: **"are kept across conversations"**.

The three category cards say:

- **"Brand stays put forever."** — "stays put" is an idiom meaning "does not move". For a non-native reader, the words "put" and "stays" together do not parse easily. Suggest: **"is fixed permanently"**.
- **"Contact follows a person across every conversation."** — "follows a person" sounds like stalking. Suggest: **"belongs to one person across all conversations"**.
- **"Conversation is scoped to a single thread."** — "scoped to" is engineering jargon (scope = visibility in code). Suggest: **"only applies to one conversation"**.

In the table: **"Set manually"** under "CAPTURED BY". I think this means a human typed it in. But "CAPTURED BY" headed by a verb-passive feels strange. "Source: manual" would be clearer.

The orange banner says: **"This page shows the current shared draft values and where each variable is captured. Creating variables and row-level actions is not wired yet."**

- **"row-level actions"** — table-row actions, an engineering pattern. The marketer does not know.
- **"is not wired yet"** — "wired" is electrical-cable metaphor. Engineering jargon. Suggest: **"is not built yet"** or **"is coming soon"**.

---

### Release tab

The page heading is **"Release status"**. The subtitle:

> "A marketer-facing reality check: what is saved in the shared draft, what still powers live replies, and what this screen can help you confirm today."

Five idioms:

- **"reality check"** — figurative phrase meaning "honest comparison". For a non-native reader, "reality" + "check" suggests a mental health context. We say "realistic comparison".
- **"shared draft"** — see above.
- **"powers live replies"** — "powers" as a verb (provides power to). "Live" as in live conversation. Suggest: **"is used to generate live replies"**.
- **"confirm today"** — confirm what? The verb has no clear object.

The four cards on this page each say something different about state:

| Card title                                                   | Body                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| DRAFT WORKSPACE — Unpublished edits                          | "The shared draft has editor changes that are not live in Instagram yet."                       |
| LIVE RUNTIME — Live: setter-v2                               | "New conversations still use the compiled setter-v2 prompt until publish wiring lands."         |
| PROMPT SOURCE — Compiled from src/lib/prompts/sections/\*.ts | "Prompt Reader shows the live source sections that feed setter-v2 today."                       |
| SIMULATOR — Live prompt only                                 | "In this environment the simulator runs the compiled setter-v2 prompt without draft overrides." |

Looking at this together is a vocabulary stress test:

- "shared draft", "editor changes", "not live", "live runtime", "compiled", "publish wiring lands", "prompt source", "live source sections", "feed setter-v2", "simulator", "compiled setter-v2 prompt", "draft overrides".

Twelve different words used in four cards to describe one thing: the difference between "what the marketer is editing" and "what the customers see". A non-native reader has to track twelve vocabulary items at the same time, plus the file path `src/lib/prompts/sections/*.ts` which has no business being shown to a marketer.

The fix is not to remove the page — the page is useful — but to standardise vocabulary. Pick two words: "draft" (what you are editing) and "live" (what customers see). Use only those two everywhere.

The orange banner at the top of this page also says: **"Publish controls and release history are not wired yet."** — "wired" again.

The bottom section headed **"Recommended workflow today"** — what does "today" do here? Is the recommendation different tomorrow? Suggest: **"Recommended steps"** or remove the word "today".

---

### Bot tab — Appointment Setter

Title: **"Appointment Setter"**. Subtitle: **"Inspect the global persona and guardrails behind every reply."**

- **"Inspect"** — okay, technical-sounding but acceptable.
- **"global persona"** — global as in "applies to all"? Or worldwide? "Persona" is a marketing-research word (target persona). For a non-native reader who has not done English-language marketing courses, this is unclear.
- **"guardrails"** — physical metal barriers on highways. The metaphorical meaning ("safety constraints") is a 2022-era startup vocabulary word and not universally known. Suggest: **"safety rules"** or **"limits"**.

Display name input: **"Not named — shared team inbox"**.

- The placeholder text is also a hint AND a status. Two purposes in one field, which makes it confusing. Is the field disabled? Did I just not enter a name yet? After clicking I see it is editable. Move "shared team inbox" out of the placeholder into a help label below.

Then the persona is shown in collapsed sections:

| Section                     | Status pill |
| --------------------------- | ----------- |
| Identity — HARD RULES       | LOCKED      |
| Voice                       | EDITABLE    |
| Message Length — HARD LIMIT | LOCKED      |
| Affirmation Rules           | EDITABLE    |

Three different status systems running in parallel:

- **"HARD RULES"** vs **"HARD LIMIT"** — what is the difference? Both have a lock icon. To me, "hard" suggests "difficult" first, then "strict". The word "hard" is doing too much work. We have soft drinks and hard drinks, soft science and hard science, hard work, hard luck, hardware. Each carries a different meaning. Suggest: **"FIXED RULES"** or **"NOT EDITABLE"**.
- **"LOCKED"** + **"HARD RULES"** — the icon already says locked, the badge already says HARD RULES. Two redundant signals.
- **"Affirmation Rules"** — "affirmation" is a Western therapy concept. In Japanese business there is no direct equivalent. The closest is 共感 (empathy), but the bot is not really empathising — it is acknowledging. Suggest: **"Acknowledgement Rules"** or simply **"Validation rules"**.

Inside the Voice section is the line:

> **"Tone is customisable per brand. Peer-mentor beats salesperson 3:1."**

This sentence stopped me cold for almost a minute. Let me unpack:

- **"Peer-mentor"** — a compound noun. A peer is an equal; a mentor is a teacher. So "peer-mentor" means a teacher who is your equal. Friendly senior coworker. This concept has no single word in Japanese.
- **"beats"** — the verb. Two meanings: (a) wins against, like "Japan beat Germany at football", (b) hits, like "beat a drum". Here it means (a). But for a non-native reader processing this sentence the literal violent meaning is the first to appear.
- **"3:1"** — a ratio. But ratio of what? Wins out of attempts? Conversations per minute? Without the surrounding context I genuinely cannot tell what is being measured. Looking at the source code I find it means "use the peer-mentor tone three times more than the salesperson tone". That is hard to derive from the sentence as written.

Suggest: **"Tone is configurable per brand. Sound like a friendly senior coworker, not a salesperson — about 75% friendly, 25% salesy."** — uses concrete percentages and removes the sports metaphor.

Voice content body:

- **"Match the prospect's energy and formality level."** — "energy" again. "Formality" is okay.
- **"keep yours tight"** — "keep tight" as in "keep your messages short"? In Japanese "tight" (タイト) means small/snug clothing. The verb "keep" + "tight" together is hard to parse. Suggest: **"keep your messages short too"**.
- **"Write like a real person texting, not like an essay."** — okay, this is clear and helpful. Good sentence.
- **"No em dashes."** — em dash is a punctuation term. Most non-native marketers do not know what an em dash is. Suggest showing the symbol: **"No em dashes (—). Use commas and periods."**

---

### Mobile / tablet gate

I tried opening the page on mobile (iPhone). I got a message:

> **"Flow Builder needs a desktop. Editing the flow uses a multi-panel canvas that doesn't fit on a phone or small tablet. Open this page on a screen at least 1024px wide. You can still monitor live conversations on your phone."**

This is the clearest copy on the entire app. Praise:

- The first sentence states the rule.
- The second sentence states the why.
- The third sentence states the how (specific number: 1024px).
- The fourth sentence offers an alternative ("You can still…").

This is the format every other piece of copy in the app should follow. Whoever wrote this — please write the rest of the app.

The only nitpick: "1024px" is a developer's measurement. A non-engineer brand owner does not know what 1024px looks like. They know "phone, tablet, laptop, desktop". Suggest: **"Open this page on a laptop or desktop computer."** and put "(at least 1024px wide)" in smaller grey text below.

---

### Idioms catalog

For the team's reference, here are every idiom and ambiguous word I encountered, in the order I met them. If you cannot replace them all at once, replace these ones first (highest impact first):

| #   | Phrase                                                              | Where                            | Severity | Suggested replacement                                                                      |
| --- | ------------------------------------------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| 1   | "drop the booking link"                                             | Booking block description        | Critical | "send the booking link"                                                                    |
| 2   | "flow_id lands on the conversations table"                          | Inbox banner                     | Critical | "Until we can split conversations by flow, this shows all of VendingPreneurs"              |
| 3   | "Mirror back what you know"                                         | Booking block description        | Critical | "Summarise what you've heard"                                                              |
| 4   | "Peer-mentor beats salesperson 3:1"                                 | Voice section                    | Critical | "Sound like a friendly coworker, about 75% of the time, and a salesperson 25% of the time" |
| 5   | "STALLED"                                                           | Inbox metric card                | High     | "NO REPLY" or "INACTIVE"                                                                   |
| 6   | "Booking Handoff"                                                   | Block title                      | High     | "Booking step" or "Booking transition"                                                     |
| 7   | "guardrails"                                                        | Bot subtitle                     | High     | "safety rules"                                                                             |
| 8   | "Edit the shared draft and sanity-check tone before anything ships" | Header subtitle                  | High     | "Edit the team draft and check the tone before publishing"                                 |
| 9   | "Live: setter-v2" status pill                                       | Page header                      | High     | "Currently live: setter-v2"                                                                |
| 10  | "Stays put forever"                                                 | Variables card                   | High     | "Permanent — does not change"                                                              |
| 11  | "scoped to"                                                         | Variables card                   | High     | "only applies to"                                                                          |
| 12  | "is not wired yet"                                                  | Variables banner, Release banner | High     | "is not built yet" or "coming soon"                                                        |
| 13  | "powers live replies"                                               | Release subtitle                 | High     | "is used to generate live replies"                                                         |
| 14  | "reality check"                                                     | Release subtitle                 | High     | "comparison"                                                                               |
| 15  | "qualifier" (sales sense)                                           | Multiple block descriptions      | High     | First mention should define it                                                             |
| 16  | "probe"                                                             | Objection block                  | High     | "ask follow-up questions"                                                                  |
| 17  | "skip to resolution"                                                | Objection block                  | High     | "do not jump to the answer"                                                                |
| 18  | "watch the prospect's energy"                                       | Inspector                        | High     | "match how engaged the prospect is"                                                        |
| 19  | "interrogate"                                                       | Inspector                        | High     | "ask too many questions"                                                                   |
| 20  | "location gate"                                                     | Inspector                        | High     | "location check"                                                                           |
| 21  | "data capture"                                                      | Inspector right rail             | Medium   | "what is collected"                                                                        |
| 22  | "runtime details"                                                   | Inspector right rail             | Medium   | "how it runs" or hide                                                                      |
| 23  | "Try a real prospect opener"                                        | Simulator                        | Medium   | "Try a sample first message"                                                               |
| 24  | "Send" disabled vs "Run" active                                     | Simulator                        | Medium   | Pick one verb                                                                              |
| 25  | "Brand-wide"                                                        | Inbox status pill                | Medium   | "All brand conversations"                                                                  |
| 26  | "Brand inbox" vs "Inbox" tab                                        | Inbox heading vs tab             | Medium   | Match the tab and heading                                                                  |
| 27  | "BOOKED" vs "COMPLETED"                                             | Inbox cards                      | Medium   | Disambiguate or merge                                                                      |
| 28  | "Plain-English map of what the bot remembers"                       | Variables subtitle               | Medium   | "Simple list of what the bot remembers"                                                    |
| 29  | "persist across conversations"                                      | Variables subtitle               | Medium   | "are kept across conversations"                                                            |
| 30  | "row-level actions"                                                 | Variables banner                 | Medium   | "actions per row" or remove                                                                |
| 31  | "Saved to Supabase"                                                 | Header status pill               | Medium   | "Saved" (drop "to Supabase" — internal)                                                    |
| 32  | "Escalation"                                                        | Block library                    | Medium   | "Hand off to human"                                                                        |
| 33  | "global persona"                                                    | Bot subtitle                     | Medium   | "the persona that applies to all blocks"                                                   |
| 34  | "Affirmation Rules"                                                 | Bot persona section              | Medium   | "Acknowledgement Rules"                                                                    |
| 35  | "HARD RULES" / "HARD LIMIT" / "LOCKED" / "EDITABLE"                 | Bot status pills                 | Medium   | Pick two states only: "Editable" or "Fixed"                                                |
| 36  | "Inspect the global persona and guardrails"                         | Bot subtitle                     | Medium   | "See the persona and safety rules"                                                         |
| 37  | "Shared draft workspace."                                           | Left nav footer                  | Medium   | "Team draft area" or remove                                                                |
| 38  | "tight" (in voice content)                                          | Bot voice section                | Medium   | "short"                                                                                    |
| 39  | "1024px" in mobile gate                                             | Mobile gate                      | Low      | "Use a laptop or desktop"                                                                  |
| 40  | "Recommended workflow today"                                        | Release tab                      | Low      | "Recommended steps"                                                                        |
| 41  | "VendingPreneurs" tight against "DEV"                               | Header chrome                    | Low      | Add spacing                                                                                |
| 42  | "ships"                                                             | Header subtitle                  | Low      | "is published"                                                                             |

---

### Findings table

| #   | Page                          | Category          | Finding                                                                                                                                                                                                                                                                | Severity | Persona Rationale                                                                                                                                                                                                                                                   |
| --- | ----------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | All tabs (header)             | Copy & Labels     | The subtitle "Edit the shared draft and sanity-check tone before anything ships" stacks three idioms ("shared draft", "sanity-check", "ships") before the user has done anything.                                                                                      | Critical | Yuki has to translate three idiomatic phrases in a single sentence to understand what page she is on. The first 30 seconds in any app determine if a non-native reader will continue.                                                                               |
| 2   | All tabs (header)             | Copy & Labels     | "Live: setter-v2" pill uses "live" with an ambiguous meaning that recurs throughout the app with different meanings ("Live preview", "live replies", "what's live").                                                                                                   | Critical | The word "live" appears at least four times across the app and means "currently active in production" each time, but English-as-second-language users have to consider three other meanings (alive, live broadcast, live performance) every time they see the word. |
| 3   | All tabs (header)             | Copy & Labels     | "Saved to Supabase" exposes an internal database brand name to marketing users.                                                                                                                                                                                        | High     | Yuki does not know what Supabase is. The marketer she sits next to in Tokyo certainly will not. The word adds noise without adding meaning — it should be "Saved" only.                                                                                             |
| 4   | Flow tab — Booking block      | Copy & Labels     | "Mirror back what you know, drop the booking link, and ask for email in the same message" stacks three idioms in one sentence on the most important block (the conversion step).                                                                                       | Critical | Yuki had to read this sentence four times. Each idiom — "mirror back", "drop the link", "in the same message" — required separate decoding. The booking step is the highest-stakes point in the flow; its description is the least understandable.                  |
| 5   | Flow tab — Block titles       | Copy & Labels     | "Booking Handoff" uses an American-football metaphor ("handoff") to describe a step in a chat flow.                                                                                                                                                                    | High     | Yuki does not have a Japanese equivalent for "handoff" in conversational software. The literal meaning (passing a ball between players) is what she sees first.                                                                                                     |
| 6   | Flow tab — Block descriptions | Copy & Labels     | "qualifier" appears twice without ever being defined.                                                                                                                                                                                                                  | High     | "Qualifier" is sales jargon. A grammar-aware non-native reader reads it as a grammar term first. The app uses it as a noun for "qualifying questions" but never says so.                                                                                            |
| 7   | Flow tab — Objection block    | Copy & Labels     | "Acknowledge → probe → respond. Never skip to resolution." uses "probe" (interrogation), "skip" (jump over), and "resolution" (image quality OR an answer) — all ambiguous.                                                                                            | High     | The most useful sentence on the Objection block is also the hardest to parse. The arrow notation is fine; the verbs and nouns are not.                                                                                                                              |
| 8   | Flow tab (Inspector)          | Copy & Labels     | "Watch the prospect's energy" uses the Western pop-psychology meaning of "energy".                                                                                                                                                                                     | High     | Yuki reads "energy" as electrical or physical stamina first. The intended meaning ("mood/engagement level") is a culturally specific interpretation.                                                                                                                |
| 9   | Flow tab (Inspector tabs)     | Copy & Labels     | "Routing", "Triggers", "Live" — three software-engineering terms used as marketer-facing tab labels.                                                                                                                                                                   | High     | Yuki recognises these as engineering vocabulary because she is one. A marketer would not. The labels do not describe what the tab contains.                                                                                                                         |
| 10  | Flow tab (Simulator)          | Forms & Input     | "Send" button is disabled while a parallel "Run" button is the working action. Same widget, two verbs for the same operation.                                                                                                                                          | High     | Yuki tried Send first because that is the universal English verb for chat. It was disabled with no explanation. She had to find Run. Inconsistency confuses learners more than experts.                                                                             |
| 11  | Flow tab (Simulator)          | Copy & Labels     | "Try a real prospect opener" uses "opener" (improv/dating slang).                                                                                                                                                                                                      | Medium   | Yuki has never seen "opener" used to mean "first message". She had to infer from context.                                                                                                                                                                           |
| 12  | Inbox tab                     | Copy & Labels     | "Inbox metrics and transcripts below include all VendingPreneurs conversations until flow_id lands on the conversations table." — exposes a database column name and uses "lands on" as a metaphor.                                                                    | Critical | This sentence is written for an engineer, not a marketer. Yuki, who is an engineer, can decode it. The marketer who actually owns this brand cannot.                                                                                                                |
| 13  | Inbox tab                     | Copy & Labels     | The metric "STALLED" is ambiguous (engine stalled, conversation stalled, negotiation stalled).                                                                                                                                                                         | High     | Yuki's first reading of "stalled" is mechanical. The intended meaning (no recent message) is not derivable from the word alone.                                                                                                                                     |
| 14  | Inbox tab                     | Copy & Labels     | "BOOKED" and "COMPLETED" are not visibly distinguishable.                                                                                                                                                                                                              | Medium   | Yuki cannot tell whether a conversation that booked is also "completed", or whether they are exclusive states. The labels need to be either combined or distinguished with helper text.                                                                             |
| 15  | Inbox tab                     | Navigation & Flow | The tab is labelled "Inbox" but the page heading is "Brand inbox", and the status pill is "Brand-wide only". Three different framings of the same scope.                                                                                                               | Medium   | Yuki has to mentally reconcile three different phrasings on one page.                                                                                                                                                                                               |
| 16  | Variables tab                 | Copy & Labels     | "A plain-English map" — uses "plain English" as an idiom. The subtitle then mixes "plain-English" with "map" (geographic) for what is actually a list.                                                                                                                 | Medium   | The page is a list, not a map. The phrase "plain-English" is itself an idiom that says "easy English".                                                                                                                                                              |
| 17  | Variables tab                 | Copy & Labels     | "Brand stays put forever", "Contact follows a person", "Conversation is scoped to a single thread" — three different verb metaphors for "stored at three different scopes".                                                                                            | High     | Yuki has to translate "stays put", "follows", and "scoped to" separately. Three sentences for one parallel concept. They should be parallel: "Brand: stored once, permanently. Contact: stored per person. Conversation: stored per chat."                          |
| 18  | Variables / Release           | Copy & Labels     | "is not wired yet" — uses electrical-cable metaphor.                                                                                                                                                                                                                   | High     | "Wired" suggests electrical work. Yuki has to translate this as "not built yet".                                                                                                                                                                                    |
| 19  | Release tab                   | Copy & Labels     | "A marketer-facing reality check: what is saved in the shared draft, what still powers live replies, and what this screen can help you confirm today." — uses five idioms and three different phrasings of the same state.                                             | Critical | Yuki's translator has to handle "reality check", "shared draft", "powers live replies", "help you confirm", "today" all in one sentence to understand what the page is for.                                                                                         |
| 20  | Release tab                   | Copy & Labels     | The four cards (DRAFT WORKSPACE, LIVE RUNTIME, PROMPT SOURCE, SIMULATOR) introduce 12 different vocabulary items for the same fundamental concept (draft vs live).                                                                                                     | Critical | Yuki has to track 12 separate words referring to two states. The fix: standardise to two terms ("draft" and "live") and use them everywhere.                                                                                                                        |
| 21  | Release tab                   | Copy & Labels     | The card "PROMPT SOURCE — Compiled from src/lib/prompts/sections/\*.ts" displays a file path to a marketer.                                                                                                                                                            | High     | Yuki understands what `*.ts` means. A marketer does not. File paths do not belong in marketer UI.                                                                                                                                                                   |
| 22  | Bot tab                       | Copy & Labels     | "Inspect the global persona and guardrails behind every reply" — "global persona" (worldwide?) + "guardrails" (highway barriers?).                                                                                                                                     | High     | "Persona" is marketing-research vocabulary; "guardrails" is 2022 startup vocabulary; "global" is an English engineering adjective. Stacked, they are unparseable for a non-native reader.                                                                           |
| 23  | Bot tab                       | Copy & Labels     | "Tone is customisable per brand. Peer-mentor beats salesperson 3:1."                                                                                                                                                                                                   | Critical | Yuki spent over a minute on this sentence. "Beats" can mean wins or hits. "3:1" is a ratio of unspecified things. "Peer-mentor" is a compound noun without a Japanese equivalent. The sentence loses meaning at three of its four key words.                        |
| 24  | Bot tab                       | Copy & Labels     | "HARD RULES", "HARD LIMIT", "LOCKED", "EDITABLE" — four different status words for two states (editable / not editable). The "LOCKED" pill duplicates the lock icon next to it.                                                                                        | Medium   | The combination "Persona — HARD RULES — LOCKED" creates ambiguity: is it locked because it's hard? Are hard rules and a hard limit the same thing? Yuki has to read the badges in sequence to understand.                                                           |
| 25  | Bot tab                       | Copy & Labels     | "Affirmation Rules" — Western therapy/self-help vocabulary.                                                                                                                                                                                                            | Medium   | "Affirmation" in Japanese maps closest to 肯定 (kotei, affirmation/agreement) but is rarely used in business software. "Acknowledgement" is more international.                                                                                                     |
| 26  | Bot tab — Voice section       | Copy & Labels     | "Match the prospect's energy and formality level. If they write in paragraphs, respond in kind. If they send one-liners, keep yours tight." — uses "energy", "respond in kind" (idiom for "match"), "one-liners" (stand-up comedy slang), "tight" (idiom for "short"). | High     | Four idioms in two sentences. The intended meaning (match style and length) is buried under translation work.                                                                                                                                                       |
| 27  | Bot tab — Voice section       | Copy & Labels     | "No em dashes" — "em dash" is a typography term.                                                                                                                                                                                                                       | Low      | A marketer probably does not know what an em dash is. Show the symbol.                                                                                                                                                                                              |
| 28  | Bot tab                       | Forms & Input     | The Display name placeholder "Not named — shared team inbox" mixes a state ("Not named") and a hint ("shared team inbox") in one field.                                                                                                                                | Medium   | Yuki cannot tell at a glance whether the field is empty or contains "shared team inbox" as a value. Move the hint to helper text.                                                                                                                                   |
| 29  | Left nav                      | Copy & Labels     | The five workspace items use single English words ("Flow", "Inbox", "Variables", "Release", "Bot") each with multiple meanings. The subtitles use inconsistent grammar (verb / verb / verb / non-verb / non-verb).                                                     | High     | Yuki has to translate every label and every subtitle. The lack of grammatical parallelism in the subtitles makes them impossible to scan.                                                                                                                           |
| 30  | Left nav (footer)             | Copy & Labels     | "Shared draft workspace." — three abstract words forming a sentence-like label with no anchor.                                                                                                                                                                         | Medium   | Yuki cannot tell who the workspace is shared with. The period at the end suggests this is a complete thought; it is actually a description of the page.                                                                                                             |
| 31  | Header (chrome)               | Visual & Layout   | "VendingPreneurs" sits tight against a yellow "DEV" pill, making it look like part of the brand name.                                                                                                                                                                  | Low      | Yuki initially read "VendingPreneursDEV". The compound word is already hard for a non-native reader; adjacent badges make it harder.                                                                                                                                |
| 32  | All tabs                      | Copy & Labels     | The product name "InstaSetter" and the role "setter" are nowhere defined for a first-time non-native reader.                                                                                                                                                           | High     | Yuki had to read the README to learn that "setter" means "appointment setter". Inside the app there is no glossary, tooltip, or first-run explanation.                                                                                                              |
| 33  | Mobile gate                   | Copy & Labels     | "Open this page on a screen at least 1024px wide." — px is developer vocabulary.                                                                                                                                                                                       | Low      | A marketer probably does not know how to convert pixels to a device. "Open this on a laptop or desktop" with "(at least 1024px)" in smaller text would be friendlier.                                                                                               |
| 34  | All tabs                      | Feedback & State  | The status badge "Unpublished edits" appears in three places (header pill, Release page card, Release page status pill) using slightly different framings.                                                                                                             | Medium   | Yuki sees the same state three times. The repetition suggests it is important, but it is unclear if these are the same status or different statuses.                                                                                                                |
| 35  | Block library (palette)       | Copy & Labels     | "Escalation" — implies conflict to a non-native reader (an argument escalating). The intended meaning is "hand off to a human".                                                                                                                                        | High     | Yuki's first reading of "Escalation" is "the conversation is getting worse". The intended meaning (transfer to human) is a corporate-support sense she may not know.                                                                                                |

---

### Gut feel scores (1-5)

- **Flow tab** (canvas): **2** — Functional but the block descriptions are dense with idioms. I can build a mental model with effort, but every reading slows me down.
- **Inbox tab**: **2** — The orange banner exposing `flow_id` and `conversations table` is an own-goal. The metric labels (STALLED especially) are ambiguous.
- **Variables tab**: **3** — The three category cards have parallel structure (good) but use inconsistent verbs (bad).
- **Release tab**: **2** — Twelve vocabulary items for two states. This is the page where I felt most lost.
- **Bot tab**: **2** — "Peer-mentor beats salesperson 3:1" alone is a 1, but the rest is a 3, so I average to 2.
- **Mobile gate**: **5** — The clearest copy in the app. Direct, structured, and gives an alternative.
- **Overall**: **2** — Functional but confusing for a non-native English reader.

---

### Three changes I would make first

If the team can only do three things this sprint:

1. **Standardise the draft/live vocabulary to two words.** Pick "draft" (what marketers edit) and "live" (what customers see). Replace every instance of "shared draft", "live runtime", "live replies", "live source", "compiled prompt", "publish wiring", "Live: setter-v2", "powers live replies", "live preview" with one of the two words. This single change removes the largest source of confusion.
2. **Replace the four worst sentences.** "Peer-mentor beats salesperson 3:1", "Mirror back what you know, drop the booking link, and ask for email in the same message", "Edit the shared draft and sanity-check tone before anything ships", and "until flow_id lands on the conversations table". Each one stops a non-native reader cold. Each one is one sentence. That is four sentences to rewrite.
3. **Add a one-sentence definition for "setter", "qualifier", "prospect", and "handoff".** Either a glossary page, or hover tooltips, or first-run banners. These four sales-jargon words appear on almost every screen and are invisible to anyone who has not done English-language sales training.

The mobile gate copy is the model. Whoever wrote it already knows how to write for non-native readers. Let them rewrite the rest.

— Yuki
