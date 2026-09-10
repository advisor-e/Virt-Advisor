'use strict'

/**
 * The depreciation-rates routes — item 4.78, slice 2.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. `approvedBy` COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. It is the name that
 *      appears beside a rate on a document a lender reads. A body-supplied approver would
 *      let anyone with the route sign somebody else's name to a tax table, and the screen
 *      would look perfectly normal.
 *
 *   2. APPROVING RATES CANNOT ADOPT A TAX SCHEME, AND ADOPTING ONE CANNOT CHANGE A RATE.
 *      Mike's ruling of 2026-09-09 put them on two buttons; two routes are what make that
 *      true rather than merely drawn. A manager confirming 41 rates has not thereby signed
 *      off a 20% first-year write-off on every qualifying purchase their clients make.
 *
 *   3. A READ NEVER BLOCKS AN ADVISOR. His words, 2026-09-08: "Never block the advisor."
 *      A storage failure degrades to the app's own six rates and a 200, because the
 *      alternative is stopping someone mid-report over a document a manager elsewhere has
 *      not loaded.
 *
 * Written the way the sibling route guards are — each fails if the protection it names is
 * removed, rather than passing on the shape of the response alone.
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL, and
// so a save never falls through to the dev JSON file and writes to the repository.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

// formidable parses the multipart body of an upload. Mocked so a test can hand the route a
// body without building one over a socket; the file it names is a real temporary file, so
// the route's own PDF check, its read and its cleanup all run for real.
jest.mock('formidable', () => ({ formidable: jest.fn() }))

const os = require('os')
const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../../server/utils/firmOverlay')
const extract = require('../../server/utils/depreciationExtract')
const routes = require('../../server/routes/depreciationRates')
const { BASE_DEPRECIATION_RATES } = require('../../server/utils/depreciationRates')
const { setFirmMembership } = require('../../server/utils/tierChain')

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

function entry (over) {
  return Object.assign({
    label: 'Motor vehicles (up to 12 seats)',
    method: 'dv',
    dvRate: 0.5,
    slRate: 0.4,
    lifeYears: 4,
    source: { document: 'IR265', page: '61', published: '2023-10' }
  }, over || {})
}

function boost (over) {
  return Object.assign({
    name: 'Investment Boost',
    rate: 0.2,
    startsOn: '2025-05-22',
    source: { document: 'Inland Revenue — New assets: Investment Boost', published: '2025-05' }
  }, over || {})
}

/** What the store holds for this firm, as the routes would read it back. */
function stored (tables) {
  overlay.loadFirmConfig.mockImplementation(scopeId =>
    Promise.resolve(scopeId === FIRM ? tables : null))
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  setFirmMembership({})
})

describe('reading the rates an advisor works to', () => {
  test('a country nobody has approved gets the app’s six rates, and a 200', async () => {
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    expect(res._body.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
  })

  // 🔴 "Never block the advisor" — Mike, 2026-09-08. A storage failure must not stop someone
  // mid-report, so it degrades rather than erroring.
  test('a storage failure still answers 200 with the defaults', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(
      Object.assign(new Error('refused'), { code: 'ER_NO', sqlState: '23000' })
    )
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    spy.mockRestore()
  })

  test('an absent country is not an error — it resolves to the defaults', async () => {
    const res = makeRes()
    await routes.get(makeReq({ query: {} }), res)
    expect(res._status).toBe(200)
    expect(res._body.country).toBeNull()
  })
})

