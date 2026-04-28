// Deep exploration: canvas interactions, simulator, block inspector, palette drag
import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = path.resolve('reports/ux-persona-review/screenshots')
const LOG_PATH = path.resolve(
  'reports/ux-persona-review/exploration-log-deep.md'
)
const FLOW_ID = 'ig-organic-dm'

const consoleErrors = []
const networkFailures = []
const pageErrors = []
const log = []
const addLog = (l) => log.push(l)

async function snap(page, name, full = false) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
  try {
    await page.screenshot({ path: file, fullPage: full, timeout: 12000 })
  } catch (e) {
    return `(failed: ${e.message})`
  }
  return path.relative(path.resolve('reports/ux-persona-review'), file)
}

function attach(page, scope) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ scope, type: msg.type(), text: msg.text() })
    }
  })
  page.on('pageerror', (err) =>
    pageErrors.push({ scope, message: err.message })
  )
  page.on('requestfailed', (req) =>
    networkFailures.push({ scope, url: req.url(), method: req.method() })
  )
  page.on('response', (resp) => {
    const status = resp.status()
    if (status >= 400) {
      networkFailures.push({
        scope,
        url: resp.url(),
        method: resp.request().method(),
        status,
      })
    }
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  attach(page, 'desktop-deep')

  addLog('# Exploration Log — Deep (Flow Builder Canvas Interactions)\n')
  addLog(`Date: ${new Date().toISOString().slice(0, 10)}\n`)

  await page.goto(`${BASE_URL}/dashboard/flows/${FLOW_ID}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(2000) // wait for React Flow hydration

  addLog('## Canvas node detection\n')
  // Try multiple selectors for xyflow nodes
  const nodeSelectors = [
    '.react-flow__node',
    '[data-id]',
    '.react-flow__node-default',
    '[role="button"][aria-label*="block" i]',
    '[role="treeitem"]',
  ]
  let foundNodes = 0
  let nodeSelector = null
  for (const sel of nodeSelectors) {
    const count = await page.locator(sel).count()
    addLog(`- selector \`${sel}\`: ${count} matches`)
    if (count > foundNodes) {
      foundNodes = count
      nodeSelector = sel
    }
  }
  addLog('')

  // Get visible block names from the canvas region
  addLog('## Visible block titles on canvas\n')
  const blockTitles = await page
    .locator(
      'text=/Opening|Qualifier|Objection Handler|Booking|Email Capture|Follow-up|Escalation|Summary/i'
    )
    .all()
  for (const bt of blockTitles.slice(0, 12)) {
    const txt = (await bt.innerText().catch(() => '')).trim()
    addLog(`- found title text: "${txt}"`)
  }
  addLog('')

  // Click on the "Opening" block (heading text on the card)
  addLog('## Click the Opening block\n')
  let clicked = false
  for (const sel of [
    'text=Opening',
    'h3:has-text("Opening")',
    '[aria-label*="Opening" i]',
  ]) {
    const el = page.locator(sel).first()
    if ((await el.count()) > 0) {
      try {
        await el.click({ timeout: 3000 })
        clicked = true
        addLog(`- Clicked via: ${sel}`)
        break
      } catch (e) {
        addLog(`- Failed to click via ${sel}: ${e.message}`)
      }
    }
  }
  await page.waitForTimeout(800)
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-001-opening-block-selected', true)}`
  )
  addLog('')

  // Look at what panels appeared
  const inspectorVisible = await page
    .locator(
      'text=/Acceptance|Sample replies|Variables touched|Branches|Routes|Triggers/i'
    )
    .first()
    .isVisible()
    .catch(() => false)
  addLog(`- Inspector content visible: ${inspectorVisible}`)
  addLog('')

  // Go to Preview replies
  addLog('## Open "Preview replies" simulator\n')
  let simOpened = false
  const simEl = page.getByRole('button', { name: /preview replies/i }).first()
  if ((await simEl.count()) > 0) {
    try {
      await simEl.click({ timeout: 3000 })
      simOpened = true
      addLog(`- Clicked Preview replies`)
      await page.waitForTimeout(1000)
    } catch (e) {
      addLog(`- Failed to click Preview replies: ${e.message}`)
    }
  } else {
    addLog(`- "Preview replies" button not found`)
  }
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-010-simulator-open', true)}`
  )
  addLog('')

  // Try typing into the simulator input
  if (simOpened) {
    addLog('## Type a test message in the simulator\n')
    const inputs = await page.locator('textarea, input[type="text"]').all()
    let typed = false
    for (const inp of inputs.reverse()) {
      const visible = await inp.isVisible().catch(() => false)
      if (visible) {
        try {
          await inp.fill(
            'Hi! interested in vending business — how do I get started?',
            {
              timeout: 3000,
            }
          )
          typed = true
          addLog(`- Filled visible input/textarea`)
          break
        } catch {}
      }
    }
    if (!typed) addLog(`- No usable input found`)
    addLog(
      `- Screenshot: ${await snap(page, 'flow-deep-011-simulator-input', true)}`
    )
    addLog('')

    // Try sending — look for a send button
    addLog('### Send the test message\n')
    let sent = false
    for (const sel of [
      'button:has-text("Send")',
      'button:has-text("Try")',
      'button:has-text("Run")',
      'button[aria-label*="send" i]',
    ]) {
      const el = page.locator(sel).first()
      if ((await el.count()) > 0) {
        try {
          await el.click({ timeout: 3000 })
          sent = true
          addLog(`- Sent via: ${sel}`)
          await page.waitForTimeout(3500) // wait for reply
          break
        } catch (e) {
          addLog(`- Send failed via ${sel}: ${e.message}`)
        }
      }
    }
    if (!sent) addLog(`- No send button found / clickable`)
    addLog(
      `- Screenshot: ${await snap(page, 'flow-deep-012-simulator-after-send', true)}`
    )
    addLog('')

    // Close simulator
    const closeBtn = page.getByRole('button', { name: /close|×/i }).first()
    if ((await closeBtn.count()) > 0) {
      try {
        await closeBtn.click({ timeout: 2000 })
      } catch {}
    }
    await page.waitForTimeout(500)
  }

  // Open palette and pick a block
  addLog('## Open palette and inspect block library entries\n')
  const addBlockBtn = page.getByRole('button', { name: /add block/i }).first()
  if ((await addBlockBtn.count()) > 0) {
    try {
      await addBlockBtn.click({ timeout: 3000 })
      await page.waitForTimeout(500)
      addLog(`- Opened palette`)
    } catch (e) {
      addLog(`- Failed to open palette: ${e.message}`)
    }
  }
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-020-palette-open', true)}`
  )

  // Click on a palette item to add a block — but cancel if confirmation needed
  // Skipping: this would create an artifact, but we may not have a way to undo.
  // Will instead hover to capture tooltip behavior.
  addLog('### Hover a palette item (skipping click — modifies draft)\n')
  const paletteItem = page.locator('text=/^Booking$/').first()
  if ((await paletteItem.count()) > 0) {
    try {
      await paletteItem.hover({ timeout: 2000 })
      addLog('- Hovered "Booking" palette item')
    } catch {}
  }
  await page.waitForTimeout(400)
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-021-palette-hover', true)}`
  )
  addLog('')

  // Close palette via outside click or escape
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(300)

  // Inspect inspector after clicking a different block
  addLog('## Click different block: Qualifier\n')
  const qualifier = page.locator('text=Qualifier').first()
  if ((await qualifier.count()) > 0) {
    try {
      await qualifier.click({ timeout: 3000 })
      await page.waitForTimeout(700)
      addLog('- Clicked Qualifier')
    } catch (e) {
      addLog(`- Qualifier click failed: ${e.message}`)
    }
  }
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-030-qualifier-selected', true)}`
  )
  addLog('')

  // Look at controls in inspector — try expand/collapse arrows, edit areas
  addLog('## Inspector — content audit after Qualifier click\n')
  const inspectorTexts = await page
    .locator('section, aside, [aria-label*="inspector" i]')
    .first()
    .innerText()
    .catch(() => '')
  addLog('```\n' + inspectorTexts.slice(0, 800) + '\n```')
  addLog('')

  // Zoom controls
  addLog('## Zoom in / Zoom out / Fit view\n')
  for (const lbl of ['Zoom in', 'Zoom out', 'Fit view']) {
    const btn = page.locator(`[aria-label="${lbl}"]`).first()
    if ((await btn.count()) > 0) {
      try {
        await btn.click({ timeout: 2000 })
        await page.waitForTimeout(300)
        addLog(`- Clicked ${lbl}`)
      } catch {}
    }
  }
  addLog(
    `- Screenshot after zoom controls: ${await snap(page, 'flow-deep-040-after-zoom', true)}`
  )
  addLog('')

  // Tab nav: go to Inbox tab and screenshot what's there
  addLog('## Tab: Inbox (live conversations)\n')
  const inboxTab = page.locator('[id="flow-builder-tab-runs"]').first()
  if ((await inboxTab.count()) > 0) {
    try {
      await inboxTab.click({ timeout: 2000 })
      await page.waitForTimeout(2000) // wait for "Loading conversations..." to settle
    } catch {}
  }
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-050-inbox-loaded', true)}`
  )
  addLog('')

  // Variables tab
  addLog('## Tab: Variables (full content)\n')
  const variablesTab = page.locator('[id="flow-builder-tab-variables"]').first()
  if ((await variablesTab.count()) > 0) {
    try {
      await variablesTab.click({ timeout: 2000 })
      await page.waitForTimeout(800)
    } catch {}
  }
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-060-variables-full', true)}`
  )
  addLog('')

  // Versions tab
  addLog('## Tab: Release\n')
  const versionsTab = page.locator('[id="flow-builder-tab-versions"]').first()
  if ((await versionsTab.count()) > 0) {
    try {
      await versionsTab.click({ timeout: 2000 })
      await page.waitForTimeout(800)
    } catch {}
  }
  addLog(
    `- Screenshot: ${await snap(page, 'flow-deep-070-release-full', true)}`
  )
  addLog('')

  // Bot tab — expand the locked sections + editable
  addLog('## Tab: Bot — expand sections\n')
  const botTab = page.locator('[id="flow-builder-tab-bot"]').first()
  if ((await botTab.count()) > 0) {
    try {
      await botTab.click({ timeout: 2000 })
      await page.waitForTimeout(800)
    } catch {}
  }
  addLog(
    `- Screenshot (initial): ${await snap(page, 'flow-deep-080-bot-initial', true)}`
  )
  // Try expanding a locked section
  const lockedHeader = page.locator('text=Identity — HARD RULES').first()
  if ((await lockedHeader.count()) > 0) {
    try {
      await lockedHeader.click({ timeout: 2000 })
      await page.waitForTimeout(400)
    } catch {}
  }
  addLog(
    `- Screenshot (after expand HARD RULES): ${await snap(page, 'flow-deep-081-bot-hardrules-expanded', true)}`
  )
  addLog('')

  // Errors summary
  addLog('## Console errors\n')
  for (const e of consoleErrors.slice(0, 30)) {
    addLog(`- [${e.scope}] ${e.type}: ${e.text.slice(0, 200)}`)
  }
  addLog('')
  addLog('## Page errors\n')
  for (const e of pageErrors.slice(0, 30)) {
    addLog(`- [${e.scope}] ${e.message.slice(0, 200)}`)
  }
  addLog('')
  addLog('## Network failures\n')
  for (const e of networkFailures.slice(0, 30)) {
    addLog(`- [${e.scope}] ${e.method} ${e.url} → ${e.status ?? 'failed'}`)
  }

  await browser.close()
  await fs.writeFile(LOG_PATH, log.join('\n'))
  console.log('Deep log written.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
