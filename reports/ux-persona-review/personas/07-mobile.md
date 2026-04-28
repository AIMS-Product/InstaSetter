# Jake — Distracted Mobile User (22)

College student. Phone is my computer. I'm in line at Chipotle. I just got an Instagram ping that someone DM'd one of our pages and I want to peek at the bot's reply before my food's up. Thumb only. One hand. Headphones in.

---

## TL;DR

I literally cannot use this on my phone. I tap "Flow Builder" in the nav, the page loads, and it just tells me to go find a laptop. That's the whole experience. I never see a node, never see a block, never get to do anything. The page that's supposed to be the main thing is a wall.

I get _why_ — graph editor on a 375px screen would be cursed. But the gating decision treats my iPad the same as my iPhone, and an iPad mini in landscape is bigger than half the laptop screens at my school's library. So that part's wrong.

The good news is the gate page itself is decent. It's polite, it tells me what's happening, and it gives me a button to somewhere I can actually do something. That's the only reason this isn't a 1.

---

## What I tried to do

1. Open `/dashboard/flows/ig-organic-dm` on my phone (iPhone-sized, 375×667).
2. Open the same URL on a tablet (768×1024).
3. Try to do literally anything past the gate. (Could not.)

---

## Findings

| #   | Page                                                    | Category                   | Finding                                                                                                                                                                                                          | Severity     | Persona Rationale                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| J1  | `/dashboard/flows/[flowId]` (mobile)                    | Visual & Layout            | Below 1024px the entire flow builder is replaced by a static "needs a desktop" screen. There is no read-only fallback, no node list, nothing.                                                                    | High         | Phone is my primary device. If a marketer wants to glance at their flow during the day, they cannot. The decision to gate may be right for _editing_; it's wrong for _looking_. I don't need to drag nodes — let me at least see the shape of what's running.      |
| J2  | `/dashboard/flows/[flowId]` (tablet 768px)              | Visual & Layout            | Tablet hits the same gate as phone. iPad Pro 11" is 1194px wide so it'd squeak past the cutoff, but iPad mini, iPad Air portrait, and any Android tablet under 1024 — all gated.                                 | High         | Tablet is the _exact_ form factor where graph editors usually shine (more pixels than phone, touch-first). Treating my iPad like my iPhone is a content-strategy mistake. A two-pane collapsed view would absolutely fit on 768px even if the full canvas doesn't. |
| J3  | Mobile gate screen                                      | Copy & Labels              | The headline "Flow Builder needs a desktop" is clear. The body explains why ("multi-panel canvas") and gives the threshold (1024px). The fallback action is named ("Open conversations →"). All of that is good. | — (positive) | Honest copy. Tells me what's wrong, what to do next, and doesn't pretend the limitation isn't real. I'd rather have this than a broken responsive layout that "kinda works."                                                                                       |
| J4  | Mobile gate screen                                      | Forms & Input / Navigation | The "Open conversations" CTA button looks fine but the touch target measures pretty small — the padding is `10px 18px` with 13px text, so the tap area is well under the 44×44pt minimum Apple recommends.       | Medium       | Thumb-tap on a moving bus. If the only useful action on the entire page is too small to hit on the first try, that's a self-inflicted wound. Bump the padding.                                                                                                     |
| J5  | Mobile gate screen                                      | Navigation & Flow          | The header still shows the full top-nav (Dashboard, Conversations, Lead Sources, Flow Builder) with the Flow Builder one highlighted. Tapping it again just reloads this same gate.                              | Medium       | Dead-end loop. The active nav item is the page that won't let me do anything. From a phone the "Flow Builder" link in the nav is functionally a trap — every tap is a wasted tap. Either hide it on mobile, or grey it out with a "desktop only" hint.             |
| J6  | Mobile gate screen                                      | Visual & Layout            | The brand pill ("VendingPreneurs DEV") is rendered in the header on tablet but not on phone (presumably hidden by responsive nav). Inconsistent state across the same gated screen.                              | Low          | Small detail but it gave me a "did the page load right?" moment. If the gate is the same page either way, the chrome around it should be the same too.                                                                                                             |
| J7  | Mobile gate screen                                      | Trust & Safety             | The "i" gradient logo in the middle of the gate is clean. Looks like a real product, not a 404.                                                                                                                  | — (positive) | Doesn't feel broken. Looks deliberate. That matters — if I'm going to be told "no," at least don't make it look like the page crashed.                                                                                                                             |
| J8  | `/dashboard/flows/[flowId]` (tablet, marketing context) | Navigation & Flow          | The breadcrumb says "Dashboard › Flow Builder" but the URL has a flow ID and the page header (when it would render) says "Instagram DM Flow / Instagram — Organic DM". That branding never reaches the gate.     | Low          | If I came in from a deep link, the gate doesn't tell me _which_ flow I was trying to edit. So when I get back to my laptop later I have to go find the link again. Echo the flow name into the gate.                                                               |
| J9  | Mobile gate screen                                      | Feedback & State           | No way to bookmark "come back to this flow on desktop." No "email this link to myself" button. No "remind me later."                                                                                             | Medium       | I'm 22, my workflow is "send link to myself in iMessage." Adding a literal Share button (uses `navigator.share`) would let me one-tap punt this to my laptop. Right now I have to copy the URL by long-pressing the address bar.                                   |
| J10 | Mobile gate page text                                   | Copy & Labels              | "You can still monitor live conversations on your phone." This sentence is the _whole_ mobile value prop and it's a gray subtitle smaller than the body copy.                                                    | Medium       | Bury the lede much? On a phone, that line is what I actually care about. Make it the second-tier headline, not a footnote. Like: _"On your phone, head to Conversations to watch the bot do its thing in real time."_                                              |

