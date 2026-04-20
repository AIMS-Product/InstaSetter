# Persona 03 — SAM, First-Time Visitor

**Age:** 28
**Context:** Clicked a link from social media. Zero prior knowledge of this product, this company, or this space. Phone in hand. Ten seconds of patience before I bounce.
**Lens:** Does a stranger understand what this is, why they should care, and what to do? Is the first action obvious and low-risk? Is value visible before I commit?
**Frustration triggers:** Vague value propositions, jargon, assumed knowledge, being dropped into an "expert" UI on my first click, errors on the first page I land on.

---

## TL;DR

I would leave within 15 seconds. The home page tells me almost nothing — a product name, a seven-word tagline aimed at someone who already knows what this is, and two buttons with insider labels. There is no "what it does," no "who it's for," no "how to try it," no screenshot, no pricing, no social proof, no sign-up. Both buttons drop a naive user into internal tools that make zero sense without context: one shows a broken error page, the other throws me into a power-user split-screen editor with ~24 buttons, symbols like `⎔ ◉ ∥ ⟳ ◐`, and labels like "Flow," "Runs," "Variables," "Versions," "Publish v13" — none of which I understand. This reads like an internal admin tool that someone accidentally made public, not a product for a first-time visitor.

---

## Page-by-page walkthrough

### 1. `/` — Home

**Gut feel: 2 / 5** — "It's pretty, it's clean, and it tells me nothing."

**First 3 seconds:** I see a cream/beige background, a big centered word "InstaSetter," and the subtitle "Instagram DM appointment setting automation." Two buttons: "Conversations →" (black, primary) and "Flow Builder →" (outline, secondary).

**First reactions as SAM:**

- "InstaSetter" — is this Instagram-related? Is it affiliated with Instagram? (No disclaimer either way, which is a trust issue in its own right.)
- "Instagram DM appointment setting automation" — I'm parsing this word by word. "Appointment setting" is insider sales/marketing jargon. Normal people say "book a meeting" or "schedule a call." If I'm not already a sales ops person or an agency owner, this tagline sails right past me.
- There is nothing here that tells me **who** this is for (coaches? clinics? agencies? individuals?), **what problem** it solves in human terms ("stop missing DMs from leads"), **how** it works, **what it costs**, or **whether I can try it**.
- Two buttons, neither of which says "Get started," "See how it works," "Sign up," or "Learn more." "Conversations" and "Flow Builder" are not first-time-visitor labels — they are app navigation labels. I do not have any conversations. I have never built a flow. I do not know what either word means in this context.
- No nav bar, no logo, no footer, no "About," no pricing link, no demo video, no contact, no legal. The page is floating in space. This makes the product feel either unfinished or suspicious — I can't tell which.
- No sign-up or sign-in. Am I already "in"? Is there an account? Is my data exposed? (Turns out there isn't one yet, but a stranger can't tell that from the screen.)

**Primary question I can't answer:** "What happens if I click a button?" I'd expect a homepage to have a micro-explanation — "See the live DMs our AI is handling" or "Build your first auto-reply in 2 minutes." There is nothing here to set expectation. Clicking is a blind leap.

**Would I click anything?** I'd probably click "Conversations" because it's the primary (black) button — only to discover it's broken.

---

### 2. `/dashboard/conversations` — Conversations (error state)

**Gut feel: 1 / 5** — "Broken on my first click. I'm done."

**What I see:** Giant heading: **"Something went wrong"**, subtitle "An unexpected error occurred," and a "Try again" button. That's it. No header, no nav, no link back home, no logo, no support link, no error code, no "try later," no "contact us."

**First reactions as SAM:**

- The very first real page I clicked into is broken. In a first-time visit this is game over. I assume the whole product is broken or abandoned.
- "Something went wrong" with no detail doesn't even tell me if it's my fault or theirs, a temporary issue or a hard failure.
- "Try again" does nothing (per the exploration log it stayed on the same page). So the one action offered to me doesn't work either.
- No way back except browser back. There's no "Go home" link, no logo to click, nothing.
- Background console errors flood the dev log with `ZodError: ANTHROPIC_API_KEY` — a stranger wouldn't see that, but it confirms the page is failing because the product isn't configured. A first-timer can't configure anything; they just see a dead page.

