/**
 * Business Performance Report — model catalogue.
 *
 * The list of financial models the Model Library screen offers, plus the pure
 * search/filter helpers it renders with. Kept as a plain module (not a component)
 * so the selection logic is unit-testable without a component test harness.
 *
 * Scope note: this is the *shipped* subset of the model library. The full ~87-model
 * catalogue and the conversational matcher are separate design tasks (T22 / T23 in
 * `design/BUSINESS-PERFORMANCE-REPORT-PLAN.md`) and will move server-side when built.
 * Until then this static list is the single source of truth for the screen.
 *
 * Copy note: model names and summaries are English-only for now (owner decision,
 * 2026-07-13). They are held here as data rather than in `locales/`, so they can be
 * lifted into the locale files — or served from the backend under T22 — without
 * reworking the component. Interface chrome (buttons, labels) DOES go through `$t()`.
 */

/** Report status: the model is built and its route is live. */
export const STATUS_READY = 'ready'
/** Report status: catalogued, but no report built yet — the card is inert. */
export const STATUS_SOON = 'soon'

/**
 * Categories, in display order, with the brand colour each card is keyed to.
 * Colours are the Advisor-e palette (see `design/BRAND-TOKENS.md`).
 */
export const CATEGORIES = [
  { name: 'Cash Flow', colour: '#0070c0' },
  { name: 'Profitability', colour: '#4ca52d' },
  { name: 'Growth', colour: '#00b1e0' },
  { name: 'Valuation', colour: '#002b64' },
  { name: 'Budgeting', colour: '#ff9900' },
  { name: 'Risk', colour: '#ff0000' }
]

/** The filter chip shown first, meaning "don't filter by category". */
export const CATEGORY_ALL = 'All'

/**
 * The catalogue.
 *
 * `route` is only present on `ready` models and points at the live in-app report
 * page — deliberately not at the mockup HTML, which is a design artefact.
 *
 * @type {Array<{name: string, category: string, summary: string, status: string, route?: string}>}
 */
export const MODELS = [
  { name: 'Working Capital Cycle', category: 'Cash Flow', summary: 'How fast a fixed pot of cash recycles through stock and debtors — speed it up to earn more.', status: STATUS_READY, route: '/business-performance-report' },
  { name: 'Debtor Business Drag', category: 'Cash Flow', summary: 'How slow-paying customers push your bank balance into overdraft, month by month.', status: STATUS_READY, route: '/debtor-drag' },
  { name: '3-Way Forecast Filter', category: 'Cash Flow', summary: 'Linked P&L, balance sheet and cash-flow projections over three years.', status: STATUS_SOON },
  { name: 'Dashboard Reports', category: 'Cash Flow', summary: 'Monthly and yearly performance dashboards from your accounting data.', status: STATUS_SOON },
  { name: 'EBITDA & Discounted Cash Flow', category: 'Profitability', summary: 'Earnings before interest/tax/depreciation, and what future cash is worth today.', status: STATUS_SOON },
  { name: 'Break-Even', category: 'Profitability', summary: 'The sales you need to cover costs — and the margin of safety above it.', status: STATUS_SOON },
  { name: 'Margin · Mark-up · Break-even', category: 'Profitability', summary: 'The pricing trio every quote depends on, in one calculator.', status: STATUS_READY, route: '/margin-breakeven' },
  { name: '8 Levers Model', category: 'Profitability', summary: 'The eight levers that move profit, and which one to pull first.', status: STATUS_SOON },
  { name: 'Stock Purchasing (Growth Pro)', category: 'Growth', summary: 'Smarter reorder points and buying to free cash without stock-outs.', status: STATUS_SOON },
  { name: 'Sales Dashboard', category: 'Growth', summary: 'Sales mix, trends and the products carrying the margin.', status: STATUS_SOON },
  { name: 'Cost of Capital (WACC)', category: 'Valuation', summary: 'The true cost of the money funding the business — debt and equity blended.', status: STATUS_SOON },
  { name: 'Lease vs Buy', category: 'Valuation', summary: 'Which way to fund an asset, compared on real cash terms.', status: STATUS_SOON },
  { name: 'The Loan Estimator', category: 'Valuation', summary: 'Repayments, interest and total cost across loan options.', status: STATUS_SOON },
  { name: 'Multiple Property Assessment', category: 'Valuation', summary: 'Compare several property investments side by side.', status: STATUS_SOON },
  { name: 'Retirement Review', category: 'Valuation', summary: 'Whether the plan funds the retirement the owner wants.', status: STATUS_SOON },
  { name: 'Quick Position', category: 'Valuation', summary: 'A fast read on where the business stands right now.', status: STATUS_SOON },
  { name: 'High-Level Budget', category: 'Budgeting', summary: 'A top-down budget with actuals and cash-flow variances.', status: STATUS_SOON },
  { name: 'Mid-Level Budget', category: 'Budgeting', summary: 'A more detailed budget with assumptions and monthly tracking.', status: STATUS_SOON },
  { name: 'Volatility Report', category: 'Risk', summary: 'How bumpy the numbers are — common, seasonal or special-cause.', status: STATUS_SOON }
]

/**
 * The brand colour for a category, falling back to the primary blue for an
 * unknown category rather than rendering a colourless card.
 *
 * @param {string} category
 * @returns {string} hex colour
 */
export function colourFor (category) {
  const hit = CATEGORIES.find(c => c.name === category)
  return hit ? hit.colour : '#0070c0'
}

/**
 * Filter the catalogue by category and free-text query.
 *
 * The query matches name, summary and category, case-insensitively, so a search
 * for "cash" finds both the Cash Flow models and any model whose summary mentions
 * cash. A blank query or the `All` category is treated as "no filter".
 *
 * @param {Array<object>} models   the catalogue to filter (defaults to MODELS)
 * @param {object} [options]
 * @param {string} [options.query]     free-text search; blank/whitespace = no filter
 * @param {string} [options.category]  category name, or `All` = no filter
 * @returns {Array<object>} the matching models, in catalogue order
 */
export function filterModels (models = MODELS, options = {}) {
  const list = Array.isArray(models) ? models : []
  const category = options.category || CATEGORY_ALL
  const raw = (options.query === null || options.query === undefined) ? '' : options.query
  const query = String(raw).trim().toLowerCase()

  return list.filter((m) => {
    if (category !== CATEGORY_ALL && m.category !== category) {
      return false
    }
    if (!query) {
      return true
    }
    return `${m.name} ${m.summary} ${m.category}`.toLowerCase().includes(query)
  })
}

/**
 * How many models in the catalogue have a live report behind them. Drives the
 * "X of Y models · N ready" counter.
 *
 * @param {Array<object>} models
 * @returns {number}
 */
export function readyCount (models = MODELS) {
  const list = Array.isArray(models) ? models : []
  return list.filter(m => m.status === STATUS_READY).length
}

/**
 * Whether a card should be an actual link. A model is only openable if it is
 * marked ready AND carries a route — so a mis-flagged entry degrades to an inert
 * card rather than a link to nowhere.
 *
 * @param {object} model
 * @returns {boolean}
 */
export function isOpenable (model) {
  return Boolean(model && model.status === STATUS_READY && model.route)
}
