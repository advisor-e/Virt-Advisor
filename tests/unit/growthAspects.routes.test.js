'use strict'

/**
 * The Growth Aspect Questions tab's routes — item 15.2.
 *
 * WHAT UAT CANNOT SEE: that a scope id in a request body is obeyed (one tier writing
 * another's wording), that a refused save reaches the store anyway, that a repeat of the
 * inherited wording is stored and freezes it, or that a database fault leaks its text.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const fs = require('fs')
const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/growthAspects')
const { BASE_ASPECTS, CONFIG_KEY } = require('../../server/utils/growthAspects')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

/** A request from a manager whose verified scope is `scope`. */
function req (scope, over) {
  return Object.assign({ firmId: scope, userEmail: 'mentor@advisor-e.com', body: {}, query: {} }, over || {})
}

/** A store fault from a live database — never answered from the dev file. */
function sqlError () {
  const e = new Error('ER_NO_SUCH_TABLE: firm_framework_versions at /srv/app')
  e.sqlState = '42S02'
  return e
}

const gov = list => list.find(a => a.name === 'Governance')

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { jest.restoreAllMocks() })

describe('GET /api/firm-manager/growth-aspects', () => {
  test('returns the nine this scope works to, and what it changed itself', async () => {
    overlay.loadFirmConfig.mockImplementation(scope => Promise.resolve(scope === PLATFORM_SCOPE ? { Governance: { questions: ['M?'] } } : null))
    const res = makeRes()
    await routes.getForManager(req(PLATFORM_SCOPE), res)
    expect(res._status).toBe(200)
    expect(res._body.aspects).toHaveLength(9)
    expect(gov(res._body.aspects).questions).toEqual(['M?'])
    expect(res._body.own).toEqual({ Governance: { questions: ['M?'] } })
    expect(res._body.hasOwn).toBe(true)
  })

  test('a live database fault is a 500 that names nothing inside', async () => {
    overlay.loadFirmConfig.mockRejectedValue(sqlError())
    const res = makeRes()
    await routes.getForManager(req(PLATFORM_SCOPE), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE|firm_framework_versions|\/srv/)
  })
})

describe('POST /api/firm-manager/growth-aspects', () => {
  test('🔴 saves under the TOKEN’s scope, never one named in the body', async () => {
    const res = makeRes()
    await routes.save(req(PLATFORM_SCOPE, { body: { firmId: 'firm-b', aspects: { Governance: { questions: ['New?'] } } } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, CONFIG_KEY, { Governance: { questions: ['New?'] } }, 'mentor@advisor-e.com')
    expect(overlay.saveFirmConfig.mock.calls.every(c => c[0] === PLATFORM_SCOPE)).toBe(true)
  })

  test('🔴 the screen’s whole form is stored as only what differs from the shipped wording', async () => {
    const body = {}
    BASE_ASPECTS.forEach((a) => { body[a.name] = { description: a.description, questions: a.questions.slice() } })
    body.Governance.description = 'Edited.'
    const res = makeRes()
    await routes.save(req(PLATFORM_SCOPE, { body: { aspects: body } }), res)
    expect(overlay.saveFirmConfig.mock.calls[0][2]).toEqual({ Governance: { description: 'Edited.' } })
    expect(res._body.hasOwn).toBe(true)
  })

  test('refuses an invalid save before it reaches the store', async () => {
    const res = makeRes()
    await routes.save(req(PLATFORM_SCOPE, { body: { aspects: { Governance: { questions: [] } } } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_GROWTH_ASPECTS')
    expect(res._body.error.message).toContain('keep at least one question')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a body with no aspects at all', async () => {
    const res = makeRes()
    await routes.save(req(PLATFORM_SCOPE, { body: null }), res)
    expect(res._status).toBe(400)
  })

  test('with no database in development, saves to the dev file for this scope', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED'))
    overlay.loadFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('ENOENT') })
    const res = makeRes()
    await routes.save(req(PLATFORM_SCOPE, { body: { aspects: { Governance: { questions: ['Dev?'] } } } }), res)
    expect(res._status).toBe(200)
    expect(write.mock.calls[0][0]).toMatch(/dev-growth-aspect-questions\.json$/)
    expect(JSON.parse(write.mock.calls[0][1])).toEqual({ [PLATFORM_SCOPE]: { Governance: { questions: ['Dev?'] } } })
  })

  test('a live database fault on save is a 500 that names nothing inside, and writes no dev file', async () => {
    overlay.saveFirmConfig.mockRejectedValue(sqlError())
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    const res = makeRes()
    await routes.save(req(PLATFORM_SCOPE, { body: { aspects: { Governance: { questions: ['X?'] } } } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE|\/srv/)
    expect(write).not.toHaveBeenCalled()
  })
})

describe('version history and restore', () => {
  test('history is this scope’s own', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 3, version: 2, saved_by: 'mentor@advisor-e.com' }])
    const res = makeRes()
    await routes.history(req(PLATFORM_SCOPE, { query: { firmId: 'firm-b' } }), res)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(PLATFORM_SCOPE, CONFIG_KEY)
    expect(res._body.history).toHaveLength(1)
  })

  test('history with no database in development is empty, not an error', async () => {
    overlay.getVersionHistory.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const res = makeRes()
    await routes.history(req(PLATFORM_SCOPE), res)
    expect(res._body).toEqual({ history: [] })
  })

  test('a live database fault on history is a 500', async () => {
    overlay.getVersionHistory.mockRejectedValue(sqlError())
    const res = makeRes()
    await routes.history(req(PLATFORM_SCOPE), res)
    expect(res._status).toBe(500)
  })

  test('restore acts on the token’s scope', async () => {
    overlay.restoreVersion.mockResolvedValue()
    const res = makeRes()
    await routes.restore(req(PLATFORM_SCOPE, { body: { versionId: 3, firmId: 'firm-b' } }), res)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(PLATFORM_SCOPE, CONFIG_KEY, 3)
    expect(res._body.restored).toBe(true)
  })

  test.each([[undefined], ['abc'], [0], [-1], [1.5]])('restore refuses version id %p', async (versionId) => {
    const res = makeRes()
    await routes.restore(req(PLATFORM_SCOPE, { body: { versionId } }), res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('a version that is not this scope’s is a 500 that names nothing inside', async () => {
    overlay.restoreVersion.mockRejectedValue(new Error('Version not found for this firm and config key'))
    const res = makeRes()
    await routes.restore(req(PLATFORM_SCOPE, { body: { versionId: 99 } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('Version not found')
  })
})
