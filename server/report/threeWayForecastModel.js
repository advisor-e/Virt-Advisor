'use strict'

/**
 * Three-Way Forecast — calculation engine (Year 1).
 *
 * Faithful port of Year 1 of `design/report-source-models/3 way Filter.xlsx` — an
 * integrated monthly profit & loss, balance sheet and cash flow, with the working
 * schedules that drive them (debtor collection, creditor payment, inventory, three
 * term loans, six fixed-asset categories, GST, income tax and four shareholder
 * current accounts).
 *
 * PROVEN AGAINST THE WORKBOOK: an independent re-implementation reproduces 10,155 of the
 * 10,227 calculated cells across all three projection sheets exactly — 3,385 per year
 * (see `tests/unit/threeWayForecastModel.test.js`, `threeWayForecastYears.test.js` and
 * their generated fixtures). The 72 not covered are row 1 on each sheet, the month-header
 * dates, which are labels rather than calculations, and year 1's row 201, the mis-filled
 * duplicate that R6 removes and which therefore cannot map to a single series.
 *
 * NINE CORRECTIONS, EACH RULED BY MIKE ON 2026-09-02. The workbook was extended over
 * time from three fixed-asset categories to six, and several aggregation formulas were
 * never updated. The full evidence for each is in
 * `design/THREE-WAY-FORECAST-DEVIATIONS.md`; in short:
 *
 *   R1  Total Non-Current Assets summed four of six categories (sheet row 106).
 *   R2  The P&L depreciation charge summed three of six schedules (row 28) — the
 *       largest of the seven: it overstated year-1 profit by 55,654 on the sample.
 *   R3  Cash-flow asset sales covered three of six (row 130).
 *   R4  Cash-flow capital expenditure covered three of six (row 142), while the GST on
 *       all six was still paid — so a client bought equipment and paid only its GST.
 *   R5  The six-monthly GST cell was #REF! in the first month of each year (row 411);
 *       the six-column window now clamps to the start of the year, which is what the
 *       intact columns already do.
 *   R6  "Other 5" was paid twice in month 1, and a mis-filled formula paid "Other 4"
 *       twice from month 2 (row 201). Each overhead is now paid exactly once.
 *   R7  "Other Direct Expenses (GST Exempt)" was charged to the P&L and paid by
 *       nothing at all — 17,800 of year-1 cash that never left the bank. It now pays
 *       in the GST-free current-month block, beside the other percentage-of-revenue
 *       direct costs, as its own name ("GST Exempt") indicates.
 *
 * With all seven applied the three statements ARTICULATE EXACTLY: the balance check
 * holds flat across all twelve months instead of eroding. Any residual is the opening
 * balance sheet the advisor entered, which is the honest place for it to show.
 *
 *   R8  The four shareholder current accounts reset to their year-one opening at EVERY
 *       year boundary, wiping that year's interest, advances and drawings — while the
 *       balance sheet carried the correct closing figure, so the two disagreed. The
 *       loans were wired up properly, which is how we know this was an omission. They
 *       now open where they closed.
 *   R9  Months advanced by 31 DAYS rather than one calendar month, so a three-year
 *       forecast ended three weeks adrift and a start late in a month could skip a
 *       calendar month outright — misfiling the GST schedule, which those dates drive.
 *       Months now advance by the calendar, clamping to a short month's last day.
 *
 * A TENTH, RULED BY MIKE ON 2026-09-03, and the only one that is not an aggregation
 * repair:
 *
 *   R10 A sale had ONE figure. It came off the asset register and it was banked, so the
 *       two agreed only when an asset sold for exactly its written-down value — and, in
 *       Mike's words, "there are legitimate times that an asset sells for more than book
 *       value - such as a used vehicle". `disposals` is now the book value leaving the
 *       register and `proceeds` is the sale price: the bank and the GST return follow
 *       the price, the register follows the book value, and the difference is a gain or
 *       loss in the month of the sale. Omitting `proceeds` means it sold for its book
 *       value, which is the only case the workbook could express — so every forecast
 *       built before this change reads identically.
 *
 * `computeThreeYearForecast` chains all three years: each year's closing balance sheet
 * becomes the next year's opening, which is what the workbook itself does
 * (`'Yr 1. Projections'!O70`…`O116`). The chain is proved by the balance check not
 * moving across all 36 months — if any closing figure failed to reach the next year it
 * would. AN OMITTED LATER YEAR INHERITS THE YEAR BEFORE IT, never the sample workbook,
 * so leaving years 2 and 3 empty forecasts "the same again" rather than dropping
 * "Big Bird Grass Seed" into a real client's accounts.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution. CommonJS for
 * Node 14.15.
 */

const MONTHS = 12

/* ------------------------------------------------------------------ arithmetic -- */

/**
 * Excel's ROUND(x, 0), which JavaScript's Math.round does not give for free.
 *
 * Two differences bite, and both were found by the port disagreeing with the workbook:
 *  - Excel rounds half AWAY FROM ZERO; Math.round rounds half UP, so they differ on
 *    every negative half.
 *  - Excel carries 15 significant decimal digits, so `0.15 * 6783.333333333333` is
 *    1017.5 to Excel and 1017.4999999999999 in IEEE-754 — a whole unit apart once
 *    rounded, and it cascades through every GST and cash figure downstream.
 *
 * @param {number} x @returns {number}
 */
function excelRound (x) {
  if (!isFinite(x)) { return x }
  const v = x === 0 ? 0 : Number(x.toPrecision(15))
  const r = v < 0 ? -Math.floor(-v + 0.5) : Math.floor(v + 0.5)
  // Normalise negative zero. A balance check that reads "-0" on screen is a defect,
  // and JavaScript produces one from any small negative rounded to nothing.
  return r === 0 ? 0 : r
}

/** Can this value be used as a figure? @param {*} v @returns {boolean} */
function usable (v) {
  if (v === null || v === undefined || v === '') { return false }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return typeof n === 'number' && isFinite(n)
}

/**
 * Coerce to a finite number; junk or absent falls back to the default.
 * @param {*} v @param {number} def @returns {number}
 */
function pick (v, def) {
  if (!usable(v)) { return def }
  return typeof v === 'number' ? v : parseFloat(v)
}

/**
 * Coerce a 12-element monthly series, element by element, so one bad month cannot
 * discard the other eleven.
 * @param {*} v @param {Array<number>} def @returns {Array<number>}
 */
function pickSeries (v, def) {
  const out = []
  for (let m = 0; m < MONTHS; m++) {
    const supplied = Array.isArray(v) ? v[m] : undefined
    out.push(pick(supplied, def && usable(def[m]) ? def[m] : 0))
  }
  return out
}

/** A fresh 12-month array of zeroes. @returns {Array<number>} */
function zeroes () { return new Array(MONTHS).fill(0) }

/**
 * A 12-element series of blanks, where a blank means "nothing was said about this month".
 *
 * ⚠ NOT `zeroes()`, AND THE DIFFERENCE IS THE WHOLE POINT. Zero is a figure an advisor can
 * legitimately mean — no revenue that month — so a series that cannot tell zero from silence
 * would make "I sell nothing in March" indistinguishable from "work March out for me".
 * @returns {Array<null>}
 */
function blanks () { return new Array(MONTHS).fill(null) }

/**
 * Coerce a 12-element series that may be blank month by month, KEEPING the blanks.
 *
 * `pickSeries` fills a blank with a default, which is right for every other series here and
 * wrong for an override: the absence is the instruction.
 * @param {*} v @returns {Array<number|null>}
 */
function pickOverrideSeries (v) {
  const out = []
  for (let m = 0; m < MONTHS; m++) {
    const supplied = Array.isArray(v) ? v[m] : undefined
    out.push(usable(supplied) ? pick(supplied, 0) : null)
  }
  return out
}

/**
 * Every landing this forecast has to account for, each carrying the months ITS OWN deposit
 * and balance fall in.
 *
 * 🔴 THIS IS THE SEAM SLICE 2 NEEDED, AND IT IS THE WHOLE OF THE ENGINE CHANGE. Everything
 * downstream of it — the deposit, the prepayment, the balance, freight, duty, border GST
 * and the sell-down — was already worked out one landing at a time. It was simply looping
 * over the twelve months and deriving each landing's dates from ONE deposit lead and ONE
 * balance profile shared by all of them.
 *
 * WITHOUT A CALCULATOR (every forecast today) the list is built from exactly those uniform
 * terms, so the arithmetic is unchanged to the cent — which the 3,385-cell golden guard
 * proves rather than this comment asserting it.
 *
 * WITH ONE, each shipment brings its own real dates (Mike's ruling, 2026-09-04: the
 * calculator writes all three series). Two containers ordered eighteen days apart have
 * balances due on 1 and 19 August; a single averaged lead would replace both with one
 * month, which is the averaging the "dates, not bands" ruling exists to stop.
 *
 * ⚠ A SHIPMENT'S BALANCE IS ONE DATED PAYMENT, NOT A PROFILE. The supplier's terms say when
 * the balance is due; there is nothing to spread. The shape is kept common so the loop
 * below has one path rather than two — two paths through a balance-sheet movement is how
 * the prepayment and the liability start disagreeing.
 *
 * @param {object} O - the normalised `overseas` block.
 * @returns {Array<{value:number, landsInMonth:number, depositPct:number, depositMonth:number,
 *   balance:Array<{month:number, share:number}>}>}
 */
function landingsOf (O) {
  const out = []

  if (Array.isArray(O.landings) && O.landings.length) {
    for (let i = 0; i < O.landings.length; i++) {
      const L = O.landings[i]
      const value = pick(L && L.value, 0)
      const m = Math.round(pick(L && L.landsInMonth, -1))
      // A landing outside the twelve months is not this forecast's stock and neither is its
      // cash. `importShipmentModel` reports those separately; this is the belt to its
      // braces, because a caller is not obliged to have used it.
      if (!value || m < 0 || m >= MONTHS) { continue }
      out.push({
        value,
        landsInMonth: m,
        depositPct: Math.min(1, Math.max(0, pick(L.depositPct, O.depositPct))),
        depositMonth: Math.round(pick(L.depositMonth, m - O.depositLeadMonths)),
        balance: [{ month: Math.round(pick(L.balanceMonth, m)), share: 1 }],
        // Interest cover, computed by the calculator over the real days the supplier waits.
        // Only a dated shipment can carry one — see `landingsOf`'s uniform branch.
        interest: Math.max(0, pick(L.interest, 0))
      })
    }
    return out
  }

  for (let m = 0; m < MONTHS; m++) {
    const value = O.importedPurchases[m]
    if (!value) { continue }
    const balance = []
    for (let lag = 0; lag < 5; lag++) {
      if (O.balancePayment[lag]) { balance.push({ month: m + lag, share: O.balancePayment[lag] }) }
    }
    out.push({
      value,
      landsInMonth: m,
      depositPct: O.depositPct,
      depositMonth: m - O.depositLeadMonths,
      balance,
      // 🔴 NO INTEREST COVER WITHOUT A CALCULATOR, and that is Mike's ruling rather than an
      // omission. Twelve typed landing figures carry no order date and no credit period, so
      // there is no number of days to charge interest over. Inventing one is exactly the
      // band-mapping guesswork the "dates, not bands" ruling exists to stop — and it would
      // move every existing forecast, which the golden guard would rightly refuse.
      interest: 0
    })
  }
  return out
}

/**
 * The price ladder and the demand patterns for imported stock — Mike's own figures,
 * held as data rather than as constants because they are advisory content that moves a
 * client's numbers. See the file's own header. Item 4.64.
 */
const SELL_DOWN = require('../../data/forecast-sell-down.json')

/** A demand pattern's four 30-day bands. @param {string} name @returns {Array<number>|null} */
function curveOfPattern (name) {
  for (let i = 0; i < SELL_DOWN.patterns.length; i++) {
    if (SELL_DOWN.patterns[i].name === name) { return SELL_DOWN.patterns[i].curve.slice() }
  }
  return null
}

/** Sum a set of monthly series into one. @param {...Array<number>} series */
function addSeries () {
  const out = zeroes()
  for (let i = 0; i < arguments.length; i++) {
    const s = arguments[i]
    for (let m = 0; m < MONTHS; m++) { out[m] += s[m] }
  }
  return out
}

/* --------------------------------------------------------------------- defaults -- */

/** The six fixed-asset categories, in the workbook's own order. */
const ASSET_KEYS = ['vehicles', 'leaseholdImprovements', 'plantEquipment', 'officeEquipment', 'computerHardware', 'other']

/**
 * The most funding lines one forecast may carry — Mike's ruling of 2026-09-05, and the cap
 * is OURS: a safety limit against a malformed file, never a judgement about how much debt a
 * business may carry. The workbook had three; the real client that prompted this has six.
 * Rows appear as they are needed rather than being a fixed number, so the majority with one
 * loan and an overdraft are not shown five empty rows.
 */
const MAX_FUNDING_LINES = 8

/** The overhead lines, in P&L order. Each is entered as an ANNUAL figure and spread /12. */
const OVERHEAD_KEYS = [
  'accLevies', 'accountancy', 'advertising', 'bankCharges', 'computerExpenses',
  'generalExpenses', 'insurance', 'interestIrd', 'occupancy', 'power', 'printing',
  'rent', 'repairs', 'shareholderSalaries', 'subscriptions', 'telephone', 'vehicle',
  'wages', 'otherOne', 'otherTwo', 'otherThree', 'otherFour', 'otherFive'
]

/**
 * The workbook's own sample figures ("Big Bird Grass Seed", forecast starting 1 April).
 * These are what the golden test computes on, so they are the model's contract with
 * the spreadsheet and must not be tuned.
 */
