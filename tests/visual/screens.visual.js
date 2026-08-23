'use strict'

/**
 * VISUAL CHECKS — does each screen actually LOOK right?
 *
 * Item 4.25. Run with `npm run visual`, with the app up. **Not part of `npm test`** —
 * the filename ends `.visual.js`, which the main Jest config cannot match, so the
 * pre-commit hook can never collect these however they are moved about.
 *
 * What is being asserted is written in `design/VISUAL-CHECKS.md`, in plain English, with
 * the real defect behind each rule and — just as important — what is explicitly NOT a
 * failure. That page is the agreement. This file only carries it out.
 *
 * 🔴 WHY THIS EXISTS. Jest runs under jsdom, which has no layout engine: it cannot
 * measure a width, a gap or an overflow. Every visual defect this product has had was
 * found by Mike, by opening the page, after it shipped.
 */

const { SCREENS } = require('./support/screens')
const { resolveBaseUrl, openBrowser, auditScreen, prepareScreenshotDir, report } = require('./support/visual')

describe('Every screen meets the standards in design/VISUAL-CHECKS.md', () => {
  let baseUrl = null
  let browser = null
  let context = null

  beforeAll(async () => {
    // Throws with the command to type when nothing is serving. A visual check that
    // quietly passes against a page it never loaded is worse than no check at all.
    baseUrl = await resolveBaseUrl()
    prepareScreenshotDir()
    const opened = await openBrowser()
    browser = opened.browser
    context = opened.context
  })

  afterAll(async () => {
    if (browser) { await browser.close() }
  })

  for (const screen of SCREENS) {
    // A hub is checked panel by panel, so its one test can carry a dozen readings. The
    // failures are reported together rather than one per run — fixing a squashed row
    // usually fixes its neighbours, and finding that out one commit at a time is waste.
    test(screen.name, async () => {
      const failures = await auditScreen(context, baseUrl, screen)
      expect(failures.length === 0 ? '' : report(failures)).toBe('')
    })
  }
})
