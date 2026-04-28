# 09 — The Pragmatist (TOM)

**Who I am:** 50-year-old plumber. I run a small business. I'm on the truck all day. Someone sold me on this thing to book appointments off Instagram so I don't have to sit at my laptop answering DMs. I do not want to learn software. I want to open the app, see that it's working, see the jobs coming in, and get back to my day.

**How I judge this:** Can a tradie who doesn't care about apps get in, do his thing, and get out? If I have to read a manual, you already lost me.

**Overall gut feel: 1 / 5 — Broken or hostile.**
I opened this thing and I still don't know what it does for me. The one screen that sounded useful (Conversations) is broken. The main screen is a wall of jargon a college kid dreamed up. I'd close the tab and call my nephew.

---

## Category 1: Navigation & Flow

The home page gives me two buttons: "Conversations" and "Flow Builder." One of those sounds like my inbox. The other sounds like something an engineer builds on a whiteboard. There's no menu, no "Dashboard" link, no "Appointments" link, no "Settings" link. Two buttons. That's the whole product?

When I clicked Conversations — the one button that sounded like it was for me — I got "Something went wrong." Try again does nothing. Now I'm stuck. There's no back button, no nav bar, no "go home" link. I hit the browser back button like a caveman.

The Dashboard page (I had to guess the URL apparently) has exactly one link: "Open IG Organic DM." What's "IG Organic DM"? I sell plumbing. This sounds like a marketing person's label, not mine.

Inside the Flow Builder there are five tabs (Flow, Runs, Variables, Versions, Bot) and four sub-tabs (Design, Routing, Triggers, Data). I counted nine tabs on one screen. Nine. For an app that's supposed to save me time.

| #   | Page                           | Category          | Finding                                                                                                                              | Severity | Persona Rationale                                                                                                                                                         |
| --- | ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | / (Home)                       | Navigation & Flow | No persistent nav bar anywhere in the app. Once you're in, you can't get back to appointments or settings without using the browser. | Critical | TOM runs his business from his phone in the truck. If he can't see "Jobs" or "Appointments" in a menu he'll assume the app doesn't have it and call support (or give up). |
| 2   | /dashboard/conversations       | Navigation & Flow | Error page has no way back — no home link, no nav, no breadcrumb. Only a "Try again" button that does the same broken thing.         | Critical | TOM is now trapped. He has to know to click the browser back arrow. This is the kind of thing that makes him say "this app is broken" and call the salesman.              |
| 3   | /dashboard                     | Navigation & Flow | One link on the dashboard: "Open IG Organic DM." That's not a dashboard, that's a hallway.                                           | High     | TOM expected to see today's appointments, new leads, maybe a number. Instead he has to click into a "builder" to find anything.                                           |
| 4   | /dashboard/flows/ig-organic-dm | Navigation & Flow | Five top tabs + four sub-tabs + symbol-only buttons (⎔ ◉ ∥ ⟳ ◐ ⤢ ⊞) on one screen.                                                   | Critical | TOM sees this and shuts the laptop. It's a cockpit. He wanted a light switch.                                                                                             |
| 5   | /dashboard/flows/ig-organic-dm | Navigation & Flow | No way back to Dashboard from inside the flow builder — no breadcrumb, no "← Dashboard" link.                                        | High     | Classic trap screen. If TOM clicks in, he needs the browser back button to leave.                                                                                         |

---

## Category 2: Copy & Labels

"InstaSetter — Instagram DM appointment setting automation." OK, fair, that's plain English on the home page. Good start. Then it all falls apart.

"Flow Builder preview. Open the prototype flow to see the split-view editor." I don't know what any of those words mean. Prototype? Split-view editor? I'm a plumber. Are you trying to sell me a product or hide it?

"IG Organic DM." I thought IG was Instagram. What does "Organic" have to do with anything? And "DM" — some of my older customers don't know what a DM is. Why is this named for people inside the office instead of people using it?

On the flow builder screen: "Qualifier." "Objection Handler." "Post-Call Follow-up." "Escalation." "Routing." "Variables." "Versions." "Persona." "Ambient triggers." "Compiled prompt." This reads like a manual for air traffic control. I do toilets.

And then there are buttons that are literally just shapes — ⎔, ◉, ∥, ⟳, ◐, ⤢, ⊞. No label. No tooltip I can see. I'm supposed to click squares and diamonds and guess what they do?

"Publish v13." Version 13 of what? Did I change something? Am I about to push something live to my customers' phones?

