'use strict'

/**
 * @file Item 7.26 — every backend AI call sends its output ceiling, under the name its model
 * accepts.
 *
 * Why these are pinned: UAT cannot see a request, and a stand-in model cannot show what a real
 * one does without a ceiling (a runaway reply, a bill) or with the wrong parameter (a refusal).
 * The astra model refuses `max_tokens` and any non-default `temperature` — proven by live calls
 * on 2026-10-01 — so the calls routed to it must send `max_completion_tokens` and no temperature.
 * The depreciation reader is the one deliberate exception: a full IR265 read is ~2,800 rows,
 * near the model's own maximum, so any ceiling cuts real readings. Mike ruled 2026-10-01 that
 * it stays uncapped.
 *
 * Every client here is a stand-in that records what it was sent; nothing leaves the machine.
 */

// The module, not a spy: modules destructure `createOpenAIClient` when they load.
jest.mock('../../server/utils/openaiClient', () => Object.assign(
  {}, jest.requireActual('../../server/utils/openaiClient'), { createOpenAIClient: jest.fn() }))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const { createOpenAIClient } = require('../../server/utils/openaiClient')
const overlay = require('../../server/utils/firmOverlay')
const compliance = require('../../server/utils/complianceCheck')
const conceptSummary = require('../../server/utils/conceptSummary')
const tidy = require('../../server/utils/passageTidy')
const meeting = require('../../server/utils/meetingReports')
const ws = require('../../server/utils/wordsmith')
const ui = require('../../server/utils/uiTranslation')
const economic = require('../../server/routes/economicAnalysis')
const economicRuns = require('../../server/utils/economicAnalysisRuns')
const nextSteps = require('../../server/routes/nextStepsDraft')
const nextStepsRuns = require('../../server/utils/nextStepsDraftRuns')
const { MEASURE_KEYS } = require('../../server/report/nextStepsDraft')
const schedule = require('../../server/utils/countryScheduleRead')
const depreciation = require('../../server/utils/depreciationExtract')

/** A chat-completions stand-in that records every request and refuses it. */
function chatRecorder () {
  const sent = []
  const client = { chat: { completions: { create: (params) => { sent.push(params); return Promise.reject(new Error('stand-in')) } } } }
  return { client, sent }
}

/** A Responses-API factory stand-in that records every request; `reply(i)` answers request i. */
function responsesRecorder (reply) {
  const sent = []
  const factory = () => ({
    responses: {
      create: (params) => {
        sent.push(params)
        return reply ? reply(sent.length - 1) : Promise.reject(new Error('stand-in'))
      }
    }
  })
  return { factory, sent }
}

/** Drains a route's un-awaited model call. */
function settle () {
  return new Promise(resolve => setImmediate(() => setImmediate(resolve)))
}

function mockRes () {
  return { headersSent: false, send () {}, writeHead () { this.headersSent = true }, end () {} }
}

const noConfig = () => Promise.resolve(null)
const segments = n => Array.from({ length: n }, (_, i) => ({ start: i, role: 'client', text: 'Line ' + i + '.' }))

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue({})
  ;['log', 'warn', 'error'].forEach(m => jest.spyOn(console, m).mockImplementation(() => {}))
})

afterEach(() => {
  jest.restoreAllMocks()
  ;[economic, nextSteps, schedule, depreciation].forEach(m => m._setClientFactory(null))
})

// Without this, a ceiling deleted from its module reads `undefined`, the request sends no limit
// either, and each test below would compare undefined with undefined and pass.
test('every ceiling is a positive number', () => {
  const ceilings = [
    compliance.MAX_COMPLETION_TOKENS, conceptSummary.SUMMARY_MAX_TOKENS,
    tidy.TIDY_TOKENS_PER_PASSAGE, tidy.TIDY_MIN_TOKENS,
    meeting.SUMMARY_MAX_TOKENS, meeting.COACHING_TOKENS_PER_POINT, meeting.COACHING_MIN_TOKENS,
    ws.SORT_TOKENS_PER_LINE, ws.SORT_MIN_TOKENS, ws.STYLE_MAX_TOKENS, ws.DRAFT_MAX_COMPLETION_TOKENS,
    ui.BATCH_MAX_TOKENS, economic.MAX_OUTPUT_TOKENS, nextSteps.MAX_OUTPUT_TOKENS,
    schedule.SURVEY_MAX_OUTPUT_TOKENS, schedule.PASS_MAX_OUTPUT_TOKENS
  ]
  ceilings.forEach(n => expect(Number.isInteger(n) && n > 0).toBe(true))
})

