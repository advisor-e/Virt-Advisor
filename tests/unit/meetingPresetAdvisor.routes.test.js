'use strict'

/**
 * The ADVISOR'S OWN LEVEL — the routes. Slice 4 (first half) of
 * design/MEETING-TYPES-CASCADE.md §7, drawn as
 * design/mockups/meeting-preset-advisor-level.html and approved by Mike 2026-09-08 with all
 * six of its questions ruled.
 *
 * 🔴 THE FOUR THAT MATTER, and none is visible to a person testing in UAT:
 *
 *   1. A WRITE IS KEYED TO `req.advisorId` FROM THE TOKEN, NEVER A BODY. An advisor id in a
 *      request body would let anyone in the firm edit a colleague's list — and, because the
 *      display name is stored beside the decision, put a colleague's name against a decision
 *      they never made on the manager's screen. There is no request shape that can express
 *      it, and these tests are what keep it that way.
 *
 *   2. AN ADVISOR'S WRITE NEVER TOUCHES THE FIRM'S LIST. Mike's P14 runs downward only. On
 *      screen a correct and an incorrect implementation look identical to the advisor who
 *      made the change; the damage shows up on somebody else's screen.
 *
 *   3. A DECLINE IS REFUSED FOR A POINT THE FIRM DOES NOT OFFER. Without that check any
 *      string could be stored in the firm's configuration for ever and would surface on the
 *      manager's screen as a point nobody recognises.
 *
 *   4. AN EMPTY ADVISOR LEAVES NO ROW. Somebody who sets a point aside and puts it back must
 *      vanish from the map, or the manager's screen lists people who changed their mind.
 *
 * The fifth is the house storage discipline: a live MySQL REFUSAL surfaces as a 500 and
 * never falls through to the dev JSON (server/utils/dbFailure.js).
 *
 * 🔴 THE SIXTH ARRIVED WITH ITEM 4.75 (2026-09-08): ONE STORAGE ROW PER ADVISOR. Every
 * advisor used to read the firm's whole map, change their own entry and write the map back,
 * with no compare-and-set underneath — so two saving inside the same read-write silently
 * discarded one another's work and both were answered 200. Nothing on any screen showed it,
 * which is exactly why it is pinned here. `writes only my row` is the assertion that holds it.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/meetingObservations')
const {
  CONFIG_KEYS: ADVISOR_KEYS,
  KEY_SEPARATOR,
  advisorConfigKey,
  readAdvisorDeclines,
  MAX_OWN_POINTS_PER_SCENARIO
} = require('../../server/utils/meetingObservationsAdvisor')

const EOY = 'eoy_meeting'
const FIRM = 'firm-test-123'
const ME = 'adv-me'
const COLLEAGUE = 'adv-someone-else'

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

/** `sendError` writes a JSON STRING through writeHead/end; reading `.error` off it is undefined. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

/** A failure a LIVE MySQL answered and refused — `sqlState` is what stops the dev fallback. */
function refusal (message) {
  return Object.assign(new Error(message), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}

function makeReq (overrides = {}) {
  return {
    firmId: FIRM,
    advisorId: ME,
    advisorName: 'Ruth Kelleher',
    userRole: 'advisor',
    userEmail: 'ruth@testfirm.com',
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides
  }
}

/**
 * Seed storage from the readable `{ part: { advisorId: entry } }` shape, spread across the
 * per-advisor rows it is actually held in. A test still reads as "who has what"; the storage
 * underneath is one row each, which is what stops two advisors overwriting one another.
 */
function storeForFirm (byPart) {
  const rows = {}
  Object.keys(byPart).forEach((baseKey) => {
    const byAdvisor = byPart[baseKey] || {}
    Object.keys(byAdvisor).forEach((advisorId) => {
      rows[baseKey + KEY_SEPARATOR + advisorId] = byAdvisor[advisorId]
    })
  })

  overlay.loadFirmConfig.mockImplementation((scopeId, key) => {
    if (scopeId !== FIRM) { return Promise.resolve(null) }
    return Promise.resolve(Object.prototype.hasOwnProperty.call(rows, key) ? rows[key] : null)
  })

  overlay.loadFirmConfigsByPrefix.mockImplementation((scopeId, prefix) => {
    if (scopeId !== FIRM) { return Promise.resolve({}) }
    const out = {}
    Object.keys(rows).forEach((key) => {
      if (key.indexOf(prefix) === 0) { out[key.slice(prefix.length)] = rows[key] }
    })
    return Promise.resolve(out)
  })
}

/**
 * What storage now holds for one part, assembled from the rows actually saved — the last save
 * per advisor. Null when nothing under that part was written at all.
 */
function savedMap (baseKey) {
  const prefix = baseKey + KEY_SEPARATOR
  const out = {}
  let wrote = false
  overlay.saveFirmConfig.mock.calls.forEach((call) => {
    const key = String(call[1])
    if (key.indexOf(prefix) !== 0) { return }
    wrote = true
    out[key.slice(prefix.length)] = call[2]
  })
  return wrote ? out : null
}

/** Every config key written, in order — the seam that says whose row a route touched. */
function savedKeys () {
  return overlay.saveFirmConfig.mock.calls.map(c => c[1])
}

/** The first point of the End of Year scenario, straight from the platform file. */
async function firstPointId () {
  const res = makeMockRes()
  await routes.getForAdvisor(makeReq({ query: { scenario: EOY } }), res)
  return res._body.scenarios[0].points[0].id
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.loadFirmConfigsByPrefix.mockResolvedValue({})
  overlay.saveFirmConfig.mockResolvedValue(1)
})