describe('approving a country’s rates', () => {
  // 🔴 THE FORGERY GUARD. The body's approver is ignored entirely.
  test('approvedBy comes from the verified token, never from the body', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({
      body: { country: 'NZ', categories: { vehicles: entry() }, approvedBy: 'someone.else@example.com' }
    }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.approvedBy).toBe(MANAGER)
    expect(JSON.stringify(written)).not.toContain('someone.else@example.com')
  })

  test('it writes to the caller’s own verified scope, not one named in the body', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({
      body: { country: 'NZ', categories: { vehicles: entry() }, firmId: 'some-other-firm' }
    }), res)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
  })

  test('a rate typed in the wrong unit is refused, and nothing is written', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({
      body: { country: 'NZ', categories: { vehicles: entry({ dvRate: 50 }) } }
    }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_RATES')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a country that is not a two-letter code is refused', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'New Zealand', categories: { vehicles: entry() } } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_COUNTRY')
  })

  test('approving one country leaves another country’s table untouched', async () => {
    stored({
      AU: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'someone@example.com',
        categories: { other: entry({ label: 'Other', source: { document: 'TR 2025/1', published: '2025-07' } }) }
      }
    })
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'NZ', categories: { vehicles: entry() } } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.AU.categories.other).toBeDefined()
    expect(written.NZ.categories.vehicles.dvRate).toBe(0.5)
  })

  // 🔴 RULING OF 2026-09-09, MADE STRUCTURAL. Confirming a rate table cannot adopt a tax
  // scheme, and cannot quietly re-sign one already adopted.
  test('it never adopts a first-year rule, and never re-approves one', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: { other: entry() },
        firstYearRule: Object.assign(boost(), {
          approvedAt: '2026-09-02T00:00:00.000Z',
          approvedBy: 'adopter@example.com'
        })
      }
    })
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'NZ', categories: { vehicles: entry() } } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    // Carried through untouched — same approver, same date.
    expect(written.NZ.firstYearRule.approvedBy).toBe('adopter@example.com')
    expect(written.NZ.firstYearRule.approvedAt).toBe('2026-09-02T00:00:00.000Z')
    // And the rates it was asked to approve did change.
    expect(written.NZ.approvedBy).toBe(MANAGER)
  })

  test('a body carrying no categories at all is refused', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('adopting a country’s first-year rule', () => {
  test('the rule carries its OWN approver, from the verified token', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({
      body: { country: 'NZ', rule: Object.assign(boost(), { approvedBy: 'forged@example.com' }) }
    }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.firstYearRule.approvedBy).toBe(MANAGER)
    expect(JSON.stringify(written)).not.toContain('forged@example.com')
  })

  // The other half of ruling 2026-09-09: the two decisions cannot contaminate each other.
  test('adopting a rule does not disturb rates already approved', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: { vehicles: entry({ dvRate: 0.5 }) }
      }
    })
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: boost() } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.categories.vehicles.dvRate).toBe(0.5)
    expect(written.NZ.approvedBy).toBe('earlier@example.com')
    expect(written.NZ.approvedAt).toBe('2026-09-01T00:00:00.000Z')
  })

  test('a share typed in the wrong unit is refused, and nothing is written', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: boost({ rate: 20 }) } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_RULE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  // Mike's own point of 2026-09-09: a month cannot decide eligibility at the boundary.
  test('a start date given as a month is refused', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: boost({ startsOn: '2025-05' }) } }), res)
    expect(res._status).toBe(400)
  })

  test('withdrawing a rule leaves the rates in place', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: { vehicles: entry() },
        firstYearRule: Object.assign(boost(), {
          approvedAt: '2026-09-02T00:00:00.000Z', approvedBy: 'adopter@example.com'
        })
      }
    })
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: null } }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.firstYearRule).toBeUndefined()
    expect(written.NZ.categories.vehicles).toBeDefined()
  })

  // A table holding only a rule has nothing left to say once the rule goes — leaving an
  // empty table behind would claim on screen to be this scope's own.
  test('withdrawing the only thing a country held removes the country', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: {},
        firstYearRule: Object.assign(boost(), {
          approvedAt: '2026-09-02T00:00:00.000Z', approvedBy: 'adopter@example.com'
        })
      }
    })
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: null } }), res)
    expect(overlay.saveFirmConfig.mock.calls[0][2].NZ).toBeUndefined()
  })

  test('withdrawing where nothing was ever adopted is a 404, not a silent success', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: null } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('what a manager is shown', () => {
  test('it separates what is inherited from what this scope approved itself', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: MANAGER,
        categories: { vehicles: entry({ dvRate: 0.5 }) }
      }
    })
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'NZ' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.hasOwn).toBe(true)
    expect(res._body.own.categories.vehicles.dvRate).toBe(0.5)
    // Nothing above this firm has approved anything, so the layer above is the app's own.
    expect(res._body.inherited.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
    expect(res._body.resolved.categories.vehicles.dvRate).toBe(0.5)
    expect(res._body.countries).toEqual(['NZ'])
  })

  test('a scope that has approved nothing says so rather than inventing a table', async () => {
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._body.hasOwn).toBe(false)
    expect(res._body.own).toBeNull()
    expect(res._body.countries).toEqual([])
  })

  test('with no country asked for, it still lists the countries held', async () => {
    stored({
      NZ: { approvedAt: '2026-09-01T00:00:00.000Z', approvedBy: MANAGER, categories: { vehicles: entry() } },
      AU: { approvedAt: '2026-09-01T00:00:00.000Z', approvedBy: MANAGER, categories: { other: entry() } }
    })
    const res = makeRes()
    await routes.getForManager(makeReq({ query: {} }), res)
    expect(res._body.country).toBeNull()
    expect(res._body.countries).toEqual(['AU', 'NZ'])
  })

  test('a storage refusal surfaces as a 500 rather than an empty screen', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(
      Object.assign(new Error('refused'), { code: 'ER_NO', sqlState: '23000' })
    )
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(500)
    spy.mockRestore()
  })
})

