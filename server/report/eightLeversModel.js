'use strict'

/**
 * 8 Levers model — calculation engine.
 *
 * Faithful port of `GE.2b.8 Levers Model.xlsx` — ALL THREE sheets, every stage:
 *
 *   1. `Calculations`     — the trading position: a 5-line product/labour mix rolled up to an
 *                           average margin, a scenario re-price of that mix, the activity-cost
 *                           build-up, and a labour-productivity sub-model (chargeable workers,
 *                           leave lost, charge-out rate vs. actual pay rate).
 *   2. `Scenarios`        — "Combination of Calc' based & Assumption Variables": the CURRENT
 *                           column is back-solved from the real trading revenue in
 *                           `Calculations`; Options B and C are built forward from funnel
 *                           assumptions.
 *   3. `Broad Scenarios`  — all three columns built forward from the funnel (no trading data).
 *
 * The lever chain: Market Size → Foot Traffic → Prospects → Customers → Average Spend →
 * Average Frequency → Revenue → Margin → Activity Costs → Fixed Costs → Profit. The teaching
 * point is that small nudges to each lever compound, and the model shows which lever pays best.
 *
 * FIDELITY NOTES — reproduced exactly as the source has them, NOT "corrected":
 *
 *   - The `Sales Margin` row on the Scenarios sheets (`Calculations!H33`, cell F16) actually
 *     carries **cost of sales**, not margin — `F33 = H18 = costOfSales / tradingIncome`. The
 *     arithmetic downstream is consistent with that (`F39 = revenue − costOfSales − activity −
 *     fixed`), so the label is loose but the maths is right. Ported as-is.
 *   - The two scenario sheets have DIFFERENT input values for the same-named levers (e.g.
 *     average frequency is 2 on `Scenarios`, 3 on `Broad Scenarios`; Option C's margin is 38%
 *     vs 45%). They are genuinely separate scenario sets, so both are reproduced.
 *   - **KNOWN ODDITY ON THE `Scenarios` SHEET — reproduced, NOT repaired.** Its Current column
 *     is anchored to the `Calculations` revenue (880,000) while Options B and C are built forward
 *     from the funnel (64,745 / 23,400) — two different scales, so the sheet's own "profit
 *     increase" comes out at −277,075. The golden test asserts that number. Whether this is a
 *     genuine defect or a misreading of the teaching intent is an OPEN QUESTION for the owner
 *     (`design/ACTIONS.md`); it is not ours to decide.
 *
 * **THESE FIGURES ARE NOT ANYONE'S ACCOUNTS.** Every number in the workbook — including the
 * 880,000 "Trading Income" on the `Calculations` sheet — is an illustrative teaching figure. This
 * is an Education-class model: it takes no client data, imports no files, and nothing here should
 * ever be presented as a description of a real business.
 *
 * Class: **Education** (see `design/MODEL-CLASSIFICATION.md`) — illustrative figures, no client
 * data, no file intake, no scrubbing.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/**
 * Coerce a value to a finite number (accepts JSON-string numbers), else the fallback.
 * The route receives raw JSON, so a numeric field arriving as text must not string-concatenate.
 * @param {*} v
 * @param {number} [fallback]
 * @returns {number}
 */
