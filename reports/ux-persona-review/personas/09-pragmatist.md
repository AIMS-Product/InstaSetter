# Persona Review — Tom, "Just Get It Done" Pragmatist (50)

**Background**: Plumber. Run a small business. Ten guys on the road, phone never stops. I signed up for InstaSetter because someone told me Instagram DMs were leaking leads. I don't want to learn this thing. I want to know it's running, kill it if it's stuffing up, and get back to work.

## What I came here to do

1. **Is the bot working?** — should be the first thing I see. It isn't.
2. **Pause it if it's saying something dumb.** — no kill switch anywhere.
3. **Make the bot say my business name** — there's a "Display name" box but nothing tells me what happens if I fill it in.

That's it. That's my whole list.

## Page-by-page

### Flow tab (the one it opens on)

I land on five boxes connected with lines: Opening, Qualifier, Objection Handler, Booking Handoff, Email Capture. Top of the page says "Edit the shared draft and sanity-check tone before anything ships." Mate, I don't know what a shared draft is. I came to check my bot, not edit anything.

Header has three coloured badges: "Unpublished edits" (orange), "Saved to Supabase" (green), "Live: setter-v2" (green). I have no idea what any mean. Is that good? Bad? I'd ask my nephew but he's at uni.

Big "Preview replies" button top right — only thing I understand. I clicked it. A panel opened with "Try a real prospect opener." Fine. That's a sandbox, useful, but it's not what I came for. **I want to see the real ones, not pretend ones.**

Gut: 2/5. Functional but I have no idea if my bot is working.

### Inbox tab

OK now we're talking. STARTED TODAY, BOOKED, COMPLETED, STALLED — exactly what I want. **This should be the front page.** But all four are blank dashes. Page sitting on "Loading conversations..." Orange banner: "Inbox metrics and transcripts below include all VendingPreneurs conversations until flow_id lands on the conversations table."

Mate, I don't know what flow_id is. Something isn't done yet. **If the dashes are real and the bot booked nothing today, that's a five-alarm fire. If the dashes are because the page is half-built, that's a different five-alarm fire.** Either way I need to know.

Gut: 3/5 once it loads — would be 4/5 if this was the landing page.

### Variables tab

I closed this in about four seconds. \"A plain-English map of what the bot remembers.\" Then `brand.brand_name`, `brand.booking_url`, `brand.timezone`. Read-only — \"Creating variables and row-level actions is not wired yet.\" **Why is this a top-level tab?**

Gut: 2/5. Reference page taking up prime real estate.

### Release tab

This one made me feel stupid. \"Compiled from src/lib/prompts/sections/\*.ts.\" \"the simulator runs the compiled setter-v2 prompt without draft overrides.\" **This entire page is for the engineers, not me.** Banner says \"Publish controls and release history are not wired yet.\"

So what's it for? Hide it. Or label it \"Developer status\" and put it behind a settings icon.

Gut: 1/5. Active hostility to my time.

### Bot tab

This is the page that nearly had me. \"Display name — Not named — shared team inbox\" — empty text field. **This is the one thing I wanted to do** — name my bot. But nothing tells me:

- Will the customer see this name?
- Does it say \"Plumber McBot from ABC Plumbing\" on Instagram?
- Is \"shared team inbox\" something I'm opting out of by naming it?

So I didn't change it. I'm not going to risk something I don't understand on a Wednesday afternoon between callouts.

Then: Identity HARD RULES LOCKED, Voice EDITABLE, Message Length HARD LIMIT LOCKED, Affirmation Rules EDITABLE. Some I can change, some I can't. Why? **I'm paying for this. Tell me why my hands are tied.** \"LOCKED\" with no explanation makes me think the company doesn't trust me.

Gut: 2/5. Closest to \"useful\" but mistitled and gated for no stated reason.

## Canvas interactions

Clicked Opening — right panel opens with tabs Setup/Routing/Triggers/Memory plus four buttons. Built for someone who knows what a flow block is. **I do not.**

Tried Qualifier — palette drawer was in the way and my click landed on Objection or the palette title. Clicks that don't land are infuriating.

Palette drawer opens with \"BLOCK LIBRARY\" — Opening, Qualifier, Objection, Booking, Email Capture, Follow-Up, Escalation, Summary. None of these mean anything to me.

Zoom in/out/fit view — fine, no complaints.

## Findings