describe('history and restore', () => {
  test('history reads this scope’s own versions', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 7 }])
    const res = makeRes()
    await routes.history(makeReq(), res)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(FIRM, 'depreciation-rates')
    expect(res._body.history).toEqual([{ id: 7 }])
  })

  test('restore without a version is refused', async () => {
    const res = makeRes()
    await routes.restore(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('restore names this scope, never one from the body', async () => {
    overlay.restoreVersion.mockResolvedValue(undefined)
    const res = makeRes()
    await routes.restore(makeReq({ body: { versionId: 4, firmId: 'other-firm', country: 'NZ' } }), res)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, 'depreciation-rates', 4)
    expect(res._body.restored).toBe(true)
  })
})

// ── Slice 3: loading a document, and what the model read out of it ────────────

/**
 * 🔴 THE FOUR THAT MATTER HERE, and not one of them is visible to a person in UAT:
 *
 *   1. A PENDING PROPOSAL CHANGES NO FORECAST. Both stores are live at once in these tests
 *      and the advisor's read still answers the app's defaults. This is SC-002 — "no rate
 *      that has not been approved ever appears in a forecast, including while a proposal is
 *      pending" — and it is the whole reason a proposal is kept in its own store.
 *   2. THE RATES ARE WRITTEN BEFORE THE DOCUMENT IS MARKED. A refused write leaves the
 *      document pending, so nothing can read `approved` beside a table that was never saved.
 *   3. THE COUNTRY COMES FROM THE DOCUMENT, NEVER THE BODY. Otherwise an Australian schedule
 *      could be approved as a New Zealand table in a single request.
 *   4. A FILE THAT IS NOT A PDF IS NEVER SENT ANYWHERE. The browser's own content type is
 *      not believed; the first bytes are.
 */

const PROPOSALS_KEY = 'depreciation-proposals'
const BUDGET_KEY = 'ai-document-loads'

/** What the store holds for this firm, per config key. */
function storedByKey (map) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
    Promise.resolve(scopeId === FIRM ? (map[key] || null) : null))
}

/** The last value written to one config key. */
function savedFor (key) {
  const calls = overlay.saveFirmConfig.mock.calls.filter(c => c[1] === key)
  return calls.length ? calls[calls.length - 1][2] : null
}

/** A real temporary file, and a formidable stub that hands the route its path. */
function uploadOf (content, fields) {
  const filepath = path.join(os.tmpdir(), 'dep-test-' + Math.random().toString(16).slice(2) + '.pdf')
  fs.writeFileSync(filepath, content)
  formidable.mockReturnValue({
    parse (req, cb) {
      cb(null, fields || { country: 'NZ' }, { file: { filepath, originalFilename: 'ir265.pdf' } })
    }
  })
  return filepath
}

