'use strict'

/**
 * The country-schedule routes — item 4.92, slice 3.
 *
 * 🔴 THE FOUR THAT MATTER, and not one of them is visible to a person in UAT:
 *
 *   1. LOADING AND DECIDING ARE THE GLOBAL GROUP MANAGER'S ALONE — Mike, 2026-09-11. `fmGuard`
 *      lets ANY manager through the door, so the tier check lives in the handler. A schedule
 *      reaches every firm in the group, so a firm manager loading one would change what every
 *      other firm's picker offers, and every screen would look perfectly normal.
 *
 *   2. `approvedBy` COMES FROM THE VERIFIED TOKEN, NEVER THE BODY, and the proposal goes through
 *      the approved store's own checker on the way in. A body-supplied approver would let
 *      anyone sign somebody else's name to a tax table.
 *
 *   3. THE SCHEDULE ALLOWANCE IS SPENT, NEVER THE FIRM'S TWENTY DOCUMENTS — his ruling the same
 *      day. Spending the wrong counter would stop advisors loading their own documents for a
 *      reason nobody could see, and the first symptom would be a support call.
 *
 *   4. A FIRM SEARCHES ITS OWN CHAIN'S SCHEDULE AND NEVER ANOTHER GROUP'S. The search resolves
 *      from the caller's verified scope; a body- or query-supplied scope would be a cross-group
 *      read that returns a perfectly plausible table.
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL, and so a
// save never falls through to the dev JSON file and writes into the repository.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn()
}))

// formidable parses the multipart body of an upload. Mocked so a test can hand the route a body
// without building one over a socket; the file it names is a real temporary file, so the
// route's own PDF check, its read and its cleanup all run for real.
jest.mock('formidable', () => ({ formidable: jest.fn() }))

const os = require('os')
const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../../server/utils/firmOverlay')
const reader = require('../../server/utils/countryScheduleRead')
const budget = require('../../server/utils/aiLoadBudget')
const schedules = require('../../server/utils/countrySchedules')
const proposals = require('../../server/utils/countryScheduleProposals')
const routes = require('../../server/routes/countrySchedules')
const { setFirmMembership, globalScopeId } = require('../../server/utils/tierChain')

const GROUP = globalScopeId('Advisor-e')
const FIRM = 'firm-test-123'
const MANAGER = 'manager@advisor-e.com'

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

/** `sendError` writes a JSON STRING through writeHead/end, so it must be parsed. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function makeReq (over) {
  return Object.assign({ firmId: GROUP, userEmail: MANAGER, query: {}, body: {} }, over || {})
}

/** One published class, in the store's own shape. */
function aClass (over) {
  return Object.assign({
    label: 'Tractors (wheeled)',
    method: 'dv',
    dvRate: 0.13,
    slRate: 0.085,
    lifeYears: 15.5,
    source: { document: 'IR265', page: '9', published: '2023-10' }
  }, over || {})
}

/** A finished reading, as the reader hands one back. */
function aReading (over) {
  return Object.assign({
    country: 'NZ',
    document: 'IR265 — General depreciation rates',
    published: '2023-10',
    totalPages: 52,
    firstYearRuleFound: false,
    pagesRead: [{ from: 1, to: 8 }],
    pagesUnread: [],
    classes: [aClass()],
    unresolved: [],
    refusedRows: 0,
    outOfRange: 0,
    passesPlanned: 7
  }, over || {})
}

/** An approved schedule, as the store holds one. */
function approved (over) {
  return Object.assign({
    country: 'NZ',
    document: 'IR265',
    published: '2023-10',
    approvedBy: MANAGER,
    approvedAt: '2026-09-11T02:00:00.000Z',
    pagesRead: [{ from: 1, to: 52 }],
    pagesUnread: [],
    classes: [aClass()],
    unresolved: []
  }, over || {})
}

/** A pending read waiting for a manager. */
function pendingRead (over) {
  const started = proposals.startedRecord({ filename: 'ir265.pdf', country: 'NZ', loadedBy: MANAGER })
  return Object.assign(proposals.withResult(started, aReading(), null), over || {})
}

