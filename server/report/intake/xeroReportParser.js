'use strict'

/**
 * Xero report parser — turns a raw cell grid (from the xlsx or csv reader) into the
 * Quick Position intake proposal: which figures the file can seed, each tagged
 * `source: 'file'`, with multi-row candidates where the chart of accounts splits a
 * concept across rows (the verified Electric Bikes stock finding, REPORT-DATA-MODEL §3.9).
 *
 * Contract rules implemented here (REPORT-DATA-MODEL §4):
 *  - NEVER read a "Total …" row as a line item — always sum the line items; when the
 *    file carries a cached section total, use it only as a cross-check and warn on
 *    mismatch (§3.1 + its 2026-07-15 nuance).
 *  - Never silently guess: a figure the file can't supply is simply absent from the
 *    proposal (the screen presents it pre-filled with the model default, tagged *entered*).
 *  - Wrong file → `recognised: false` with what was expected; no partial parse.
 *  - Identity stays local: this module returns labels/company name for the advisor's
 *    own screen, but callers must never log them (see the route).
 */

const { readXlsx, XlsxReadError } = require('./xlsxReader')
const { parseCsv } = require('./csvReader')
const { supportedList } = require('./supportedPackages')

/** A grid row reduced to its first text cell + first numeric cell. */
function rowShape (cells) {
  let label = null
  let labelCol = -1
  let value = null
  for (let c = 0; c < cells.length; c++) {
    const v = cells[c]
    if (v === null || v === undefined || v === '') { continue }
    if (typeof v === 'string' && label === null) { label = v.trim(); labelCol = c; continue }
    if (typeof v === 'number' && label !== null && c > labelCol && value === null) { value = v; break }
  }
  return { label, value }
}

/** @param {Array<Array<string|number|null>>} grid @returns {Array<{label:string|null, value:number|null}>} */
function shapeRows (grid) {
  return grid.map(cells => rowShape(cells || []))
}

// Multi-column exports (R4, 2026-07-19): rowShape reads the FIRST numeric cell only, so
// extra figure columns vanish silently — and the cached-total cross-check reads the same
// column, so it can never catch it. Two real shapes: comparative (2–4 columns, first =
// most recent period, correct but partial → warn) and by-month/by-quarter (5+, first =
// a fraction of the year → refuse, contract §4.7: wrong-shape files fail loudly).
const WARN_FIGURE_COLUMNS = 2
const REFUSE_FIGURE_COLUMNS = 5

/** The widest labelled row's count of numeric cells after its label. @param {Array<Array<string|number|null>>} grid */
function figureColumnCount (grid) {
  let max = 0
  for (let r = 0; r < grid.length; r++) {
    const cells = grid[r] || []
    let hasLabel = false
    let count = 0
    for (let c = 0; c < cells.length; c++) {
      const v = cells[c]
      if (v === null || v === undefined || v === '') { continue }
      if (typeof v === 'string' && !hasLabel) { hasLabel = true; continue }
      if (typeof v === 'number' && hasLabel) { count++ }
    }
    if (count > max) { max = count }
  }
  return max
}

/** Refuse (5+ figure columns) or warn (2–4) on a recognised multi-column report. @param {Array<Array<string|number|null>>} grid @param {string[]} warnings */
function guardFigureColumns (grid, warnings) {
  const cols = figureColumnCount(grid)
  if (cols >= REFUSE_FIGURE_COLUMNS) {
    const e = new Error('This export splits the year across many columns (a by-month or by-quarter report). Please export the whole-period report from your accounting software and drop that instead.')
    e.code = 'MULTI_PERIOD_COLUMNS'
    throw e
  }
  if (cols >= WARN_FIGURE_COLUMNS) {
    warnings.push('The file holds several figure columns — only the first (the most recent period) was read. If you wanted a different period, export that single period and drop it instead.')
  }
}

const TOTAL_RE = /^total\b/i

/**
 * Xero opens P&L sections as "Less Cost of Sales" / "Less Operating Expenses" but
 * closes them as "Total Cost of Sales" — the section's tracked name must drop the
 * Less/Plus/Add prefix or the close never matches the open and sections nest wrongly
 * (found by the EBITDA intake tests, 2026-07-17).
 */
function sectionName (label) {
  return label.replace(/^(?:less|plus|add)\s+/i, '')
}

/**
 * Walk a report body: section headers (label, no value) open a section; "Total X"
 * rows close it and carry the file's own cached total for the cross-check.
 * @param {Array<{label:string|null, value:number|null}>} rows
 * @returns {Array<{section:string[], label:string, value:number}>} line items with their section path
 */
function lineItems (rows) {
  const items = []
  const stack = []
  const pushItem = (r) => {
    for (let s = 0; s < stack.length; s++) { stack[s].sum += r.value }
    items.push({ section: stack.map(s => s.name), label: r.label, value: r.value })
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.label) { continue }
    if (TOTAL_RE.test(r.label)) {
      // pop the section it closes (best-effort by name)
      const closes = r.label.replace(TOTAL_RE, '').trim().toLowerCase()
      let matched = false
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].name.toLowerCase() === closes) {
          stack[s].cachedTotal = (typeof r.value === 'number') ? r.value : null
          stack.length = s
          matched = true
          break
        }
      }
      // R17: a "Total X" row that closes nothing, sits INSIDE an open section, and
      // does NOT equal any open section's running sum is a real account (e.g. a fuel
      // account "Total Oil purchases") — keep it. Anything sum-like stays a total:
      // a silent understatement must never become a silent double-count.
      if (!matched && stack.length && typeof r.value === 'number' &&
          !stack.some(s => Math.abs(s.sum - r.value) <= 0.01)) {
        pushItem(r)
      }
      continue
    }
    if (r.value === null) {
      stack.push({ name: sectionName(r.label), cachedTotal: null, sum: 0 })
      continue
    }
    pushItem(r)
  }
  return items
}

