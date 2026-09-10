'use strict'

/**
 * The next-steps draft routes (item 4.70, stage 6): start a draft, poll it, tick it
 * ready — and the pages route's gate that prints page 8 on the record alone.
 *
 * 🔴 The first block is the privacy ruling of 2026-09-09 as a test: what actually leaves
 * the app is read from the fake client, and it is eight names and six words.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))
jest.mock('../../server/utils/forecastTrendThresholds', () => ({
  loadResolvedTrendThresholds: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const { loadResolvedTrendThresholds } = require('../../server/utils/forecastTrendThresholds')
const routes = require('../../server/routes/nextStepsDraft')
const { dashboardReportPages } = require('../../server/routes/report')
const runsStore = require('../../server/utils/nextStepsDraftRuns')
const { MEASURE_KEYS } = require('../../server/report/nextStepsDraft')

const FIRM = 'firm-ns-1'
const ADVISOR = 'adv-ns-1'

const MEASURES = MEASURE_KEYS.map((key, i) => ({ key, band: ['green', 'amber', 'red'][i % 3] }))
const POSITIONS = [{ key: 'stockDays', position: 'below' }]
const STEPS = [
  { title: 'Free up cash from stock', body: 'Stock days are red. Run down the slow lines and trim the reorder points.' },
  { title: 'Bring debtor days back', body: 'Debtor days are amber. Shorten the terms on the key accounts.' },
  { title: 'Protect the margin', body: 'Margin is green. Review supplier agreements before the next price round.' }
]

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

function noop () {}

/** `sendError` writes a JSON STRING through writeHead/end — parse it or assertions lie. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function makeReq (overrides) {
  return Object.assign({
    firmId: FIRM,
    advisorId: ADVISOR,
    advisorName: 'Sarah Mitchell',
    userEmail: 'sarah@testfirm.com',
    body: {},
    params: {},
    query: {}
  }, overrides || {})
}

/** A reply in the Responses API shape holding the given draft text. */
function reply (text) {
  return {
    usage: { input_tokens: 900, output_tokens: 120 },
    output: [{ type: 'message', content: [{ type: 'output_text', text, annotations: [] }] }]
  }
}

/** A fake OpenAI client that records what it was sent and replays one reply. */
const sent = {}
function fakeClient (script) {
  return () => ({
    responses: {
      create: (params) => {
        sent.input = params.input
        sent.model = params.model
        sent.tools = params.tools
        sent.stream = params.stream
        sent.format = params.text
        if (script instanceof Error) { return Promise.reject(script) }
        return Promise.resolve(script)
      }
    }
  })
}

/** Drains the un-awaited draft promise the route starts. */
function settle () {
  return new Promise(resolve => setImmediate(() => setImmediate(resolve)))
}

async function draftOnce (script, body) {
  routes._setClientFactory(fakeClient(script))
  const req = makeReq({ body: Object.assign({ measures: MEASURES, positions: POSITIONS, clientRef: 'client-1' }, body || {}) })
  const res = makeMockRes()
  await routes.startDraft(req, res)
  await settle()
  return res._body
}

function poll (runId) {
  const res = makeMockRes()
  routes.getDraft(makeReq({ params: { runId } }), res, noop)
  return res
}

beforeEach(() => {
  runsStore._reset()
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue({})
  loadResolvedTrendThresholds.mockResolvedValue({ levels: {}, movements: {} })
  delete sent.input
})

afterEach(() => { routes._setClientFactory(null) })

