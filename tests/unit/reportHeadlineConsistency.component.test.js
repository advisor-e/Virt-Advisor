/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const DebtorDragReport = require('~/components/DebtorDragReport.vue').default
const MarginBreakevenReport = require('~/components/MarginBreakevenReport.vue').default
const BusinessPerformanceReport = require('~/components/BusinessPerformanceReport.vue').default
const EightLeversReport = require('~/components/EightLeversReport.vue').default
const QuickPositionReport = require('~/components/QuickPositionReport.vue').default
const EbitdaDcfReport = require('~/components/EbitdaDcfReport.vue').default
const LoanEstimatorReport = require('~/components/LoanEstimatorReport.vue').default
const LeaseVsBuy = require('~/components/LeaseVsBuy.vue').default
const CostOfCapital = require('~/components/CostOfCapital.vue').default
const MultiplePropertyAssessment = require('~/components/MultiplePropertyAssessment.vue').default
const VolatilityReport = require('~/components/VolatilityReport.vue').default
const ThreeWayForecastReport = require('~/components/ThreeWayForecastReport.vue').default

const { computeDebtorCashflow } = require('~/server/report/debtorDragModel')
const { computeWorkingCapitalCycle, DEFAULT_INPUTS: WCC_DEFAULTS } = require('~/server/report/workingCapitalCycleModel')
const { computeMarginMarkup, requiredSales, whatIfPrice } = require('~/server/report/marginBreakevenModel')
const { computeEightLevers, DEFAULT_INPUTS: EL_DEFAULTS } = require('~/server/report/eightLeversModel')
const { computeQuickPosition, DEFAULTS: QP_DEFAULTS } = require('~/server/report/quickPositionModel')
const { computeEbitdaDcf, DEFAULTS: ED_DEFAULTS } = require('~/server/report/ebitdaDcfModel')
const { computeLoanEstimatorReport } = require('~/server/report/loanEstimatorModel')
const { computeLeaseVsBuy } = require('~/server/report/leaseVsBuyModel')
const { computeCostOfCapital } = require('~/server/report/costOfCapitalModel')
const { computeMultiplePropertyPortfolio } = require('~/server/report/multiplePropertyModel')
const { computeVolatility, DEFAULT_INPUTS: VOL_DEFAULTS } = require('~/server/report/volatilityModel')
const { computeThreeWayForecast } = require('~/server/report/threeWayForecastModel')

/**
 * CONSISTENCY GUARD — every report in this section presents its headline figures the
 * same way: the shared dark HeroStrip, not a screen's own hand-rolled cards.
 *
 * Owner ruling, 2026-07-22. This test exists because consistency kept being lost one
 * screen at a time: Eight Levers was excluded from the HeroStrip extraction as a
 * "different visual language" (Phase 2, 2026-07-21) and was still sitting on plain
 * white stat cards while the other five had the dark strip. Nothing failed — the suite
 * had no opinion about it, so the drift was invisible until someone opened two reports
 * side by side.
 *
 * A new report screen that hand-rolls its own headline now fails here.
 */

/** The margin route assembles its payload itself; mirror it from the same model calls. */
function marginBreakevenResult () {
  const price = 100
  const cost = 60
  const overheads = 120000
  const drawings = 60000
  const mm = computeMarginMarkup(cost, price)
  const chosen = whatIfPrice({ price, costOfSalesPct: mm.costOfSalesPct, overheads, ownerDrawings: drawings, priceChangePct: 0 })
  return {
    grossProfit: mm.grossProfit,
    marginPct: mm.marginPct,
    markup: mm.markup,
    costOfSalesPct: mm.costOfSalesPct,
    requiredSales: requiredSales(overheads, drawings, mm.marginPct),
    requiredUnits: requiredSales(overheads, drawings, mm.marginPct) / price,
    curve: [{ chg: 0, units: chosen.unitsRequired }],
    chosen: {
      newPrice: chosen.newPrice,
      newMarginPct: chosen.newMarginPct,
      unitsRequired: chosen.unitsRequired,
      salesRequired: chosen.salesRequired
    }
  }
}