| #   | Page                             | Category      | Finding                                                                                                                                | Severity | Persona Rationale                                                                                                                                        |
| --- | -------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | /dashboard/flows/ig-organic-dm   | Copy & Labels | Buttons are symbol-only (⎔ ◉ ∥ ⟳ ◐ ⤢ ⊞ + ×) with no labels.                                                                            | Critical | TOM has no idea what a diamond does. He's not clicking a mystery button on a thing connected to his customers' phones.                                   |
| 7   | /dashboard/flows/ig-organic-dm   | Copy & Labels | Jargon everywhere: Qualifier, Objection Handler, Escalation, Ambient triggers, Compiled prompt, Persona, Variables, Versions, Routing. | Critical | This is the language of the people building the tool, not the people using it. TOM books appointments. He doesn't "qualify a lead in a compiled prompt." |
| 8   | /dashboard                       | Copy & Labels | "IG Organic DM" as the main and only action label.                                                                                     | High     | A tradie doesn't know what "organic" means in marketing context. Call it "Instagram Messages" or "Instagram Appointment Bot." Speak English.             |
| 9   | /dashboard                       | Copy & Labels | "Flow Builder preview. Open the prototype flow to see the split-view editor."                                                          | High     | Every word in that sentence is jargon. Is this even the real product? Why is the dashboard telling me it's a "preview"?                                  |
| 10  | /dashboard/flows/ig-organic-dm   | Copy & Labels | "Publish v13" — no explanation of what publish does, no confirm step.                                                                  | Critical | TOM thinks he might be pushing something live to customers. He's too scared to click, too scared to not click.                                           |
| 11  | / (Home)                         | Copy & Labels | The tagline "Instagram DM appointment setting automation" is fine, but doesn't tell me what I can DO here or where to start.           | Medium   | TOM wants "See my new leads" or "Today's appointments," not a product description.                                                                       |
| 12  | /dashboard/conversations (error) | Copy & Labels | "Something went wrong. An unexpected error occurred."                                                                                  | Critical | Useless. What went wrong? Is my data OK? Did I do something? Should I call someone? TOM gets this error and panics.                                      |
| 13  | /404                             | Copy & Labels | "404 — Page not found." At least that's clear.                                                                                         | Low      | Fine. It tells me what happened and gives me a button home.                                                                                              |

---

## Category 3: Forms & Input

I couldn't tell what most of the inputs in the flow builder even were. There are four textareas and two text inputs on that page with no labels, no placeholders except for one that says "Type as prospect…" Who's the prospect? Me? The customer? I'm typing into a black box.

The input I'd actually want — "type your business hours, your services, your address" — isn't anywhere I could find. Instead I'm supposed to edit something called a "Qualifier block" with a "Persona" and a "Rule."

| #   | Page                           | Category      | Finding                                                                             | Severity | Persona Rationale                                                                                                                    |
| --- | ------------------------------ | ------------- | ----------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 14  | /dashboard/flows/ig-organic-dm | Forms & Input | Textareas have no labels, no placeholder text, no "required" markers.               | High     | TOM has no idea what the textarea wants. Business name? Response to a customer? A note to himself?                                   |
| 15  | /dashboard/flows/ig-organic-dm | Forms & Input | No onboarding form for basic business info (hours, services, price range, address). | Critical | TOM expected to enter his stuff somewhere simple. Instead he's dropped into an editor for an AI prompt. The basics aren't asked for. |
| 16  | /dashboard/flows/ig-organic-dm | Forms & Input | "Type as prospect…" placeholder — unclear whose mouth the words are coming from.    | Medium   | If TOM types "how much to unclog a drain" is he training the bot, testing the bot, or sending that to a real customer? Not clear.    |

---

## Category 4: Visual & Layout

The home page is 90% empty beige. Fine, minimal, whatever — Linear does this. But Linear also has a sidebar with everything I need. This is just blank space and two buttons. On a 1280px monitor I'm staring at 700px of nothing.

The flow builder screen is the opposite: everything crammed into three columns and a modal and tabs and sub-tabs and a chat preview and a little map thing with nodes connected by lines. It looks like a flight simulator. For appointment booking.

On mobile and tablet I have no idea if any of this even works — the screenshots look like the desktop version got squished. My guys check their phones. Not a laptop.