describe('🔴 what actually leaves the app', () => {
  test('is the eight names and six words, in the prompt, and nothing with a digit in it', async () => {
    const started = await draftOnce(reply(JSON.stringify({ steps: STEPS })), { clientName: 'Harbourside Kitchen Supplies', revenue: 2840000 })
    expect(started.started).toBe(true)
    expect(sent.input).toContain('- Stock days: red')
    expect(sent.input).toContain('- Sales growth: green')
    expect(sent.input).toContain('- Stock days: below')
    expect(sent.input).not.toContain('Harbourside')
    expect(sent.input).not.toContain('2840000')
    expect(sent.input).not.toContain('client-1')
    // The prompt's own numbering ("## 1.") is the only digit; the list itself carries none.
    expect(started.sent).not.toMatch(/[0-9]/)
    expect(sent.input).toContain(started.sent)
  })

  test('with no tools, no stream, and JSON asked for', async () => {
    await draftOnce(reply(JSON.stringify({ steps: STEPS })))
    expect(sent.tools).toBeUndefined()
    expect(sent.stream).toBeUndefined()
    expect(sent.format).toEqual({ format: { type: 'json_object' } })
    expect(sent.model).toBe(routes.MODEL)
  })

  test('the prompt carries the platform protocols and the hub page\'s own sections', async () => {
    await draftOnce(reply(JSON.stringify({ steps: STEPS })))
    expect(sent.input.startsWith('PLATFORM PROTOCOLS')).toBe(true)
    expect(sent.input).toContain('# Next Steps Draft')
    expect(sent.input).toContain('Never state a number of any kind')
    expect(sent.input).not.toContain('{{measures}}')
  })

  test('🔴 a list holding anything else is refused before any call is made', async () => {
    routes._setClientFactory(fakeClient(reply('{}')))
    for (const body of [
      { measures: [{ key: 'stockDays', band: 'red' }, { key: 'revenue', band: 'green' }] },
      { measures: [{ key: 'stockDays', band: '$45K' }] },
      { measures: [] },
      {}
    ]) {
      const res = makeMockRes()
      await routes.startDraft(makeReq({ body }), res)
      expect(res._status).toBe(400)
      expect(['SEND_LIST_REFUSED', 'NO_SCORE']).toContain(errorBody(res).error.code)
    }
    expect(sent.input).toBeUndefined()
  })
})

describe('starting and polling a draft', () => {
  test('returns a run to poll, and the run finishes with the validated three steps', async () => {
    const started = await draftOnce(reply(JSON.stringify({ steps: STEPS })))
    expect(started).toMatchObject({ started: true, runNumber: 1 })
    const res = poll(started.runId)
    expect(res._status).toBe(200)
    expect(res._body.state).toBe('done')
    expect(res._body.draft.steps).toEqual(STEPS)
    expect(res._body.error).toBeNull()
  })

  test('🔴 a draft with a figure in it is refused and never reaches the screen', async () => {
    const bad = [STEPS[0], Object.assign({}, STEPS[1], { body: 'Release about $45K.' }), STEPS[2]]
    const started = await draftOnce(reply(JSON.stringify({ steps: bad })))
    const res = poll(started.runId)
    expect(res._body.state).toBe('failed')
    expect(res._body.error.code).toBe('DRAFT_HAS_FIGURE')
    expect(res._body.draft).toBeNull()
    expect(JSON.stringify(res._body)).not.toContain('45K')
  })

  test('a malformed reply is refused with a plain message', async () => {
    const started = await draftOnce(reply('Here are your three steps: 1) ...'))
    expect(poll(started.runId)._body.error.code).toBe('DRAFT_MALFORMED')
  })

  test('a failed call is a failed run with a safe message, not a thrown error', async () => {
    const started = await draftOnce(new Error('ECONNRESET at /srv/openai.js:12'))
    const res = poll(started.runId)
    expect(res._body.state).toBe('failed')
    expect(res._body.error.code).toBe('DRAFT_FAILED')
    expect(JSON.stringify(res._body)).not.toContain('/srv/openai.js')
  })

  test('counts drafts per client, and refuses past the cap', async () => {
    for (let i = 0; i < runsStore.MAX_RUNS_PER_CONTEXT; i++) {
      const started = await draftOnce(reply(JSON.stringify({ steps: STEPS })))
      expect(started.runNumber).toBe(i + 1)
    }
    routes._setClientFactory(fakeClient(reply('{}')))
    const res = makeMockRes()
    await routes.startDraft(makeReq({ body: { measures: MEASURES, clientRef: 'client-1' } }), res)
    expect(res._status).toBe(429)
    expect(errorBody(res).error.code).toBe('TOO_MANY_DRAFTS')
    const other = await draftOnce(reply(JSON.stringify({ steps: STEPS })), { clientRef: 'client-2' })
    expect(other.runNumber).toBe(1)
  })

  test('a run is only its own advisor\'s', async () => {
    const started = await draftOnce(reply(JSON.stringify({ steps: STEPS })))
    const res = makeMockRes()
    routes.getDraft(makeReq({ params: { runId: started.runId }, advisorId: 'someone-else' }), res, noop)
    expect(res._status).toBe(404)
    expect(errorBody(res).error.code).toBe('RUN_NOT_FOUND')
  })

  test('an unreadable overlay falls back to the platform prompt rather than blocking the advisor', async () => {
    // The same rule as every other overlay read: the platform defaults are the floor.
    overlay.loadFirmConfig.mockRejectedValue(new Error('overlay down'))
    const started = await draftOnce(reply(JSON.stringify({ steps: STEPS })))
    expect(started.started).toBe(true)
    expect(sent.input).toContain('# Next Steps Draft')
  })
})

