'use strict'

/**
 * Three-Way Forecast intake assembler — turns the parsed exports into a proposed input
 * set for `threeWayForecastModel`, with every figure tagged *from file* or *entered*.
 *
 * WHAT A FILE CAN AND CANNOT SUPPLY — the ruling that shapes this whole module (Mike,
 * 2026-09-02). Every Report-class model before this one reads HISTORY. This one is a
 * FORECAST, and no accounting export contains a future. So:
 *
 *   From the Balance Sheet   the opening position — cash, debtors, stock, creditors,
 *                            GST, tax, prepayments, accruals, equity, the six
 *                            fixed-asset categories, the loans, the current accounts.
 *   From the P&L             the overhead cost base — the 23 annual expense lines.
 *   From a by-month P&L      the most recent twelve complete months of sales, offered as
 *                            a STARTING POINT for the forecast and tagged as such, never
 *                            as the forecast. Two by-month exports may be dropped — this
 *                            year's and last year's — and `assembleMonthlySeries` joins
 *                            them before the twelve are taken off the end.
 *   From the advisor         everything forward-looking: forecast sales and purchases,
 *                            the mark-up, the debtor and creditor collection profiles,
 *                            depreciation rates, loan terms, capital expenditure plans,
 *                            shareholder drawings, tax payments.
 *
 * Two of those are settled by earlier findings and are not re-argued here: a collection
 * profile can NEVER be file-sourced (Xero records no money-received dates — owner-
 * verified 2026-07-16), and a Xero export's "Total" rows are uncalculated formulas that
 * read as zero, so line items are summed rather than trusted (REPORT-DATA-MODEL §3.1).
 *
 * PRIVACY (§3A of the forecast prompt specification, Mike's standard 2026-09-02).
 * Shareholder current accounts arrive POSITIONAL AND UNNAMED — the parser does not read
 * the names at all, rather than reading and then stripping them. Term loans likewise.
 * The client's own company name is returned for the advisor's own screen and must never
 * be logged (the route logs error codes only) and never sent to a model.
 *
 * NEVER FABRICATE. A figure no file supplies is simply absent from the proposal; the
 * screen shows it pre-filled with the model's default, tagged *entered*, for the
 * advisor to confirm or replace.
 *
 * Pure and side-effect free, so the multi-file rules are fully unit-testable; the route
 * is a thin wrapper around `parseForecastUpload` + this.
 */

// The trend read's own period reader. Shared rather than re-derived here so "which of
// these two reports is this year?" has ONE definition — the assembler's ordering and the
// model's comparability check must agree, or a pair ordered here would be refused there.
const { periodEndOf } = require('../trendModel')

/**
 * A Balance Sheet, a Profit and Loss, up to TWO by-month Profit and Loss exports, and —
 * since 2026-09-03, item 4.61b — LAST YEAR's Balance Sheet and Profit and Loss.
 *
 * The second by-month file is what makes the sales seed survive a mid-year export: this
 * year's usually ends in a partial month, which is stripped, so last year's is what keeps
 * a full twelve complete months in hand. (Raised from 3 to 4 on 2026-09-03, item 4.61a.)
 *
 * The two LAST-YEAR annual files are what make the trend read possible, and Mike chose
 * them over a comparative-column export on 2026-09-03. The deciding reason is worth
 * keeping here: a comparative file would need `xeroReportParser` taught to read a second
 * figure column as a prior period, and that means going near `guardFigureColumns` — the
 * guard that stops a two-year export being read as one year. Two more slots need no parser
 * change at all. Both are OPTIONAL: drop the original four and the screen is unchanged.
 */
const MAX_FILES = 6
const MONTHS = 12
/** The forecast carries three term loans and four shareholder current accounts. */
const MAX_LOANS = 3
const MAX_SHAREHOLDERS = 4

/**
 * The 23 overhead keys the model takes, each with the labels a chart of accounts is
 * likely to use. Order matters: the first test that matches a line claims it, so every
 * expense lands in exactly ONE overhead and nothing can be double-counted.
 *
 * Anything matching nothing goes to `otherFive` and is named in a warning — never
 * dropped, because a dropped expense is a forecast that quietly overstates profit.
 */
