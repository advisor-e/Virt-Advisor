'use strict'

/**
 * The Growth Aspect Questions tab's routes — item 15.2, screen 3b.
 *
 * WHAT UAT CANNOT SEE: that a scope named in a request body is obeyed (one tier writing
 * another's decisions), that a refused change reached the store anyway, that "Keep mine"
 * quietly took the other wording, that an aspect can be left with nothing to ask, or that a
 * database fault leaks its text. The store is an in-memory stand-in, so each test follows a
 * manager's clicks through to what is saved.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/growthAspects')
const ga = require('../../server/utils/growthAspects')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-a'
const GOV = ga.BASE_ASPECTS.find(a => a.name === 'Governance')

/** The stand-in store: `scope::key` → value. */
let db

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

/** Call a route as a manager whose verified scope is `scope`. */
async function call (handler, body, scope) {
  const res = makeRes()
  await handler({ firmId: scope || FIRM, userEmail: 'm@firm.example', body, query: {} }, res)
  return res
}

const govOf = res => res._body.aspects.find(a => a.name === 'Governance')
const stateOf = scope => ga.readState(db[scope + '::' + ga.CONFIG_KEY]).Governance

function sqlError () {
  const e = new Error('ER_NO_SUCH_TABLE: firm_framework_versions at /srv/app')
  e.sqlState = '42S02'
  return e
}

beforeEach(() => {
  jest.clearAllMocks()
  db = {}
  overlay.loadFirmConfig.mockImplementation((scope, key) => Promise.resolve(db[scope + '::' + key] || null))
  overlay.saveFirmConfig.mockImplementation((scope, key, value) => { db[scope + '::' + key] = value; return Promise.resolve() })
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { jest.restoreAllMocks() })

describe('reading the tab', () => {
  test('returns the nine as this tier sees them, with the limits the boxes stop at', async () => {
    const res = await call(routes.getForManager)
    expect(res._status).toBe(200)
    expect(res._body.aspects).toHaveLength(9)
    expect(res._body.limits).toEqual({ maxQuestion: ga.MAX_QUESTION, maxDescription: ga.MAX_DESCRIPTION })
  })

  test('a live database fault is a 500 that names nothing inside', async () => {
    overlay.loadFirmConfig.mockRejectedValue(sqlError())
    const res = await call(routes.getForManager)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE|firm_framework_versions|\/srv/)
  })
})

describe('every change is this tier’s own', () => {
  test('🔴 a question added is saved under the TOKEN’s scope, never one named in the body', async () => {
    const res = await call(routes.addQuestion, { aspect: 'Governance', text: 'Ours?', firmId: 'firm-b' })
    expect(res._status).toBe(200)
    expect(govOf(res).questions[14]).toMatchObject({ id: 'fq-1', text: 'Ours?', source: 'added-here' })
    expect(overlay.saveFirmConfig.mock.calls.every(c => c[0] === FIRM)).toBe(true)
    expect(Object.keys(db).some(k => k.indexOf('firm-b') === 0)).toBe(false)
  })

  test('refuses an aspect that is not one of the nine, before touching the store', async () => {
    const res = await call(routes.addQuestion, { aspect: 'Exit Strategy', text: 'Q?' })
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('UNKNOWN_ASPECT')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a blank question, and saves nothing', async () => {
    const res = await call(routes.addQuestion, { aspect: 'Governance', text: '  ' })
    expect(res._status).toBe(400)
    expect(res._body.error.message).toContain('cannot be blank')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a 41st added question on one aspect', async () => {
    db[FIRM + '::' + ga.CONFIG_KEY] = { aspects: { Governance: { own: Array.from({ length: 40 }, (_, i) => ({ id: 'fq-' + (i + 1), text: 'Q' + i })) } } }
    const res = await call(routes.addQuestion, { aspect: 'Governance', text: 'One more?' })
    expect(res._body.error.code).toBe('TOO_MANY')
  })
})