describe('the tick — the approval gate', () => {
  async function ready (body, reqOverrides) {
    const res = makeMockRes()
    await routes.setReady(makeReq(Object.assign({ body: Object.assign({ clientRef: 'client-1', ready: true, steps: STEPS }, body || {}) }, reqOverrides || {})), res)
    return res
  }

  test('records typed words with no draft: who, when, typed', async () => {
    const res = await ready()
    expect(res._status).toBe(200)
    expect(res._body.ready).toBe(true)
    expect(res._body.recorded).toBe(true)
    expect(res._body.approval).toMatchObject({ approved: true, approvedBy: { name: 'Sarah Mitchell', email: 'sarah@testfirm.com' }, draftNumber: 0, totalDrafts: 0, edited: [false, false, false] })
    const written = overlay.saveFirmConfig.mock.calls[0]
    expect(written[0]).toBe(FIRM)
    expect(written[1]).toBe('next-steps-approvals')
    expect(written[2].approvals[0].steps).toEqual(STEPS)
  })

  test('names the draft and marks the edited lines when there was one', async () => {
    const started = await draftOnce(reply(JSON.stringify({ steps: STEPS })))
    const edited = [STEPS[0], STEPS[1], { title: 'Protect the margin', body: 'Review the top supplier agreements before the next price round.' }]
    const res = await ready({ runId: started.runId, steps: edited })
    expect(res._body.approval).toMatchObject({ approved: true, draftNumber: 1, totalDrafts: 1, edited: [false, false, true] })
    const record = overlay.saveFirmConfig.mock.calls[0][2].approvals[0]
    expect(record.draft).toEqual(STEPS)
    expect(record.steps).toEqual(edited)
    expect(record.sent).toContain('- Stock days: red')
  })

  test('refuses without a client, with malformed steps, with a blank line, or against an unfinished draft', async () => {
    expect((await ready({ clientRef: '' }))._status).toBe(400)
    expect(errorBody(await ready({ clientRef: '' })).error.code).toBe('CLIENT_REQUIRED')
    expect(errorBody(await ready({ steps: STEPS.slice(0, 2) })).error.code).toBe('STEPS_MALFORMED')
    expect(errorBody(await ready({ steps: [STEPS[0], STEPS[1], { title: 'x' }] })).error.code).toBe('STEPS_MALFORMED')
    expect(errorBody(await ready({ steps: [STEPS[0], STEPS[1], { title: 'Protect', body: '  ' }] })).error.code).toBe('STEPS_INCOMPLETE')
    expect(errorBody(await ready({ runId: 'ns_nothing' })).error.code).toBe('RUN_NOT_FOUND')
    const started = await draftOnce(reply('not json'))
    expect(errorBody(await ready({ runId: started.runId })).error.code).toBe('DRAFT_NOT_READY')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a removed tick is recorded, and a blank line is allowed on the way off', async () => {
    const res = await ready({ ready: false, steps: [STEPS[0], STEPS[1], { title: '', body: '' }] })
    expect(res._status).toBe(200)
    expect(res._body.ready).toBe(false)
    expect(res._body.approval.approved).toBe(false)
    expect(overlay.saveFirmConfig.mock.calls[0][2].approvals[0].isApproved).toBe(false)
  })

  test('says when the record could not be saved, rather than implying it was', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('overlay down'))
    const res = await ready()
    expect(res._status).toBe(200)
    expect(res._body.ready).toBe(true)
    expect(res._body.recorded).toBe(false)
  })
})

