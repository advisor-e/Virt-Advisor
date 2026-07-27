'use strict'

const fs = require('fs')
const path = require('path')

const { MODELS, STATUS_READY } = require('../../utils/reportModelCatalogue')

/**
 * CONSISTENCY GUARD (report visual standard, Step 5) — every live report page renders
 * inside the shared `ReportShell` frame + tokens, so no screen can ship with its own
 * hand-rolled canvas again.
 *
 * This closes the exact hole that let Lease vs Buy ship with no frame and the build stay
 * green (see `design/REPORT-VISUAL-STANDARD.md`): the old consistency guard checked only
 * the shared banner (HeroStrip), so the page frame — canvas, centred column, padding —
 * had no test opinion at all. It is the sibling of `reportHeadlineConsistency` (banner)
 * and `reportBadgeClass` (Illustrative badge): the same "explicit list, unmapped =
 * failure" shape, but the list is DERIVED from the catalogue's ready routes rather than
 * hand-maintained — so a NEW report is pulled into the guard the moment its card goes
 * live, with no second edit to remember.
 *
 * A source-level check on purpose: the frame is applied at the PAGE level (each page wraps
 * its screen in `<report-shell>`), and mounting a full report page drags in token
 * resolution, the stepper and file-intake plumbing. Reading the page source proves the
 * one structural fact that matters — the screen is inside the shell — without that weight.
 */

const PAGES_DIR = path.resolve(__dirname, '../../pages')

// Single source: every ready model carries the route of its live in-app page. A model
// flipped to `ready` without a shell-wrapped page fails here automatically.
const READY_ROUTES = MODELS
  .filter(m => m.status === STATUS_READY && m.route)
  .map(m => m.route)

/** Pull the pug template body out of a `.vue` page source. */
function templateBody (src) {
  const m = src.match(/<template lang="pug">([\s\S]*?)<\/template>/)
  return m ? m[1] : null
}

describe('report visual standard — every live report page adopts the ReportShell frame', () => {
  it('is actually guarding the known reports (the catalogue has its eight ready routes)', () => {
    // A tripwire: if the derived list ever collapses to empty (a refactor breaking the
    // catalogue import), the describe.each below would silently guard nothing.
    expect(READY_ROUTES.length).toBeGreaterThanOrEqual(8)
  })

  describe.each(READY_ROUTES)('%s', (route) => {
    const file = path.join(PAGES_DIR, route.replace(/^\//, '') + '.vue')

    it('has a page file at its route', () => {
      expect(fs.existsSync(file)).toBe(true)
    })

    it('wraps its screen in the shared ReportShell (frame + tokens), not a hand-rolled frame', () => {
      const src = fs.readFileSync(file, 'utf8')

      // Imports the shell from the single source...
      expect(src).toMatch(/import\s+ReportShell\s+from\s+['"]~\/components\/base\/ReportShell\.vue['"]/)
      // ...registers it as a component...
      expect(src).toMatch(/components\s*:\s*\{[^}]*\bReportShell\b/)

      // ...and `<report-shell>` is the TEMPLATE ROOT, so the whole screen renders inside
      // the frame (canvas / centred column / padding) and inherits the --rs-* tokens.
      const body = templateBody(src)
      expect(body).not.toBeNull()
      expect(body.trim().startsWith('report-shell')).toBe(true)
    })
  })
})