const DEFAULTS = {
  startDateSerial: 45383, // Excel serial for 2024-04-01 — `Data Input` E12
  sales: [85000, 70000, 75000, 80000, 60000, 65000, 70000, 70000, 80000, 95000, 70000, 70000],
  purchases: [3500, 2000, 50000, 90000, 40000, 50000, 30000, 80000, 60000, 70000, 60000, 50000],
  markup: 0.68,
  // Direct costs, each a fraction of revenue.
  directCostRates: { freight: 0.03, otherDirectExempt: 0.02, otherTwo: 0.01, commissions: 0.1 },
  // Overheads, ANNUAL.
  overheads: {
    accLevies: 15000,
    accountancy: 8500,
    advertising: 11000,
    bankCharges: 650,
    computerExpenses: 2500,
    generalExpenses: 2000,
    insurance: 4500,
    interestIrd: 0,
    occupancy: 2500,
    power: 1500,
    printing: 500,
    rent: 8500,
    repairs: 0,
    shareholderSalaries: 0,
    subscriptions: 500,
    telephone: 3500,
    vehicle: 9700,
    wages: 85000,
    otherOne: 1000,
    otherTwo: 2000,
    otherThree: 3000,
    otherFour: 4000,
    otherFive: 5000
  },
  otherIncomeGstInclusive: 0, // ANNUAL
  otherIncomeGstExempt: 0, // ANNUAL
  taxRate: 0.28,
  lossesAvailable: 0,
  taxPayments: zeroes(),
  taxRefunds: zeroes(),
  accLeviesPaid: zeroes(),
  insurancePaid: zeroes(),
  openingBalanceSheet: {
    authorisedCapital: 200000,
    capitalGain: 42000,
    retainedEarnings: 7000,
    cashAtBank: 71000,
    accountsReceivable: 52000,
    inventory: 65000,
    incomeTaxRefundDue: 0,
    gstRefund: 4000,
    prepayments: 0,
    otherCurrentAsset: 0,
    bankOverdraft: 249000,
    accountsPayable: 58000,
    incomeTaxPayable: 13500,
    gstPayable: 5500,
    accruedExpenses: 5000,
    otherCurrentLiability: 0,
    otherNonCurrentLiability: 0,
    // The equity catch-all. Current assets, current liabilities and non-current
    // liabilities each had one; equity did not, so any equity line that was neither
    // share capital nor retained earnings had nowhere to land and was dropped. On a real
    // Xero export (2026-09-05) that silently lost a 500,000 dividend and the share
    // capital, and it is half of why the opening did not tie. Carried forward unchanged
    // month to month, exactly as capitalGain is. Defaults to 0, so the golden set cannot
    // move.
    otherEquity: 0,
    /**
     * Money already paid to overseas suppliers for stock that has not arrived — its own
     * opening line rather than a lump in `otherCurrentAsset` (Fix 2, 2026-09-05).
     *
     * It is NOT `prepayments`: that line is driven by a live accrual schedule which would
     * release it to the P&L as an expense, and this is stock, not a cost. It opens the
     * import prepayment position instead, and is released into inventory in the month the
     * advisor says the container lands. Defaults to 0, so the golden set cannot move.
     */
    stockInTransitDeposits: 0
  },
  assets: [
    { key: 'vehicles', opening: 80000, depreciationRate: 0.2, additions: zeroes(), disposals: zeroes() },
    { key: 'leaseholdImprovements', opening: 1000000, depreciationRate: 0.15, additions: zeroes(), disposals: zeroes() },
    { key: 'plantEquipment', opening: 50000, depreciationRate: 0.22, additions: zeroes(), disposals: zeroes() },
    { key: 'officeEquipment', opening: 60000, depreciationRate: 0.25, additions: zeroes(), disposals: zeroes() },
    { key: 'computerHardware', opening: 70000, depreciationRate: 0.3, additions: zeroes(), disposals: zeroes() },
    { key: 'other', opening: 80000, depreciationRate: 0.35, additions: zeroes(), disposals: zeroes() }
  ],
  /**
   * How the business is funded. `type` is 'term' or 'facility' — Mike's own word for the
   * column, ruled 2026-09-05. The workbook knew only term loans, so every default is one
   * and a caller that says nothing gets exactly the workbook's three.
   */
  loans: [
    { name: 'ABC Bank', type: 'term', opening: 80000, monthlyRepayment: 2450, interestRate: 0.07, drawdowns: zeroes(), lumpSumRepayments: zeroes() },
    { name: 'XYZ Bank', type: 'term', opening: 1000000, monthlyRepayment: 10650, interestRate: 0.05, drawdowns: zeroes(), lumpSumRepayments: zeroes() },
    { name: 'DEF Finance', type: 'term', opening: 50000, monthlyRepayment: 1590, interestRate: 0.09, drawdowns: zeroes(), lumpSumRepayments: zeroes() }
  ],
  overdraftInterestRate: 0.07,
  inFundsInterestRate: 0.02,
  /**
   * Buying and selling overseas — item 4.64, drawing approved by Mike 2026-09-04.
   * ALL ZERO BY DEFAULT, which is what makes the addition provable: a forecast that
   * says nothing about overseas trade gets the identical figure in every cell, and
   * tests/unit/threeWayForecastModel.test.js holds the engine to that.
   */
  overseas: {
    enabled: false,
    // Buying: what LANDS each month, ex GST, and the terms it lands on.
    importedPurchases: zeroes(),
    // The shipment calculator's resolved landings (item 4.64 slice 2). Empty means "there
    // is no calculator on this forecast", which is every forecast today.
    landings: [],
    depositPct: 0.6,
    depositLeadMonths: 4, // reaches 9 — his workbook pays ~220 days before the first sale
    balancePayment: [0, 1, 0, 0, 0], // from the landing month: [same, +1, +2, +3, +4]
    freightPct: 0.12,
    dutyPct: 0.05,
    fxAllowancePct: 0.1,
    // How it sells down. The ladder and the curve are Mike's, from data/forecast-sell-down.json.
    sellDown: Object.assign({}, SELL_DOWN.ladder, {
      pattern: SELL_DOWN.defaultPattern,
      curve: null // resolved from `pattern` when not given outright
    }),
    readyAfterMonths: 1,
    // What the advisor has typed over the worked-out revenue, month by month. All blank by
    // default, so the ladder governs every month unless somebody says otherwise (item 4.64).
    importedRevenueOverride: blanks(),
    // Selling overseas.
    overseasSales: zeroes(),
    deliveryLagMonths: 2,
    overseasCollection: [0, 0.5, 0.5, 0, 0], // from the DELIVERY month, not the invoice
    zeroRated: true,
    salesFxAllowancePct: 0.1,
    overseasMarkup: null // null follows the local mark-up, which is the ruled default
  },
  /**
   * Stock already paid for at the opening date, and not yet arrived (Fix 2, drawing
   * approved and its five questions ruled by Mike 2026-09-05).
   *
   * 🔴 DELIBERATELY NOT INSIDE `overseas`, AND THE REASON IS A RULING. That block is
   * governed by a tick meaning "this business buys or sells overseas THIS YEAR"; a business
   * winding its importing down would leave it unticked and this money — already spent —
   * would be invisible behind a decision about next year. It sits on step 2 with the
   * opening position instead, and nothing here is gated by that tick.
   *
   * ALL ZERO BY DEFAULT, which is what makes the addition provable: with `landing` empty
   * the deposits simply sit as an asset exactly as they do today.
   */
  stockInTransit: {
    // What is still owed to the supplier, payable when the goods land. NOT an opening
    // liability: goods not yet received are a commitment, not a debt, so this never
    // touches the opening balance sheet — it is cash leaving in the landing month.
    balanceOwing: 0,
    // How much of the opening deposit lands in each of the twelve months. Amounts, not
    // percentages — which is why a shortfall WARNS rather than blocks (Mike, 2026-09-05):
    // a container landing after the forecast year ends is a true fact about an importer on
    // a nine-month lead, and whatever is not landed simply stays a deposit at the year end.
    landing: zeroes()
  },
  // [same month, +1, +2, +3, +4] — the workbook validates these to 100%.
  debtorCollection: [0.1, 0.55, 0.3, 0.05, 0],
  creditorPayment: [0, 0.9, 0.1, 0, 0],
  gstRate: 0.15,
  gstPeriod: 'Two Monthly', // 'One Monthly' | 'Two Monthly' | 'Six Monthly'
  gstBasis: 'Invoice', // 'Invoice' | 'Cash'
  shareholderInterestRate: 0.05,
  shareholders: [
    { name: 'Bob', opening: 25000, advances: zeroes(), drawings: zeroes() },
    { name: 'Mary', opening: -32000, advances: zeroes(), drawings: zeroes() },
    { name: 'John', opening: 18000, advances: zeroes(), drawings: zeroes() },
    { name: 'Joan', opening: -25000, advances: zeroes(), drawings: zeroes() }
  ]
}

/* ------------------------------------------------------------------- the inputs -- */

/**
 * Merge supplied inputs over the workbook's sample figures.
 * @param {object} raw @returns {object}
 */
function resolveInputs (raw, fallback) {
  const i = (raw && typeof raw === 'object') ? raw : {}
  const d = (fallback && typeof fallback === 'object') ? fallback : DEFAULTS
  const ob = (i.openingBalanceSheet && typeof i.openingBalanceSheet === 'object') ? i.openingBalanceSheet : {}
  const dr = (i.directCostRates && typeof i.directCostRates === 'object') ? i.directCostRates : {}
  const ov = (i.overheads && typeof i.overheads === 'object') ? i.overheads : {}

  const overheads = {}
  for (let k = 0; k < OVERHEAD_KEYS.length; k++) {
    const key = OVERHEAD_KEYS[k]
    overheads[key] = pick(ov[key], d.overheads[key])
  }

  const openingBalanceSheet = {}
  const obKeys = Object.keys(d.openingBalanceSheet)
  for (let k = 0; k < obKeys.length; k++) {
    openingBalanceSheet[obKeys[k]] = pick(ob[obKeys[k]], d.openingBalanceSheet[obKeys[k]])
  }

  const assets = d.assets.map(function (def, n) {
    const a = (Array.isArray(i.assets) && i.assets[n] && typeof i.assets[n] === 'object') ? i.assets[n] : {}
    const disposals = pickSeries(a.disposals, def.disposals)
    return {
      key: def.key,
      opening: pick(a.opening, def.opening),
      depreciationRate: pick(a.depreciationRate, def.depreciationRate),
      additions: pickSeries(a.additions, def.additions),
      // What comes OFF the asset register — the book value of whatever was sold.
      disposals,
      // R10: what it SOLD FOR. The fallback is the resolved disposals rather than a
      // default series, so omitting it means "it sold for exactly its book value" —
      // which is the only case the workbook could express, and therefore the only
      // reading that leaves an existing forecast unchanged.
      proceeds: pickSeries(a.proceeds, disposals)
    }
  })

  /**
   * The funding lines — term loans and revolving facilities, in the caller's own order.
   *
   * 🔴 THE COUNT IS THE CALLER'S, NOT THE WORKBOOK'S (Mike's ruling, 2026-09-05). Until
   * then this mapped over the three DEFAULT loans, which had two consequences: a client
   * with six loans had three of them folded together before the engine ever saw them, and
   * a caller sending FEWER than three silently inherited the sample's own "XYZ Bank"
   * 1,000,000 in the slots it did not fill. Sending nothing still gets exactly the
   * workbook's three, which is what leaves the golden set untouched.
   *
   * A blank line beyond the defaults falls back to zeroes rather than to a sample figure —
   * an unfilled row must never introduce money.
   */
  const blankLoan = { name: '', type: 'term', opening: 0, monthlyRepayment: 0, interestRate: 0, drawdowns: zeroes(), lumpSumRepayments: zeroes() }
  const suppliedLoans = Array.isArray(i.loans) ? i.loans.slice(0, MAX_FUNDING_LINES) : null
  const loanCount = suppliedLoans ? suppliedLoans.length : d.loans.length
  const loans = []
  for (let n = 0; n < loanCount; n++) {
    const def = d.loans[n] || blankLoan
    const l = (suppliedLoans && suppliedLoans[n] && typeof suppliedLoans[n] === 'object') ? suppliedLoans[n] : {}
    loans.push({
      name: typeof l.name === 'string' && l.name ? l.name : def.name,
      // 'facility' has to be asked for by name. Anything else — absent, misspelt, a number
      // — is a term loan, which is what every forecast built before 2026-09-05 is.
      type: l.type === 'facility' ? 'facility' : (l.type === undefined && def.type === 'facility' ? 'facility' : 'term'),
      opening: pick(l.opening, def.opening),
      monthlyRepayment: pick(l.monthlyRepayment, def.monthlyRepayment),
      interestRate: pick(l.interestRate, def.interestRate),
      drawdowns: pickSeries(l.drawdowns, def.drawdowns),
      lumpSumRepayments: pickSeries(l.lumpSumRepayments, def.lumpSumRepayments)
    })
  }

  const shareholders = d.shareholders.map(function (def, n) {
    const s = (Array.isArray(i.shareholders) && i.shareholders[n] && typeof i.shareholders[n] === 'object') ? i.shareholders[n] : {}
    return {
      name: typeof s.name === 'string' && s.name ? s.name : def.name,
      opening: pick(s.opening, def.opening),
      advances: pickSeries(s.advances, def.advances),
      drawings: pickSeries(s.drawings, def.drawings)
    }
  })

  const bucket = function (supplied, def) {
    const out = []
    for (let n = 0; n < 5; n++) { out.push(pick(Array.isArray(supplied) ? supplied[n] : undefined, def[n])) }
    return out
  }

  /**
   * Buying and selling overseas (4.64). Every field falls back to the default block, so
   * a caller that says nothing gets zeroed series and the engine's behaviour is
   * unchanged — the property the golden guard exists to hold.
   * @param {*} v @param {object} def @returns {object}
   */
  const overseas = (function (v, def) {
    const o = (v && typeof v === 'object') ? v : {}
    const sd = (o.sellDown && typeof o.sellDown === 'object') ? o.sellDown : {}
    const pattern = typeof sd.pattern === 'string' && sd.pattern ? sd.pattern : def.sellDown.pattern
    // An explicit curve wins over the named pattern; an unknown name falls back to the
    // default pattern's curve rather than to nothing, so a typo cannot silently stop
    // imported stock ever being sold.
    const curve = Array.isArray(sd.curve) && sd.curve.length
      ? sd.curve.map(function (n) { return pick(n, 0) })
      : (curveOfPattern(pattern) || curveOfPattern(def.sellDown.pattern))
    const enabled = o.enabled === true
    // 🔴 THE TICK IS LOAD-BEARING HERE, NOT ONLY ON THE SCREEN. With it off the two series
    // are dropped whatever was entered, so an advisor who fills the section in and then
    // unticks it gets today's forecast back rather than a half-applied one — and no later
    // caller can send figures with the tick off and be surprised by them landing.
    const seriesIf = (v, d) => (enabled ? pickSeries(v, d) : zeroes())
    return {
      enabled,
      importedPurchases: seriesIf(o.importedPurchases, def.importedPurchases),
      // The shipment calculator's resolved landings, each with its own deposit and balance
      // month (item 4.64 slice 2). Absent for every forecast that types its twelve landing
      // figures by hand, which is all of them today — `landingsOf` then builds the list
      // from the uniform terms below and the arithmetic is unchanged to the cent.
      //
      // 🔴 THE TICK GOVERNS THESE TOO. Dropping them with it off is what stops an advisor
      // who fills in shipments and then unticks the section keeping half a forecast, and it
      // is the same reason the two series above are dropped. Without this line the golden
      // guard would still pass — nothing sends landings today — and the trap would sit
      // there until the screen was built.
      landings: enabled && Array.isArray(o.landings) ? o.landings : [],
      depositPct: pick(o.depositPct, def.depositPct),
      depositLeadMonths: Math.round(pick(o.depositLeadMonths, def.depositLeadMonths)),
      balancePayment: bucket(o.balancePayment, def.balancePayment),
      freightPct: pick(o.freightPct, def.freightPct),
      dutyPct: pick(o.dutyPct, def.dutyPct),
      fxAllowancePct: pick(o.fxAllowancePct, def.fxAllowancePct),
      sellDown: {
        newMarkup: pick(sd.newMarkup, def.sellDown.newMarkup),
        standardMarkup: pick(sd.standardMarkup, def.sellDown.standardMarkup),
        runoutMarkup: pick(sd.runoutMarkup, def.sellDown.runoutMarkup),
        newUpToDays: pick(sd.newUpToDays, def.sellDown.newUpToDays),
        standardUpToDays: pick(sd.standardUpToDays, def.sellDown.standardUpToDays),
        runoutUpToDays: pick(sd.runoutUpToDays, def.sellDown.runoutUpToDays),
        pattern,
        curve
      },
      readyAfterMonths: Math.round(pick(o.readyAfterMonths, def.readyAfterMonths)),
      // 🔴 THE TICK GOVERNS THIS TOO, for the same reason it governs the two series above:
      // an advisor who fills the section in, overrides a month and then unticks it must get
      // today's forecast back, not a forecast carrying one typed revenue figure.
      importedRevenueOverride: enabled ? pickOverrideSeries(o.importedRevenueOverride) : blanks(),
      overseasSales: seriesIf(o.overseasSales, def.overseasSales),
      deliveryLagMonths: Math.round(pick(o.deliveryLagMonths, def.deliveryLagMonths)),
      overseasCollection: bucket(o.overseasCollection, def.overseasCollection),
      zeroRated: o.zeroRated !== false,
      salesFxAllowancePct: pick(o.salesFxAllowancePct, def.salesFxAllowancePct),
      // Mike's ruling: the overseas mark-up starts equal to the local one, so a forecast
      // that never touches it produces today's figures.
      overseasMarkup: usable(o.overseasMarkup) ? Number(o.overseasMarkup) : null
    }
  })(i.overseas, d.overseas)

  /**
   * Stock already paid for and not yet arrived. The landing months are clamped to the
   * opening deposit: an advisor who types more than was paid cannot release stock the
   * business never bought, and the surplus is dropped rather than invented.
   * @param {*} v @param {object} def @param {number} deposits @returns {object}
   */
  const stockInTransit = (function (v, def, deposits) {
    const t = (v && typeof v === 'object') ? v : {}
    const landing = pickSeries(t.landing, def.landing)
    let running = 0
    for (let m = 0; m < MONTHS; m++) {
      const room = deposits - running
      const want = landing[m] > 0 ? landing[m] : 0
      landing[m] = want > room ? (room > 0 ? room : 0) : want
      running += landing[m]
    }
    return { balanceOwing: pick(t.balanceOwing, def.balanceOwing), landing }
  })(i.stockInTransit, d.stockInTransit, openingBalanceSheet.stockInTransitDeposits)

  return {
    startDateSerial: pick(i.startDateSerial, d.startDateSerial),
    overseas,
    stockInTransit,
    sales: pickSeries(i.sales, d.sales),
    purchases: pickSeries(i.purchases, d.purchases),
    markup: pick(i.markup, d.markup),
    directCostRates: {
      freight: pick(dr.freight, d.directCostRates.freight),
      otherDirectExempt: pick(dr.otherDirectExempt, d.directCostRates.otherDirectExempt),
      otherTwo: pick(dr.otherTwo, d.directCostRates.otherTwo),
      commissions: pick(dr.commissions, d.directCostRates.commissions)
    },
    overheads,
    otherIncomeGstInclusive: pick(i.otherIncomeGstInclusive, d.otherIncomeGstInclusive),
    otherIncomeGstExempt: pick(i.otherIncomeGstExempt, d.otherIncomeGstExempt),
    taxRate: pick(i.taxRate, d.taxRate),
    lossesAvailable: pick(i.lossesAvailable, d.lossesAvailable),
    taxPayments: pickSeries(i.taxPayments, d.taxPayments),
    taxRefunds: pickSeries(i.taxRefunds, d.taxRefunds),
    accLeviesPaid: pickSeries(i.accLeviesPaid, d.accLeviesPaid),
    insurancePaid: pickSeries(i.insurancePaid, d.insurancePaid),
    openingBalanceSheet,
    assets,
    loans,
    shareholders,
    overdraftInterestRate: pick(i.overdraftInterestRate, d.overdraftInterestRate),
    inFundsInterestRate: pick(i.inFundsInterestRate, d.inFundsInterestRate),
    debtorCollection: bucket(i.debtorCollection, d.debtorCollection),
    creditorPayment: bucket(i.creditorPayment, d.creditorPayment),
    gstRate: pick(i.gstRate, d.gstRate),
    gstPeriod: i.gstPeriod === 'One Monthly' || i.gstPeriod === 'Six Monthly' ? i.gstPeriod : (i.gstPeriod === 'Two Monthly' ? 'Two Monthly' : d.gstPeriod),
    gstBasis: i.gstBasis === 'Cash' ? 'Cash' : (i.gstBasis === 'Invoice' ? 'Invoice' : d.gstBasis),
    shareholderInterestRate: pick(i.shareholderInterestRate, d.shareholderInterestRate)
  }
}

