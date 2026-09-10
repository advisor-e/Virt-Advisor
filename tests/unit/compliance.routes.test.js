'use strict'

/**
 * The compliance routes — item 4.83, slice 1.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. A TIER CANNOT REPUBLISH ANOTHER TIER'S ITEM. Mike ruled on 2026-09-10 that a firm may
 *      never edit what a tier above published — *"never edit ours"* — because a firm relying
 *      on an edited version has our name on words we did not write. The screen offers no edit
 *      control, but a screen is not a control: the refusal has to be in the route, and it has
 *      to be checked against the caller's OWN row rather than against the resolved list, which
 *      contains every tier above.
 *
 *   2. `publishedBy` COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. It is the name beside a
 *      compliance statement a firm relies on. A body-supplied publisher would let anyone with
 *      the route sign somebody else's name to it, and the screen would look perfectly normal.
 *
 *   3. THE SCOPE COMES FROM THE VERIFIED TOKEN TOO. No handler reads a scope from a body or a
 *      query, so one firm can never read or write another's compliance material —
 *      `tier-cascade.md` P6. A leak here is silent by construction.
 *
 * Written the way the sibling route guards are — each fails if the protection it names is
 * removed, rather than passing on the shape of the response alone.
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL, and so
// a save never falls through to the dev JSON file and writes to the repository.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn(),
  listFirmIdsWithConfigKey: jest.fn()
}))

// The firm directory, so the roll-up has firms to report on without a database.
jest.mock('../../server/utils/firmsDirectory', () => ({ listFirms: jest.fn() }))

// The evidence pack rides the document library's storage — MySQL for the row and quota,
// Google Drive for the file. Both mocked: these tests are about the gates around them.
jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))
jest.mock('../../server/services/driveService', () => ({
  uploadFirmDocument: jest.fn(),
  deleteFirmDocument: jest.fn()
}))

// The multipart parse has no bearing on the rules these tests check, so it is short-circuited
// rather than reproduced: the handler is handed the file the request carries. Mocked at the
// MODULE, not spied on the export — the route destructures `formidable` when it loads, so a
// later spy on the module's property would never be seen.
jest.mock('formidable', () => ({
  formidable: () => ({
    parse (req, cb) { cb(null, {}, req._testFile ? { file: req._testFile } : {}) }
  })
}))

const fs = require('fs')
const os = require('os')
const path = require('path')
const overlay = require('../../server/utils/firmOverlay')
const db = require('../../server/utils/db')
const drive = require('../../server/services/driveService')
const firmsDirectory = require('../../server/utils/firmsDirectory')
const routes = require('../../server/routes/compliance')
const {
  CONFIG_KEY,
  DECLARATION_KEY,
  DECLARATION_WORDING,
  MAX_BODY
} = require('../../server/utils/compliance')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-test-123'
const MANAGER = 'manager@example.com'

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
  return Object.assign({ firmId: FIRM, userEmail: MANAGER, query: {}, body: {} }, over || {})
}

function item (over) {
  return Object.assign({
    title: 'Meeting consent wording',
    summary: 'The spoken line and the two-step screen',
    body: 'The wording itself.',
    version: 1,
    publishedAt: '2026-09-01T00:00:00.000Z',
    publishedBy: 'mentor@example.com'
  }, over || {})
}

/** A valid stored declaration — a date AND a signer, because both are required. */
function declaration (over) {
  return Object.assign({
    declaredAt: '2026-09-05T00:00:00.000Z',
    declaredBy: MANAGER,
    wording: DECLARATION_WORDING,
    against: []
  }, over || {})
}

/** Point the mocked store at a `{ scopeId: { configKey: value } }` map. */
function store (byScope) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) => {
    const forScope = byScope[scopeId]
    return Promise.resolve((forScope && forScope[key]) || null)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(1)
  db.execute.mockResolvedValue([[]])
  drive.uploadFirmDocument.mockResolvedValue({ id: 'drive-1', name: 'opinion.pdf' })
  drive.deleteFirmDocument.mockResolvedValue(undefined)
  store({})
})

// ── Reading ───────────────────────────────────────────────────────────────────