/** Does any section on the path match the pattern? */
function inSection (item, re) {
  return item.section.some(s => re.test(s))
}

/** Sum a candidate list. @param {Array<{label:string,value:number}>} c */
function sumCandidates (c) { return c.reduce((t, x) => t + x.value, 0) }

/**
 * Cross-check the file's own cached section totals against our line-item sums.
 * @param {Array<{label:string|null, value:number|null}>} rows
 * @returns {string[]} warnings (label-based, no client identity)
 */
function totalCrossChecks (rows) {
  const warnings = []
  const sums = Object.create(null)
  const stack = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.label) { continue }
    if (TOTAL_RE.test(r.label)) {
      const name = r.label.replace(TOTAL_RE, '').trim()
      const key = name.toLowerCase()
      const idx = stack.lastIndexOf(key)
      if (idx !== -1) {
        if (typeof r.value === 'number' && sums[key] !== undefined && Math.abs(sums[key] - r.value) > 0.01) {
          warnings.push('The file\'s own "Total ' + name + '" does not match the sum of its line items — the line-item sum was used. Please check the export.')
        }
        stack.length = idx
      } else if (stack.length && typeof r.value === 'number' &&
                 !stack.some(k => Math.abs(sums[k] - r.value) <= 0.01)) {
        // R17: same discriminator as lineItems — this row is a real account; count it
        for (let s = 0; s < stack.length; s++) { sums[stack[s]] += r.value }
      }
      continue
    }
    if (r.value === null) { const key = sectionName(r.label).toLowerCase(); stack.push(key); sums[key] = 0; continue }
    for (let s = 0; s < stack.length; s++) { sums[stack[s]] += r.value }
  }
  return warnings
}

/**
 * Find the report's own date/period line in the header rows.
 *
 * `bodyFrom` is the first row BELOW the header block. It matters because a header row
 * carries a label and no figure, which is exactly how `lineItems` recognises a section
 * heading — so without it a period line like "January - December 2026" opens a section
 * that wraps the whole report. Found 2026-09-02 probing QuickBooks and MYOB layouts,
 * where the effect was visible: rows outside a known section were declared unrecognised,
 * naming the date line as though it were a heading.
 *
 * Date lines seen across packages: "As at …" (Xero), "As of …" (QuickBooks, MYOB),
 * "For the …" (Xero), and a bare "1 April 2025 to 31 March 2026" range.
 */
function headerMeta (rows, titleRe) {
  const meta = { companyName: null, reportDate: null, titleRow: -1, bodyFrom: 0 }
  const limit = Math.min(rows.length, 8)
  for (let i = 0; i < limit; i++) {
    const label = rows[i].label
    if (!label) { continue }
    if (meta.titleRow === -1 && titleRe.test(label)) { meta.titleRow = i; meta.bodyFrom = i + 1; continue }
    const asAt = /^as (?:at|of)\s+(.+)$/i.exec(label)
    const period = /^for the\s+(.+)$/i.exec(label) ||
      /^(\d{1,2}\s+\w+\s+\d{4})\s*(?:to|[-–])\s*(.+)$/i.exec(label) ||
      /^\w+\s*(?:to|[-–])\s*\w+\s+(?:19|20)\d{2}$/i.exec(label)
    // The date line is always the last of the header rows, so finding it ends the scan.
    // Without that stop, a report with no date line would keep looking and take the
    // first section heading as the company name.
    if (asAt) { meta.reportDate = asAt[1].trim(); meta.bodyFrom = i + 1; break }
    if (period) { meta.reportDate = label.trim(); meta.bodyFrom = i + 1; break }
    // The company name sits BELOW the title in Xero and ABOVE it in QuickBooks and
    // MYOB, so row 0 has to be eligible. It was excluded, which meant that on those
    // layouts the name was never found and the first section heading was taken instead
    // — "Income" became the company, and its whole section vanished from the parse.
    // (Found 2026-09-02.)
    if (meta.companyName === null) { meta.companyName = label; meta.bodyFrom = i + 1 }
  }
  return meta
}

const BS_TITLE = /balance\s*sheet/i
const PL_TITLE = /profit\s*(?:and|&)\s*loss|income\s+statement/i

/**
 * Extract the Quick Position proposals from a Balance Sheet grid.
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} { recognised, kind, companyName, reportDate, proposals, warnings }
 */
