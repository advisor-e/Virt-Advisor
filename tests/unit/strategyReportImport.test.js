/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyReportImport = require('~/components/strategy/StrategyReportImport.vue').default
const StrategyReportPlanPage = require('~/components/strategy/StrategyReportPlanPage.vue').default
const DashboardReportsWorkbench = require('~/components/DashboardReportsWorkbench.vue').default
const { computeReportPages } = require('~/server/report/dashboardReportPagesModel')
const { emptyState, flattenDashboardReport } = require('~/utils/dashboardReportsSavedShape')
const { importFromSaved, REPORT_IMPORT_KEY } = require('~/utils/reportImport')
const frameworks = require('~/server/utils/strategyFrameworks')
const forms = require('~/server/utils/strategyCaptureForms')
const en = require('~/locales/en.json')

/**
 * Item 15.13 — the client's Business Performance Report brought into the Strategy Planner's
 * "Assess current position" card, from design/mockups/strategy-current-position-import.html,
 * approved by Mike 2026-09-28.
 *
 * Pins what nobody in UAT can see:
 *   - the card asks the report's route EXACTLY what the report's own page asks, so it can
 *     never show a figure the report would not;
 *   - nothing is fetched from the pages route until the button is pressed (Decision A);
 *   - a saved row with no figures in it is not a report — it gets Mike's message, never a
 *     report of blanks (Decision C);
 *   - the only thing the session may save for this card is the brought-in marker.
 */

const CONCEPT_ID = 'assess-current-position-by-reviewing-pre-meeting-data-sectio'
const CLIENT = 'client-7'

const line = (value, source) => ({ value, source: source || 'file' })
const CURRENT = { bank: line(224000), accountsReceivable: line(365000), stock: line(200000), otherCurrentAssets: line(11000), fixedAssets: line(505000), currentLiabilities: line(410000), accountsPayable: line(200000), nonCurrentLiabilities: line(205000), tradingIncome: line(3650000), otherIncome: line(10000), costOfSales: line(2000000), wages: line(596000), operatingExpenses: line(102000), depreciation: line(38000), interestPaid: line(32000), netCapitalSpend: line(85000, 'entered') }
const PRIOR = { bank: line(183000), accountsReceivable: line(250000), stock: line(150000), otherCurrentAssets: line(9000), fixedAssets: line(470000), currentLiabilities: line(387000), accountsPayable: line(150000), nonCurrentLiabilities: line(220000), tradingIncome: line(3000000), otherIncome: line(8000), costOfSales: line(1800000), wages: line(550000), operatingExpenses: line(98000), depreciation: line(35000), interestPaid: line(30000) }

/** A finished two-year report, as an advisor would have saved it. */
function fullState () {
  const s = emptyState()
  s.setup = Object.assign(s.setup, { financialYear: 'FY2026', dateIssued: '2026-09-08', preparedBy: 'Jordan Reid' })
  s.hasPrior = true
  s.current = { balanceSheetDate: 'As at 30 June 2026', profitLossDate: 'For the year ended 30 June 2026', figures: CURRENT }
  s.prior = { balanceSheetDate: 'As at 30 June 2025', profitLossDate: 'For the year ended 30 June 2025', figures: PRIOR }
  s.words.wentWell = ['Sales grew in all four quarters', '']
  s.words.watch = ['Customers pay slower', '']
  return s
}

/** The saved-report store's answer for a client, as `getSavedReport` receives it. */
function savedAnswer (state) {
  return {
    clientId: CLIENT,
    report: state ? { inputs: flattenDashboardReport(state), savedAt: '2026-09-14T03:00:00.000Z', savedBy: { tier: 'advisor', name: 'Sarah Chen' } } : null,
    clientChanges: []
  }
}

/** fetch as the three routes answer it: the saved row, the brand, the pages. */
function mockRoutes (answer, opts) {
  const o = opts || {}
  global.fetch = jest.fn((url, init) => {
    const u = String(url)
    if (u.indexOf('/api/client-reports/saved/') === 0) {
      if (o.readFails) { return Promise.reject(new Error('network down')) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(answer) })
    }
    if (u.indexOf('/api/report/firm/brand') === 0) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: null, logo: null, colour: null }) })
    }
    const body = JSON.parse(init.body)
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: computeReportPages(body) }) })
  })
}

const pagesCalls = () => global.fetch.mock.calls.filter(c => String(c[0]) === '/api/report/dashboard-reports/pages')

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
}

