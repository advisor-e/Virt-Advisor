/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const DashboardReportsWorkbench = require('~/components/DashboardReportsWorkbench.vue').default
const { computeReportPages } = require('~/server/report/dashboardReportPagesModel')
const { emptyState, emptyYear } = require('~/utils/dashboardReportsSavedShape')
const en = require('~/locales/en.json')

/**
 * The Business Performance Report's screen, stage 5 (item 4.70): the monthly view and the
 * third year on the document, and the Sales Volatility page.
 *
 * What UAT cannot see: the series and the third year never reaching the pages route, a
 * quarterly title over year bars, a band word copied rather than read from the Volatility
 * Report's own key, and a locale key the screen asks for that the English file lacks.
 */

const THRESHOLDS = {
  levels: { debtorDays: { green: 35, amber: 45 }, creditorDays: { green: 35, amber: 45 }, stockDays: { green: 30, amber: 60 } },
  movements: { salesGrowth: { warn: 0, crit: -5 }, grossMargin: { warn: 1, crit: 3 }, overheadRatio: { warn: 1, crit: 3 } }
}
const line = (value, source) => ({ value, source: source || 'file' })
const CURRENT = { bank: line(224000), accountsReceivable: line(365000), stock: line(200000), otherCurrentAssets: line(11000), fixedAssets: line(505000), currentLiabilities: line(410000), accountsPayable: line(200000), nonCurrentLiabilities: line(205000), tradingIncome: line(3650000), otherIncome: line(10000), costOfSales: line(2000000), wages: line(596000), operatingExpenses: line(102000), depreciation: line(38000), interestPaid: line(32000), netCapitalSpend: line(85000, 'entered') }
const PRIOR = { bank: line(183000), accountsReceivable: line(250000), stock: line(150000), otherCurrentAssets: line(9000), fixedAssets: line(470000), currentLiabilities: line(387000), accountsPayable: line(150000), nonCurrentLiabilities: line(220000), tradingIncome: line(3000000), otherIncome: line(8000), costOfSales: line(1800000), wages: line(550000), operatingExpenses: line(98000), depreciation: line(35000), interestPaid: line(30000) }
const EARLIER = { bank: line(150000), accountsReceivable: line(228000), stock: line(120000), fixedAssets: line(440000), currentLiabilities: line(350000), nonCurrentLiabilities: line(240000), tradingIncome: line(2310000), otherIncome: line(5000), costOfSales: line(1400000), wages: line(500000), operatingExpenses: line(90000), depreciation: line(30000), interestPaid: line(28000) }

const LABELS = ['Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026']
const SALES = [198, 212, 226, 241, 262, 289, 171, 218, 247, 236, 259, 281].map(v => v * 1000)
const FIRST = 2025 * 12 + 6
const months = LABELS.map((label, i) => ({ label, ordinal: FIRST + i, sales: SALES[i], costOfSales: Math.round(SALES[i] * 0.59), otherIncome: 940, operatingExpenses: 57500, complete: true, reason: null }))
const bank = LABELS.map((label, i) => ({ label, ordinal: FIRST + i, bank: 150000 + i * 5000, complete: true, reason: null }))

function baseState () {
  const s = emptyState()
  s.setup = { financialYear: 'FY2026', dateIssued: '2026-09-08', preparedBy: 'Jordan Reid' }
  s.hasPrior = true
  // Every line present, as a real state is: step 2's table reads each one.
  s.current = { balanceSheetDate: 'As at 30 June 2026', profitLossDate: 'For the year ended 30 June 2026', figures: Object.assign(emptyYear().figures, CURRENT) }
  s.prior = { balanceSheetDate: 'As at 30 June 2025', profitLossDate: 'For the year ended 30 June 2025', figures: Object.assign(emptyYear().figures, PRIOR) }
  s.inventory = { slowObsolete: 46000, ageing: [128, 84, 52, 32, 26], stockFile: null }
  s.words.steps = [{ title: 'Free up cash', body: 'Run down slow lines' }, { title: '', body: '' }, { title: '', body: '' }]
  return s
}
function monthlyState () {
  const s = baseState()
  s.hasEarlier = true
  s.earlier = { balanceSheetDate: 'As at 30 June 2024', profitLossDate: 'For the year ended 30 June 2024', figures: EARLIER }
  s.monthly = { plDate: 'For the year ended 30 June 2026', bsDate: 'As at 30 June 2026', months, bank }
  s.pages.added = ['salesVolatility']
  return s
}
const withSeries = state => computeReportPages({ current: CURRENT, prior: PRIOR, earlier: EARLIER, currentDates: { profitLoss: 'For the year ended 30 June 2026' }, monthly: { profitLoss: { months }, bank: { months: bank } }, inventory: state.inventory, thresholds: THRESHOLDS })

function hasKey (key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), en) !== undefined
}