/* ------------------------------------------------------------- the month headers -- */

/*
 * Excel's 1900 date system, with its deliberate leap-year bug: serial 1 is 1900-01-01
 * and serial 60 is the non-existent 1900-02-29. Every forecast date is far beyond that,
 * so this constant epoch is exact for our range.
 */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86400000

/** @param {number} serial @returns {Date} */
function dateOfSerial (serial) { return new Date(EXCEL_EPOCH_MS + serial * MS_PER_DAY) }
/** @param {Date} date @returns {number} */
function serialOfDate (date) { return Math.round((date.getTime() - EXCEL_EPOCH_MS) / MS_PER_DAY) }

/**
 * Advance a date by whole calendar months, keeping the day of the month where the
 * target month has one — 31 January plus a month is the 28th or 29th of February, not
 * the 2nd or 3rd of March.
 * @param {Date} from @param {number} months @returns {Date}
 */
function addCalendarMonths (from, months) {
  const y = from.getUTCFullYear()
  const m = from.getUTCMonth() + months
  const day = from.getUTCDate()
  const lastDayOfTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(day, lastDayOfTarget)))
}

/**
 * The twelve month-start dates, and the calendar month each falls in.
 *
 * 🔴 R9 — MONTHS ADVANCE BY THE CALENDAR. Ruled by Mike, 2026-09-02: "obviously, it
 * needs to be per calendar month."
 *
 * The workbook adds **31 DAYS** at a time (`Data Input` C105 = C104+31), which drifts.
 * Over one year that is a curiosity — a forecast opening 1 April ends its final month on
 * 8 March. Over the three years the model now covers it reaches **three weeks**: the last
 * month began 22 March 2027 instead of 1 March. Worse, these dates decide which months a
 * GST return falls due, so a forecast starting late in a month could skip a calendar
 * month entirely — 30 January stepped to 2 March, and February never happened — and
 * misfile the whole schedule.
 *
 * The 31-day stepping is kept for `sourceFidelity` alone, because the golden test proves
 * the port against a workbook that steps that way and those dates move real figures.
 *
 * @param {number} startSerial Excel date serial of the first month
 * @param {boolean} byCalendar advance a calendar month at a time (R9) rather than 31 days
 * @returns {{serials: Array<number>, calendarMonths: Array<number>, isoDates: Array<string>, skipsACalendarMonth: boolean, nextYearStartSerial: number}}
 */
function monthHeaders (startSerial, byCalendar) {
  const first = dateOfSerial(startSerial)
  const serials = []
  for (let m = 0; m < MONTHS; m++) {
    serials.push(byCalendar ? serialOfDate(addCalendarMonths(first, m)) : startSerial + 31 * m)
  }
  const calendarMonths = []
  const isoDates = []
  for (let m = 0; m < MONTHS; m++) {
    const d = dateOfSerial(serials[m])
    calendarMonths.push(d.getUTCMonth() + 1)
    isoDates.push(d.toISOString().slice(0, 10))
  }
  // True only under the workbook's own stepping. With R9 applied it can never be true,
  // and the flag stays so a source-fidelity run can still report the fault it describes.
  let skips = false
  for (let m = 1; m < MONTHS; m++) {
    const step = ((calendarMonths[m] - calendarMonths[m - 1]) + 12) % 12
    if (step !== 1) { skips = true }
  }
  return {
    serials,
    calendarMonths,
    isoDates,
    skipsACalendarMonth: skips,
    // Where the NEXT year begins, by whichever rule this year used — so the chain never
    // has to re-derive it and the two can never disagree.
    nextYearStartSerial: byCalendar
      ? serialOfDate(addCalendarMonths(first, MONTHS))
      : serials[MONTHS - 1] + 31
  }
}

/* ------------------------------------------------------------------ the schedules -- */

/**
 * One fixed-asset category's twelve-month schedule (sheet rows 302-307 and its siblings).
 * @param {object} asset @returns {object}
 */
function assetSchedule (asset) {
  const bookValue = zeroes()
  const subtotal = zeroes()
  const depreciation = zeroes()
  const closingValue = zeroes()
  for (let m = 0; m < MONTHS; m++) {
    bookValue[m] = m === 0 ? asset.opening : closingValue[m - 1]
    subtotal[m] = bookValue[m] + asset.additions[m] - asset.disposals[m]
    depreciation[m] = excelRound((subtotal[m] * asset.depreciationRate) / 12)
    closingValue[m] = subtotal[m] - depreciation[m]
  }
  return {
    key: asset.key,
    depreciationRate: asset.depreciationRate,
    bookValue,
    additions: asset.additions.slice(),
    // The book value leaving the register, and (R10) what it sold for. The register
    // itself moves on the book value alone — the price never touches depreciation.
    disposals: asset.disposals.slice(),
    proceeds: asset.proceeds.slice(),
    subtotal,
    depreciation,
    closingValue
  }
}

/**
 * One funding line's twelve-month schedule (sheet rows 263-269 and its siblings).
 *
 * A TERM LOAN follows the source's own convention, ported exactly: a monthly repayment
 * covers the interest first and the remainder reduces capital; when the balance is smaller
 * than the repayment the whole balance is repaid. Interest is charged on the OPENING
 * balance.
 *
 * A FACILITY — revolving trade finance, a stock facility, invoice finance — is the same
 * loop WITH THE AMORTISATION LINE REMOVED (Mike's ruling, 2026-09-05). It carries its
 * balance and charges interest on it; it does not pay itself down on a schedule, so
 * `capitalRepaid` is zero and the balance moves only on the drawdowns and repayments the
 * advisor types.
 *
 * 🔴 WHY THIS EXISTS RATHER THAN "A LOAN WITH A ZERO REPAYMENT", which is the obvious
 * workaround and is worse. Capital repaid is worked out as `repayment − interest`, so a zero
 * repayment makes it NEGATIVE: the debt grows by its own interest while the interest is also
 * paid in cash, and the balance sheet still ties, so nothing complains. On the real client
 * that prompted this — 2,450,000 at 8% — twelve months took the balance to 2,653,348 and
 * charged the year's interest twice.
 *
 * @param {object} loan @returns {object}
 */
function loanSchedule (loan) {
  const isFacility = loan.type === 'facility'
  const openingBalance = zeroes()
  const capitalRepaid = zeroes()
  const interest = zeroes()
  const closingBalance = zeroes()
  for (let m = 0; m < MONTHS; m++) {
    openingBalance[m] = m === 0 ? loan.opening : closingBalance[m - 1]
    interest[m] = excelRound(openingBalance[m] * loan.interestRate / 12)
    capitalRepaid[m] = isFacility
      ? 0
      : (openingBalance[m] > loan.monthlyRepayment
          ? loan.monthlyRepayment - interest[m]
          : openingBalance[m])
    closingBalance[m] = openingBalance[m] + loan.drawdowns[m] - capitalRepaid[m] - loan.lumpSumRepayments[m]
  }
  return {
    name: loan.name,
    type: isFacility ? 'facility' : 'term',
    interestRate: loan.interestRate,
    // A facility has no monthly repayment, and reporting the number the caller happened to
    // send would put a figure on a screen that nothing acts on.
    monthlyRepayment: isFacility ? 0 : loan.monthlyRepayment,
    openingBalance,
    drawdowns: loan.drawdowns.slice(),
    capitalRepaid,
    lumpSumRepayments: loan.lumpSumRepayments.slice(),
    closingBalance,
    interest
  }
}

/**
 * One shareholder current account (sheet rows 363-367 and its siblings).
 *
 * Interest is charged only on an OVERDRAWN (negative) balance, and it both reduces the
 * account and is booked as income to the company — the source's own treatment.
 *
 * @param {object} sh @param {number} rate @returns {object}
 */
function shareholderSchedule (sh, rate) {
  const openingBalance = zeroes()
  const interestOnOverdrawn = zeroes()
  const closingBalance = zeroes()
  for (let m = 0; m < MONTHS; m++) {
    openingBalance[m] = m === 0 ? sh.opening : closingBalance[m - 1]
    interestOnOverdrawn[m] = openingBalance[m] > 0 ? 0 : (-openingBalance[m] * rate) / 12
    closingBalance[m] = openingBalance[m] + sh.advances[m] - sh.drawings[m] - interestOnOverdrawn[m]
  }
  return {
    name: sh.name,
    openingBalance,
    advances: sh.advances.slice(),
    drawings: sh.drawings.slice(),
    interestOnOverdrawn,
    closingBalance
  }
}

/**
 * A five-bucket lag schedule — used for both debtor collection and creditor payment.
 * Each month's gross amount is settled across the current month and the four following
 * it, every slice rounded to whole currency as the sheet does.
 *
 * @param {Array<number>} gross the GST-inclusive amount arising each month
 * @param {Array<number>} buckets [same month, +1, +2, +3, +4]
 * @returns {{slices: Array<Array<number>>, total: Array<number>}}
 */
function lagSchedule (gross, buckets) {
  const slices = []
  for (let lag = 0; lag <= 4; lag++) {
    const row = zeroes()
    for (let m = 0; m < MONTHS; m++) {
      row[m] = (m - lag >= 0) ? excelRound(buckets[lag] * gross[m - lag]) : 0
    }
    slices.push(row)
  }
  return { slices, total: addSeries.apply(null, slices) }
}