async function mountPanel (answer, props, opts) {
  mockRoutes(answer, opts)
  const wrapper = mountWithBuefy(StrategyReportImport, {
    propsData: Object.assign({ clientId: CLIENT, clientName: 'Harbour Joinery Limited', apiToken: 'tok-9' }, props || {})
  })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the concept names the report it brings in', () => {
  it('🔴 "Assess current position" brings in the Business Performance Report AND keeps its own form', () => {
    const capture = forms.captureForConcept(frameworks.getConcept(CONCEPT_ID))
    expect(capture.importReport).toBe('/dashboard-reports')
    expect(capture.template).toBe('Customer & Skills Review')
    expect(capture.fields.length).toBeGreaterThan(0)
  })

  it('refuses a report no card can bring in, and a report beside a model', () => {
    const good = { id: 'x', name: 'X', planningDomain: 'strategic-orientation', deck: 'strategic-orientation-1', page: 2, source: 'agenda', captureFormBasis: 'unmeasured' }
    const known = new Set(['x'])
    expect(() => frameworks.buildConcept(Object.assign({}, good, { importReport: '/volatility' }), known)).toThrow(/report/)
    expect(() => frameworks.buildConcept(Object.assign({}, good, { importReport: '/dashboard-reports', model: '/owner-expectations' }), known)).toThrow(/model/)
    expect(frameworks.buildConcept(Object.assign({}, good, { importReport: '/dashboard-reports' }), known).importReport).toBe('/dashboard-reports')
  })
})

describe('the session saves a marker, never a figure', () => {
  it('🔴 the brought-in marker is admitted on this concept and on no other', () => {
    expect(forms.hasCaptureField(CONCEPT_ID, REPORT_IMPORT_KEY, frameworks.getConcept)).toBe(true)
    expect(forms.hasCaptureField('porters-5-forces', REPORT_IMPORT_KEY, frameworks.getConcept)).toBe(false)
    // and nothing else report-shaped gets in beside it
    expect(forms.hasCaptureField(CONCEPT_ID, 'netProfit', frameworks.getConcept)).toBe(false)
  })
})

describe('a saved row is a report only when it has figures', () => {
  it('no saved row is no report', () => {
    expect(importFromSaved(savedAnswer(null)).completed).toBe(false)
    expect(importFromSaved(null).completed).toBe(false)
  })

  it('🔴 a row saved at step 1, with no figures, is not a completed report', () => {
    const started = emptyState()
    started.setup.financialYear = 'FY2026'
    expect(importFromSaved(savedAnswer(started)).completed).toBe(false)
  })

  it('a finished report comes back with its period and who saved it', () => {
    const found = importFromSaved(savedAnswer(fullState()))
    expect(found.completed).toBe(true)
    expect(found.period).toBe('FY2026')
    expect(found.savedBy).toBe('Sarah Chen')
    expect(found.state.current.figures.tradingIncome.value).toBe(3650000)
  })
})

describe('the card', () => {
  it('🔴 asks the pages route nothing until the button is pressed — Decision A', async () => {
    const wrapper = await mountPanel(savedAnswer(fullState()))
    expect(pagesCalls().length).toBe(0)
    expect(wrapper.vm.savedInfo.period).toBe('FY2026')
    expect(wrapper.findAll('.drd-page').length).toBe(0)
  })

  it('🔴 asks the report\'s route EXACTLY what the report\'s own page asks', async () => {
    const wrapper = await mountPanel(savedAnswer(fullState()))
    await wrapper.vm.bringIn()
    await settle(wrapper)
    const [, fromCard] = pagesCalls()[0]
    expect(fromCard.headers.Authorization).toBe('Bearer tok-9')

    mockRoutes(savedAnswer(fullState()))
    const page = mountWithBuefy(DashboardReportsWorkbench, {
      propsData: { step: 6, restore: fullState(), token: 'tok-9', apiToken: 'tok-9', clientRef: CLIENT }
    })
    await settle(page)
    const [, fromPage] = pagesCalls()[0]
    expect(JSON.parse(fromCard.body)).toEqual(JSON.parse(fromPage.body))
  })

  it('draws the whole report, strips its page names, and records that it was brought in', async () => {
    const wrapper = await mountPanel(savedAnswer(fullState()))
    await wrapper.vm.bringIn()
    await settle(wrapper)
    expect(wrapper.vm.importStatus).toBe('ready')
    expect(wrapper.findAll('.drd-page').length).toBeGreaterThan(8)
    expect(wrapper.vm.strip[0].label).toBe('1 report.dashboardReports.doc.section.summary')
    // The two pages whose own title differs from their contents entry still carry their number.
    const labels = wrapper.vm.strip.map(p => p.label)
    expect(labels).toContain('3 report.dashboardReports.doc.profitLossTitle')
    expect(labels).toContain('4 report.dashboardReports.doc.balanceSheetTitle')
    expect(wrapper.vm.strip.map(p => p.title)).not.toContain('report.dashboardReports.doc.contents')
    expect(wrapper.emitted('brought-in')[0][0]).toEqual({ key: REPORT_IMPORT_KEY, value: 'yes' })
  })

  it('🔴 pressed with no completed report, shows Mike\'s message and no report — Decision C', async () => {
    const wrapper = await mountPanel(savedAnswer(null))
    await wrapper.vm.bringIn()
    await settle(wrapper)
    expect(wrapper.vm.importStatus).toBe('none')
    expect(wrapper.find('.sri-none').text()).toBe('strategyPlanner.reportImport.none')
    expect(pagesCalls().length).toBe(0)
    expect(wrapper.emitted('brought-in')).toBeUndefined()
  })

  it('a failed read says so, never an empty card', async () => {
    const wrapper = await mountPanel(savedAnswer(fullState()), {}, { readFails: true })
    await wrapper.vm.bringIn()
    await settle(wrapper)
    expect(wrapper.vm.importStatus).toBe('failed')
    expect(wrapper.find('.stale').exists()).toBe(true)
    expect(wrapper.findAll('.drd-page').length).toBe(0)
  })

  it('a session that already brought the report in shows it again on open', async () => {
    const wrapper = await mountPanel(savedAnswer(fullState()), { broughtIn: true })
    expect(wrapper.vm.importStatus).toBe('ready')
    expect(wrapper.emitted('brought-in')).toBeUndefined()
  })
})