const OVERHEAD_TESTS = [
  { key: 'accLevies', re: /\bacc\b|levy|levies|workcover|work\s*cover/i },
  { key: 'accountancy', re: /accountan|audit|bookkeep/i },
  { key: 'advertising', re: /advertis|marketing|promotion/i },
  { key: 'bankCharges', re: /bank\s*(charge|fee)|merchant\s*fee/i },
  { key: 'computerExpenses', re: /computer|software|\bit\s+(expense|support)|subscription.*software/i },
  { key: 'insurance', re: /insurance/i },
  { key: 'interestIrd', re: /interest.*(ird|inland\s*revenue|tax)|use\s*of\s*money/i },
  { key: 'occupancy', re: /occupancy|body\s*corporate|rates\b|building\s*expense/i },
  { key: 'power', re: /power|electricit|gas\b|utilit/i },
  { key: 'printing', re: /print|stationer|postage/i },
  { key: 'rent', re: /\brent\b|lease\s*(cost|payment)/i },
  { key: 'repairs', re: /repair|maintenance/i },
  { key: 'shareholderSalaries', re: /shareholder\s*salar|director\s*(salar|fee)/i },
  { key: 'subscriptions', re: /subscription|membership|licence|license/i },
  { key: 'telephone', re: /telephone|phone|internet|mobile|broadband/i },
  { key: 'vehicle', re: /vehicle|motor\s*veh|fuel|petrol|mileage/i },
  { key: 'wages', re: /wages|salaries|payroll|staff\s*cost|kiwisaver|superannuat/i },
  { key: 'generalExpenses', re: /general|sundry|miscellaneous|other\s*expense/i }
]

/** Overhead keys the model has that nothing maps to by name — the advisor's to fill. */
const UNMAPPED_OVERHEADS = ['otherOne', 'otherTwo', 'otherThree', 'otherFour', 'otherFive']

/**
 * Order parsed reports newest first by their OWN date lines, or refuse.
 *
 * Returns null when a pair cannot be told apart — either date line unreadable, or both
 * ending in the same period. Refusing is the whole point: see the block comment at the
 * call site. Upload order is never used as a tie-break.
 *
 * @param {Array<object>} list - parsed extracts carrying `reportDate`.
 * @returns {Array<object>|null} the same objects, newest first; null if not orderable.
 */
function newestFirst (list) {
  if (list.length <= 1) { return list.slice() }

  const keyed = list.map(p => ({ p, end: periodEndOf(p.reportDate) }))
  for (let i = 0; i < keyed.length; i++) {
    if (keyed[i].end.year === null) { return null }
  }
  const sorted = keyed.slice().sort((a, b) => {
    if (a.end.year !== b.end.year) { return b.end.year - a.end.year }
    return (b.end.month || 0) - (a.end.month || 0)
  })
  // Two reports ending in the same period are two copies of the same year as far as this
  // can tell, and picking one would be a coin toss over which year the forecast opens from.
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1].end
    const b = sorted[i].end
    if (a.year === b.year && (a.month === null || b.month === null || a.month === b.month)) { return null }
  }
  return sorted.map(x => x.p)
}

/** One figure out of a parser's `{value, source, candidates}` map, or undefined. */
function figureValue (map, key) {
  return (map && map[key] && typeof map[key].value === 'number') ? map[key].value : undefined
}

/** Combine a list of balances down to `max` entries, the surplus folded into the last. */
function foldTo (balances, max) {
  if (balances.length <= max) { return balances.slice() }
  const kept = balances.slice(0, max - 1)
  let tail = 0
  for (let i = max - 1; i < balances.length; i++) { tail += balances[i] }
  kept.push(tail)
  return kept
}

