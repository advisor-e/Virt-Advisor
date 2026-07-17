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
 * Model class — owner-settled 2026-07-13, see `design/MODEL-CLASSIFICATION.md`.
 *
 * This is not cosmetic. The class determines whether a model takes the client's real
 * numbers, whether the privacy/scrubbing boundary applies to it, and whether it may
 * carry the "Illustrative" badge. An advisor must be able to see, before opening a
 * model, whether it is a teaching aid or something they can put in front of a client.
 */

/** Illustrative numbers, chosen to teach a concept. No client data ever enters it. */
export const CLASS_EDUCATION = 'education'
/**
 * The client's REAL numbers, typed in by the advisor (loan amount, property price).
 * No file intake — but the data is sensitive and the scrubbing boundary applies.
 * Never badged "Illustrative": someone may sign a loan on the output.
 */
export const CLASS_DECISION = 'decision'
/** The client's real numbers, read from their accounts. Needs file intake + scrubbing. */
export const CLASS_REPORT = 'report'

/**
 * The classes in shelf display order (T26): teaching aids first — they are the
 * safe, no-client-data end of the library — then the tools that take real numbers.
 */
export const CLASS_ORDER = [CLASS_EDUCATION, CLASS_DECISION, CLASS_REPORT]

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

/** The class-filter chip shown first, meaning "don't filter by class". */
export const CLASS_ALL = 'All'

/**
 * The catalogue.
 *
 * `route` is only present on `ready` models and points at the live in-app report
 * page — deliberately not at the mockup HTML, which is a design artefact.
 *
 * @type {Array<{name: string, category: string, summary: string, status: string, modelClass: string, route?: string}>}
 */
export const MODELS = [
  { name: 'Working Capital Cycle', category: 'Cash Flow', summary: 'How fast a fixed pot of cash recycles through stock and debtors — speed it up to earn more.', status: STATUS_READY, modelClass: CLASS_EDUCATION, route: '/business-performance-report' },
  { name: 'Debtor Business Drag', category: 'Cash Flow', summary: 'How slow-paying customers push your bank balance into overdraft, month by month.', status: STATUS_READY, modelClass: CLASS_EDUCATION, route: '/debtor-drag' },
  { name: '3-Way Forecast Filter', category: 'Cash Flow', summary: 'Linked P&L, balance sheet and cash-flow projections over three years.', status: STATUS_SOON, modelClass: CLASS_REPORT },
  { name: 'Dashboard Reports', category: 'Cash Flow', summary: 'Monthly and yearly performance dashboards from your accounting data.', status: STATUS_SOON, modelClass: CLASS_REPORT },
  { name: 'EBITDA & Discounted Cash Flow', category: 'Profitability', summary: 'Earnings before interest/tax/depreciation, and what future cash is worth today.', status: STATUS_READY, modelClass: CLASS_REPORT, route: '/ebitda-dcf' },
  // NB: there is deliberately no separate "Break-Even" entry. Its source workbook
  // (`Break-Even_.xlsx`) is one of the TWO sources already ported into the model below —
  // see the header of `server/report/marginBreakevenModel.js`. Listing it separately
  // advertised a built model as "coming soon". Removed 2026-07-13 with the owner's approval.
  { name: 'Margin · Mark-up · Break-even', category: 'Profitability', summary: 'The pricing trio every quote depends on, in one calculator.', status: STATUS_READY, modelClass: CLASS_EDUCATION, route: '/margin-breakeven' },
  { name: '8 Levers Model', category: 'Profitability', summary: 'The eight levers that move profit, and which one to pull first.', status: STATUS_READY, modelClass: CLASS_EDUCATION, route: '/eight-levers' },
  { name: 'Stock Purchasing (Growth Pro)', category: 'Growth', summary: 'Smarter reorder points and buying to free cash without stock-outs.', status: STATUS_SOON, modelClass: CLASS_REPORT },
  { name: 'Sales Dashboard', category: 'Growth', summary: 'Sales mix, trends and the products carrying the margin.', status: STATUS_SOON, modelClass: CLASS_REPORT },
  { name: 'Cost of Capital (WACC)', category: 'Valuation', summary: 'The true cost of the money funding the business — debt and equity blended.', status: STATUS_SOON, modelClass: CLASS_DECISION },
  { name: 'Lease vs Buy', category: 'Valuation', summary: 'Which way to fund an asset, compared on real cash terms.', status: STATUS_SOON, modelClass: CLASS_DECISION },
  { name: 'The Loan Estimator', category: 'Valuation', summary: 'Repayments, interest and total cost across loan options.', status: STATUS_SOON, modelClass: CLASS_DECISION },
  { name: 'Multiple Property Assessment', category: 'Valuation', summary: 'Compare several property investments side by side.', status: STATUS_SOON, modelClass: CLASS_DECISION },
  { name: 'Retirement Review', category: 'Valuation', summary: 'Whether the plan funds the retirement the owner wants.', status: STATUS_SOON, modelClass: CLASS_DECISION },
  { name: 'Quick Position', category: 'Valuation', summary: 'A fast read on where the business stands right now.', status: STATUS_READY, modelClass: CLASS_REPORT, route: '/quick-position' },
  { name: 'High-Level Budget', category: 'Budgeting', summary: 'A top-down budget with actuals and cash-flow variances.', status: STATUS_SOON, modelClass: CLASS_REPORT },
  { name: 'Mid-Level Budget', category: 'Budgeting', summary: 'A more detailed budget with assumptions and monthly tracking.', status: STATUS_SOON, modelClass: CLASS_REPORT },
  { name: 'Volatility Report', category: 'Risk', summary: 'How bumpy the numbers are — common, seasonal or special-cause.', status: STATUS_SOON, modelClass: CLASS_REPORT }
]