function extractBalanceSheet (grid) {
  const rows = shapeRows(grid)
  const meta = headerMeta(rows, BS_TITLE)
  if (meta.titleRow === -1) { return { recognised: false } }

  // Skip the header block: a title, company or date row is a label with no figure,
  // which lineItems would otherwise read as a section heading.
  const body = rows.slice(meta.bodyFrom)
  const items = lineItems(body)
  const warnings = totalCrossChecks(body)
  guardFigureColumns(grid, warnings)

  const bankRows = items.filter(it => inSection(it, /^bank$|bank accounts/i))
  const debtorRows = items.filter(it => /accounts?\s+receivable|trade\s+(receivable|debtor)|^debtors\b/i.test(it.label))
  const stockRows = items.filter(it => /stock|inventor/i.test(it.label))
  const liabItems = items.filter(it => inSection(it, /liabilit/i))
  const creditorRows = liabItems.filter(it => /accounts?\s+payable|trade\s+(payable|creditor)|^creditors\b/i.test(it.label))
  const wageRows = liabItems.filter(it => /paye|payroll|wages|salaries/i.test(it.label))

  const proposals = Object.create(null)
  const propose = (key, candidates) => {
    if (candidates.length) {
      proposals[key] = {
        value: sumCandidates(candidates),
        source: 'file',
        candidates: candidates.map(c => ({ label: c.label, value: c.value }))
      }
    }
  }
  propose('cash', bankRows)
  propose('debtors', debtorRows)
  propose('stock', stockRows)
  propose('creditors', creditorRows)
  propose('wagesDue', wageRows)

  return {
    recognised: true,
    kind: 'balanceSheet',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    proposals,
    warnings
  }
}

/* ------------------------------------------- Three-Way Forecast opening position -- */

/**
 * The Three-Way Forecast needs a whole OPENING BALANCE SHEET, not the five figures
 * Quick Position takes. Its own function rather than more keys on `extractBalanceSheet`,
 * because that contract is Quick Position's and stays untouched.
 *
 * Two rules from §3A of the forecast prompt specification (Mike's standard, 2026-09-02)
 * shape what comes back:
 *  - SHAREHOLDER CURRENT ACCOUNTS ARE POSITIONAL AND UNNAMED. They are natural persons'
 *    balances; the forecast needs the numbers and never the names, so the names are not
 *    read at all rather than read and then stripped.
 *  - TERM LOANS ARE ALSO POSITIONAL. Their labels are lenders rather than people, but
 *    the model does not need them either — the advisor names them on screen.
 */
const NCA_CATEGORY_TESTS = [
  { key: 'vehicles', re: /vehicle|motor\s*veh|^car\b|truck/i },
  { key: 'leaseholdImprovements', re: /leasehold|building|premises|land\b|property/i },
  { key: 'plantEquipment', re: /plant|machinery|^equipment\b|tools/i },
  { key: 'officeEquipment', re: /office\s*(equip|furn)|furniture|fixtures|fittings/i },
  { key: 'computerHardware', re: /computer|hardware|^it\b|laptop|server/i }
]
// "Funds introduced" and "capital introduced" are what Xero and MYOB call a shareholder
// current account in credit, and they are the ordinary wording in New Zealand and
// Australia. Added on Mike's ruling of 2026-09-05, after a real export put 627,850.60 of
// owner money into the Other-current-liability catch-all: the balance sheet tied either
// way, but a frozen lump cannot carry the advances and drawings a shareholder row can,
// and the shareholder rows are positional so they hold no name at all.
const SHAREHOLDER_RE = /shareholder|director|beneficiar(?:y|ies)|current\s+account|(?:funds|capital)\s+introduced/i
const LOAN_RE = /\bloan\b|hire\s*purchase|\bhp\b|finance\s+lease|mortgage|term\s+debt/i
const GST_RE = /\bgst\b|\bvat\b|goods\s+and\s+services/i
const INCOME_TAX_RE = /income\s*tax|provision\s+for\s+tax|\btax\s+(payable|refund)/i
const PREPAYMENT_RE = /prepay|prepaid/i
const ACCRUAL_RE = /accrual|accrued/i
/**
 * Money already paid to an overseas supplier for stock that has not arrived (Fix 2,
 * 2026-09-05). Its own opening line rather than the Other-current-asset catch-all it fell
 * into before, so it can be released into inventory in the month the container lands.
 *
 * ⚠ TESTED BEFORE `PREPAYMENT_RE` AND DELIBERATELY SO. "Prepaid stock" matches both, and
 * `prepayments` is the wrong home: that line is driven by a live accrual schedule that
 * would release it to the P&L as an EXPENSE, and this is stock, not a cost.
 *
 * Deliberately narrow. "Deposit" alone would sweep in a rental bond and a term deposit, so
 * a deposit has to be paired with goods, stock, a supplier or an import to be claimed here.
 */
const IN_TRANSIT_RE = /(?:goods|stock|inventory)\s+(?:in\s+)?transit|(?:in\s+)?transit\s+(?:goods|stock|inventory)|(?:deposits?|prepaid|prepayments?)\s+(?:on|for)\s+(?:goods|stock|inventory|import)|(?:supplier|import|shipment|overseas)\s+deposits?|deposits?\s+paid\s+(?:to\s+)?(?:supplier|overseas)|prepaid\s+(?:stock|inventory)/i
// "Common Stock" is QuickBooks' wording for the same line; "Capital Account" is MYOB's.
const SHARE_CAPITAL_RE = /share\s*capital|paid[-\s]?up\s+capital|authorised\s+capital|owner'?s?\s+capital|common\s+stock|capital\s+account/i
const RETAINED_RE = /retained\s+(earnings|profit)|accumulated\s+(profit|losses|funds)|current\s+year\s+earnings/i
const OVERDRAFT_RE = /overdraft/i
/** A bank account by its own name, for charts of accounts with no "Bank" heading. */
const BANK_ACCOUNT_RE = /bank\s+account|cheque\s+account|checking\s+account|savings\s+account|cash\s+at\s+bank|petty\s+cash|^cash$/i

