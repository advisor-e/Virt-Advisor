'use strict'

process.env.JWT_SECRET = 'test-secret'

/**
 * Route tests for the firm's own template-library endpoints
 * (SEARCH-CONTENT-CASCADE-PLAN.md Phase 3 added restore and put a screen in
 * front of the rest). The shared upload validation has its own 100%-bar file
 * (templateImport.test.js) and the mentor twin (mentorTemplates.routes.test.js)
 * covers the upload edge cases in depth; what THESE tests pin is what neither
 * can, and what UAT cannot see:
 *
 * 1. Every read and write is scoped to req.firmId from the verified token —
 *    a slip here stores one firm's library where another firm reads it.
 * 2. Restore and remove clear the engine's template cache, so a rollback is
 *    live on the next request rather than after the ~60s TTL.
 * 3. A live MySQL refusal (sqlState set) surfaces as a 500 and never leaks
 *    the driver's message to the client.
 */

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}))
jest.mock('../../server/services/driveService', () => ({
  listFirmDocuments: jest.fn(),
  listBaseDocuments: jest.fn(),
  uploadFirmDocument: jest.fn(),
  downloadDocument: jest.fn(),
  deleteFirmDocument: jest.fn()
}))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn(),
  listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([]))
}))
jest.mock('../../server/utils/templateLibrary', () => ({
  loadEffectiveTemplates: jest.fn(() => Promise.resolve(null)),
  clearTemplateCache: jest.fn()
}))
jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../../server/utils/firmOverlay')
const db = require('../../server/utils/db')
const { clearTemplateCache, loadEffectiveTemplates } = require('../../server/utils/templateLibrary')
const SEED_TEMPLATES = require('../../data/templates.json')
const {
  getTemplateImport,
  getTemplateLibraryView,
  importTemplates,
  restoreTemplateImport,
  resetTemplateImport
} = require('../../server/routes/firmManager')

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

function makeReq (overrides = {}) {
  return { firmId: 'firm-test-123', userRole: 'firm_manager', userEmail: 'mgr@testfirm.com', params: {}, ...overrides }
}

/** Point formidable at a real temp file holding `content`, as a parsed upload. */
function mockUploadFile (content) {
  const filepath = path.join(os.tmpdir(), `firm-templates-test-${Date.now()}-${Math.random()}.json`)
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

// A live-server refusal: sqlState set → NEVER dev-fall-back (dbFailure.js).
const refusalError = Object.assign(new Error('FK constraint fails'), { sqlState: '23000', errno: 1452 })

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.getVersionHistory.mockResolvedValue([])
  overlay.saveFirmConfig.mockResolvedValue(3)
  overlay.restoreVersion.mockResolvedValue(4)
  loadEffectiveTemplates.mockResolvedValue(null)
  db.execute.mockResolvedValue([[]])
})

describe('GET /api/firm-manager/templates', () => {
  it('reads the CALLING firm\'s scope, from the token-resolved id', async () => {
    await getTemplateImport(makeReq(), makeMockRes())
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith('firm-test-123', 'templates')
    expect(overlay.getVersionHistory).toHaveBeenCalledWith('firm-test-123', 'templates')
  })

  it('reports the stored upload with its count and history', async () => {
    overlay.loadFirmConfig.mockResolvedValue(goodTemplates)
    overlay.getVersionHistory.mockResolvedValue([{ id: 9, version: 2 }])
    const res = makeMockRes()
    await getTemplateImport(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ hasImport: true, templateCount: 2, history: [{ id: 9, version: 2 }] })
  })
})

