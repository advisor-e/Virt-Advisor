'use strict'

/**
 * @file "Stock against the accounts" — the Business Performance Report's optional page
 *   that reads a stock export beside the balance sheet and the cash page (item 4.70,
 *   stage 4; page 14 of `design/mockups/business-performance-report-optional-pages.html`).
 * @module server/report/stockVsAccountsModel
 *
 * THE OWNER'S QUESTIONS, in the drawing's order: does the stock file agree with the
 * accounts; where does the stock value sit; how much of it is already sold; who is
 * funding the shelf. Each is answered from two sources that are checked against each
 * other, never from one alone:
 *
 *   - the file total against the balance sheet's stock line. A gap is SHOWN with its size,
 *     never hidden — goods in transit or a valuation difference are for the advisor to
 *     explain, not for the page to smooth over. "Agrees" is within 0.1%, the figure the
 *     approved step-3 drawing prints.
 *   - already sold / not yet sold: the file's allocated and available value, as the reader
 *     split it in proportion to units. On order is Cin7's alone and prints as absent for
 *     Unleashed rather than as zero.
 *   - days funded by suppliers: stock days against creditor days, both the ACCOUNTS'
 *     (page 7's figures), because the file has no dates and no purchases.
 *
 * WHAT IT REFUSES. No stock file, or a file with no usable total — `NO_STOCK_FILE`. No
 * stock line on this year's balance sheet — `NO_STOCK_LINE`, because a page whose whole
 * point is the comparison cannot print half of it (P3). Ageing is never derived here.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/** Within this share of the balance sheet's figure, the two are said to agree. */
const AGREES_WITHIN = 0.001

/** Coerce to a finite number, or null. @param {*} v @returns {number|null} */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * The named buckets of a summary, kept to what the page prints.
 * @param {*} list
 * @returns {Array<{name:string, value:number, share:(number|null)}>}
 */
function buckets (list) {
  if (!Array.isArray(list)) { return [] }
  return list
    .filter(b => b && typeof b === 'object' && typeof b.name === 'string' && num(b.value) !== null)
    .map(b => ({ name: b.name, value: num(b.value), share: num(b.share) }))
}

/**
 * The stock export read beside the accounts.
 *
 * @param {object} input
 * @param {object|null} input.stockFile - `summariseInventory`'s result, as the step saved it.
 * @param {number|null} input.accountsStock - this year's balance-sheet stock line.
 * @param {number|null} input.stockDays - the accounts' stock days (page 7).
 * @param {number|null} input.creditorDays - the accounts' creditor days (page 7).
 * @returns {object} {
 *   available, blocked,
 *   package, costBasis, currency, currencyAssumed, lineCount,
 *   fileTotal, accountsStock, gap, gapPct, agrees,
 *   alreadySold, alreadySoldShare, notYetSold, notYetSoldShare, onOrderValue,
 *   categories[], locations[],
 *   stockDays, creditorDays, daysFundedBySuppliers, daysCarried
 * }
 */
function computeStockVsAccounts (input) {
  const opts = input || {}
  const empty = {
    available: false,
    blocked: null,
    package: null,
    costBasis: null,
    currency: null,
    currencyAssumed: null,
    lineCount: null,
    fileTotal: null,
    accountsStock: null,
    gap: null,
    gapPct: null,
    agrees: null,
    alreadySold: null,
    alreadySoldShare: null,
    notYetSold: null,
    notYetSoldShare: null,
    onOrderValue: null,
    categories: [],
    locations: [],
    stockDays: null,
    creditorDays: null,
    daysFundedBySuppliers: null,
    daysCarried: null
  }
  const f = opts.stockFile && typeof opts.stockFile === 'object' ? opts.stockFile : null
  const fileTotal = f ? num(f.totalValue) : null
  if (!f || fileTotal === null) { return Object.assign({}, empty, { blocked: 'NO_STOCK_FILE' }) }
  const accountsStock = num(opts.accountsStock)
  if (accountsStock === null) { return Object.assign({}, empty, { blocked: 'NO_STOCK_LINE' }) }

  const gap = fileTotal - accountsStock
  const gapPct = accountsStock === 0 ? null : gap / accountsStock
  const alreadySold = num(f.allocatedValue) || 0
  const notYetSold = num(f.availableValue) || 0
  const share = v => (fileTotal === 0 ? null : v / fileTotal)
  const stockDays = num(opts.stockDays)
  const creditorDays = num(opts.creditorDays)
  const both = stockDays !== null && creditorDays !== null

  return {
    available: true,
    blocked: null,
    package: typeof f.package === 'string' ? f.package : null,
    costBasis: typeof f.costBasis === 'string' ? f.costBasis : null,
    currency: typeof f.currency === 'string' ? f.currency : null,
    currencyAssumed: f.currencyAssumed === true,
    lineCount: num(f.lineCount),
    fileTotal,
    accountsStock,
    gap,
    gapPct,
    agrees: gapPct === null ? gap === 0 : Math.abs(gapPct) <= AGREES_WITHIN,
    alreadySold,
    alreadySoldShare: share(alreadySold),
    notYetSold,
    notYetSoldShare: share(notYetSold),
    onOrderValue: num(f.onOrderValue),
    categories: buckets(f.categories),
    locations: buckets(f.locations),
    stockDays,
    creditorDays,
    daysFundedBySuppliers: both ? Math.max(Math.min(creditorDays, stockDays), 0) : null,
    daysCarried: both ? Math.max(stockDays - creditorDays, 0) : null
  }
}

module.exports = { computeStockVsAccounts, AGREES_WITHIN }