/**
 * Extract a Three-Way Forecast opening balance sheet from a Balance Sheet grid.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} { recognised, kind, companyName, reportDate, figures, assets,
 *   loanBalances, shareholderBalances, warnings }.
 *   `figures` keys (each {value, source:'file', candidates}, present only when the file
 *   carries them): cashAtBank, bankOverdraft, accountsReceivable, inventory,
 *   gstRefund, gstPayable, incomeTaxRefundDue, incomeTaxPayable, prepayments,
 *   accountsPayable, accruedExpenses, authorisedCapital, retainedEarnings.
 *   `assets` is the five recognisable fixed-asset categories plus `other` for the rest.
 *   `loanBalances` and `shareholderBalances` are plain number arrays — POSITIONAL, and
 *   deliberately carrying no labels at all.
 */
function extractForecastBalanceSheet (grid) {
  const rows = shapeRows(grid)
  const meta = headerMeta(rows, BS_TITLE)
  if (meta.titleRow === -1) { return { recognised: false } }

  // Skip the header block: a title, company or date row is a label with no figure,
  // which lineItems would otherwise read as a section heading.
  const body = rows.slice(meta.bodyFrom)
  const items = lineItems(body)
  const warnings = totalCrossChecks(body)
  guardFigureColumns(grid, warnings)

  // 🔴 THE THREE SIDES ARE SPLIT BY EXCLUSION, NOT BY NESTING. An export that carries no
  // "Total Assets" row never closes its Assets section, so Liabilities and Equity nest
  // INSIDE it and every liability then satisfies `inSection(/asset/i)`. Found live on
  // 2026-09-02: a 249,000 bank overdraft was read as cash and a bank loan as a fixed
  // asset. Both unit-test grids carried the Total row, so neither caught it. Asking
  // what a row is NOT is robust however the sections happen to nest.
  // A section must BE equity, not merely mention it. QuickBooks heads its whole
  // second half "LIABILITIES AND EQUITY", so a loose /equity/ test excluded every
  // liability under it — accounts payable, GST, accruals and the loans all vanished.
  // (Found 2026-09-02 probing QuickBooks; the loose test was written earlier the same
  // day for the missing-Total-Assets fix, and this is the other half of that story.)
  const isLiability = it => inSection(it, /liabilit/i)
  const isEquity = it => it.section.some(s => /^(?:total\s+)?(?:owners?'?\s+|shareholders?'?\s+)?equity$|^capital\s+and\s+reserves$/i.test(String(s).trim()))
  const assetItems = items.filter(it => inSection(it, /asset/i) && !isLiability(it) && !isEquity(it))
  const liabItems = items.filter(it => isLiability(it) && !isEquity(it))
  // No asset exclusion here: `isEquity` now requires a section named exactly "Equity"
  // (or "Capital and Reserves"), which an asset row can never sit under. Adding one
  // broke the no-"Total Assets" layout, where Equity nests inside the open Assets
  // section and every equity line was excluded.
  const equityItems = items.filter(isEquity)
  const currentAssets = assetItems.filter(it => !inSection(it, /non-?current|fixed/i))
  const nonCurrentAssets = assetItems.filter(it => inSection(it, /non-?current|fixed/i))

  const currentLiabItems = liabItems.filter(it => !inSection(it, /non-?current|long[-\s]?term/i))
  const nonCurrentLiabItems = liabItems.filter(it => inSection(it, /non-?current|long[-\s]?term/i))

  const figures = Object.create(null)
  // 🔴 EVERY ROW IS CLAIMED OR SWEPT — NOTHING IS DROPPED. Each named test below records
  // the rows it consumed, and whatever is left over goes to its own section's catch-all.
  // Until 2026-09-05 only non-current assets swept, and the comment on `leftoverAssets`
  // stated the reason — "a dropped asset is a balance sheet that will not tie and an
  // advisor with no idea why" — while current assets, liabilities and equity did exactly
  // that. A real Xero export put through it that day lost 1,039,910.17 of current assets,
  // 3,090,713.29 of current liabilities, 8,546.67 of non-current liabilities and
  // 499,900.00 of equity, in silence, and reported the opening as 1,559,449.79 out of
  // balance on a file that ties to the cent in Xero. This is the rest of the balance
  // sheet obeying the rule that section already followed.
  const claimed = new Set()
  /**
   * Fill one opening slot and mark the rows it consumed.
   *
   * @param {string} key the opening-balance-sheet key to fill.
   * @param {Array<object>} candidates the rows offered to it.
   * @param {Array<object>} [origin] the FILE's own rows, where they differ from the
   *   candidates — an overdrawn bank account is re-signed before it is offered, so the
   *   candidate objects are copies and marking those would leave the originals unclaimed.
   */
  const put = (key, candidates, origin) => {
    const consumed = origin || candidates
    for (let i = 0; i < consumed.length; i++) { claimed.add(consumed[i]) }
    const p = proposalOf(candidates)
    if (p) { figures[key] = p }
  }
  /**
   * Everything in `pool` that no named test took, into one catch-all slot.
   *
   * @param {string} key the catch-all key.
   * @param {Array<object>} pool the section's rows.
   */
  const sweep = (key, pool) => {
    const p = proposalOf(pool.filter(it => !claimed.has(it)))
    if (p) { figures[key] = p }
  }

  // Bank. Xero may show an overdrawn account as a negative asset OR as a liability;
  // both are read, and the sign decides which side of the forecast it opens on.
  // Xero and QuickBooks group the accounts under a "Bank" / "Bank Accounts" heading;
  // MYOB lists them straight under Current Assets, so the label has to be readable too.
  // Deliberately narrow — a wide test would sweep in "Bank Loan" and "Bank Charges".
  const bankRows = currentAssets.filter(it =>
    inSection(it, /^bank$|bank accounts/i) || BANK_ACCOUNT_RE.test(it.label) || OVERDRAFT_RE.test(it.label))
  const overdraftLiabRows = liabItems.filter(it => OVERDRAFT_RE.test(it.label))
  put('cashAtBank', bankRows.filter(it => it.value > 0))
  const overdrawnRows = bankRows.filter(it => it.value < 0)
  const overdrawn = overdrawnRows.map(it => ({ label: it.label, value: -it.value, section: it.section }))
  put('bankOverdraft', overdrawn.concat(overdraftLiabRows), overdrawnRows.concat(overdraftLiabRows))

  put('accountsReceivable', currentAssets.filter(it => /accounts?\s+receivable|trade\s+(receivable|debtor)|^debtors\b/i.test(it.label)))
  put('inventory', currentAssets.filter(it => /stock|inventor/i.test(it.label)))
  // Before prepayments, and the comment on IN_TRANSIT_RE says why.
  put('stockInTransitDeposits', currentAssets.filter(it => IN_TRANSIT_RE.test(it.label)))
  put('prepayments', currentAssets.filter(it => PREPAYMENT_RE.test(it.label) && !IN_TRANSIT_RE.test(it.label)))
  put('gstRefund', currentAssets.filter(it => GST_RE.test(it.label)))
  put('incomeTaxRefundDue', currentAssets.filter(it => INCOME_TAX_RE.test(it.label)))

  put('accountsPayable', liabItems.filter(it => /accounts?\s+payable|trade\s+(payable|creditor)|^creditors\b/i.test(it.label)))
  put('accruedExpenses', liabItems.filter(it => ACCRUAL_RE.test(it.label)))
  put('gstPayable', liabItems.filter(it => GST_RE.test(it.label)))
  put('incomeTaxPayable', liabItems.filter(it => INCOME_TAX_RE.test(it.label)))

  put('authorisedCapital', equityItems.filter(it => SHARE_CAPITAL_RE.test(it.label)))
  put('retainedEarnings', equityItems.filter(it => RETAINED_RE.test(it.label)))

  // The six fixed-asset categories. Anything non-current that matches none of the five
  // named tests falls into `other` — never dropped, because a dropped asset is a
  // balance sheet that will not tie and an advisor with no idea why.
  const assets = Object.create(null)
  const claimedAsset = new Set()
  for (let i = 0; i < NCA_CATEGORY_TESTS.length; i++) {
    const t = NCA_CATEGORY_TESTS[i]
    const hits = nonCurrentAssets.filter(it => t.re.test(it.label) && !claimedAsset.has(it))
    hits.forEach(h => claimedAsset.add(h))
    const p = proposalOf(hits)
    if (p) { assets[t.key] = p }
  }
  const leftoverAssets = nonCurrentAssets.filter(it => !claimedAsset.has(it) && !SHAREHOLDER_RE.test(it.label))
  const otherAsset = proposalOf(leftoverAssets)
  if (otherAsset) { assets.other = otherAsset }

  // Positional, unnamed — see the block comment above.
  const loanRows = liabItems.filter(it => LOAN_RE.test(it.label))
  const shareholderRows = items.filter(it => SHAREHOLDER_RE.test(it.label))
  const loanBalances = loanRows.map(it => it.value)
  const shareholderBalances = shareholderRows
    .map(it => (inSection(it, /liabilit/i) ? it.value : -it.value))

  // The loans and the shareholder accounts have their own slots on the screen, so they
  // are claimed here and must not also fall into a catch-all — that would count them
  // twice. Claimed AFTER the named puts and BEFORE the sweeps, which is the only order
  // that gives each row exactly one home.
  for (let i = 0; i < loanRows.length; i++) { claimed.add(loanRows[i]) }
  for (let i = 0; i < shareholderRows.length; i++) { claimed.add(shareholderRows[i]) }

  // The three sweeps that were missing. Non-current assets already had theirs, above.
  sweep('otherCurrentAsset', currentAssets)
  sweep('otherCurrentLiability', currentLiabItems)
  sweep('otherNonCurrentLiability', nonCurrentLiabItems)
  sweep('otherEquity', equityItems)

  // The over-count warning belongs to the assembler, which is what actually folds the
  // surplus into the last slot — a warning where no folding happens is a warning that
  // can go out of step with the thing it describes.

  return {
    recognised: true,
    kind: 'forecastBalanceSheet',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    figures,
    assets,
    loanBalances,
    shareholderBalances,
    warnings
  }
}

