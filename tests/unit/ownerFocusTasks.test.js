'use strict'

/**
 * The Owner Focus Tasks starting list, and the ladder it comes down (item 5.4).
 *
 * What these guard — none of it wording, all of it invisible in UAT because every state
 * renders as a plausible list:
 *   1. The cascade resolves to the right tier and says whose list it is.
 *   2. A malformed stored row degrades upward rather than reaching an owner.
 *   3. The validator is the trust boundary: blanks and duplicates dropped, empty refused.
 *   4. The routes write only to the token's own scope, and a refused write is never
 *      reported as saved.
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
const ownerFocusTasks = require('../../server/utils/ownerFocusTasks')
const routes = require('../../server/routes/ownerFocusTasks')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const nothingStored = () => Promise.resolve(null)
const storedAt = byScope => scopeId => Promise.resolve(byScope[scopeId] || null)

/** A database refusal — carries a sqlState, so the dev fallback must NOT swallow it. */
function refused () {
  const e = new Error('write refused')
  e.sqlState = '42000'
  return e
}

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = JSON.parse(body) }
  }
}

function req (over) {
  return Object.assign({ params: {}, body: {}, firmId: 'firm-a', advisorId: 'mgr-1' }, over || {})
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  overlay.getVersionHistory.mockResolvedValue([])
  overlay.restoreVersion.mockResolvedValue(undefined)
})

describe('the shipped list', () => {
  it('is served when nobody in the chain has written one, and says so', async () => {
    const r = await ownerFocusTasks.resolveTasks('firm-1', nothingStored)
    expect(r.source).toEqual({ scopeId: PLATFORM_SCOPE, tier: 'mentor', shipped: true })
    expect(r.inherited).toBe(true)
    expect(r.tasks).toEqual(require('../../data/owner-focus-tasks.json').tasks)
  })

  it('is not inherited by the mentor, who IS that tier', async () => {
    expect((await ownerFocusTasks.resolveTasks(PLATFORM_SCOPE, nothingStored)).inherited).toBe(false)
  })

  it('hands back a fresh copy, so one caller cannot edit the next caller\'s list', async () => {
    const a = await ownerFocusTasks.resolveTasks('firm-1', nothingStored)
    a.tasks[0] = 'MUTATED'
    expect((await ownerFocusTasks.resolveTasks('firm-1', nothingStored)).tasks[0]).not.toBe('MUTATED')
  })
})

describe('the cascade stops at the first tier that has written one', () => {
  it('a firm\'s own list wins over the mentor\'s', async () => {
    const r = await ownerFocusTasks.resolveTasks('firm-1', storedAt({
      'firm-1': { tasks: ['Ours'] }, [PLATFORM_SCOPE]: { tasks: ['Mentor'] }
    }))
    expect(r.tasks).toEqual(['Ours'])
    expect(r.source.tier).toBe('firm_manager')
    expect(r.inherited).toBe(false)
  })

  it('a firm with none of its own takes the mentor\'s written list, and is told whose it is', async () => {
    const r = await ownerFocusTasks.resolveTasks('firm-1', storedAt({ [PLATFORM_SCOPE]: { tasks: ['Mentor'] } }))
    expect(r.tasks).toEqual(['Mentor'])
    expect(r.source).toEqual({ scopeId: PLATFORM_SCOPE, tier: 'mentor', shipped: false })
    expect(r.inherited).toBe(true)
  })

  it('🔴 falls through a MALFORMED stored row rather than serving it', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const r = await ownerFocusTasks.resolveTasks('firm-1', storedAt({
      'firm-1': { tasks: [] }, [PLATFORM_SCOPE]: { tasks: ['Mentor'] }
    }))
    expect(r.tasks).toEqual(['Mentor'])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('never rejects when a live store refuses the read', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const r = await ownerFocusTasks.resolveTasks('firm-1', () => Promise.reject(refused()))
    expect(r.source.shipped).toBe(true)
    spy.mockRestore()
  })
})

