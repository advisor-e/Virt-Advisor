'use strict'

// The mentor's master-template upload routes (SEARCH-CONTENT-CASCADE-PLAN Phase 1).
//
// Three things are worth guarding here, and none is visible in UAT:
//
// 1. Every read and write goes to the reserved PLATFORM scope — never a firm id.
//    A slip here would store the platform library inside somebody's firm.
// 2. A rejected upload leaves the store untouched: saveFirmConfig must not be
//    called when validation fails. A bad file can never take the platform offline.
// 3. The dev-file fallback runs ONLY when no database answered. A live MySQL
//    refusal (sqlState set — e.g. the missing reserved `firms` row, errno 1452)
//    must surface as a 500, never land in a scratch file reported as saved —
//    the exact fault that ran the mentor's saves silently broken for weeks.

const fs = require('fs')
const os = require('os')
const path = require('path')

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn(),
  listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([]))
}))

// mentor.js pulls in the whole of firmManager; mock it so these tests exercise
// only the mentor handlers, and so the dev-file fallback writes are observable
// without touching the real gitignored dev file.
jest.mock('../../server/routes/firmManager', () => ({
  _devReadTemplates: jest.fn(() => null),
  _devWriteTemplates: jest.fn(),
  promoteOverridesForDeletedRow: jest.fn()
}))

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const { formidable } = require('formidable')
const overlay = require('../../server/utils/firmOverlay')
const firmManager = require('../../server/routes/firmManager')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const {
  getPlatformTemplates,
  importPlatformTemplates,
  restorePlatformTemplates
} = require('../../server/routes/mentor')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } },
    once () {}
  }
}

const MENTOR_REQ = { userEmail: 'mentor@advisor-e.com' }

/** Point formidable at a real temp file holding `content`, as a parsed upload. */
function mockUploadFile (content) {
  const filepath = path.join(os.tmpdir(), `mentor-templates-test-${Date.now()}-${Math.random()}.json`)
  fs.writeFileSync(filepath, content)
  formidable.mockReturnValue({
    parse: (req, cb) => cb(null, {}, { file: { filepath } })
  })
  return filepath
}

const goodTemplates = [
  { page: 'p1', title: 'Cashflow Basics', section: 'Finance' },
  { page: 'p2', title: 'Pricing Review', section: 'Revenue' }
]

// A connection-level failure: no sqlState → "no database here" → dev fallback OK.
const noDbError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' })
// A live-server refusal: sqlState set → NEVER fall back (dbFailure.js).
const refusalError = Object.assign(new Error('FK constraint fails'), { sqlState: '23000', errno: 1452 })

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.getVersionHistory.mockResolvedValue([])
  overlay.saveFirmConfig.mockResolvedValue(3)
  overlay.restoreVersion.mockResolvedValue(4)
  firmManager._devReadTemplates.mockReturnValue(null)
})

describe('GET /api/mentor/templates', () => {
  it('reports no upload while the store is empty (the app is on the committed seed)', async () => {
    const res = makeMockRes()
    await getPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true, hasUpload: false, templateCount: 0, history: [] })
  })

  it('reports the stored upload with its count and history', async () => {
    overlay.loadFirmConfig.mockResolvedValue(goodTemplates)
    overlay.getVersionHistory.mockResolvedValue([{ id: 9, version: 2 }])
    const res = makeMockRes()
    await getPlatformTemplates(MENTOR_REQ, res)
    expect(res._body.hasUpload).toBe(true)
    expect(res._body.templateCount).toBe(2)
    expect(res._body.history).toEqual([{ id: 9, version: 2 }])
  })

  it('reads from the reserved platform scope, never a firm id', async () => {
    await getPlatformTemplates(MENTOR_REQ, makeMockRes())
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, 'templates')
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(PLATFORM_SCOPE, 'templates')
  })

  it('falls back to the dev file when no database answered', async () => {
    overlay.loadFirmConfig.mockRejectedValue(noDbError)
    firmManager._devReadTemplates.mockReturnValue(goodTemplates)
    const res = makeMockRes()
    await getPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(200)
    expect(res._body.hasUpload).toBe(true)
    expect(res._body.templateCount).toBe(2)
    expect(firmManager._devReadTemplates).toHaveBeenCalledWith(PLATFORM_SCOPE)
  })

  it('returns a safe error, not a stack trace, when the store cannot be read in production', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    overlay.loadFirmConfig.mockRejectedValue(noDbError)
    const res = makeMockRes()
    await getPlatformTemplates(MENTOR_REQ, res)
    process.env.NODE_ENV = prev
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ECONNREFUSED')
  })
})

