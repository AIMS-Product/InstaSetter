// Flow Builder UX Persona Review — Playwright exploration
//
// Walks /dashboard/flows/[flowId] across 5 tabs + canvas interactions,
// captures screenshots at 3 viewports, logs console + network errors.
// Safe by default: never clicks Publish, never deletes seed blocks.

import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = path.resolve('reports/ux-persona-review/screenshots')
const LOG_PATH = path.resolve('reports/ux-persona-review/exploration-log.md')
const CREATED_PATH = path.resolve(
  'reports/ux-persona-review/session-created.json'
)

const FLOW_ID = 'ig-organic-dm'
const UNKNOWN_FLOW_ID = 'unknown-flow-test'

const desktopViewport = { width: 1440, height: 900 }
const mobileViewport = { width: 375, height: 667 }
const tabletViewport = { width: 768, height: 1024 }

const consoleErrors = []
const networkFailures = []
const pageErrors = []

let screenshotCount = 0
async function snap(page, name) {
  screenshotCount++
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
  try {
    await page.screenshot({ path: file, fullPage: false, timeout: 8000 })
  } catch (e) {
    return `(screenshot failed: ${e.message})`
  }
  return path.relative(path.resolve('reports/ux-persona-review'), file)
}

async function snapFull(page, name) {
  screenshotCount++
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 12000 })
  } catch (e) {
    return `(screenshot failed: ${e.message})`
  }
  return path.relative(path.resolve('reports/ux-persona-review'), file)
}

function attachListeners(page, scope) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({
        scope,
        type: msg.type(),
        text: msg.text(),
        url: page.url(),
      })
    }
  })
  page.on('pageerror', (err) => {
    pageErrors.push({ scope, message: err.message, url: page.url() })
  })
  page.on('requestfailed', (req) => {
    networkFailures.push({
      scope,
      url: req.url(),
      method: req.method(),
      reason: req.failure()?.errorText,
    })
  })
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

const log = []
function addLog(line) {
  log.push(line)
}