const SCREENS = [
  { name: 'Debtor Business Drag', component: DebtorDragReport, result: () => computeDebtorCashflow({}) },
  { name: 'Margin, Mark-up & Break-even', component: MarginBreakevenReport, result: marginBreakevenResult },
  { name: 'Working Capital Cycle', component: BusinessPerformanceReport, result: () => computeWorkingCapitalCycle(Object.assign({}, WCC_DEFAULTS)) },
  { name: 'Eight Levers', component: EightLeversReport, result: () => computeEightLevers(Object.assign({}, EL_DEFAULTS)) },
  { name: 'Quick Position', component: QuickPositionReport, result: () => computeQuickPosition(Object.assign({}, QP_DEFAULTS)) },
  { name: 'EBITDA & DCF', component: EbitdaDcfReport, result: () => computeEbitdaDcf(Object.assign({}, ED_DEFAULTS)) },
  // An empty body computes every part on the workbook sample — the assembler's own default path.
  { name: 'Loan Estimator', component: LoanEstimatorReport, result: () => computeLoanEstimatorReport({}) },
  { name: 'Lease vs Buy', component: LeaseVsBuy, result: () => computeLeaseVsBuy({}) },
  // An empty body computes the workbook sample through the assembler's own default path.
  { name: 'Cost of Capital (WACC)', component: CostOfCapital, result: () => computeCostOfCapital({}) },
  // Phase 1 — one property, ten years. An empty body computes the workbook's sample.
  { name: 'Multiple Property Assessment', component: MultiplePropertyAssessment, result: () => computeMultiplePropertyPortfolio({}) },
  // Typed entry seeded with the workbook's own 24 months; 12 is the screen's default window.
  { name: 'Volatility Report', component: VolatilityReport, result: () => computeVolatility({ sales: VOL_DEFAULTS.sales, window: 12 }) },
  // An empty body computes the source workbook's own sample — the model's default path.
  { name: 'Three-Way Forecast', component: ThreeWayForecastReport, result: () => computeThreeWayForecast({}) }
]

/** Mount with the backend answering successfully, and let the first result land. */
async function mountWithResult (component, data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(component, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe.each(SCREENS)('$name', ({ component, result }) => {
  it('presents its headline figures in the shared HeroStrip', async () => {
    const wrapper = await mountWithResult(component, result())

    expect(wrapper.findComponent({ name: 'HeroStrip' }).exists()).toBe(true)
    // At least three figures — the strip exists to hold them, not as an empty band.
    expect(wrapper.findAllComponents({ name: 'HeroFigure' }).length).toBeGreaterThanOrEqual(3)
  })

  it('renders that headline as a FULL-WIDTH band — a direct child of the screen root, not tucked inside a column', async () => {
    // The banner must span the page (the ~1120px content column), the same on every
    // model. This is the regression that shipped on Lease vs Buy: its HeroStrip sat
    // inside the 1fr results column of the two-column layout and rendered ~740px, while
    // EBITDA-DCF and the Loan Estimator spanned full width — and nothing failed, because
    // no guard checked banner PLACEMENT (only that it existed). The frame/shell guards
    // check presence; this checks the banner is a top-level band.
    //
    // jsdom has no layout engine (offsetWidth is always 0), so pixel width can't be
    // measured — but the DOM TREE is real, and full-width vs in-column is exactly the
    // difference between "the HeroStrip's parent is the screen root" and "its parent is
    // a results <section>". That ancestry is what we assert.
    const wrapper = await mountWithResult(component, result())
    const strip = wrapper.findComponent({ name: 'HeroStrip' })
    expect(strip.exists()).toBe(true)
    expect(strip.element.parentElement).toBe(wrapper.element)
  })

  it('greys that headline when the figures go stale, rather than each screen doing its own thing', async () => {
    const wrapper = await mountWithResult(component, result())
    expect(wrapper.findComponent({ name: 'HeroStrip' }).props('stale')).toBe(false)

    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'HeroStrip' }).props('stale')).toBe(true)
  })

  it('warns persistently on failure — never a toast that vanishes', async () => {
    // Three screens used to flash a toast and then sit there showing figures that
    // described the PREVIOUS inputs, at full brightness, with nothing on screen to say
    // so. A vanishing warning is not a warning; the banner stays until it is retried.
    const wrapper = await mountWithResult(component, result())
    expect(wrapper.findComponent({ name: 'StaleBanner' }).exists()).toBe(false)

    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()

    const banner = wrapper.findComponent({ name: 'StaleBanner' })
    expect(banner.exists()).toBe(true)
    expect(banner.props('message')).toBe('report.calcUnreachable')
  })
})