const READING = {
  document: 'IR265 — General depreciation rates',
  published: '2023-10',
  country: 'NZ',
  firstYearRuleFound: false,
  categories: { vehicles: entry() },
  unmatched: ['leaseholdImprovements', 'plantEquipment', 'officeEquipment', 'computerHardware', 'other'],
  refusedRows: 1
}

/** One pending document in the proposal store, as the routes would read it back. */
function pending (over) {
  return Object.assign({
    id: 'doc-1',
    filename: 'ir265.pdf',
    documentName: 'IR265 — General depreciation rates',
    country: 'NZ',
    published: '2023-10',
    loadedBy: MANAGER,
    loadedAt: '2026-09-09T01:00:00.000Z',
    status: 'pending',
    firstYearRuleFound: false,
    categories: { vehicles: entry() },
    unmatched: ['other'],
    refusedRows: 0,
    decidedBy: '',
    decidedAt: null
  }, over || {})
}

describe('loading a document', () => {
  let quiet
  beforeEach(() => { quiet = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { quiet.mockRestore(); jest.restoreAllMocks() })

  test('a read document is stored as a pending proposal, loaded by the verified user', async () => {
    const file = uploadOf('%PDF-1.4 ...')
    jest.spyOn(extract, 'readDocument').mockResolvedValue({ ok: true, code: null, message: null, reading: READING })

    const res = makeRes()
    await routes.loadDocument(makeReq({ userEmail: MANAGER }), res)

    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(true)
    expect(res._body.document.status).toBe('pending')
    expect(res._body.document.loadedBy).toBe(MANAGER)
    expect(res._body.document.categories.vehicles.dvRate).toBe(0.5)

    const written = savedFor(PROPOSALS_KEY)
    expect(written.documents).toHaveLength(1)
    // 🔴 The approved store is untouched. Loading is not approving.
    expect(savedFor('depreciation-rates')).toBeNull()
    expect(fs.existsSync(file)).toBe(false)
  })

  test('the temporary file is deleted even when nothing could be read from it', async () => {
    const file = uploadOf('%PDF-1.4 ...')
    jest.spyOn(extract, 'readDocument').mockResolvedValue({
      ok: false, code: 'UNREADABLE', message: extract.UNREADABLE_MESSAGE, reading: null
    })
    await routes.loadDocument(makeReq(), makeRes())
    expect(fs.existsSync(file)).toBe(false)
  })

  test('a document the model could not read is recorded as unreadable and proposes nothing', async () => {
    uploadOf('%PDF-1.4 ...')
    jest.spyOn(extract, 'readDocument').mockResolvedValue({
      ok: false, code: 'UNREADABLE', message: extract.UNREADABLE_MESSAGE, reading: null
    })

    const res = makeRes()
    await routes.loadDocument(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(false)
    expect(res._body.message).toBe(extract.UNREADABLE_MESSAGE)
    expect(res._body.document.status).toBe('unreadable')
    expect(res._body.document.categories).toEqual({})
    expect(savedFor(PROPOSALS_KEY).documents[0].status).toBe('unreadable')
  })

  test('a file that is not a PDF is refused before anything is sent to a model', async () => {
    // The declared content type comes from the browser. The first bytes do not.
    const file = uploadOf('PK this is a zip')
    const spy = jest.spyOn(extract, 'readDocument')

    const res = makeRes()
    await routes.loadDocument(makeReq(), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NOT_A_PDF')
    expect(spy).not.toHaveBeenCalled()
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(fs.existsSync(file)).toBe(false)
  })

  test('a country that is not a two-letter code is refused', async () => {
    uploadOf('%PDF-1.4 ...', { country: 'New Zealand' })
    const spy = jest.spyOn(extract, 'readDocument')
    const res = makeRes()
    await routes.loadDocument(makeReq(), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_COUNTRY')
    expect(spy).not.toHaveBeenCalled()
  })

  test('no file is refused', async () => {
    formidable.mockReturnValue({ parse (req, cb) { cb(null, { country: 'NZ' }, {}) } })
    const res = makeRes()
    await routes.loadDocument(makeReq(), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NO_FILE')
  })

  test('a body that will not parse — an oversized file among them — is refused, not thrown', async () => {
    formidable.mockReturnValue({
      parse (req, cb) { cb(new Error('maxFileSize exceeded')) }
    })
    const res = makeRes()
    await routes.loadDocument(makeReq(), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('UPLOAD_FAILED')
    // Never the library's own message.
    expect(errorBody(res).error.message).not.toContain('maxFileSize')
  })

  test('a document published for another country is refused and nothing is recorded', async () => {
    uploadOf('%PDF-1.4 ...')
    jest.spyOn(extract, 'readDocument').mockResolvedValue({
      ok: false, code: 'COUNTRY_MISMATCH', message: 'This document is published for AU, not NZ.', reading: null
    })
    const res = makeRes()
    await routes.loadDocument(makeReq(), res)
    expect(res._status).toBe(400)
    // No PROPOSAL is recorded. The reading itself is still spent against the firm's cap,
    // because the model was still paid to tell us the country was wrong (item 4.82).
    expect(savedFor(PROPOSALS_KEY)).toBeNull()
  })

  test('a network fault records nothing — it is not the document that failed', async () => {
    uploadOf('%PDF-1.4 ...')
    jest.spyOn(extract, 'readDocument').mockResolvedValue({
      ok: false, code: 'READ_FAILED', message: 'The document could not be sent for reading.', reading: null
    })
    const res = makeRes()
    await routes.loadDocument(makeReq(), res)
    expect(res._status).toBe(502)
    expect(savedFor(PROPOSALS_KEY)).toBeNull()
  })

  test('the read is asked for THIS scope, never one from the body', async () => {
    uploadOf('%PDF-1.4 ...', { country: 'NZ', firmId: 'other-firm' })
    const spy = jest.spyOn(extract, 'readDocument')
      .mockResolvedValue({ ok: true, code: null, message: null, reading: READING })
    await routes.loadDocument(makeReq(), makeRes())
    expect(spy.mock.calls[0][0].scopeId).toBe(FIRM)
  })

  // ── The cap on paid readings — item 4.82 ───────────────────────────────────
  // The counting itself is proved in tests/unit/aiLoadBudget.test.js. What matters HERE is
  // only that the route consults it, and that it does so BEFORE the model is called.

  test('a reading is spent against the firm’s cap, on its own key', async () => {
    uploadOf('%PDF-1.4 ...')
    jest.spyOn(extract, 'readDocument')
      .mockResolvedValue({ ok: true, code: null, message: null, reading: READING })

    await routes.loadDocument(makeReq(), makeRes())

    expect(savedFor(BUDGET_KEY).loads).toHaveLength(1)
    // The rates the forecasts read are untouched by a load. Counting is not approving.
    expect(savedFor('depreciation-rates')).toBeNull()
  })

  test('🔴 the twenty-first reading in 24 hours is refused BEFORE anything is sent to a model', async () => {
    const spent = new Array(20).fill(new Date().toISOString())
    storedByKey({ [BUDGET_KEY]: { loads: spent } })
    uploadOf('%PDF-1.4 ...')
    const spy = jest.spyOn(extract, 'readDocument')

    const res = makeRes()
    await routes.loadDocument(makeReq(), res)

    expect(res._status).toBe(429)
    expect(errorBody(res).error.code).toBe('AI_LOAD_LIMIT')
    // The whole point of the cap: the model is never paid for the refused reading.
    expect(spy).not.toHaveBeenCalled()
    expect(savedFor(PROPOSALS_KEY)).toBeNull()
  })

  test('an advisor and a manager share one count — the same handler serves both routes', async () => {
    // The manager's route and the advisor's differ only in the guard in restify-server.js.
    // Both arrive here with the same verified firm, which is what makes the count shared.
    storedByKey({ [BUDGET_KEY]: { loads: new Array(20).fill(new Date().toISOString()) } })
    uploadOf('%PDF-1.4 ...')

    const advisor = makeRes()
    await routes.loadDocument(makeReq({ userEmail: 'advisor@example.com' }), advisor)
    expect(advisor._status).toBe(429)

    uploadOf('%PDF-1.4 ...')
    const manager = makeRes()
    await routes.loadDocument(makeReq({ userEmail: MANAGER }), manager)
    expect(manager._status).toBe(429)
  })

  test('a firm at its limit is told so in the approved words, and never in an error code', async () => {
    // Pinned because Mike approved this sentence on 2026-09-11 and a person reads it at the
    // moment they are stopped. The wording lives in design/features/depreciation-rates.md.
    storedByKey({ [BUDGET_KEY]: { loads: new Array(20).fill(new Date().toISOString()) } })
    uploadOf('%PDF-1.4 ...')

    const res = makeRes()
    await routes.loadDocument(makeReq(), res)

    expect(errorBody(res).error.message).toBe(
      'Your firm has used all 20 document readings for today. ' +
      'Nothing has been lost — you can load this document again tomorrow.'
    )
  })
})

describe('a pending proposal reaches no forecast', () => {
  // 🔴 SC-002, and the reason the two stores are two stores. Both are populated here.
  test('an advisor read still answers the app own rates while a proposal is pending', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    expect(res._body.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
  })

  test('the manager own view says the same until the proposal is approved', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._body.hasOwn).toBe(false)
    expect(res._body.resolved.isDefault).toBe(true)
  })
})

describe('listing what has been loaded', () => {
  test('every document this level has loaded, newest first', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending({ id: 'a' }), pending({ id: 'b' })] } })
    const res = makeRes()
    await routes.listDocuments(makeReq(), res)
    expect(res._body.documents.map(d => d.id)).toEqual(['a', 'b'])
  })

  test('a country filters the list', async () => {
    storedByKey({
      [PROPOSALS_KEY]: { documents: [pending({ id: 'a' }), pending({ id: 'b', country: 'AU' })] }
    })
    const res = makeRes()
    await routes.listDocuments(makeReq({ query: { country: 'AU' } }), res)
    expect(res._body.documents.map(d => d.id)).toEqual(['b'])
  })

  test('a level that has loaded nothing gets an empty list, not an error', async () => {
    const res = makeRes()
    await routes.listDocuments(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.documents).toEqual([])
  })
})