describe('the advisor read', () => {
  test('every point carries the tier it came from and the words for it', async () => {
    const res = makeMockRes()
    await routes.getForAdvisor(makeReq({ query: { scenario: EOY } }), res)

    expect(res._status).toBe(200)
    const points = res._body.scenarios[0].points
    expect(points.length).toBeGreaterThan(0)
    // Question 4, ruled 2026-09-08: EVERY point, always. A label that appears only
    // sometimes teaches an advisor to read its absence as meaning something.
    expect(points.every(p => p.sourceTier && p.sourceLabel)).toBe(true)
  })

  test('shows what I set aside, so I can put it back', async () => {
    const pointId = await firstPointId()
    storeForFirm({
      [ADVISOR_KEYS.advisorDeclines]: { [ME]: { name: 'Ruth', scenarios: { [EOY]: [pointId] } } }
    })

    const res = makeMockRes()
    await routes.getForAdvisor(makeReq({ query: { scenario: EOY } }), res)

    const scenario = res._body.scenarios[0]
    expect(scenario.points.some(p => p.id === pointId)).toBe(false)
    expect(scenario.setAside.map(p => p.id)).toEqual([pointId])
  })

  test("🔴 shows MY list, never a colleague's", async () => {
    const pointId = await firstPointId()
    storeForFirm({
      [ADVISOR_KEYS.advisorDeclines]: {
        [COLLEAGUE]: { name: 'Tom', scenarios: { [EOY]: [pointId] } }
      },
      [ADVISOR_KEYS.advisorOwn]: {
        [COLLEAGUE]: { name: 'Tom', scenarios: { [EOY]: [{ id: 'ao-1', text: "Tom's own point" }] } }
      }
    })

    const res = makeMockRes()
    await routes.getForAdvisor(makeReq({ query: { scenario: EOY } }), res)

    const scenario = res._body.scenarios[0]
    // Tom's decline must not remove the point from Ruth's list, and his own point must not
    // appear on it. Both maps live in the same firm row, so this is the seam that keeps two
    // advisors apart.
    expect(scenario.points.some(p => p.id === pointId)).toBe(true)
    expect(scenario.points.some(p => p.text === "Tom's own point")).toBe(false)
    expect(scenario.setAside).toEqual([])
  })

  test('404s a scenario that does not exist rather than answering empty', async () => {
    const res = makeMockRes()
    await routes.getForAdvisor(makeReq({ query: { scenario: 'no_such_meeting' } }), res)
    expect(res._status).toBe(404)
  })
})