/**
 * Buying and selling overseas — every series the split produces, in one place (4.64).
 *
 * The shape of the thing: a container is recorded in the month it LANDS, because that
 * is when it becomes stock and when GST falls due at the border. Everything else is
 * dated from there — the deposit backwards, the balance forwards, freight and duty on
 * the day, and the selling across four 30-day bands at three descending prices.
 *
 * 🔴 THE ONE PROPERTY EVERYTHING ELSE DEPENDS ON: with both series empty, every array
 * this returns is zeroes, so no caller can move a figure. That is what lets the split
 * sit inside a workbook port proved cell by cell.
 *
 * @param {object} O the resolved `overseas` block
 * @param {number} gst the GST rate
 * @param {object} T the resolved `stockInTransit` block — stock already paid for at the
 *   opening date. Handled HERE rather than in its own function because it moves the same
 *   two positions this already rolls forward, and two functions writing one balance-sheet
 *   line is how a prepayment and its release start disagreeing.
 * @param {number} openingDeposits the opening deposit balance those landings release from
 * @returns {object} the monthly series, plus what fell outside the twelve months
 */
function overseasSchedule (O, gst, T, openingDeposits) {
  const out = {
    deposits: zeroes(),
    freight: zeroes(),
    duty: zeroes(),
    borderGst: zeroes(),
    supplierBalance: zeroes(),
    fxOnPurchases: zeroes(),
    importedRevenue: zeroes(),
    importedCostOfSales: zeroes(),
    overseasRevenue: zeroes(),
    overseasGst: zeroes(),
    overseasCollections: zeroes(),
    fxOnSales: zeroes(),
    // 🔴 THE TWO BALANCE-SHEET POSITIONS THE CASH ROWS IMPLY, and without which the three
    // statements stop articulating. A deposit paid before the goods land is money owed TO
    // the business by its supplier — a prepayment, an asset — until the container
    // arrives; a container that has landed and not been paid for in full is a liability.
    // Neither is optional: cash leaves in one month and stock arrives in another, and
    // something has to hold the difference in between.
    prepaymentClosing: zeroes(),
    balanceOwingClosing: zeroes(),
    // What the supplier charges for waiting to be paid, in the month the balance is settled.
    // Inside `supplierBalance` for cash; charged to overheads in the P&L. Item 4.64 slice 2,
    // Mike's instruction of 2026-09-04.
    supplierInterest: zeroes(),
    // ── Stock already paid for at the opening date (Fix 2, 2026-09-05) ──────────────
    // The landed cost joining inventory, the balance settled with the supplier, and the
    // GST Customs charges on arrival. All zeroes unless the opening balance sheet carried
    // a deposit AND the advisor said which months the containers land.
    transitLanded: zeroes(),
    transitBalancePaid: zeroes(),
    transitBorderGst: zeroes(),
    // What the twelve months cannot show, reported rather than dropped.
    depositsBeforeStart: [],
    revenueBeyondYear: 0
  }
  const fx = 1 + O.fxAllowancePct
  const curve = O.sellDown.curve || []
  const landings = landingsOf(O)
  // Movements, gathered first and rolled forward once at the end.
  const prepaidIn = zeroes(); const prepaidReleased = zeroes()
  const owingAdded = zeroes(); const owingPaid = zeroes()

  for (let i = 0; i < landings.length; i++) {
    const L = landings[i]
    const m = L.landsInMonth
    const landed = L.value

    // The deposit, paid AHEAD of the landing. A lead that reaches back past the start of
    // the forecast is not counted — that cash went before this year began. Mike's ruling
    // of 2026-09-04: warn, and leave it out.
    const deposit = landed * L.depositPct * fx
    if (L.depositMonth >= 0) {
      out.deposits[L.depositMonth] += deposit
      // It is a prepayment from the day it is paid until the day the container lands.
      prepaidIn[L.depositMonth] += deposit
      prepaidReleased[m] += deposit
    } else {
      // Paid before this forecast began, so it is already in the opening position and is
      // not counted again (Mike's ruling, 2026-09-04). Reported so the advisor can see it.
      out.depositsBeforeStart.push({
        landsInMonth: m, monthsBefore: m - L.depositMonth, amount: deposit
      })
    }

    // The balance, on its own schedule. It is owed from the moment the goods land,
    // whenever it is actually settled.
    //
    // ⚠ INTEREST COVER RIDES OUT WITH IT AS CASH, BUT IT IS NOT PART OF THE LIABILITY.
    // His sheet pays balance + interest + currency as ONE payment, and the forecast already
    // folds the exchange allowance into this line the same way — so the cash row carries it.
    // What is owed for the STOCK is the balance alone, and the interest is expensed in the
    // month it is settled, never accrued before it.
    //
    // 🔴 THE FIRST ATTEMPT PUT THE INTEREST INTO `owingAdded` TOO, AND THE BALANCE-SHEET
    // TEST CAUGHT IT — every month out by exactly the interest. Recognising a liability at
    // the landing and the expense at the payment leaves the two in different months, and on
    // these very terms the balance is settled BEFORE the goods land (91 days against 145),
    // so it was not even a short window. Cash down by balance + interest, liability down by
    // the balance, equity down by the interest: that articulates, and nothing else does.
    //
    // 🔴 IT IS EXPENSED IN OVERHEADS, NOT IN DIRECT COSTS — Mike's ruling of 2026-09-04.
    // Interest cover is what a supplier charges for waiting to be paid, not a cost of
    // getting goods here, and putting it above the gross margin would understate the margin
    // on every container. `supplierInterest` is what the P&L charges.
    const balance = landed * (1 - L.depositPct) * fx
    owingAdded[m] += balance
    for (let j = 0; j < L.balance.length; j++) {
      const t = L.balance[j].month
      if (t >= 0 && t < MONTHS) {
        const share = L.balance[j].share
        out.supplierBalance[t] += (balance + L.interest) * share
        out.supplierInterest[t] += L.interest * share
        owingPaid[t] += balance * share
      }
    }

    // Getting it here, and clearing customs. All three fall in the landing month.
    const freight = landed * O.freightPct
    const duty = landed * O.dutyPct
    out.freight[m] += freight
    out.duty[m] += duty
    out.fxOnPurchases[m] += landed * O.fxAllowancePct
    // GST at the border is charged on the LANDED value — the exchange-adjusted stock
    // cost plus freight and duty — not on the supplier's invoice alone.
    out.borderGst[m] += (landed * fx + freight + duty) * gst

    // How it sells down: band by band, at whichever price that band's stock-turn day
    // count still commands. Mike's ruling of 2026-09-04 — revenue is worked out, never
    // all priced at the launch figure.
    for (let b = 0; b < curve.length; b++) {
      const days = (b + 1) * 30
      const markup = days <= O.sellDown.newUpToDays
        ? O.sellDown.newMarkup
        : (days <= O.sellDown.standardUpToDays ? O.sellDown.standardMarkup : O.sellDown.runoutMarkup)
      const t = m + O.readyAfterMonths + b
      // Real unit costs govern imported stock (his ruling): the cost of sales is what
      // this slice of stock actually cost, never revenue worked backwards through a
      // mark-up.
      const cost = landed * curve[b]
      const revenue = cost * (1 + markup)
      if (t < MONTHS) {
        out.importedRevenue[t] += revenue
        out.importedCostOfSales[t] += cost
      } else {
        out.revenueBeyondYear += revenue
      }
    }
  }

  // The advisor's own figure for a month wins over the worked-out one — Mike's ruling of
  // 2026-09-04 that the revenue is seeded "where the advisor can override it", chosen over a
  // locked figure precisely so a signed order at a known price has somewhere to go.
  //
  // A BLANK MEANS "USE THE WORKED-OUT FIGURE", so clearing the box restores it and there is
  // no separate undo control to find or to name.
  //
  // 🔴 COST OF SALES DOES NOT FOLLOW IT. Imported stock is governed by its real unit cost
  // (his ruling of the same day), so an override moves revenue and the gross margin and
  // never the cost. Moving the cost with it would be revenue run backwards through a
  // mark-up, which is the arithmetic that ruling exists to forbid.
  //
  // `revenueBeyondYear` is deliberately untouched: it is what falls OUTSIDE these twelve
  // months, and there is no box on the screen for a month that is not on the screen.
  for (let m = 0; m < MONTHS; m++) {
    const typed = O.importedRevenueOverride[m]
    if (typed !== null && typed !== undefined) { out.importedRevenue[m] = typed }
  }

  // Selling overseas. The clock starts at DELIVERY, not at the invoice.
  const banked = 1 - O.salesFxAllowancePct
  for (let m = 0; m < MONTHS; m++) {
    const sale = O.overseasSales[m]
    if (!sale) { continue }
    out.overseasRevenue[m] += sale
    // Zero-rated by default; the tick charges GST at the domestic rate instead.
    const g = O.zeroRated ? 0 : excelRound(gst * sale)
    out.overseasGst[m] += g
    const gross = sale + g
    const delivered = m + O.deliveryLagMonths
    for (let lag = 0; lag < 5; lag++) {
      const t = delivered + lag
      if (t < MONTHS) {
        const due = gross * O.overseasCollection[lag]
        out.overseasCollections[t] += due * banked
        // What the exchange rate takes on the way in. It joins the same direct-cost line
        // as the purchase side, and it comes off the debtor too — otherwise the balance
        // sheet would carry a receivable that is never going to arrive.
        out.fxOnSales[t] += due * O.salesFxAllowancePct
      }
    }
  }

  /* -- stock already paid for at the opening date (Fix 2) --------------------------- */
  // The deposit is ALREADY an asset when the forecast opens — that cash left before this
  // year began and the forecast has never counted it. What a landing month does is stop it
  // being a deposit and make it stock.
  for (let m = 0; m < MONTHS; m++) {
    const released = T.landing[m]
    if (!released) { continue }
    // The balance still owing follows the goods PRO RATA: half the deposit landing means
    // half the balance falls due. Mike's ruling of 2026-09-05, and the load-bearing one —
    // without it the stock lands carrying only its deposit, no cash ever leaves to pay the
    // rest, and the cost of sales is too low when it sells. A profit overstated by figures
    // that all look perfectly reasonable on screen.
    const share = openingDeposits > 0 ? released / openingDeposits : 0
    const balance = T.balanceOwing * share
    prepaidReleased[m] += released
    out.transitBalancePaid[m] += balance
    // What joins inventory: everything paid for the goods, deposit and balance together.
    out.transitLanded[m] += released + balance
    // 🔴 GST IS TRIGGERED BY THE GOODS ARRIVING, NOT BY PAYING FOR THEM. A container whose
    // deposit was paid in a previous financial year still attracts the full border GST in
    // the month it lands. Charged here, and claimed back on the next return through the
    // same machinery as everything else — so it shows as the timing cost it is.
    //
    // ⚠ CHARGED ON THE GOODS ALONE. The statutory base is the Customs value PLUS duty,
    // freight and insurance; the approved drawing carries no field for any of them, freight
    // on goods already on the water is commonly prepaid, and duty varies by product. Mike
    // ruled on the goods alone (2026-09-05) with the research in front of him, and the
    // intake screen says so in terms rather than letting the figure read as a complete
    // Customs assessment. Rules and sources: design/TAX-RULES-IMPORT-GST.md.
    out.transitBorderGst[m] += (released + balance) * gst
  }

  // Roll the two positions forward. The exchange allowance sits inside the prepayment
  // while it is one, and is expensed in the landing month along with the rest of it —
  // which is why the release is the full amount paid, not the stock cost alone.
  //
  // 🔴 MONTH ZERO OPENS AT THE DEPOSITS ALREADY PAID, not at zero. That `0` was the whole
  // of the engine gap Fix 2 closes: the position only ever handled shipments the forecast
  // created itself, so a real client's 825,628.98 of stock on the water sat in a catch-all
  // and never became stock at all.
  for (let m = 0; m < MONTHS; m++) {
    const prevPrepaid = m === 0 ? openingDeposits : out.prepaymentClosing[m - 1]
    out.prepaymentClosing[m] = prevPrepaid + prepaidIn[m] - prepaidReleased[m]
    const prevOwing = m === 0 ? 0 : out.balanceOwingClosing[m - 1]
    out.balanceOwingClosing[m] = prevOwing + owingAdded[m] - owingPaid[m]
  }

  return out
}

/**
 * The run-off of an OPENING receivable or payable balance across the first four months,
 * split in proportion to the lag buckets that follow the current month.
 *
 * @param {number} openingBalance @param {Array<number>} buckets @returns {Array<number>}
 */
function openingRunOff (openingBalance, buckets) {
  const out = zeroes()
  const tail = buckets[1] + buckets[2] + buckets[3] + buckets[4]
  if (buckets[0] === 1 || tail === 0) { return out }
  for (let m = 0; m < 4; m++) { out[m] = (buckets[m + 1] / tail) * openingBalance }
  return out
}

/* ------------------------------------------------------------------- the compute -- */

/**
 * Compute Year 1 of the three-way forecast.
 *
 * @param {object} rawInputs partial inputs; anything absent falls back to the source
 *   workbook's own sample figures (`DEFAULTS`), so the model always returns a complete
 *   forecast rather than a half-empty one.
 * @param {object} [options] test-only switches. `sourceFidelity: true` reproduces the
 *   workbook INCLUDING its seven defects, and exists solely so the golden test can
 *   prove the port cell for cell. It is a SEPARATE parameter from `rawInputs` so that
 *   no request body can ever reach it, and no route passes it — see
 *   `tests/unit/threeWayForecastModel.test.js`, which fails the build if one does.
 * @returns {object} months, profitAndLoss, balanceSheet, cashFlow, schedules and the
 *   `corrections` register naming each departure from the workbook.
 */
