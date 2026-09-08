/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * Stage 6 of the Business Performance Report on screen (item 4.70): the draft block on
 * step 4 and page 8's gate in the document, against
 * `design/mockups/business-performance-report-next-steps-draft.html` (approved 2026-09-09).
 *
 * What UAT cannot see, and this can: that the request holds the eight colour words and
 * nothing else; that a draft fills only the lines the advisor has not written; that the
 * tick's record is what prints page 8, and a changed word clears it.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const DashboardReportsWorkbench = require('~/components/DashboardReportsWorkbench.vue').default
const { computeReportPages } = require('~/server/report/dashboardReportPagesModel')
const { emptyState } = require('~/utils/dashboardReportsSavedShape')

const THRESHOLDS = {
  // The two ratio rows carry Mike's four figures (2026-09-08), so the score counts eight.
  levels: { debtorDays: { green: 35, amber: 45 }, creditorDays: { green: 35, amber: 45 }, stockDays: { green: 30, amber: 60 }, currentRatio: { green: 1.5, amber: 1.0 }, debtToEquity: { green: 1.0, amber: 2.0 } },
  movements: { salesGrowth: { warn: 0, crit: -5 }, grossMargin: { warn: 1, crit: 3 }, overheadRatio: { warn: 1, crit: 3 } }
}
const line = (value, source) => ({ value, source: source || 'file' })
const CURRENT = { bank: line(224000), accountsReceivable: line(365000), stock: line(200000), otherCurrentAssets: line(11000), fixedAssets: line(505000), currentLiabilities: line(410000), accountsPayable: line(200000), nonCurrentLiabilities: line(205000), tradingIncome: line(3650000), otherIncome: line(10000), costOfSales: line(2000000), wages: line(596000), operatingExpenses: line(102000), depreciation: line(38000), interestPaid: line(32000), netCapitalSpend: line(85000, 'entered') }
const PRIOR = { bank: line(183000), accountsReceivable: line(250000), stock: line(150000), otherCurrentAssets: line(9000), fixedAssets: line(470000), currentLiabilities: line(387000), accountsPayable: line(150000), nonCurrentLiabilities: line(220000), tradingIncome: line(3000000), otherIncome: line(8000), costOfSales: line(1800000), wages: line(550000), operatingExpenses: line(98000), depreciation: line(35000), interestPaid: line(30000) }

const DRAFT = [
  { title: 'Free up cash from stock', body: 'Stock days are red. Run down the slow lines.' },
  { title: 'Bring debtor days back', body: 'Debtor days are amber. Shorten the terms.' },
  { title: 'Protect the margin', body: 'Margin is green. Review the supplier agreements.' }
]

function twoYearState () {
  const s = emptyState()
  s.setup = { financialYear: 'FY2026', dateIssued: '2026-09-08', preparedBy: 'Jordan Reid' }
  s.hasPrior = true
  s.current = { balanceSheetDate: 'As at 30 June 2026', profitLossDate: 'For the year ended 30 June 2026', figures: CURRENT }
  s.prior = { balanceSheetDate: 'As at 30 June 2025', profitLossDate: 'For the year ended 30 June 2025', figures: PRIOR }
  return s
}

function figuresWith (nextSteps) {
  const f = computeReportPages({ current: CURRENT, prior: PRIOR, thresholds: THRESHOLDS })
  f.benchmarks = null
  f.nextSteps = nextSteps || { approved: false, approvedBy: null, approvedAt: null, draftNumber: 0, totalDrafts: 0, edited: [false, false, false] }
  return f
}

/** A fetch that answers the pages route with `figures` and records every other call. */
function fakeFetch (figures, answers) {
  const calls = []
  global.fetch = jest.fn((url, opts) => {
    calls.push({ url, opts })
    if (url === '/api/report/dashboard-reports/pages') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: figures }) })
    }
    const hit = (answers || []).find(a => url.startsWith(a.url))
    return Promise.resolve({ ok: hit ? hit.ok !== false : false, json: () => Promise.resolve(hit ? hit.body : { error: { code: 'X', message: 'no' } }) })
  })
  return calls
}

