/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const DashboardReportsWorkbench = require('~/components/DashboardReportsWorkbench.vue').default
const { computeReportPages } = require('~/server/report/dashboardReportPagesModel')
const { emptyState } = require('~/utils/dashboardReportsSavedShape')
const en = require('~/locales/en.json')

/**
 * The Business Performance Report's screen (item 4.70, stage 2).
 *
 * What UAT cannot see: a page printing a figure the backend never sent, a locale key the
 * screen asks for that the English file does not hold (the mock `$t` returns the key, so
 * a mistyped key is a string on screen that a tester may read as intended), a score panel
 * drawing a ring at zero when nothing was banded, and a request to the pages route that
 * forgets the sign-in's token.
 */

const THRESHOLDS = {
  levels: { debtorDays: { green: 35, amber: 45 }, creditorDays: { green: 35, amber: 45 }, stockDays: { green: 30, amber: 60 } },
  movements: { salesGrowth: { warn: 0, crit: -5 }, grossMargin: { warn: 1, crit: 3 }, overheadRatio: { warn: 1, crit: 3 } }
}
const line = (value, source) => ({ value, source: source || 'file' })
const CURRENT = { bank: line(224000), accountsReceivable: line(365000), stock: line(200000), otherCurrentAssets: line(11000), fixedAssets: line(505000), currentLiabilities: line(410000), accountsPayable: line(200000), nonCurrentLiabilities: line(205000), tradingIncome: line(3650000), otherIncome: line(10000), costOfSales: line(2000000), wages: line(596000), operatingExpenses: line(102000), depreciation: line(38000), interestPaid: line(32000), netCapitalSpend: line(85000, 'entered') }
const PRIOR = { bank: line(183000), accountsReceivable: line(250000), stock: line(150000), otherCurrentAssets: line(9000), fixedAssets: line(470000), currentLiabilities: line(387000), accountsPayable: line(150000), nonCurrentLiabilities: line(220000), tradingIncome: line(3000000), otherIncome: line(8000), costOfSales: line(1800000), wages: line(550000), operatingExpenses: line(98000), depreciation: line(35000), interestPaid: line(30000) }

/** A two-year state with words, as the advisor would have left it at step 6. */
function fullState () {
  const s = emptyState()
  s.setup = { financialYear: 'FY2026', dateIssued: '2026-09-08', preparedBy: 'Jordan Reid' }
  s.hasPrior = true
  s.current = { balanceSheetDate: 'As at 30 June 2026', profitLossDate: 'For the year ended 30 June 2026', figures: CURRENT }
  s.prior = { balanceSheetDate: 'As at 30 June 2025', profitLossDate: 'For the year ended 30 June 2025', figures: PRIOR }
  s.inventory = { slowObsolete: 46000, ageing: [128, 84, 52, 32, 26] }
  s.words.summary = 'A strong year'
  s.words.wentWell = ['Sales grew', '']
  s.words.steps = [{ title: 'Free up cash', body: 'Run down slow lines' }, { title: '', body: '' }, { title: '', body: '' }]
  return s
}

/** Look a dotted key up in the English file. @param {string} key */
function hasKey (key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), en) !== undefined
}

