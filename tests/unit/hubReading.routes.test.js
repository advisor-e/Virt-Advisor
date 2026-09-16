'use strict'

/**
 * "Read this for me" — the two routes (Mike, 2026-09-11). What UAT cannot see: which scope
 * a reading is stored at, that a failed model call is a failure and never a stored empty
 * reading, that the page carries the stored reading and says when it is stale, and that
 * the reading never touches the decisions row.
 */

process.env.JWT_SECRET = 'test-secret-for-hub-reading'

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))
jest.mock('../../server/utils/activityStore', () => ({ readAdoptionByFirm: jest.fn() }))
jest.mock('../../server/utils/firmsDirectory', () => ({ listFirms: jest.fn() }))
jest.mock('../../server/utils/templateLibrary', () => ({ loadEffectiveTemplates: jest.fn(), clearTemplateCache: jest.fn() }))
jest.mock('../../server/utils/firmOverlay', () => ({
  listFirmIdsWithConfigKey: jest.fn(),
  loadFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const { loadEffectiveTemplates } = require('../../server/utils/templateLibrary')
const hubReading = require('../../server/utils/hubReading')
const outcome = require('../../server/routes/outcomeLearning')
const mentor = require('../../server/routes/mentor')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { DECISIONS_KEY } = require('../../server/utils/outcomeLearning')
const { groupScopeId } = require('../../server/utils/tierChain')

const MENTOR = 'mentor@advisor-e.example'
const GOOD = { standsOut: 'a', doFirst: 'b', notYet: 'c' }

function makeRes () {
  return {
    headersSent: false,
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (json) { this._body = JSON.parse(json) }
  }
}

const req = (over = {}) => ({ userEmail: MENTOR, firmId: PLATFORM_SCOPE, body: {}, headers: {}, socket: { remoteAddress: '127.0.0.' + Math.floor(Math.random() * 250) }, ...over })

function pool (cases, firms) {
  const rows = {}
  for (let i = 0; i < cases; i++) {
    rows['t' + (i % firms) + ':c' + i] = { v: 1, month: '2026-09', domain: 'profit', primaryIssue: null, industry: null, signals: [], engagementType: 'advice', staircaseStep: null, templates: [{ title: 'Break-even Analysis', used: 'full', outcome: i % 3 === 0 ? 'less' : 'well' }] }
  }
  return rows
}

let makeSpy
beforeEach(() => {
  jest.clearAllMocks()
  loadEffectiveTemplates.mockResolvedValue([{ title: 'Break-even Analysis' }])
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool(31, 6))
  overlay.listFirmIdsWithConfigKey.mockResolvedValue([])
  overlay.saveFirmConfig.mockResolvedValue(1)
  jest.spyOn(console, 'error').mockImplementation(() => {})
  makeSpy = jest.spyOn(hubReading, 'makeReading')
})
afterEach(() => { jest.restoreAllMocks() })

describe('POST /api/mentor/outcome-learning/reading', () => {
  test('sends the model the page payload, stores the reading on its OWN row at the platform scope, and returns it', async () => {
    makeSpy.mockResolvedValue({ ok: true, reading: Object.assign({ readAt: '2026-09-11T05:00:00.000Z', from: { firms: 6, cases: 31, live: 0 }, model: 'm' }, GOOD) })
    const res = makeRes()
    await outcome.reading(req(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true, reading: Object.assign({ readAt: '2026-09-11T05:00:00.000Z', from: { firms: 6, cases: 31, live: 0 } }, GOOD), readingStale: false })
    // What the model was sent: the page, never the pool keys.
    const payload = makeSpy.mock.calls[0][0]
    expect(payload).toMatchObject({ page: 'outcome-learning', firms: 6, cases: 31 })
    expect(JSON.stringify(payload)).not.toContain('t0:c0')
    // Stored on the reading row, signed by the token, and the decisions row untouched.
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe(outcome.READING_KEY)
    expect(key).not.toBe(DECISIONS_KEY)
    expect(value).toMatchObject(GOOD)
    expect(by).toBe(MENTOR)
  })

  test('a failed reading is a 502 and nothing is stored', async () => {
    makeSpy.mockResolvedValue({ ok: false, reading: null })
    const res = makeRes()
    await outcome.reading(req(), res)
    expect(res._status).toBe(502)
    expect(res._body.error.code).toBe('READING_FAILED')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a pool that cannot be read is a 500 with the safe shape, and the model is never called', async () => {
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1:3306'))
    const res = makeRes()
    await outcome.reading(req(), res)
    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    expect(JSON.stringify(res._body)).not.toContain('10.0.0.1')
    expect(makeSpy).not.toHaveBeenCalled()
  })

  test('a store that cannot save the reading is a 500', async () => {
    makeSpy.mockResolvedValue({ ok: true, reading: Object.assign({ readAt: 'x', from: {} }, GOOD) })
    overlay.saveFirmConfig.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await outcome.reading(req(), res)
    expect(res._status).toBe(500)
  })

  test('the page carries the stored reading and says it is stale once the pool has moved on', async () => {
    overlay.loadFirmConfig.mockImplementation((_scope, key) => Promise.resolve(key === outcome.READING_KEY
      ? Object.assign({ readAt: '2026-09-10T00:00:00.000Z', from: { firms: 6, cases: 30, live: 0 } }, GOOD)
      : null))
    const res = makeRes()
    await outcome.list(req(), res)
    expect(res._body.reading).toEqual(Object.assign({ readAt: '2026-09-10T00:00:00.000Z', from: { firms: 6, cases: 30, live: 0 } }, GOOD))
    expect(res._body.readingStale).toBe(true)
    // The same counts: not stale.
    overlay.loadFirmConfig.mockImplementation((_scope, key) => Promise.resolve(key === outcome.READING_KEY
      ? Object.assign({ from: { firms: 6, cases: 31, live: 0 } }, GOOD)
      : null))
    const res2 = makeRes()
    await outcome.list(req(), res2)
    expect(res2._body.readingStale).toBe(false)
  })

  test('a reading row that cannot be read does not take the page with it', async () => {
    overlay.loadFirmConfig.mockImplementation((_scope, key) => key === outcome.READING_KEY ? Promise.reject(new Error('boom')) : Promise.resolve(null))
    const res = makeRes()
    await outcome.list(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.reading).toBeNull()
    expect(res._body.readingStale).toBe(false)
  })
})

describe('POST /api/mentor/logic-lab-report/reading', () => {
  test('stores the reading at the VIEWER\'S scope — a group manager\'s reading never lands on the mentor\'s row', async () => {
    makeSpy.mockResolvedValue({ ok: true, reading: Object.assign({ readAt: 'x', from: { firms: 0, edits: 0 }, model: 'm' }, GOOD) })
    const scope = groupScopeId('Advisor-e', 'DE')
    const res = makeRes()
    await mentor.getLogicLabReading(req({ firmId: scope, userEmail: 'gm@x' }), res)
    expect(res._status).toBe(200)
    expect(res._body.reading).toMatchObject(GOOD)
    const [savedScope, key, , by] = overlay.saveFirmConfig.mock.calls[0]
    expect(savedScope).toBe(scope)
    expect(key).toBe(mentor.LOGIC_LAB_READING_KEY)
    expect(by).toBe('gm@x')
    expect(makeSpy.mock.calls[0][0]).toMatchObject({ page: 'logic-lab-report' })
  })

  test('a failed reading is a 502 and nothing is stored', async () => {
    makeSpy.mockResolvedValue({ ok: false, reading: null })
    const res = makeRes()
    await mentor.getLogicLabReading(req(), res)
    expect(res._status).toBe(502)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('the report carries the stored reading for this scope and whether it is stale', async () => {
    overlay.loadFirmConfig.mockImplementation((_scope, key) => Promise.resolve(key === mentor.LOGIC_LAB_READING_KEY
      ? Object.assign({ readAt: 'x', from: { firms: 0, edits: 0 } }, GOOD)
      : null))
    const res = makeRes()
    await mentor.getLogicLabReport(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.report.reading).toMatchObject(GOOD)
    expect(res._body.report.readingStale).toBe(false)
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, mentor.LOGIC_LAB_READING_KEY)
  })
})