| #   | Page                           | Category        | Finding                                                                                           | Severity | Persona Rationale                                                                                                         |
| --- | ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| 17  | /dashboard/flows/ig-organic-dm | Visual & Layout | Severe density: graph view + config sidebar + chat simulator + tabs + sub-tabs all on one screen. | Critical | TOM can't find the one thing he wants because there are 40 things on screen. Information density is for pros, not trades. |
| 18  | / (Home)                       | Visual & Layout | Almost entirely empty beige. Two buttons in the middle. Looks unfinished.                         | Medium   | TOM wonders if this is a real product or a demo. Where is everything?                                                     |
| 19  | /dashboard                     | Visual & Layout | One link in the middle of a blank page. Not actually a dashboard.                                 | High     | Called "Dashboard," looks like a placeholder. TOM expected numbers, cards, a list of today's jobs.                        |
| 20  | /dashboard/flows/ig-organic-dm | Visual & Layout | Canvas nodes use color-coded labels (pink, green, yellow tags) with no legend.                    | Medium   | What do the colors mean? TOM doesn't know and nothing tells him.                                                          |
| 21  | All pages                      | Visual & Layout | No header/logo/persistent branding, no status bar, no "you are here" indicator.                   | High     | TOM loses track of where he is across pages.                                                                              |

---

## Category 5: Feedback & State

When I clicked "Publish v13," nothing visible changed. Did it publish? Did it fail? Is my bot now live? Am I about to text 400 customers something broken? The exploration log says the click "stayed" — meaning the page did nothing I can see. That's terrifying on a button named Publish.

The "Try again" button on the error page does nothing I can see either. Click it, stay on the same error. No spinner. No message. Nothing.

Hover/focus feedback — I can't tell from the screenshots, but given the rest of the polish I'm not holding my breath.

| #   | Page                           | Category         | Finding                                                                                      | Severity | Persona Rationale                                                                                                                                                                                     |
| --- | ------------------------------ | ---------------- | -------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22  | /dashboard/flows/ig-organic-dm | Feedback & State | "Publish v13" button shows no loading, success, or confirmation state after clicking.        | Blocker  | This is the single scariest button in the app. It says "Publish" — that means it goes live to customers. TOM clicks it and nothing happens. Did it work? Did it break my bot? There's no way to tell. |
| 23  | /dashboard/conversations       | Feedback & State | "Try again" on the error page doesn't retry anything visible — no spinner, no status change. | Critical | TOM clicks it twice, thinks the app is frozen, closes the tab.                                                                                                                                        |
| 24  | All pages                      | Feedback & State | No loading states visible during navigation.                                                 | Medium   | When a page is slow, TOM thinks the app hung.                                                                                                                                                         |
| 25  | /dashboard/flows/ig-organic-dm | Feedback & State | No indicator of whether the bot is currently ON or OFF.                                      | Critical | The single most important piece of info TOM needs is "Is my bot answering my customers right now, yes or no?" I couldn't find it.                                                                     |

---

## Category 6: Trust & Safety

Here's where I really get nervous. This app talks to my customers. My real customers. Through my real Instagram account. And:

- Nothing tells me the bot is on or off. If I mess with the flow builder, am I live? Am I in draft? No idea.
- "Publish v13" has no confirm dialog. Click and go. On a button that sends AI-generated messages to my customers.
- There's no human takeover button visible. If the bot says something dumb to a big client, how do I jump in? Is there even a "pause bot" switch?
- The conversations screen is broken. I literally cannot see what the bot is saying to my customers right now. That's the main thing a plumber would want to know.
- No pricing, no plan, no "this is what you're paying for" anywhere. Feels like a demo dressed as a product.
- Console errors about a missing `ANTHROPIC_API_KEY` throwing ZodErrors. I don't know what that is, but I see "error" and I get nervous.

| #   | Page                               | Category       | Finding                                                                           | Severity | Persona Rationale                                                                                                                         |
| --- | ---------------------------------- | -------------- | --------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 26  | /dashboard/flows/ig-organic-dm     | Trust & Safety | "Publish v13" has no confirmation dialog before pushing to production.            | Critical | TOM is one accidental click from sending broken AI responses to real paying customers. A plumber would sue.                               |
| 27  | /dashboard/conversations           | Trust & Safety | Can't see what the bot is saying to customers — the conversations page is broken. | Blocker  | This is the single most critical trust feature. TOM needs to see every message the bot sends. If he can't, he can't trust the bot exists. |
| 28  | All pages                          | Trust & Safety | No visible "pause bot" / "turn off bot" kill switch.                              | Blocker  | If the bot goes rogue and insults a customer, TOM needs a big red button. Not a tab called "Routing."                                     |
| 29  | All pages                          | Trust & Safety | No pricing, no billing, no plan info visible.                                     | High     | TOM wants to know what this costs and what he's signed up for before he trusts his account to it.                                         |
| 30  | / (Home), /dashboard/conversations | Trust & Safety | Console errors on load (ZodError on `ANTHROPIC_API_KEY`).                         | High     | I don't know what Zod is, but I know "error on my homepage" means the thing is broken. Smells like a half-built product.                  |
| 31  | /dashboard/flows/ig-organic-dm     | Trust & Safety | No undo visible after editing a block.                                            | High     | TOM edits something, realizes he broke it, panics. No Ctrl-Z he can trust.                                                                |