describe('chat-completions calls', () => {
  test('compliance check: max_completion_tokens, and neither max_tokens nor temperature (astra)', async () => {
    const { client, sent } = chatRecorder()
    createOpenAIClient.mockReturnValue(client)
    await compliance.runCheck({ scopeId: 'firm-1', documents: [{ name: 'Policy.pdf' }], loadFirmConfig: noConfig })

    expect(sent).toHaveLength(1)
    expect(sent[0].max_completion_tokens).toBe(compliance.MAX_COMPLETION_TOKENS)
    expect(sent[0]).not.toHaveProperty('max_tokens')
    expect(sent[0]).not.toHaveProperty('temperature')
  })

  test('concept summary: max_tokens', async () => {
    const { client, sent } = chatRecorder()
    await expect(conceptSummary.generate({ segments: segments(3), conceptName: 'SWOT', headings: ['Strengths'], client })).rejects.toThrow()
    expect(sent[0].max_tokens).toBe(conceptSummary.SUMMARY_MAX_TOKENS)
  })

  test.each([
    ['the floor, for a few passages', 2, () => tidy.TIDY_MIN_TOKENS],
    ['the per-passage figure, for many', 10, () => tidy.TIDY_TOKENS_PER_PASSAGE * 10]
  ])('passage tidy: max_tokens is %s', async (_label, n, expected) => {
    const { client, sent } = chatRecorder()
    const passages = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, box: null, heard: [{ role: 'client', text: 'Said ' + i }] }))
    await expect(tidy.suggest({ passages, conceptName: 'SWOT', client })).rejects.toThrow()
    expect(sent[0].max_tokens).toBe(Math.max(tidy.TIDY_MIN_TOKENS, tidy.TIDY_TOKENS_PER_PASSAGE * n))
    expect(sent[0].max_tokens).toBe(expected())
  })

  test('meeting summary: max_tokens', async () => {
    const { client, sent } = chatRecorder()
    await expect(meeting.generateSummary({ transcript: { segments: segments(3) }, client })).rejects.toThrow()
    expect(sent[0].max_tokens).toBe(meeting.SUMMARY_MAX_TOKENS)
  })

  test('coaching notes: max_tokens scales with the points asked, above the floor', async () => {
    const { client, sent } = chatRecorder()
    const points = Array.from({ length: 20 }, (_, i) => ({ id: 'mo-' + i, text: 'Point ' + i }))
    await expect(meeting.generateCoachingNotes({ transcript: { segments: segments(3) }, points, client })).rejects.toThrow()

    const expected = meeting.COACHING_TOKENS_PER_POINT * points.length
    expect(expected).toBeGreaterThan(meeting.COACHING_MIN_TOKENS)
    expect(sent[0].max_tokens).toBe(expected)
  })

  test('UI translation: max_tokens on each batch', async () => {
    ui._reset()
    const { client, sent } = chatRecorder()
    await ui.getLocale('ja', '', { client })
    await ui._states.get('ja').jobPromise

    expect(sent.length).toBeGreaterThan(0)
    sent.forEach(params => expect(params.max_tokens).toBe(ui.BATCH_MAX_TOKENS))
  })
})