/**
 * Assemble a proposed input set from the parsed uploads.
 *
 * @param {Array<object>} parsed - `parseForecastUpload` results, in upload order.
 * @param {object} [monthlySales] - an optional `{ sales: number[12] }` carrying the most
 *   recent twelve complete months, offered as a starting point for the forecast. The
 *   route builds it from `assembleMonthlySeries`, so one by-month file or two arrive here
 *   in exactly the same shape.
 * @returns {object} {
 *   files: [{ kind, companyName, reportDate, warnings }],   // upload order
 *   proposal: { … the model's input shape, values only … }, // ready to POST
 *   provenance: { <path>: 'file' | 'seeded' | 'entered' },  // what each figure is
 *   candidates: { <openingBalanceSheet key>: [{label, value}] }, // only where >1 account
 *                                                            // was summed into a figure
 *   trendInputs: {current, prior}|null,                      // for the two-year READ only
 *   blocked: string|null,                                   // why nothing assembled
 *   warnings: string[]
 * }
 *
 * `trendInputs` is null unless BOTH years' Profit and Loss reports were dropped, and it
 * never touches `proposal` — it is handed to `computeTrend` for the trend block on step 3
 * and changes no forecast figure.
 *
 * `seeded` is its own provenance and NOT the same as `file`: a figure marked `seeded`
 * came from last year's actuals and is a starting point for a judgement about next
 * year, not a fact about it. The screen must not present the two the same way.
 */