function computeThreeWayForecast (rawInputs, options) {
  const I = resolveInputs(rawInputs)
  const asWritten = !!(options && options.sourceFidelity === true)
  const corrected = !asWritten
  // Which of the three year sheets this is (0-based). It matters ONLY in
  // source-fidelity mode, because the workbook is not consistent between its own
  // years — see the two flags below. In corrected mode every year behaves the same.
  const yearIndex = (options && Number(options.yearIndex)) > 0 ? Number(options.yearIndex) : 0
  // 🔴 THE WORKBOOK'S OWN YEARS 2 AND 3 ALREADY TOTAL ALL SIX ASSET CATEGORIES
  // (`SUM(D99:D104)`); only year 1 stops at four (`SUM(D99:D102)`). So R1 is not our
  // judgement imposed on the model — it is what the author already does in the later
  // sheets, and year 1 is the outlier. It also explains a 91,218 jump in the workbook's
  // own year-2 balance check: year 1 hands over a four-of-six total to a sheet that
  // totals six. Applying R1 removes it. (Found 2026-09-02 scouting years 2 and 3.)
  const totalsAllSixAssets = corrected || yearIndex > 0
  const gst = I.gstRate
  const ob = I.openingBalanceSheet
  // R9: calendar months, except in source-fidelity mode, which must keep the workbook's
  // 31-day stepping because those dates decide when a GST return falls due.
  const headers = monthHeaders(I.startDateSerial, corrected)

  /* -- opening balance sheet (the sheet's column C) -------------------------------- */
  const shOpeningTotal = I.shareholders.reduce(function (a, s) { return a + s.opening }, 0)
  const opening = {
    authorisedCapital: ob.authorisedCapital,
    capitalGain: ob.capitalGain,
    otherEquity: ob.otherEquity,
    retainedEarnings: ob.retainedEarnings,
    cashAtBank: ob.cashAtBank,
    accountsReceivable: ob.accountsReceivable,
    inventory: ob.inventory,
    // The sheet nets the tax refund against the tax payable and shows whichever side wins.
    incomeTaxAsset: Math.max(0, ob.incomeTaxRefundDue - ob.incomeTaxPayable),
    gstRefund: ob.gstRefund,
    prepayments: Math.max(0, ob.prepayments - ob.accruedExpenses),
    stockInTransitDeposits: ob.stockInTransitDeposits,
    shareholderCurrentAssets: shOpeningTotal > 0 ? 0 : -shOpeningTotal,
    otherCurrentAsset: ob.otherCurrentAsset,
    bankOverdraft: ob.bankOverdraft,
    accountsPayable: ob.accountsPayable,
    incomeTaxLiability: Math.max(0, -(ob.incomeTaxRefundDue - ob.incomeTaxPayable)),
    gstPayable: ob.gstPayable,
    accruedExpenses: Math.max(0, -(ob.prepayments - ob.accruedExpenses)),
    shareholderCurrentLiabilities: shOpeningTotal < 0 ? 0 : shOpeningTotal,
    otherCurrentLiability: ob.otherCurrentLiability,
    otherNonCurrentLiability: ob.otherNonCurrentLiability
  }
  // 🔴 A FACILITY IS A CURRENT LIABILITY, a term loan a non-current one. Mike ruled on
  // 2026-09-05 that revolving trade finance belongs in Other current liability, and a
  // funding row must land where the same money lands when the parser cannot name it —
  // otherwise giving a facility its own row would quietly move millions out of working
  // capital, which is the figure the change exists to get right.
  opening.nonCurrentLiabilities = I.loans
    .filter(function (l) { return l.type !== 'facility' })
    .map(function (l) { return { name: l.name, balance: l.opening } })
  opening.facilities = I.loans
    .filter(function (l) { return l.type === 'facility' })
    .map(function (l) { return { name: l.name, balance: l.opening } })
  opening.totalFacilities = opening.facilities.reduce(function (a, f) { return a + f.balance }, 0)

  opening.totalEquity = opening.authorisedCapital + opening.capitalGain + opening.otherEquity +
    opening.retainedEarnings
  opening.totalCurrentAssets = opening.cashAtBank + opening.accountsReceivable + opening.inventory +
    opening.incomeTaxAsset + opening.gstRefund + opening.prepayments +
    // Money already paid for stock still on the water. A named line rather than a lump in
    // Other current asset, so it can be released into inventory when the goods land.
    opening.stockInTransitDeposits +
    opening.shareholderCurrentAssets + opening.otherCurrentAsset
  opening.totalCurrentLiabilities = opening.bankOverdraft + opening.accountsPayable +
    opening.incomeTaxLiability + opening.gstPayable + opening.accruedExpenses +
    opening.totalFacilities +
    opening.shareholderCurrentLiabilities + opening.otherCurrentLiability
  opening.workingCapital = opening.totalCurrentAssets - opening.totalCurrentLiabilities
  opening.nonCurrentAssets = {}
  for (let k = 0; k < ASSET_KEYS.length; k++) { opening.nonCurrentAssets[ASSET_KEYS[k]] = I.assets[k].opening }
  // R1: all six categories, not the four the sheet totals.
  opening.totalNonCurrentAssets = I.assets.reduce(function (a, x, n) {
    return (totalsAllSixAssets || n < 4) ? a + x.opening : a
  }, 0)
  opening.totalNonCurrentLiabilities = opening.nonCurrentLiabilities
    .reduce(function (a, l) { return a + l.balance }, 0) + opening.otherNonCurrentLiability
  opening.netAssets = opening.workingCapital - opening.totalNonCurrentLiabilities + opening.totalNonCurrentAssets
  opening.balanceCheck = excelRound(opening.totalEquity - opening.netAssets)

  /* -- schedules that do not depend on the month loop ------------------------------ */
  const assets = I.assets.map(assetSchedule)
  const loans = I.loans.map(loanSchedule)
  const shareholders = I.shareholders.map(function (s) { return shareholderSchedule(s, I.shareholderInterestRate) })

  const depreciationAll = addSeries.apply(null, assets.map(function (a) { return a.depreciation }))
  // R2: the P&L charges every schedule, not the first three.
  const depreciationCharged = corrected
    ? depreciationAll
    : addSeries(assets[0].depreciation, assets[1].depreciation, assets[2].depreciation)
  // 🔴 A FACILITY'S INTEREST IS ITS OWN FIGURE, never merged into the term-loan line —
  // Mike's ruling of 2026-09-05. What it costs to carry stock and debtors is a different
  // question from what it costs to own the trucks, and merged, neither is answerable.
  //
  // ⚠ ENGINE-ONLY FOR NOW, and this says so rather than leaving it to be found. The report's
  // profit tab carries four rows and shows no interest at all — overdraft and term-loan
  // interest are already swallowed inside total overheads — so there is nowhere for a third
  // interest line to appear. Expanding that tab is a design change with its own drawing, and
  // the ruling was amended the same day rather than let that happen inside a build. Both
  // series below still reach the P&L and the cash flow through `totalOverheads` and
  // `interestPaid`; only their SEPARATE display is outstanding.
  const termLoanInterest = addSeries.apply(null, loans.map(function (l) {
    return l.type === 'facility' ? zeroes() : l.interest
  }))
  const facilityInterest = addSeries.apply(null, loans.map(function (l) {
    return l.type === 'facility' ? l.interest : zeroes()
  }))
  // What the P&L and the cash flow charge: both, together. With no facility entered the
  // second is zeroes and this is the figure it has always been.
  const loanInterest = addSeries(termLoanInterest, facilityInterest)
  const shareholderInterest = addSeries.apply(null, shareholders.map(function (s) { return s.interestOnOverdrawn }))
  const additionsAll = addSeries.apply(null, assets.map(function (a) { return a.additions }))
  const disposalsAll = addSeries.apply(null, assets.map(function (a) { return a.disposals }))
  const additionsCharged = corrected ? additionsAll : addSeries(assets[0].additions, assets[1].additions, assets[2].additions)
  const disposalsCharged = corrected ? disposalsAll : addSeries(assets[0].disposals, assets[1].disposals, assets[2].disposals)
  // R10: the sale price, which the bank and the GST return both follow. As written the
  // workbook has no such figure — it banks the book value — so source-fidelity mode
  // ignores `proceeds` outright rather than relying on its default. The golden set is
  // then immune to this correction even if a caller supplies a price.
  const proceedsAll = corrected
    ? addSeries.apply(null, assets.map(function (a) { return a.proceeds }))
    : disposalsAll
  const proceedsCharged = corrected
    ? proceedsAll
    : disposalsCharged
  // The gain (or loss) on sale: what it fetched, less what it was carried at. Zero
  // whenever an asset sells for its book value, which is every forecast built before
  // 2026-09-03 and every one where the advisor leaves the price alone.
  const gainOnAssetSales = corrected
    ? proceedsCharged.map(function (p, m) { return p - disposalsCharged[m] })
    : zeroes()

  /* -- buying and selling overseas (4.64) ------------------------------------------ */
  // Every series below is zeroes unless the advisor entered overseas trade, so nothing
  // from here can move a figure in a domestic forecast.
  const OS = overseasSchedule(I.overseas, gst, I.stockInTransit, opening.stockInTransitDeposits)
  const importedPurchases = I.overseas.importedPurchases
  // Imported stock is sold at HOME — Mike's ruling of 2026-09-04 — so its revenue joins
  // the domestic stream for GST and for collection.
  const domesticRevenue = addSeries(I.sales, OS.importedRevenue)
  const overseasGross = addSeries(OS.overseasRevenue, OS.overseasGst)
  // Freight, duty and both exchange movements are direct costs in the month they arise.
  // Expensing them is also what keeps the three statements articulating: the cash goes
  // out, and the same figure goes through the P&L.
  const importedDirectCosts = addSeries(OS.freight, OS.duty, OS.fxOnPurchases, OS.fxOnSales)

  /* -- the P&L lines that depend only on revenue ----------------------------------- */
  const revenue = addSeries(domesticRevenue, OS.overseasRevenue)
  const freight = revenue.map(function (r) { return r * I.directCostRates.freight })
  const otherDirectExempt = revenue.map(function (r) { return r * I.directCostRates.otherDirectExempt })
  const otherDirectTwo = revenue.map(function (r) { return r * I.directCostRates.otherTwo })
  const commissions = revenue.map(function (r) { return r * I.directCostRates.commissions })

  const overhead = {}
  for (let k = 0; k < OVERHEAD_KEYS.length; k++) {
    const key = OVERHEAD_KEYS[k]
    overhead[key] = revenue.map(function () { return I.overheads[key] / 12 })
  }
  const otherIncomeGstInclusive = revenue.map(function () { return I.otherIncomeGstInclusive / 12 })
  const otherIncomeGstExempt = revenue.map(function () { return I.otherIncomeGstExempt / 12 })

  /* -- inventory (rows 250-254) ---------------------------------------------------- */
  const invOpening = zeroes(); const invSubtotal = zeroes()
  const costOfSalesCharge = zeroes(); const invClosing = zeroes()
  const costRatio = 1 / (1 + I.markup)
  // The overseas mark-up starts equal to the local one, so a forecast that never touches
  // it produces today's figures (Mike's ruling, 2026-09-04).
  const overseasCostRatio = 1 / (1 + (I.overseas.overseasMarkup === null ? I.markup : I.overseas.overseasMarkup))
  // 🔴 THE SECOND SEAM OF FIX 2, and the one the drawing's own sizing missed until it was
  // checked against the code. Releasing the prepayment says the money stopped being a
  // deposit; it does not make the stock ARRIVE. Inventory is driven by purchases, so the
  // landed value has to join them in the landing month or the goods vanish between the two
  // balance-sheet lines.
  const allPurchases = addSeries(I.purchases, importedPurchases, OS.transitLanded)
  for (let m = 0; m < MONTHS; m++) {
    invOpening[m] = m === 0 ? ob.inventory : invClosing[m - 1]
    invSubtotal[m] = invOpening[m] + allPurchases[m]
    // Three streams, each costed the way its own figures allow. Local sales work cost
    // back from the mark-up as they always have; IMPORTED STOCK USES ITS REAL COST, his
    // ruling of 2026-09-04, because once revenue is cost times the ladder the cost is
    // already known and recovering it from revenue would be arithmetic run backwards;
    // overseas sales use their own mark-up.
    costOfSalesCharge[m] = excelRound(I.sales[m] * costRatio) +
      OS.importedCostOfSales[m] +
      excelRound(OS.overseasRevenue[m] * overseasCostRatio)
    invClosing[m] = invSubtotal[m] - costOfSalesCharge[m]
  }

  /* -- debtors (rows 157-177) ------------------------------------------------------ */
  // Domestic sales carry GST and collect on the advisor's own profile. Overseas sales
  // are zero-rated unless the tick says otherwise, and collect on THEIR profile, counted
  // from delivery rather than from the invoice.
  const domesticGst = domesticRevenue.map(function (r) { return excelRound(gst * r) })
  const salesGst = addSeries(domesticGst, OS.overseasGst)
  const domesticInclusive = addSeries(domesticRevenue, domesticGst)
  const salesInclusive = addSeries(domesticInclusive, overseasGross)
  const collection = lagSchedule(domesticInclusive, I.debtorCollection)
  const openingDebtorRunOff = openingRunOff(opening.accountsReceivable, I.debtorCollection)
  const domesticCash = addSeries(collection.total, openingDebtorRunOff)
  const cashFromDebtors = addSeries(domesticCash, OS.overseasCollections)
  const debtorOpening = zeroes(); const debtorSubtotal = zeroes(); const debtorClosing = zeroes()
  for (let m = 0; m < MONTHS; m++) {
    debtorOpening[m] = m === 0 ? opening.accountsReceivable : debtorClosing[m - 1]
    debtorSubtotal[m] = debtorOpening[m] + salesInclusive[m]
    // The exchange movement comes off the debtor as well as through the P&L. Without it
    // the balance sheet would carry a receivable that is never going to arrive.
    debtorClosing[m] = debtorSubtotal[m] - cashFromDebtors[m] - OS.fxOnSales[m]
  }

  /* -- expense payment blocks (rows 183-221) --------------------------------------- */
  // Block 1 — GST-inclusive, settled the FOLLOWING month. ACC Levies and Insurance
  // enter through the accrual schedule below, so they appear here as amounts PAID.
  // R6: "Other 5" is not here; it belongs to block 3 and was being paid twice.
  const accrualOpening = zeroes(); const accrualSubtotal = zeroes(); const accrualClosing = zeroes()
  for (let m = 0; m < MONTHS; m++) {
    accrualOpening[m] = m === 0 ? (opening.prepayments - opening.accruedExpenses) : accrualClosing[m - 1]
    accrualSubtotal[m] = accrualOpening[m] - overhead.accLevies[m] - overhead.insurance[m]
    accrualClosing[m] = accrualSubtotal[m] + I.accLeviesPaid[m] + I.insurancePaid[m]
  }

  const blockOneParts = [
    I.accLeviesPaid, overhead.accountancy, overhead.advertising, overhead.computerExpenses,
    freight, overhead.generalExpenses, I.insurancePaid, overhead.occupancy, overhead.power,
    overhead.printing, overhead.repairs, overhead.subscriptions, overhead.telephone,
    overhead.vehicle, overhead.otherOne, overhead.otherTwo, overhead.otherThree,
    overhead.otherFour
  ]
  if (asWritten) {
    // The workbook's row 201: "Other 5" in month 1, then a mis-fill that repeats
    // "Other 4" for months 2-12. Reproduced only to prove the port.
    const strayRow = zeroes()
    // The duplicate itself is in all three years; the MIS-FILL is year 1's alone.
    // Year 1's row reads Other 5 in month 1 and then Other 4 for the rest; years 2 and
    // 3 read Other 5 throughout. Either way the cost is settled twice, which is R6.
    for (let m = 0; m < MONTHS; m++) {
      strayRow[m] = (m === 0 || yearIndex > 0) ? overhead.otherFive[m] : overhead.otherFour[m]
    }
    blockOneParts.push(strayRow)
  }
  const blockOneNet = addSeries.apply(null, blockOneParts)
  const blockOneGst = blockOneNet.map(function (v) { return excelRound(gst * v) })
  const blockOneGross = addSeries(blockOneNet, blockOneGst)

  // Block 2 — GST-inclusive, settled in the CURRENT month (Rent).
  const blockTwoNet = overhead.rent.slice()
  const blockTwoGst = blockTwoNet.map(function (v) { return excelRound(gst * v) })
  const blockTwoGross = addSeries(blockTwoNet, blockTwoGst)

  // Block 3 — GST-free, settled in the CURRENT month.
  // R7: "Other Direct Expenses (GST Exempt)" joins this block. In the workbook it is
  // charged to the P&L and paid by nothing at all.
  const blockThreeParts = [
    overhead.bankCharges, commissions, overhead.otherFive, otherDirectTwo,
    overhead.shareholderSalaries, overhead.wages
  ]
  if (corrected) { blockThreeParts.push(otherDirectExempt) }
  const blockThreeTotal = addSeries.apply(null, blockThreeParts)

  /* -- inventory purchases and creditors (rows 225-245) ---------------------------- */
  const purchaseGst = I.purchases.map(function (p) { return excelRound(gst * p) })
  const purchasesInclusive = addSeries(I.purchases, purchaseGst)
  const payment = lagSchedule(purchasesInclusive, I.creditorPayment)
  const payableOpening = zeroes(); const payableSubtotal = zeroes()
  const overheadsPaid = zeroes(); const payableClosing = zeroes()
  const openingPayableRunOff = zeroes()
  {
    const b = I.creditorPayment
    const tail = b[1] + b[2] + b[3] + b[4]
    if (!(b[0] === 1 || tail === 0)) {
      // The sheet settles the opening payable across months 1-4, the first month also
      // clearing that month's own overhead accrual and the fourth taking the residual.
      openingPayableRunOff[0] = blockOneGross[0] + ((opening.accountsPayable - blockOneGross[0]) * (b[1] / tail))
      openingPayableRunOff[1] = (opening.accountsPayable - blockOneGross[0]) * (b[2] / tail)
      openingPayableRunOff[2] = (opening.accountsPayable - blockOneGross[0]) * (b[3] / tail)
      openingPayableRunOff[3] = opening.accountsPayable - openingPayableRunOff[0] - openingPayableRunOff[1] - openingPayableRunOff[2]
    }
  }
  for (let m = 0; m < MONTHS; m++) {
    payableOpening[m] = m === 0 ? opening.accountsPayable : payableClosing[m - 1]
    payableSubtotal[m] = payableOpening[m] + purchasesInclusive[m] + blockOneGross[m]
    overheadsPaid[m] = m === 0 ? 0 : blockOneGross[m - 1]
    payableClosing[m] = payableSubtotal[m] - payment.total[m] - overheadsPaid[m] - openingPayableRunOff[m]
  }

  /* -- the month loop: everything that feeds back through the bank ----------------- */
  const bankOpening = zeroes(); const bankClosing = zeroes()
  const overdraftInterest = zeroes(); const inFundsInterest = zeroes()
  const totalOverheads = zeroes(); const operatingSurplus = zeroes()
  const totalOtherIncome = zeroes(); const netSurplusBeforeTax = zeroes()
  const taxProvision = zeroes(); const netSurplusAfterTax = zeroes(); const netMargin = zeroes()
  const lossesBroughtForward = zeroes(); const taxOnMonthProfit = zeroes()
  const lossesUtilised = zeroes(); const lossesCarriedForward = zeroes()
  const taxOpening = zeroes(); const taxClosing = zeroes()
  const gstOnIncome = zeroes(); const gstOnOtherIncome = zeroes(); const gstOnAssetSales = zeroes()
  const gstOutputs = zeroes(); const gstOnExpenses = zeroes(); const gstOnAssetPurchases = zeroes()
  const gstInputs = zeroes(); const gstForMonth = zeroes()
  const gstFileOneMonthly = zeroes()
  const gstFileTwoMonthly = new Array(MONTHS).fill(null)
  const gstFileSixMonthly = new Array(MONTHS).fill(null)
  const gstAmountToFile = new Array(MONTHS).fill(null)
  const gstBalanceOpening = zeroes(); const gstBalanceSubtotal = zeroes()
  const gstOnPayables = zeroes()
  const gstPaymentsMade = zeroes(); const gstBalanceClosing = zeroes()
  const receipts = { fromDebtors: cashFromDebtors, interestReceived: zeroes(), loanDrawdowns: zeroes(), gstRefunds: zeroes(), taxRefunds: I.taxRefunds.slice(), otherIncomeGstInclusive: zeroes(), otherIncomeGstExempt: otherIncomeGstExempt.slice(), shareholderAdvances: zeroes(), assetSales: zeroes() }
  // 🔴 THE FIVE OVERSEAS ROWS ARE ROWS OF THEIR OWN, and that is the point of the whole
  // section (Mike, 2026-09-04): "the whole point of this section is to show when deposits
  // are due, freight is paid, border gst etc - BEFORE the business can even start selling
  // them". Rolled into accountsPayable they would appear as one figure in the month the
  // supplier was settled, and the months that matter would be invisible.
  const payments = { accountsPayable: zeroes(), currentMonthGstInclusive: blockTwoGross, currentMonthGstFree: blockThreeTotal, interestPaid: zeroes(), loanPrincipal: zeroes(), gstPaid: zeroes(), taxPaid: I.taxPayments.slice(), shareholderDrawings: zeroes(), capitalExpenditure: zeroes(), overseasDeposits: OS.deposits, overseasFreight: OS.freight, overseasDuty: OS.duty, overseasBorderGst: OS.borderGst, overseasSupplierBalance: OS.supplierBalance, stockInTransitBalance: OS.transitBalancePaid, stockInTransitGst: OS.transitBorderGst }
  const totalReceipts = zeroes(); const totalPayments = zeroes(); const netMovement = zeroes()

  const loanDrawdownsAll = addSeries.apply(null, loans.map(function (l) { return l.drawdowns }))
  const loanPrincipalAll = addSeries.apply(null, loans.map(function (l) { return addSeries(l.capitalRepaid, l.lumpSumRepayments) }))
  const shareholderAdvancesAll = addSeries.apply(null, shareholders.map(function (s) { return s.advances }))
  const shareholderDrawingsAll = addSeries.apply(null, shareholders.map(function (s) { return s.drawings }))

  const grossSurplus = zeroes(); const grossMargin = zeroes()
  const costOfSalesSubtotal = zeroes(); const costOfSales = zeroes()

  for (let m = 0; m < MONTHS; m++) {
    costOfSalesSubtotal[m] = invOpening[m] + freight[m] + otherDirectExempt[m] +
      otherDirectTwo[m] + commissions[m] + allPurchases[m] + importedDirectCosts[m]
    costOfSales[m] = costOfSalesSubtotal[m] - invClosing[m]
    grossSurplus[m] = revenue[m] - costOfSales[m]
    grossMargin[m] = revenue[m] === 0 ? 0 : grossSurplus[m] / revenue[m]

    // Bank interest is charged on the balance brought forward, so it is known before
    // this month's own cash movements are computed — no circularity.
    bankOpening[m] = m === 0 ? (opening.cashAtBank - opening.bankOverdraft) : bankClosing[m - 1]
    overdraftInterest[m] = bankOpening[m] < 0 ? -I.overdraftInterestRate * bankOpening[m] / 12 : 0
    inFundsInterest[m] = bankOpening[m] > 0 ? I.inFundsInterestRate * bankOpening[m] / 12 : 0

    let oh = 0
    for (let k = 0; k < OVERHEAD_KEYS.length; k++) { oh += overhead[OVERHEAD_KEYS[k]][m] }
    // Supplier interest cover joins the other two interest charges rather than the direct
    // costs above the gross margin — Mike's ruling, 2026-09-04. It is what a supplier
    // charges for waiting to be paid, not a cost of getting the goods here.
    totalOverheads[m] = oh + depreciationCharged[m] + overdraftInterest[m] + loanInterest[m] +
      OS.supplierInterest[m]
    operatingSurplus[m] = grossSurplus[m] - totalOverheads[m]

    // R10: a gain or loss on sale is other income in the month of the sale — not spread,
    // which is what the two existing Other Income lines do to an annual figure. From
    // here it reaches profit, tax and retained earnings with no further plumbing.
    totalOtherIncome[m] = inFundsInterest[m] + shareholderInterest[m] +
      otherIncomeGstInclusive[m] + otherIncomeGstExempt[m] + gainOnAssetSales[m]
    netSurplusBeforeTax[m] = operatingSurplus[m] + totalOtherIncome[m]

    // Tax: a month's loss adds to the pool carried forward; a month's profit is
    // relieved by whatever pool exists before any provision is made.
    lossesBroughtForward[m] = m === 0 ? -I.lossesAvailable : lossesCarriedForward[m - 1]
    taxOnMonthProfit[m] = netSurplusBeforeTax[m] * I.taxRate
    lossesUtilised[m] = taxOnMonthProfit[m] < 0
      ? 0
      : (lossesBroughtForward[m] > -taxOnMonthProfit[m] ? -lossesBroughtForward[m] : taxOnMonthProfit[m])
    lossesCarriedForward[m] = lossesBroughtForward[m] +
      (taxOnMonthProfit[m] < 0 ? taxOnMonthProfit[m] : 0) + lossesUtilised[m]
    taxOpening[m] = m === 0 ? (opening.incomeTaxAsset - opening.incomeTaxLiability) : taxClosing[m - 1]
    taxProvision[m] = taxOnMonthProfit[m] < 0 ? 0 : taxOnMonthProfit[m] - lossesUtilised[m]
    taxClosing[m] = taxOpening[m] - taxProvision[m] + I.taxPayments[m] - I.taxRefunds[m]

    netSurplusAfterTax[m] = netSurplusBeforeTax[m] - taxProvision[m]
    netMargin[m] = revenue[m] === 0 ? 0 : netSurplusAfterTax[m] / revenue[m]

    /* -- GST ---------------------------------------------------------------------- */
    // On the Cash basis the return is worked backwards from money received, so it must
    // see DOMESTIC receipts only: a zero-rated export banks cash that carries no GST,
    // and including it would invent an output tax that was never charged.
    gstOnIncome[m] = I.gstBasis === 'Cash'
      ? ((domesticCash[m] + (I.overseas.zeroRated ? 0 : OS.overseasCollections[m])) /
         ((100 + gst * 100) / (gst * 100)))
      : salesGst[m]
    gstOnOtherIncome[m] = otherIncomeGstInclusive[m] * gst
    // R3/R4 do not apply here: the sheet's own GST rows already cover all six categories.
    // R10: GST follows the invoice, so it is charged on what the asset sold for — not on
    // what the books happened to carry it at.
    gstOnAssetSales[m] = proceedsAll[m] * gst
    gstOutputs[m] = gstOnIncome[m] + gstOnOtherIncome[m] + gstOnAssetSales[m]
    gstOnExpenses[m] = I.gstBasis === 'Cash'
      ? (((overheadsPaid[m] + openingPayableRunOff[m] + payment.total[m]) / ((1 + gst) / gst)) + blockTwoGst[m])
      : (blockOneGst[m] + blockTwoGst[m] + purchaseGst[m])
    gstOnAssetPurchases[m] = additionsAll[m] * gst
    // GST paid at the border is an input credit on the same return as everything else —
    // paid on the day the goods clear, claimed back at the next filing. Showing both in
    // their real months is the point: it is a timing cost, not a lost one.
    gstInputs[m] = gstOnExpenses[m] + gstOnAssetPurchases[m] + OS.borderGst[m] + OS.transitBorderGst[m]
    gstForMonth[m] = gstOutputs[m] - gstInputs[m]

    gstFileOneMonthly[m] = gstForMonth[m]
    const cal = headers.calendarMonths[m]
    const twoMonthlyDue = (cal === 1 || cal === 3 || cal === 5 || cal === 7 || cal === 9 || cal === 11)
    gstFileTwoMonthly[m] = twoMonthlyDue ? gstForMonth[m] + (m > 0 ? gstForMonth[m - 1] : 0) : null
    if (cal === 3 || cal === 9) {
      // R5: a six-month window. The workbook's first month reads #REF! because six
      // columns back falls off the sheet; the window now clamps to the start of the year,
      // which is exactly what the intact columns already do.
      const from = corrected ? Math.max(0, m - 5) : (m - 5)
      if (from < 0) {
        gstFileSixMonthly[m] = null // the workbook's #REF!
      } else {
        let s = 0
        for (let i = from; i <= m; i++) { s += gstForMonth[i] }
        gstFileSixMonthly[m] = s
      }
    }
    gstAmountToFile[m] = I.gstPeriod === 'One Monthly'
      ? gstFileOneMonthly[m]
      : (I.gstPeriod === 'Two Monthly' ? gstFileTwoMonthly[m] : gstFileSixMonthly[m])

    gstBalanceOpening[m] = m === 0 ? (opening.gstPayable - opening.gstRefund) : gstBalanceClosing[m - 1]
    // Month 1 settles the opening GST balance; later months settle what the previous
    // month's return said. A month with no return due settles nothing — the workbook
    // leaves that cell empty and its own cached figures treat the blank as zero.
    gstPaymentsMade[m] = m === 0
      ? gstBalanceOpening[0]
      : (typeof gstAmountToFile[m - 1] === 'number' ? gstAmountToFile[m - 1] : 0)
    gstBalanceSubtotal[m] = gstBalanceOpening[m] + salesGst[m] + gstOnOtherIncome[m] + gstOnAssetSales[m]
    // Always the accrued (invoice-basis) GST on payables, whatever the accounting basis
    // — the balance-sheet movement is what has been INVOICED, not what has been paid.
    gstOnPayables[m] = blockOneGst[m] + blockTwoGst[m] + purchaseGst[m]
    gstBalanceClosing[m] = gstBalanceSubtotal[m] - gstOnPayables[m] -
      gstOnAssetPurchases[m] - OS.borderGst[m] - OS.transitBorderGst[m] - gstPaymentsMade[m]

    /* -- cash flow ---------------------------------------------------------------- */
    receipts.interestReceived[m] = inFundsInterest[m]
    receipts.loanDrawdowns[m] = loanDrawdownsAll[m]
    receipts.gstRefunds[m] = gstPaymentsMade[m] < 0 ? -gstPaymentsMade[m] : 0
    receipts.otherIncomeGstInclusive[m] = otherIncomeGstInclusive[m] * (1 + gst)
    receipts.shareholderAdvances[m] = shareholderAdvancesAll[m]
    // R3: the sale proceeds of all six categories, not three — while the GST on all six
    // was already being received. R10: and the proceeds are the sale price, so a van
    // carried at 8,000 and sold for 12,000 banks 12,000 plus its GST.
    receipts.assetSales[m] = gstOnAssetSales[m] + proceedsCharged[m]
    totalReceipts[m] = receipts.fromDebtors[m] + receipts.interestReceived[m] +
      receipts.loanDrawdowns[m] + receipts.gstRefunds[m] + receipts.taxRefunds[m] +
      receipts.otherIncomeGstInclusive[m] + receipts.otherIncomeGstExempt[m] +
      receipts.shareholderAdvances[m] + receipts.assetSales[m]

    payments.accountsPayable[m] = payment.total[m] + overheadsPaid[m] + openingPayableRunOff[m]
    payments.interestPaid[m] = overdraftInterest[m] + loanInterest[m] + overhead.interestIrd[m]
    payments.loanPrincipal[m] = loanPrincipalAll[m]
    payments.gstPaid[m] = gstPaymentsMade[m] > 0 ? gstPaymentsMade[m] : 0
    payments.shareholderDrawings[m] = shareholderDrawingsAll[m]
    // R4: the cost of all six categories, not three — while the GST on all six was
    // already being paid.
    payments.capitalExpenditure[m] = gstOnAssetPurchases[m] + additionsCharged[m]
    totalPayments[m] = payments.accountsPayable[m] + payments.currentMonthGstInclusive[m] +
      payments.currentMonthGstFree[m] + payments.interestPaid[m] + payments.loanPrincipal[m] +
      payments.gstPaid[m] + payments.taxPaid[m] + payments.shareholderDrawings[m] +
      payments.capitalExpenditure[m] + payments.overseasDeposits[m] +
      payments.overseasFreight[m] + payments.overseasDuty[m] +
      payments.overseasBorderGst[m] + payments.overseasSupplierBalance[m] +
      // Fix 2: the balance settled on stock already paid for, and the GST Customs charges
      // when it lands. Zero unless the opening position carried a deposit.
      payments.stockInTransitBalance[m] + payments.stockInTransitGst[m]

    netMovement[m] = totalReceipts[m] - totalPayments[m]
    bankClosing[m] = netMovement[m] + bankOpening[m]
  }

  /* -- the monthly balance sheet --------------------------------------------------- */
  const bs = {
    authorisedCapital: zeroes(),
    capitalGain: zeroes(),
    otherEquity: zeroes(),
    retainedEarnings: zeroes(),
    totalEquity: zeroes(),
    cashAtBank: zeroes(),
    accountsReceivable: debtorClosing,
    inventory: invClosing,
    incomeTaxAsset: zeroes(),
    gstRefund: zeroes(),
    prepayments: zeroes(),
    // 4.64 — deposits paid on stock still at sea, and landed stock not yet paid for.
    // Zero throughout unless the advisor imports.
    importPrepayments: OS.prepaymentClosing,
    importSupplierBalance: OS.balanceOwingClosing,
    shareholderCurrentAssets: zeroes(),
    otherCurrentAsset: zeroes(),
    totalCurrentAssets: zeroes(),
    bankOverdraft: zeroes(),
    accountsPayable: payableClosing,
    incomeTaxLiability: zeroes(),
    gstPayable: zeroes(),
    accruedExpenses: zeroes(),
    shareholderCurrentLiabilities: zeroes(),
    otherCurrentLiability: zeroes(),
    totalCurrentLiabilities: zeroes(),
    workingCapital: zeroes(),
    // A facility revolves and is repayable on demand, so it belongs among the short-term
    // debt beside the overdraft — never with the term loans below (Mike, 2026-09-05).
    facilities: [],
    totalFacilities: zeroes(),
    nonCurrentAssets: {},
    totalNonCurrentAssets: zeroes(),
    nonCurrentLiabilities: [],
    otherNonCurrentLiability: zeroes(),
    totalNonCurrentLiabilities: zeroes(),
    netAssets: zeroes(),
    balanceCheck: zeroes()
  }
  for (let k = 0; k < ASSET_KEYS.length; k++) { bs.nonCurrentAssets[ASSET_KEYS[k]] = assets[k].closingValue }
  bs.nonCurrentLiabilities = loans
    .filter(function (l) { return l.type !== 'facility' })
    .map(function (l) { return { name: l.name, balance: l.closingBalance } })
  bs.facilities = loans
    .filter(function (l) { return l.type === 'facility' })
    .map(function (l) { return { name: l.name, balance: l.closingBalance } })

  for (let m = 0; m < MONTHS; m++) {
    bs.authorisedCapital[m] = m === 0 ? opening.authorisedCapital : bs.authorisedCapital[m - 1]
    bs.capitalGain[m] = m === 0 ? opening.capitalGain : bs.capitalGain[m - 1]
    bs.otherEquity[m] = m === 0 ? opening.otherEquity : bs.otherEquity[m - 1]
    bs.retainedEarnings[m] = netSurplusAfterTax[m] + (m === 0 ? opening.retainedEarnings : bs.retainedEarnings[m - 1])
    bs.totalEquity[m] = bs.authorisedCapital[m] + bs.capitalGain[m] + bs.otherEquity[m] + bs.retainedEarnings[m]

    bs.cashAtBank[m] = bankClosing[m] > 0 ? bankClosing[m] : 0
    bs.bankOverdraft[m] = bankClosing[m] < 0 ? -bankClosing[m] : 0
    bs.incomeTaxAsset[m] = taxClosing[m] > 0 ? taxClosing[m] : 0
    bs.incomeTaxLiability[m] = taxClosing[m] < 0 ? -taxClosing[m] : 0
    bs.gstRefund[m] = gstBalanceClosing[m] < 0 ? -gstBalanceClosing[m] : 0
    bs.gstPayable[m] = gstBalanceClosing[m] > 0 ? gstBalanceClosing[m] : 0
    bs.prepayments[m] = accrualClosing[m] > 0 ? accrualClosing[m] : 0
    bs.accruedExpenses[m] = accrualClosing[m] < 0 ? -accrualClosing[m] : 0

    let shClose = 0
    for (let k = 0; k < shareholders.length; k++) { shClose += shareholders[k].closingBalance[m] }
    bs.shareholderCurrentAssets[m] = shClose > 0 ? 0 : -shClose
    bs.shareholderCurrentLiabilities[m] = shClose < 0 ? 0 : shClose

    bs.otherCurrentAsset[m] = m === 0 ? opening.otherCurrentAsset : bs.otherCurrentAsset[m - 1]
    bs.otherCurrentLiability[m] = m === 0 ? opening.otherCurrentLiability : bs.otherCurrentLiability[m - 1]

    bs.totalCurrentAssets[m] = bs.cashAtBank[m] + bs.accountsReceivable[m] + bs.inventory[m] +
      bs.incomeTaxAsset[m] + bs.gstRefund[m] + bs.prepayments[m] +
      bs.importPrepayments[m] +
      bs.shareholderCurrentAssets[m] + bs.otherCurrentAsset[m]
    let fac = 0
    for (let k = 0; k < bs.facilities.length; k++) { fac += bs.facilities[k].balance[m] }
    bs.totalFacilities[m] = fac
    bs.totalCurrentLiabilities[m] = bs.bankOverdraft[m] + bs.accountsPayable[m] +
      bs.incomeTaxLiability[m] + bs.gstPayable[m] + bs.accruedExpenses[m] +
      bs.importSupplierBalance[m] + bs.totalFacilities[m] +
      bs.shareholderCurrentLiabilities[m] + bs.otherCurrentLiability[m]
    bs.workingCapital[m] = bs.totalCurrentAssets[m] - bs.totalCurrentLiabilities[m]

    // R1: every category counted. The workbook stopped at the fourth.
    let nca = 0
    for (let k = 0; k < ASSET_KEYS.length; k++) {
      if (totalsAllSixAssets || k < 4) { nca += bs.nonCurrentAssets[ASSET_KEYS[k]][m] }
    }
    bs.totalNonCurrentAssets[m] = nca

    let ncl = 0
    for (let k = 0; k < bs.nonCurrentLiabilities.length; k++) { ncl += bs.nonCurrentLiabilities[k].balance[m] }
    bs.otherNonCurrentLiability[m] = m === 0 ? opening.otherNonCurrentLiability : bs.otherNonCurrentLiability[m - 1]
    bs.totalNonCurrentLiabilities[m] = ncl + bs.otherNonCurrentLiability[m]

    bs.netAssets[m] = bs.workingCapital[m] - bs.totalNonCurrentLiabilities[m] + bs.totalNonCurrentAssets[m]
    bs.balanceCheck[m] = excelRound(bs.totalEquity[m] - bs.netAssets[m])
  }

  /* -- the corrections register ---------------------------------------------------- */
  const corrections = corrected
? [
    { ref: 'R1', where: 'Balance sheet — Total Non-Current Assets', wasCounting: 4, nowCounting: 6, sheetRow: 106 },
    { ref: 'R2', where: 'Profit & loss — Depreciation', wasCounting: 3, nowCounting: 6, sheetRow: 28 },
    { ref: 'R3', where: 'Cash flow — Asset sales received', wasCounting: 3, nowCounting: 6, sheetRow: 130 },
    { ref: 'R4', where: 'Cash flow — Capital expenditure paid', wasCounting: 3, nowCounting: 6, sheetRow: 142 },
    { ref: 'R5', where: 'GST — six-monthly return, first month of the year', wasCounting: null, nowCounting: null, sheetRow: 411 },
    { ref: 'R6', where: 'Payables — an overhead settled twice each month', wasCounting: null, nowCounting: null, sheetRow: 201 },
    { ref: 'R7', where: 'Payables — Other Direct Expenses (GST Exempt) settled by nothing', wasCounting: null, nowCounting: null, sheetRow: 11 },
    { ref: 'R10', where: 'Asset sales — the sale price, and the gain or loss it makes', wasCounting: null, nowCounting: null, sheetRow: 130 }
  ]
: []

  return {
    monthCount: MONTHS,
    months: {
      serials: headers.serials,
      isoDates: headers.isoDates,
      calendarMonths: headers.calendarMonths,
      // Where the next year begins, by whichever stepping rule this year used. The
      // chain reads it rather than re-deriving it, so the two can never disagree.
      nextYearStartSerial: headers.nextYearStartSerial
    },
    // True when the workbook's add-31-days month stepping skips a calendar month, which
    // is the condition under which its GST filing schedule misfires. Reported, not hidden.
    startsSkipACalendarMonth: headers.skipsACalendarMonth,
    sourceFidelity: asWritten,
    corrections,
    profitAndLoss: {
      revenue,
      openingInventory: invOpening,
      freight,
      otherDirectExpensesExempt: otherDirectExempt,
      otherDirectTwo,
      commissions,
      purchases: I.purchases.slice(),
      costOfSalesSubtotal,
      closingInventory: invClosing,
      costOfSales,
      grossSurplus,
      grossMargin,
      overheads: overhead,
      depreciation: depreciationCharged,
      interestBankOverdraft: overdraftInterest,
      // Term loans and facilities are two figures, never one — see the ruling at
      // `termLoanInterest`. Both are inside `totalOverheads`; with no facility entered the
      // second is zeroes and the first is the figure this line has always carried.
      interestTermLoans: termLoanInterest,
      interestFacilities: facilityInterest,
      totalOverheads,
      operatingSurplus,
      interestIncomeBank: inFundsInterest,
      interestIncomeShareholders: shareholderInterest,
      otherIncomeGstInclusive,
      otherIncomeGstExempt,
      gainOnAssetSales,
      totalOtherIncome,
      netSurplusBeforeTax,
      taxProvision,
      netSurplusAfterTax,
      netMargin
    },
    balanceSheet: { opening, months: bs },
    cashFlow: {
      receipts,
      totalReceipts,
      payments,
      totalPayments,
      netMovement,
      openingBalance: bankOpening,
      closingBalance: bankClosing,
      overdraftInterest,
      inFundsInterest
    },
    schedules: {
      debtors: {
        sales: revenue,
        gst: salesGst,
        inclusive: salesInclusive,
        collectionSlices: collection.slices,
        openingBalanceRunOff: openingDebtorRunOff,
        cashReceived: cashFromDebtors,
        openingBalance: debtorOpening,
        subtotal: debtorSubtotal,
        closingBalance: debtorClosing
      },
      expensePayments: {
        blockOneNet,
        blockOneGst,
        blockOneGross,
        blockTwoNet,
        blockTwoGst,
        blockTwoGross,
        blockThreeTotal
      },
      inventory: {
        openingInventory: invOpening,
        purchases: allPurchases,
        localPurchases: I.purchases.slice(),
        importedPurchases: importedPurchases.slice(),
        subtotal: invSubtotal,
        costOfSales: costOfSalesCharge,
        closingInventory: invClosing,
        costRatio,
        overseasCostRatio
      },
      /**
       * Buying and selling overseas (4.64). Zeroes throughout unless the advisor entered
       * overseas trade. `depositsBeforeStart` and `revenueBeyondYear` are what the twelve
       * months cannot show, reported rather than dropped.
       */
      overseas: {
        enabled: I.overseas.enabled,
        importedPurchases: importedPurchases.slice(),
        deposits: OS.deposits,
        freight: OS.freight,
        duty: OS.duty,
        borderGst: OS.borderGst,
        supplierBalance: OS.supplierBalance,
        supplierInterest: OS.supplierInterest,
        fxOnPurchases: OS.fxOnPurchases,
        importedRevenue: OS.importedRevenue,
        importedCostOfSales: OS.importedCostOfSales,
        overseasSales: I.overseas.overseasSales.slice(),
        overseasRevenue: OS.overseasRevenue,
        overseasGst: OS.overseasGst,
        overseasCollections: OS.overseasCollections,
        fxOnSales: OS.fxOnSales,
        exchangeMovement: addSeries(OS.fxOnPurchases, OS.fxOnSales),
        depositsBeforeStart: OS.depositsBeforeStart,
        revenueBeyondYear: OS.revenueBeyondYear,
        sellDown: {
          pattern: I.overseas.sellDown.pattern,
          curve: (I.overseas.sellDown.curve || []).slice(),
          newMarkup: I.overseas.sellDown.newMarkup,
          standardMarkup: I.overseas.sellDown.standardMarkup,
          runoutMarkup: I.overseas.sellDown.runoutMarkup
        }
      },
      creditors: {
        purchases: I.purchases.slice(),
        gst: purchaseGst,
        inclusive: purchasesInclusive,
        paymentSlices: payment.slices,
        paid: payment.total,
        openingBalance: payableOpening,
        subtotal: payableSubtotal,
        overheadsPaid,
        openingBalanceRunOff: openingPayableRunOff,
        closingBalance: payableClosing
      },
      loans,
      /**
       * Stock already paid for at the opening date (Fix 2). Zeroes throughout unless the
       * opening balance sheet carried a deposit AND the advisor said when it lands.
       * `notLanded` is what has no landing month, which is not an error: it stays a
       * deposit at the year end, and the screen explains it rather than blocking.
       */
      stockInTransit: {
        openingDeposits: opening.stockInTransitDeposits,
        balanceOwing: I.stockInTransit.balanceOwing,
        landing: I.stockInTransit.landing.slice(),
        landedValue: OS.transitLanded,
        balancePaid: OS.transitBalancePaid,
        borderGst: OS.transitBorderGst,
        notLanded: excelRound(opening.stockInTransitDeposits -
          I.stockInTransit.landing.reduce(function (a, v) { return a + v }, 0))
      },
      assets,
      shareholders,
      gst: {
        basis: I.gstBasis,
        period: I.gstPeriod,
        rate: gst,
        onIncome: gstOnIncome,
        onOtherIncome: gstOnOtherIncome,
        onAssetSales: gstOnAssetSales,
        outputs: gstOutputs,
        onExpenses: gstOnExpenses,
        onAssetPurchases: gstOnAssetPurchases,
        inputs: gstInputs,
        forMonth: gstForMonth,
        fileOneMonthly: gstFileOneMonthly,
        fileTwoMonthly: gstFileTwoMonthly,
        fileSixMonthly: gstFileSixMonthly,
        amountToFile: gstAmountToFile,
        balanceOpening: gstBalanceOpening,
        balanceSubtotal: gstBalanceSubtotal,
        onPayables: gstOnPayables,
        paymentsMade: gstPaymentsMade,
        balanceClosing: gstBalanceClosing
      },
      accruals: {
        openingBalance: accrualOpening,
        accLevies: overhead.accLevies,
        insurance: overhead.insurance,
        subtotal: accrualSubtotal,
        accLeviesPaid: I.accLeviesPaid.slice(),
        insurancePaid: I.insurancePaid.slice(),
        closingBalance: accrualClosing
      },
      tax: {
        rate: I.taxRate,
        lossesBroughtForward,
        taxOnMonthProfit,
        lossesUtilised,
        lossesCarriedForward,
        openingBalance: taxOpening,
        provision: taxProvision,
        payments: I.taxPayments.slice(),
        refunds: I.taxRefunds.slice(),
        closingBalance: taxClosing
      }
    }
  }
}