async function mountAt (step, state, figures) {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: figures }) }))
  const wrapper = mountWithBuefy(DashboardReportsWorkbench, {
    propsData: { step, restore: state, token: 'tok-123', apiToken: 'tok-123', clientName: 'Harbourside Kitchen Supplies Ltd' }
  })
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the monthly view and the third year on the document', () => {
  it('🔴 SENDS THE SERIES AND THE THIRD YEAR to the pages route', async () => {
    await mountAt(6, monthlyState(), withSeries(monthlyState()))
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.monthly.profitLoss.months).toHaveLength(12)
    expect(body.monthly.bank.months).toHaveLength(12)
    expect(body.earlier.tradingIncome.value).toBe(2310000)
  })

  it('draws the quarters, the bank line and the third column, and prints the Sales Volatility page', async () => {
    const wrapper = await mountAt(6, monthlyState(), withSeries(monthlyState()))
    expect(wrapper.findAll('.drd-page').length).toBe(12)
    expect(wrapper.text()).toContain('report.dashboardReports.doc.revenueVsExpensesQuarterly')
    expect(wrapper.text()).toContain('report.dashboardReports.doc.grossNetByQuarter')
    expect(wrapper.find('.lc').exists()).toBe(true)
    expect(wrapper.text()).toContain('report.dashboardReports.doc.threeYearTrend')
    expect(wrapper.find('.bbc').exists()).toBe(true)
    // The band word is the Volatility Report's own key, not a second copy.
    expect(wrapper.text()).toContain('report.volatility.band.good')
  })

  it('without the series the pages are exactly as before, and the volatility page says why it is not offered', async () => {
    const state = baseState()
    state.pages.added = ['salesVolatility']
    const wrapper = await mountAt(6, state, computeReportPages({ current: CURRENT, prior: PRIOR, inventory: state.inventory, thresholds: THRESHOLDS }))
    expect(wrapper.findAll('.drd-page').length).toBe(11)
    expect(wrapper.text()).toContain('report.dashboardReports.doc.revenueVsExpenses')
    expect(wrapper.find('.lc').exists()).toBe(false)
    expect(wrapper.text()).toContain('report.dashboardReports.doc.twoYearTrend')
    expect(wrapper.vm.availability.salesVolatility).toEqual({ available: false, reason: 'report.dashboardReports.pages.reason.salesVolatility' })
  })

  it('step 2 shows the three groups of zones and re-sends the by-month files to the monthly route', async () => {
    const wrapper = await mountAt(2, baseState(), computeReportPages({ current: CURRENT, prior: PRIOR, thresholds: THRESHOLDS }))
    expect(wrapper.findAll('.dra-drop-zone').length).toBe(8)
    const accounts = wrapper.findComponent({ name: 'DashboardReportsAccounts' })
    global.fetch.mockClear()
    global.fetch.mockImplementation(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: { blocked: null, warnings: [], profitLoss: { reportDate: 'For the year ended 30 June 2026', months }, bank: null, companyName: null } }) }))
    accounts.vm.receive('plMonth', [new File(['x'], 'pl.xlsx')])
    for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
    const monthlyCall = global.fetch.mock.calls.find(c => c[0] === '/api/report/dashboard-reports/monthly')
    expect(monthlyCall).toBeTruthy()
    expect(monthlyCall[1].headers.Authorization).toBe('Bearer tok-123')
    expect(wrapper.vm.state.monthly.months).toHaveLength(12)
    // The annual years are untouched by a by-month drop.
    expect(wrapper.vm.state.current.figures.bank.value).toBe(224000)
  })

  it('every stage 5 key the screens ask for is in the English file', () => {
    ;[
      'report.dashboardReports.accounts.zone.plMonth', 'report.dashboardReports.accounts.zone.bsMonth', 'report.dashboardReports.accounts.zone.bsEarlier', 'report.dashboardReports.accounts.zone.plEarlier',
      'report.dashboardReports.accounts.zoneHow.plMonth', 'report.dashboardReports.accounts.zoneHow.bsMonth', 'report.dashboardReports.accounts.zoneHow.bsEarlier', 'report.dashboardReports.accounts.zoneHow.plEarlier',
      'report.dashboardReports.accounts.monthlyTitle', 'report.dashboardReports.accounts.earlierTitle', 'report.dashboardReports.accounts.monthlyRules', 'report.dashboardReports.accounts.earlierRules',
      'report.dashboardReports.accounts.readMonths', 'report.dashboardReports.accounts.monthlyNotYet', 'report.dashboardReports.accounts.multiDropMonthly',
      'report.dashboardReports.pages.ready.byMonth', 'report.dashboardReports.pages.reason.needsTwelveMonths', 'report.dashboardReports.pages.reason.salesVolatility',
      'report.dashboardReports.doc.revenueVsExpensesQuarterly', 'report.dashboardReports.doc.quarter', 'report.dashboardReports.doc.quartersPartial', 'report.dashboardReports.doc.grossNetByQuarter',
      'report.dashboardReports.doc.closingBankByMonth', 'report.dashboardReports.doc.bankByMonthAbsent', 'report.dashboardReports.doc.bankLowest', 'report.dashboardReports.doc.bankMonthsMissing',
      'report.dashboardReports.doc.threeYearTrend', 'report.dashboardReports.doc.twoYearsAgo',
      'report.dashboardReports.doc.optional.salesVolatility.title', 'report.dashboardReports.doc.optional.salesVolatility.sub', 'report.dashboardReports.doc.optional.salesVolatility.scoreRead',
      'report.dashboardReports.doc.optional.salesVolatility.outsideRead', 'report.dashboardReports.doc.optional.salesVolatility.outsideNone', 'report.dashboardReports.doc.optional.salesVolatility.highestRead',
      'report.dashboardReports.doc.optional.salesVolatility.lowestRead', 'report.dashboardReports.doc.optional.salesVolatility.ordinaryRead', 'report.dashboardReports.doc.optional.salesVolatility.rangeFloored', 'report.dashboardReports.doc.optional.salesVolatility.foot',
      'report.volatility.band.good', 'report.volatility.band.warn', 'report.volatility.band.crit'
    ].forEach((k) => { expect({ key: k, present: hasKey(k) }).toEqual({ key: k, present: true }) })
  })
})