// EBITDA & DCF line classification (2026-07-17). Each income item lands in exactly ONE
// bucket — interest/dividends/bad-debts match by label first, the remainder splits by
// section (trading income -> sales, other income -> otherIncome) — so seeding both
// `sales` and `interestReceived` can never double-count a row.
const INTEREST_RECEIVED_RE = /interest\s+(income|received)/i
const DIVIDENDS_RE = /^dividends?\b/i
const BAD_DEBTS_RECOVERED_RE = /bad\s*debts?\s*recovered/i
const INTEREST_PAID_RE = /interest\s+(paid|expense)|loan\s+interest/i
const OTHER_INCOME_SECTION_RE = /other\s+income|non-?operating\s+income/i
const COST_OF_SALES_SECTION_RE = /cost\s+of\s+(sales|goods)/i
// R18 again: anchored so "Non-Trading Income" can never classify as sales. Named here
// rather than written inline because the by-month parser (monthlySalesParser.js) must
// decide "is this row sales?" by exactly THIS rule — two copies would drift, and the
// drift would be a different revenue figure from the same file depending on the export.
const INCOME_SECTION_RE = /^income$|^revenue$|^trading income$|^sales$/i

/** Package a candidate list as a file-sourced proposal, or undefined when none found. */
function proposalOf (candidates) {
  if (!candidates.length) { return undefined }
  return {
    value: sumCandidates(candidates),
    source: 'file',
    // REDACTED HERE, at the one seam every displayed label passes through. Matching above
    // still uses the file's own text — redacting before the tests ran would change which
    // box a row lands in, which is a correctness change and not what this is for.
    candidates: candidates.map(c => ({ label: redactLabel(c.label), value: c.value }))
  }
}