This single page alone is a bounce. If this were a real marketing landing page, I'd have closed the tab before sentence two.

---

### 3. `/dashboard/flows/ig-organic-dm` — Flow Builder

**Gut feel: 1 / 5** — "This is not for me. Why am I looking at it?"

**What I see at a glance (2 seconds):** A dense multi-panel screen. Top bar: `VanderhyjPleasure`, `IG Organic DM`, `Draft v13`, `Simulator`, `Publish v13`. Left rail with icon + letter tabs (`⎔ Flow`, `◉ Runs`, `∥ Variables`, `⟳ Versions`, `◐ Bot`). A canvas with connected boxes labelled "Opening," "Qualifier," "Objection Handler," "Booking Handoff," "Post-Call Follow-up," "Escalation," "Summary." On the right, a property inspector with tabs `Design | Routing | Triggers | Data`, a "View Persona" button, and a mock IG chat preview with sample messages.

**First reactions as SAM:**

- This is an airplane cockpit. I came here from a social media link expecting to see **what the product does for me**. Instead I've been handed a tool I have no training for.
- What is a "Flow"? What is a "Bot"? What is a "Block"? What does "Qualifier" mean in this context — is it a CRM lead qualifier, a training step, a content filter? Why is there a "v13" and a "Draft v13"?
- "Publish v13" — am I about to deploy someone else's live Instagram account? If I click it, does something happen to a real business? I would not click this.
- "Simulator" — maybe this is the safe "try it" path. But nothing guides me there. It's just another button among 24.
- Pre-filled data ("VanderhyjPleasure," sample messages about "Dallas-looking to build some more stamina," "Mike") — wait, am I seeing someone else's data? A real client's flow? Real prospect names? This is a trust-and-safety red flag for a stranger: either this is a live production account I shouldn't see, or a demo that should be labelled as such. Neither is handled.
- There are symbols I literally cannot read: `⎔`, `◉`, `∥`, `⟳`, `◐`, `⊞`, `⤢`. A first-time visitor has no hope of guessing what these do. They're not even universally recognised glyphs; they look decorative.
- The side-tabs intercept pointer events per the exploration log — they're visually there but not clickable, which feels broken when you try to explore.
- There is no "What is this?", no tour, no onboarding, no tooltips, no "Start here." I am alone in someone else's editor.

**Who is this page for?** Clearly a marketer or power user who already bought the product, already has a workspace, already knows the vocabulary. Not a random visitor from social media. But there is no gating, no sign-up, no "Are you sure you want to go here?" between the home page and this.

---

### 4. `/dashboard` — Dashboard

**Gut feel: 2 / 5** — "Another dead-end page with one link."

**What I see:** Centered text: "InstaSetter / Flow Builder preview. Open the prototype flow to see the split-view editor. / Open IG Organic DM →"

**First reactions as SAM:**

- It's literally a page with one sentence and one link. This feels like a placeholder, not a dashboard.
- "Flow Builder preview," "prototype flow," "split-view editor" — more insider words. None of this helps me decide whether to click.
- "IG Organic DM" — this is a **workspace name**, not a product feature. Why is a random visitor seeing a specific tenant's data named in the UI?
- It's a funnel: home → this → that one editor. Same dead-end as a sales-y landing page, but without any of the sales copy. I can't actually do anything **except** go forward into the complex editor.
- No breadcrumbs, no nav, no way to go back to home without hitting the browser back button.

---

### 5. Flow Builder tabs — Runs / Variables / Versions / Bot

**Gut feel (combined): 1 / 5** — "I can't even see what these pages are."

**What I see:** All four tab screenshots (`flow-builder-tab-runs.png`, `-variables.png`, `-versions.png`, `-bot.png`) are visually indistinguishable from each other and from the default `flow-builder-desktop-001-load.png`. The active tab appears unchanged; the canvas and inspector look identical in every capture. (The exploration log confirms real clicks timed out because overlays intercepted pointer events.)

