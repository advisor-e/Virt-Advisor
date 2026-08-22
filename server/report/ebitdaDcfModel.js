'use strict'

/**
 * EBITDA & DCF Valuation model — calculation engine (the second Report-class model).
 *
 * Faithful port of `EBITDA Model.xlsx` ("EBITDA Calcs" + "Discounted Cashflow"),
 * validated against 96 golden cells (see the test). Three owner rulings shape it
 * (2026-07-17, plan decision log):
 *   - The two #REF!-broken remnants do NOT port: the Interest Calcs sheet (needs the
 *     deleted 'Purchase Data' sheet) and the Margin-of-Error / Capitalised-Earnings
 *     side workings (need the deleted 'Assumptions' sheet).
 *   - The listed-company block (assessed vs market share price) IS in scope.
 *   - The source's own conventions port exactly: each future year is discounted ONCE
 *     at that year's rate (not compounded), and the first projection falls back to the
 *     second-latest year when the latest EBITDA is blank/zero (sheet cell K28).
 *
 * All per-year arrays run OLDEST-FIRST (2021..2025 in the sample) — the Discounted
 * Cashflow sheet's own orientation. The screen may display latest-first; that is a
 * display concern.
 *
 * Where the source sheet would emit a division-by-zero (a growth rate on a zero prior
 * year, a share price with zero shares), this engine returns `null`, never a fabricated
 * 0 — per the honesty defaults. The sheet's own explicit zero-guards (gross-profit % on
 * zero sales) port as written: they return 0 because the sheet says so.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/**
 * Coerce to a finite number; accepts JSON-string numbers ("2"); junk or absent
 * falls back to the supplied default (the source sheet's sample figure).
 * @param {*} v @param {number} def @returns {number}
 */
function pick (v, def) {
  if (!usable(v)) { return def }
  return typeof v === 'number' ? v : parseFloat(v)
}

/**
 * Can this value be used as a figure? (The single source of truth pick() decides by —
 * and the R8 defaulted-inputs echo audits by. Keep them in lockstep.)
 * @param {*} v @returns {boolean}
 */
function usable (v) {
  if (typeof v === 'number') { return Number.isFinite(v) }
  if (v === null || v === undefined || v === '') { return false }
  return Number.isFinite(parseFloat(v))
}

/**
 * Coerce a per-year array over its default, tracking per-index whether the figure came
 * from the input or fell back (R8: the flags travel WITH the values through any later
 * padding/trim so the echo can never drift from the maths).
 * @param {*} arr @param {number[]} def @returns {{values:number[], fromInput:boolean[]}}
 */
function coerceSeries (arr, def) {
  const src = Array.isArray(arr) && arr.length >= 2 && arr.length <= 5 ? arr : null
  const n = src ? src.length : def.length
  const values = []
  const fromInput = []
  for (let i = 0; i < n; i++) {
    const v = src ? src[i] : undefined
    fromInput.push(usable(v))
    values.push(pick(v, def[i % def.length]))
  }
  return { values, fromInput }
}

/**
 * Coerce a per-year array over its default: result length = default's length unless the
 * caller sends a shorter/longer VALID array (2..5 entries), letting the model adapt to
 * however many periods the advisor actually has. Junk entries fall back per-index.
 * When `name`+`defaulted` are given, fallen-back indices are echoed as "name[i]" (R8).
 * @param {*} arr @param {number[]} def @param {string} [name] @param {string[]} [defaulted] @returns {number[]}
 */
function pickSeries (arr, def, name, defaulted) {
  const s = coerceSeries(arr, def)
  if (name && defaulted) {
    s.fromInput.forEach((ok, idx) => { if (!ok) { defaulted.push(name + '[' + idx + ']') } })
  }
  return s.values
}

/**
 * The source workbook's own sample figures ("Bob's" business) — the defaults every
 * input merges over, and the fixture the golden tests run against.
 * Per-year arrays are OLDEST-FIRST: [2021, 2022, 2023, 2024, 2025].
 */