/** Fakes the multipart body of an upload, and returns the temporary file's path. */
function uploadOf (content, fields) {
  const filepath = path.join(os.tmpdir(), 'cs-test-' + Math.random().toString(16).slice(2) + '.pdf')
  fs.writeFileSync(filepath, content)
  formidable.mockReturnValue({
    parse (req, cb) {
      cb(null, fields || { country: 'NZ' }, { file: { filepath, originalFilename: 'ir265.pdf' } })
    }
  })
  return filepath
}

/** What one config key holds, for this scope. */
function holds (map) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
    Promise.resolve(map[key] === undefined ? null : map[key]))
}

let quiet

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.loadFirmConfigsByPrefix.mockResolvedValue({})
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  setFirmMembership({})
  quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  quiet.mockRestore()
  reader._setClientFactory(null)
})

// ─────────────────────────────────────────────────────────────────────────────
describe('who may load a country schedule', () => {
  test('a firm manager is REFUSED, though fmGuard let them through the door', async () => {
    // The check is the route's, not the screen's. A schedule loaded here would change what
    // every other firm in the group is offered in its class picker.
    const res = makeRes()
    await routes.loadSchedule(makeReq({ firmId: FIRM }), res)
    expect(res._status).toBe(403)
    expect(errorBody(res).error.code).toBe('NOT_PERMITTED')
  })

  test('a firm manager cannot approve or reject one either', async () => {
    const a = makeRes()
    await routes.approveSchedule(makeReq({ firmId: FIRM, body: { country: 'NZ' } }), a)
    expect(a._status).toBe(403)

    const r = makeRes()
    await routes.rejectSchedule(makeReq({ firmId: FIRM, body: { country: 'NZ' } }), r)
    expect(r._status).toBe(403)
  })

  test('a refused caller never reaches the upload, so no allowance is spent', async () => {
    const spend = jest.spyOn(budget, 'consumeScheduleLoad')
    const res = makeRes()
    await routes.loadSchedule(makeReq({ firmId: FIRM }), res)
    expect(spend).not.toHaveBeenCalled()
    expect(formidable).not.toHaveBeenCalled()
    spend.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('loading a schedule', () => {
  test('answers 202 straight away and does not wait for the read', async () => {
    // One schedule is a survey plus a request per eight pages. A page-render response has
    // 2000 ms; this cannot be one.
    uploadOf('%PDF-1.4 hello')
    reader._setClientFactory(() => ({
      responses: { create: () => new Promise(() => {}) } // never settles
    }))

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(202)
    expect(res._body.started).toBe(true)
    expect(res._body.read.status).toBe('reading')
  })

  test('spends the SCHEDULE allowance and never the firm document allowance', async () => {
    uploadOf('%PDF-1.4 hello')
    reader._setClientFactory(() => ({ responses: { create: () => new Promise(() => {}) } }))
    const schedule = jest.spyOn(budget, 'consumeScheduleLoad')
    const document = jest.spyOn(budget, 'consume')

    await routes.loadSchedule(makeReq(), makeRes())

    expect(schedule).toHaveBeenCalledWith(GROUP, MANAGER)
    expect(document).not.toHaveBeenCalled()
    schedule.mockRestore()
    document.mockRestore()
  })

  test('a refusal at the allowance costs nothing — the model is never called', async () => {
    uploadOf('%PDF-1.4 hello')
    let called = false
    reader._setClientFactory(() => ({ responses: { create: () => { called = true } } }))
    const spend = jest.spyOn(budget, 'consumeScheduleLoad').mockResolvedValue({
      ok: false, status: 429, code: 'SCHEDULE_LOAD_LIMIT', message: 'no more today'
    })

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(429)
    expect(called).toBe(false)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    spend.mockRestore()
  })

  test('a file that is not a PDF is refused before a byte leaves the building', async () => {
    // The declared MIME type comes from the browser and is not believed.
    uploadOf('GIF89a not a pdf at all')
    const spend = jest.spyOn(budget, 'consumeScheduleLoad')

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NOT_A_PDF')
    expect(spend).not.toHaveBeenCalled()
    spend.mockRestore()
  })

  test('the temporary copy of the upload is always deleted', async () => {
    const filepath = uploadOf('GIF89a not a pdf')
    await routes.loadSchedule(makeReq(), makeRes())
    expect(fs.existsSync(filepath)).toBe(false)
  })

  test('a country that is not a code is refused, and costs nothing', async () => {
    uploadOf('%PDF-1.4 hello', { country: 'New Zealand' })
    const spend = jest.spyOn(budget, 'consumeScheduleLoad')
    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)
    expect(errorBody(res).error.code).toBe('INVALID_COUNTRY')
    expect(spend).not.toHaveBeenCalled()
    spend.mockRestore()
  })

  test('a missing file, and a body that will not parse, are refused rather than thrown', async () => {
    formidable.mockReturnValue({ parse (req, cb) { cb(null, { country: 'NZ' }, {}) } })
    const a = makeRes()
    await routes.loadSchedule(makeReq(), a)
    expect(errorBody(a).error.code).toBe('NO_FILE')

    formidable.mockReturnValue({ parse (req, cb) { cb(new Error('maxFileSize exceeded')) } })
    const b = makeRes()
    await routes.loadSchedule(makeReq(), b)
    expect(errorBody(b).error.code).toBe('UPLOAD_FAILED')
  })

  test('a second read of the same country while one is running is refused', async () => {
    // Two racing reads would each finish by writing a whole schedule over the other's, and the
    // loser would have been paid for.
    uploadOf('%PDF-1.4 hello')
    holds({ [proposals.configKeyFor('NZ')]: proposals.startedRecord({ filename: 'x.pdf', country: 'NZ', loadedBy: MANAGER }) })
    const spend = jest.spyOn(budget, 'consumeScheduleLoad')

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(409)
    expect(errorBody(res).error.code).toBe('ALREADY_READING')
    expect(spend).not.toHaveBeenCalled()
    spend.mockRestore()
  })

  test('a read whose process died does NOT block a new one', async () => {
    uploadOf('%PDF-1.4 hello')
    const dead = proposals.startedRecord({ filename: 'x.pdf', country: 'NZ', loadedBy: MANAGER })
    dead.updatedAt = new Date(Date.now() - proposals.STALE_AFTER_MS - 1000).toISOString()
    holds({ [proposals.configKeyFor('NZ')]: dead })
    reader._setClientFactory(() => ({ responses: { create: () => new Promise(() => {}) } }))

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)
    expect(res._status).toBe(202)
  })

  test('a finished read does not block loading a newer edition', async () => {
    uploadOf('%PDF-1.4 hello')
    holds({ [proposals.configKeyFor('NZ')]: pendingRead() })
    reader._setClientFactory(() => ({ responses: { create: () => new Promise(() => {}) } }))

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)
    expect(res._status).toBe(202)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('the read job', () => {
  /** A model client answering each request in turn. */
  function replying (replies) {
    let i = 0
    return () => ({
      responses: {
        create: () => {
          const reply = replies[Math.min(i++, replies.length - 1)]
          return (async function * () {
            yield { type: 'response.completed', response: { output_text: JSON.stringify(reply) } }
          })()
        }
      }
    })
  }

  test('records progress as it goes, and the finished table at the end', async () => {
    reader._setClientFactory(replying([
      {
        readable: true,
        document: { name: 'IR265', published: '2023-10', country: 'NZ' },
        totalPages: 8,
        tableRanges: [{ from: 1, to: 8 }],
        firstYearRuleFound: false
      },
      { readable: true, classes: [{ class: 'Tractors (wheeled)', method: 'dv', dvRate: 0.13, slRate: 0.085, lifeYears: 15.5, page: '1' }], unresolved: [] }
    ]))

    const record = proposals.startedRecord({ filename: 'ir265.pdf', country: 'NZ', loadedBy: MANAGER })
    await routes._runRead({
      scopeId: GROUP,
      userEmail: MANAGER,
      key: proposals.configKeyFor('NZ'),
      record,
      country: 'NZ',
      filename: 'ir265.pdf',
      buffer: Buffer.from('%PDF-1.4')
    })

    const writes = overlay.saveFirmConfig.mock.calls
    expect(writes.length).toBeGreaterThan(1)
    const last = writes[writes.length - 1][2]
    expect(last.status).toBe('pending')
    expect(last.reading.classes).toHaveLength(1)
  })

  test('a read that produces nothing is recorded as failed, never as approvable', async () => {
    // Item 4.91: a document opened, named and dated, proposing nothing at all.
    reader._setClientFactory(replying([
      {
        readable: true,
        document: { name: 'IR265', published: '2023-10', country: 'NZ' },
        totalPages: 8,
        tableRanges: [{ from: 1, to: 8 }],
        firstYearRuleFound: false
      },
      { readable: true, classes: [], unresolved: [] }
    ]))

    await routes._runRead({
      scopeId: GROUP,
      userEmail: MANAGER,
      key: proposals.configKeyFor('NZ'),
      record: proposals.startedRecord({ filename: 'ir265.pdf', country: 'NZ', loadedBy: MANAGER }),
      country: 'NZ',
      filename: 'ir265.pdf',
      buffer: Buffer.from('%PDF-1.4')
    })

    const writes = overlay.saveFirmConfig.mock.calls
    const last = writes[writes.length - 1][2]
    expect(last.status).toBe('failed')
    expect(last.error.code).toBe('NOTHING_READ')
    expect(last.reading).toBeNull()
  })

  test('a fault inside the job is caught, never left to take the process down', async () => {
    const spy = jest.spyOn(reader, 'readSchedule').mockRejectedValue(new Error('boom'))

    await expect(routes._runRead({
      scopeId: GROUP,
      userEmail: MANAGER,
      key: proposals.configKeyFor('NZ'),
      record: proposals.startedRecord({ filename: 'ir265.pdf', country: 'NZ', loadedBy: MANAGER }),
      country: 'NZ',
      filename: 'ir265.pdf',
      buffer: Buffer.from('%PDF-1.4')
    })).resolves.toBeUndefined()

    const last = overlay.saveFirmConfig.mock.calls.slice(-1)[0][2]
    expect(last.status).toBe('failed')
    spy.mockRestore()
  })

  test('a progress write that fails does not lose the read that was paid for', async () => {
    overlay.saveFirmConfig.mockRejectedValue(Object.assign(new Error('refused'), { sqlState: '23000' }))
    const spy = jest.spyOn(reader, 'readSchedule').mockResolvedValue({ ok: true, reading: aReading() })

    await expect(routes._runRead({
      scopeId: GROUP,
      userEmail: MANAGER,
      key: proposals.configKeyFor('NZ'),
      record: proposals.startedRecord({ filename: 'ir265.pdf', country: 'NZ', loadedBy: MANAGER }),
      country: 'NZ',
      filename: 'ir265.pdf',
      buffer: Buffer.from('%PDF-1.4')
    })).resolves.toBeUndefined()

    spy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('approving a schedule', () => {
  test('the approver comes from the VERIFIED token, never from the body', async () => {
    holds({ [proposals.configKeyFor('NZ')]: pendingRead() })

    const res = makeRes()
    await routes.approveSchedule(
      makeReq({ body: { country: 'NZ', approvedBy: 'someone.else@example.com' } }), res
    )

    expect(res._status).toBe(200)
    expect(res._body.schedule.approvedBy).toBe(MANAGER)
    const written = overlay.saveFirmConfig.mock.calls
      .filter(c => c[1] === schedules.configKeyFor('NZ'))[0][2]
    expect(written.approvedBy).toBe(MANAGER)
  })

  test('the table is written before the decision, so a failure between them is visible', async () => {
    holds({ [proposals.configKeyFor('NZ')]: pendingRead() })
    await routes.approveSchedule(makeReq({ body: { country: 'NZ' } }), makeRes())
    const keys = overlay.saveFirmConfig.mock.calls.map(c => c[1])
    expect(keys.indexOf(schedules.configKeyFor('NZ')))
      .toBeLessThan(keys.indexOf(proposals.configKeyFor('NZ')))
  })

  test('a proposal whose classes no longer pass the store\'s checks is refused at the gate', async () => {
    // Rather than silently serving a broken table to every firm in the group afterwards.
    const bad = pendingRead()
    bad.reading = aReading({ classes: [aClass({ dvRate: 13 })] })
    holds({ [proposals.configKeyFor('NZ')]: bad })

    const res = makeRes()
    await routes.approveSchedule(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NOT_APPROVABLE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('the unread page ranges survive approval', async () => {
    // Mike's second ruling: the gap shows wherever the table is used.
    const withGap = pendingRead()
    withGap.reading = aReading({ pagesUnread: [{ from: 41, to: 48 }] })
    holds({ [proposals.configKeyFor('NZ')]: withGap })

    const res = makeRes()
    await routes.approveSchedule(makeReq({ body: { country: 'NZ' } }), res)
    const written = overlay.saveFirmConfig.mock.calls
      .filter(c => c[1] === schedules.configKeyFor('NZ'))[0][2]
    expect(written.pagesUnread).toEqual([{ from: 41, to: 48 }])
    expect(res._body.schedule.unreadNote).toContain('41')
  })

  test('there is nothing to approve when no read is waiting', async () => {
    const res = makeRes()
    await routes.approveSchedule(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(404)
    expect(errorBody(res).error.code).toBe('NO_READ')
  })

  test('a country that is not a code is refused', async () => {
    const res = makeRes()
    await routes.approveSchedule(makeReq({ body: { country: 'Aotearoa' } }), res)
    expect(errorBody(res).error.code).toBe('INVALID_COUNTRY')
  })

  test('a storage failure is reported, never reported as approved', async () => {
    holds({ [proposals.configKeyFor('NZ')]: pendingRead() })
    overlay.saveFirmConfig.mockRejectedValue(Object.assign(new Error('refused'), { sqlState: '23000' }))
    const res = makeRes()
    await routes.approveSchedule(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('rejecting a read', () => {
  test('marks it rejected and leaves any approved table alone', async () => {
    holds({ [proposals.configKeyFor('NZ')]: pendingRead() })
    const res = makeRes()
    await routes.rejectSchedule(makeReq({ body: { country: 'NZ' } }), res)

    expect(res._status).toBe(200)
    const keys = overlay.saveFirmConfig.mock.calls.map(c => c[1])
    expect(keys).toEqual([proposals.configKeyFor('NZ')])
  })

  test('a read still running can be rejected — it is how a dead job is cleared', async () => {
    holds({ [proposals.configKeyFor('NZ')]: proposals.startedRecord({ filename: 'x.pdf', country: 'NZ', loadedBy: MANAGER }) })
    const res = makeRes()
    await routes.rejectSchedule(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
  })

  test('there is nothing to reject when no read exists', async () => {
    const res = makeRes()
    await routes.rejectSchedule(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('listing what this scope holds', () => {
  test('never sends the 2,800 rows to a browser — only the shape', async () => {
    overlay.loadFirmConfigsByPrefix.mockImplementation((scopeId, prefix) =>
      Promise.resolve(prefix === schedules.CONFIG_KEY_PREFIX ? { NZ: approved() } : {}))

    const res = makeRes()
    await routes.listSchedules(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.schedules[0].classes).toBe(1)
    expect(res._body.schedules[0].document).toBe('IR265')
    expect(Array.isArray(res._body.schedules[0].classes)).toBe(false)
  })

  test('a pending read is listed without its proposed table', async () => {
    overlay.loadFirmConfigsByPrefix.mockImplementation((scopeId, prefix) =>
      Promise.resolve(prefix === proposals.CONFIG_KEY_PREFIX ? { NZ: pendingRead() } : {}))

    const res = makeRes()
    await routes.listSchedules(makeReq(), res)
    expect(res._body.reads[0].status).toBe('pending')
    expect(res._body.reads[0].reading).toBeUndefined()
  })

  test('a stored schedule that no longer validates is left out rather than served', async () => {
    overlay.loadFirmConfigsByPrefix.mockImplementation((scopeId, prefix) =>
      Promise.resolve(prefix === schedules.CONFIG_KEY_PREFIX ? { NZ: approved({ approvedBy: '' }) } : {}))

    const res = makeRes()
    await routes.listSchedules(makeReq(), res)
    expect(res._body.schedules).toEqual([])
  })

  test('a firm manager is told they may not load, rather than being refused the list', async () => {
    const res = makeRes()
    await routes.listSchedules(makeReq({ firmId: FIRM }), res)
    expect(res._status).toBe(200)
    expect(res._body.mayLoad).toBe(false)
  })

  test('a storage failure is reported rather than shown as an empty library', async () => {
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(new Error('store down'))
    const res = makeRes()
    await routes.listSchedules(makeReq(), res)
    expect(res._status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('one read in full', () => {
  test('comes back with whether it has gone quiet', async () => {
    holds({ [proposals.configKeyFor('NZ')]: pendingRead() })
    const res = makeRes()
    await routes.getRead(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._body.read.status).toBe('pending')
    expect(res._body.read.stale).toBe(false)
  })

  test('answers null for a country with no read, and refuses a country that is not a code', async () => {
    const a = makeRes()
    await routes.getRead(makeReq({ query: { country: 'NZ' } }), a)
    expect(a._body.read).toBeNull()

    const b = makeRes()
    await routes.getRead(makeReq({ query: { country: 'Aotearoa' } }), b)
    expect(errorBody(b).error.code).toBe('INVALID_COUNTRY')
  })

  test('a record that no longer validates comes back as nothing, never half-served', async () => {
    holds({ [proposals.configKeyFor('NZ')]: { id: '', country: 'NZ' } })
    const res = makeRes()
    await routes.getRead(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._body.read).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('searching a country\'s classes', () => {
  beforeEach(() => setFirmMembership({ [FIRM]: { globalGroup: 'Advisor-e', country: 'NZ' } }))
  afterEach(() => setFirmMembership({}))

  test('a FIRM manager can search the schedule its own group loaded', async () => {
    // The asymmetry is the feature: one person loads, everyone beneath searches. It is held at
    // the GROUP's scope, not the firm's, so the origin the screen shows is the group.
    overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
      Promise.resolve(scopeId === GROUP && key === schedules.configKeyFor('NZ') ? approved() : null))

    const res = makeRes()
    await routes.searchClasses(makeReq({ firmId: FIRM, query: { country: 'NZ', q: 'tractor' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.matches).toHaveLength(1)
    expect(res._body.schedule.originTier).toBe('global_group_manager')
  })

  test('it resolves from the caller\'s own scope, so another group\'s schedule is unreachable', async () => {
    const other = globalScopeId('Someone-else')
    overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
      Promise.resolve(scopeId === other && key === schedules.configKeyFor('NZ') ? approved() : null))

    const res = makeRes()
    await routes.searchClasses(makeReq({ firmId: FIRM, query: { country: 'NZ', q: 'tractor' } }), res)

    expect(res._body.schedule).toBeNull()
    expect(res._body.matches).toEqual([])
    const scopesAsked = overlay.loadFirmConfig.mock.calls.map(c => c[0])
    expect(scopesAsked).not.toContain(other)
  })

  test('ALWAYS carries the unread-pages sentence, so the gap shows where the table is USED', async () => {
    // Mike's second ruling and the condition he attached to it. Without this, "there is no such
    // class" and "those pages were never read" look identical to the person searching.
    holds({ [schedules.configKeyFor('NZ')]: approved({ pagesUnread: [{ from: 41, to: 48 }] }) })

    const res = makeRes()
    await routes.searchClasses(makeReq({ firmId: FIRM, query: { country: 'NZ', q: 'nothing matches this' } }), res)

    expect(res._body.matches).toEqual([])
    expect(res._body.unreadNote).toContain('41')
    expect(res._body.unreadNote).toContain('48')
  })

  test('a country with no schedule is not an error — the firm\'s own documents still work', async () => {
    const res = makeRes()
    await routes.searchClasses(makeReq({ firmId: FIRM, query: { country: 'AU', q: 'truck' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.schedule).toBeNull()
  })

  test('the whole table never leaves the backend', async () => {
    const big = approved({ classes: [] })
    for (let i = 0; i < 400; i++) {
      big.classes.push(aClass({ label: 'Engineering class ' + i, source: { document: 'IR265', page: String(i + 1), published: '2023-10' } }))
    }
    holds({ [schedules.configKeyFor('NZ')]: big })

    const res = makeRes()
    await routes.searchClasses(makeReq({ firmId: FIRM, query: { country: 'NZ', q: 'engineering' } }), res)

    expect(res._body.matches).toHaveLength(routes.SEARCH_LIMIT)
    expect(res._body.total).toBe(400)
    expect(res._body.truncated).toBe(true)
  })

  test('a country that is not a code is refused, and a storage failure is reported', async () => {
    const a = makeRes()
    await routes.searchClasses(makeReq({ firmId: FIRM, query: { country: 'Aotearoa' } }), a)
    expect(errorBody(a).error.code).toBe('INVALID_COUNTRY')

    // 🔴 A store we could not read is NOT a country nobody has loaded. Answering 200 with an
    // empty table would tell a manager their group has no schedule — a false statement about
    // their own work, which would send them to load one that already exists.
    overlay.loadFirmConfig.mockRejectedValue(new Error('store down'))
    const b = makeRes()
    await routes.searchClasses(makeReq({ firmId: FIRM, query: { country: 'NZ' } }), b)
    expect(b._status).toBe(503)
    expect(errorBody(b).error.code).toBe('SCHEDULE_UNAVAILABLE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Storage failures. None of these is visible to a person in UAT: each one either
// reports honestly or, in exactly one case, is allowed to fall back to a dev file.
// Getting them wrong means a manager is told something false about their own work.
// ─────────────────────────────────────────────────────────────────────────────
describe('when the store will not answer', () => {
  /** A failure a live MySQL REFUSED, which never falls back to the dev file. */
  function refused () {
    return Object.assign(new Error('refused'), { sqlState: '23000' })
  }

  test('a load says so rather than starting a read it cannot record', async () => {
    uploadOf('%PDF-1.4 hello')
    overlay.loadFirmConfig.mockRejectedValue(refused())

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
  })

  test('a load whose START cannot be written never reaches the model', async () => {
    // The allowance has already been spent by this point, and that is stated rather than
    // hidden: the manager is told nothing has been read, which is true.
    uploadOf('%PDF-1.4 hello')
    overlay.saveFirmConfig.mockImplementation((scopeId, key) =>
      key === proposals.configKeyFor('NZ') ? Promise.reject(refused()) : Promise.resolve(undefined))
    let called = false
    reader._setClientFactory(() => ({ responses: { create: () => { called = true } } }))

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
    expect(called).toBe(false)
  })

  test('a load is refused when the ALLOWANCE itself cannot be recorded', async () => {
    // The budget fails closed, and it fails BEFORE the record write — so this is the answer a
    // manager gets when the whole store is down, and it is the right one: an unrecordable
    // reading is exactly what the cap exists to stop.
    uploadOf('%PDF-1.4 hello')
    overlay.saveFirmConfig.mockRejectedValue(refused())
    let called = false
    reader._setClientFactory(() => ({ responses: { create: () => { called = true } } }))

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(503)
    expect(errorBody(res).error.code).toBe('BUDGET_UNAVAILABLE')
    expect(called).toBe(false)
  })

  test('an unreadable upload is refused rather than thrown', async () => {
    // formidable names a file that is not there — a disk fault, or a cleanup that ran early.
    formidable.mockReturnValue({
      parse (req, cb) {
        cb(null, { country: 'NZ' }, { file: { filepath: path.join(os.tmpdir(), 'cs-not-here-' + Date.now() + '.pdf') } })
      }
    })

    const res = makeRes()
    await routes.loadSchedule(makeReq(), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('UPLOAD_FAILED')
  })

  test('looking up one read reports the failure rather than saying there is none', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refused())
    const res = makeRes()
    await routes.getRead(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(500)
  })

  test('rejecting reports the failure rather than claiming it was rejected', async () => {
    holds({ [proposals.configKeyFor('NZ')]: pendingRead() })
    overlay.saveFirmConfig.mockRejectedValue(refused())
    const res = makeRes()
    await routes.rejectSchedule(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(500)
  })

  test('a rejected read with no country is refused before the store is touched', async () => {
    const res = makeRes()
    await routes.rejectSchedule(makeReq({ body: {} }), res)
    expect(errorBody(res).error.code).toBe('INVALID_COUNTRY')
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })

  test('on a machine with no MySQL a read simply finds nothing, rather than erroring', async () => {
    // A connection-shaped failure carries no sqlState, so the dev affordance may run. That is
    // deliberate and is what makes the app usable on a developer machine — see dbFailure.js.
    overlay.loadFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const res = makeRes()
    await routes.getRead(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.read).toBeNull()
  })
})