describe('GET /api/firm-manager/templates/library (the read-only view)', () => {
  it('reports the committed seed as in force when no tier has uploaded', async () => {
    const res = makeMockRes()
    await getTemplateLibraryView(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.source).toBe('platform')
    expect(res._body.platformCount).toBe(SEED_TEMPLATES.length)
    expect(res._body.templates).toBe(SEED_TEMPLATES)
  })

  it('reports the FIRM as the source when its own upload wins the cascade', async () => {
    overlay.loadFirmConfig.mockResolvedValue(goodTemplates)
    loadEffectiveTemplates.mockImplementation(scopeId =>
      Promise.resolve(scopeId === 'firm-test-123' ? goodTemplates : null))
    const res = makeMockRes()
    await getTemplateLibraryView(makeReq(), res)
    expect(res._body.source).toBe('firm')
    expect(res._body.templates).toEqual(goodTemplates)
    // The platform card still reports the seed, so the manager sees what
    // Remove would return their advisors to.
    expect(res._body.platformCount).toBe(SEED_TEMPLATES.length)
  })

  it('asks the cascade for the CALLING firm\'s scope, from the token-resolved id', async () => {
    await getTemplateLibraryView(makeReq(), makeMockRes())
    expect(loadEffectiveTemplates).toHaveBeenCalledWith('firm-test-123')
  })

  it('surfaces a live MySQL refusal on the own-upload read as a safe 500', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refusalError)
    const res = makeMockRes()
    await getTemplateLibraryView(makeReq(), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('constraint')
  })
})

describe('POST /api/firm-manager/templates (import)', () => {
  it('stores a valid export under the CALLING firm\'s id and clears the engine cache', async () => {
    mockUploadFile(JSON.stringify(goodTemplates))
    const res = makeMockRes()
    await importTemplates(makeReq(), res)
    expect(res._status).toBe(201)
    expect(res._body).toEqual({ imported: true, templateCount: 2, version: 3 })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      'firm-test-123', 'templates', goodTemplates, 'mgr@testfirm.com')
    expect(clearTemplateCache).toHaveBeenCalled()
  })

  it('rejects a wrong-shape file and leaves the store untouched', async () => {
    mockUploadFile(JSON.stringify([{ title: 'missing page and section' }]))
    const res = makeMockRes()
    await importTemplates(makeReq(), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(clearTemplateCache).not.toHaveBeenCalled()
  })
})

describe('POST /api/firm-manager/templates/restore', () => {
  it.each([
    ['missing', undefined],
    ['a string', '7'],
    ['zero', 0],
    ['negative', -2],
    ['fractional', 1.5]
  ])('rejects a versionId that is %s', async (_label, versionId) => {
    const res = makeMockRes()
    await restoreTemplateImport(makeReq({ body: { versionId } }), res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  it('restores under the CALLING firm\'s scope and clears the engine cache', async () => {
    const res = makeMockRes()
    await restoreTemplateImport(makeReq({ body: { versionId: 9 } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ restored: true, version: 4 })
    expect(overlay.restoreVersion).toHaveBeenCalledWith('firm-test-123', 'templates', 9)
    expect(clearTemplateCache).toHaveBeenCalled()
  })

  it('returns a safe error, not the store\'s message, when the version cannot be restored', async () => {
    overlay.restoreVersion.mockRejectedValue(new Error('Version not found for this firm and config key'))
    const res = makeMockRes()
    await restoreTemplateImport(makeReq({ body: { versionId: 99 } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('not found for this firm')
    expect(clearTemplateCache).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/firm-manager/templates (remove)', () => {
  it('deletes only the CALLING firm\'s templates rows and clears the engine cache', async () => {
    const res = makeMockRes()
    await resetTemplateImport(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ reset: true })
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/DELETE FROM firm_framework_versions/)
    expect(params).toEqual(['firm-test-123', 'templates'])
    expect(clearTemplateCache).toHaveBeenCalled()
  })

  it('surfaces a live MySQL refusal as a safe 500 — never the dev-file fallback', async () => {
    db.execute.mockRejectedValue(refusalError)
    const res = makeMockRes()
    await resetTemplateImport(makeReq(), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('constraint')
    expect(clearTemplateCache).not.toHaveBeenCalled()
  })
})