describe('validateTasks — the trust boundary', () => {
  it('trims, drops blanks and case-insensitive duplicates, keeps order', () => {
    expect(ownerFocusTasks.validateTasks({ tasks: [' Sales ', '', 'sales', 'Board'] }))
      .toEqual({ ok: true, tasks: ['Sales', 'Board'] })
  })

  it('refuses an empty list, a non-list, a non-text task, an over-long name and too many tasks', () => {
    expect(ownerFocusTasks.validateTasks({ tasks: ['  '] }).ok).toBe(false)
    expect(ownerFocusTasks.validateTasks({ tasks: 'Sales' }).ok).toBe(false)
    expect(ownerFocusTasks.validateTasks(null).ok).toBe(false)
    expect(ownerFocusTasks.validateTasks({ tasks: [42] }).ok).toBe(false)
    expect(ownerFocusTasks.validateTasks({ tasks: ['x'.repeat(ownerFocusTasks.MAX_NAME + 1)] }).ok).toBe(false)
    const many = Array.from({ length: ownerFocusTasks.MAX_TASKS + 1 }, (_, i) => 'Task ' + i)
    expect(ownerFocusTasks.validateTasks({ tasks: many }).ok).toBe(false)
  })
})

describe('the routes', () => {
  it('GET resolves for the token\'s own scope and says the caller\'s tier', async () => {
    const res = makeRes()
    await routes.get(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.tier).toBe('firm_manager')
    expect(res._body.ownedHere).toBe(false)
    expect(res._body.tasks.length).toBe(10)
    expect(overlay.loadFirmConfig.mock.calls[0][0]).toBe('firm-a')
  })

  it('PUT saves the validated list to the token\'s scope — never a scope from the body', async () => {
    const res = makeRes()
    await routes.put(req({ body: { tasks: [' Board ', 'Board'], firmId: 'someone-else' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith('firm-a', 'owner-focus-tasks', { tasks: ['Board'] }, 'mgr-1')
  })

  it('PUT refuses a bad list with 400 and stores nothing', async () => {
    const res = makeRes()
    await routes.put(req({ body: { tasks: [] } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('🔴 a refused write is a 500, never reported as saved', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.saveFirmConfig.mockRejectedValue(refused())
    const res = makeRes()
    await routes.put(req({ body: { tasks: ['Board'] } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/refused|42000/)
    spy.mockRestore()
  })

  it('DELETE writes the tombstone at the token\'s scope, keeping history', async () => {
    const res = makeRes()
    await routes.del(req(), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith('firm-a', 'owner-focus-tasks', null, 'mgr-1')
  })

  it('history and restore are both scoped to the token, never the URL', async () => {
    await routes.versions(req(), makeRes())
    expect(overlay.getVersionHistory).toHaveBeenCalledWith('firm-a', 'owner-focus-tasks')
    await routes.restore(req({ params: { id: '7' } }), makeRes())
    expect(overlay.restoreVersion).toHaveBeenCalledWith('firm-a', 'owner-focus-tasks', '7')
  })

  it('a write with no scope on the token is refused', async () => {
    const res = makeRes()
    await routes.put(req({ firmId: null, body: { tasks: ['Board'] } }), res)
    expect(res._status).toBe(400)
  })

  it('source tripwire — the read is open to any sign-in, every write needs a manager', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/server\.get\('\/api\/owner-focus-tasks', firmOrEntityAuth, ownerFocusTasksRoute\.get\)/)
    ;['put', 'del'].forEach((verb) => {
      expect(src).toMatch(new RegExp(`server\\.${verb}\\('/api/owner-focus-tasks', firmAuth, requireManagerRole,`))
    })
    expect(src).toMatch(/server\.get\('\/api\/owner-focus-tasks\/versions', firmAuth, requireManagerRole,/)
    expect(src).toMatch(/server\.post\('\/api\/owner-focus-tasks\/versions\/:id\/restore', firmAuth, requireManagerRole,/)
  })
})