describe('editing', () => {
  test('🔴 an inherited question edited here is stored with the wording it was edited against', async () => {
    const res = await call(routes.editQuestion, { aspect: 'Governance', id: 'ga-governance-2', text: 'Ours?' })
    expect(govOf(res).questions[1]).toMatchObject({ text: 'Ours?', source: 'edited-here', changedAbove: false })
    expect(stateOf(FIRM).baselines['ga-governance-2']).toBe(GOV.questions[1].text)
  })

  test('editing back to the inherited wording drops the edit rather than storing a copy', async () => {
    await call(routes.editQuestion, { aspect: 'Governance', id: 'ga-governance-2', text: 'Ours?' })
    const res = await call(routes.editQuestion, { aspect: 'Governance', id: 'ga-governance-2', text: GOV.questions[1].text })
    expect(govOf(res).questions[1].source).toBe('inherited')
    expect(stateOf(FIRM).overrides).toEqual({})
  })

  test('a question added here is edited in place', async () => {
    await call(routes.addQuestion, { aspect: 'Governance', text: 'First?' })
    const res = await call(routes.editQuestion, { aspect: 'Governance', id: 'fq-1', text: 'Second?' })
    expect(govOf(res).questions[14]).toMatchObject({ id: 'fq-1', text: 'Second?', source: 'added-here' })
  })

  test('an id that is neither inherited nor added here is 404', async () => {
    const res = await call(routes.editQuestion, { aspect: 'Governance', id: 'mq-99', text: 'Q?' })
    expect(res._status).toBe(404)
  })
})

describe('switching off and removing', () => {
  test('an inherited question switched off, then back on', async () => {
    let res = await call(routes.setQuestionOff, { aspect: 'Governance', id: 'ga-governance-1', off: true })
    expect(govOf(res).questions).toHaveLength(13)
    expect(govOf(res).declined).toEqual([{ id: 'ga-governance-1', text: GOV.questions[0].text }])
    res = await call(routes.setQuestionOff, { aspect: 'Governance', id: 'ga-governance-1', off: false })
    expect(govOf(res).questions).toHaveLength(14)
    expect(govOf(res).declined).toEqual([])
  })

  test('a question added here is removed, and cannot be "switched back on"', async () => {
    await call(routes.addQuestion, { aspect: 'Governance', text: 'Ours?' })
    let res = await call(routes.setQuestionOff, { aspect: 'Governance', id: 'fq-1', off: false })
    expect(res._body.error.code).toBe('NOT_DECLINABLE')
    res = await call(routes.setQuestionOff, { aspect: 'Governance', id: 'fq-1', off: true })
    expect(govOf(res).questions).toHaveLength(14)
  })

  test('🔴 the id of a removed question is never handed to the next one added', async () => {
    await call(routes.addQuestion, { aspect: 'Governance', text: 'One?' })
    await call(routes.addQuestion, { aspect: 'Governance', text: 'Two?' })
    await call(routes.setQuestionOff, { aspect: 'Governance', id: 'fq-2', off: true })
    const res = await call(routes.addQuestion, { aspect: 'Governance', text: 'Three?' })
    expect(govOf(res).questions.map(q => q.id).slice(-2)).toEqual(['fq-1', 'fq-3'])
  })

  test('🔴 an aspect keeps at least one question', async () => {
    db[FIRM + '::' + ga.CONFIG_KEY] = { aspects: { Governance: { declined: GOV.questions.slice(1).map(q => q.id) } } }
    const res = await call(routes.setQuestionOff, { aspect: 'Governance', id: 'ga-governance-1', off: true })
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('LAST_QUESTION')
    expect(stateOf(FIRM).declined).not.toContain('ga-governance-1')
  })

  test('refuses an `off` that is not true or false', async () => {
    const res = await call(routes.setQuestionOff, { aspect: 'Governance', id: 'ga-governance-1', off: 'yes' })
    expect(res._body.error.code).toBe('INVALID_OPTION')
  })
})

describe('when the tier above rewrites a question this tier edited', () => {
  beforeEach(async () => {
    await call(routes.editQuestion, { aspect: 'Governance', id: 'ga-governance-3', text: 'Ours?' })
    await call(routes.editQuestion, { aspect: 'Governance', id: 'ga-governance-3', text: 'Mentor rewrote it?' }, PLATFORM_SCOPE)
  })

  test('the firm still has its own wording, and is offered the new one', async () => {
    const res = await call(routes.getForManager)
    expect(govOf(res).questions[2]).toMatchObject({ text: 'Ours?', changedAbove: true, above: 'Mentor rewrote it?' })
  })

  test('🔴 Keep mine keeps the firm’s wording and stops the offer', async () => {
    const res = await call(routes.keepMineQuestion, { aspect: 'Governance', id: 'ga-governance-3' })
    expect(govOf(res).questions[2]).toMatchObject({ text: 'Ours?', source: 'edited-here', changedAbove: false })
  })

  test('🔴 Use theirs takes the new wording and drops the firm’s edit', async () => {
    const res = await call(routes.useInheritedQuestion, { aspect: 'Governance', id: 'ga-governance-3' })
    expect(govOf(res).questions[2]).toMatchObject({ text: 'Mentor rewrote it?', source: 'inherited' })
    expect(stateOf(FIRM).overrides).toEqual({})
  })

  test('Keep mine and Use theirs on a question never edited here are 404', async () => {
    expect((await call(routes.keepMineQuestion, { aspect: 'Governance', id: 'ga-governance-1' }))._status).toBe(404)
    expect((await call(routes.useInheritedQuestion, { aspect: 'Governance', id: 'ga-governance-1' }))._status).toBe(404)
  })
})