describe('POST /api/mentor/templates/import', () => {
  it('stores a valid export under the platform scope and reports the new version', async () => {
    mockUploadFile(JSON.stringify(goodTemplates))
    const res = makeMockRes()
    await importPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(201)
    expect(res._body).toEqual({ success: true, imported: true, templateCount: 2, version: 3 })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      PLATFORM_SCOPE, 'templates', goodTemplates, 'mentor@advisor-e.com')
  })

  it('rejects a request with no file field', async () => {
    formidable.mockReturnValue({ parse: (req, cb) => cb(null, {}, {}) })
    const res = makeMockRes()
    await importPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('rejects an unreadable body (e.g. over the size cap) as PARSE_ERROR', async () => {
    formidable.mockReturnValue({ parse: (req, cb) => cb(new Error('maxFileSize exceeded')) })
    const res = makeMockRes()
    await importPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON and leaves the store untouched', async () => {
    mockUploadFile('{ not json')
    const res = makeMockRes()
    await importPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('rejects a wrong-shape file and leaves the store untouched', async () => {
    mockUploadFile(JSON.stringify([{ title: 'missing page and section' }]))
    const res = makeMockRes()
    await importPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('falls back to the dev file when no database answered, and says so via version:null', async () => {
    overlay.saveFirmConfig.mockRejectedValue(noDbError)
    mockUploadFile(JSON.stringify(goodTemplates))
    const res = makeMockRes()
    await importPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(201)
    expect(res._body.version).toBeNull()
    expect(firmManager._devWriteTemplates).toHaveBeenCalledWith(PLATFORM_SCOPE, goodTemplates)
  })

  it('NEVER dev-falls-back on a live MySQL refusal — the missing-reserved-row trap', async () => {
    overlay.saveFirmConfig.mockRejectedValue(refusalError)
    mockUploadFile(JSON.stringify(goodTemplates))
    const res = makeMockRes()
    await importPlatformTemplates(MENTOR_REQ, res)
    expect(res._status).toBe(500)
    expect(firmManager._devWriteTemplates).not.toHaveBeenCalled()
    expect(JSON.stringify(res._body)).not.toContain('constraint')
  })
})

describe('POST /api/mentor/templates/restore', () => {
  it.each([
    ['missing', undefined],
    ['a string', '7'],
    ['zero', 0],
    ['negative', -2],
    ['fractional', 1.5]
  ])('rejects a versionId that is %s', async (_label, versionId) => {
    const res = makeMockRes()
    await restorePlatformTemplates({ ...MENTOR_REQ, body: { versionId } }, res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  it('restores an earlier version under the platform scope', async () => {
    const res = makeMockRes()
    await restorePlatformTemplates({ ...MENTOR_REQ, body: { versionId: 9 } }, res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true, restored: true, version: 4 })
    expect(overlay.restoreVersion).toHaveBeenCalledWith(PLATFORM_SCOPE, 'templates', 9)
  })

  it('returns a safe error when the version cannot be restored', async () => {
    overlay.restoreVersion.mockRejectedValue(new Error('Version not found for this firm and config key'))
    const res = makeMockRes()
    await restorePlatformTemplates({ ...MENTOR_REQ, body: { versionId: 99 } }, res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('not found for this firm')
  })
})
