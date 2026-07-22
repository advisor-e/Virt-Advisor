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
 *   1. demo/manual mode — no figure came from a file, so the sample company's numbers
 *      are still on screen;
 *   2. the projection dials — growth %, discount % and exit multiple start on the
 *      sample's settings even when the P&L above came from the client's own files.
 *
 * The negative cases matter as much as the positive ones: a warning that never goes
 * away is one advisors learn to ignore, which is how the original problem survived.
 *
 * ⚠ These tests were WRONG on the first attempt and the defect reached Mike's review.
 * They keyed the notice off "no confirmed payload" — a state the pages cannot produce,
 * because the report is only reachable by confirming figures, which always supplies one.
 * The tests passed against a situation the real app never creates. Every case below now
 * mounts the report the way a PAGE would: with a confirmed payload, differing only in
 * whether the figures came from a file.
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

/** What the page supplies on the demo/manual path: confirmed, but nothing from a file. */
function qpDemoSeed () {
  const seed = qpSeed()
  const SAMPLES = { cash: 296155, debtors: 154906, stock: 25847, creditors: 63000, wagesDue: 32000, fixedAssets: 30000 }
  Object.keys(seed.figures).forEach((k) => {
    seed.figures[k] = { value: SAMPLES[k], source: 'entered' }
  })
  return seed
}

/** The same for EBITDA: a confirmed payload with no file-sourced cell. */
function edDemoSeed () {
  const seed = edSeed()
  Object.keys(seed.figures).forEach((row) => {
    seed.figures[row] = seed.figures[row].map(c => ({ value: c.value, source: 'entered' }))
  })
  return seed
}

function edSeed () {
  const cell = () => Array.from({ length: 3 }, (_, i) => ({ value: (i + 1) * 100000, source: 'file' }))
  return { years: [2023, 2024, 2025], figures: { sales: cell(), costOfSales: cell(), operatingExpenses: cell() }, companyName: 'X' }
}

afterEach(() => { delete global.fetch })

describe('Quick Position — sample-figure notice', () => {
  it('warns on the demo path — confirmed, but nothing came from a file', async () => {
    // Exactly what the page supplies after "skip / enter by hand": a real payload whose
    // figures are all `entered` and still the model's sample company.
    const wrapper = await mountReport(QuickPositionReport, { result: qpResult(), propsData: { seed: qpDemoSeed() } })
    expect(notices(wrapper)).toEqual([NOTICE])
  })

  it('warns with no payload at all, for any caller that renders it bare', async () => {
    const wrapper = await mountReport(QuickPositionReport, { result: qpResult() })
    expect(notices(wrapper)).toEqual([NOTICE])
  })

  it('stays silent once the advisor has typed their client’s own figures', async () => {
    // Nothing from a file, but the samples are gone — "these are sample numbers" would
    // be untrue, and a warning that is untrue is worse than none.
    const seed = qpDemoSeed()
    Object.keys(seed.figures).forEach((k) => { seed.figures[k].value += 1 })
    const wrapper = await mountReport(QuickPositionReport, { result: qpResult(), propsData: { seed } })
    expect(notices(wrapper)).toEqual([])
  })

  it('does NOT warn once the report runs on the client’s own figures', async () => {
    const wrapper = await mountReport(QuickPositionReport, { result: qpResult(), propsData: { seed: qpSeed() } })
    expect(notices(wrapper)).toEqual([])
  })
})

describe('EBITDA & DCF — sample-figure notice', () => {
  it('warns twice on the demo path: the figures AND the untouched projection dials', async () => {
    const wrapper = await mountReport(EbitdaDcfReport, { result: edResult(), propsData: { seed: edDemoSeed() } })
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
