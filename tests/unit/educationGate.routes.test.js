'use strict'

/**
 * The Education Gate routes — item 2.9, `design/EDUCATION-GATE.md` §8.
 *
 * 🔴 THE TWO THAT MATTER:
 *
 *   1. EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler
 *      reads a scope from a body or a query, so one tier cannot read or write another's
 *      wording even if it asks to. That is `tier-cascade.md` P6, and it is the open IDOR
 *      rule in ACTIONS.md.
 *
 *   2. THE SAVE VALIDATOR FAILS CLOSED. The two answer VALUES are the contract with
 *      `strategyResolver` — a third one, or a missing one, is a 400 rather than a value
 *      the store accepts and nothing downstream understands.
 *
 * Mirrors `aiPrompts.routes.test.js` deliberately, down to the mock res and the refusal
 * helper: these routes were written from that file and are tested the same way.
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/educationGate')
const { BASE_GATE, CONFIG_KEY } = require('../../server/utils/educationGate')

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

/**
 * The error envelope, whichever way the handler wrote it. `sendError` goes out through
 * `writeHead`/`end`, so the body is a JSON STRING — reading `res._body.error` off it
 * silently yields `undefined` and an assertion that passes for the wrong reason.
 */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

/**
 * A failure a LIVE MySQL answered and refused. The `sqlState` is the whole point:
 * `dbFailure.devFallbackAllowed` treats an error WITHOUT one as "there is no database
 * here" and lets the dev-JSON fallback run. Only a refusal must surface as a 500.
 */
function refusal (message) {
  return Object.assign(new Error(message), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}

function makeReq (overrides = {}) {
  return {
    firmId: 'firm-test-123',
    userRole: 'firm_manager',
    userEmail: 'mgr@testfirm.com',
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  overlay.getVersionHistory.mockResolvedValue([])
  overlay.restoreVersion.mockResolvedValue(undefined)
})

// ── GET ─────────────────────────────────────────────────────────────────────

describe('what a tier is given when it opens the tab', () => {
  test('a firm with no changes of its own gets the shipped gate, and is told so', async () => {
    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.tier).toBe('firm')
    expect(res._body.gate.question).toBe(BASE_GATE.question)
    expect(res._body.own).toEqual({})
    expect(res._body.hasOwn).toBe(false)
  })

  test('the mentor is the top of the chain, so what it inherits is the shipped gate', async () => {
    const res = makeMockRes()
    await routes.getForManager(makeReq({ firmId: '__platform__' }), res)

    expect(res._body.tier).toBe('mentor')
    expect(res._body.inherited).toBe(BASE_GATE)
  })

  test('always ships the platform default, so "put it back" is a button not a support call', async () => {
    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)
    expect(res._body.platform).toBe(BASE_GATE)
  })

  test('🔴 reads the scope from the JWT, NEVER from the body or the query', async () => {
    const res = makeMockRes()
    await routes.getForManager(makeReq({
      body: { firmId: 'someone-elses-firm' },
      query: { firmId: 'someone-elses-firm', scopeId: 'someone-elses-firm' }
    }), res)

    for (const call of overlay.loadFirmConfig.mock.calls) {
      expect(call[0]).not.toBe('someone-elses-firm')
    }
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith('firm-test-123', CONFIG_KEY)
  })

  test('separates "set here" from "inherited" rather than subtracting one from the other', async () => {
    // Subtraction cannot tell "same as above" from "set here to the same thing", and
    // those are different decisions — one keeps receiving corrections, one does not.
    overlay.loadFirmConfig.mockImplementation(scope =>
      Promise.resolve(scope === 'firm-test-123' ? { question: BASE_GATE.question } : null))

    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)

    expect(res._body.own.question).toBe(BASE_GATE.question)
    expect(res._body.hasOwn).toBe(true)
  })

  test('ignores a stored value that fails validation rather than half-applying it', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ options: [{ value: 'invented' }] })
    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.own).toEqual({})
    expect(res._body.gate.question).toBe(BASE_GATE.question)
  })

  test('returns a safe 500 on a real database refusal, leaking nothing', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(refusal('ER_NO_REFERENCED_ROW_2: table firm_framework_versions'))

    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(500)
    const body = errorBody(res)
    expect(body.error.code).toBe('DB_ERROR')
    expect(JSON.stringify(body)).not.toContain('firm_framework_versions')
    expect(JSON.stringify(body)).not.toContain('ER_NO_REFERENCED_ROW_2')
    spy.mockRestore()
  })
})