const DEFAULTS = {
  latestYear: 2025,
  sales: [1014578, 1457890, 3545789, 4656897, 6809564],
  costOfSales: [765324, 856327, 2597414, 3856457, 5554687],
  operatingExpenses: [185633, 365214, 349652, 345786, 895366], // incl' shareholder salary
  sundry: {
    otherIncome: [3500, 15247, 12564, 7800, 64600],
    badDebtsRecovered: [0, 0, 0, 0, 0],
    interestReceived: [0, 365, 789, 489, 563],
    dividendsReceived: [0, 0, 0, 0, 0]
  },
  addBacks: {
    managementFees: [0, 0, 0, 0, 0], // to related parties
    loanInterestPaid: [9800, 10500, 13000, 11000, 74121],
    consentCosts: [0, 0, 0, 0, 0], // one-off resource consents
    extraordinaryItems: [0, 0, 0, 0, 0],
    establishmentCosts: [0, 0, 0, 0, 0],
    shareholderSalaries: [187500, 187500, 187500, 187500, 187500],
    insuranceRetirement: [7500, 7500, 7500, 7500, 7500],
    ownersVehicles: [16000, 16000, 16000, 16000, 16000],
    leaseholdImprovements: [15000, 15000, 15000, 15000, 15000], // relating to other $ periods
    assetUpgrades: [0, 0, 0, 0, 0], // working assets, relating to other $ periods
    other3: [0, 0, 0, 0, 0],
    other4: [0, 0, 0, 0, 0],
    other5: [0, 0, 0, 0, 0]
  },
  fairMarket: { // the replacement-manager package that goes back in
    salaries: [140000, 140000, 140000, 140000, 140000],
    insuranceRetirement: [2500, 2500, 2500, 2500, 2500],
    vehicles: [9000, 9000, 9000, 9000, 9000],
    fringeBenefits: [1500, 1500, 1500, 1500, 1500]
  },
  dcf: { // future years, oldest-first (2026..2030)
    projectedGrowth: [0.04, 0.06, 0.05, 0.03, 0.04],
    discountRates: [0.06, 0.07, 0.05, 0.05, 0.06],
    exitMultiple: 2
  },
  listed: { // the listed-company lens (sheet rows 20-32); EBITDA in figures-multiple units
    sharesIssued: 3234978616,
    sharePrice: 0.59,
    ebitdaHistory: [-37.3, -307.6, 861.7, 548.9, 0], // 2025 blank in the sample -> 0
    projectedGrowth: [0.04, 0.03, 0.02, 0.03, 0.04],
    discountRates: [0.06, 0.07, 0.05, 0.05, 0.06],
    exitMultiple: 0.25,
    figuresMultiple: 1000000
  }
}

/** Sum the same index across every series of a keyed group. @param {object} group @param {number} i */
function acrossAt (group, i) {
  let total = 0
  for (const key of Object.keys(group)) { total += group[key][i] }
  return total
}

/**
 * Coerce a keyed group of per-year series over its defaults, all to `n` periods.
 * When `groupName`+`defaulted` are given, fallen-back FINAL positions are echoed as
 * "group.key[i]" ("key[i]" for a blank groupName) — the flags are padded/trimmed in
 * lockstep with the values, so a padded oldest year is correctly reported (R8).
 */
function pickGroup (input, def, n, groupName, defaulted) {
  const out = {}
  const src = (input && typeof input === 'object') ? input : {}
  for (const key of Object.keys(def)) {
    const s = coerceSeries(src[key], def[key])
    const series = s.values
    const flags = s.fromInput
    // hold every series in the group to the P&L's period count
    while (series.length < n) { series.unshift(def[key][0]); flags.unshift(false) }
    out[key] = series.slice(series.length - n)
    if (defaulted && groupName !== undefined) {
      const prefix = groupName ? groupName + '.' + key : key
      flags.slice(flags.length - n).forEach((ok, idx) => {
        if (!ok) { defaulted.push(prefix + '[' + idx + ']') }
      })
    }
  }
  return out
}

/**
 * The grow-then-discount projection engine shared by both DCF blocks.
 * Source convention (ported exactly): projected = prev + prev*growth;
 * discounted = projected - projected*rate (a single discount, not compounded).
 *
 * @param {number} seed - the EBITDA the first future year grows from.
 * @param {number[]} growth - 5 projected growth rates (fractions), oldest-first.
 * @param {number[]} rates - 5 discount rates (fractions), oldest-first.
 * @returns {{projected:number[], discounted:number[], sumDiscounted:number}}
 */