async function settle (wrapper, n) {
  for (let i = 0; i < (n || 4); i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
}

async function mountAt (step, state, figures, answers, props) {
  const calls = fakeFetch(figures, answers)
  const wrapper = mountWithBuefy(DashboardReportsWorkbench, {
    propsData: Object.assign({ step, restore: state, token: 'tok-123', apiToken: 'tok-123', clientName: 'Harbourside Kitchen Supplies Ltd', clientRef: 'client-77' }, props || {})
  })
  await settle(wrapper)
  return { wrapper, calls }
}

afterEach(() => { delete global.fetch; jest.useRealTimers() })

describe('step 4 — the draft block', () => {
  it('🔴 THE BLUE BOX AND THE REQUEST ARE THE SAME LIST: eight colour words, and no figure', async () => {
    const started = { url: '/api/report/dashboard-reports/next-steps', body: { started: true, runId: 'ns_1', runNumber: 1, sent: '' } }
    const { wrapper, calls } = await mountAt(4, twoYearState(), figuresWith(), [started])
    const block = wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' })
    expect(block.exists()).toBe(true)
    const shown = block.findAll('.drn-sent-row')
    expect(shown.length).toBe(8)
    expect(block.find('.drn-sendbox').text()).not.toMatch(/[0-9]/)

    await block.find('button').trigger('click')
    await settle(wrapper)
    const req = calls.find(c => c.url === '/api/report/dashboard-reports/next-steps')
    expect(req).toBeTruthy()
    expect(req.opts.headers.Authorization).toBe('Bearer tok-123')
    const body = JSON.parse(req.opts.body)
    expect(body.measures.map(m => m.key)).toEqual(['salesGrowth', 'grossMargin', 'overheadRatio', 'debtorDays', 'creditorDays', 'stockDays', 'currentRatio', 'debtToEquity'])
    body.measures.forEach(m => expect(['green', 'amber', 'red']).toContain(m.band))
    expect(body.clientRef).toBe('client-77')
    expect(Object.keys(body).sort()).toEqual(['clientRef', 'measures', 'positions'])
    expect(JSON.stringify(body)).not.toMatch(/[0-9]{3,}/)
  })

  it('a finished draft fills the three lines, records the draft on the state, and marks the lines AI draft', async () => {
    jest.useFakeTimers()
    const answers = [
      { url: '/api/report/dashboard-reports/next-steps/ns_1', body: { runId: 'ns_1', state: 'done', runNumber: 1, error: null, draft: { steps: DRAFT } } },
      { url: '/api/report/dashboard-reports/next-steps', body: { started: true, runId: 'ns_1', runNumber: 1, sent: '' } }
    ]
    const { wrapper } = await mountAt(4, twoYearState(), figuresWith(), answers)
    const block = wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' })
    await block.find('button').trigger('click')
    await settle(wrapper)
    jest.advanceTimersByTime(2000)
    await settle(wrapper, 6)

    const state = wrapper.vm.state
    expect(state.words.steps).toEqual(DRAFT)
    expect(state.words.draft.number).toBe(1)
    expect(state.words.draft.runId).toBe('ns_1')
    expect(state.words.draft.steps).toEqual(DRAFT)
    expect(wrapper.emitted().state.length).toBeGreaterThan(0)
    const badges = wrapper.findAllComponents({ name: 'ProvenanceBadge' }).filter(b => b.props('source') === 'ai')
    expect(badges.length).toBe(3)
  })

  it('a draft never overwrites a line the advisor wrote', async () => {
    jest.useFakeTimers()
    const s = twoYearState()
    s.words.steps = [{ title: 'My own first step', body: 'In my own words.' }, { title: '', body: '' }, { title: '', body: '' }]
    const answers = [
      { url: '/api/report/dashboard-reports/next-steps/ns_1', body: { runId: 'ns_1', state: 'done', runNumber: 1, error: null, draft: { steps: DRAFT } } },
      { url: '/api/report/dashboard-reports/next-steps', body: { started: true, runId: 'ns_1', runNumber: 1, sent: '' } }
    ]
    const { wrapper } = await mountAt(4, s, figuresWith(), answers)
    await wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' }).find('button').trigger('click')
    await settle(wrapper)
    jest.advanceTimersByTime(2000)
    await settle(wrapper, 6)
    expect(wrapper.vm.state.words.steps[0]).toEqual({ title: 'My own first step', body: 'In my own words.' })
    expect(wrapper.vm.state.words.steps[1]).toEqual(DRAFT[1])
  })

  it('a refused draft says why and leaves the lines alone', async () => {
    jest.useFakeTimers()
    const answers = [
      { url: '/api/report/dashboard-reports/next-steps/ns_1', body: { runId: 'ns_1', state: 'failed', runNumber: 1, error: { code: 'DRAFT_HAS_FIGURE', message: 'The draft stated a figure.' }, draft: null } },
      { url: '/api/report/dashboard-reports/next-steps', body: { started: true, runId: 'ns_1', runNumber: 1, sent: '' } }
    ]
    const { wrapper } = await mountAt(4, twoYearState(), figuresWith(), answers)
    const block = wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' })
    await block.find('button').trigger('click')
    await settle(wrapper)
    jest.advanceTimersByTime(2000)
    await settle(wrapper, 6)
    expect(block.find('.drn-error').text()).toBe('The draft stated a figure.')
    expect(wrapper.vm.state.words.steps.every(s => !s.title && !s.body)).toBe(true)
    expect(wrapper.vm.state.words.draft).toBeNull()
  })

  it('with one year of accounts there is no score, and the button is off', async () => {
    const s = twoYearState()
    s.hasPrior = false
    const f = computeReportPages({ current: CURRENT, prior: null, thresholds: THRESHOLDS })
    f.benchmarks = null
    const { wrapper } = await mountAt(4, s, f)
    const block = wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' })
    expect(block.findAll('.drn-sent-row').length).toBe(0)
    expect(block.find('button').attributes('disabled')).toBe('disabled')
  })
})

describe('step 4 — the tick', () => {
  const approval = { approved: true, approvedBy: { name: 'Sarah Mitchell', email: '' }, approvedAt: '2026-09-09T02:00:00.000Z', draftNumber: 0, totalDrafts: 0, edited: [false, false, false] }

  it('🔴 sends the three lines as they stand, and takes the server\'s record back', async () => {
    const s = twoYearState()
    s.words.steps = DRAFT
    const answers = [{ url: '/api/report/dashboard-reports/next-steps/ready', body: { ready: true, approval, recorded: true } }]
    const { wrapper, calls } = await mountAt(4, s, figuresWith(), answers)
    const box = wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' }).findComponent({ name: 'BCheckbox' })
    expect(box.props('disabled')).toBe(false)
    box.vm.$emit('input', true)
    await settle(wrapper, 6)
    const req = calls.find(c => c.url === '/api/report/dashboard-reports/next-steps/ready')
    const body = JSON.parse(req.opts.body)
    expect(body).toEqual({ clientRef: 'client-77', ready: true, steps: DRAFT })
    expect(wrapper.vm.approval).toEqual(approval)
  })

  it('is off with no client chosen, and off while a line is blank', async () => {
    const s = twoYearState()
    s.words.steps = DRAFT
    const noClient = await mountAt(4, s, figuresWith(), [], { clientRef: '' })
    expect(noClient.wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' }).findComponent({ name: 'BCheckbox' }).props('disabled')).toBe(true)
    const blank = twoYearState()
    blank.words.steps = [DRAFT[0], DRAFT[1], { title: 'Protect the margin', body: '' }]
    const half = await mountAt(4, blank, figuresWith())
    expect(half.wrapper.findComponent({ name: 'DashboardReportsNextStepsDraft' }).findComponent({ name: 'BCheckbox' }).props('disabled')).toBe(true)
  })

  it('🔴 a changed word clears the tick at once', async () => {
    const s = twoYearState()
    s.words.steps = DRAFT
    const { wrapper } = await mountAt(4, s, figuresWith(approval))
    expect(wrapper.vm.approval.approved).toBe(true)
    const words = wrapper.findComponent({ name: 'DashboardReportsWords' })
    words.vm.$emit('change', Object.assign({}, s.words, { summary: 'A strong year' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.approval.approved).toBe(true)
    words.vm.$emit('change', Object.assign({}, s.words, { steps: [DRAFT[0], DRAFT[1], { title: 'Protect the margin', body: 'Changed.' }] }))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.approval.approved).toBe(false)
  })
})

describe('page 8 — prints on the record', () => {
  it('🔴 is withheld with no record, and the advisor is told why; a client sees nothing in its place', async () => {
    const s = twoYearState()
    s.words.steps = DRAFT
    const advisor = await mountAt(6, s, figuresWith())
    expect(advisor.wrapper.findComponent({ name: 'DashboardReportNextSteps' }).exists()).toBe(false)
    expect(advisor.wrapper.find('.drd-withheld').exists()).toBe(true)
    const client = await mountAt(6, s, figuresWith(), [], { clientMode: true })
    expect(client.wrapper.findComponent({ name: 'DashboardReportNextSteps' }).exists()).toBe(false)
    expect(client.wrapper.find('.drd-withheld').exists()).toBe(false)
  })

  it('prints on the record, marked typed or drafted by what the state says', async () => {
    const approval = { approved: true, approvedBy: { name: 'Sarah Mitchell', email: '' }, approvedAt: '2026-09-09T02:00:00.000Z', draftNumber: 1, totalDrafts: 1, edited: [false, true, false] }
    const typed = twoYearState()
    typed.words.steps = DRAFT
    const a = await mountAt(6, typed, figuresWith(approval))
    const page = a.wrapper.findComponent({ name: 'DashboardReportNextSteps' })
    expect(page.exists()).toBe(true)
    expect(page.props('drafted')).toBe(false)
    const drafted = twoYearState()
    drafted.words.steps = DRAFT
    drafted.words.draft = { number: 1, runId: 'ns_1', steps: DRAFT, madeAt: '2026-09-09T01:00:00.000Z' }
    const b = await mountAt(6, drafted, figuresWith(approval))
    expect(b.wrapper.findComponent({ name: 'DashboardReportNextSteps' }).props('drafted')).toBe(true)
  })
})