describe('setting a point aside', () => {
  test('stores it against me, with my name captured from the token', async () => {
    const pointId = await firstPointId()
    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId, declined: true } }), res
    )

    expect(res._status).toBe(200)
    const map = savedMap(ADVISOR_KEYS.advisorDeclines)
    expect(map[ME].scenarios[EOY]).toEqual([pointId])
    // 🔴 The name is stored because this app holds NO advisors table to join one out of
    // later (config/db-schema.sql, four times). Without it the manager's screen ordered by
    // Mike could only ever show opaque ids.
    expect(map[ME].name).toBe('Ruth Kelleher')
  })

  test("🔴 writes only MY row — a colleague's is never rewritten (item 4.75)", async () => {
    const pointId = await firstPointId()
    storeForFirm({
      [ADVISOR_KEYS.advisorDeclines]: {
        [COLLEAGUE]: { name: 'Tom', scenarios: { [EOY]: ['mo-eoy-4'] } }
      }
    })

    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId, declined: true } }), res
    )

    // 🔴 THIS IS THE WHOLE OF THE 4.75 FIX. While both advisors shared one row, this write
    // carried a copy of Tom's entry with it — so a change Tom made between Ruth's read and
    // her save was overwritten, and Tom was answered 200. Ruth's row is now the ONLY key
    // written, so there is no copy of Tom's data in flight to go stale.
    expect(savedKeys()).toEqual([advisorConfigKey('advisorDeclines', ME)])

    const map = savedMap(ADVISOR_KEYS.advisorDeclines)
    expect(map[ME].scenarios[EOY]).toEqual([pointId])
    expect(map[COLLEAGUE]).toBeUndefined()
  })

  test('🔴 a colleague saving first is not lost when I save second', async () => {
    // The race itself, run in the order that used to destroy work: Ruth reads, Tom saves,
    // Ruth saves. Nothing on either advisor's screen ever showed the loss — both were
    // answered 200 — which is why it can only be caught here.
    const pointId = await firstPointId()
    storeForFirm({ [ADVISOR_KEYS.advisorDeclines]: {} })

    // Ruth reads the state she is about to act on.
    await routes.getForAdvisor(makeReq({ query: { scenario: EOY } }), makeMockRes())

    // Tom saves in the gap.
    const tom = makeMockRes()
    await routes.setAdvisorDecline(makeReq({
      advisorId: COLLEAGUE,
      advisorName: 'Tom Boyd',
      body: { scenario: EOY, pointId, declined: true }
    }), tom)
    expect(tom._status).toBe(200)

    // Ruth saves, from the state she read before Tom wrote.
    const ruth = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId, declined: true } }), ruth)
    expect(ruth._status).toBe(200)

    // Both survive, because they were never in the same row.
    expect(savedKeys()).toEqual([
      advisorConfigKey('advisorDeclines', COLLEAGUE),
      advisorConfigKey('advisorDeclines', ME)
    ])
    const map = savedMap(ADVISOR_KEYS.advisorDeclines)
    expect(map[COLLEAGUE].scenarios[EOY]).toEqual([pointId])
    expect(map[ME].scenarios[EOY]).toEqual([pointId])
  })

  // How a key is built — the column's length cap included — is pinned beside the builder, in
  // tests/unit/meetingObservationsAdvisor.test.js.

  test('🔴 ignores an advisor id in the body — identity comes from the token alone', async () => {
    const pointId = await firstPointId()
    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId, declined: true, advisorId: COLLEAGUE } }), res
    )

    const map = savedMap(ADVISOR_KEYS.advisorDeclines)
    // The colleague named in the body gets nothing. This is the IDOR guard: a body-supplied
    // id would let anyone in the firm edit a colleague's list AND put that colleague's name
    // against a decision they never made.
    expect(map[COLLEAGUE]).toBeUndefined()
    expect(Object.keys(map)).toEqual([ME])
  })

  test('🔴 refuses a point the firm does not offer', async () => {
    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId: 'mo-not-a-real-point', declined: true } }), res
    )

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('putting a point back leaves the manager nothing to see', async () => {
    const pointId = await firstPointId()
    storeForFirm({
      [ADVISOR_KEYS.advisorDeclines]: { [ME]: { name: 'Ruth', scenarios: { [EOY]: [pointId] } } }
    })

    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId, declined: false } }), res
    )

    // ⚠ The row is EMPTIED rather than removed. It used to be deleted from a firm-wide map;
    // an advisor now owns a row of their own and the overlay has no delete. What matters is
    // unchanged and is asserted where it is felt: an advisor who changed their mind must not
    // linger on the manager's screen, and an entry holding no scenarios is dropped on the way
    // to it.
    const saved = savedMap(ADVISOR_KEYS.advisorDeclines)
    expect(saved[ME].scenarios).toEqual({})
    expect(readAdvisorDeclines(saved)).toEqual({})
  })

  test('setting the same point aside twice does not store it twice', async () => {
    const pointId = await firstPointId()
    storeForFirm({
      [ADVISOR_KEYS.advisorDeclines]: { [ME]: { name: 'Ruth', scenarios: { [EOY]: [pointId] } } }
    })

    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId, declined: true } }), res
    )
    expect(savedMap(ADVISOR_KEYS.advisorDeclines)[ME].scenarios[EOY]).toEqual([pointId])
  })

  test('refuses a request with no advisor on the token', async () => {
    const pointId = await firstPointId()
    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ advisorId: null, body: { scenario: EOY, pointId, declined: true } }), res
    )
    expect(res._status).toBe(403)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a live MySQL refusal is a 500, never a silent dev-file write', async () => {
    const pointId = await firstPointId()
    overlay.loadFirmConfig.mockRejectedValue(refusal('table is gone'))

    const res = makeMockRes()
    await routes.setAdvisorDecline(
      makeReq({ body: { scenario: EOY, pointId, declined: true } }), res
    )

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
  })
})