function project (seed, growth, rates) {
  const projected = []
  const discounted = []
  let prev = seed
  for (let i = 0; i < growth.length; i++) {
    prev = prev + prev * growth[i]
    projected.push(prev)
    discounted.push(prev - prev * rates[i])
  }
  return { projected, discounted, sumDiscounted: discounted.reduce((a, b) => a + b, 0) }
}

/**
 * Year-on-year growth rates for a history series. A zero prior year has no defined
 * growth: that entry is `null` (the sheet would show #DIV/0!) and is excluded from
 * the average — never a fabricated figure.
 * @param {number[]} history - oldest-first.
 * @returns {{rates:Array<number|null>, count:number, average:number|null}}
 */
function growthRates (history) {
  const rates = []
  let sum = 0
  let count = 0
  for (let i = 1; i < history.length; i++) {
    if (history[i - 1] === 0) { rates.push(null); continue }
    const rate = (history[i] - history[i - 1]) / history[i - 1]
    rates.push(rate)
    sum += rate
    count++
  }
  return { rates, count, average: count > 0 ? sum / count : null }
}

/**
 * Compute the full EBITDA & DCF valuation from partial inputs merged over the
 * source-sheet defaults. All per-year arrays oldest-first.
 *
 * @param {object} inputs - any subset of the DEFAULTS shape above.
 * @returns {object} {
 *   years,                                   // e.g. [2021..2025]
 *   defaultedInputs,                         // R8: input paths that computed on a sample default, e.g. "costOfSales[0]", "listed.sharePrice"
 *   periodCount,                             // sheet AB6: years with sales > 1
 *   pnl: {                                   // EBITDA Calcs rows, one entry per year
 *     grossProfit, grossProfitPct,           // rows 12, 13 (pct is 0 on zero sales — the sheet's own guard)
 *     netOperatingProfit, operatingExpensePct, // rows 16, 17
 *     sundrySubtotal, netProfitBeforeTax,    // rows 24, 25
 *     addBackSubtotal, ebpitda,              // rows 41, 43 (Owners Discretionary Cash Flow)
 *     ownerBenefitsSubtotal, ebitda          // rows 51, 53 (normalised EBITDA)
 *   },
 *   valuation: {                             // Discounted Cashflow rows 7-16
 *     futureYears,                           // e.g. [2026..2030]
 *     actualGrowth, actualGrowthCount, averageActualGrowth, // rows 13, E8, I15 (null entries = zero prior year)
 *     projectedEbitda, discountedCashFlow,   // rows 12 (future), 9
 *     sumDiscounted, terminalValue, enterpriseValue // O7, Q7, Q5
 *   },
 *   listed: {                                // Discounted Cashflow rows 20-32
 *     marketCap,                             // G20
 *     actualGrowth, actualGrowthCount, averageActualGrowth, // rows 29, E24, I31
 *     projectedEbitda, discountedCashFlow,   // rows 28 (future), 25 — in figures-multiple units
 *     sumDiscounted, terminalValue,          // O23, Q23 (terminal in currency)
 *     calculatedEnterpriseValue,             // Q21
 *     assessedSharePrice,                    // N21; null when sharesIssued is 0
 *     currentSharePrice
 *   }
 * }
 */