describe('the Run-session card hosts the panel', () => {
  const StrategyConceptCapture = require('~/components/strategy/StrategyConceptCapture.vue').default

  function mountCard (conceptId) {
    return mountWithBuefy(StrategyConceptCapture, {
      propsData: { name: 'Card', conceptId, capture: forms.captureForConcept(frameworks.getConcept(conceptId)), clientId: CLIENT, token: 'tok-9' },
      stubs: { StrategyReportImport: true, StrategyConceptGraphic: true }
    })
  }

  it('🔴 saves the brought-in marker under the one key the backend admits', async () => {
    const wrapper = mountCard(CONCEPT_ID)
    await settle(wrapper)
    const panel = wrapper.findComponent({ name: 'StrategyReportImport' })
    expect(panel.exists()).toBe(true)
    panel.vm.$emit('brought-in', { key: REPORT_IMPORT_KEY, value: 'yes' })
    const saved = wrapper.emitted('field-changed')[0][0]
    expect(saved).toEqual({ fieldKey: REPORT_IMPORT_KEY, value: 'yes' })
    expect(forms.hasCaptureField(CONCEPT_ID, saved.fieldKey, frameworks.getConcept)).toBe(true)
  })

  it('is on no card whose concept names no report', async () => {
    const wrapper = mountCard('porters-5-forces')
    await settle(wrapper)
    expect(wrapper.findComponent({ name: 'StrategyReportImport' }).exists()).toBe(false)
  })
})

describe('the plan page — Decision D', () => {
  it('🔴 prints the report\'s Executive Summary and nothing else', async () => {
    mockRoutes(savedAnswer(fullState()))
    const wrapper = mountWithBuefy(StrategyReportPlanPage, { propsData: { clientId: CLIENT, apiToken: 'tok-9', number: 4 } })
    await settle(wrapper)
    const pages = wrapper.findAll('.drd-page')
    expect(pages.length).toBe(1)
    expect(pages.at(0).find('.drd-title').text()).toBe('report.dashboardReports.doc.section.summary')
  })

  it('🔴 the client\'s plan carries it only where the report was brought in', async () => {
    const StrategyPlanDocument = require('~/components/strategy/StrategyPlanDocument.vue').default
    const item = reportImport => ({ key: 'k', conceptId: CONCEPT_ID, name: 'Assess', hasTable: true, summary: '', prompts: [], lines: [], reportImport })
    const plan = reportImport => mountWithBuefy(StrategyPlanDocument, {
      propsData: { clientName: 'Harbour Joinery Limited', clientId: CLIENT, apiToken: 'tok-9', steps: [{ name: 'Step', items: [item(reportImport)] }] },
      stubs: { StrategyReportPlanPage: true, StrategyConceptGraphic: true }
    })
    const withIt = plan(true)
    await settle(withIt)
    const page = withIt.findComponent({ name: 'StrategyReportPlanPage' })
    expect(page.exists()).toBe(true)
    // A stub of a lazily loaded component declares no props, so what it was handed shows as attributes.
    expect(page.attributes()).toMatchObject({ 'client-id': CLIENT, 'api-token': 'tok-9' })

    const without = plan(false)
    await settle(without)
    expect(without.findComponent({ name: 'StrategyReportPlanPage' }).exists()).toBe(false)
  })

  it('prints nothing for a client with no completed report', async () => {
    mockRoutes(savedAnswer(null))
    const wrapper = mountWithBuefy(StrategyReportPlanPage, { propsData: { clientId: CLIENT, apiToken: 'tok-9', number: 4 } })
    await settle(wrapper)
    expect(wrapper.findAll('.drd-page').length).toBe(0)
  })
})

describe('the words Mike wrote', () => {
  it('🔴 his no-report message is his own, with the one amendment he allowed', () => {
    // Load-bearing: Mike wrote this message himself on 2026-09-28 (Decision C), and allowed
    // one change — "model library is fine also" — in place of "the Performance Report
    // section". It is the one sentence an advisor reads when the report is not there.
    expect(en.strategyPlanner.reportImport.none).toBe('Sorry - no completed Business Performance Report currently exists for this client. Please complete the report via the Model Library directly, and then you may try to import again.')
  })
})