async function mountAt (step, state, figures) {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: figures }) }))
  const wrapper = mountWithBuefy(DashboardReportsWorkbench, {
    propsData: { step, restore: state, token: 'tok-123', clientName: 'Harbourside Kitchen Supplies Ltd' }
  })
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the document, two years', () => {
  let wrapper
  beforeEach(async () => {
    const state = fullState()
    wrapper = await mountAt(6, state, computeReportPages({ current: CURRENT, prior: PRIOR, inventory: state.inventory, thresholds: THRESHOLDS }))
  })

  it('🔴 SENDS THE SIGN-IN\'S TOKEN TO THE PAGES ROUTE — the firm\'s thresholds hang on it', () => {
    expect(global.fetch).toHaveBeenCalled()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/report/dashboard-reports/pages')
    expect(opts.headers.Authorization).toBe('Bearer tok-123')
    const body = JSON.parse(opts.body)
    expect(body.current.bank).toEqual({ value: 224000, source: 'file' })
    expect(body.prior.bank.value).toBe(183000)
    expect(body.thresholds).toBeUndefined()
  })

  it('prints eleven pages: cover, contents, eight sections and the closing page', () => {
    expect(wrapper.findAll('.drd-page').length).toBe(11)
  })

  it('the score ring carries the backend\'s score and its band, and names what pulled it down', () => {
    const ring = wrapper.find('.drd-ring-v')
    expect(ring.exists()).toBe(true)
    expect(ring.text()).toBe('75')
    expect(wrapper.find('.drd-band').text()).toContain('report.dashboardReports.doc.band.good')
    expect(wrapper.find('.drd-score-read').text()).toContain('debtorDays')
  })

  it('the seven cash drivers each carry a direction', () => {
    const chips = wrapper.findAll('.drd-drv .drd-c')
    expect(chips.length).toBe(7)
    chips.wrappers.forEach(c => expect(c.classes().some(k => k === 'is-uses' || k === 'is-releases')).toBe(true))
  })

  it('🔴 EVERY LOCALE KEY THE SCREEN ASKS FOR EXISTS IN THE ENGLISH FILE', () => {
    // The mock $t returns the key, so the rendered text IS the list of keys asked for.
    const keys = wrapper.html().match(/report\.dashboardReports\.[A-Za-z0-9_.]+/g) || []
    const missing = Array.from(new Set(keys)).filter(k => !hasKey(k.replace(/\.$/, '')))
    expect(missing).toEqual([])
    expect(keys.length).toBeGreaterThan(50)
  })

  it('the advisor\'s words reach their pages, and an empty next step says so rather than printing nothing', () => {
    expect(wrapper.find('.drd-list').text()).toContain('Sales grew')
    const steps = wrapper.findAll('.drd-step h3')
    expect(steps.at(0).text()).toBe('Free up cash')
    expect(steps.at(1).text()).toContain('report.dashboardReports.doc.stepUntitled')
  })

  it('the review band shows how many figures came from the files and how many were typed', () => {
    const figures = wrapper.findAllComponents({ name: 'HeroFigure' })
    expect(figures.length).toBe(4)
    // 16 lines this year + 15 last year from file = 31 − the typed net capital spend
    expect(figures.at(1).props('value')).toBe(30)
    expect(figures.at(2).props('value')).toBe(1)
  })
})

describe('the document, this year alone', () => {
  it('🔴 NO BANDED MEASURE MEANS NO RING, and the drivers say "no movement"', async () => {
    const state = fullState()
    state.hasPrior = false
    const wrapper = await mountAt(6, state, computeReportPages({ current: CURRENT, inventory: state.inventory, thresholds: THRESHOLDS }))
    expect(wrapper.find('.drd-ring').exists()).toBe(false)
    expect(wrapper.find('.drd-panel.is-soft .drd-gap').exists()).toBe(true)
    expect(wrapper.findAll('.drd-drv .drd-c.is-none').length).toBe(6)
  })
})

describe('the advisor\'s steps', () => {
  it('step 1 carries the band before any file is dropped, with the client from the header', async () => {
    const wrapper = await mountAt(1, null, computeReportPages({}))
    const strip = wrapper.findComponent({ name: 'HeroStrip' })
    expect(strip.exists()).toBe(true)
    expect(strip.element.parentElement).toBe(wrapper.element)
    expect(wrapper.findAllComponents({ name: 'HeroFigure' }).at(0).props('value')).toBe('Harbourside Kitchen Supplies Ltd')
  })

  it('the words step changes no figure, so it makes no backend call', async () => {
    const wrapper = await mountAt(4, fullState(), computeReportPages({ current: CURRENT, prior: PRIOR, thresholds: THRESHOLDS }))
    const calls = global.fetch.mock.calls.length
    wrapper.findComponent({ name: 'DashboardReportsWords' }).vm.$emit('change', Object.assign({}, fullState().words, { summary: 'Changed' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted().state).toBeTruthy()
    expect(global.fetch.mock.calls.length).toBe(calls)
  })

  it('no optional page is offered yet, and each says what it waits on', async () => {
    const wrapper = await mountAt(5, fullState(), computeReportPages({ current: CURRENT, prior: PRIOR, thresholds: THRESHOLDS }))
    const boxes = wrapper.findAllComponents({ name: 'BCheckbox' })
    expect(boxes.length).toBe(7)
    boxes.wrappers.forEach(b => expect(b.props('disabled')).toBe(true))
  })
})
