/**
 * Business Owner Expectations and Business Development Stages — the maths model.
 *
 * Source workbook: `design/report-source-models/BO Expectations.xlsx` (item 5.4).
 * Mike's own planning workbook: the first two items on his Business Targets agenda.
 * Three of its four sheets are ported here as pure compute functions; the fourth,
 * "Key Sheet", is a list of merge-field names and holds no calculation.
 *
 *   `computeOwnerExpectations`   ← sheet "Business Owners Data Entry"
 *       Up to six owners. Each one's income now and at three target stages, the hours
 *       and leave they want at each stage, and how their week splits across their own tasks
 *       now and at the stage they are working towards.
 *
 *   `computeDevelopmentStages`   ← sheet "Business Development Stages"
 *       🔴 A BACK-CALCULATION, NOT A FORECAST. The owners' combined income at each stage
 *       IS the net profit the business must make (`E21:H21` read the owners sheet's
 *       totals). The sheet then works upward: net profit + depreciation + loan payments +
 *       fixed costs is the gross profit needed, plus sales and promotion costs, plus cost
 *       of sales, is the REVENUE the business must reach. That is the whole point of the
 *       two sheets being one workbook: an owner states the life they want, and the page
 *       says how big the business must be to pay for it.
 *
 *   `computeQuickLoan`           ← the "Quick Calculator" block on that sheet, fed by
 *       sheet "Interest Calcs" (a month-by-month Table / Reducing worksheet).
 *
 * `design/report-source-models/BD stages.xlsx` is an EARLIER copy of the same two
 * sheets (eight owners, a year earlier, no hours columns and no link to the loan
 * sheet). BO Expectations.xlsx supersedes it and is the one ported.
 *
 * Calculation is backend-only (Stack Constitution). No I/O, no state. Every figure
 * the golden test pins is the workbook's own cached value, except where the workbook was
 * WRONG and is corrected here — each correction is marked 🔴 FIXED at its line, and its
 * figures in the golden test are worked out by hand and labelled as such. The port was
 * proved exact before any correction went in.
 *
 * 🔴 NOTHING ABOUT THE WORKBOOK REACHES THE SCREEN. Mike's ruling, 2026-09-24: "if the model
 * has a fault - fix it. end of story. the user has no idea about the original model - they
 * dont need to see it". So this model carries no `workbookCorrections` for a screen to show;
 * the record of what changed lives here and in the golden test, for the next developer.
 */

const FOCUS_TASKS = require('../../data/owner-focus-tasks.json').tasks
const { amortise, annuityPayment } = require('./leaseVsBuyModel')

/** The workbook's four columns: where the owners are now, then three target stages. */
const STAGE_KEYS = ['current', 'stage1', 'stage2', 'stage3']

/** The owners sheet has six owner blocks (E, I, M, Q, U, Y). */
const MAX_OWNERS = 6

/**
 * 🔴 EACH OWNER HOLDS THEIR OWN TASK LIST — Mike's ruling, 2026-09-24: every owner starts
 * from the same list, cascaded down the tiers (`server/utils/ownerFocusTasks.js`), and may
 * then rename, delete and add their own. So a duty is `{ task, now, focus }` with the task's
 * NAME carried on it, not a fixed key. The workbook's ten rows (`D16:D25`) are the shipped
 * starting list in `data/owner-focus-tasks.json`, read here rather than copied.
 */
const MAX_TASKS = 20

/** A task is a short name — the same ceiling the starting-list tab enforces. */
const MAX_TASK_NAME = 80

/** The sample's duty split, shared by all six owners in the workbook (E16:E25 / G16:G25). */
const SAMPLE_NOW = [0.1, 0.15, 0.12, 0.13, 0.14, 0.12, 0.14, 0.1, 0, 0]
const SAMPLE_FOCUS = [0.4, 0, 0.25, 0, 0.2, 0, 0, 0.05, 0.1, 0]

function sampleDuties () {
  return FOCUS_TASKS.map((task, i) => ({ task, now: SAMPLE_NOW[i], focus: SAMPLE_FOCUS[i] }))
}

/**
 * One owner. `stages[0]` is stage 1 — the sheet carries no hours or leave for "now";
 * its first hours row (row 7) sits under the stage 1 income.
 */
function owner (name, incomes, stages) {
  return {
    name,
    incomes, // [current, stage1, stage2, stage3] — rows 5, 6, 9, 12
    stages, //  [{ weeklyHours, leaveWeeks }] × 3 — rows 7/8, 10/11, 13/14
    duties: sampleDuties()
  }
}

const EMPTY_STAGE = { weeklyHours: null, leaveWeeks: null }