function num (v, fallback) {
  if (fallback === undefined) { fallback = 0 }
  if (typeof v === 'number') { return Number.isFinite(v) ? v : fallback }
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

/** Guard every division in the model: a zero denominator yields 0, never NaN/Infinity. */
function div (a, b) {
  return b ? a / b : 0
}

/**
 * `Calculations` D6:H10 — the product/labour mix (current), and Q4:Y12 — the same mix under a
 * scenario sales lift and re-priced margin.
 */
const DEFAULT_MIX = [
  { name: 'Product 1', sales: 250000, marginPct: 0.32, liftPct: 0.03, scenarioMarginPct: 0.34 }, // r6
  { name: 'Product 2', sales: 375000, marginPct: 0.65, liftPct: 0.05, scenarioMarginPct: 0.65 }, // r7
  { name: 'Product 3', sales: 145000, marginPct: 0.87, liftPct: 0.08, scenarioMarginPct: 0.89 }, // r8
  { name: 'Labour 1', sales: 65000, marginPct: 0.33, liftPct: 0.02, scenarioMarginPct: 0.35 }, // r9
  { name: 'Labour 2', sales: 45000, marginPct: 0.40, liftPct: 0.04, scenarioMarginPct: 0.45 } //  r10
]

/** `Calculations` L20:N25 — the (sales) activity-cost build-up. */
const DEFAULT_ACTIVITY_COSTS = [
  { name: 'Advertising', amount: 4500 }, // N20
  { name: 'Branding', amount: 2600 }, // N21
  { name: 'Sales Material', amount: 1750 }, // N22
  { name: 'Sales rep expenses', amount: 3750 }, // N23
  { name: 'Other 1', amount: 5 }, // N24
  { name: 'Other 2', amount: 7 } //   N25
]

/** `Calculations` D16:F20 — the trading position, and Q26:U38 — the labour-productivity model. */
const DEFAULT_TRADING = {
  tradingIncome: 880000, // F16
  costOfSales: 476325, // F18
  operatingExpenses: 127895 // F20
}

const DEFAULT_LABOUR = {
  totalWages: 197456, // W26 — total annual wages / salaries / drawings
  workers: 3, // W28 — full-time chargeable workers
  weeksAnnualLeave: 4, // U30
  sickAndPublicHolidayDays: 22, // U32
  weeklyHours: 40, // U34
  hourlyChargeOutRate: 67.5, // U36
  productivityPct: 0.85 // U38 — estimated chargeable %
}

/**
 * `Scenarios` sheet. The CURRENT column back-solves the funnel from real revenue:
 *   customers  = revenue / (spend × frequency)   (F9)
 *   prospects  = customers / prospectConversion  (F8)
 *   footTraffic= prospects / footTrafficPct      (F7)
 */
const DEFAULT_SCENARIOS_CURRENT = {
  marketSize: 32500, // F5
  footTrafficToProspectPct: 0.40, // H7
  prospectsConvertedPct: 0.25, // H8
  averageSpend: 215, // F11
  averageFrequency: 2 // F12
}

/** `Scenarios` Option B (P/R columns) and Option C (Z/AB columns) — built FORWARD. */
const DEFAULT_SCENARIOS_OPTION_B = {
  footTrafficPct: 0.12, // R7
  prospectsPct: 0.11, // R8
  customersPct: 0.22, // R9
  averageSpend: 280, // P11
  averageFrequency: 2.45, // P12
  marginPct: 0.35, // R16
  activityCostPct: 0.09, // R17
  fixedCostPct: 0.28 // R18
}

const DEFAULT_SCENARIOS_OPTION_C = {
  footTrafficPct: 0.09, // AB7
  prospectsPct: 0.08, // AB8
  customersPct: 0.20, // AB9
  averageSpend: 250, // Z11
  averageFrequency: 2, // Z12
  marginPct: 0.38, // AB16
  activityCostPct: 0.05, // AB17
  fixedCostPct: 0.25 // AB18
}

/**
 * `Broad Scenarios` sheet — all three columns built forward from the funnel. NB the same-named
 * levers carry DIFFERENT values here than on `Scenarios`; this is the source's own doing.
 */
const DEFAULT_BROAD_CURRENT = {
  marketSize: 32500, // F5
  footTrafficPct: 0.09, // H7
  prospectsPct: 0.07, // H8
  customersPct: 0.25, // H9
  averageSpend: 215, // F11
  averageFrequency: 3, // F12
  marginPct: 0.36, // H16
  activityCostPct: 0.07, // H17
  fixedCostPct: 0.25 // H18
}

const DEFAULT_BROAD_OPTION_B = {
  footTrafficPct: 0.12, // R7
  prospectsPct: 0.11, // R8
  customersPct: 0.22, // R9
  averageSpend: 280, // P11
  averageFrequency: 2.45, // P12
  marginPct: 0.40, // R16
  activityCostPct: 0.09, // R17
  fixedCostPct: 0.28 // R18
}

const DEFAULT_BROAD_OPTION_C = {
  footTrafficPct: 0.09, // AB7
  prospectsPct: 0.08, // AB8
  customersPct: 0.20, // AB9
  averageSpend: 250, // Z11
  averageFrequency: 2.75, // Z12
  marginPct: 0.45, // AB16
  activityCostPct: 0.05, // AB17
  fixedCostPct: 0.25 // AB18
}

const DEFAULT_INPUTS = {
  mix: DEFAULT_MIX.map(m => Object.assign({}, m)),
  activityCosts: DEFAULT_ACTIVITY_COSTS.map(a => Object.assign({}, a)),
  trading: Object.assign({}, DEFAULT_TRADING),
  labour: Object.assign({}, DEFAULT_LABOUR),
  scenarios: {
    current: Object.assign({}, DEFAULT_SCENARIOS_CURRENT),
    optionB: Object.assign({}, DEFAULT_SCENARIOS_OPTION_B),
    optionC: Object.assign({}, DEFAULT_SCENARIOS_OPTION_C)
  },
  broad: {
    current: Object.assign({}, DEFAULT_BROAD_CURRENT),
    optionB: Object.assign({}, DEFAULT_BROAD_OPTION_B),
    optionC: Object.assign({}, DEFAULT_BROAD_OPTION_C)
  }
}

/**
 * Sheet 1 — `Calculations`.
 *
 * @param {object} [input] - { mix, activityCosts, trading, labour }
 * @returns {object} the trading position, the scenario re-price of the mix, and the labour model.
 */
function computeCalculations (input) {
  const i = input || {}
  const mixIn = Array.isArray(i.mix) ? i.mix : DEFAULT_MIX
  const costsIn = Array.isArray(i.activityCosts) ? i.activityCosts : DEFAULT_ACTIVITY_COSTS
  const t = Object.assign({}, DEFAULT_TRADING, i.trading || {})
  const l = Object.assign({}, DEFAULT_LABOUR, i.labour || {})

  // --- The product/labour mix: current (D6:J10) and scenario (Q6:Y10) ---
  const mix = mixIn.map((m) => {
    const sales = num(m.sales)
    const marginPct = num(m.marginPct)
    const liftPct = num(m.liftPct)
    const scenarioMarginPct = num(m.scenarioMarginPct)
    const scenarioSales = (sales * liftPct) + sales // U6 = (F6*S6)+F6
    return {
      name: String(m.name === undefined || m.name === null ? '' : m.name),
      sales,
      marginPct,
      contribution: sales * marginPct, // J6 = F6*H6
      liftPct,
      scenarioSales,
      scenarioMarginPct,
      scenarioContribution: scenarioSales * scenarioMarginPct // Y6 = U6*W6
    }
  })

  const totalSales = mix.reduce((s, m) => s + m.sales, 0) // F12
  const totalContribution = mix.reduce((s, m) => s + m.contribution, 0) // J12
  const averageMarginPct = div(totalContribution, totalSales) // H12 = J12/F12
  const scenarioTotalSales = mix.reduce((s, m) => s + m.scenarioSales, 0) // U12
  const scenarioTotalContribution = mix.reduce((s, m) => s + m.scenarioContribution, 0) // Y12
  const scenarioAverageMarginPct = div(scenarioTotalContribution, scenarioTotalSales) // W12
  const contributionGain = scenarioTotalContribution - totalContribution // Z13 = Y12-J12

  // --- The trading position (D16:H22) ---
  const tradingIncome = num(t.tradingIncome) // F16
  const costOfSales = num(t.costOfSales) // F18
  const operatingExpenses = num(t.operatingExpenses) // F20
  const costOfSalesPct = div(costOfSales, tradingIncome) // H18 — labelled "(avg margin)" in the source
  const operatingExpensesPct = div(operatingExpenses, tradingIncome) // H20
  const grossTaxableProfit = tradingIncome - costOfSales - operatingExpenses // F22
  const grossTaxableProfitPct = div(grossTaxableProfit, tradingIncome) // H22

  // --- Activity costs (L20:N27) ---
  const activityCosts = costsIn.map(c => ({
    name: String(c.name === undefined || c.name === null ? '' : c.name),
    amount: num(c.amount)
  }))
  const totalActivityCosts = activityCosts.reduce((s, c) => s + c.amount, 0) // N27

  // --- The restated P&L (D31:H39) ---
  const totalRevenue = tradingIncome // F31 = F16
  // F33 = H18 — the source labels this "Sales Margin %" but it holds the COST-of-sales ratio.
  const salesMarginPct = costOfSalesPct
  const salesMarginValue = totalRevenue * salesMarginPct // H33 — i.e. cost of sales
  const salesActivityCosts = totalActivityCosts // F35 = N27
  const salesActivityCostsPct = div(salesActivityCosts, totalRevenue) // H35
  const fixedCosts = operatingExpenses - salesActivityCosts // F37 = F20-F35
  const fixedCostsPct = div(fixedCosts, totalRevenue) // H37
  const restatedProfit = totalRevenue - salesMarginValue - salesActivityCosts - fixedCosts // F39
  const restatedProfitPct = div(restatedProfit, totalRevenue) // H39

  // --- Labour productivity (Q26:Y42) ---
  const totalWages = num(l.totalWages) // W26
  const workers = num(l.workers) // W28
  const weeksAnnualLeave = num(l.weeksAnnualLeave) // U30
  const sickAndPublicHolidayDays = num(l.sickAndPublicHolidayDays) // U32
  const weeklyHours = num(l.weeklyHours) // U34
  const hourlyChargeOutRate = num(l.hourlyChargeOutRate) // U36
  const productivityPct = num(l.productivityPct) // U38

  const wagePerWorker = div(totalWages, workers) // Y28 = W26/W28
  const effectiveWeeksLost = div(sickAndPublicHolidayDays, 7) + weeksAnnualLeave // W32 = (U32/7)+U30
  const weeklyChargePerWorker = (weeklyHours * hourlyChargeOutRate) * productivityPct // W38
  const estimatedLabourRevenue = (52 - effectiveWeeksLost) * weeklyChargePerWorker * workers // Y20
  const adjustedLabourMarginPct = 1 - div(totalWages, estimatedLabourRevenue) // Y22 = 100%-(W26/Y20)
  const weeklyWagePerWorker = div(wagePerWorker, 52) // W40 = Y28/52
  const hourlyPayRate = div(weeklyWagePerWorker, weeklyHours) // W42 = W40/U34
  const targetLabourMarginPct = 1 - div(hourlyPayRate, hourlyChargeOutRate) // W36 = 100%-(W42/U36)

  return {
    mix,
    totalSales,
    totalContribution,
    averageMarginPct,
    scenarioTotalSales,
    scenarioTotalContribution,
    scenarioAverageMarginPct,
    contributionGain,

    tradingIncome,
    costOfSales,
    costOfSalesPct,
    operatingExpenses,
    operatingExpensesPct,
    grossTaxableProfit,
    grossTaxableProfitPct,

    activityCosts,
    totalActivityCosts,

    totalRevenue,
    salesMarginPct,
    salesMarginValue,
    salesActivityCosts,
    salesActivityCostsPct,
    fixedCosts,
    fixedCostsPct,
    restatedProfit,
    restatedProfitPct,

    labour: {
      totalWages,
      workers,
      wagePerWorker,
      effectiveWeeksLost,
      weeklyChargePerWorker,
      estimatedLabourRevenue,
      adjustedLabourMarginPct,
      weeklyWagePerWorker,
      hourlyPayRate,
      hourlyChargeOutRate,
      targetLabourMarginPct
    }
  }
}

/**
 * A scenario column built FORWARD from the funnel — used by Options B and C on both sheets, and
 * by the Current column on `Broad Scenarios`.
 *
 * Chain: marketSize → footTraffic → prospects → customers → revenue → margin/costs → profit.
 * Total expenses follow the source: `(revenue − margin) + activity + fixed` — i.e. the cost of
 * sales is backed out of the margin.
 *
 * @param {number} marketSize
 * @param {object} s - { footTrafficPct, prospectsPct, customersPct, averageSpend,
 *                       averageFrequency, marginPct, activityCostPct, fixedCostPct }
 * @returns {object}
 */
function computeForwardColumn (marketSize, s) {
  const market = num(marketSize)
  const footTraffic = market * num(s.footTrafficPct) // P7 = P5*R7
  const prospects = footTraffic * num(s.prospectsPct) // P8 = P7*R8
  const customers = prospects * num(s.customersPct) // P9 = P8*R9
  const averageSpend = num(s.averageSpend)
  const averageFrequency = num(s.averageFrequency)
  const revenue = customers * averageSpend * averageFrequency // P14 = P9*P11*P12

  const marginPct = num(s.marginPct)
  const activityCostPct = num(s.activityCostPct)
  const fixedCostPct = num(s.fixedCostPct)
  const margin = revenue * marginPct // P16
  const activityCosts = revenue * activityCostPct // P17
  const fixedCosts = revenue * fixedCostPct // P18
  const totalExpenses = (revenue - margin) + activityCosts + fixedCosts // P20
  const profit = revenue - totalExpenses // P23

  return {
    marketSize: market,
    footTraffic,
    prospects,
    customers,
    averageSpend,
    averageFrequency,
    revenue,
    marginPct,
    margin,
    activityCostPct,
    activityCosts,
    fixedCostPct,
    fixedCosts,
    totalExpenses,
    profit,
    profitPct: div(profit, revenue)
  }
}

/**
 * Sheet 2 — `Scenarios` ("Combination of Calc' based & Assumption Variables").
 *
 * FAITHFUL PORT. The CURRENT column is anchored to the revenue on the `Calculations` sheet and
 * its funnel is BACK-SOLVED from it; Options B and C are built FORWARD from their own funnel
 * assumptions.
 *
 * ⚠️ **KNOWN ODDITY, REPRODUCED NOT REPAIRED.** The two halves of the sheet are authored at
 * different scales (current revenue 880,000 vs. Options B/C at 64,745 / 23,400), so the sheet's
 * own "profit increase" for Option B comes out at −277,075. That is the workbook's own cached
 * value and the golden test asserts it. Whether it is a genuine defect or a misreading of the
 * teaching intent is an open question for the owner — see `design/ACTIONS.md`. Reproducing the
 * model is the job; changing it is the owner's call, not ours.
 *
 * @param {object} calc - the output of computeCalculations()
 * @param {object} [input] - { current, optionB, optionC }
 * @returns {object}
 */
function computeScenarios (calc, input) {
  const i = input || {}
  const c = Object.assign({}, DEFAULT_SCENARIOS_CURRENT, i.current || {})
  const b = Object.assign({}, DEFAULT_SCENARIOS_OPTION_B, i.optionB || {})
  const cc = Object.assign({}, DEFAULT_SCENARIOS_OPTION_C, i.optionC || {})

  const marketSize = num(c.marketSize) // F5
  const averageSpend = num(c.averageSpend) // F11
  const averageFrequency = num(c.averageFrequency) // F12
  const footTrafficToProspectPct = num(c.footTrafficToProspectPct) // H7
  const prospectsConvertedPct = num(c.prospectsConvertedPct) // H8

  // Back-solve the funnel from the Calculations revenue (F14 = Calculations!F31).
  const revenue = calc.totalRevenue // F14
  const customers = div(revenue, averageSpend * averageFrequency) // F9 = F14/(F11*F12)
  const prospects = div(customers, prospectsConvertedPct) // F8 = F9/H8
  const footTraffic = div(prospects, footTrafficToProspectPct) // F7 = F8/H7
  const footTrafficConversionPct = div(footTraffic, marketSize) // H5 = F7/F5
  const customerConversionPct = div(customers, marketSize) // H9 = F9/F5

  // The cost lines come straight from Calculations (F16:F18) — note F16 holds COST of sales.
  const salesMargin = calc.salesMarginValue // F16 = Calculations!H33
  const activityCosts = calc.salesActivityCosts // F17 = Calculations!F35
  const fixedCosts = calc.fixedCosts // F18 = Calculations!F37
  const totalExpenses = salesMargin + activityCosts + fixedCosts // F20 = SUM(F16:F18)
  const profit = revenue - totalExpenses // F23
  const profitPct = div(profit, revenue) // H25

  const current = {
    marketSize,
    footTraffic,
    footTrafficConversionPct,
    prospects,
    prospectsConvertedPct,
    customers,
    customerConversionPct,
    averageSpend,
    averageFrequency,
    revenue,
    margin: salesMargin,
    marginPct: calc.salesMarginPct,
    activityCosts,
    activityCostPct: calc.salesActivityCostsPct,
    fixedCosts,
    fixedCostPct: calc.fixedCostsPct,
    totalExpenses,
    profit,
    profitPct
  }

  const optionB = computeForwardColumn(marketSize, b)
  const optionC = computeForwardColumn(marketSize, cc)

  return {
    current,
    optionB: Object.assign({}, optionB, {
      profitIncrease: optionB.profit - profit, // R24 = P23-F23
      profitIncreasePct: div(optionB.profit, profit) // R25 = P23/F23
    }),
    optionC: Object.assign({}, optionC, {
      profitIncrease: optionC.profit - profit, // AB24 = Z23-F23
      profitIncreasePct: div(optionC.profit, profit) // AB25 = Z23/F23
    })
  }
}

/**
 * Sheet 3 — `Broad Scenarios`. All three columns built forward from the funnel; no trading data.
 *
 * @param {object} [input] - { current, optionB, optionC }
 * @returns {object}
 */
function computeBroadScenarios (input) {
  const i = input || {}
  const c = Object.assign({}, DEFAULT_BROAD_CURRENT, i.current || {})
  const b = Object.assign({}, DEFAULT_BROAD_OPTION_B, i.optionB || {})
  const cc = Object.assign({}, DEFAULT_BROAD_OPTION_C, i.optionC || {})

  const marketSize = num(c.marketSize) // F5
  const current = computeForwardColumn(marketSize, c)
  const optionB = computeForwardColumn(marketSize, b)
  const optionC = computeForwardColumn(marketSize, cc)

  return {
    current,
    optionB: Object.assign({}, optionB, {
      profitIncrease: optionB.profit - current.profit, // R24
      profitIncreasePct: div(optionB.profit, current.profit) // R25
    }),
    optionC: Object.assign({}, optionC, {
      profitIncrease: optionC.profit - current.profit, // AB24
      profitIncreasePct: div(optionC.profit, current.profit) // AB25
    })
  }
}

/**
 * The whole model — all three sheets.
 *
 * @param {object} [input] - partial overrides merged over DEFAULT_INPUTS.
 * @returns {object} { calculations, scenarios, broadScenarios }
 */
function computeEightLevers (input) {
  const i = (input && typeof input === 'object') ? input : {}

  const calculations = computeCalculations({
    mix: i.mix,
    activityCosts: i.activityCosts,
    trading: i.trading,
    labour: i.labour
  })

  return {
    calculations,
    scenarios: computeScenarios(calculations, i.scenarios),
    broadScenarios: computeBroadScenarios(i.broad)
  }
}

module.exports = {
  DEFAULT_INPUTS,
  computeCalculations,
  computeForwardColumn,
  computeScenarios,
  computeBroadScenarios,
  computeEightLevers
}