async function main() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: desktopViewport })
  const page = await context.newPage()
  attachListeners(page, 'desktop')

  addLog('# Exploration Log — Flow Builder\n')
  addLog(`Base URL: ${BASE_URL}`)
  addLog(`Date: ${new Date().toISOString().slice(0, 10)}`)
  addLog(`Scope: /dashboard/flows/[flowId] and its 5 tab views`)
  addLog('')

  // =========================================================
  // SECTION 1: Desktop — load + each tab + interactive panels
  // =========================================================
  addLog('---\n')
  addLog(`## Page: /dashboard/flows/${FLOW_ID} (desktop, default tab=flow)\n`)
  const t0 = Date.now()
  const homeResp = await page.goto(`${BASE_URL}/dashboard/flows/${FLOW_ID}`, {
    waitUntil: 'networkidle',
    timeout: 25000,
  })
  await page.waitForTimeout(800)
  const loadTime = Date.now() - t0
  addLog(`### Load`)
  addLog(`- Status: ${homeResp?.status() ?? '(unknown)'}`)
  addLog(`- URL: ${page.url()}`)
  addLog(`- Load time: ${loadTime}ms`)
  let s = await snap(page, `flow-${FLOW_ID}-001-desktop-load`)
  addLog(`- Screenshot: ${s}`)
  addLog('')

  // Inventory the page header
  addLog(`### Header inventory`)
  const headerButtons = await page
    .locator('header button')
    .all()
    .catch(() => [])
  for (const btn of headerButtons) {
    const text = (await btn.innerText().catch(() => '')).trim()
    const aria = await btn.getAttribute('aria-label').catch(() => null)
    addLog(`- header button: "${text}" aria=${aria ?? '(none)'}`)
  }
  addLog('')

  // Page-level main inventory
  addLog(`### Main inventory (visible buttons + links, top 40)`)
  const allBtns = await page
    .locator('button:visible')
    .all()
    .catch(() => [])
  const allLinks = await page
    .locator('a:visible')
    .all()
    .catch(() => [])
  let inventory = []
  for (const btn of allBtns.slice(0, 40)) {
    const text = ((await btn.innerText().catch(() => '')) || '')
      .trim()
      .slice(0, 80)
    const aria = await btn.getAttribute('aria-label').catch(() => null)
    const disabled = await btn.isDisabled().catch(() => false)
    inventory.push(
      `- button "${text || '(no text)'}" aria=${aria ?? '-'} disabled=${disabled}`
    )
  }
  for (const link of allLinks.slice(0, 20)) {
    const text = ((await link.innerText().catch(() => '')) || '')
      .trim()
      .slice(0, 60)
    const href = await link.getAttribute('href').catch(() => null)
    inventory.push(`- link "${text || '(no text)'}" href=${href ?? '-'}`)
  }
  addLog(inventory.join('\n'))
  addLog('')

  // Full-page screenshot of canvas at first paint
  s = await snapFull(page, `flow-${FLOW_ID}-002-desktop-fullpage`)
  addLog(`### Full-page screenshot (canvas tab): ${s}`)
  addLog('')

  // Try clicking each tab in PageNav (flow / runs / variables / versions / bot)
  const tabIds = ['flow', 'runs', 'variables', 'versions', 'bot']
  for (let i = 0; i < tabIds.length; i++) {
    const tab = tabIds[i]
    addLog(`### Tab: ${tab}`)
    // Try the tab role pattern first
    let clicked = false
    let usedSelector = null
    const candidates = [
      `[role="tab"]:has-text("${tab}")`,
      `button:has-text("${tab}")`,
      `[id="flow-builder-tab-${tab}"]`,
      `[aria-controls="flow-builder-panel-${tab}"]`,
    ]
    for (const sel of candidates) {
      try {
        const el = page.locator(sel).first()
        if ((await el.count()) > 0 && (await el.isVisible())) {
          await el.click({ timeout: 3000 })
          clicked = true
          usedSelector = sel
          break
        }
      } catch {}
    }
    if (clicked) {
      addLog(`- Clicked via: ${usedSelector}`)
      await page.waitForTimeout(500)
    } else {
      addLog(
        `- Could not find/click tab via known selectors (will try label "${tab}" case-insensitive)`
      )
      try {
        const el = page.getByText(new RegExp(`^${tab}$`, 'i')).first()
        if ((await el.count()) > 0) {
          await el.click({ timeout: 3000 })
          addLog(`- Clicked via getByText("${tab}")`)
          clicked = true
          await page.waitForTimeout(500)
        }
      } catch {}
    }
    s = await snapFull(page, `flow-${FLOW_ID}-1${i + 0}-tab-${tab}`)
    addLog(`- Screenshot: ${s}`)
    addLog('')
  }

  // Switch back to flow tab for canvas interactions
  try {
    const flowTab = page.getByText(/^flow$/i).first()
    if ((await flowTab.count()) > 0) await flowTab.click({ timeout: 3000 })
  } catch {}
  await page.waitForTimeout(500)

  // ==============================
  // SECTION 2: Canvas interactions
  // ==============================
  addLog(`### Canvas interactions`)

  // Open palette drawer (try a button that mentions palette/blocks/+ Add)
  addLog(`#### Palette drawer`)
  let paletteOpened = false
  for (const sel of [
    'button:has-text("Add block")',
    'button:has-text("Blocks")',
    'button:has-text("Palette")',
    'button:has-text("+ Block")',
    'button[aria-label*="palette" i]',
    'button[aria-label*="block" i]',
  ]) {
    try {
      const el = page.locator(sel).first()
      if ((await el.count()) > 0 && (await el.isVisible())) {
        await el.click({ timeout: 3000 })
        paletteOpened = true
        addLog(`- Opened palette via: ${sel}`)
        await page.waitForTimeout(500)
        break
      }
    } catch {}
  }
  if (!paletteOpened)
    addLog(`- Palette open trigger not found via known patterns`)
  s = await snapFull(page, `flow-${FLOW_ID}-200-palette-state`)
  addLog(`- Screenshot: ${s}`)
  addLog('')

  // Click on a node in the canvas (xyflow .react-flow__node)
  addLog(`#### Click first canvas node`)
  try {
    const nodes = page.locator('.react-flow__node')
    const nodeCount = await nodes.count()
    addLog(`- Canvas nodes detected: ${nodeCount}`)
    if (nodeCount > 0) {
      await nodes.first().click({ timeout: 3000 })
      await page.waitForTimeout(600)
      s = await snapFull(page, `flow-${FLOW_ID}-210-node-selected`)
      addLog(`- Screenshot after selecting first node: ${s}`)
    }
  } catch (e) {
    addLog(`- Failed to click canvas node: ${e.message}`)
  }
  addLog('')

  // Inspector — click around inputs in inspector
  addLog(`#### Inspector inspect`)
  try {
    const inspector = page.locator('aside, [role="complementary"]').first()
    const insExists = (await inspector.count()) > 0
    if (insExists) {
      const insTexts = await inspector.locator('input, textarea, select').all()
      addLog(`- Inspector inputs detected: ${insTexts.length}`)
    } else {
      addLog(
        `- No inspector landmark found via aside/complementary; using viewport screenshot`
      )
    }
    s = await snap(page, `flow-${FLOW_ID}-220-inspector-snapshot`)
    addLog(`- Screenshot: ${s}`)
  } catch (e) {
    addLog(`- Inspector inspect failed: ${e.message}`)
  }
  addLog('')

  // Simulator — click toggle (looks like an arrow/play/sim button in header)
  addLog(`#### Simulator toggle`)
  let simToggled = false
  for (const sel of [
    'button:has-text("Simulator")',
    'button:has-text("Test")',
    'button:has-text("Try")',
    'button:has-text("Sim")',
    'button[aria-label*="simulator" i]',
    'button[aria-label*="test" i]',
  ]) {
    try {
      const el = page.locator(sel).first()
      if ((await el.count()) > 0 && (await el.isVisible())) {
        await el.click({ timeout: 3000 })
        simToggled = true
        addLog(`- Toggled simulator via: ${sel}`)
        await page.waitForTimeout(800)
        break
      }
    } catch {}
  }
  if (!simToggled) addLog(`- Simulator toggle not found via known patterns`)
  s = await snapFull(page, `flow-${FLOW_ID}-230-simulator-state`)
  addLog(`- Screenshot: ${s}`)
  addLog('')

  // Try entering text into the simulator input if any
  addLog(`#### Simulator interaction`)
  try {
    const inputs = await page
      .locator('input[placeholder], textarea[placeholder]')
      .all()
    let typed = false
    for (const inp of inputs.slice(0, 5)) {
      const ph = await inp.getAttribute('placeholder')
      if (ph && /(message|reply|send|type|simulat|prospect|user)/i.test(ph)) {
        try {
          await inp.fill('Hi! Tell me more about vending machines please?', {
            timeout: 3000,
          })
          typed = true
          addLog(`- Typed test prompt into input placeholder="${ph}"`)
          break
        } catch {}
      }
    }
    if (!typed) addLog(`- Did not find a sim input to type into`)
    s = await snap(page, `flow-${FLOW_ID}-240-sim-input-filled`)
    addLog(`- Screenshot: ${s}`)
  } catch (e) {
    addLog(`- Sim interaction failed: ${e.message}`)
  }
  addLog('')

  // Look for Publish — DO NOT CLICK; just record
  addLog(`#### Publish button (skipped: destructive — modifies live runtime)`)
  try {
    const pub = page.locator('button:has-text("Publish")').first()
    if ((await pub.count()) > 0) {
      const box = await pub.boundingBox()
      addLog(`- Found Publish button at ${JSON.stringify(box)}`)
      // Hover only
      await pub.hover({ timeout: 2000 }).catch(() => {})
      s = await snap(page, `flow-${FLOW_ID}-250-publish-hover`)
      addLog(`- Screenshot (hover): ${s}`)
    } else {
      addLog(`- No Publish button visible`)
    }
  } catch (e) {
    addLog(`- Publish lookup failed: ${e.message}`)
  }
  addLog('')

  // ==============================
  // SECTION 3: Keyboard navigation
  // ==============================
  addLog(`### Keyboard navigation`)
  try {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    s = await snap(page, `flow-${FLOW_ID}-260-keyboard-tab-5`)
    addLog(`- Screenshot after 5x Tab: ${s}`)
  } catch (e) {
    addLog(`- Keyboard tab failed: ${e.message}`)
  }
  addLog('')

  // ==============================
  // SECTION 4: Mobile viewport (gate)
  // ==============================
  await context.close()
  addLog('---\n')
  addLog(
    `## Page: /dashboard/flows/${FLOW_ID} (mobile 375×667 — gate expected)\n`
  )
  const mobileCtx = await browser.newContext({ viewport: mobileViewport })
  const mPage = await mobileCtx.newPage()
  attachListeners(mPage, 'mobile')
  await mPage.goto(`${BASE_URL}/dashboard/flows/${FLOW_ID}`, {
    waitUntil: 'networkidle',
    timeout: 20000,
  })
  await mPage.waitForTimeout(500)
  s = await snapFull(mPage, `flow-${FLOW_ID}-300-mobile-gate`)
  addLog(`- Screenshot: ${s}`)
  // Inventory
  const mobileText = (
    await mPage
      .locator('body')
      .innerText()
      .catch(() => '')
  ).slice(0, 600)
  addLog(`- Page text (first 600 chars):`)
  addLog('```\n' + mobileText + '\n```')
  addLog('')
  await mobileCtx.close()

  // ==============================
  // SECTION 5: Tablet viewport
  // ==============================
  addLog('---\n')
  addLog(`## Page: /dashboard/flows/${FLOW_ID} (tablet 768×1024)\n`)
  const tabletCtx = await browser.newContext({ viewport: tabletViewport })
  const tPage = await tabletCtx.newPage()
  attachListeners(tPage, 'tablet')
  await tPage.goto(`${BASE_URL}/dashboard/flows/${FLOW_ID}`, {
    waitUntil: 'networkidle',
    timeout: 20000,
  })
  await tPage.waitForTimeout(500)
  s = await snapFull(tPage, `flow-${FLOW_ID}-400-tablet`)
  addLog(`- Screenshot: ${s}`)
  const tabletText = (
    await tPage
      .locator('body')
      .innerText()
      .catch(() => '')
  ).slice(0, 600)
  addLog(`- Page text (first 600 chars):`)
  addLog('```\n' + tabletText + '\n```')
  addLog('')
  await tabletCtx.close()

  // ==============================
  // SECTION 6: Unknown flow ID
  // ==============================
  addLog('---\n')
  addLog(
    `## Page: /dashboard/flows/${UNKNOWN_FLOW_ID} (does this 404 or render?)\n`
  )
  const unkCtx = await browser.newContext({ viewport: desktopViewport })
  const uPage = await unkCtx.newPage()
  attachListeners(uPage, 'unknown-flow')
  const unkResp = await uPage.goto(
    `${BASE_URL}/dashboard/flows/${UNKNOWN_FLOW_ID}`,
    { waitUntil: 'networkidle', timeout: 20000 }
  )
  addLog(`- Status: ${unkResp?.status() ?? '(unknown)'}`)
  addLog(`- URL: ${uPage.url()}`)
  await uPage.waitForTimeout(800)
  s = await snapFull(uPage, `flow-unknown-001-desktop`)
  addLog(`- Screenshot: ${s}`)
  const unkText = (
    await uPage
      .locator('body')
      .innerText()
      .catch(() => '')
  ).slice(0, 600)
  addLog(`- Page text (first 600 chars):`)
  addLog('```\n' + unkText + '\n```')
  addLog('')
  await unkCtx.close()

  // ==============================
  // SECTION 7: /dashboard/flows (no index page)
  // ==============================
  addLog('---\n')
  addLog(`## Page: /dashboard/flows (index — should 404)\n`)
  const idxCtx = await browser.newContext({ viewport: desktopViewport })
  const iPage = await idxCtx.newPage()
  attachListeners(iPage, 'flows-index')
  const idxResp = await iPage.goto(`${BASE_URL}/dashboard/flows`, {
    waitUntil: 'networkidle',
    timeout: 20000,
  })
  addLog(`- Status: ${idxResp?.status() ?? '(unknown)'}`)
  addLog(`- URL: ${iPage.url()}`)
  s = await snapFull(iPage, `flow-index-001-desktop`)
  addLog(`- Screenshot: ${s}`)
  await idxCtx.close()

  // ==============================
  // SECTION 8: Errors summary
  // ==============================
  addLog('---\n')
  addLog(`## Console errors (${consoleErrors.length})\n`)
  for (const e of consoleErrors.slice(0, 30)) {
    addLog(`- [${e.scope}] ${e.type}: ${e.text.slice(0, 200)}`)
  }
  addLog('')
  addLog(`## Page errors (${pageErrors.length})\n`)
  for (const e of pageErrors.slice(0, 30)) {
    addLog(`- [${e.scope}] ${e.message.slice(0, 200)}`)
  }
  addLog('')
  addLog(`## Network failures (${networkFailures.length})\n`)
  for (const e of networkFailures.slice(0, 30)) {
    addLog(`- [${e.scope}] ${e.method} ${e.url} → ${e.status ?? e.reason}`)
  }
  addLog('')
  addLog(`## Stats`)
  addLog(`- Screenshots: ${screenshotCount}`)
  addLog('')
  addLog(`## Skipped destructive actions`)
  addLog(
    `| Page | Element | Reason |\n|---|---|---|\n| /dashboard/flows/${FLOW_ID} | "Publish" button | mutates live runtime; outside session-created safety set |\n| /dashboard/flows/${FLOW_ID} | block "Delete" controls (if any) | targets seeded blocks, not session-created |`
  )

  await browser.close()

  await fs.writeFile(LOG_PATH, log.join('\n'))
  await fs.writeFile(
    CREATED_PATH,
    JSON.stringify(
      { created: [], note: 'No persona-created records this run.' },
      null,
      2
    )
  )
  console.log(`Log written to ${LOG_PATH}`)
  console.log(`Screenshots: ${screenshotCount}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