describe('a point of my own', () => {
  test('mints the id itself and keeps my hint words', async () => {
    const res = makeMockRes()
    await routes.addAdvisorPoint(makeReq({
      body: { scenario: EOY, text: 'I asked what had changed at home.', hintWords: ['at home'] }
    }), res)

    expect(res._status).toBe(200)
    // 🔴 The id is never taken from the browser: a body-supplied id could collide with an
    // inherited point and silently replace it on this advisor's list.
    expect(res._body.point.id).toBe('ao-1')
    // Mike's ruling of 2026-09-08 REVERSED the recommendation to withhold hint words.
    expect(res._body.point.hintWords).toEqual(['at home'])
    expect(savedMap(ADVISOR_KEYS.advisorOwn)[ME].scenarios[EOY]).toHaveLength(1)
  })

  test('ignores an id supplied in the body', async () => {
    const res = makeMockRes()
    await routes.addAdvisorPoint(makeReq({
      body: { scenario: EOY, text: 'mine', id: 'mo-eoy-1' }
    }), res)
    // An unknown field is refused outright rather than dropped quietly, so the advisor is
    // told rather than left believing something was stored.
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses an empty point', async () => {
    const res = makeMockRes()
    await routes.addAdvisorPoint(makeReq({ body: { scenario: EOY, text: '   ' } }), res)
    expect(res._status).toBe(400)
  })

  test('refuses more than the cap in one meeting type', async () => {
    const rows = []
    for (let i = 1; i <= MAX_OWN_POINTS_PER_SCENARIO; i += 1) {
      rows.push({ id: 'ao-' + i, text: 'point ' + i })
    }
    storeForFirm({
      [ADVISOR_KEYS.advisorOwn]: { [ME]: { name: 'Ruth', scenarios: { [EOY]: rows } } }
    })

    const res = makeMockRes()
    await routes.addAdvisorPoint(makeReq({ body: { scenario: EOY, text: 'one too many' } }), res)
    expect(res._status).toBe(400)
  })

  test('editing one of mine keeps its id', async () => {
    storeForFirm({
      [ADVISOR_KEYS.advisorOwn]: {
        [ME]: { name: 'Ruth', scenarios: { [EOY]: [{ id: 'ao-1', text: 'before' }] } }
      }
    })

    const res = makeMockRes()
    await routes.updateAdvisorPoint(makeReq({
      body: { scenario: EOY, pointId: 'ao-1', text: 'after' }
    }), res)

    expect(res._status).toBe(200)
    const rows = savedMap(ADVISOR_KEYS.advisorOwn)[ME].scenarios[EOY]
    expect(rows).toEqual([{ id: 'ao-1', text: 'after', hintWords: [] }])
  })

  test('🔴 404s an edit of a point I do not own, rather than creating one', async () => {
    storeForFirm({
      [ADVISOR_KEYS.advisorOwn]: {
        [COLLEAGUE]: { name: 'Tom', scenarios: { [EOY]: [{ id: 'ao-1', text: "Tom's" }] } }
      }
    })

    const res = makeMockRes()
    await routes.updateAdvisorPoint(makeReq({
      body: { scenario: EOY, pointId: 'ao-1', text: 'mine now' }
    }), res)

    // Answering 200 would tell the advisor an edit landed that never happened — and a silent
    // create would have written a point they never authored.
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('removing one of mine leaves no row when it was the last', async () => {
    storeForFirm({
      [ADVISOR_KEYS.advisorOwn]: {
        [ME]: { name: 'Ruth', scenarios: { [EOY]: [{ id: 'ao-1', text: 'mine' }] } }
      }
    })

    const res = makeMockRes()
    await routes.deleteAdvisorPoint(makeReq({ body: { scenario: EOY, pointId: 'ao-1' } }), res)

    expect(res._status).toBe(200)
    const map = savedMap(ADVISOR_KEYS.advisorOwn)
    expect(map[ME].scenarios).toEqual({})
    // 🔴 The row SURVIVES rather than being pruned, because it is what carries `nextSeq` —
    // the mark that stops a removed point's id being handed to the next one written. Only
    // the DECLINES map is pruned, because that is the one a manager reads and an advisor who
    // changed their mind must not linger there.
    //
    // The mark itself is empty here and that is right: this fixture was seeded by hand, as
    // data written before the mark existed would be. The mark is asserted where it is
    // actually produced — by `addAdvisorPoint`, in the two tests below.
    expect(map[ME]).toBeDefined()
    expect(map[ME].nextSeq).toEqual({})
  })

  test('🔴 a removed id is never handed to the next point added', async () => {
    // Driven end to end through the routes rather than from a hand-seeded map, deliberately:
    // the high-water mark is written by `addAdvisorPoint`, so a seeded fixture would be this
    // test asserting its own assumption about the shape rather than the behaviour.
    async function add (text) {
      const res = makeMockRes()
      await routes.addAdvisorPoint(makeReq({ body: { scenario: EOY, text } }), res)
      storeForFirm({ [ADVISOR_KEYS.advisorOwn]: savedMap(ADVISOR_KEYS.advisorOwn) })
      return res._body.point.id
    }

    expect(await add('first')).toBe('ao-1')
    expect(await add('second')).toBe('ao-2')

    const removed = makeMockRes()
    await routes.deleteAdvisorPoint(makeReq({ body: { scenario: EOY, pointId: 'ao-2' } }), removed)
    expect(removed._status).toBe(200)
    storeForFirm({ [ADVISOR_KEYS.advisorOwn]: savedMap(ADVISOR_KEYS.advisorOwn) })

    // 🔴 The HIGHEST id was the one removed, so the live rows alone say "ao-1 is the
    // highest, next is ao-2". A reused ao-2 would match the removed point in any coaching
    // report already stored against that id — a report about a point the advisor no longer
    // has, reading as one about the point they just wrote. Nothing on screen looks wrong.
    expect(await add('third')).toBe('ao-3')
  })

  test('the mark survives removing every point, so the first id is not handed back', async () => {
    const first = makeMockRes()
    await routes.addAdvisorPoint(makeReq({ body: { scenario: EOY, text: 'only one' } }), first)
    storeForFirm({ [ADVISOR_KEYS.advisorOwn]: savedMap(ADVISOR_KEYS.advisorOwn) })

    const removed = makeMockRes()
    await routes.deleteAdvisorPoint(makeReq({ body: { scenario: EOY, pointId: 'ao-1' } }), removed)
    storeForFirm({ [ADVISOR_KEYS.advisorOwn]: savedMap(ADVISOR_KEYS.advisorOwn) })

    const again = makeMockRes()
    await routes.addAdvisorPoint(makeReq({ body: { scenario: EOY, text: 'a new one' } }), again)
    // This is why the advisor's row in the OWN map is kept when it empties, unlike the
    // declines map: the row is all that carries the mark.
    expect(again._body.point.id).toBe('ao-2')
  })

  test('404s an unknown meeting type on every write', async () => {
    for (const handler of ['setAdvisorDecline', 'addAdvisorPoint', 'updateAdvisorPoint', 'deleteAdvisorPoint']) {
      const res = makeMockRes()
      await routes[handler](makeReq({
        body: { scenario: 'no_such_meeting', pointId: 'ao-1', text: 'x', declined: true }
      }), res)
      expect(res._status).toBe(404)
    }
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe("the manager's view of what advisors set aside", () => {
  test('shows counts and names for the firm', async () => {
    const pointId = await firstPointId()
    storeForFirm({
      [ADVISOR_KEYS.advisorDeclines]: {
        [ME]: { name: 'Ruth Kelleher', scenarios: { [EOY]: [pointId] } },
        [COLLEAGUE]: { name: 'Tom Boyd', scenarios: { [EOY]: [pointId] } }
      }
    })

    const res = makeMockRes()
    await routes.getSetAside(makeReq({ userRole: 'firm_manager' }), res)

    expect(res._status).toBe(200)
    const eoy = res._body.scenarios.filter(s => s.id === EOY)[0]
    const row = eoy.points.filter(p => p.id === pointId)[0]
    expect(row.count).toBe(2)
    expect(row.setAsideBy.map(w => w.name)).toEqual(['Ruth Kelleher', 'Tom Boyd'])
  })

  test('🔴 answers 403 above the firm rather than an empty screen', async () => {
    // A judgement stated rather than assumed: the decisions live on each FIRM's row, so a
    // scope above the firm has no advisors beneath it to summarise. An always-empty section
    // is indistinguishable from a broken one — the same argument this screen makes for
    // listing points nobody has set aside.
    for (const scope of ['__platform__', '__global__:acme', '__group__:acme:ie']) {
      const res = makeMockRes()
      await routes.getSetAside(makeReq({ firmId: scope, userRole: 'firm_manager' }), res)
      expect(res._status).toBe(403)
    }
  })

  test('lists every point with a zero when nobody has set anything aside', async () => {
    const res = makeMockRes()
    await routes.getSetAside(makeReq({ userRole: 'firm_manager' }), res)
    const eoy = res._body.scenarios.filter(s => s.id === EOY)[0]
    expect(eoy.points.length).toBeGreaterThan(0)
    expect(eoy.points.every(p => p.count === 0)).toBe(true)
  })

  test('a refusal reading the advisors\' rows is a 500, never a quietly empty list', async () => {
    // The whole-firm read is its own query since 4.75, so it needs its own refusal test: a
    // manager reading "nobody has set anything aside" off a failed read would take a fault as
    // reassurance.
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(refusal('table is gone'))
    const res = makeMockRes()
    await routes.getSetAside(makeReq({ userRole: 'firm_manager' }), res)
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
  })

  test('a live MySQL refusal is a 500, never a quietly empty list', async () => {
    // BOTH reads are refused, because a live refusal refuses everything. Refusing only
    // `loadFirmConfig` answers 200: `loadResolvedObservations` catches its own read failure
    // and returns the platform base (server/utils/meetingObservations.js), so the 500 comes
    // from the advisors' read below it. That swallow is deliberate and predates this route.
    overlay.loadFirmConfig.mockRejectedValue(refusal('table is gone'))
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(refusal('table is gone'))
    const res = makeMockRes()
    await routes.getSetAside(makeReq({ userRole: 'firm_manager' }), res)
    // A manager reading "nobody has set anything aside" off a failed read would take a fault
    // as reassurance — the one wrong answer this screen must never give.
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
  })
})