**First reactions as SAM:**

- If I click "Runs" and nothing visibly changes, I assume the app is broken.
- Tab labels like "Runs," "Variables," "Versions" are engineering/admin language. A first-timer hasn't formed a mental model of what a "run" is in this system, let alone why they'd inspect one.
- No active-tab highlight strong enough to survive a thumbnail comparison — visual feedback on tab switching is effectively invisible.

---

### 6. `/this-route-does-not-exist` — 404

**Gut feel: 3 / 5** — "Clean, but missing basic courtesy."

**What I see:** Big "404", "Page not found," "Go home" button.

**First reactions as SAM:**

- It's fine. Consistent with the rest of the (minimal) design.
- No nav, no logo, no search, no suggestions of what to visit instead. For a first-time visitor this is another lonely room.
- At least "Go home" actually navigates home (one of the few working links in the whole app, per the exploration log).

---

## Findings table

| Category          | Finding                                                                                                                                                                                                                                    | Severity | Why this matters to me (SAM)                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy & Labels     | Home page tagline "Instagram DM appointment setting automation" uses sales-ops jargon ("appointment setting") and doesn't explain the product in human language.                                                                           | Critical | In 10 seconds I need to know what problem this solves for me. I don't. I'm already drafting my exit.                                                                             |
| Navigation & Flow | Home page offers only "Conversations" and "Flow Builder" as CTAs — both are internal tool labels, not first-visitor labels. No "Get started," "See a demo," "How it works," "Sign up."                                                     | Critical | I have no mental model for these words yet. A stranger cannot tell a "Conversation" from a "Flow." I would guess and lose.                                                       |
| Feedback & State  | Primary CTA ("Conversations →") leads to a fullscreen "Something went wrong" error page on first click. "Try again" also does nothing.                                                                                                     | Blocker  | The first real thing I do in this product is hit a wall. I assume the product is broken or abandoned and leave.                                                                  |
| Copy & Labels     | Error page says only "An unexpected error occurred" with no error code, no timestamp, no "contact us," no "try later," no link home.                                                                                                       | Critical | Generic error text with no path forward is the definition of a dead end. I can't even tell if it's my fault.                                                                     |
| Trust & Safety    | Home page has no logo/wordmark beyond the text, no footer, no "About," no Terms, no Privacy, no company name, no contact.                                                                                                                  | High     | I can't tell if this is a real company, a scam, a side project, or an abandoned prototype. I'm inclined to assume the worst.                                                     |
| Trust & Safety    | No disclaimer about relationship to Instagram/Meta. Name "InstaSetter" implies affiliation.                                                                                                                                                | High     | I worry about handing over an Instagram login to a product that might get me banned or violate ToS. First-timers are cautious about Instagram integrations.                      |
| Trust & Safety    | Flow Builder exposes what looks like real-world workspace data ("VanderhyjPleasure," named prospects, fitness-coaching copy with "Dallas," "Mike") to any anonymous visitor. No login, no "demo mode" label.                               | Critical | Either I'm seeing a real customer's data (massive privacy issue) or this is a demo that isn't labelled (trust issue). Either way, I'm uncomfortable.                             |
| Navigation & Flow | Both home-page CTAs drop an unauthenticated stranger straight into an internal editor with no onboarding, no guided tour, and a "Publish v13" button that implies production deployment.                                                   | Critical | I could click "Publish" in 10 seconds and have no idea whether I just broke a live account. The blast-radius is terrifying for a first-timer.                                    |
| Copy & Labels     | Flow Builder uses domain-specific vocabulary throughout without any definition: Flow, Block, Bot, Setter, Qualifier, Objection Handler, Booking Handoff, Routing, Triggers, Variables, Versions, Runs, Publish, Draft, Simulator, Persona. | Critical | Every label I read adds cognitive load. By label 8 I've given up trying to build a mental model.                                                                                 |
| Visual & Layout   | Sidebar tabs use decorative symbols (`⎔ ◉ ∥ ⟳ ◐ ⊞ ⤢`) that aren't universally recognised icons. Zero-context visitors cannot guess their meaning.                                                                                          | High     | The icons don't teach me anything. They hide meaning rather than reveal it.                                                                                                      |
| Navigation & Flow | No nav bar, no top-level menu, no breadcrumbs anywhere. No way to go "back to home" from the dashboard or flow builder except browser back.                                                                                                | High     | I feel stuck. Feeling stuck makes me close tabs.                                                                                                                                 |
| Feedback & State  | Tab switches ("Flow," "Runs," "Variables," "Versions," "Bot") produce no visible change in the screenshots — active state is either missing or too subtle.                                                                                 | Critical | If clicking a tab appears to do nothing, the app feels broken, which is the last thing I want to feel as a first-timer.                                                          |
| Feedback & State  | Exploration log shows pointer-event interception on Flow Builder tabs — clicks on Flow/Runs/Variables/Versions/Bot and Design/Routing/Triggers/Data timed out.                                                                             | Critical | I click something, nothing happens, I conclude the site is broken.                                                                                                               |
| Visual & Layout   | Home page is ~30% content, ~70% whitespace with everything vertically centered. No visual hierarchy beyond "giant word / small word / two buttons." No hero imagery, no product screenshot, no diagram, no motion.                         | Medium   | I have nothing to look at that tells a story. A good home page teaches me in 5 seconds; this one just greets me.                                                                 |
| Visual & Layout   | Home page and 404 look stylistically identical — same cream background, same centered minimal text, same small black button. I can't tell "marketing" from "utility" visually.                                                             | Medium   | I read the 404 and briefly wonder if the home page itself is an error page.                                                                                                      |
| Copy & Labels     | Dashboard page copy: "Flow Builder preview. Open the prototype flow to see the split-view editor." Words "preview," "prototype," "split-view editor" are developer-speak.                                                                  | High     | I don't know what I'm looking at. Calling it a "prototype" also subtly says "this isn't the real product," which kills trust.                                                    |
| Copy & Labels     | "IG Organic DM" — using a channel/campaign shorthand as a user-facing name.                                                                                                                                                                | Medium   | This is written for the people who built the tool, not the people who'd use it.                                                                                                  |
| Forms & Input     | No sign-up, sign-in, email capture, or lead form anywhere in the journey. Also no "Try without signing up" messaging.                                                                                                                      | Critical | First-time visitors expect a funnel: either "try it live, no signup" or "enter email to continue." Neither exists — just "here's an editor." I don't know what I've walked into. |
| Forms & Input     | Flow Builder exposes textareas and an input ("Type as prospect...") with no labels, no placeholders, no required markers, no instructions.                                                                                                 | High     | Even if I wanted to experiment, I wouldn't know what to type where.                                                                                                              |
| Accessibility     | Decorative unicode symbols used as button icons (`⎔ ◉ ∥ ⟳ ◐`) with no aria-labels visible. Screen readers would announce these as random characters.                                                                                       | High     | If I use a screen reader, this entire sidebar is gibberish.                                                                                                                      |
| Accessibility     | Tabs rely on subtle visual state. Colour contrast of muted grey labels against cream background looks marginal.                                                                                                                            | Medium   | Anyone with low vision or low-contrast conditions would lose their place fast.                                                                                                   |
| Accessibility     | Every heading is centered and floating — no landmarks (`<nav>`, `<main>`, `<header>`) visible from the layout.                                                                                                                             | Medium   | A screen-reader user would struggle to navigate.                                                                                                                                 |
| Feedback & State  | No loading states anywhere. Pages either render or error. Long operations (Simulator, Publish) give me no spinner hint from the screenshots.                                                                                               | Medium   | I don't know if my click did anything.                                                                                                                                           |
| Trust & Safety    | Environment misconfiguration (`ZodError: ANTHROPIC_API_KEY` missing) causes console errors on both home and conversations pages.                                                                                                           | High     | End users don't see these, but the effect — a dead conversations page — hits them directly.                                                                                      |
| Trust & Safety    | "Publish v13" button is a prominent top-right CTA in the same position most apps put "Save" or primary action. A naive visitor could fire it.                                                                                              | Critical | A production-publish button without a confirmation step, visible to unauthenticated users, is a blast-radius problem.                                                            |
| Visual & Layout   | Mobile home page reflows cleanly (good) but offers nothing extra — still the same two opaque buttons, still no explanation.                                                                                                                | Medium   | Mobile is where I arrived. Still no value prop.                                                                                                                                  |
| Navigation & Flow | Conversations error page has no "Go home" link, unlike the 404. Asymmetric.                                                                                                                                                                | Medium   | I'm stuck on a broken page with only a non-working "Try again" button.                                                                                                           |
| Copy & Labels     | 404 page is sparse but polite. No suggested routes, no search, no help link.                                                                                                                                                               | Low      | Cleanest page in the app, but still a lonely room.                                                                                                                               |

