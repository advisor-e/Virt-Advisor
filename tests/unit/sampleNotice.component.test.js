/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const QuickPositionReport = require('~/components/QuickPositionReport.vue').default
const EbitdaDcfReport = require('~/components/EbitdaDcfReport.vue').default
const { computeQuickPosition, DEFAULTS: QP_DEFAULTS } = require('~/server/report/quickPositionModel')
const { computeEbitdaDcf, DEFAULTS: ED_DEFAULTS } = require('~/server/report/ebitdaDcfModel')

/**
 * "These are sample numbers, not your client's" — wording approved by Mike 2026-07-22.
 *
 * Raised from a live smoke pass (2026-07-20): on the EBITDA demo path he set sales to
 * $145,000 and got a −$5,409,687 gross profit. The arithmetic was right; the other cells
 * still silently held the sample company's costs. The screen said nothing.
 *
 * Two exposure points, both covered here:
 *   1. demo/manual mode — no file seeded, so every figure is the sample company's;
 *   2. the projection dials — growth %, discount % and exit multiple start on the
 *      sample's settings even when the P&L above came from the client's own files.
 *
 * The negative cases matter as much as the positive ones: a warning that never goes
 * away is one advisors learn to ignore, which is how the original problem survived.
 */

const NOTICE = 'report.sampleFigures'

async function mountReport (component, opts) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data: opts.result })
  }))
  const wrapper = mountWithBuefy(component, { propsData: opts.propsData || {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

/** Text of every sample notice currently on screen. */
function notices (wrapper) {
  return wrapper.findAllComponents({ name: 'SampleNotice' }).wrappers.map(w => w.props('text'))
}

const qpResult = () => computeQuickPosition(Object.assign({}, QP_DEFAULTS))
const edResult = () => computeEbitdaDcf(Object.assign({}, ED_DEFAULTS))

/** A confirmed intake payload — i.e. the advisor supplied the client's real files. */
function qpSeed () {
  return {
    figures: {
      cash: { value: 100000, source: 'file' },
      debtors: { value: 50000, source: 'file' },
      stock: { value: 20000, source: 'file' },
      creditors: { value: 30000, source: 'file' },
      wagesDue: { value: 10000, source: 'file' },
      fixedAssets: { value: 40000, source: 'file' }
    },
    serviceBusiness: false,
    expenseLines: null,
    incomeTotal: null,
    companyName: 'Sample Trading Ltd'
  }
}

function edSeed () {
  const cell = () => Array.from({ length: 3 }, (_, i) => ({ value: (i + 1) * 100000, source: 'file' }))
  return { years: [2023, 2024, 2025], figures: { sales: cell(), costOfSales: cell(), operatingExpenses: cell() }, companyName: 'X' }
}

afterEach(() => { delete global.fetch })

describe('Quick Position — sample-figure notice', () => {
  it('warns in demo mode, where no client file was ever supplied', async () => {
    const wrapper = await mountReport(QuickPositionReport, { result: qpResult() })
    expect(notices(wrapper)).toEqual([NOTICE])
  })

  it('does NOT warn once the report runs on the client’s own figures', async () => {
    const wrapper = await mountReport(QuickPositionReport, { result: qpResult(), propsData: { seed: qpSeed() } })
    expect(notices(wrapper)).toEqual([])
  })
})

describe('EBITDA & DCF — sample-figure notice', () => {
  it('warns twice in demo mode: the figures AND the untouched projection dials', async () => {
    const wrapper = await mountReport(EbitdaDcfReport, { result: edResult() })
    expect(notices(wrapper)).toEqual([NOTICE, NOTICE])
  })

  it('still warns about the dials on a file-seeded run — this is the case that was missed', async () => {
    // The P&L rows carry provenance badges and are genuinely the client's. The growth
    // and discount dials are NOT — they are the sample's assumptions, and nothing said so.
    const wrapper = await mountReport(EbitdaDcfReport, { result: edResult(), propsData: { seed: edSeed() } })
    expect(notices(wrapper)).toEqual([NOTICE])
  })

  it('drops the dial warning as soon as the advisor sets a dial', async () => {
    const wrapper = await mountReport(EbitdaDcfReport, { result: edResult(), propsData: { seed: edSeed() } })
    expect(notices(wrapper)).toHaveLength(1)

    wrapper.setData({ dialsTouched: true })
    await wrapper.vm.$nextTick()

    expect(notices(wrapper)).toEqual([])
  })

  it('touching a growth dial in the real markup clears it', async () => {
    // Bound to the actual input, not just the flag — otherwise the test proves only
    // that a boolean works.
    const wrapper = await mountReport(EbitdaDcfReport, { result: edResult(), propsData: { seed: edSeed() } })
    const dial = wrapper.findAll('input.cell').at(0)
    expect(dial.exists()).toBe(true)

    await dial.setValue('7')

    expect(wrapper.vm.dialsTouched).toBe(true)
    expect(notices(wrapper)).toEqual([])
  })
})
