# Exploration Log — Flow Builder

Base URL: http://localhost:3000
Date: 2026-04-27
Scope: /dashboard/flows/[flowId] and its 5 tab views

---

## Page: /dashboard/flows/ig-organic-dm (desktop, default tab=flow)

### Load

- Status: 200
- URL: http://localhost:3000/dashboard/flows/ig-organic-dm
- Load time: 4111ms
- Screenshot: screenshots/flow-ig-organic-dm-001-desktop-load.png

### Header inventory

### Main inventory (visible buttons + links, top 40)

- button "Preview replies" aria=- disabled=false
- button "Flow
  Edit the draft" aria=Flow disabled=false
- button "Inbox
  Review real chats" aria=Inbox disabled=false
- button "Variables
  Check memory" aria=Variables disabled=false
- button "Release
  What's live" aria=Release disabled=false
- button "Bot
  Global rules" aria=Bot disabled=false
- button "(no text)" aria=Zoom out disabled=false
- button "(no text)" aria=Zoom in disabled=false
- button "(no text)" aria=Fit view disabled=false
- button "(no text)" aria=Add block disabled=false
- link "Skip to main content" href=#main
- link "i
  InstaSetter" href=/
- link "Dashboard" href=/dashboard
- link "Conversations" href=/dashboard/conversations
- link "Lead Sources" href=/dashboard/marketing-sources
- link "Flow Builder" href=/dashboard/flows/ig-organic-dm
- link "Dashboard" href=/dashboard

### Full-page screenshot (canvas tab): screenshots/flow-ig-organic-dm-002-desktop-fullpage.png

### Tab: flow

- Clicked via: [role="tab"]:has-text("flow")
- Screenshot: screenshots/flow-ig-organic-dm-10-tab-flow.png

### Tab: runs

- Clicked via: [id="flow-builder-tab-runs"]
- Screenshot: screenshots/flow-ig-organic-dm-11-tab-runs.png

### Tab: variables

- Clicked via: [role="tab"]:has-text("variables")
- Screenshot: screenshots/flow-ig-organic-dm-12-tab-variables.png

### Tab: versions

- Clicked via: [id="flow-builder-tab-versions"]
- Screenshot: screenshots/flow-ig-organic-dm-13-tab-versions.png

### Tab: bot

- Clicked via: [role="tab"]:has-text("bot")
- Screenshot: screenshots/flow-ig-organic-dm-14-tab-bot.png

### Canvas interactions

#### Palette drawer

- Opened palette via: button[aria-label*="block" i]
- Screenshot: screenshots/flow-ig-organic-dm-200-palette-state.png

#### Click first canvas node

- Canvas nodes detected: 0

#### Inspector inspect

- No inspector landmark found via aside/complementary; using viewport screenshot
- Screenshot: screenshots/flow-ig-organic-dm-220-inspector-snapshot.png

#### Simulator toggle

- Simulator toggle not found via known patterns
- Screenshot: screenshots/flow-ig-organic-dm-230-simulator-state.png

#### Simulator interaction

- Did not find a sim input to type into
- Screenshot: screenshots/flow-ig-organic-dm-240-sim-input-filled.png

#### Publish button (skipped: destructive — modifies live runtime)

- No Publish button visible

### Keyboard navigation

- Screenshot after 5x Tab: screenshots/flow-ig-organic-dm-260-keyboard-tab-5.png

---

## Page: /dashboard/flows/ig-organic-dm (mobile 375×667 — gate expected)

- Screenshot: screenshots/flow-ig-organic-dm-300-mobile-gate.png
- Page text (first 600 chars):

```
Skip to main content
i
InstaSetter
Dashboard
Conversations
Lead Sources
Flow Builder
VendingPreneurs
DEV
Dashboard
›
Flow Builder
i
Flow Builder needs a desktop

Editing the flow uses a multi-panel canvas that doesn’t fit on a phone or small tablet. Open this page on a screen at least 1024px wide.

You can still monitor live conversations on your phone.

Open conversations →
```

---

## Page: /dashboard/flows/ig-organic-dm (tablet 768×1024)

- Screenshot: screenshots/flow-ig-organic-dm-400-tablet.png
- Page text (first 600 chars):

```
Skip to main content
i
InstaSetter
Dashboard
Conversations
Lead Sources
Flow Builder
VendingPreneurs
DEV
Dashboard
›
Flow Builder
i
Flow Builder needs a desktop

Editing the flow uses a multi-panel canvas that doesn’t fit on a phone or small tablet. Open this page on a screen at least 1024px wide.

You can still monitor live conversations on your phone.

Open conversations →
```

---

## Page: /dashboard/flows/unknown-flow-test (does this 404 or render?)

- Status: 200
- URL: http://localhost:3000/dashboard/flows/unknown-flow-test
- Screenshot: screenshots/flow-unknown-001-desktop.png
- Page text (first 600 chars):

```
Skip to main content
i
InstaSetter
Dashboard
Conversations
Lead Sources
Flow Builder
VendingPreneurs
DEV
Dashboard
›
Flow Builder
i
VENDINGPRENEURS
Instagram DM Flow
Instagram — Organic DM · Edit the shared draft and sanity-check tone before anything ships.
No unpublished edits
Saved to Supabase
Live: setter-v2
Preview replies
WORKSPACE
Flow
Edit the draft
Inbox
Review real chats
Variables
Check memory
Release
What's live
Bot
Global rules
Shared draft workspace.
OPENING
Opening
Greet warmly, detect initial interest, and ask for location as the first qualifier.
3 exits
QUALIFIER
Qualifier
Colle
```