describe('approving a proposal', () => {
  let quiet
  beforeEach(() => { quiet = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => quiet.mockRestore())

  test('what is written is the MANAGER figures, signed with the verified token', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const corrected = { vehicles: entry({ dvRate: 0.45 }) }

    const res = makeRes()
    await routes.approveDocument(makeReq({
      body: { documentId: 'doc-1', categories: corrected, approvedBy: 'someone.else@example.com' }
    }), res)

    expect(res._status).toBe(200)
    const table = savedFor('depreciation-rates').NZ
    // FR-007: the approved value is the manager's, not the one proposed.
    expect(table.categories.vehicles.dvRate).toBe(0.45)
    // 🔴 The signature is the token's, never the body's.
    expect(table.approvedBy).toBe(MANAGER)
    expect(savedFor(PROPOSALS_KEY).documents[0].status).toBe('approved')
    expect(savedFor(PROPOSALS_KEY).documents[0].decidedBy).toBe(MANAGER)
  })

  test('the country comes from the document, never from the body', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending({ country: 'AU' })] } })
    const res = makeRes()
    await routes.approveDocument(makeReq({
      body: { documentId: 'doc-1', country: 'NZ', categories: { vehicles: entry() } }
    }), res)
    expect(res._body.country).toBe('AU')
    expect(Object.keys(savedFor('depreciation-rates'))).toEqual(['AU'])
  })

  test('a refused table leaves the document pending — the rates are written first', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const res = makeRes()
    await routes.approveDocument(makeReq({
      // 50 is a rate in the wrong unit, refused rather than clamped.
      body: { documentId: 'doc-1', categories: { vehicles: entry({ dvRate: 50 }) } }
    }), res)

    expect(res._status).toBe(400)
    expect(savedFor('depreciation-rates')).toBeNull()
    expect(savedFor(PROPOSALS_KEY)).toBeNull()
  })

  test('a rate with no source document is refused', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const res = makeRes()
    await routes.approveDocument(makeReq({
      body: { documentId: 'doc-1', categories: { vehicles: entry({ source: undefined }) } }
    }), res)
    expect(res._status).toBe(400)
    expect(savedFor('depreciation-rates')).toBeNull()
  })

  test('a document this level has not loaded cannot be approved', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const res = makeRes()
    await routes.approveDocument(makeReq({ body: { documentId: 'someone-elses', categories: { vehicles: entry() } } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a document already decided cannot be approved twice', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending({ status: 'approved' })] } })
    const res = makeRes()
    await routes.approveDocument(makeReq({ body: { documentId: 'doc-1', categories: { vehicles: entry() } } }), res)
    expect(res._status).toBe(409)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test.each([
    ['no documentId', { categories: {} }],
    ['categories that are an array', { documentId: 'doc-1', categories: [] }],
    ['no categories at all', { documentId: 'doc-1' }]
  ])('%s is refused', async (_label, body) => {
    const res = makeRes()
    await routes.approveDocument(makeReq({ body }), res)
    expect(res._status).toBe(400)
  })

  test('an approval carries a first-year rule already adopted, without re-approving it', async () => {
    // Mike's ruling of 2026-09-09 made structural: the rates handler cannot reach the rule.
    storedByKey({
      'depreciation-rates': {
        NZ: {
          approvedAt: '2026-09-01T00:00:00.000Z',
          approvedBy: 'earlier@example.com',
          categories: { vehicles: entry() },
          firstYearRule: Object.assign(boost(), {
            approvedAt: '2026-09-01T00:00:00.000Z',
            approvedBy: 'earlier@example.com'
          })
        }
      },
      [PROPOSALS_KEY]: { documents: [pending()] }
    })

    const res = makeRes()
    await routes.approveDocument(makeReq({
      body: { documentId: 'doc-1', categories: { vehicles: entry({ dvRate: 0.45 }) } }
    }), res)

    expect(res._status).toBe(200)
    const table = savedFor('depreciation-rates').NZ
    expect(table.firstYearRule.approvedBy).toBe('earlier@example.com')
    expect(table.firstYearRule.approvedAt).toBe('2026-09-01T00:00:00.000Z')
    expect(table.approvedBy).toBe(MANAGER)
  })
})

describe('rejecting a proposal', () => {
  let quiet
  beforeEach(() => { quiet = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => quiet.mockRestore())

  test('the proposal is marked rejected and no rate is touched', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const res = makeRes()
    await routes.rejectDocument(makeReq({ body: { documentId: 'doc-1' } }), res)

    expect(res._status).toBe(200)
    expect(savedFor(PROPOSALS_KEY).documents[0].status).toBe('rejected')
    expect(savedFor(PROPOSALS_KEY).documents[0].decidedBy).toBe(MANAGER)
    expect(savedFor('depreciation-rates')).toBeNull()
  })

  test('a document nobody here loaded cannot be rejected', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending()] } })
    const res = makeRes()
    await routes.rejectDocument(makeReq({ body: { documentId: 'nope' } }), res)
    expect(res._status).toBe(404)
  })

  test('a document already decided cannot be rejected', async () => {
    storedByKey({ [PROPOSALS_KEY]: { documents: [pending({ status: 'rejected' })] } })
    const res = makeRes()
    await routes.rejectDocument(makeReq({ body: { documentId: 'doc-1' } }), res)
    expect(res._status).toBe(409)
  })

  test('no documentId is refused', async () => {
    const res = makeRes()
    await routes.rejectDocument(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
  })
})
