'use strict'

/**
 * The Coaching Reference cascade routes — switch an entry off, edit one, add your own.
 *
 * Item 4.9's visible half. These mirror the staircase cascade routes deliberately: same
 * verbs, same shapes, same error codes. What they have to prove is not "the handler
 * saves" but the guarantees that make a firm's decisions safe to store, and one
 * guarantee this block has that the staircase does not:
 *
 *   - a field the firm did not send is not recorded, so it keeps tracking Advisor-e
 *   - identity is assigned by the server, never taken from the browser
 *   - `template` cannot be edited on an inherited entry, at the route as well as the read
 *   - a firm can never leave its own advisors' AI with no coaching at all
 *
 * The `template` lock is the one worth stating plainly. Every entry's template field
 * names a template in the library, and the whole purpose of the block is to steer the
 * model toward that template BY NAME. A firm retitling an inherited entry would leave
 * Advisor-e's id attached to guidance pointing somewhere else, and the model would be
 * coached toward a template that may not exist.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn().mockResolvedValue(1),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const fm = require('../../server/routes/firmManager')
const { CONFIG_KEYS } = require('../../server/utils/firmCoachingReference')
const BASE = require('../../data/coaching-reference.json')

const FIRM = 'firm-test-123'
const ENTRY_ID = BASE[2].id // cr-working-capital-cycle

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

// ── Reading the tab ───────────────────────────────────────────────────────────

describe('GET /api/firm-manager/coaching', () => {
  test('returns Advisor-e entries, the firm decisions and the resolved list together', async () => {
    mockKeys({ [CONFIG_KEYS.declines]: [ENTRY_ID] })
    const res = makeRes()

    await fm.getCoaching(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.base).toHaveLength(BASE.length)
    expect(res._body.state.declinedIds).toEqual([ENTRY_ID])
    expect(res._body.hasOverride).toBe(true)
    // The resolved list is what the model is actually coached by. A screen that showed
    // the base list while the engine used a different one would be lying to the firm.
    expect(res._body.resolved.some(r => r.id === ENTRY_ID)).toBe(false)
  })

  test('a firm that has decided nothing is told so, and sees Advisor-e entries', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.getCoaching(makeReq(), res)

    expect(res._body.hasOverride).toBe(false)
    expect(res._body.resolved).toHaveLength(BASE.length)
  })

  test('a database that ANSWERED and refused is a 500, not a half-drawn screen', async () => {
    // sqlState is the discriminator (server/utils/dbFailure.js): a live server refused
    // the statement, so the dev fallback must NOT run and the fault must surface.
    // Falling back here is how the mentor's saves ran silently broken for weeks.
    overlay.loadFirmConfig.mockRejectedValue(
      Object.assign(new Error('refused'), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
    )
    const res = makeRes()

    await fm.getCoaching(makeReq(), res)

    expect(res._status).toBe(500)
  })

  test('but a database that was never REACHED falls back, so the tab works without MySQL', async () => {
    // No sqlState — nothing answered. Outside production the dev-JSON fallback runs and
    // the screen is usable on a developer machine, which is the only environment this
    // feature can be tried in today.
    overlay.loadFirmConfig.mockRejectedValue(
      Object.assign(new Error('no db'), { code: 'ECONNREFUSED' })
    )
    const res = makeRes()

    await fm.getCoaching(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.resolved).toHaveLength(BASE.length)
  })
})

// ── Editing an Advisor-e entry ────────────────────────────────────────────────

describe('PUT /api/firm-manager/coaching/platform/:id', () => {
  test('records only the fields the firm actually sent', async () => {
    // The freshness guarantee: an untouched field must keep tracking Advisor-e's
    // wording. Recording the whole entry would freeze all five.
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(
      makeReq({ params: { id: ENTRY_ID }, body: { howItHelps: 'Our own words.' } }), res
    )

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)).toEqual({ [ENTRY_ID]: { howItHelps: 'Our own words.' } })
  })

  test('merges with an edit the firm made earlier rather than replacing it', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [ENTRY_ID]: { howItHelps: 'Ours' } } })

    await fm.setCoachingOverride(
      makeReq({ params: { id: ENTRY_ID }, body: { whereMayLead: 'Monthly reporting.' } }), makeRes()
    )

    expect(savedTo(CONFIG_KEYS.overrides)[ENTRY_ID])
      .toEqual({ howItHelps: 'Ours', whereMayLead: 'Monthly reporting.' })
  })

  test('a template in the body is refused, not quietly stored', async () => {
    // THE LOCK. Accepting it would leave Advisor-e's id attached to guidance pointing at
    // a different template, and the model would be coached toward something that may not
    // exist. filterEditableFields strips it again on the read; this is the first lock.
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(
      makeReq({ params: { id: ENTRY_ID }, body: { template: 'Something Else' } }), res
    )

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_FIELDS')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('an id in the body is ignored, not stored', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(
      makeReq({ params: { id: ENTRY_ID }, body: { id: 'cr-eoy-meeting' } }), res
    )

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_FIELDS')
  })

  test('404s on an id that is not one of Advisor-e own entries', async () => {
    const res = makeRes()

    await fm.setCoachingOverride(
      makeReq({ params: { id: 'cr-invented' }, body: { howItHelps: 'x' } }), res
    )

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('rejects a non-string field rather than storing an object in the prompt', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(
      makeReq({ params: { id: ENTRY_ID }, body: { howItHelps: { text: 'nope' } } }), res
    )

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_FIELD')
  })
})

// ── Scenarios, which are an array and not a string ────────────────────────────

describe('the scenarios field', () => {
  test('accepts an array of strings and trims them', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(makeReq({
      params: { id: ENTRY_ID },
      body: { scenarios: ['  Client cannot explain their cash  ', 'Owner is planning an exit'] }
    }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)[ENTRY_ID].scenarios)
      .toEqual(['Client cannot explain their cash', 'Owner is planning an exit'])
  })

  test('drops blank rows, so an untouched input never reaches the prompt as an empty bullet', async () => {
    mockKeys({})

    await fm.setCoachingOverride(makeReq({
      params: { id: ENTRY_ID },
      body: { scenarios: ['Real one', '', '   '] }
    }), makeRes())

    expect(savedTo(CONFIG_KEYS.overrides)[ENTRY_ID].scenarios).toEqual(['Real one'])
  })

  test('an empty array is a real decision and is stored, not treated as absent', async () => {
    // A firm removing every situation is saying "this entry has none". Dropping the
    // field would silently hand Advisor-e's four back.
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(makeReq({ params: { id: ENTRY_ID }, body: { scenarios: [] } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)[ENTRY_ID]).toEqual({ scenarios: [] })
  })

  test('refuses a string where an array belongs', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(
      makeReq({ params: { id: ENTRY_ID }, body: { scenarios: 'just the one' } }), res
    )

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_FIELD')
  })

  test('refuses a non-string inside the array', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(
      makeReq({ params: { id: ENTRY_ID }, body: { scenarios: ['fine', 42] } }), res
    )

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_FIELD')
  })

  test('caps the number of situations — every one of them is rendered into the prompt', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(makeReq({
      params: { id: ENTRY_ID },
      body: { scenarios: Array.from({ length: 21 }, (_, i) => `Situation ${i}`) }
    }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('TOO_MANY_SCENARIOS')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('caps the length of one situation', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setCoachingOverride(makeReq({
      params: { id: ENTRY_ID },
      body: { scenarios: ['x'.repeat(501)] }
    }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('SCENARIO_TOO_LONG')
  })
})

// ── Reset ─────────────────────────────────────────────────────────────────────

describe('DELETE /api/firm-manager/coaching/platform/:id', () => {
  test('drops the firm version so Advisor-e entry applies again', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [ENTRY_ID]: { howItHelps: 'Ours' }, 'cr-eoy-meeting': { howItHelps: 'Also ours' } } })
    const res = makeRes()

    await fm.resetCoachingOverride(makeReq({ params: { id: ENTRY_ID } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)).toEqual({ 'cr-eoy-meeting': { howItHelps: 'Also ours' } })
  })

  test('is idempotent — resetting an entry the firm never edited is a success, not a write', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.resetCoachingOverride(makeReq({ params: { id: ENTRY_ID } }), res)

    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('404s on an unknown id', async () => {
    const res = makeRes()
    await fm.resetCoachingOverride(makeReq({ params: { id: 'cr-nope' } }), res)
    expect(res._status).toBe(404)
  })
})

// ── Switching an entry off ────────────────────────────────────────────────────

describe('PUT /api/firm-manager/coaching/platform/:id/decline', () => {
  test('switching off writes the declines key and leaves the firm edit alone', async () => {
    // Separate keys on purpose: an entry switched back on returns with the firm's own
    // wording. Dropping the edit is the reset route, and it is a different decision.
    mockKeys({ [CONFIG_KEYS.overrides]: { [ENTRY_ID]: { howItHelps: 'Ours' } } })
    const res = makeRes()

    await fm.setCoachingDecline(makeReq({ params: { id: ENTRY_ID }, body: { declined: true } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.declines)).toEqual([ENTRY_ID])
    expect(savedTo(CONFIG_KEYS.overrides)).toBeUndefined()
  })

  test('switching back on removes it from the declines key', async () => {
    mockKeys({ [CONFIG_KEYS.declines]: [ENTRY_ID, 'cr-eoy-meeting'] })

    await fm.setCoachingDecline(makeReq({ params: { id: ENTRY_ID }, body: { declined: false } }), makeRes())

    expect(savedTo(CONFIG_KEYS.declines)).toEqual(['cr-eoy-meeting'])
  })

  test('refuses the last entry, so the screen can never say off while the AI reads on', async () => {
    // loadResolvedCoaching falls back to the layer above rather than resolve to zero
    // rows. Without this refusal a firm could switch all fifteen off, see them all
    // greyed out, and still be coached by all fifteen.
    const allButOne = BASE.slice(0, BASE.length - 1).map(r => r.id)
    const last = BASE[BASE.length - 1].id
    mockKeys({ [CONFIG_KEYS.declines]: allButOne })
    const res = makeRes()

    await fm.setCoachingDecline(makeReq({ params: { id: last }, body: { declined: true } }), res)

    expect(res._status).toBe(409)
    expect(res._body.error.code).toBe('LAST_ENTRY')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('allows the last one off when the firm has an entry of its own to fall back on', async () => {
    const allButOne = BASE.slice(0, BASE.length - 1).map(r => r.id)
    const last = BASE[BASE.length - 1].id
    mockKeys({
      [CONFIG_KEYS.declines]: allButOne,
      [CONFIG_KEYS.own]: [{ id: 'fc-1', template: 'Our Own Framework' }]
    })
    const res = makeRes()

    await fm.setCoachingDecline(makeReq({ params: { id: last }, body: { declined: true } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.declines)).toHaveLength(BASE.length)
  })

  test('refuses a declined flag that is not a boolean', async () => {
    const res = makeRes()

    await fm.setCoachingDecline(makeReq({ params: { id: ENTRY_ID }, body: { declined: 'yes' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_DECLINED')
  })

  test('404s on an unknown id', async () => {
    const res = makeRes()
    await fm.setCoachingDecline(makeReq({ params: { id: 'cr-nope' }, body: { declined: true } }), res)
    expect(res._status).toBe(404)
  })
})

// ── The firm's own entries ────────────────────────────────────────────────────

describe('POST /api/firm-manager/coaching/own', () => {
  test('assigns the id itself and ignores one from the browser', async () => {
    // An id from the body could collide with a platform entry and silently replace it.
    mockKeys({})
    const res = makeRes()

    await fm.addOwnCoachingEntry(makeReq({
      body: { id: ENTRY_ID, template: 'Succession Readiness Review', howItHelps: 'For owners near exit.' }
    }), res)

    expect(res._status).toBe(201)
    expect(res._body.id).toBe('fc-1')
    expect(savedTo(CONFIG_KEYS.own)[0].id).toBe('fc-1')
  })

  test('numbers from the highest id used, never the row count', async () => {
    // Reusing a deleted entry's id would hand a new entry the decisions recorded
    // against the old one.
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fc-3', template: 'A' }] })
    const res = makeRes()

    await fm.addOwnCoachingEntry(makeReq({ body: { template: 'B' } }), res)

    expect(res._body.id).toBe('fc-4')
  })

  test('needs a template name — an entry naming none coaches the model toward nothing', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.addOwnCoachingEntry(makeReq({ body: { howItHelps: 'Useful, somehow.' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_FIELD')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a whitespace-only template name', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.addOwnCoachingEntry(makeReq({ body: { template: '   ' } }), res)

    expect(res._status).toBe(400)
  })

  test('stores every field, filling the ones not sent rather than leaving them undefined', async () => {
    mockKeys({})

    await fm.addOwnCoachingEntry(makeReq({ body: { template: 'Our Framework' } }), makeRes())

    expect(savedTo(CONFIG_KEYS.own)[0]).toEqual({
      id: 'fc-1',
      template: 'Our Framework',
      howItHelps: '',
      whatToLookFor: '',
      whereMayLead: '',
      deliveryNotes: '',
      scenarios: []
    })
  })
})

describe('PUT /api/firm-manager/coaching/own/:id', () => {
  test('a firm may retitle its OWN entry, unlike an inherited one', async () => {
    // No platform id is left pointing at wording that has moved underneath it, so the
    // reason for the lock on inherited entries does not apply here.
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fc-1', template: 'Old Name', howItHelps: 'x' }] })
    const res = makeRes()

    await fm.updateOwnCoachingEntry(makeReq({ params: { id: 'fc-1' }, body: { template: 'New Name' } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.own)[0]).toEqual({ id: 'fc-1', template: 'New Name', howItHelps: 'x' })
  })

  test('cannot blank the template name', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fc-1', template: 'Old Name' }] })
    const res = makeRes()

    await fm.updateOwnCoachingEntry(makeReq({ params: { id: 'fc-1' }, body: { template: '' } }), res)

    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('the id in the path wins over one in the body', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fc-1', template: 'A' }, { id: 'fc-2', template: 'B' }] })

    await fm.updateOwnCoachingEntry(makeReq({
      params: { id: 'fc-1' }, body: { id: 'fc-2', howItHelps: 'edited' }
    }), makeRes())

    const rows = savedTo(CONFIG_KEYS.own)
    expect(rows[0]).toEqual({ id: 'fc-1', template: 'A', howItHelps: 'edited' })
    expect(rows[1]).toEqual({ id: 'fc-2', template: 'B' })
  })

  test('404s on an entry the firm does not have', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [] })
    const res = makeRes()

    await fm.updateOwnCoachingEntry(makeReq({ params: { id: 'fc-9' }, body: { howItHelps: 'x' } }), res)

    expect(res._status).toBe(404)
  })
})

describe('DELETE /api/firm-manager/coaching/own/:id', () => {
  test('removes only that entry', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fc-1', template: 'A' }, { id: 'fc-2', template: 'B' }] })
    const res = makeRes()

    await fm.deleteOwnCoachingEntry(makeReq({ params: { id: 'fc-1' } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.own)).toEqual([{ id: 'fc-2', template: 'B' }])
  })

  test('404s rather than pretending to remove an Advisor-e entry', async () => {
    // An Advisor-e entry is switched off, never deleted, so it can come back.
    mockKeys({ [CONFIG_KEYS.own]: [] })
    const res = makeRes()

    await fm.deleteOwnCoachingEntry(makeReq({ params: { id: ENTRY_ID } }), res)

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// ── The key this section must never touch ─────────────────────────────────────

describe('the promoted case observations are left alone', () => {
  test('no coaching route ever writes the coaching-reference key', async () => {
    // That key holds an advisor free text about a real client, which reaches the model
    // FENCED. These routes write only the three cascade keys. If one of them ever wrote
    // coaching-reference, a promoted observation would be resolved as trusted guidance.
    mockKeys({})

    await fm.setCoachingOverride(makeReq({ params: { id: ENTRY_ID }, body: { howItHelps: 'x' } }), makeRes())
    await fm.setCoachingDecline(makeReq({ params: { id: ENTRY_ID }, body: { declined: true } }), makeRes())
    await fm.addOwnCoachingEntry(makeReq({ body: { template: 'Ours' } }), makeRes())

    const keysWritten = overlay.saveFirmConfig.mock.calls.map(c => c[1])
    expect(keysWritten.length).toBeGreaterThan(0)
    expect(keysWritten).not.toContain('coaching-reference')
    expect(new Set(keysWritten)).toEqual(new Set([
      CONFIG_KEYS.overrides, CONFIG_KEYS.declines, CONFIG_KEYS.own
    ]))
  })
})
