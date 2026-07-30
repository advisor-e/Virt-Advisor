'use strict'

/**
 * The Advisory Staircase cascade routes — switch a step off, edit one, add your own.
 *
 * These mirror the distinction cascade routes deliberately: same verbs, same shapes,
 * same error codes. What they must prove is not "the handler saves" but the guarantees
 * that make a firm's decisions safe to store — identity is assigned by the server, a
 * field the firm did not send is not recorded as an edit, and a firm can never leave
 * its own advisors with no step to choose from.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn().mockResolvedValue(1),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const fm = require('../../server/routes/firmManager')
const { CONFIG_KEYS } = require('../../server/utils/firmStaircase')
const BASE = require('../../data/advisory-staircase.json')

const FIRM = 'firm-test-123'
const STEP_ID = BASE.steps[2].id // as-interpretation

// Mirrors firmManager.routes.test.js: sendError writes through writeHead/end rather
// than send, so both paths have to be captured or an error response reads as nothing.
function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    header () {},
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch { this._body = body } }
  }
}

function makeReq (over = {}) {
  return { firmId: FIRM, userEmail: 'manager@testfirm.com', params: {}, body: {}, query: {}, headers: {}, ...over }
}

/** Answer each config key separately, as the real store does. */
function mockKeys (byKey) {
  overlay.loadFirmConfig.mockImplementation((firmId, key) =>
    Promise.resolve(Object.prototype.hasOwnProperty.call(byKey, key) ? byKey[key] : null))
}

/** What was written to one key, or undefined if that key was never written. */
function savedTo (key) {
  const call = overlay.saveFirmConfig.mock.calls.filter(c => c[1] === key).pop()
  return call ? call[2] : undefined
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(1)
})

// ── Editing an Advisor-e step ─────────────────────────────────────────────────