---

## Category 7: Accessibility

I'm 50. I wear readers for anything under 14pt. And:

- The symbol-only buttons (⎔ ◉ ∥ ⟳ ◐) have no text, no tooltips visible. Screen readers would read these as Unicode code points. Useless.
- The flow builder on a 1280 screen has tiny text in the canvas labels. On a phone in a truck, forget it.
- Contrast seems OK on the home page (black on beige). Inside the flow builder there's dim grey sub-text on beige that I'd struggle with.
- Tabs use small icons + small text stacked vertically. Tap targets for thumbs? Doesn't look like it.

| #   | Page                           | Category      | Finding                                                    | Severity | Persona Rationale                                                                          |
| --- | ------------------------------ | ------------- | ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| 32  | /dashboard/flows/ig-organic-dm | Accessibility | Symbol-only buttons have no aria-label or visible tooltip. | High     | TOM can't figure out what they do visually. Someone on a screen reader can't either.       |
| 33  | /dashboard/flows/ig-organic-dm | Accessibility | Node labels inside the graph are tiny.                     | High     | TOM squints. Someone with low vision can't use it at all.                                  |
| 34  | All pages                      | Accessibility | Low-contrast secondary text (grey on beige).               | Medium   | TOM needs his readers.                                                                     |
| 35  | /dashboard/flows/ig-organic-dm | Accessibility | Tap targets on tabs and close (×) buttons look small.      | Medium   | TOM has thick fingers and is often wet. He's not tapping a 20px × on a phone in the field. |

---

## Category 8: Gut Feel (per page)

| Page                           | Score | Why                                                                                                            |
| ------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------- |
| / (Home)                       | 2 / 5 | Clean and plain, but only gives me two buttons and no sense of what the product actually does for me.          |
| /dashboard                     | 1 / 5 | One link on a blank page with jargon for a label. That's not a dashboard.                                      |
| /dashboard/conversations       | 1 / 5 | Broken. Useless error. Dead end. This is the page I came for and it doesn't work.                              |
| /dashboard/flows/ig-organic-dm | 1 / 5 | Cockpit for a tool I wanted to be a light switch. Jargon, symbols, no kill switch, no confirmation on Publish. |
| /404                           | 3 / 5 | Does the job. Clear, has a button home. Fine.                                                                  |

**Overall: 1 / 5.** The one thing I actually wanted to do (see my customer conversations) is broken. The main screen is an editor for engineers. There's no nav, no ON/OFF switch, no confirmation on the scariest button in the app, and the labels are in a language I don't speak. This isn't a product for tradies — this is a product for the people who build bots. I'd uninstall it and go back to answering DMs myself.

---

## The bottom line from TOM

If you want my money, here's what needs to change before I'd use this:

1. **A big ON/OFF toggle at the top of every page.** Is my bot talking to customers right now? Yes or no. That's the first thing I want to know.
2. **The word "Conversations" should go to a working list of my customer chats.** With the bot's messages and theirs. Not an error screen.
3. **Plain English everywhere.** "Qualifier" → "Ask the customer questions." "Objection Handler" → "When they say no." "Escalation" → "Send to me." "Publish" → "Save and go live (confirm first)." "IG Organic DM" → "Instagram Messages."
4. **Rename or delete "Flow Builder."** 99% of tradies don't want to build flows. Give me a setup wizard: "What do you do? What are your hours? What's your address?" Three questions. Let the bot do the rest.
5. **Confirmation dialog on Publish.** "Go live with these changes? Your customers will see this. [Cancel] [Yes, publish]."
6. **A proper dashboard with today's leads and today's bookings on it.** Numbers. Times. Names. Not a link to an editor.
7. **Nav bar on every page.** Home / Appointments / Conversations / Settings. Like every other app on earth.
8. **Kill the symbol-only buttons.** Put labels on everything or throw it out.
9. **Fix the console errors.** If your homepage throws errors in the browser on load, your product isn't ready.

I don't need features. I need the app to answer one question: "Is it working, and are my customers being taken care of?" Right now I can't tell. And when I can't tell, I don't trust it. And when I don't trust it, I'm not using it.