---

## Blockers

These are dealbreakers — SAM leaves here.

1. **Primary home-page CTA leads to a crash page.** Clicking "Conversations" — the black, primary button on the first screen — shows "Something went wrong." No recovery. This is the single biggest blocker: a first-time visitor who follows the most prominent call-to-action hits a wall in under 5 seconds.
2. **No value proposition, no product explanation, no sign-up.** The home page tells a stranger nothing beyond a 7-word jargon tagline. There is no way for a new visitor to learn what this is, whether it's for them, what it costs, or how to begin.
3. **Both CTAs drop strangers into internal tooling.** A first-time visitor has no business being inside a Flow Builder with Publish controls. This should be a gated, authenticated area — or at minimum a clearly labelled demo/playground with rails.

---

## Top 10 issues (SAM's priority order)

1. **Home-page primary CTA is broken** — "Conversations" → Something went wrong. Fix the error or change the CTA. Non-negotiable.
2. **Explain what InstaSetter is in plain English on the home page.** "Book more calls from your Instagram DMs, on autopilot" beats "Instagram DM appointment setting automation" every day. Add 1-2 sentences of benefit copy and a screenshot/video.
3. **Add a proper home page funnel.** "See it in action" (demo/video), "How it works" (3-step diagram), "Pricing," "Sign up" — or at the very least one of these. Give a stranger somewhere to go that isn't "the editor."
4. **Do not drop unauthenticated strangers into a tenant workspace.** Either gate the `/dashboard/*` routes behind login, or create a sandboxed demo mode clearly labelled "Demo — nothing you do is saved."
5. **Replace decorative unicode icons with real icons + visible text labels.** `⎔`, `◉`, `∥`, `⟳`, `◐` mean nothing to anyone.
6. **Define vocabulary inline.** First use of "Flow," "Bot," "Block," "Setter," "Qualifier," "Objection Handler" should carry a tooltip or one-sentence definition. Ideally, reword to terms normal humans already understand.
7. **Fix the conversations error page.** Add a helpful message, contact link, and a "Go home" button at minimum. Better yet, handle the missing-API-key case as a friendly onboarding prompt, not a crash.
8. **Add global navigation with a clickable logo going home.** Every page needs a way back.
9. **Redesign "Publish v13."** Move it out of top-right until there is context. Add a confirmation step. Never let the first action a stranger takes be "push live."
10. **Add a footer with company, contact, privacy, ToS, and Instagram disclaimer.** No footer anywhere in the app is a trust disaster for a first-time visitor evaluating a new brand, especially one trading on an "Insta" name.

---

## Overall gut feel: 1.5 / 5

I would leave this site within 30 seconds and never return. Not because the visual design is bad (it's actually clean and minimal in a Linear/Vercel way), but because as a first-time visitor I am given no reason to stay, no explanation of value, no working primary action, and no trust signals. The moment I click the main button and see "Something went wrong," I'm out. Everything behind the home page is clearly built for an insider who already knows the product — which means there is currently no product at all for a stranger arriving from social media. The marketing surface and the product surface are the same page, and neither is doing its job.
