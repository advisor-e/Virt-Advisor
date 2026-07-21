/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const QuickPositionReport = require('~/components/QuickPositionReport.vue').default
const EbitdaDcfReport = require('~/components/EbitdaDcfReport.vue').default
const { computeQuickPosition, computeExpensesReview, DEFAULTS: QP_DEFAULTS } = require('~/server/report/quickPositionModel')
const { computeEbitdaDcf, DEFAULTS: ED_DEFAULTS } = require('~/server/report/ebitdaDcfModel')

/**
 * Rendering tests for the two report screens — the half of R9 and R11 that the
 * reportRecompute mixin tests cannot reach.
 *
 * The distinction matters. `tests/unit/reportRecompute.test.js` proves the *logic*:
 * a failed recompute sets `error`, a superseded response is discarded. It says nothing
 * about whether the screen then actually SHOWS the warning — and a screen with correct
 * state that renders nothing is exactly the failure Phase 2 proved the suite was blind
 * to (design/ACTIONS.md, 2026-07-21: "the suite stayed green throughout and could not
 * have caught a visual regression").
 *
 * The result payloads come from the REAL backend models rather than hand-written
 * fixtures, so a change to the calc's output shape surfaces here instead of leaving
 * these tests passing against a payload the backend stopped producing.
 */

const FROM_FILE = 'report.quickPosition.confirm.fromFile'
const ENTERED = 'report.quickPosition.confirm.entered'
const ED_FROM_FILE = 'report.ebitdaDcf.confirm.fromFile'
const ED_ENTERED = 'report.ebitdaDcf.confirm.entered'

/**
 * A genuine Quick Position result, straight from the backend model.
 *
 * `expensesReview` is attached the way `server/routes/report.js` does it — only when
 * P&L expense lines were supplied. Omitting it hides the whole expenses panel, so a
 * test that needs the "use this figure" button must ask for it.
 */
function quickPositionResult (withExpenseLines) {
  const data = computeQuickPosition(Object.assign({}, QP_DEFAULTS))
  if (withExpenseLines) {
    data.expensesReview = computeExpensesReview(
      [{ amount: 120000, maintainedPct: 1 }],
      QP_DEFAULTS.operatingMonths
    )
  }
  return data
}

/** A genuine EBITDA & DCF result, straight from the backend model. */
function ebitdaDcfResult () {
  return computeEbitdaDcf(Object.assign({}, ED_DEFAULTS))
}

/**
 * Mount a report screen with its first recompute already answered, so the results
 * section is rendered. `fetchImpl` lets a test control what the backend "returns".
 */
async function mountReport (component, options) {
  const opts = options || {}
  global.fetch = opts.fetch || jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data: opts.result })
  }))

  const wrapper = mountWithBuefy(component, { propsData: opts.propsData || {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve() // let the fetch chain settle
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('QuickPositionReport — the stale banner is actually rendered (R9)', () => {
  it('shows no banner on a healthy screen', async () => {
    const wrapper = await mountReport(QuickPositionReport, { result: quickPositionResult() })

    expect(wrapper.find('.results').exists()).toBe(true)
    expect(wrapper.find('.stale').exists()).toBe(false)
  })

  it('shows the banner, its message and a Retry button once a recompute has failed', async () => {
    const wrapper = await mountReport(QuickPositionReport, { result: quickPositionResult() })

    // A later recompute fails — the figures on screen are now out of date.
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stale').exists()).toBe(true)
    expect(wrapper.find('.stalehead').text()).toBe('report.staleTitle')
    expect(wrapper.find('.stalebody').text()).toBe('report.calcUnreachable')
    expect(wrapper.find('.stale button').text()).toBe('report.retry')
  })

  it('greys the hero figures while stale, so the numbers cannot read as live', async () => {
    // The banner alone is not enough — a figure that still looks live beside a warning
    // is the thing that gets quoted in a client meeting.
    const wrapper = await mountReport(QuickPositionReport, { result: quickPositionResult() })
    expect(wrapper.findComponent({ name: 'HeroStrip' }).props('stale')).toBe(false)

    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'HeroStrip' }).props('stale')).toBe(true)
  })

  it('clears the banner when Retry succeeds', async () => {
    const wrapper = await mountReport(QuickPositionReport, { result: quickPositionResult() })
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stale').exists()).toBe(true)

    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true, data: quickPositionResult() })
    }))
    await wrapper.find('.stale button').trigger('click')
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stale').exists()).toBe(false)
  })
})