/** A personal title, and the initials or single letters that stand in for a name. */
const TITLE_RE = /\b(?:mr|mrs|ms|miss|mx|dr|sir|lady)\b\.?/i
/**
 * The same titles WRITTEN AS TITLES — exact case, so `Ms` is a person and `MS` is
 * Microsoft. It is the only thing that separates "Ms Patel Loan Account" from
 * "MS Office Subscription", and without it the second becomes "Office Subscription".
 * Used only by the two rules that have no name or initial beside them to go on.
 */
const TITLE_EXACT_RE = /^(?:Mr|Mrs|Ms|Miss|Mx|Dr|Sir|Lady)\.?$/
/** Ltd, Trust, Investments … — the words that mark a counterparty rather than an account. */
const COMPANY_MARKER_RE = /\b(?:ltd|limited|inc|llc|plc|pty|trust|trustees?|investments?|holdings?|partners?|nominees?|enterprises?|group|& ?co)\b/i

/**
 * Strip the identifying detail out of a client's own account name, keeping enough of it
 * that an advisor can still tell which account a row is.
 *
 * 🔴 WHY THIS EXISTS (Mike, 2026-09-05, on seeing a real export on screen): a chart of
 * accounts carries people's names and card numbers. That one file put `BNZ Mr y business
 * card -4702`, `Equity Mr x` and `Trade Finance Loans - NMK Investments` on the screen.
 * Those labels reach the browser and nowhere else — never a log, never storage, never a
 * model, and `buildInputs()` sends amounts only — but that was true by accident, and item
 * 4.66 will be the first report model to call the AI. Redacting at the source means a
 * screenshot, a screen-share with the client, or a future feature cannot carry a person's
 * name or a card number even by mistake.
 *
 * THREE DETERMINISTIC RULES, and no guessing:
 *   1. any run of three or more digits, with an attached dash — `-4702`, `- 000`;
 *   2. a personal title with the initials that follow it, and a trailing title-and-name;
 *   3. a counterparty after a dash, but ONLY where it is an all-caps acronym or carries a
 *      company marker — so `- Foreign Exchange` and `- Payroll` survive untouched.
 *
 * ⚠ TWO SHAPES SURVIVE ON PURPOSE, and Mike ruled that the right trade on 2026-09-05.
 * A bare initialism at the START (`XYZ Funds Introduced`) cannot be told apart from `GST
 * Payable`, `PAYE Payable` or `OEM Bike Parts`, and a place name (`Hamilton P&A Stock`)
 * is how an advisor tells four stock locations apart. Removing either would mean showing
 * no labels at all, which is the one thing that makes the tick-boxes useless.
 *
 * @param {string} label the account name as the file wrote it.
 * @returns {string} the name with its identifying detail removed.
 */