// ── POST ────────────────────────────────────────────────────────────────────

describe('saving a tier\'s own wording', () => {
  test('stores exactly what was sent, against the scope from the JWT', async () => {
    const res = makeMockRes()
    await routes.save(makeReq({ body: { gate: { question: 'Our own question?' } } }), res)

    expect(res._status).toBe(200)
    expect(res._body.saved).toBe(true)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      'firm-test-123', CONFIG_KEY, { question: 'Our own question?' }, 'mgr@testfirm.com'
    )
  })

  test('🔴 saves against the JWT scope even when the body names another firm', async () => {
    const res = makeMockRes()
    await routes.save(makeReq({
      body: { firmId: 'someone-elses-firm', gate: { question: 'Ours?' } }
    }), res)

    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe('firm-test-123')
  })

  test('an empty object clears this tier\'s changes so it inherits again', async () => {
    const res = makeMockRes()
    await routes.save(makeReq({ body: { gate: {} } }), res)

    expect(res._body.hasOwn).toBe(false)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith('firm-test-123', CONFIG_KEY, {}, 'mgr@testfirm.com')
  })

  test('🔴 refuses a THIRD answer with a 400 rather than storing it', async () => {
    const res = makeMockRes()
    await routes.save(makeReq({
      body: { gate: { options: [{ value: 'education_first' }, { value: 'technical' }, { value: 'maybe' }] } }
    }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_EDUCATION_GATE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses an empty question, a giant question, and a two-character phrase', async () => {
    for (const gate of [
      { question: '   ' },
      { question: 'x'.repeat(601) },
      { phrases: ['is'] }
    ]) {
      const res = makeMockRes()
      await routes.save(makeReq({ body: { gate } }), res)
      expect(res._status).toBe(400)
    }
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('treats a missing body as an empty override rather than throwing', async () => {
    const res = makeMockRes()
    await routes.save(makeReq({ body: undefined }), res)
    expect(res._status).toBe(200)
  })

  test('returns a safe 500 on a real database refusal', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.saveFirmConfig.mockRejectedValue(refusal('ER_NO_REFERENCED_ROW_2: constraint'))

    const res = makeMockRes()
    await routes.save(makeReq({ body: { gate: { question: 'Ours?' } } }), res)

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
    expect(JSON.stringify(errorBody(res))).not.toContain('constraint')
    spy.mockRestore()
  })
})

// ── The dev fallback ────────────────────────────────────────────────────────

describe('running with no database, which is every developer machine', () => {
  // 🔴 THE DISTINCTION THIS BLOCK PROTECTS. An error WITHOUT a sqlState means "there is
  // no database here" and the JSON file stands in. An error WITH one is a live MySQL
  // REFUSING, and must surface as a 500 — the two are tested apart above and here,
  // because conflating them is what silently broke mentor saves for weeks
  // (see server/utils/dbFailure.js).
  const fs = require('fs')

  /** No database at all — the shape a developer machine produces. */
  function absent (message) {
    return new Error(message)
  }

  test('reads this scope\'s wording from the dev file when there is no database', async () => {
    overlay.loadFirmConfig.mockRejectedValue(absent('connect ECONNREFUSED 127.0.0.1:3306'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      'firm-test-123': { question: 'Stored on this laptop?' }
    }))

    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.own.question).toBe('Stored on this laptop?')
    expect(res._body.gate.question).toBe('Stored on this laptop?')
    fs.readFileSync.mockRestore()
  })

  test('treats an unreadable or absent dev file as "nothing stored", not as a crash', async () => {
    overlay.loadFirmConfig.mockRejectedValue(absent('connect ECONNREFUSED'))
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('ENOENT') })

    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.own).toEqual({})
    fs.readFileSync.mockRestore()
  })

  test('ignores a dev file holding an array or a scalar for this scope', async () => {
    overlay.loadFirmConfig.mockRejectedValue(absent('connect ECONNREFUSED'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'firm-test-123': ['nope'] }))

    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)

    expect(res._body.own).toEqual({})
    fs.readFileSync.mockRestore()
  })

  test('writes to the dev file when the database is absent, keyed by the JWT scope', async () => {
    overlay.saveFirmConfig.mockRejectedValue(absent('connect ECONNREFUSED'))
    overlay.loadFirmConfig.mockRejectedValue(absent('connect ECONNREFUSED'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'other-firm': { question: 'Theirs?' } }))
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})

    const res = makeMockRes()
    await routes.save(makeReq({ body: { gate: { question: 'Ours?' } } }), res)

    expect(res._status).toBe(200)
    const written = JSON.parse(write.mock.calls[0][1])
    expect(written['firm-test-123']).toEqual({ question: 'Ours?' })
    // Another scope's stored wording is not trampled by our write.
    expect(written['other-firm']).toEqual({ question: 'Theirs?' })

    fs.readFileSync.mockRestore()
    write.mockRestore()
  })

  test('starts a dev file from scratch when none exists yet', async () => {
    overlay.saveFirmConfig.mockRejectedValue(absent('connect ECONNREFUSED'))
    overlay.loadFirmConfig.mockRejectedValue(absent('connect ECONNREFUSED'))
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('ENOENT') })
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})

    const res = makeMockRes()
    await routes.save(makeReq({ body: { gate: { question: 'First one?' } } }), res)

    expect(res._status).toBe(200)
    expect(JSON.parse(write.mock.calls[0][1])).toEqual({ 'firm-test-123': { question: 'First one?' } })

    fs.readFileSync.mockRestore()
    write.mockRestore()
  })

  test('🔴 does NOT fall back to the dev file when a live database REFUSES the save', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.saveFirmConfig.mockRejectedValue(refusal('ER_NO_REFERENCED_ROW_2'))
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})

    const res = makeMockRes()
    await routes.save(makeReq({ body: { gate: { question: 'Ours?' } } }), res)

    // A refusal reported as saved is the exact failure dbFailure.js exists to prevent.
    expect(res._status).toBe(500)
    expect(write).not.toHaveBeenCalled()

    write.mockRestore()
    spy.mockRestore()
  })
})