function computeEbitdaDcf (inputs) {
  const i = (inputs && typeof inputs === 'object') ? inputs : {}
  // R8 ruling (Mike, 2026-07-19): defaults may substitute, but NEVER silently — every
  // figure that fell back to a sample value is named in defaultedInputs.
  const defaulted = []
  /** Scalar pick with the R8 echo. @param {string} name @param {*} v @param {number} def */
  const p = (name, v, def) => {
    if (!usable(v)) { defaulted.push(name) }
    return pick(v, def)
  }

  // ---- P&L Review (EBITDA Calcs) ----
  const sales = pickSeries(i.sales, DEFAULTS.sales, 'sales', defaulted)
  const n = sales.length
  const costOfSales = pickGroup({ costOfSales: i.costOfSales }, { costOfSales: DEFAULTS.costOfSales }, n, '', defaulted).costOfSales
  const operatingExpenses = pickGroup({ operatingExpenses: i.operatingExpenses }, { operatingExpenses: DEFAULTS.operatingExpenses }, n, '', defaulted).operatingExpenses
  const sundry = pickGroup(i.sundry, DEFAULTS.sundry, n, 'sundry', defaulted)
  const addBacks = pickGroup(i.addBacks, DEFAULTS.addBacks, n, 'addBacks', defaulted)
  const fairMarket = pickGroup(i.fairMarket, DEFAULTS.fairMarket, n, 'fairMarket', defaulted)

  const latestYear = Math.round(p('latestYear', i.latestYear, DEFAULTS.latestYear))
  const years = []
  for (let y = 0; y < n; y++) { years.push(latestYear - (n - 1) + y) }

  let periodCount = 0
  const pnl = {
    grossProfit: [],
    grossProfitPct: [],
    netOperatingProfit: [],
    operatingExpensePct: [],
    sundrySubtotal: [],
    netProfitBeforeTax: [],
    addBackSubtotal: [],
    ebpitda: [],
    ownerBenefitsSubtotal: [],
    ebitda: []
  }
  for (let y = 0; y < n; y++) {
    if (sales[y] > 1) { periodCount++ } // sheet AB6: countif(">1")
    const gross = sales[y] - costOfSales[y]
    const nop = gross - operatingExpenses[y]
    const sundrySub = acrossAt(sundry, y)
    const npbt = nop + sundrySub
    const addBackSub = acrossAt(addBacks, y)
    const ebpitda = npbt + addBackSub
    const ownerSub = acrossAt(fairMarket, y)
    pnl.grossProfit.push(gross)
    pnl.grossProfitPct.push(sales[y] === 0 ? 0 : gross / sales[y]) // sheet's own zero-guard
    pnl.netOperatingProfit.push(nop)
    pnl.operatingExpensePct.push(sales[y] === 0 ? 0 : operatingExpenses[y] / sales[y])
    pnl.sundrySubtotal.push(sundrySub)
    pnl.netProfitBeforeTax.push(npbt)
    pnl.addBackSubtotal.push(addBackSub)
    pnl.ebpitda.push(ebpitda)
    pnl.ownerBenefitsSubtotal.push(ownerSub)
    pnl.ebitda.push(ebpitda - ownerSub)
  }

  // ---- DCF block 1: the private-business valuation ----
  const dcfIn = (i.dcf && typeof i.dcf === 'object') ? i.dcf : {}
  const projectedGrowth = pickSeries(dcfIn.projectedGrowth, DEFAULTS.dcf.projectedGrowth, 'dcf.projectedGrowth', defaulted)
  const discountRates = pickSeries(dcfIn.discountRates, DEFAULTS.dcf.discountRates, 'dcf.discountRates', defaulted)
  // R5: project() reads rates[i] per growth year — a length mismatch would turn the
  // valuation into NaN→null, indistinguishable from an honest "won't fabricate" null.
  // Refuse loudly (the route's catch returns the standard safe 400) rather than pad
  // with sample rates, which is the R8 fabrication channel.
  if (projectedGrowth.length !== discountRates.length) {
    throw new Error('projectedGrowth and discountRates must cover the same number of years')
  }
  const exitMultiple = p('dcf.exitMultiple', dcfIn.exitMultiple, DEFAULTS.dcf.exitMultiple)

  const growth1 = growthRates(pnl.ebitda)
  const proj1 = project(pnl.ebitda[n - 1], projectedGrowth, discountRates)
  const terminalValue = proj1.discounted[proj1.discounted.length - 1] * exitMultiple
  const futureYears = []
  for (let y = 1; y <= projectedGrowth.length; y++) { futureYears.push(latestYear + y) }

  // The two readings the Coach panel gives beyond the headline figures: the first year
  // earnings went backwards, and how much of the valuation rests on the exit multiple.
  //
  // 🔴 BOTH LIVED IN `components/EbitdaDcfReport.vue`'s `coachText` UNTIL 2026-08-22 and
  // were moved here for to-do item 4.34, on the same reasoning as the working-capital
  // what-if: the Model Guide quotes this reading, so the figure needs one home. The
  // growth rates are year-on-year, so rate[i] describes the step INTO years[i + 1] —
  // that off-by-one is the reason this is worth owning in one place.
  const dipIndex = growth1.rates.findIndex(g => g !== null && g < 0)
  const enterpriseValue = proj1.sumDiscounted + terminalValue
  const dipYear = dipIndex === -1 ? null : years[dipIndex + 1]
  const dipGrowth = dipIndex === -1 ? null : growth1.rates[dipIndex]
  // A non-positive valuation is a real outcome the screen has its own words for; a share
  // "of" nothing would be a fabricated ratio, so it is null rather than 0.
  const terminalShare = enterpriseValue > 0 ? terminalValue / enterpriseValue : null

  // ---- DCF block 2: the listed-company lens ----
  const listedIn = (i.listed && typeof i.listed === 'object') ? i.listed : {}
  const sharesIssued = p('listed.sharesIssued', listedIn.sharesIssued, DEFAULTS.listed.sharesIssued)
  const sharePrice = p('listed.sharePrice', listedIn.sharePrice, DEFAULTS.listed.sharePrice)
  const ebitdaHistory = pickSeries(listedIn.ebitdaHistory, DEFAULTS.listed.ebitdaHistory, 'listed.ebitdaHistory', defaulted)
  const listedGrowth = pickSeries(listedIn.projectedGrowth, DEFAULTS.listed.projectedGrowth, 'listed.projectedGrowth', defaulted)
  const listedRates = pickSeries(listedIn.discountRates, DEFAULTS.listed.discountRates, 'listed.discountRates', defaulted)
  // Same R5 guard as the private-business block above
  if (listedGrowth.length !== listedRates.length) {
    throw new Error('listed projectedGrowth and discountRates must cover the same number of years')
  }
  const listedMultiple = p('listed.exitMultiple', listedIn.exitMultiple, DEFAULTS.listed.exitMultiple)
  const figuresMultiple = p('listed.figuresMultiple', listedIn.figuresMultiple, DEFAULTS.listed.figuresMultiple)

  const growth2 = growthRates(ebitdaHistory)
  // Sheet K28 fallback, ported exactly: a blank/zero latest year seeds from the year before
  const last = ebitdaHistory[ebitdaHistory.length - 1]
  const seed = last === 0 ? ebitdaHistory[ebitdaHistory.length - 2] : last
  const proj2 = project(seed, listedGrowth, listedRates)
  const listedTerminal = (proj2.discounted[proj2.discounted.length - 1] * listedMultiple) * figuresMultiple
  const calculatedEV = proj2.sumDiscounted * figuresMultiple + listedTerminal

  return {
    years,
    periodCount,
    // R8: every figure that computed on a sample default rather than a supplied value
    defaultedInputs: defaulted,
    pnl,
    valuation: {
      futureYears,
      actualGrowth: growth1.rates,
      actualGrowthCount: growth1.count,
      averageActualGrowth: growth1.average,
      projectedEbitda: proj1.projected,
      discountedCashFlow: proj1.discounted,
      sumDiscounted: proj1.sumDiscounted,
      terminalValue,
      enterpriseValue,
      // The Coach panel's two extra readings — see the note above. `exitMultiple` is
      // echoed back because the sentence quotes it and the reader would otherwise have to
      // keep its own copy of the input.
      exitMultiple,
      dipYear,
      dipGrowth,
      terminalShare
    },
    listed: {
      marketCap: sharesIssued * sharePrice,
      actualGrowth: growth2.rates,
      actualGrowthCount: growth2.count,
      averageActualGrowth: growth2.average,
      projectedEbitda: proj2.projected,
      discountedCashFlow: proj2.discounted,
      sumDiscounted: proj2.sumDiscounted,
      terminalValue: listedTerminal,
      calculatedEnterpriseValue: calculatedEV,
      assessedSharePrice: sharesIssued > 0 ? calculatedEV / sharesIssued : null,
      currentSharePrice: sharePrice
    }
  }
}

module.exports = { computeEbitdaDcf, DEFAULTS }