describe('GET /api/firm-manager/compliance', () => {
  test('returns what was published to this scope, with the tier that published each', async () => {
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.items).toHaveLength(1)
    expect(res._body.items[0].originTier).toBe('mentor')
    expect(res._body.items[0].isOwn).toBe(false)
  })

  test('🔴 the scope read is the token\'s, never a query parameter', async () => {
    // See this file's header, point 3. A handler that honoured `?firmId=` would read another
    // firm's compliance material and look entirely normal doing it.
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.getForManager(makeReq({ query: { firmId: 'firm-somebody-else' } }), res)

    expect(overlay.loadFirmConfig).not.toHaveBeenCalledWith('firm-somebody-else', expect.anything())
    expect(res._body.items[0].isOwn).toBe(true)
  })

  test('with no declaration recorded, everything published to you counts as new', async () => {
    // Nothing writes the declaration until slice 3, so this is today's live behaviour.
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._body.declaredAt).toBeNull()
    expect(res._body.newCount).toBe(1)
  })

  test('a declaration later than the publication clears the count', async () => {
    store({
      [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } },
      [FIRM]: { [DECLARATION_KEY]: declaration({ declaredAt: '2026-09-05T00:00:00.000Z' }) }
    })

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._body.newCount).toBe(0)
  })

  test('🔴 a declaration with nobody\'s name on it is not a declaration', async () => {
    // It would otherwise clear the dot and — through `meetingReviewOpen` — open the recorder
    // on a record naming nobody. The gate's whole value is that somebody put their name to it.
    store({
      [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } },
      [FIRM]: { [DECLARATION_KEY]: { declaredAt: '2026-09-05T00:00:00.000Z' } }
    })

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._body.declaration).toBeNull()
    expect(res._body.newCount).toBe(1)
  })

  test('the field limits travel with the answer, so no screen holds a second copy', async () => {
    const res = makeRes()
    await routes.getForManager(makeReq(), res)
    expect(res._body.limits.body).toBe(MAX_BODY)
  })

  test('a database failure is a safe error, never a stack trace', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('ER_NO_SUCH_TABLE')
    err.sqlState = '42S02'
    overlay.loadFirmConfig.mockRejectedValue(err)

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
    expect(JSON.stringify(errorBody(res))).not.toContain('ER_NO_SUCH_TABLE')
    console.error.mockRestore()
  })
})

// ── Publishing ────────────────────────────────────────────────────────────────