describe('the description', () => {
  test('edited, offered when the tier above changes it, then kept or dropped', async () => {
    let res = await call(routes.editDescription, { aspect: 'Governance', text: 'Firm words.' })
    expect(govOf(res)).toMatchObject({ description: 'Firm words.', descriptionSource: 'edited-here' })

    await call(routes.editDescription, { aspect: 'Governance', text: 'Mentor words.' }, PLATFORM_SCOPE)
    res = await call(routes.getForManager)
    expect(govOf(res)).toMatchObject({ description: 'Firm words.', descriptionChangedAbove: true, descriptionAbove: 'Mentor words.' })

    res = await call(routes.keepMineDescription, { aspect: 'Governance' })
    expect(govOf(res)).toMatchObject({ description: 'Firm words.', descriptionChangedAbove: false })

    res = await call(routes.useInheritedDescription, { aspect: 'Governance' })
    expect(govOf(res)).toMatchObject({ description: 'Mentor words.', descriptionSource: 'inherited' })
  })

  test('refuses a blank description; editing back to the inherited wording drops the edit', async () => {
    expect((await call(routes.editDescription, { aspect: 'Governance', text: '' }))._status).toBe(400)
    await call(routes.editDescription, { aspect: 'Governance', text: 'Firm words.' })
    const res = await call(routes.editDescription, { aspect: 'Governance', text: GOV.description })
    expect(govOf(res).descriptionSource).toBe('inherited')
  })

  test('Keep mine and Use the inherited wording on an unedited description are 404', async () => {
    expect((await call(routes.keepMineDescription, { aspect: 'Governance' }))._status).toBe(404)
    expect((await call(routes.useInheritedDescription, { aspect: 'Governance' }))._status).toBe(404)
  })
})

describe('storage faults', () => {
  test('a live database fault on a change is a 500 that names nothing inside', async () => {
    overlay.saveFirmConfig.mockRejectedValue(sqlError())
    const res = await call(routes.setQuestionOff, { aspect: 'Governance', id: 'ga-governance-1', off: true })
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE|\/srv/)
  })
})

describe('version history and restore', () => {
  test('history is this tier’s own', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 3, version: 2, saved_by: 'm@firm.example' }])
    const res = await call(routes.history, {})
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(FIRM, ga.CONFIG_KEY)
    expect(res._body.history).toHaveLength(1)
  })

  test('history with no database in development is empty, not an error', async () => {
    overlay.getVersionHistory.mockRejectedValue(new Error('connect ECONNREFUSED'))
    expect((await call(routes.history, {}))._body).toEqual({ history: [] })
  })

  test('a live database fault on history is a 500', async () => {
    overlay.getVersionHistory.mockRejectedValue(sqlError())
    expect((await call(routes.history, {}))._status).toBe(500)
  })

  test('restore acts on the token’s scope and never on the id counter', async () => {
    overlay.restoreVersion.mockResolvedValue()
    const res = await call(routes.restore, { versionId: 3, firmId: 'firm-b' })
    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, ga.CONFIG_KEY, 3)
    expect(overlay.restoreVersion).toHaveBeenCalledTimes(1)
    expect(res._body.restored).toBe(true)
  })

  test.each([[undefined], ['abc'], [0], [-1], [1.5]])('restore refuses version id %p', async (versionId) => {
    const res = await call(routes.restore, { versionId })
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('a version that is not this scope’s is a 500 that names nothing inside', async () => {
    overlay.restoreVersion.mockRejectedValue(new Error('Version not found for this firm and config key'))
    const res = await call(routes.restore, { versionId: 99 })
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('Version not found')
  })
})
