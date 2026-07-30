'use strict'

/**
 * `GET /api/advisor/staircase` — the route that makes a firm's Advisory Staircase
 * wording real.
 *
 * THE DEFECT IT CLOSES (found 2026-07-31): a firm's staircase override reached the
 * ENGINE — it set the complexity ceiling — but never reached the SELECTOR the
 * advisor actually reads. `components/VirtualAdvisor.vue` built its options from
 * `data/advisory-staircase.json`, baked in at build time. So a firm could rename
 * every step, rewrite every description, save it and see it in version history,
 * while every advisor still chose from Advisor-e's wording. Two of the three
 * fields on that Firm Manager tab changed nothing at all.
 *
 * The rule under test is therefore not "the route returns data". It is that the
 * wording an advisor sees and the ceiling the engine applies come from ONE blend
 * — which is why the last describe block asserts the engine still calls the
 * shared helper rather than blending its own copy again.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const fs = require('fs')
const path = require('path')

const overlay = require('../../server/utils/firmOverlay')
const { get } = require('../../server/routes/staircase')
const { loadBlendedStaircase } = require('../../server/utils/staircaseConfig')
const { staircaseToCeiling } = require('../../server/utils/caseState')
const BASE = require('../../data/advisory-staircase.json')

// ── Helpers (mirror currency.routes.test.js) ──────────────────────────────────

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

function makeReq (overrides = {}) {
  return { firmId: 'firm-test-123', userEmail: 'adviser@testfirm.com', query: {}, params: {}, body: {}, headers: {}, ...overrides }
}

/** A whole-config override in the shape the save route validates and stores. */
function firmOverride () {
  return {
    defaultCeiling: 'foundational',
    steps: [
      { step: 1, name: 'Getting the books right', complexityCeiling: 'foundational', selectorDescription: 'Our words for step one.' },
      { step: 2, name: 'Making it readable', complexityCeiling: 'foundational', selectorDescription: 'Our words for step two.' },
      { step: 3, name: 'Making sense of it', complexityCeiling: 'analytical', selectorDescription: 'Our words for step three.' },
      { step: 4, name: 'Doing something with it', complexityCeiling: 'analytical', selectorDescription: 'Our words for step four.' },
      { step: 5, name: 'Coaching them', complexityCeiling: 'foundational', selectorDescription: 'Our words for step five.' }
    ]
  }
}

beforeEach(() => { jest.clearAllMocks() })

// ── The read ──────────────────────────────────────────────────────────────────

describe('GET /api/advisor/staircase', () => {
  test('serves the platform steps when the firm has saved no override', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })

  test("serves the FIRM's wording when it has one — the whole point of the fix", async () => {
    overlay.loadFirmConfig.mockResolvedValue(firmOverride())
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps.map(s => s.name)).toEqual([
      'Getting the books right', 'Making it readable', 'Making sense of it',
      'Doing something with it', 'Coaching them'
    ])
    expect(res._body.steps[2].selectorDescription).toBe('Our words for step three.')
    // And it is genuinely different from what the advisor saw before.
    expect(res._body.steps[2].name).not.toBe(BASE.steps[2].name)
  })

  test('scopes the read to the caller’s own firm id, never a supplied one', async () => {
    // The IDOR guard the engine documents: firmId comes from the verified JWT.
    // A body-supplied firmId must be ignored, or one firm reads another's config.
    overlay.loadFirmConfig.mockResolvedValue(null)

    await get(makeReq({ body: { firmId: 'someone-elses-firm' } }), makeMockRes())

    expect(overlay.loadFirmConfig).toHaveBeenCalledWith('firm-test-123', 'advisory-staircase')
  })

  test('sends display fields only — the browser never receives the ceiling settings', async () => {
    // Least exposure: the selector needs wording, not the firm's decision config.
    overlay.loadFirmConfig.mockResolvedValue(firmOverride())
    const res = makeMockRes()

    await get(makeReq(), res)

    res._body.steps.forEach((s) => {
      expect(Object.keys(s).sort()).toEqual(['name', 'selectorDescription', 'step'])
    })
  })
})

// The documented promise: this can never blank the selector or fail a session.
describe('GET /api/advisor/staircase — never breaks the session', () => {
  test('a storage failure degrades to the platform steps, not an error', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })

  test('a signed-in user with no firm id still gets the platform steps', async () => {
    const res = makeMockRes()

    await get(makeReq({ firmId: null }), res)

    expect(res._body.steps.length).toBe(BASE.steps.length)
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })

  test('an override with no usable steps falls back rather than serving an empty list', async () => {
    // A selector with zero options is a dead end for the advisor. The save route's
    // validator should prevent this shape ever being stored; this is the second lock.
    overlay.loadFirmConfig.mockResolvedValue({ steps: [] })
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps.length).toBe(BASE.steps.length)
  })

  test('individual malformed rows are dropped, and the good ones still arrive', async () => {
    overlay.loadFirmConfig.mockResolvedValue({
      steps: [
        { step: 1, name: 'Kept', selectorDescription: 'fine' },
        { step: 'two', name: 'No step number' },
        { name: 'No step key at all' },
        null
      ]
    })
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps).toEqual([{ step: 1, name: 'Kept', selectorDescription: 'fine' }])
  })

  test('a step with no description sends an empty string, never undefined', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ steps: [{ step: 1, name: 'Terse' }] })
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps[0].selectorDescription).toBe('')
  })
})

