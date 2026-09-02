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
 *   From a by-month P&L      last year's monthly sales, offered as a STARTING POINT for
 *                            the forecast and tagged as such, never as the forecast.
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

const MAX_FILES = 3
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
 * @param {object} [monthlySales] - an optional `assembleMonthlySeries` result carrying
 *   last year's by-month sales, offered as a starting point for the forecast.
 * @returns {object} {
 *   files: [{ kind, companyName, reportDate, warnings }],   // upload order
 *   proposal: { … the model's input shape, values only … }, // ready to POST
 *   provenance: { <path>: 'file' | 'seeded' | 'entered' },  // what each figure is
 *   blocked: string|null,                                   // why nothing assembled
 *   warnings: string[]
 * }
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

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { files, proposal, provenance, blocked: 'No file was read.', warnings }
  }
  if (parsed.length > MAX_FILES) {
    return {
      files,
      proposal,
      provenance,
      blocked: 'Please drop at most ' + MAX_FILES + ' files together: a Balance Sheet, a Profit and Loss, and optionally last year\'s by-month Profit and Loss.',
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
    return { files, proposal, provenance, blocked: 'A Balance Sheet is needed — it is what the forecast opens from. Please drop one.', warnings }
  }
  if (balanceSheets.length > 1) {
    return { files, proposal, provenance, blocked: 'Two Balance Sheets were dropped together. The forecast opens from one position — please drop the one it should start from.', warnings }
  }
  if (profitLosses.length > 1) {
    return { files, proposal, provenance, blocked: 'Two Profit and Loss reports were dropped together. Please drop the one whose costs the forecast should start from.', warnings }
  }

  const bs = balanceSheets[0]
  const pl = profitLosses.length ? profitLosses[0] : null

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
    warnings.push('No Profit and Loss was dropped, so the forecast starts with the sample cost base. Drop one, or enter the annual figures yourself.')
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

  return { files, proposal, provenance, blocked: null, warnings }
}

module.exports = { assembleForecastIntake, MAX_FILES, MAX_LOANS, MAX_SHAREHOLDERS, OVERHEAD_TESTS }