describe('POST /api/firm-manager/compliance', () => {
  test('publishes a new item as version 1 on this scope\'s own row', async () => {
    const res = makeRes()
    await routes.publish(makeReq({
      body: { title: 'Recording law — Australia', body: 'What it says.' }
    }), res)

    expect(res._status).toBe(200)
    const [scopeId, key, written] = overlay.saveFirmConfig.mock.calls[0]
    expect(scopeId).toBe(FIRM)
    expect(key).toBe(CONFIG_KEY)
    expect(written['ci-1'].version).toBe(1)
  })

  test('🔴 publishedBy comes from the token and a body cannot override it', async () => {
    // See this file's header, point 2.
    const res = makeRes()
    await routes.publish(makeReq({
      body: {
        title: 'Recording law — Australia',
        body: 'What it says.',
        publishedBy: 'somebody.else@example.com'
      }
    }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written['ci-1'].publishedBy).toBe(MANAGER)
  })

  test('🔴 an id belonging to a tier ABOVE is refused, not quietly adopted', async () => {
    // See this file's header, point 1. The mentor holds `ci-1`; this firm holds nothing. A
    // route checking the RESOLVED list instead of the caller's own row would accept this and
    // hand the firm its own edited copy of the mentor's material.
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.publish(makeReq({
      body: { id: 'ci-1', title: 'Our version', body: 'Reworded.' }
    }), res)

    expect(res._status).toBe(404)
    expect(errorBody(res).error.code).toBe('NOT_YOURS')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('republishing an item this scope DOES own bumps the version', async () => {
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item({ version: 2 }) } } })

    const res = makeRes()
    await routes.publish(makeReq({
      body: { id: 'ci-1', title: 'Meeting consent wording', body: 'Version three of it.' }
    }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written['ci-1'].version).toBe(3)
  })

  test('republishing resets publishedAt, so the tiers beneath are told again', async () => {
    // Not a side effect: an item worth republishing is an item worth re-reading, and the dot
    // returning is the notification working as Mike ruled it.
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.publish(makeReq({ body: { id: 'ci-1', title: 'Same name', body: 'New text.' } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(Date.parse(written['ci-1'].publishedAt))
      .toBeGreaterThan(Date.parse(item().publishedAt))
  })

  test('publishing does not disturb the other items on the row', async () => {
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item(), 'ci-2': item({ title: 'Second' }) } } })

    const res = makeRes()
    await routes.publish(makeReq({ body: { title: 'Third', body: 'Text.' } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(Object.keys(written).sort()).toEqual(['ci-1', 'ci-2', 'ci-3'])
  })

  test.each([
    ['no title', { body: 'Text.' }, 'MISSING_TITLE'],
    ['no material', { title: 'A name' }, 'MISSING_BODY'],
    ['blank material', { title: 'A name', body: '   ' }, 'MISSING_BODY']
  ])('refuses a publish with %s', async (_label, body, code) => {
    const res = makeRes()
    await routes.publish(makeReq({ body }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe(code)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('material past the cap is refused rather than silently docked', async () => {
    const res = makeRes()
    await routes.publish(makeReq({
      body: { title: 'A name', body: 'x'.repeat(MAX_BODY + 1) }
    }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('BODY_TOO_LONG')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a save failure is a safe error, never a stack trace', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('ER_LOCK_WAIT_TIMEOUT at line 42')
    err.sqlState = 'HY000'
    overlay.saveFirmConfig.mockRejectedValue(err)

    const res = makeRes()
    await routes.publish(makeReq({ body: { title: 'A name', body: 'Text.' } }), res)

    expect(res._status).toBe(500)
    expect(JSON.stringify(errorBody(res))).not.toContain('ER_LOCK_WAIT_TIMEOUT')
    console.error.mockRestore()
  })
})

// ── The declaration, and the gate it opens ────────────────────────────────────

describe('POST /api/firm-manager/compliance/declaration', () => {
  test('🔴 refuses to record a declaration nobody ticked', async () => {
    // The tick IS the gate (Mike, 2026-09-10). A screen that could record one without it
    // would put an unmade declaration behind the thing that opens a client recording.
    const res = makeRes()
    await routes.declare(makeReq({ body: {} }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NOT_CONFIRMED')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test.each([[false], ['true'], [1], [null]])('refuses confirmed: %p', async (confirmed) => {
    // Only a real `true`. A truthy string arriving from a form would otherwise sign it.
    const res = makeRes()
    await routes.declare(makeReq({ body: { confirmed } }), res)

    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('records the signer from the token, and a body cannot override it', async () => {
    const res = makeRes()
    await routes.declare(makeReq({
      body: { confirmed: true, declaredBy: 'somebody.else@example.com' }
    }), res)

    expect(res._status).toBe(200)
    const [scopeId, key, written] = overlay.saveFirmConfig.mock.calls[0]
    expect(scopeId).toBe(FIRM)
    expect(key).toBe(DECLARATION_KEY)
    expect(written.declaredBy).toBe(MANAGER)
  })

  test('🔴 stores the WORDS the signer saw, not just a date and a name', async () => {
    // A record naming only a date and a person is a record of a click. If the wording is ever
    // changed, older records must still show what their signer actually agreed to.
    const res = makeRes()
    await routes.declare(makeReq({ body: { confirmed: true } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.wording).toBe(DECLARATION_WORDING)
  })

  test('stores what was published to them, with each item\'s version', async () => {
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item({ version: 3 }) } } })

    const res = makeRes()
    await routes.declare(makeReq({ body: { confirmed: true } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.against).toHaveLength(1)
    expect(written.against[0].version).toBe(3)
  })

  test('a scope\'s OWN publications are not part of what it declares against', async () => {
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.declare(makeReq({ body: { confirmed: true } }), res)

    expect(overlay.saveFirmConfig.mock.calls[0][2].against).toHaveLength(0)
  })

  test('declaring clears the count', async () => {
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.declare(makeReq({ body: { confirmed: true } }), res)

    expect(res._body.newCount).toBe(0)
  })

  test('a token carrying no user cannot sign', async () => {
    const res = makeRes()
    await routes.declare(makeReq({ body: { confirmed: true }, userEmail: '' }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NO_SIGNER')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('the gate on starting a recording', () => {
  /** A next() that records whether it was called. */
  function spyNext () {
    const fn = jest.fn()
    return fn
  }

  /**
   * Call the gate and wait for it to finish.
   *
   * 🔴 THE GATE IS DELIBERATELY NOT AN `async` FUNCTION and must never become one: Restify
   * refuses to MOUNT a handler that is both async and takes `next`, and refusing at mount
   * means the whole server exits on boot rather than one route failing. It shipped that way
   * on 2026-09-10 and took the backend down; `server/routes/compliance.js` carries the note.
   *
   * So it cannot be awaited, and a test that called it and asserted immediately would be
   * asserting before the read came back. Flushing the queue here is what awaiting used to
   * do — every assertion below is unchanged.
   */
  async function callGate (req, res, next) {
    routes.requireDeclaration(req, res, next)
    await new Promise(resolve => setImmediate(resolve))
  }

  test('🔴 a firm that has not declared cannot start a recording', async () => {
    // Mike's ruling of 2026-09-10 in one assertion. The screen shows a locked state, but a
    // screen is not a control — this is the control.
    const res = makeRes()
    const next = spyNext()
    await callGate(makeReq(), res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(errorBody(res).error.code).toBe('NOT_DECLARED')
  })

  test('a firm that HAS declared passes through', async () => {
    store({ [FIRM]: { [DECLARATION_KEY]: declaration() } })

    const res = makeRes()
    const next = spyNext()
    await callGate(makeReq(), res, next)

    expect(next).toHaveBeenCalled()
    expect(res._status).toBeNull()
  })

  test('🔴 an EMPTY EVIDENCE PACK does not close the gate', async () => {
    // The distinction the whole design rests on: the declaration gates, nothing else does.
    // This firm holds no documents at all and records perfectly well.
    store({ [FIRM]: { [DECLARATION_KEY]: declaration() } })

    const res = makeRes()
    const next = spyNext()
    await callGate(makeReq(), res, next)

    expect(next).toHaveBeenCalled()
  })

  test('🔴 a NEWER PUBLICATION does not close the gate', async () => {
    // A published update notifies with a dot and suspends nothing — his ruling. Only the
    // FIRST declaration blocks; a firm declared in September keeps recording in October.
    store({
      [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item({ publishedAt: '2026-12-01T00:00:00Z' }) } },
      [FIRM]: { [DECLARATION_KEY]: declaration() }
    })

    const res = makeRes()
    const next = spyNext()
    await callGate(makeReq(), res, next)

    expect(next).toHaveBeenCalled()
  })

  test('🔴 a storage failure REFUSES rather than letting a recording through', async () => {
    // The one place in this app where a failed read must not degrade to the permissive
    // answer: here the permissive answer is "record a client meeting".
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('ER_NO_SUCH_TABLE')
    err.sqlState = '42S02'
    overlay.loadFirmConfig.mockRejectedValue(err)

    const res = makeRes()
    const next = spyNext()
    await callGate(makeReq(), res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    console.error.mockRestore()
  })

  test('the gate READ answers the advisor\'s page, and fails closed too', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('ER_NO_SUCH_TABLE')
    err.sqlState = '42S02'
    overlay.loadFirmConfig.mockRejectedValue(err)

    const res = makeRes()
    await routes.gate(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.open).toBe(false)
    console.error.mockRestore()
  })

  test('the gate read reports open once the firm has declared', async () => {
    store({ [FIRM]: { [DECLARATION_KEY]: declaration() } })

    const res = makeRes()
    await routes.gate(makeReq(), res)

    expect(res._body.open).toBe(true)
  })
})

// ── Who has declared ──────────────────────────────────────────────────────────

describe('GET /api/firm-manager/compliance/firms', () => {
  const MENTOR_REQ = { firmId: PLATFORM_SCOPE, userEmail: MANAGER, query: {}, body: {} }

  beforeEach(() => {
    firmsDirectory.listFirms.mockResolvedValue([
      { id: 'firm-apex', name: 'Apex Auto & Engineering' },
      { id: 'firm-dunmore', name: 'Dunmore Partners' }
    ])
    overlay.listFirmIdsWithConfigKey.mockResolvedValue([])
  })

  test('reports a firm that has never declared as not active', async () => {
    const res = makeRes()
    await routes.listFirmsStatus(MENTOR_REQ, res)

    expect(res._body.firms).toHaveLength(2)
    expect(res._body.firms.every(f => f.active === false)).toBe(true)
    expect(res._body.firms[0].declaredAt).toBeNull()
  })

  test('reports a firm that HAS declared as active, with who and when', async () => {
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['firm-apex'])
    store({ 'firm-apex': { [DECLARATION_KEY]: declaration() } })

    const res = makeRes()
    await routes.listFirmsStatus(MENTOR_REQ, res)

    const apex = res._body.firms.find(f => f.id === 'firm-apex')
    expect(apex.active).toBe(true)
    expect(apex.declaredBy).toBe(MANAGER)
  })

  test('🔴 returns no document of any kind — only how many are held', async () => {
    // A firm's legal opinion is the firm's. This roll-up must never carry one, and the
    // shape is asserted rather than trusted: a later addition of a `documents` array here
    // would put every firm's papers in front of the platform owner.
    db.execute.mockResolvedValue([[{ firm_id: 'firm-apex', held: 3 }]])

    const res = makeRes()
    await routes.listFirmsStatus(MENTOR_REQ, res)

    const apex = res._body.firms.find(f => f.id === 'firm-apex')
    expect(apex.documentsHeld).toBe(3)
    expect(Object.keys(apex).sort()).toEqual(
      ['active', 'declaredAt', 'declaredBy', 'documentsHeld', 'id', 'name']
    )
  })

  test('🔴 a firm reports as not active only because of the declaration', async () => {
    // The distinction the design rests on, from the roll-up's side: a firm holding three
    // documents and no declaration is closed; a firm holding none and a declaration is open.
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['firm-dunmore'])
    store({ 'firm-dunmore': { [DECLARATION_KEY]: declaration() } })
    db.execute.mockResolvedValue([[{ firm_id: 'firm-apex', held: 3 }]])

    const res = makeRes()
    await routes.listFirmsStatus(MENTOR_REQ, res)

    const apex = res._body.firms.find(f => f.id === 'firm-apex')
    const dunmore = res._body.firms.find(f => f.id === 'firm-dunmore')
    expect(apex.documentsHeld).toBe(3)
    expect(apex.active).toBe(false)
    expect(dunmore.documentsHeld).toBe(0)
    expect(dunmore.active).toBe(true)
  })

  test('a firm never asks the store about a firm that has not declared', async () => {
    // One query says who has declared at all; only those firms are then read. Without it
    // this is one read per firm on every page load.
    const res = makeRes()
    await routes.listFirmsStatus(MENTOR_REQ, res)

    expect(res._status).toBe(200)
    expect(overlay.loadFirmConfig).not.toHaveBeenCalledWith('firm-apex', DECLARATION_KEY)
  })

  test('a scope with no firms beneath it gets an empty list, not an error', async () => {
    // Which firms a middle tier can see depends on membership data Advisor-e supplies. Until
    // it arrives a middle tier sees none — the safe direction, and not a failure.
    const res = makeRes()
    await routes.listFirmsStatus(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.firms).toEqual([])
  })
})

// ── The firm's own evidence pack ──────────────────────────────────────────────

describe('the evidence pack', () => {
  /**
   * A request carrying one uploaded file. formidable is not mocked — the handler is handed a
   * request it can parse only through the shim below, so the file is a REAL temp file and
   * `fs.readFileSync` in the handler is exercised rather than stubbed.
   */
  function uploadReq (size) {
    const filepath = path.join(os.tmpdir(), `compliance-test-${Date.now()}.pdf`)
    fs.writeFileSync(filepath, 'a fake pdf')
    return makeReq({
      _testFile: {
        filepath,
        originalFilename: 'opinion.pdf',
        mimetype: 'application/pdf',
        size: size === undefined ? 1024 : size
      }
    })
  }

  test('lists only THIS firm\'s compliance documents', async () => {
    db.execute.mockResolvedValue([[{
      drive_file_id: 'drive-1',
      file_name: 'opinion.pdf',
      size_bytes: 2048,
      uploaded_by: MANAGER,
      created_at: '2026-09-08T00:00:00.000Z'
    }]])

    const res = makeRes()
    await routes.listEvidence(makeReq(), res)

    const [, params] = db.execute.mock.calls[0]
    expect(params[0]).toBe(FIRM)
    expect(params[1]).toBe(routes.EVIDENCE_CATEGORY)
    expect(res._body.documents[0].addedBy).toBe(MANAGER)
  })

  test('an upload with no file is refused', async () => {
    const res = makeRes()
    await routes.uploadEvidence(makeReq(), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NO_FILE')
    expect(drive.uploadFirmDocument).not.toHaveBeenCalled()
  })

  test('stores the file and a row naming who added it', async () => {
    const res = makeRes()
    await routes.uploadEvidence(uploadReq(), res)

    expect(res._status).toBe(200)
    expect(drive.uploadFirmDocument).toHaveBeenCalled()
    const insert = db.execute.mock.calls.find(c => /INSERT INTO firm_documents/.test(c[0]))
    expect(insert[1][0]).toBe(FIRM)
    expect(insert[1][1]).toBe(routes.EVIDENCE_CATEGORY)
    expect(insert[1][6]).toBe(MANAGER)
  })

  test('an upload past the firm\'s storage quota is refused before Drive is touched', async () => {
    db.execute.mockResolvedValue([[{ bytes_used: 500 * 1024 * 1024 }]])

    const res = makeRes()
    await routes.uploadEvidence(uploadReq(), res)

    expect(res._status).toBe(413)
    expect(errorBody(res).error.code).toBe('QUOTA_EXCEEDED')
    expect(drive.uploadFirmDocument).not.toHaveBeenCalled()
  })

  test('🔴 a storage failure is NOT reported as stored', async () => {
    // The evidence pack is the evidence half of the all-care basis. A document a firm
    // believes it lodged and which is not there is worse than an upload that plainly failed,
    // so there is deliberately no dev-file fallback on this write.
    jest.spyOn(console, 'error').mockImplementation(() => {})
    drive.uploadFirmDocument.mockRejectedValue(new Error('drive unavailable'))

    const res = makeRes()
    await routes.uploadEvidence(uploadReq(), res)

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('UPLOAD_ERROR')
  })

  test('🔴 a file id belonging to ANOTHER firm is not found, and is never deleted', async () => {
    // The cross-firm gate. The row lookup is scoped to req.firmId, so a guessed or leaked
    // id reads as absent — Drive is never asked, and no row is removed.
    db.execute.mockResolvedValue([[]])

    const res = makeRes()
    await routes.deleteEvidence(makeReq({ params: { fileId: 'drive-someone-else' } }), res)

    expect(res._status).toBe(404)
    expect(drive.deleteFirmDocument).not.toHaveBeenCalled()
  })

  test('a firm may remove its OWN document — the other half of the hide ruling', async () => {
    // A firm cannot hide what a tier above published; its own uploads stay its own.
    db.execute.mockResolvedValue([[{ size_bytes: 2048 }]])

    const res = makeRes()
    await routes.deleteEvidence(makeReq({ params: { fileId: 'drive-1' } }), res)

    expect(res._status).toBe(200)
    expect(drive.deleteFirmDocument).toHaveBeenCalledWith('drive-1')
  })
})

// ── History and restore ───────────────────────────────────────────────────────

describe('history and restore', () => {
  test('history reads this scope\'s own set and no other', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 3, version: 2 }])

    const res = makeRes()
    await routes.history(makeReq(), res)

    expect(overlay.getVersionHistory).toHaveBeenCalledWith(FIRM, CONFIG_KEY)
    expect(res._body.history).toHaveLength(1)
  })

  test('🔴 restore is confined to this scope\'s own row', async () => {
    // A tier has never held a version of the tier above it, so there is nothing there to
    // restore — but the scope is asserted rather than assumed, because a restore that took a
    // scope from the body would reach one.
    overlay.restoreVersion.mockResolvedValue(4)

    const res = makeRes()
    await routes.restore(makeReq({ body: { versionId: 3, firmId: 'firm-somebody-else' } }), res)

    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, CONFIG_KEY, 3)
    expect(res._status).toBe(200)
  })

  test('restore without a version is refused', async () => {
    const res = makeRes()
    await routes.restore(makeReq({ body: {} }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('MISSING_VERSION')
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })
})