describe('Wordsmith — two models, two parameter names', () => {
  const allowed = { conceptId: ws.ALIGNMENT_CONCEPT_ID, consentConfirmed: true, purpose: 'a poster', style: 'plain' }
  const SETTINGS = { sentenceLength: 'short', formality: 'plain', jargon: 'avoid', voice: 'we', tone: [], audience: '' }
  const kept = () => {
    const sorted = {}
    ws.STATEMENT_NAMES.forEach((n) => { sorted[n] = [] })
    sorted.Vision = [{ line: 1, text: 'We want to be the most trusted business in town.', start: 0, role: 'client' }]
    return sorted
  }

  test('sort: max_tokens scales with the transcript', async () => {
    const read = chatRecorder()
    const rows = segments(250)
    await expect(ws.run(Object.assign({}, allowed, { segments: rows, clients: { read: read.client, write: chatRecorder().client } }))).rejects.toThrow()

    const expected = ws.SORT_TOKENS_PER_LINE * rows.length + 200
    expect(expected).toBeGreaterThan(ws.SORT_MIN_TOKENS)
    expect(read.sent[0].max_tokens).toBe(expected)
  })

  test('style: max_tokens', async () => {
    const read = chatRecorder()
    await expect(ws.run(Object.assign({}, allowed, { segments: segments(3), sorted: kept(), clients: { read: read.client, write: chatRecorder().client } }))).rejects.toThrow()
    expect(read.sent[0].max_tokens).toBe(ws.STYLE_MAX_TOKENS)
  })

  test('draft: max_completion_tokens, and neither max_tokens nor temperature (astra)', async () => {
    const write = chatRecorder()
    await expect(ws.run(Object.assign({}, allowed, { segments: segments(3), sorted: kept(), settings: SETTINGS, clients: { read: chatRecorder().client, write: write.client } }))).rejects.toThrow()

    expect(write.sent[0].max_completion_tokens).toBe(ws.DRAFT_MAX_COMPLETION_TOKENS)
    expect(write.sent[0]).not.toHaveProperty('max_tokens')
    expect(write.sent[0]).not.toHaveProperty('temperature')
  })
})

describe('Responses-API calls — max_output_tokens', () => {
  const req = body => ({ firmId: 'firm-1', advisorId: 'adv-1', body, params: {}, query: {} })

  test('economic analysis research', async () => {
    economicRuns._reset()
    const { factory, sent } = responsesRecorder()
    economic._setClientFactory(factory)
    await economic.startResearch(req({ brief: 'A physiotherapy clinic, 9 staff, two sites in Galway, Ireland. Seeking finance for a third.' }), mockRes())
    await settle()

    expect(sent).toHaveLength(1)
    expect(sent[0].max_output_tokens).toBe(economic.MAX_OUTPUT_TOKENS)
  })

  test('next-steps draft', async () => {
    nextStepsRuns._reset()
    const { factory, sent } = responsesRecorder()
    nextSteps._setClientFactory(factory)
    const measures = MEASURE_KEYS.map((key, i) => ({ key, band: ['green', 'amber', 'red'][i % 3] }))
    await nextSteps.startDraft(req({ measures, positions: [], clientRef: 'client-1' }), mockRes())
    await settle()

    expect(sent).toHaveLength(1)
    expect(sent[0].max_output_tokens).toBe(nextSteps.MAX_OUTPUT_TOKENS)
  })

  test('country schedule: the survey and every pass carry their own ceilings', async () => {
    const survey = {
      readable: true,
      document: { name: 'IR265', published: '2023-10', country: 'NZ' },
      totalPages: 20,
      tableRanges: [{ from: 1, to: 16 }],
      firstYearRuleFound: false,
      whyUnreadable: null
    }
    const { factory, sent } = responsesRecorder((i) => {
      const text = JSON.stringify(i === 0 ? survey : { readable: true, classes: [], unresolved: [], whyUnreadable: null })
      return Promise.resolve((async function * () { yield { type: 'response.completed', response: { output_text: text } } })())
    })
    schedule._setClientFactory(factory)
    await schedule.readSchedule({ scopeId: '__global__:Advisor-e', country: 'NZ', filename: 'ir265.pdf', buffer: Buffer.from('%PDF-1.4'), loadFirmConfig: noConfig })

    expect(sent.length).toBeGreaterThan(1)
    expect(sent[0].max_output_tokens).toBe(schedule.SURVEY_MAX_OUTPUT_TOKENS)
    sent.slice(1).forEach(params => expect(params.max_output_tokens).toBe(schedule.PASS_MAX_OUTPUT_TOKENS))
  })

  test('depreciation read sends NO ceiling — uncapped by Mike\'s ruling of 2026-10-01', async () => {
    const { factory, sent } = responsesRecorder()
    depreciation._setClientFactory(factory)
    await depreciation.readDocument({ scopeId: '__global__:Advisor-e', country: 'NZ', filename: 'ir265.pdf', buffer: Buffer.from('%PDF-1.4'), loadFirmConfig: noConfig })

    expect(sent).toHaveLength(1)
    expect(sent[0]).not.toHaveProperty('max_output_tokens')
  })
})