---

## Page: /dashboard/flows (index — should 404)

- Status: 404
- URL: http://localhost:3000/dashboard/flows
- Screenshot: screenshots/flow-index-001-desktop.png

---

## Console errors (1)

- [flows-index] error: Failed to load resource: the server responded with a status of 404 (Not Found)

## Page errors (0)

## Network failures (1)

- [flows-index] GET http://localhost:3000/dashboard/flows → 404

## Stats

- Screenshots: 16

## Skipped destructive actions

| Page                           | Element                          | Reason                                                   |
| ------------------------------ | -------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| /dashboard/flows/ig-organic-dm | "Publish" button                 | mutates live runtime; outside session-created safety set |
| /dashboard/flows/ig-organic-dm | block "Delete" controls (if any) | targets seeded blocks, not session-created               | # Exploration Log — Deep (Flow Builder Canvas Interactions) |

Date: 2026-04-27

## Canvas node detection

- selector `.react-flow__node`: 0 matches
- selector `[data-id]`: 0 matches
- selector `.react-flow__node-default`: 0 matches
- selector `[role="button"][aria-label*="block" i]`: 8 matches
- selector `[role="treeitem"]`: 0 matches

## Visible block titles on canvas

- found title text: "OPENING"
- found title text: "Opening"
- found title text: "Greet warmly, detect initial interest, and ask for location as the first qualifier."
- found title text: "QUALIFIER"
- found title text: "Qualifier"
- found title text: "Collect at least two of five qualifiers through natural conversation — location first, budget last."
- found title text: "Objection Handler"
- found title text: "BOOKING"
- found title text: "Booking Handoff"
- found title text: "Mirror back what you know, drop the booking link, and ask for email in the same message."
- found title text: "EMAIL CAPTURE"
- found title text: "Email Capture"

## Click the Opening block

- Clicked via: text=Opening
- Screenshot: screenshots/flow-deep-001-opening-block-selected.png

- Inspector content visible: true

## Open "Preview replies" simulator

- Clicked Preview replies
- Screenshot: screenshots/flow-deep-010-simulator-open.png

## Type a test message in the simulator

- Filled visible input/textarea
- Screenshot: screenshots/flow-deep-011-simulator-input.png

### Send the test message

- Send failed via button:has-text("Send"): locator.click: Timeout 3000ms exceeded.
  Call log:
  - waiting for locator('button:has-text("Send")').first()
    - locator resolved to <button disabled type="button">Send</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
    - element is not enabled
    - retrying click action
    - waiting 20ms
      2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
        5 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable

- Sent via: button:has-text("Run")
- Screenshot: screenshots/flow-deep-012-simulator-after-send.png

## Open palette and inspect block library entries

- Opened palette
- Screenshot: screenshots/flow-deep-020-palette-open.png

### Hover a palette item (skipping click — modifies draft)

- Hovered "Booking" palette item
- Screenshot: screenshots/flow-deep-021-palette-hover.png

## Click different block: Qualifier

- Qualifier click failed: locator.click: Timeout 3000ms exceeded.
  Call log:
  - waiting for locator('text=Qualifier').first()
    - locator resolved to <div>Greet warmly, detect initial interest, and ask fo…</div>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <button type="button" draggable="true">…</button> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div>Objection</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div>Objection</div> from <div>…</div> subtree intercepts pointer events
      2 × retrying click action
          - waiting 100ms
          - waiting for element to be visible, enabled and stable
          - element is visible, enabled and stable
          - scrolling into view if needed
          - done scrolling
          - <div>Block library</div> from <div>…</div> subtree intercepts pointer events
      2 × retrying click action
          - waiting 500ms
          - waiting for element to be visible, enabled and stable
          - element is visible, enabled and stable
          - scrolling into view if needed
          - done scrolling
          - <div>Objection</div> from <div>…</div> subtree intercepts pointer events
      2 × retrying click action
          - waiting 500ms
          - waiting for element to be visible, enabled and stable
          - element is visible, enabled and stable
          - scrolling into view if needed
          - done scrolling
          - <div>Block library</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

- Screenshot: screenshots/flow-deep-030-qualifier-selected.png

## Inspector — content audit after Qualifier click

```

```

## Zoom in / Zoom out / Fit view

- Clicked Zoom in
- Clicked Zoom out
- Clicked Fit view
- Screenshot after zoom controls: screenshots/flow-deep-040-after-zoom.png

## Tab: Inbox (live conversations)

- Screenshot: screenshots/flow-deep-050-inbox-loaded.png

## Tab: Variables (full content)

- Screenshot: screenshots/flow-deep-060-variables-full.png

## Tab: Release

- Screenshot: screenshots/flow-deep-070-release-full.png

## Tab: Bot — expand sections

- Screenshot (initial): screenshots/flow-deep-080-bot-initial.png
- Screenshot (after expand HARD RULES): screenshots/flow-deep-081-bot-hardrules-expanded.png

## Console errors

- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende
- [desktop-deep] error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every rende

## Page errors

## Network failures