/* ------------------------------------------------------- the year-to-year handover -- */

/** Split a net balance onto the asset side. @param {number} net */
function assetSide (net) { return net > 0 ? net : 0 }
/** Split a net balance onto the liability side. @param {number} net */
function liabilitySide (net) { return net < 0 ? -net : 0 }

/**
 * Build the opening position of the NEXT year from the closing position of this one.
 *
 * The workbook states this itself, and states it cleanly: year 2's opening column is
 * year 1's month-12 balance sheet, row for row (`'Yr 1. Projections'!O70` … `O116`).
 * So the handover is the whole closing balance sheet, plus each schedule's own closing
 * value — which the balance sheet already carries per category for assets (rows 99-104)
 * and per lender for loans (109-111).
 *
 * 🔴 R8 — THE SHAREHOLDER CURRENT ACCOUNTS CARRY FORWARD. Ruled by Mike 2026-09-02.
 * The workbook opens them from `'Data Input'!E68`…`E71` in EVERY year — the original
 * year-1 figures — so a year's interest, advances and drawings are wiped at each year
 * boundary and the schedule then disagrees with the balance sheet, which does carry the
 * correct closing figure. The loans were wired up properly (`M347 = 'Yr 1
 * Projections'!O109`), so this was an omission rather than an intention. On the sample
 * it loses 2,916 a year, and it compounds.
 *
 * @param {object} previousYear a `computeThreeWayForecast` result
 * @param {object} nextYearInputs the next year's own inputs (its own trading, rates and
 *   terms are untouched — only the OPENING figures are replaced)
 * @param {Array<object>|null} resetShareholdersTo reproduce the workbook's reset instead
 *   of carrying forward — the value is YEAR ONE's shareholder openings, because that is
 *   what the workbook resets to every year (`'Data Input'!E68`…`E71`, the year-1 column,
 *   in year 2 AND year 3). Used only by source-fidelity mode; null means carry forward.
 * @returns {object} the next year's inputs with its opening position filled in
 */
