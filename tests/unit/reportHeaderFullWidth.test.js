'use strict'

const fs = require('fs')
const path = require('path')

/**
 * CONSISTENCY GUARD (report visual standard) — a report screen that renders the shared
 * ReportHeader inside its own root MUST neutralise the header's margin.
 *
 * Why this exists — a real, shipped regression (2026-07-27). The report roots are flex
 * columns (one 16px gap sets every vertical gap identically). The shared ReportHeader
 * carries `margin: 0 auto 22px`. Inside a flex column those AUTO left/right margins take
 * priority over `align-items: stretch`, so the header shrinks to its content width instead
 * of filling the page — AND its 22px bottom margin stacks on top of the flex gap, doubling
 * the header→banner gap. Both are RENDERED-geometry bugs: jsdom has no layout engine, so no
 * mount test can measure the header's width or the gap. Nothing failed, and a shrunken,
 * off-centre header shipped on the Working Capital screen.
 *
 * The fix is one line per screen: `.<root> ::v-deep .rs-top { margin: 0; }`. This guard
 * makes that line mandatory: any report component that contains `report-header` must also
 * contain the reset, or the build fails. (Screens whose header lives in the PAGE — Quick
 * Position, EBITDA-DCF, the Loan Estimator — don't render report-header inside the
 * component, so they are not flagged; their page root is the ReportShell block, not a flex
 * column, and the header fills width there without a reset.)
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * 🔴 THE SCREENS ARE DISCOVERED, NOT LISTED — AND THEY USED NOT TO BE. (2026-09-13.)
 *
 * This guard was written with a hand-typed list of nine filenames that stopped growing after
 * Cost of Capital, while the app grew to **thirteen** screens rendering the header inside
 * themselves. It was checking **six of thirteen** and reporting itself healthy, because its
 * own liveness check asked only for "at least five".
 *
 * Mike found what that cost on 2026-09-13, by looking at the screen: **Stock Purchasing's
 * header band rendered 364px wide inside a 1076px column** — marooned in the middle of the
 * page while the step chips and the hero strip beneath it spanned the full width — with a
 * 38px gap under it where every other report has 16px. Exactly the regression described
 * above, shipped again, past the guard built to stop it.
 *
 * Two things kept it quiet, and both are removed here. The list required a MANUAL EDIT that
 * `design/ADDING-A-REPORT.md` never asks for: the recipe flags that step for the OTHER
 * guard's `SCREENS` list and says nothing about this one, so seven screens were added to the
 * app and none to this file. And the floor of five passed at six.
 *
 * So the list is gone. This reads `components/` and tests every screen that renders the
 * header, the way `reportShellFrame.test.js` reads the catalogue's own ready routes — a
 * guard that discovers its subjects cannot go stale, and a new report is protected the
 * moment it is written rather than when somebody remembers.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * See design/REPORT-VISUAL-STANDARD.md (Section anatomy + the full-width header rule) and
 * design/REPORT-LAYOUT-REFERENCE.html (the labelled [A]–[D2d] reference).
 */

const COMPONENTS_DIR = path.resolve(__dirname, '../../components')

/**
 * Every screen that renders the shared header inside its own root, found by reading the
 * directory rather than by being told.
 *
 * @returns {Array<{file: string, src: string}>}
 */
function screensRenderingHeader () {
  return fs.readdirSync(COMPONENTS_DIR)
    .filter(f => f.endsWith('.vue'))
    .map(file => ({ file, src: fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8') }))
    .filter(({ src }) => /report-header\(/.test(src))
    .sort((a, b) => a.file.localeCompare(b.file))
}

/** The `.rs-top` margin reset, tolerant of spacing: `::v-deep .rs-top { margin: 0 … }`. */
const RESET_RE = /::v-deep\s+\.rs-top\s*\{\s*margin:\s*0\b/

describe('report visual standard — a header rendered inside the screen keeps full width', () => {
  const withHeaderInside = screensRenderingHeader()

  it('finds every screen that renders the header itself (guard is live)', () => {
    // 🔴 THIRTEEN as of 2026-09-13, and the floor is the real count rather than a number
    // comfortably below it — "at least five" is what let a list of six look healthy while
    // seven screens went unchecked. Adding a report RAISES this; it never lowers it, and a
    // screen that stops rendering its own header is a change worth failing on.
    expect(withHeaderInside.length).toBeGreaterThanOrEqual(13)
  })

  it('covers the screens the headline guard knows about — the two lists cannot drift apart', () => {
    // The sibling guard mounts each screen; this one reads its source. They answer different
    // questions about the same set, so a screen in one and not the other is the hole that
    // produced the 2026-09-13 regression.
    const found = withHeaderInside.map(x => x.file)
    expect(found).toContain('StockPurchasing.vue')
    expect(found).toContain('SalesDashboard.vue')
    expect(found).toContain('MidLevelBudget.vue')
    expect(found).toContain('RetirementReview.vue')
    expect(found).toContain('VolatilityReport.vue')
  })

  describe.each(withHeaderInside.map(x => x.file))('%s', (file) => {
    const src = fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8')
    it('resets the shared header margin (::v-deep .rs-top { margin: 0 }) so it fills the width in the flex-column root', () => {
      expect(src).toMatch(RESET_RE)
    })
  })
})