describe('🔴 page 8 prints on the record — the pages route', () => {
  const accounts = {
    current: { bank: 224000, accountsReceivable: 365000, stock: 200000, fixedAssets: 505000, currentLiabilities: 410000, accountsPayable: 200000, nonCurrentLiabilities: 205000, tradingIncome: 3650000, costOfSales: 2000000, wages: 596000, operatingExpenses: 102000, depreciation: 38000, interestPaid: 32000 },
    prior: { bank: 183000, accountsReceivable: 250000, stock: 150000, fixedAssets: 470000, currentLiabilities: 387000, accountsPayable: 150000, nonCurrentLiabilities: 220000, tradingIncome: 3000000, costOfSales: 1800000, wages: 550000, operatingExpenses: 98000, depreciation: 35000, interestPaid: 30000 }
  }

  async function pages (nextSteps, firmId) {
    const res = makeMockRes()
    await dashboardReportPages({ firmId: firmId || FIRM, body: Object.assign({}, accounts, { nextSteps }) }, res)
    expect(res._status).toBe(200)
    return res._body.data.nextSteps
  }

  test('with no record the page is withheld, and the shape says so plainly', async () => {
    expect(await pages({ clientRef: 'client-1', steps: STEPS })).toEqual({ approved: false, approvedBy: null, approvedAt: null, draftNumber: 0, totalDrafts: 0, edited: [false, false, false] })
    expect((await pages(undefined)).approved).toBe(false)
  })

  test('with the record and the same words it prints, naming who ticked and which draft', async () => {
    const ticked = makeMockRes()
    await routes.setReady(makeReq({ body: { clientRef: 'client-1', ready: true, steps: STEPS } }), ticked)
    overlay.loadFirmConfig.mockImplementation((firmId, key) => Promise.resolve(key === 'next-steps-approvals' ? overlay.saveFirmConfig.mock.calls[0][2] : null))
    const out = await pages({ clientRef: 'client-1', steps: STEPS })
    expect(out.approved).toBe(true)
    expect(out.approvedBy.name).toBe('Sarah Mitchell')
    expect(JSON.stringify(out)).not.toContain('Free up cash')
  })

  test('🔴 one changed word withholds it — and so does another client\'s ref, or another firm', async () => {
    const ticked = makeMockRes()
    await routes.setReady(makeReq({ body: { clientRef: 'client-1', ready: true, steps: STEPS } }), ticked)
    const record = overlay.saveFirmConfig.mock.calls[0][2]
    overlay.loadFirmConfig.mockImplementation((firmId, key) => Promise.resolve(firmId === FIRM && key === 'next-steps-approvals' ? record : null))
    const edited = [STEPS[0], STEPS[1], { title: STEPS[2].title, body: STEPS[2].body + '!' }]
    expect((await pages({ clientRef: 'client-1', steps: edited })).approved).toBe(false)
    expect((await pages({ clientRef: 'client-2', steps: STEPS })).approved).toBe(false)
    expect((await pages({ clientRef: 'client-1', steps: STEPS }, 'other-firm')).approved).toBe(false)
    expect((await pages({ clientRef: 'client-1', steps: STEPS })).approved).toBe(true)
  })

  test('an unreadable record is unapproved, never an error on the client\'s report', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('overlay down'))
    expect((await pages({ clientRef: 'client-1', steps: STEPS })).approved).toBe(false)
  })
})