---

## Category scores (1–5)

- **Navigation & Flow** — **2.** It's a dead end. The fallback link works but the active nav state on a route I can't use is hostile.
- **Copy & Labels** — **4.** Honest, specific, no jargon. Tells me the threshold (1024px), tells me what to do instead. Subtitle is too quiet though.
- **Forms & Input** — n/a (no inputs on the gate).
- **Visual & Layout** — **3.** The gate itself is composed cleanly. But the _decision_ to gate tablet is a layout failure, not a design success.
- **Feedback & State** — **2.** No share, no bookmark hint, no "we'll email you when you're back at your desk." Just a wall and a button.
- **Trust & Safety** — **4.** Looks like a real product. Doesn't feel broken.
- **Accessibility & Inclusion** — **3.** CTA touch target is undersized. Otherwise the text scales fine and contrast looks okay.
- **Gut Feel** — **2.** Functional but I'm locked out of the main feature on my main device.

---

## On the gating decision specifically

The team lead asked me to weigh in on whether gating instead of degrading is the right call. Honest take:

**For phones (< 600px): yes, gate.** The flow builder canvas is a 2D graph with drag-drop nodes, an inspector panel, a palette drawer, and a simulator. Trying to cram all of that into a 375px viewport would produce something miserable. Gating is the right call. The source comment says "every attempt to responsive-collapse has reduced it to a checklist that's slower to author with than pen-and-paper" — believe it. Don't waste sprint cycles trying to ship a mobile editor.

**For tablets (600–1024px): no, don't gate.** This is where I push back. A tablet at 768px in landscape has the same usable horizontal real estate as a 13" laptop after you subtract the OS chrome. The canvas absolutely could work there, especially with `@xyflow/react` which already supports pinch-zoom and pan. The 1024px cutoff feels like an iPhone-or-laptop binary that ignores the entire tablet form factor.

Concrete suggestion: **drop the cutoff to 900px** so iPad portrait (810px) is _still_ gated but iPad Pro landscape (1194px) and most tablets in landscape work. Or split it: tablet gets a "view-only" mode (canvas + inspector, no palette/simulator), phone gets the gate.

**For everyone, regardless of device: ship a read-only mobile view.** The bot is running 24/7. The whole point of the product is that the marketer doesn't have to babysit. But sometimes you want to _peek_. Right now there's no peek. A simple list view — "Opening → Qualifier → Booking, version 7, last edit 2hr ago, no errors" — would be 80% of the mobile value with 5% of the work. That's not "degrading the editor," that's a different feature: **status, not editing.**

---

## What I CAN do on my phone (per the gate's suggestion)

The gate punts me to `/dashboard/conversations`. That's outside my review scope so I won't go there, but for the record: that's where the value is for me on a phone. The gate is honest about this. I just wish:

1. The link said _what I'd find there_ ("View live chats →" instead of "Open conversations →").
2. There was a one-tap way to come back to _this specific flow_ on desktop later (Share button, "email me this link").
3. The "monitor conversations" line was a louder part of the gate, since for phone users it's the whole point.

---

## Bottom line

The gate is a clean piece of UX for what it is — but it's a stopgap that's been canonized into a feature. The right move is to decouple "view what's running" from "edit what's running" and ship the first one as a real mobile screen. Gating _editing_ is fine. Gating _seeing_ is not.

If I had to pick one fix to ship first: **lower the cutoff from 1024px to ~900px so iPad-landscape works.** That alone unlocks the form factor that actually makes sense for graph editing on the go.

— Jake