function carryForward (previousYear, nextYearInputs, resetShareholdersTo) {
  const bs = previousYear.balanceSheet.months
  const s = previousYear.schedules
  const last = MONTHS - 1
  const next = Object.assign({}, nextYearInputs)

  const taxNet = s.tax.closingBalance[last]
  const gstNet = s.gst.balanceClosing[last]
  const accrualNet = s.accruals.closingBalance[last]

  next.openingBalanceSheet = Object.assign({}, nextYearInputs.openingBalanceSheet, {
    authorisedCapital: bs.authorisedCapital[last],
    capitalGain: bs.capitalGain[last],
    otherEquity: bs.otherEquity[last],
    retainedEarnings: bs.retainedEarnings[last],
    cashAtBank: bs.cashAtBank[last],
    bankOverdraft: bs.bankOverdraft[last],
    accountsReceivable: bs.accountsReceivable[last],
    inventory: bs.inventory[last],
    accountsPayable: bs.accountsPayable[last],
    // Each of these is held as a pair of one-sided figures, so a net balance is split
    // back onto the side it falls on — exactly as the opening screen asks for it.
    incomeTaxRefundDue: assetSide(taxNet),
    incomeTaxPayable: liabilitySide(taxNet),
    gstRefund: liabilitySide(gstNet),
    gstPayable: assetSide(gstNet),
    prepayments: assetSide(accrualNet),
    accruedExpenses: liabilitySide(accrualNet),
    otherCurrentAsset: bs.otherCurrentAsset[last],
    otherCurrentLiability: bs.otherCurrentLiability[last],
    otherNonCurrentLiability: bs.otherNonCurrentLiability[last],
    // Deposits on stock that had still not landed by the year end open the next year as
    // deposits — which is exactly what they are. The next year's own landing months are
    // its own to set, and default to none, so nothing lands by accident.
    stockInTransitDeposits: bs.importPrepayments[last]
  })

  next.assets = (nextYearInputs.assets || DEFAULTS.assets).map(function (a, n) {
    return Object.assign({}, a, { opening: s.assets[n].closingValue[last] })
  })
  // A later year may name a different number of funding lines from the year before it —
  // rows appear as they are needed (2026-09-05), so the counts are no longer guaranteed to
  // match. A line with no predecessor opens at its OWN figure rather than reaching past the
  // end of last year's schedules, which is what used to throw.
  next.loans = (nextYearInputs.loans || DEFAULTS.loans).map(function (l, n) {
    const previous = s.loans[n]
    return Object.assign({}, l, {
      opening: previous ? previous.closingBalance[last] : pick(l.opening, 0)
    })
  })
  next.shareholders = (nextYearInputs.shareholders || DEFAULTS.shareholders).map(function (sh, n) {
    if (resetShareholdersTo) {
      const reset = resetShareholdersTo[n]
      return Object.assign({}, sh, { opening: reset ? pick(reset.opening, 0) : 0 })
    }
    return Object.assign({}, sh, { opening: s.shareholders[n].closingBalance[last] })
  })

  // A year steps on the same way its months do — one calendar month after the last
  // (R9), or, in source-fidelity mode, the workbook's 31 days
  // (`'Yr 1. Projections'!O1+31`). The year that just ran reports which, so the two can
  // never disagree.
  next.startDateSerial = previousYear.months.nextYearStartSerial

  return next
}