describe('PUT /api/firm-manager/staircase/platform/:id', () => {
  test('records only the fields the firm actually sent', async () => {
    // The freshness guarantee: an untouched field must keep tracking Advisor-e's
    // wording. Recording the whole step would freeze it, which is the defect this
    // mechanism exists to close.
    mockKeys({})
    const res = makeRes()

    await fm.setStaircaseOverride(makeReq({ params: { id: STEP_ID }, body: { name: 'Making sense of it' } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)).toEqual({ [STEP_ID]: { name: 'Making sense of it' } })
  })

  test('merges with an edit the firm made earlier rather than replacing it', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [STEP_ID]: { name: 'Ours' } } })

    await fm.setStaircaseOverride(makeReq({ params: { id: STEP_ID }, body: { selectorDescription: 'Our words.' } }), makeRes())

    expect(savedTo(CONFIG_KEYS.overrides)[STEP_ID]).toEqual({ name: 'Ours', selectorDescription: 'Our words.' })
  })

  test('an id or a step number in the body is ignored, not stored', async () => {
    // Identity is not editable and the position is the resolver's to assign. Accepting
    // either would let a firm re-point its edit at a different step.
    mockKeys({})
    const res = makeRes()

    await fm.setStaircaseOverride(makeReq({ params: { id: STEP_ID }, body: { id: 'as-observation', step: 1 } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_FIELDS')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('rejects a ceiling that is not one of Advisor-e own values', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setStaircaseOverride(makeReq({ params: { id: STEP_ID }, body: { complexityCeiling: 'whatever' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_CEILING')
  })

  test('rejects an empty name rather than storing a blank step', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setStaircaseOverride(makeReq({ params: { id: STEP_ID }, body: { name: '   ' } }), res)

    expect(res._status).toBe(400)
  })

  test('404s on a step Advisor-e does not have', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setStaircaseOverride(makeReq({ params: { id: 'as-invented' }, body: { name: 'x' } }), res)

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// ── Reset to platform ─────────────────────────────────────────────────────────

describe('DELETE /api/firm-manager/staircase/platform/:id', () => {
  test('drops the firm version so Advisor-e step applies again', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [STEP_ID]: { name: 'Ours' }, 'as-observation': { name: 'Kept' } } })
    const res = makeRes()

    await fm.resetStaircaseOverride(makeReq({ params: { id: STEP_ID } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)).toEqual({ 'as-observation': { name: 'Kept' } })
  })

  test('is idempotent — resetting something never edited is not an error', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.resetStaircaseOverride(makeReq({ params: { id: STEP_ID } }), res)

    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// ── Switch off / switch on ────────────────────────────────────────────────────

describe('PUT /api/firm-manager/staircase/platform/:id/decline', () => {
  test('switching off records the id; switching on removes it', async () => {
    mockKeys({})
    await fm.setStaircaseDecline(makeReq({ params: { id: STEP_ID }, body: { declined: true } }), makeRes())
    expect(savedTo(CONFIG_KEYS.declines)).toEqual([STEP_ID])

    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    mockKeys({ [CONFIG_KEYS.declines]: [STEP_ID] })
    await fm.setStaircaseDecline(makeReq({ params: { id: STEP_ID }, body: { declined: false } }), makeRes())
    expect(savedTo(CONFIG_KEYS.declines)).toEqual([])
  })

  test('an edit made earlier survives switching the step off and on again', async () => {
    // Switching off is not deleting. The firm's wording must still be there when they
    // change their mind, or "switch off" quietly becomes destructive.
    mockKeys({ [CONFIG_KEYS.overrides]: { [STEP_ID]: { name: 'Ours' } } })

    await fm.setStaircaseDecline(makeReq({ params: { id: STEP_ID }, body: { declined: true } }), makeRes())

    expect(savedTo(CONFIG_KEYS.overrides)).toBeUndefined() // the overrides key was not touched
  })

  test('refuses to switch off the last remaining step', async () => {
    // An advisor mid-session would be asked to choose from an empty list. The blend
    // has a second lock, but only this one can explain itself to the person asking.
    mockKeys({ [CONFIG_KEYS.declines]: BASE.steps.slice(0, -1).map(s => s.id) })
    const res = makeRes()

    await fm.setStaircaseDecline(makeReq({ params: { id: BASE.steps[BASE.steps.length - 1].id }, body: { declined: true } }), res)

    expect(res._status).toBe(409)
    expect(res._body.error.code).toBe('LAST_STEP')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('but allows it when the firm has a step of its own to fall back to', async () => {
    mockKeys({
      [CONFIG_KEYS.declines]: BASE.steps.slice(0, -1).map(s => s.id),
      [CONFIG_KEYS.own]: [{ id: 'fs-1', name: 'Ours' }]
    })
    const res = makeRes()

    await fm.setStaircaseDecline(makeReq({ params: { id: BASE.steps[BASE.steps.length - 1].id }, body: { declined: true } }), res)

    expect(res._status).toBe(200)
  })

  test('requires a boolean, and 404s on an unknown step', async () => {
    mockKeys({})
    const bad = makeRes()
    await fm.setStaircaseDecline(makeReq({ params: { id: STEP_ID }, body: { declined: 'yes' } }), bad)
    expect(bad._status).toBe(400)

    const missing = makeRes()
    await fm.setStaircaseDecline(makeReq({ params: { id: 'as-invented' }, body: { declined: true } }), missing)
    expect(missing._status).toBe(404)
  })
})

// ── The firm's own steps ──────────────────────────────────────────────────────

describe('the firm own steps', () => {
  test('the server assigns the id — one supplied by the browser is ignored', async () => {
    // An id from the browser could collide with a platform step and silently replace it.
    mockKeys({})
    const res = makeRes()

    await fm.addOwnStaircaseStep(makeReq({ body: { id: 'as-observation', name: 'Our sixth' } }), res)

    expect(res._status).toBe(201)
    expect(res._body.id).toBe('fs-1')
    expect(savedTo(CONFIG_KEYS.own)).toEqual([
      { id: 'fs-1', name: 'Our sixth', selectorDescription: '', complexityCeiling: BASE.defaultCeiling }
    ])
  })

  test('a new id is highest-so-far plus one, never the row count', async () => {
    // Reusing a deleted step's id would hand the new step the decisions recorded
    // against the old one.
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fs-3', name: 'Kept' }] })
    const res = makeRes()

    await fm.addOwnStaircaseStep(makeReq({ body: { name: 'Next' } }), res)

    expect(res._body.id).toBe('fs-4')
  })

  test('a step of the firm own can be edited and removed', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fs-1', name: 'Ours', selectorDescription: 'old' }] })
    const edit = makeRes()
    await fm.updateOwnStaircaseStep(makeReq({ params: { id: 'fs-1' }, body: { selectorDescription: 'new' } }), edit)
    expect(edit._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.own)[0]).toEqual({ id: 'fs-1', name: 'Ours', selectorDescription: 'new' })

    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fs-1', name: 'Ours' }, { id: 'fs-2', name: 'Other' }] })
    const del = makeRes()
    await fm.deleteOwnStaircaseStep(makeReq({ params: { id: 'fs-1' } }), del)
    expect(del._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.own)).toEqual([{ id: 'fs-2', name: 'Other' }])
  })

  test('an added step needs a name', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.addOwnStaircaseStep(makeReq({ body: { selectorDescription: 'no name' } }), res)

    expect(res._status).toBe(400)
  })

  test('editing or removing a step that is not the firm own 404s', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [] })
    const edit = makeRes()
    await fm.updateOwnStaircaseStep(makeReq({ params: { id: 'fs-9' }, body: { name: 'x' } }), edit)
    expect(edit._status).toBe(404)

    const del = makeRes()
    await fm.deleteOwnStaircaseStep(makeReq({ params: { id: STEP_ID } }), del)
    expect(del._status).toBe(404)
  })
})

// ── What the tab is given to draw ─────────────────────────────────────────────

describe('GET /api/firm-manager/staircase', () => {
  test('returns the resolved list the advisor and the engine actually read', async () => {
    // The management screen and the advisor session must never show different steps —
    // the defect found on 2026-07-31 was exactly that.
    mockKeys({
      [CONFIG_KEYS.declines]: [BASE.steps[1].id],
      [CONFIG_KEYS.overrides]: { [BASE.steps[0].id]: { name: 'Getting the books right' } }
    })
    const res = makeRes()

    await fm.getStaircase(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.base).toBe(BASE)
    expect(res._body.state.declinedIds).toEqual([BASE.steps[1].id])
    expect(res._body.resolved.map(s => s.name)).toEqual([
      'Getting the books right', ...BASE.steps.slice(2).map(s => s.name)
    ])
    expect(res._body.hasOverride).toBe(true)
  })

  test('a firm that has decided nothing is told so', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.getStaircase(makeReq(), res)

    expect(res._body.hasOverride).toBe(false)
    expect(res._body.resolved.map(s => s.name)).toEqual(BASE.steps.map(s => s.name))
  })
})
