'use strict'

/**
 * The driver behind the visual checks — finding the running app, opening a browser,
 * auditing one screen, and writing the picture of it.
 *
 * The standards being enforced are in `design/VISUAL-CHECKS.md`; the three in-page rules
 * are in `./rules.js`. This file adds Rule 4, which cannot be asked of the page itself:
 * a page that threw on the way up has to be watched from outside.
 */

const fs = require('fs')
const http = require('http')
const path = require('path')
const { chromium } = require('playwright')
const { collectFailures } = require('./rules')

/** The one width the checks run at. See VISUAL-CHECKS.md, "The standard width". */
const VIEWPORT = { width: 1440, height: 900 }

/**
 * The address is probed, never assumed. `nuxt start` announced `http://::1:3000/` on
 * 2026-08-23 and 127.0.0.1 did not answer at all.
 *
 * ⚠ THE ORDER IS LOAD-BEARING. Probing 127.0.0.1 first fell through to the IPv6 literal,
 * which the manager pages' dev auto-login does not recognise (`checkAuth()` keys on the
 * hostname) — so every hub rendered "Access Restricted" and the checks passed on it.
 *
 * @type {Array<{url: string, family: number}>}
 */
const CANDIDATE_HOSTS = [
  { url: 'http://localhost:3000', family: 4 },
  { url: 'http://localhost:3000', family: 6 },
  { url: 'http://127.0.0.1:3000', family: 4 },
  { url: 'http://[::1]:3000', family: 6 }
]

/** Where the pictures go. Ignored by git — they are for looking at, not for keeping. */
const SHOT_DIR = path.join(__dirname, '..', '..', '..', 'visual-screenshots')

/**
 * Asks one candidate address whether it is serving the app.
 *
 * The address family is forced rather than left to Node's resolver: `localhost` resolves
 * to both, Node picks one, and picking the wrong one is indistinguishable from the
 * server being down.
 *
 * @param {{url: string, family: number}} candidate the address and family to try
 * @returns {Promise<boolean>} true when it answered with any HTTP status at all
 */
function answers (candidate) {
  return new Promise((resolve) => {
    const req = http.get(candidate.url + '/', { timeout: 8000, family: candidate.family }, (res) => {
      res.resume()
      resolve(true)
    })
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.on('error', () => resolve(false))
  })
}

/**
 * Finds the address the running app actually answers on.
 *
 * Throws with the command to type rather than returning null: a check that quietly
 * passes against a page it never loaded is worse than no check at all.
 *
 * @returns {Promise<string>} the base URL, e.g. `http://localhost:3000`
 * @throws {Error} when nothing answers on any candidate address
 */
async function resolveBaseUrl () {
  for (const candidate of CANDIDATE_HOSTS) {
    if (await answers(candidate)) { return candidate.url }
  }
  throw new Error(
    '\n\n  THE APP IS NOT RUNNING, so there is nothing to look at.\n\n' +
    '  Tried: ' + CANDIDATE_HOSTS.map(c => c.url + ' (IPv' + c.family + ')').join(', ') + '\n\n' +
    '  Start it in another terminal, wait for it to say it is listening, then run this again:\n\n' +
    '      npm run serve\n\n' +
    '  These checks drive a real browser against the real screens. They cannot run\n' +
    '  without the app up, and they will never pretend otherwise.\n'
  )
}

/**
 * Opens Chromium at the standard width.
 *
 * @returns {Promise<{browser: object, context: object}>} close the browser when done
 */
async function openBrowser () {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT })
  return { browser, context }
}

/**
 * Loads one screen, applies every rule to it, and writes its picture.
 *
 * Rule 4 is gathered here, from outside the page: a page that threw on the way up will
 * fail the layout rules for reasons that have nothing to do with its layout.
 *
 * @param {object} context an open Playwright browser context
 * @param {string} baseUrl the address `resolveBaseUrl()` found
 * @param {{name: string, path: string, tabs: boolean}} screen the screen to audit
 * @returns {Promise<Array<{where: string, rule: string, detail: string}>>} every breach
 *   found, across the screen and — on a hub — each of its panels in turn
 */