| #   | Page                       | Category          | Finding                                                                                                                                                                                  | Severity     | Persona Rationale                                                                                                                                                          |
| --- | -------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | All tabs                   | Navigation & Flow | No on/off / pause / kill switch for the bot anywhere visible.                                                                                                                            | **Blocker**  | Tom's #1 reason for opening the app is \"is it running and how do I stop it.\" If the bot says something stupid mid-job, he needs to kill it from his phone in 10 seconds. |
| T2  | Mobile gate                | Navigation & Flow | Phones and tablets see \"Flow Builder needs a desktop\" — no way to monitor or pause from mobile.                                                                                        | **Blocker**  | Tom is on a job site, not at a desk. The thing he most needs to do (pause/check) is the thing he can't do without finding a laptop.                                        |
| T3  | Flow tab                   | Copy & Labels     | Four overlapping pieces of state jargon (\"Edit the shared draft\" / \"Live: setter-v2\" / \"Saved to Supabase\" / \"Unpublished edits\") that don't tell me whether the bot is working. | **Critical** | Zero tell Tom whether his bot is on, off, working, or broken. He needs one badge: \"Bot: Running\" or \"Bot: Paused.\"                                                     |
| T4  | All tabs                   | Navigation & Flow | Inbox tab has the only numbers Tom cares about, but it's the second tab not the first.                                                                                                   | **Critical** | A pragmatist who opens this once a week wants \"did my bot book any jobs today\" above the fold on landing.                                                                |
| T5  | Inbox tab                  | Feedback & State  | Banner in engineering jargon (\"flow_id lands on the conversations table\").                                                                                                             | **Critical** | Tom can't tell if dashes are \"no bookings today\" (panic) or \"page not finished yet\" (relax).                                                                           |
| T6  | Bot tab                    | Forms & Input     | \"Display name\" field with no helper text explaining what the name does.                                                                                                                | **High**     | Tom wants to call his bot \"Plumber McBot\" but won't risk it without knowing if customers see the name on Instagram.                                                      |
| T7  | Bot tab                    | Trust & Safety    | \"HARD RULES LOCKED\" / \"HARD LIMIT LOCKED\" with no explanation of why or how to request a change.                                                                                     | **High**     | \"LOCKED\" with no reason makes Tom feel like a tenant. Either give him a one-line reason or unlock it.                                                                    |
| T8  | Variables tab              | Navigation & Flow | Top-level tab is read-only reference content with banner saying \"not wired yet.\"                                                                                                       | **High**     | Tab takes nav real estate for content that should live behind a Settings cog.                                                                                              |
| T9  | Release tab                | Copy & Labels     | Engineering jargon throughout (\"Compiled from src/lib/prompts/sections/\*.ts\").                                                                                                        | **High**     | Page is for developers. Hide behind a dev menu or rewrite.                                                                                                                 |
| T10 | Flow tab                   | Copy & Labels     | Header tagline \"Edit the shared draft and sanity-check tone\" — Tom didn't come to edit anything.                                                                                       | **High**     | Default tab assumes he's a copywriter. Default to Inbox instead.                                                                                                           |
| T11 | Header                     | Feedback & State  | Three status badges side-by-side communicate three different states; Tom can't tell which means \"bot is alive.\"                                                                        | **High**     | Pragmatist wants one piece of headline status.                                                                                                                             |
| T12 | Flow tab — canvas          | Forms & Input     | Clicking \"Qualifier\" while palette open intercepts on the drawer or neighbour.                                                                                                         | **High**     | Tom has 30 seconds before next callout. A click that doesn't land is a click that gets him cursing.                                                                        |
| T13 | Flow tab                   | Copy & Labels     | Eight conceptual block names Tom needs to learn (Opening / Qualifier / Objection Handler / Booking Handoff / Email Capture).                                                             | **High**     | These are sales process / AI prompt terms. Tom thinks in plain English.                                                                                                    |
| T14 | Bot tab                    | Visual & Layout   | EDITABLE/LOCKED pills with caret expanders mixed in same accordion.                                                                                                                      | **Medium**   | Looks like settings but is read-only viewer for some, editor for others. Group editable up top.                                                                            |
| T15 | All pages                  | Visual & Layout   | Sidebar nav makes 5 features look equally weighted.                                                                                                                                      | **Medium**   | Inbox and Bot matter to Tom; Variables, Release, Flow canvas don't. Visual hierarchy lies to him.                                                                          |
| T16 | Header                     | Trust & Safety    | \"Preview replies\" button in header but no \"Pause bot\" beside it.                                                                                                                     | **Critical** | The number-one panic action has no front-door affordance.                                                                                                                  |
| T17 | Flow tab                   | Trust & Safety    | \"Publish\" not visible; status pills imply changes are queued without saying how to ship them.                                                                                          | **Medium**   | If Tom edited something, he wouldn't know how to make it go live.                                                                                                          |
| T18 | All pages                  | Visual & Layout   | \"Shared draft workspace.\" footer text.                                                                                                                                                 | **Low**      | Worth removing or expanding.                                                                                                                                               |
| T19 | Flow tab                   | Visual & Layout   | Block reads \"OPENING / Opening / Greet warmly...\" — category and name say same word.                                                                                                   | **Low**      | Cosmetic.                                                                                                                                                                  |
| T20 | Flow tab — Preview replies | Feedback & State  | \"Send\" disabled; the action is on \"Run\" instead.                                                                                                                                     | **Medium**   | Pragmatist sees Send, types, clicks Send, nothing happens. Looks broken.                                                                                                   |

## Gut feel — overall

**1.5/5.**

Functional under the hood, I assume. But every page is built for the person who built it. The two questions a paying customer cares about — \"is it on\" and \"how do I turn it off\" — have no front-door answer. The whole thing reads like an internal tool that someone has accidentally shown to a customer.

If a competitor offered \"see my bookings, pause my bot, name my bot\" in three taps on my phone, I'd switch this afternoon.

## Top 3 things to fix before Tom comes back

1. **One global control: \"Bot: ON\" toggle in the header**, on every tab, every screen size. With confirmation.
2. **Default tab = Inbox**, with the four numbers at the top, in real numbers.
3. **Bot tab: rename to \"Settings\"**, put \"Display name\" at the top with one sentence of helper text, and either remove LOCKED sections or replace LOCKED with a tooltip explaining why.

— Tom
