'use strict'

/**
 * The screens the visual checks cover.
 *
 * Settled by Mike on 2026-08-23 (`design/VISUAL-CHECKS.md`, "Which screens are
 * covered"): the report and model screens AND the manager hubs. He was asked twice and
 * answered the same way both times. **The defect that created item 4.25 is on a manager
 * screen**, so covering the reports alone would have left out the one screen that proved
 * the need.
 *
 * ⚠ `tabs: true` does NOT list a hub's tabs. The driver reads them off the page from
 * `[data-tab]` and opens each in turn, so a tab added tomorrow is covered without anyone
 * remembering to come back here — and a tab this tier does not show is never opened,
 * because it is not on the page to find.
 *
 * ⚠ No login step. The manager pages auto-authorise on `localhost` and `127.0.0.1` —
 * see `checkAuth()` in `pages/firm-manager.vue` — so the half of this job expected to be
 * expensive turned out to be nothing at all.
 *
 * @type {Array<{name: string, path: string, tabs: boolean}>}
 */
const SCREENS = [
  // ── The report and model screens ──────────────────────────────────────────────────
  { name: 'Model Library', path: '/model-library', tabs: false },
  { name: 'Model Guide', path: '/model-guide', tabs: false },
  { name: 'Business Performance Report', path: '/business-performance-report', tabs: false },
  { name: 'Multiple Property', path: '/multiple-property', tabs: false },
  { name: 'Cost of Capital', path: '/cost-of-capital', tabs: false },
  { name: 'Debtor Drag', path: '/debtor-drag', tabs: false },
  { name: 'EBITDA DCF', path: '/ebitda-dcf', tabs: false },
  { name: 'Eight Levers', path: '/eight-levers', tabs: false },
  { name: 'Lease vs Buy', path: '/lease-vs-buy', tabs: false },
  { name: 'Loan Estimator', path: '/loan-estimator', tabs: false },
  { name: 'Margin Breakeven', path: '/margin-breakeven', tabs: false },
  { name: 'Quick Position', path: '/quick-position', tabs: false },

  // ── The manager hubs, every panel each one shows ──────────────────────────────────
  { name: 'Firm Manager', path: '/firm-manager', tabs: true },
  { name: 'Group Manager', path: '/group-manager', tabs: true },
  { name: 'Global Group Manager', path: '/global-group-manager', tabs: true },
  { name: 'Mentor', path: '/mentor', tabs: true }
]

module.exports = { SCREENS }