/**
 * The dev stand-in. The MySQL table for firm config has never been provisioned, so
 * today a firm manager's save lands in `data/dev-firm-staircase.json` via
 * routes/firmManager.js. A read that only knew about MySQL would report "no
 * override" and serve Advisor-e's wording — the fix would look broken in the only
 * environment it can currently be tried in.
 */
describe('the dev JSON stand-in, while MySQL is unprovisioned', () => {
  afterEach(() => { jest.restoreAllMocks() })

  test("a staircase saved to the stand-in reaches the advisor's selector", async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'firm-test-123': firmOverride() }))
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps[0].name).toBe('Getting the books right')
  })

  test('and reaches the engine’s ceiling too — one fallback, both readers', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'firm-test-123': firmOverride() }))

    const blended = await loadBlendedStaircase('firm-test-123', overlay.loadFirmConfig)

    expect(staircaseToCeiling(5, blended)).toBe('foundational')
  })

  test('another firm’s saved staircase is never served to this one', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'a-different-firm': firmOverride() }))
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })

  test('a missing or unreadable stand-in file degrades to the platform steps', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('ENOENT') })
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })

  test('junk in the stand-in file is survived, not parsed into the session', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue('not json at all')
    const res = makeMockRes()

    await get(makeReq(), res)

    expect(res._body.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })

  test('PRODUCTION never reads the stand-in file — a store failure serves the base', async () => {
    // The guard that matters: a stray dev file on a production box must not be able
    // to rewrite a firm's staircase. IS_DEV is read at require time, so the module
    // is reloaded with the production flag set.
    jest.resetModules()
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const prodConfig = require('../../server/utils/staircaseConfig')
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'firm-test-123': firmOverride() }))
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const blended = await prodConfig.loadBlendedStaircase('firm-test-123', () => Promise.reject(new Error('no db')))

      expect(blended.steps.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
      expect(readSpy).not.toHaveBeenCalled()
    } finally {
      process.env.NODE_ENV = prevEnv
      jest.resetModules()
    }
  })
})

// ── One blend, two readers ────────────────────────────────────────────────────

describe('the selector and the engine read the SAME blend', () => {
  test('one override changes both the advisor’s wording and the engine’s ceiling', async () => {
    // Step 5 in the platform base is the only 'strategic' step. This firm renames
    // it AND lowers its ceiling. Both halves must land, from the one saved config.
    overlay.loadFirmConfig.mockResolvedValue(firmOverride())
    const res = makeMockRes()

    await get(makeReq(), res)
    const blended = await loadBlendedStaircase('firm-test-123', overlay.loadFirmConfig)

    expect(res._body.steps[4].name).toBe('Coaching them') // what the advisor reads
    expect(staircaseToCeiling(5, blended)).toBe('foundational') // what the engine applies
    expect(staircaseToCeiling(5)).toBe('strategic') // and the platform base is untouched
  })

  test('a firm with no override is byte-identical to the platform base', async () => {
    // Behaviour-preserving for every firm that has customised nothing.
    overlay.loadFirmConfig.mockResolvedValue(null)

    const blended = await loadBlendedStaircase('firm-test-123', overlay.loadFirmConfig)

    expect(blended).toBe(BASE)
  })

  test('the browser’s request actually reaches the backend', () => {
    // The trap this closes, and no other test in this file could have caught it:
    // every assertion above calls the route handler directly, so all of them pass
    // whether or not the request can get there. '/api/advisor' is mounted to the
    // SSE engine proxy, which forwards only POSTs to /query and calls next() for
    // everything else — a GET to /api/advisor/staircase would fall through to a
    // Nuxt 404 with a green suite behind it. The specific path must be registered,
    // and registered FIRST.
    const config = fs.readFileSync(path.join(__dirname, '../../nuxt.config.js'), 'utf8')
    const staircaseAt = config.indexOf("path: '/api/advisor/staircase'")
    const advisorAt = config.indexOf("path: '/api/advisor'")

    expect(staircaseAt).toBeGreaterThan(-1)
    expect(config.slice(staircaseAt, staircaseAt + 200)).toContain('apiProxy.js')
    expect(staircaseAt).toBeLessThan(advisorAt)
  })

  test('the engine no longer blends a staircase of its own', () => {
    // The anti-drift lock, and the reason this helper exists. If someone re-inlines
    // `deepMerge(BASE_STAIRCASE, ...)` in the engine, the selector and the ceiling
    // can silently disagree again — exactly the defect this work closed.
    const engine = fs.readFileSync(path.join(__dirname, '../../server/advisorEngine.js'), 'utf8')

    expect(engine).toContain('loadBlendedStaircase')
    expect(engine).not.toMatch(/deepMerge\(\s*BASE_STAIRCASE/)
  })
})