function assembleForecastIntake (parsed, monthlySales) {
  const files = []
  const warnings = []
  const provenance = Object.create(null)
  const proposal = Object.create(null)
  const candidates = Object.create(null)

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { files, proposal, provenance, candidates, trendInputs: null, blocked: 'No file was read.', warnings }
  }
  if (parsed.length > MAX_FILES) {
    return {
      files,
      proposal,
      provenance,
      candidates,
      blocked: 'Please drop at most ' + MAX_FILES + ' files together: a Balance Sheet, a Profit and Loss, up to two by-month Profit and Loss reports, and last year\'s Balance Sheet and Profit and Loss.',
      warnings
    }
  }

  const balanceSheets = parsed.filter(p => p && p.kind === 'forecastBalanceSheet')
  const profitLosses = parsed.filter(p => p && p.kind === 'profitLoss')

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i]
    files.push({
      kind: p.kind,
      companyName: p.companyName || null,
      reportDate: p.reportDate || null,
      warnings: (p.warnings || []).slice()
    })
    for (let w = 0; w < (p.warnings || []).length; w++) { warnings.push(p.warnings[w]) }
  }

  // No-partial-assembly rule: say what is wrong loudly rather than proposing half a
  // forecast the advisor cannot tell from a whole one.
  if (balanceSheets.length === 0) {
    return { files, proposal, provenance, candidates, trendInputs: null, blocked: 'A Balance Sheet is needed — it is what the forecast opens from. Please drop one.', warnings }
  }
  if (balanceSheets.length > 2) {
    return { files, proposal, provenance, candidates, trendInputs: null, blocked: 'More than two Balance Sheets were dropped together. The forecast opens from one position and can compare it with one earlier year — please drop at most two.', warnings }
  }
  if (profitLosses.length > 2) {
    return { files, proposal, provenance, candidates, trendInputs: null, blocked: 'More than two Profit and Loss reports were dropped together. Please drop this year\'s, and last year\'s if you want the trend read.', warnings }
  }

  // 🔴 WHICH OF TWO IS THIS YEAR IS DECIDED BY THE REPORTS' OWN DATE LINES, AND A PAIR
  // THAT CANNOT BE DATED IS REFUSED RATHER THAN ORDERED BY UPLOAD SEQUENCE. Getting this
  // backwards would open the forecast from LAST year's position — every figure plausible,
  // every figure a year stale, and nothing on screen to notice it by. Upload order is not
  // evidence: a file picker returns whatever order the operating system gives it.
  const bsSorted = newestFirst(balanceSheets)
  const plSorted = newestFirst(profitLosses)
  if (bsSorted === null) {
    return { files, proposal, provenance, candidates, trendInputs: null, blocked: 'Two Balance Sheets were dropped but their dates could not be told apart, so it is not clear which one the forecast should open from. Please drop the current one on its own, or check the reports carry their "As at" line.', warnings }
  }
  if (plSorted === null) {
    return { files, proposal, provenance, candidates, trendInputs: null, blocked: 'Two Profit and Loss reports were dropped but their dates could not be told apart. Please drop the current one on its own, or check the reports carry their period line.', warnings }
  }

  const bs = bsSorted[0]
  const pl = plSorted.length ? plSorted[0] : null
  const priorBs = bsSorted.length > 1 ? bsSorted[1] : null
  const priorPl = plSorted.length > 1 ? plSorted[1] : null

  // Different companies in one drop is a mistake worth naming rather than merging.
  if (pl && bs.companyName && pl.companyName && bs.companyName !== pl.companyName) {
    warnings.push('The Balance Sheet and the Profit and Loss name different organisations. Please check they are the same client before going on.')
  }

  /* -- the opening balance sheet ------------------------------------------------- */
  const openingBalanceSheet = Object.create(null)
  const figureKeys = Object.keys(bs.figures)
  for (let i = 0; i < figureKeys.length; i++) {
    const k = figureKeys[i]
    openingBalanceSheet[k] = bs.figures[k].value
    provenance['openingBalanceSheet.' + k] = 'file'
    // Where a figure was summed from more than one account, the screen shows the rows so
    // the advisor can untick one — a chart of accounts that splits stock across
    // "Inventory" and "Raw Materials" is the ordinary case, not the exception, and the
    // total is only right if the advisor agrees both belong. Labels are the client's own
    // account names, shown on the advisor's own screen and sent to no model.
    const cands = bs.figures[k].candidates
    if (Array.isArray(cands) && cands.length > 1) {
      candidates[k] = cands.map(c => ({ label: c.label, value: c.value }))
    }
  }
  proposal.openingBalanceSheet = openingBalanceSheet

  /* -- the six fixed-asset categories -------------------------------------------- */
  const ASSET_ORDER = ['vehicles', 'leaseholdImprovements', 'plantEquipment', 'officeEquipment', 'computerHardware', 'other']
  proposal.assets = ASSET_ORDER.map(function (key, n) {
    const found = bs.assets[key]
    if (found) { provenance['assets.' + n + '.opening'] = 'file' }
    // A depreciation RATE is never in a balance sheet. It is always the advisor's.
    provenance['assets.' + n + '.depreciationRate'] = 'entered'
    return { opening: found ? found.value : 0 }
  })

  /* -- loans and shareholder accounts, positional and unnamed --------------------- */
  const rawLoans = bs.loanBalances || []
  const rawShareholders = bs.shareholderBalances || []
  if (rawLoans.length > MAX_LOANS) {
    warnings.push('The file holds ' + rawLoans.length + ' term loans or hire-purchase agreements; the forecast carries ' +
      MAX_LOANS + ', so the surplus has been combined into the last. Please check it.')
  }
  if (rawShareholders.length > MAX_SHAREHOLDERS) {
    warnings.push('The file holds ' + rawShareholders.length + ' shareholder current accounts; the forecast carries ' +
      MAX_SHAREHOLDERS + ', so the surplus has been combined into the last. Please check it.')
  }
  const loans = foldTo(rawLoans, MAX_LOANS)
  proposal.loans = []
  for (let i = 0; i < MAX_LOANS; i++) {
    proposal.loans.push({ opening: i < loans.length ? loans[i] : 0 })
    if (i < loans.length) { provenance['loans.' + i + '.opening'] = 'file' }
    // Rate, term and repayment are contractual facts no balance sheet carries.
    provenance['loans.' + i + '.interestRate'] = 'entered'
    provenance['loans.' + i + '.monthlyRepayment'] = 'entered'
  }
  const shareholders = foldTo(rawShareholders, MAX_SHAREHOLDERS)
  proposal.shareholders = []
  for (let i = 0; i < MAX_SHAREHOLDERS; i++) {
    proposal.shareholders.push({ opening: i < shareholders.length ? shareholders[i] : 0 })
    if (i < shareholders.length) { provenance['shareholders.' + i + '.opening'] = 'file' }
  }

  /* -- the overhead cost base ----------------------------------------------------- */
  if (pl) {
    const overheads = Object.create(null)
    const unmatched = []
    const lines = pl.expenseLines || []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line || typeof line.amount !== 'number' || !line.name) { continue }
      let key = null
      for (let t = 0; t < OVERHEAD_TESTS.length; t++) {
        if (OVERHEAD_TESTS[t].re.test(line.name)) { key = OVERHEAD_TESTS[t].key; break }
      }
      if (key === null) { unmatched.push(line); continue }
      overheads[key] = (overheads[key] || 0) + line.amount
    }
    if (unmatched.length) {
      // Never dropped: an expense that vanishes is a forecast that overstates profit.
      let tail = 0
      for (let i = 0; i < unmatched.length; i++) { tail += unmatched[i].amount }
      overheads.otherFive = (overheads.otherFive || 0) + tail
      warnings.push(unmatched.length + ' expense ' + (unmatched.length === 1 ? 'line was' : 'lines were') +
        ' not recognised and ' + (unmatched.length === 1 ? 'has' : 'have') +
        ' been added to "Other 5" so nothing is lost: ' +
        unmatched.map(u => u.name).join(', ') + '. Please move them to the right lines.')
    }
    const matchedKeys = Object.keys(overheads)
    for (let i = 0; i < matchedKeys.length; i++) { provenance['overheads.' + matchedKeys[i]] = 'file' }
    for (let i = 0; i < UNMAPPED_OVERHEADS.length; i++) {
      if (!(UNMAPPED_OVERHEADS[i] in overheads)) { provenance['overheads.' + UNMAPPED_OVERHEADS[i]] = 'entered' }
    }
    proposal.overheads = overheads
  } else {
    warnings.push('No Profit and Loss was dropped, so the overhead figures all start at zero. Drop one, or enter the annual figures yourself.')
  }

  /* -- last year's monthly sales, as a starting point ONLY ------------------------ */
  if (monthlySales && Array.isArray(monthlySales.sales) && monthlySales.sales.length === MONTHS) {
    let usable = true
    for (let m = 0; m < MONTHS; m++) {
      if (typeof monthlySales.sales[m] !== 'number' || !isFinite(monthlySales.sales[m])) { usable = false }
    }
    if (usable) {
      proposal.sales = monthlySales.sales.slice()
      provenance.sales = 'seeded'
      warnings.push('The twelve months of sales are last year\'s actual figures, offered as a starting point. They are not a forecast until you have changed them.')
    }
  }
  if (!proposal.sales) { provenance.sales = 'entered' }
  provenance.purchases = 'entered'
  provenance.markup = 'entered'
  provenance.debtorCollection = 'entered'
  provenance.creditorPayment = 'entered'

  /* -- last year, for the two-year trend read (item 4.61b) ------------------------ */
  // 🔴 THIS FEEDS NOTHING. It is handed to `computeTrend` for a READ on step 3 and never
  // reaches `proposal`, so no figure the advisor forecasts with can come from last year.
  // In particular the day-counts must never seed a collection profile: a Xero export
  // records no money-received dates (owner-verified 2026-07-16), so a debtor-day average
  // describes a year rather than saying when money actually moved.
  let trendInputs = null
  if (priorPl && pl) {
    const yearFrom = (annualPl, annualBs) => ({
      reportDate: annualPl.reportDate || null,
      sales: figureValue(annualPl.plFigures, 'sales'),
      costOfSales: figureValue(annualPl.plFigures, 'costOfSales'),
      operatingExpenses: figureValue(annualPl.plFigures, 'operatingExpenses'),
      accountsReceivable: annualBs ? figureValue(annualBs.figures, 'accountsReceivable') : undefined,
      inventory: annualBs ? figureValue(annualBs.figures, 'inventory') : undefined,
      accountsPayable: annualBs ? figureValue(annualBs.figures, 'accountsPayable') : undefined
    })
    trendInputs = { current: yearFrom(pl, bs), prior: yearFrom(priorPl, priorBs) }

    // Same check as the two current-year files get, for the same reason: two clients'
    // reports merged into one comparison is a mistake worth naming rather than averaging.
    const priorNames = [priorPl.companyName, priorBs && priorBs.companyName].filter(Boolean)
    if (bs.companyName && priorNames.some(n => n !== bs.companyName)) {
      warnings.push('Last year\'s reports name a different organisation from this year\'s. Please check they are the same client before reading the comparison.')
    }
  } else if (priorBs) {
    // A last-year Balance Sheet on its own can produce nothing: every one of the six
    // measures needs that year's sales or cost of sales. Say so rather than accept the
    // file and silently draw no block.
    warnings.push('Last year\'s Balance Sheet was dropped without last year\'s Profit and Loss, so the two-year comparison could not be made. Drop last year\'s Profit and Loss as well to see it.')
  }

  return { files, proposal, provenance, candidates, trendInputs, blocked: null, warnings }
}

module.exports = { assembleForecastIntake, MAX_FILES, MAX_LOANS, MAX_SHAREHOLDERS, OVERHEAD_TESTS }