/** The workbook's own sample, exactly as typed on its two input sheets. */
const DEFAULT_INPUTS = {
  // The years in the four column headings (D5, D6, D9, D12).
  years: [2025, 2026, 2029, 2031],

  owners: [
    owner('Andy', [120000, 125000, 175000, 225000], [ //  column E
      { weeklyHours: 45, leaveWeeks: 6 }, { weeklyHours: 40, leaveWeeks: 8 }, { weeklyHours: 30, leaveWeeks: 12 }
    ]),
    owner('Bill', [120001, 125001, 195000, 250000], [ //  column I
      { weeklyHours: 45, leaveWeeks: 6 }, { weeklyHours: 45, leaveWeeks: 6 }, { weeklyHours: 45, leaveWeeks: 6 }
    ]),
    owner('Shirley', [null, null, null, null], [{ weeklyHours: 40, leaveWeeks: null }, EMPTY_STAGE, EMPTY_STAGE]), // M
    owner('Bob', [null, null, null, null], [{ weeklyHours: 38, leaveWeeks: null }, EMPTY_STAGE, EMPTY_STAGE]), //     Q
    owner('John', [null, null, null, null], [{ weeklyHours: 35, leaveWeeks: null }, EMPTY_STAGE, EMPTY_STAGE]), //    U
    owner('Dick', [null, null, null, null], [{ weeklyHours: 30, leaveWeeks: null }, EMPTY_STAGE, EMPTY_STAGE]) //     Y
  ],

  // "Business Development Stages", one value per stage column E..H.
  development: {
    owners: [2, 3, 4, 5], //                         row 5
    cogs: [612382, 612382, 612382, 612382], //       row 8  Variable Costs (COGS) $
    salesPromo: [85000, 85000, 85000, 85000], //     row 13 Sales/Promo' Costs
    fixedCosts: [220000, 240000, 300000, 350000], // row 17
    loanPayments: [87000, 87000, 87000, 87000], //   row 18 Annual Loan Payments $
    depreciation: [67000, 67000, 67000, 67000], //   row 19
    totalAssets: [218250, 250000, 350000, 500000], // row 24
    debt: [87960, 100000, 125000, 90000], //         row 25
    staffFullTime: [7, 8, 9, 13], //                 row 27
    staffPartTime: [2, 2, 2, 2], //                  row 28
    // Rows 29–32 are words, not figures: the workbook's sample is a joke brewery and is
    // not carried. They start empty and the advisor writes the client's own.
    premises: ['', '', '', ''],
    markets: ['', '', '', ''],
    coreServices: ['', '', '', ''],
    skills: ['', '', '', '']
  },

  // The Quick Calculator (P12, P13, P15, P17). The deposit (`Interest Calcs` C15) is 0.
  loan: { amount: 375000, rate: 0.07, termMonths: 60, type: 'Table' }
}