// ── History and restore ─────────────────────────────────────────────────────

describe('version history', () => {
  test('lists this scope\'s saved versions', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 4, saved_by: 'mgr@testfirm.com' }])
    const res = makeMockRes()
    await routes.history(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.history).toHaveLength(1)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith('firm-test-123', CONFIG_KEY)
  })

  test('answers an empty history when there is no database at all, rather than a 500', async () => {
    // No sqlState: dbFallback reads that as "no database here", which is a developer
    // machine, not a refusal.
    overlay.getVersionHistory.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const res = makeMockRes()
    await routes.history(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.history).toEqual([])
  })

  test('returns a safe 500 when a live database REFUSES the history read', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.getVersionHistory.mockRejectedValue(refusal('denied'))
    const res = makeMockRes()
    await routes.history(makeReq(), res)

    expect(res._status).toBe(500)
    spy.mockRestore()
  })

  test('restores a version, scoped to the JWT firm', async () => {
    const res = makeMockRes()
    await routes.restore(makeReq({ body: { versionId: 7 } }), res)

    expect(res._status).toBe(200)
    expect(res._body.restored).toBe(true)
    expect(overlay.restoreVersion).toHaveBeenCalledWith('firm-test-123', CONFIG_KEY, 7)
  })

  test('refuses a restore with no version id', async () => {
    const res = makeMockRes()
    await routes.restore(makeReq({ body: {} }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('MISSING_VERSION')
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('returns a safe 500 when the restore fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.restoreVersion.mockRejectedValue(refusal('no such version'))
    const res = makeMockRes()
    await routes.restore(makeReq({ body: { versionId: 7 } }), res)

    expect(res._status).toBe(500)
    expect(JSON.stringify(errorBody(res))).not.toContain('no such version')
    spy.mockRestore()
  })
})
