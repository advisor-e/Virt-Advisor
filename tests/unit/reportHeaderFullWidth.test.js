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
 * See design/REPORT-VISUAL-STANDARD.md (Section anatomy + the full-width header rule) and
 * design/REPORT-LAYOUT-REFERENCE.html (the labelled [A]–[D2d] reference).
 */

const COMPONENTS_DIR = path.resolve(__dirname, '../../components')

// The report screen components (mirrors reportHeadlineConsistency's SCREENS). A new report
// screen is added here when it joins that guard.
const REPORT_SCREEN_FILES = [
  'BusinessPerformanceReport.vue',
  'MarginBreakevenReport.vue',
  'DebtorDragReport.vue',
  'EightLeversReport.vue',
  'QuickPositionReport.vue',
  'EbitdaDcfReport.vue',
  'LoanEstimatorReport.vue',
  'LeaseVsBuy.vue'
]

/** The `.rs-top` margin reset, tolerant of spacing: `::v-deep .rs-top { margin: 0 … }`. */
const RESET_RE = /::v-deep\s+\.rs-top\s*\{\s*margin:\s*0\b/

describe('report visual standard — a header rendered inside the screen keeps full width', () => {
  const withHeaderInside = REPORT_SCREEN_FILES
    .map(file => ({ file, src: fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8') }))
    .filter(({ src }) => /report-header\(/.test(src))

  it('finds the report screens that render the header themselves (guard is live)', () => {
    // Five screens render report-header inside the component; the other three put it in the
    // page. If this ever drops to zero the loop below would assert nothing.
    expect(withHeaderInside.length).toBeGreaterThanOrEqual(5)
  })

  describe.each(withHeaderInside.map(x => x.file))('%s', (file) => {
    const src = fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8')
    it('resets the shared header margin (::v-deep .rs-top { margin: 0 }) so it fills the width in the flex-column root', () => {
      expect(src).toMatch(RESET_RE)
    })
  })
})