/**
 * Compute all three years, chained.
 *
 * Every input is per-year in the workbook — its Data Input sheet holds three sets of
 * columns (E/G, M/O, U/W) for sales, purchases, mark-up, overheads, rates, terms and
 * capital plans — so this takes three complete input sets rather than a growth rate.
 * Only the OPENING position of years 2 and 3 is derived; everything else is theirs.
 *
 * @param {object} rawInputs `{ years: [year1, year2, year3] }`. A bare single-year
 *   object is accepted and used for year 1. **An omitted or partial later year inherits
 *   the year before it**, so leaving years 2 and 3 empty forecasts "the same again"
 *   rather than dropping the sample workbook's figures into a real client's later years.
 * @param {object} [options] `sourceFidelity: true` reproduces the workbook including
 *   its defects — including the shareholder reset at each year boundary. Test-only, and
 *   a separate parameter so no request body can reach it.
 * @returns {object} { years: [y1, y2, y3], summary } — `summary` totals the three years
 *   and carries the closing position of the third.
 */
function computeThreeYearForecast (rawInputs, options) {
  const asWritten = !!(options && options.sourceFidelity === true)
  const supplied = (rawInputs && typeof rawInputs === 'object') ? rawInputs : {}
  const perYear = Array.isArray(supplied.years) ? supplied.years : [supplied, {}, {}]

  // Year one's shareholder openings, resolved once: source-fidelity mode resets to them
  // in every later year, which is what the workbook does.
  const yearOneShareholders = resolveInputs(perYear[0] && typeof perYear[0] === 'object' ? perYear[0] : {}).shareholders

  const years = []
  let previousResolved = null
  for (let y = 0; y < 3; y++) {
    const own = (perYear[y] && typeof perYear[y] === 'object') ? perYear[y] : {}
    // 🔴 AN OMITTED LATER YEAR REPEATS THE YEAR BEFORE IT — NEVER THE SAMPLE WORKBOOK.
    // Falling back to DEFAULTS here would drop the source workbook's own trading
    // figures ("Big Bird Grass Seed", 890,000 of sales) into years 2 and 3 of a REAL
    // client's forecast, silently, because an advisor filled in year 1 and left the
    // rest alone. Inheriting the previous year instead makes an omitted year mean
    // "the same again", which is both the safe reading and the useful one.
    const resolved = resolveInputs(own, previousResolved)
    const inputs = y === 0 ? resolved : carryForward(years[y - 1], resolved, asWritten ? yearOneShareholders : null)
    years.push(computeThreeWayForecast(inputs, { sourceFidelity: asWritten, yearIndex: y }))
    previousResolved = resolved
  }

  const sumOf = path => years.reduce(function (a, yr) {
    const series = path.split('.').reduce(function (n, k) { return n ? n[k] : undefined }, yr)
    return a + (Array.isArray(series) ? series.reduce(function (x, v) { return x + v }, 0) : 0)
  }, 0)
  const lastYear = years[2]
  const last = MONTHS - 1

  return {
    years,
    summary: {
      revenue: sumOf('profitAndLoss.revenue'),
      grossSurplus: sumOf('profitAndLoss.grossSurplus'),
      totalOverheads: sumOf('profitAndLoss.totalOverheads'),
      netSurplusBeforeTax: sumOf('profitAndLoss.netSurplusBeforeTax'),
      taxProvision: sumOf('profitAndLoss.taxProvision'),
      netSurplusAfterTax: sumOf('profitAndLoss.netSurplusAfterTax'),
      // The closing position after three years — what a financier reads first.
      closingCash: lastYear.cashFlow.closingBalance[last],
      closingNetAssets: lastYear.balanceSheet.months.netAssets[last],
      balanceCheck: lastYear.balanceSheet.months.balanceCheck[last],
      // The lowest the bank goes at any point across the whole 36 months, and when.
      lowestCash: years.reduce(function (lo, yr, yi) {
        yr.cashFlow.closingBalance.forEach(function (v, m) {
          if (v < lo.value) { lo = { value: v, year: yi + 1, month: m + 1, date: yr.months.isoDates[m] } }
        })
        return lo
      }, { value: Infinity, year: 0, month: 0, date: null })
    }
  }
}

/**
 * The revenue imported stock produces, month by month, WITHOUT any override applied.
 *
 * WHY IT EXISTS. Mike's ruling of 2026-09-04 is that this revenue is worked out and then
 * "seeded into the sales row where the advisor can override it", and the approved drawing
 * (`design/mockups/three-way-forecast-international.html`) shows the twelve figures on the
 * assumptions screen. A screen cannot show them without asking for them, and the ladder is
 * business logic, so it is asked for over HTTP rather than repeated in the browser.
 *
 * 🔴 IT CALLS THE ENGINE'S OWN `overseasSchedule`, NEVER A SECOND IMPLEMENTATION. A copy of
 * the ladder written for the screen would drift from the one that produces the forecast, and
 * the advisor would be shown one number and given another.
 *
 * 🔴 THE OVERRIDE IS CLEARED BEFORE COMPUTING, WHICH IS THE POINT OF THE FUNCTION. Seeding
 * from a result that already has the advisor's figures in it would make a typed number look
 * like a worked-out one, and clearing a box would then restore the advisor's own value
 * instead of the ladder's — the restore would silently do nothing.
 *
 * @param {object} rawInputs the same shape `computeThreeWayForecast` takes
 * @returns {{importedRevenue: Array<number>, revenueBeyondYear: number}}
 */
function importedRevenuePreview (rawInputs) {
  const I = resolveInputs(rawInputs)
  // The preview is about IMPORTED REVENUE and nothing else, so the stock-in-transit block
  // is passed empty: opening deposits release into stock, never into a sale, and letting
  // them through here would put a figure in a preview that the ladder did not work out.
  const worked = overseasSchedule(
    Object.assign({}, I.overseas, { importedRevenueOverride: blanks() }),
    I.gstRate,
    { balanceOwing: 0, landing: zeroes() },
    0
  )
  return {
    importedRevenue: worked.importedRevenue.slice(),
    revenueBeyondYear: worked.revenueBeyondYear
  }
}

module.exports = {
  computeThreeWayForecast,
  computeThreeYearForecast,
  importedRevenuePreview,
  carryForward,
  DEFAULTS,
  ASSET_KEYS,
  OVERHEAD_KEYS,
  excelRound
}