/**
 * Whether a model takes the client's REAL numbers — and therefore whether the
 * privacy / scrubbing boundary (T13) applies to it.
 *
 * The trigger is real client data, NOT a file upload: a Decision tool imports no file
 * at all, yet takes the client's real loan balances and retirement position by keyboard.
 * Only Education models — whose figures are illustrative — are exempt.
 *
 * @param {object} model
 * @returns {boolean}
 */
export function usesRealClientData (model) {
  return Boolean(model) && model.modelClass !== CLASS_EDUCATION
}

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
 * Filter the catalogue by class, category and free-text query — the three controls
 * compose, so "Teaching tools + Cash Flow + 'debtors'" narrows through all three.
 *
 * The query matches name, summary and category, case-insensitively, so a search
 * for "cash" finds both the Cash Flow models and any model whose summary mentions
 * cash. A blank query, the `All` category or the `All` class is treated as
 * "no filter".
 *
 * @param {Array<object>} models   the catalogue to filter (defaults to MODELS)
 * @param {object} [options]
 * @param {string} [options.query]       free-text search; blank/whitespace = no filter
 * @param {string} [options.category]    category name, or `All` = no filter
 * @param {string} [options.modelClass]  class key (education/decision/report), or `All` = no filter
 * @returns {Array<object>} the matching models, in catalogue order
 */
export function filterModels (models = MODELS, options = {}) {
  const list = Array.isArray(models) ? models : []
  const category = options.category || CATEGORY_ALL
  const modelClass = options.modelClass || CLASS_ALL
  const raw = (options.query === null || options.query === undefined) ? '' : options.query
  const query = String(raw).trim().toLowerCase()

  return list.filter((m) => {
    if (modelClass !== CLASS_ALL && m.modelClass !== modelClass) {
      return false
    }
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
 * Group a (usually already-filtered) model list into the three class shelves,
 * in `CLASS_ORDER` (T26). Models keep their relative order inside each shelf.
 *
 * A model whose class is unrecognised is NOT silently dropped — it lands in a
 * trailing `other` group so a data mistake is visible on screen rather than a
 * model quietly vanishing from the library.
 *
 * @param {Array<object>} models
 * @returns {Array<{classKey: string, models: Array<object>}>} one entry per
 *   non-empty shelf, in display order
 */
export function groupByClass (models = MODELS) {
  const list = Array.isArray(models) ? models : []
  const groups = CLASS_ORDER.map(classKey => ({
    classKey,
    models: list.filter(m => m && m.modelClass === classKey)
  }))
  const other = list.filter(m => m && !CLASS_ORDER.includes(m.modelClass))
  if (other.length) {
    groups.push({ classKey: 'other', models: other })
  }
  return groups.filter(g => g.models.length > 0)
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