function redactLabel (label) {
  let s = (label === null || label === undefined) ? '' : String(label)
  const T = TITLE_RE.source
  // (1) account and card numbers, with any dash that introduces them.
  s = s.replace(/[-–—]?\s*\b\d{3,}\b/g, ' ')
  // (2a) A NAME AFTER A SEPARATOR IS A COUNTERPARTY, and the whole of it goes:
  // "Loan - Mrs J Patel", "Current Account: Dr Smith". The separator is what makes this
  // safe — the same words WITHOUT one are usually an account description, which is why
  // the rules below are far more cautious.
  s = s.replace(new RegExp('\\s*[-–—:,]\\s*' + T + '(?:\\s+\\S+)*\\s*$', 'i'), ' ')
  // (2b) A title with the initials standing in for a name — "Mr y", "Mrs J", "Dr J.M."
  // Only single letters follow, so "Mr y business card" gives up "y" and keeps the
  // account, and "Mr y Funds Introduced" keeps the account too.
  s = s.replace(new RegExp(T + '(?:\\s+[A-Za-z]\\.?(?=\\s|$))+', 'gi'), ' ')
  // (2c) A title and one capitalised name, where the title OPENS the label — the shape a
  // person's account takes when it is named after them: "Mrs Patel Loan Account". The
  // title is tested case-insensitively and the name case-SENSITIVELY, which is why this
  // is a callback: one /i regex would let [A-Z] match lowercase and eat the account word.
  s = s.replace(/^\s*(\S+)\s+([A-Z][A-Za-z'-]*)/, function (whole, first) {
    return TITLE_EXACT_RE.test(first) ? ' ' : whole
  })
  // NO FOURTH RULE FOR A BARE TITLE. One was written and removed the same hour: a title
  // with no name or initial beside it is usually not a title at all — "Dr and Cr
  // Clearing" is debit and credit, and stripping it gave "and Cr Clearing". Every shape
  // it would have caught, (2b) already catches from the initial that follows.
  // (3) A counterparty after a dash: an acronym, a company, or a person written as an
  // initial and a surname ("- R Patel"). Anything else after a dash is an account
  // description and is left alone — "- Foreign Exchange", "- Payroll" — which is why this
  // asks for a positive signal rather than taking whatever follows a dash.
  s = s.replace(/\s*[-–—]\s*([^-–—]+)$/, function (whole, tail) {
    const t = tail.trim()
    const isAcronym = /^[A-Z][A-Z&.\s]*$/.test(t) && /[A-Z]{2,}/.test(t)
    const isPersonName = /^[A-Z]\.?\s+[A-Z][A-Za-z'-]+$/.test(t)
    return (isAcronym || isPersonName || COMPANY_MARKER_RE.test(t)) ? ' ' : whole
  })
  // Tidy: collapse the gaps the rules left, and drop punctuation left stranded at either
  // end. A label redacted down to nothing is still a row the advisor must place, so it
  // keeps a neutral name rather than an empty cell.
  s = s.replace(/\s+/g, ' ').replace(/^[\s,:;/&-]+|[\s,:;/&-]+$/g, '').trim()
  return s || 'Account'
}

/** The report's year: the LAST 4-digit year in its own date line ("1 April 2024 to 31 March 2025" -> 2025). */
function yearOf (reportDate) {
  if (!reportDate) { return null }
  const matches = String(reportDate).match(/\b(?:19|20)\d{2}\b/g)
  return matches ? parseInt(matches[matches.length - 1], 10) : null
}

/**
 * Extract the Expenses Review seed (and an income figure) from a P&L grid — plus, since
 * the EBITDA & DCF model (Stage B, 2026-07-17), the per-figure proposals it needs, in
 * `plFigures`. Additive: the Quick Position contract (expenseLines, incomeTotal) is
 * byte-for-byte unchanged.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} { recognised, kind, companyName, reportDate, year, expenseLines,
 *   incomeTotal, plFigures, warnings } — plFigures keys (each {value, source:'file',
 *   candidates} and present only when the file carries it): sales, costOfSales,
 *   operatingExpenses, otherIncome, interestReceived, dividendsReceived,
 *   badDebtsRecovered, loanInterestPaid. operatingExpenses deliberately INCLUDES any
 *   interest-paid rows (the model adds interest back separately, so its opex total must
 *   contain it — EBITDA Calcs row 14 vs row 28).
 */
function extractProfitLoss (grid) {
  const rows = shapeRows(grid)
  const meta = headerMeta(rows, PL_TITLE)
  if (meta.titleRow === -1) { return { recognised: false } }

  // Skip the header block: a title, company or date row is a label with no figure,
  // which lineItems would otherwise read as a section heading.
  const body = rows.slice(meta.bodyFrom)
  const items = lineItems(body)
  const warnings = totalCrossChecks(body)
  guardFigureColumns(grid, warnings)

  // R18: "trading income" is anchored — "Non-Trading Income" must never classify as sales
  const expenseItems = items.filter(it => inSection(it, /operating expenses|^expenses$|overheads/i))
  const incomeItems = items.filter(it => inSection(it, INCOME_SECTION_RE))
  const otherIncomeItems = items.filter(it => inSection(it, OTHER_INCOME_SECTION_RE))
  const costOfSalesItems = items.filter(it => inSection(it, COST_OF_SALES_SECTION_RE))

  // R19: a valued section that fed no bucket is declared on screen, never silently skipped
  // (guessing its classification is what the contract forbids — the advisor decides).
  const sectionClaimed = new Set(incomeItems.concat(otherIncomeItems, costOfSalesItems, expenseItems))
  const missedSections = []
  for (const it of items) {
    if (sectionClaimed.has(it) || !it.section.length) { continue }
    const name = it.section[it.section.length - 1]
    if (!missedSections.includes(name)) { missedSections.push(name) }
  }
  for (const name of missedSections) {
    warnings.push("The section '" + name + "' wasn't recognised, so its lines are not included in any proposed figure — please check the figures and adjust where needed.")
  }

  const allIncome = incomeItems.concat(otherIncomeItems)
  const interestReceived = allIncome.filter(it => INTEREST_RECEIVED_RE.test(it.label))
  const dividendsReceived = allIncome.filter(it => DIVIDENDS_RE.test(it.label))
  const badDebtsRecovered = allIncome.filter(it => BAD_DEBTS_RECOVERED_RE.test(it.label))
  const claimed = new Set(interestReceived.concat(dividendsReceived, badDebtsRecovered))
  const salesItems = incomeItems.filter(it => !claimed.has(it))
  const plainOtherIncome = otherIncomeItems.filter(it => !claimed.has(it))
  const loanInterestPaid = expenseItems.filter(it => INTEREST_PAID_RE.test(it.label))

  const plFigures = Object.create(null)
  const put = (key, candidates) => {
    const p = proposalOf(candidates)
    if (p) { plFigures[key] = p }
  }
  put('sales', salesItems)
  put('costOfSales', costOfSalesItems)
  put('operatingExpenses', expenseItems)
  put('otherIncome', plainOtherIncome)
  put('interestReceived', interestReceived)
  put('dividendsReceived', dividendsReceived)
  put('badDebtsRecovered', badDebtsRecovered)
  put('loanInterestPaid', loanInterestPaid)

  return {
    recognised: true,
    kind: 'profitLoss',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    year: yearOf(meta.reportDate),
    expenseLines: expenseItems.map(it => ({ name: it.label, amount: it.value })),
    incomeTotal: incomeItems.length ? sumCandidates(incomeItems) : null,
    plFigures,
    warnings
  }
}

/**
 * Sniff an uploaded buffer and read it into cell grids — the file-type half of
 * parseUpload, split out so the by-month parser (monthlySalesParser.js) reads files
 * by exactly the same rules: same PDF refusal, same binary sniff, same hardened
 * xlsx reader. This is the ONLY place an uploaded buffer becomes cells.
 *
 * @param {Buffer} buf - the uploaded file's bytes.
 * @returns {Array<Array<Array<string|number|null>>>} one grid per worksheet (CSV gives one).
 * @throws {XlsxReadError|Error} err.code ∈ NOT_XLSX | CORRUPT_FILE | FILE_TOO_LARGE |
 *   TOO_MANY_PARTS | PDF_REJECTED | UNRECOGNISED_FILE
 */
function gridsFromBuffer (buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    const e = new Error('The upload was empty'); e.code = 'UNRECOGNISED_FILE'; throw e
  }
  if (buf.length >= 4 && buf.toString('latin1', 0, 4) === '%PDF') {
    const e = new Error('PDF files cannot be read reliably — please export the report from your accounting software as Excel (.xlsx) or CSV and drop that instead')
    e.code = 'PDF_REJECTED'
    throw e
  }

  let grids
  if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034B50) {
    grids = readXlsx(buf).map(s => s.rows)
  } else {
    // Treat as text/CSV only if it decodes as printable text (no binary control bytes)
    const text = buf.toString('utf8')
    // eslint-disable-next-line no-control-regex -- deliberately detecting binary bytes
    if (/[\u0000-\u0008\u000E-\u001F]/.test(text.slice(0, 2000))) {
      const e = new Error('Unrecognised file type — please drop a report exported as Excel (.xlsx) or CSV from ' + supportedList())
      e.code = 'UNRECOGNISED_FILE'
      throw e
    }
    grids = [parseCsv(text)]
  }
  return grids
}