describe('QuickPositionReport — provenance badges are rendered (R11)', () => {
  /** A confirmed intake payload with mixed provenance. */
  function seed () {
    return {
      figures: {
        cash: { value: 100000, source: 'file' },
        debtors: { value: 50000, source: 'file' },
        stock: { value: 20000, source: 'entered' },
        creditors: { value: 30000, source: 'file' },
        wagesDue: { value: 10000, source: 'file' },
        fixedAssets: { value: 40000, source: 'entered' }
      },
      serviceBusiness: false,
      expenseLines: [{ label: 'Rent', value: 24000, amount: 24000 }],
      incomeTotal: 480000,
      companyName: 'Sample Trading Ltd'
    }
  }

  /** Badge text inside the group whose heading matches `headingKey`. */
  function badgesInGroup (wrapper, headingKey) {
    const group = wrapper.findAll('.group').wrappers
      .find(g => g.find('h2').exists() && g.find('h2').text() === headingKey)
    return group.findAll('.src').wrappers.map(s => s.text())
  }

  it('renders the liabilities group with creditors and wages, and their badges', async () => {
    // R11: these two figures shape the result but had NO on-screen presence at all —
    // the advisor could not see that the report was using them, let alone where from.
    const wrapper = await mountReport(QuickPositionReport, {
      result: quickPositionResult(),
      propsData: { seed: seed() }
    })

    const badges = badgesInGroup(wrapper, 'report.quickPosition.aside.liabilities')
    expect(badges).toEqual([FROM_FILE, FROM_FILE])
  })

  it('carries each asset figure’s badge through from the intake', async () => {
    const wrapper = await mountReport(QuickPositionReport, {
      result: quickPositionResult(),
      propsData: { seed: seed() }
    })

    // Assets group order: cash, debtors, stock, fixedAssets (stock shown — not a service business)
    const badges = badgesInGroup(wrapper, 'report.quickPosition.aside.assets')
    expect(badges).toEqual([FROM_FILE, FROM_FILE, ENTERED, ENTERED])
  })

  it('tags fixed costs "from file" when seeded from the P&L, and back to "entered" on a slider touch', async () => {
    // The full R11 round trip: one click adopts the P&L figure (file), one drag
    // makes it the advisor's again. A badge stuck on "from file" would be a lie.
    const wrapper = await mountReport(QuickPositionReport, {
      result: quickPositionResult(true),
      propsData: { seed: seed() }
    })
    const outgoings = () => badgesInGroup(wrapper, 'report.quickPosition.aside.outgoings')
    expect(outgoings()[0]).toBe(ENTERED)

    wrapper.vm.useExpensesMonthly()
    await wrapper.vm.$nextTick()
    expect(outgoings()[0]).toBe(FROM_FILE)

    wrapper.vm.fixedCostsEntered()
    await wrapper.vm.$nextTick()
    expect(outgoings()[0]).toBe(ENTERED)
  })
})

describe('EbitdaDcfReport — the stale banner and print badges are rendered (R9/R11)', () => {
  /** A confirmed intake payload: the three P&L rows came from the exports. */
  function seed () {
    const cell = source => Array.from({ length: 3 }, (_, i) => ({ value: (i + 1) * 100000, source }))
    return {
      years: [2023, 2024, 2025],
      figures: {
        sales: cell('file'),
        costOfSales: cell('file'),
        operatingExpenses: cell('entered')
      },
      companyName: 'Sample Trading Ltd'
    }
  }

  it('shows no banner on a healthy screen', async () => {
    const wrapper = await mountReport(EbitdaDcfReport, { result: ebitdaDcfResult() })
    expect(wrapper.find('.stale').exists()).toBe(false)
  })

  it('shows the banner and greys the figures once a recompute has failed', async () => {
    const wrapper = await mountReport(EbitdaDcfReport, { result: ebitdaDcfResult() })

    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stalehead').text()).toBe('report.staleTitle')
    expect(wrapper.findComponent({ name: 'HeroStrip' }).props('stale')).toBe(true)
  })

  it('badges the Sales row in the collapsed P&L — the view the advisor lands on', async () => {
    // R11: the print screen had NO badges at all, so a valuation handed to a client
    // gave no way to tell an accounting figure from a typed one.
    const wrapper = await mountReport(EbitdaDcfReport, {
      result: ebitdaDcfResult(),
      propsData: { seed: seed() }
    })

    expect(wrapper.vm.expanded).toBe(false)
    expect(wrapper.findAll('.src').wrappers.map(s => s.text())).toEqual([ED_FROM_FILE])
  })

  it('badges all three seeded input rows once the P&L is expanded', async () => {
    // Cost of sales and operating expenses live behind the expand toggle. They still
    // print, so their provenance has to be right there too — not just on Sales.
    const wrapper = await mountReport(EbitdaDcfReport, {
      result: ebitdaDcfResult(),
      propsData: { seed: seed() }
    })

    wrapper.setData({ expanded: true })
    await wrapper.vm.$nextTick()

    const badges = wrapper.findAll('.src').wrappers.map(s => s.text())
    expect(badges).toEqual([ED_FROM_FILE, ED_FROM_FILE, ED_ENTERED])
  })

  it('tags every row "entered" in demo mode, where no file was ever supplied', async () => {
    const wrapper = await mountReport(EbitdaDcfReport, { result: ebitdaDcfResult() })
    wrapper.setData({ expanded: true })
    await wrapper.vm.$nextTick()

    const badges = wrapper.findAll('.src').wrappers.map(s => s.text())
    expect(badges).toHaveLength(3)
    badges.forEach(b => expect(b).toBe(ED_ENTERED))
  })
})