async function auditScreen (context, baseUrl, screen) {
  const page = await context.newPage()
  const runtime = []

  page.on('pageerror', (err) => {
    runtime.push({ rule: 'Rule 4 — the page loaded without a JavaScript error', detail: String(err.message).slice(0, 200) })
  })
  page.on('requestfailed', (req) => {
    const type = req.resourceType()
    if (type === 'script' || type === 'stylesheet') {
      runtime.push({
        rule: 'Rule 4 — the page loaded without a JavaScript error',
        detail: 'a ' + type + ' failed to load: ' + req.url().slice(0, 120)
      })
    }
  })

  const failures = []
  try {
    await page.goto(baseUrl + screen.path, { waitUntil: 'networkidle', timeout: 60000 })
    // `networkidle` can arrive a beat before Vue has settled the DOM.
    await page.waitForTimeout(700)

    const panels = screen.tabs ? await page.$$('[data-tab]') : []

    // A screen that did not render must FAIL, never pass quietly — the precondition
    // every rule rests on. An error page has no squashed boxes on it.
    if (screen.tabs && !panels.length) {
      failures.push({
        where: screen.name,
        rule: 'The screen did not render — nothing was actually checked',
        detail: 'no menu items ([data-tab]) were found on ' + screen.path + '. The hub did not open: ' +
          'the heading was "' + (await page.title()) + '" and the page reads "' +
          (await page.evaluate(() => document.body.innerText.trim().slice(0, 120))) + '". ' +
          'Every rule below would have passed on it, which is why this is reported instead.'
      })
    } else if (!panels.length) {
      failures.push(...(await inspect(page, screen.name, screen.name)))
    } else {
      // A hub is not one screen — the phasing-box defect was on a PANEL. The menu is
      // read from the page, so a tab added tomorrow is covered automatically.
      for (let i = 0; i < panels.length; i++) {
        const menuItem = panels[i]
        const key = await menuItem.getAttribute('data-tab')
        await menuItem.click()
        await page.waitForTimeout(600)
        failures.push(...(await inspect(page, screen.name, screen.name + ' › ' + key)))
      }
    }
  } finally {
    failures.push(...runtime.map(r => Object.assign({ where: screen.name }, r)))
    await page.close()
  }

  return failures
}

/**
 * Runs the in-page rules and writes a full-page screenshot of what was measured.
 *
 * @param {object} page the open Playwright page
 * @param {string} screenName the screen, for the file name
 * @param {string} where the screen or panel, for the failure message
 * @returns {Promise<Array<{where: string, rule: string, detail: string}>>} breaches found
 */
async function inspect (page, screenName, where) {
  const found = await page.evaluate(collectFailures)
  const safe = where.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  await page.screenshot({ path: path.join(SHOT_DIR, safe + '.png'), fullPage: true })
  return found.map(f => Object.assign({ where }, f))
}

/** Empties and recreates the screenshot folder so a run never shows yesterday's pictures. */
function prepareScreenshotDir () {
  if (!fs.existsSync(SHOT_DIR)) { fs.mkdirSync(SHOT_DIR, { recursive: true }) }
  for (const file of fs.readdirSync(SHOT_DIR)) {
    if (file.endsWith('.png')) { fs.unlinkSync(path.join(SHOT_DIR, file)) }
  }
}

/**
 * Turns a list of breaches into the message a person reads when the check fails.
 *
 * @param {Array<{where: string, rule: string, detail: string}>} failures
 * @returns {string} one block per breach, grouped under the rule it broke
 */
function report (failures) {
  const byRule = new Map()
  for (const f of failures) {
    if (!byRule.has(f.rule)) { byRule.set(f.rule, []) }
    byRule.get(f.rule).push(f)
  }
  const lines = ['']
  for (const [rule, list] of byRule) {
    lines.push('  ' + rule)
    for (const f of list) { lines.push('    · ' + f.where + ' — ' + f.detail) }
    lines.push('')
  }
  lines.push('  The standards are in design/VISUAL-CHECKS.md. Pictures: visual-screenshots/')
  lines.push('')
  return lines.join('\n')
}

module.exports = { resolveBaseUrl, openBrowser, auditScreen, prepareScreenshotDir, report, SHOT_DIR, VIEWPORT }