/**
 * Sniff an uploaded buffer, read it (xlsx or csv), detect which Xero report it is,
 * and extract the intake proposal. The single entry point the annual routes call.
 *
 * @param {Buffer} buf - the uploaded file's bytes.
 * @returns {object} on success: the extract result above.
 * @throws {XlsxReadError|Error} err.code ∈ NOT_XLSX | CORRUPT_FILE | FILE_TOO_LARGE |
 *   TOO_MANY_PARTS | PDF_REJECTED | UNRECOGNISED_FILE | UNRECOGNISED_REPORT | MULTI_PERIOD_COLUMNS
 */
function parseUpload (buf) {
  const grids = gridsFromBuffer(buf)

  for (let g = 0; g < grids.length; g++) {
    const bs = extractBalanceSheet(grids[g])
    if (bs.recognised) { return bs }
    const pl = extractProfitLoss(grids[g])
    if (pl.recognised) { return pl }
  }
  const e = new Error('This does not look like a Balance Sheet or Profit and Loss export — expected the report title in the first rows. Reports from ' + supportedList() + ' can be read.')
  e.code = 'UNRECOGNISED_REPORT'
  throw e
}

/**
 * As `parseUpload`, but a Balance Sheet is read for the Three-Way Forecast's whole
 * opening position rather than Quick Position's five figures. Its own entry point so
 * that `parseUpload` — which Quick Position and EBITDA both call — is untouched.
 *
 * @param {Buffer} buf - the uploaded file's bytes.
 * @returns {object} a `forecastBalanceSheet` or `profitLoss` extract.
 * @throws {XlsxReadError|Error} the same error codes as `parseUpload`.
 */
function parseForecastUpload (buf) {
  const grids = gridsFromBuffer(buf)

  for (let g = 0; g < grids.length; g++) {
    const bs = extractForecastBalanceSheet(grids[g])
    if (bs.recognised) { return bs }
    const pl = extractProfitLoss(grids[g])
    if (pl.recognised) { return pl }
  }
  const e = new Error('This does not look like a Balance Sheet or Profit and Loss export — expected the report title in the first rows. Reports from ' + supportedList() + ' can be read.')
  e.code = 'UNRECOGNISED_REPORT'
  throw e
}

module.exports = {
  parseUpload,
  parseForecastUpload,
  // Shared with the assembler so a client's account name has ONE definition of what is
  // stripped out of it, whether it reaches the screen as a candidate row or inside the
  // unrecognised-expenses warning. Two copies would drift and one would leak.
  redactLabel,
  gridsFromBuffer,
  extractBalanceSheet,
  extractForecastBalanceSheet,
  extractProfitLoss,
  XlsxReadError,
  // Shared with monthlySalesParser: the report-title test, the header reader and the
  // period-year reader. One definition each — a by-month export is the same document
  // with more columns, so it must be recognised and dated by the same rules.
  PL_TITLE,
  headerMeta,
  yearOf,
  // Shared with monthlySalesParser so "which rows are sales?" has ONE definition.
  INCOME_RULES: Object.freeze({
    INCOME_SECTION_RE,
    OTHER_INCOME_SECTION_RE,
    INTEREST_RECEIVED_RE,
    DIVIDENDS_RE,
    BAD_DEBTS_RECOVERED_RE
  })
}