/** Coerce to a finite number; anything else is 0, never NaN. */
function num (v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Guard every division: a zero denominator yields 0, never NaN/Infinity. */
function div (a, b) {
  return b ? a / b : 0
}

function sum (xs) {
  return xs.reduce((a, b) => a + b, 0)
}

/** A four-long array of numbers, whatever arrived. */
function four (arr) {
  const a = Array.isArray(arr) ? arr : []
  return STAGE_KEYS.map((_, i) => num(a[i]))
}

/**
 * A four-long array of trimmed strings, capped at 200 — the saved-report store's own ceiling
 * for a name (`server/utils/savedReports.js` MAX_STRING), so what the screen shows is always
 * what a save keeps.
 */
function fourText (arr) {
  const a = Array.isArray(arr) ? arr : []
  return STAGE_KEYS.map((_, i) => (typeof a[i] === 'string' ? a[i].trim().slice(0, 200) : ''))
}

/**
 * Normalise one owner from a partial body. A missing owner is an empty column, exactly
 * as a blank owner block on the sheet: it contributes zero to every total.
 */
function readOwner (raw) {
  const o = raw && typeof raw === 'object' ? raw : {}
  const stages = Array.isArray(o.stages) ? o.stages : []
  const duties = Array.isArray(o.duties) ? o.duties : []
  return {
    name: typeof o.name === 'string' ? o.name.trim().slice(0, 80) : '',
    incomes: four(o.incomes),
    stages: [0, 1, 2].map((i) => {
      const s = stages[i] && typeof stages[i] === 'object' ? stages[i] : {}
      return { weeklyHours: num(s.weeklyHours), leaveWeeks: num(s.leaveWeeks) }
    }),
    // The owner's own rows, in the order they arrived, capped at MAX_TASKS.
    duties: duties.slice(0, MAX_TASKS).map((raw) => {
      const d = raw && typeof raw === 'object' ? raw : {}
      return {
        task: typeof d.task === 'string' ? d.task.trim().slice(0, MAX_TASK_NAME) : '',
        now: num(d.now),
        focus: num(d.focus)
      }
    })
  }
}

function readOwners (inputs) {
  const raw = inputs && Array.isArray(inputs.owners) ? inputs.owners : DEFAULT_INPUTS.owners
  return raw.slice(0, MAX_OWNERS).map(readOwner)
}

function readYears (inputs) {
  const y = inputs && Array.isArray(inputs.years) ? inputs.years : DEFAULT_INPUTS.years
  return STAGE_KEYS.map((_, i) => Math.round(num(y[i])) || null)
}

/**
 * "Business Owners Data Entry".
 *
 * 🔴 BOTH "NOW" AND "FOCUS" HOURS ARE PRICED AT THE STAGE 1 WEEK. Every hours cell on
 * the sheet multiplies by that owner's row-7 figure (`F16 = $E$7*E16`, and the focus
 * column `H16 = $E$7*G16` too). There is no "now" hours row to use instead, so the split
 * shows how the SAME week would be spent differently. Ported as the sheet does it.
 *
 * @param {object} inputs  partial DEFAULT_INPUTS; `owners` and `years` are read
 * @returns {object} `{ years, owners[], totals }`
 */
function computeOwnerExpectations (inputs) {
  const owners = readOwners(inputs).map((o) => {
    const week = o.stages[0].weeklyHours //                              $E$7
    const duties = o.duties.map(d => ({
      task: d.task,
      now: d.now,
      nowHours: week * d.now, //                                        F16 = $E$7*E16
      focus: d.focus,
      focusHours: week * d.focus //                                     H16 = $E$7*G16
    }))
    return {
      name: o.name,
      incomes: o.incomes,
      stages: o.stages,
      duties,
      dutyTotals: { //                                                  row 27
        now: sum(duties.map(d => d.now)),
        nowHours: sum(duties.map(d => d.nowHours)),
        focus: sum(duties.map(d => d.focus)),
        focusHours: sum(duties.map(d => d.focusHours))
      }
    }
  })

  // Column AF: `=sum(E5:AB5)` and so on — every owner's figure on that row, added.
  const totals = {
    incomes: STAGE_KEYS.map((_, i) => sum(owners.map(o => o.incomes[i]))), // AF5, AF6, AF9, AF12
    weeklyHours: [0, 1, 2].map(i => sum(owners.map(o => o.stages[i].weeklyHours))), // AF7, AF10, AF13
    leaveWeeks: [0, 1, 2].map(i => sum(owners.map(o => o.stages[i].leaveWeeks))) //   AF8, AF11, AF14
  }

  return { years: readYears(inputs), owners, totals }
}

/**
 * "Business Development Stages" — the revenue each stage must reach to pay the owners
 * what they have said they want.
 *
 * @param {object} inputs  partial DEFAULT_INPUTS; `owners`, `years` and `development` are read
 * @returns {object} `{ years, stages[] }` — one entry per column E..H
 */
function computeDevelopmentStages (inputs) {
  const owners = computeOwnerExpectations(inputs)
  const d = inputs && inputs.development && typeof inputs.development === 'object'
    ? inputs.development
    : DEFAULT_INPUTS.development

  const cols = {
    owners: four(d.owners),
    cogs: four(d.cogs),
    salesPromo: four(d.salesPromo),
    fixedCosts: four(d.fixedCosts),
    loanPayments: four(d.loanPayments),
    depreciation: four(d.depreciation),
    totalAssets: four(d.totalAssets),
    debt: four(d.debt),
    staffFullTime: four(d.staffFullTime),
    staffPartTime: four(d.staffPartTime)
  }
  const words = {
    premises: fourText(d.premises),
    markets: fourText(d.markets),
    coreServices: fourText(d.coreServices),
    skills: fourText(d.skills)
  }

  const stages = STAGE_KEYS.map((key, i) => {
    const netProfit = owners.totals.incomes[i] //                        E21 = owners!AF5
    const totalGrossProfit = netProfit + cols.depreciation[i] + cols.loanPayments[i] + cols.fixedCosts[i] // E15
    const grossProfit = totalGrossProfit + cols.salesPromo[i] //           E10 = E15+E13
    const revenue = cols.cogs[i] + grossProfit //                          E6  = E8+E10
    return {
      key,
      year: owners.years[i],
      owners: cols.owners[i],
      revenue,
      cogs: cols.cogs[i],
      cogsPct: div(cols.cogs[i], revenue), //                              E7
      grossProfit,
      salesPromo: cols.salesPromo[i],
      salesPromoPct: div(cols.salesPromo[i], revenue), //                  E12
      totalGrossProfit,
      fixedCosts: cols.fixedCosts[i],
      loanPayments: cols.loanPayments[i],
      depreciation: cols.depreciation[i],
      fixedCostsPct: div(cols.fixedCosts[i] + cols.loanPayments[i] + cols.depreciation[i], revenue), // E20
      netProfit,
      netProfitPct: div(netProfit, revenue), //                            E22
      totalAssets: cols.totalAssets[i],
      debt: cols.debt[i],
      equity: cols.totalAssets[i] - cols.debt[i],
      // 🔴 FIXED (Mike, 2026-09-24): debt ÷ EQUITY, as the row's heading says. The workbook's
      // E26 is E25/E24, debt ÷ total assets — 40.3% on its sample where the truth is 67.5%. With no equity left — debt at or above
      // the assets — the ratio has no meaning and is null, which the screen shows as a dash.
      debtRatio: debtToEquity(cols.debt[i], cols.totalAssets[i]),
      staffFullTime: cols.staffFullTime[i],
      staffPartTime: cols.staffPartTime[i],
      premises: words.premises[i],
      markets: words.markets[i],
      coreServices: words.coreServices[i],
      skills: words.skills[i]
    }
  })

  return { years: owners.years, stages }
}

/**
 * The Quick Calculator. Its three outputs read only the first twelve months of the
 * `Interest Calcs` worksheet.
 *
 * 🔴 FIXED (Mike, 2026-09-24): THE MONTHLY REPAYMENT FOLLOWS THE LOAN TYPE. The workbook's
 * `M10` reads `'Interest Calcs'!C23` — `PMT(...)`, the Table instalment — whatever the type,
 * while its other two outputs switch on it. A Reducing loan has no single instalment: the
 * principal is level and the interest falls, so the repayment is highest in month one. This
 * shows that first month, `'Interest Calcs'!K30` — the Loan Estimator's own choice for the
 * same loan type (`payments.reducingFirstMonth`).
 *
 * @param {object} inputs  partial DEFAULT_INPUTS; `loan` is read
 * @returns {object} `{ amount, rate, termMonths, type, yearOneInterest, monthlyRepayment, annualRepayment }`
 */
function computeQuickLoan (inputs) {
  const l = inputs && inputs.loan && typeof inputs.loan === 'object' ? inputs.loan : DEFAULT_INPUTS.loan
  const amount = Math.max(0, num(l.amount)) //                           P12 → C21 (deposit C15 = 0)
  const rate = num(l.rate) //                                            P13
  const termMonths = Math.max(0, Math.round(num(l.termMonths))) //       P15
  const type = l.type === 'Reducing' ? 'Reducing' : 'Table' //            P17
  const monthlyRate = rate / 12
  const schedule = amortise(type === 'Reducing', amount, monthlyRate, termMonths, 1)
  return {
    amount,
    rate,
    termMonths,
    type,
    yearOneInterest: schedule.annualInterest[0], //                      M8  (E30:E41 or M30:M41)
    monthlyRepayment: !termMonths
      ? 0
      : type === 'Reducing'
        ? amount / termMonths + amount * monthlyRate //                  K30 = L30 + M30
        : annuityPayment(monthlyRate, termMonths, amount), //           C23
    annualRepayment: schedule.annualInterest[0] + schedule.annualPrincipal[0] // P18 (C30:C41 or K30:K41)
  }
}

/**
 * The whole workbook in one call — what the screen's route returns. One model, two
 * steps, on Mike's ruling of 2026-09-24: the owners' incomes are typed once and carry
 * straight into the stages, exactly as the workbook links its two sheets.
 *
 * @param {object} [inputs] partial DEFAULT_INPUTS
 * @returns {object} `{ years, owners{}, development{}, loan{} }`
 */
/**
 * Debt ÷ equity, where equity is total assets less debt. Null when there is no equity:
 * dividing by zero or a negative would print a number that means nothing.
 */
function debtToEquity (debt, totalAssets) {
  const equity = totalAssets - debt
  return equity > 0 ? debt / equity : null
}

function computeOwnerExpectationsModel (inputs) {
  const i = inputs && typeof inputs === 'object' ? inputs : DEFAULT_INPUTS
  const owners = computeOwnerExpectations(i)
  return {
    years: owners.years,
    owners,
    development: computeDevelopmentStages(i),
    loan: computeQuickLoan(i)
  }
}

module.exports = {
  DEFAULT_INPUTS,
  computeOwnerExpectationsModel,
  MAX_TASKS,
  STAGE_KEYS,
  MAX_OWNERS,
  computeOwnerExpectations,
  computeDevelopmentStages,
  computeQuickLoan
}
