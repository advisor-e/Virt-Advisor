'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

// ── Module mocks (declared before any require) ────────────────────────────────

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
  restoreVersion: jest.fn()
}))

const db = require('../../server/utils/db')
const drive = require('../../server/services/driveService')
const overlay = require('../../server/utils/firmOverlay')

const {
  listDocuments,
  deleteDocument,
  getFramework,
  saveFramework,
  getFrameworkHistory,
  restoreFramework,
  listVideos,
  addVideo,
  deleteVideo,
  getProfile,
  updateProfile,
  getStorageUsage
} = require('../../server/routes/firmManager')

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeMockRes () {
  const res = {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    header () {},
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
  return res
}

function makeReq (overrides = {}) {
  return {
    firmId: 'firm-test-123',
    userRole: 'firm_manager',
    userEmail: 'mgr@testfirm.com',
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides
  }
}

beforeEach(() => jest.clearAllMocks())

// ── listDocuments ─────────────────────────────────────────────────────────────

describe('listDocuments', () => {
  test('returns 400 when category query param is missing', async () => {
    const req = makeReq({ query: {} })
    const res = makeMockRes()
    const next = jest.fn()

    await listDocuments(req, res, next)

    expect(res._status).toBe(400)
  })

  test('returns 400 when category value is invalid', async () => {
    const req = makeReq({ query: { category: 'invalid-cat' } })
    const res = makeMockRes()
    const next = jest.fn()

    await listDocuments(req, res, next)

    expect(res._status).toBe(400)
  })

  test('returns combined base and firm lists for a valid category', async () => {
    drive.listBaseDocuments.mockResolvedValue([{ id: 'base-1', name: 'Base Doc.pdf' }])
    drive.listFirmDocuments.mockResolvedValue([{ id: 'firm-1', name: 'Firm Doc.pdf' }])

    const req = makeReq({ query: { category: 'logic-tables' } })
    const res = makeMockRes()
    const next = jest.fn()

    await listDocuments(req, res, next)

    expect(res._status).toBe(200)
    expect(res._body.base).toHaveLength(1)
    expect(res._body.firm).toHaveLength(1)
    expect(res._body.base[0].source).toBe('platform')
    expect(res._body.firm[0].source).toBe('firm')
  })

  test('returns empty lists in dev when Drive call fails', async () => {
    drive.listBaseDocuments.mockResolvedValue([])
    drive.listFirmDocuments.mockRejectedValue(new Error('Drive error'))

    const req = makeReq({ query: { category: 'domain-support' } })
    const res = makeMockRes()
    const next = jest.fn()

    await listDocuments(req, res, next)

    // In dev/test mode, Drive failure returns empty lists rather than 500
    expect(res._status).toBe(200)
    expect(res._body.base).toEqual([])
    expect(res._body.firm).toEqual([])
  })
})

// ── deleteDocument ────────────────────────────────────────────────────────────

describe('deleteDocument', () => {
  test('returns 404 when document does not belong to this firm', async () => {
    db.execute.mockResolvedValue([[]]) // empty result — not found

    const req = makeReq({ params: { fileId: 'drive-file-999' } })
    const res = makeMockRes()
    const next = jest.fn()

    await deleteDocument(req, res, next)

    expect(res._status).toBe(404)
  })

  test('deletes from Drive and DB when document belongs to firm', async () => {
    db.execute
      .mockResolvedValueOnce([[{ size_bytes: 1024 }]]) // SELECT — found
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // DELETE firm_documents
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE firm_storage_usage

    drive.deleteFirmDocument.mockResolvedValue()

    const req = makeReq({ params: { fileId: 'drive-file-abc' } })
    const res = makeMockRes()
    const next = jest.fn()

    await deleteDocument(req, res, next)

    expect(drive.deleteFirmDocument).toHaveBeenCalledWith('drive-file-abc')
    expect(res._status).toBe(200)
    expect(res._body.deleted).toBe(true)
  })

  test('returns 400 when fileId param is missing', async () => {
    const req = makeReq({ params: {} })
    const res = makeMockRes()
    const next = jest.fn()

    await deleteDocument(req, res, next)

    expect(res._status).toBe(400)
  })
})

// ── getFramework ──────────────────────────────────────────────────────────────

describe('getFramework', () => {
  test('returns 400 when configKey is missing', async () => {
    const req = makeReq({ query: {} })
    const res = makeMockRes()

    await getFramework(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns hasOverride: false when no firm override exists', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)

    const req = makeReq({ query: { configKey: 'recommendation-rules' } })
    const res = makeMockRes()

    await getFramework(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.hasOverride).toBe(false)
    expect(res._body.firmOverride).toBeNull()
  })

  test('returns hasOverride: true and the override object when one exists', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ minTier: 2 })

    const req = makeReq({ query: { configKey: 'recommendation-rules' } })
    const res = makeMockRes()

    await getFramework(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.hasOverride).toBe(true)
    expect(res._body.firmOverride).toEqual({ minTier: 2 })
  })
})

// ── saveFramework ─────────────────────────────────────────────────────────────

describe('saveFramework', () => {
  test('returns 400 when configKey is missing', async () => {
    const req = makeReq({ body: { configJson: { a: 1 } } })
    const res = makeMockRes()

    await saveFramework(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns 400 when configJson is not an object', async () => {
    const req = makeReq({ body: { configKey: 'recommendation-rules', configJson: 'a string' } })
    const res = makeMockRes()

    await saveFramework(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns 400 when configJson is an array', async () => {
    const req = makeReq({ body: { configKey: 'recommendation-rules', configJson: [1, 2] } })
    const res = makeMockRes()

    await saveFramework(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('saves and returns the new version number on success', async () => {
    overlay.saveFirmConfig.mockResolvedValue(4)

    const req = makeReq({ body: { configKey: 'recommendation-rules', configJson: { minTier: 2 } } })
    const res = makeMockRes()

    await saveFramework(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.saved).toBe(true)
    expect(res._body.version).toBe(4)
  })
})

// ── getFrameworkHistory ───────────────────────────────────────────────────────

describe('getFrameworkHistory', () => {
  test('returns 400 when configKey is missing', async () => {
    const req = makeReq({ query: {} })
    const res = makeMockRes()

    await getFrameworkHistory(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns version history array', async () => {
    const mockHistory = [
      { id: 5, version: 3, is_active: 1, saved_by: 'user@firm.com', created_at: '2026-05-01' },
      { id: 3, version: 2, is_active: 0, saved_by: 'user@firm.com', created_at: '2026-04-28' }
    ]
    overlay.getVersionHistory.mockResolvedValue(mockHistory)

    const req = makeReq({ query: { configKey: 'domain-weights' } })
    const res = makeMockRes()

    await getFrameworkHistory(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.history).toHaveLength(2)
  })
})

// ── restoreFramework ──────────────────────────────────────────────────────────

describe('restoreFramework', () => {
  test('returns 400 when configKey is missing', async () => {
    const req = makeReq({ body: { versionId: 3 } })
    const res = makeMockRes()

    await restoreFramework(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns 400 when versionId is missing', async () => {
    const req = makeReq({ body: { configKey: 'recommendation-rules' } })
    const res = makeMockRes()

    await restoreFramework(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns restored version number on success', async () => {
    overlay.restoreVersion.mockResolvedValue(5)

    const req = makeReq({ body: { configKey: 'recommendation-rules', versionId: 3 } })
    const res = makeMockRes()

    await restoreFramework(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.restored).toBe(true)
    expect(res._body.version).toBe(5)
  })
})

// ── Videos ────────────────────────────────────────────────────────────────────

describe('listVideos', () => {
  test('returns videos array from DB', async () => {
    db.execute.mockResolvedValue([[
      { id: 1, domain: 'Cash Flow', title: 'Cash Masterclass', url: 'https://youtube.com/x', added_by: 'mgr@firm.com', created_at: '2026-01-01' }
    ]])

    const req = makeReq()
    const res = makeMockRes()

    await listVideos(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.videos).toHaveLength(1)
    expect(res._body.videos[0].title).toBe('Cash Masterclass')
  })
})

describe('addVideo', () => {
  test('returns 400 when domain is missing', async () => {
    const req = makeReq({ body: { title: 'Video', url: 'https://youtube.com/x' } })
    const res = makeMockRes()

    await addVideo(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns 400 when URL is not HTTPS', async () => {
    const req = makeReq({ body: { domain: 'Cash Flow', title: 'Video', url: 'http://youtube.com/x' } })
    const res = makeMockRes()

    await addVideo(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('returns 400 when URL is not a valid URL', async () => {
    const req = makeReq({ body: { domain: 'Cash Flow', title: 'Video', url: 'not-a-url' } })
    const res = makeMockRes()

    await addVideo(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('inserts video and returns 201 on success', async () => {
    db.execute.mockResolvedValue([{ insertId: 7 }])

    const req = makeReq({ body: { domain: 'Cash Flow', title: 'Cash Masterclass', url: 'https://youtube.com/xyzabc' } })
    const res = makeMockRes()

    await addVideo(req, res, jest.fn())

    expect(res._status).toBe(201)
    expect(res._body.id).toBe(7)
  })
})

describe('deleteVideo', () => {
  test('returns 404 when video does not belong to this firm', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])

    const req = makeReq({ params: { id: '99' } })
    const res = makeMockRes()

    await deleteVideo(req, res, jest.fn())

    expect(res._status).toBe(404)
  })

  test('returns 200 when video deleted successfully', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])

    const req = makeReq({ params: { id: '5' } })
    const res = makeMockRes()

    await deleteVideo(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.deleted).toBe(true)
  })
})

// ── Firm Profile ──────────────────────────────────────────────────────────────

describe('getProfile', () => {
  test('returns 404 when firm is not found', async () => {
    db.execute.mockResolvedValue([[]])

    const req = makeReq()
    const res = makeMockRes()

    await getProfile(req, res, jest.fn())

    expect(res._status).toBe(404)
  })

  test('returns firm data when found', async () => {
    db.execute.mockResolvedValue([[
      {
 id: 'firm-test-123',
name: 'Acme Advisory',
slug: 'acme',
logo_url: null,
        primary_colour: '#003366',
persona_name: 'Max',
created_at: '2026-01-01'
}
    ]])

    const req = makeReq()
    const res = makeMockRes()

    await getProfile(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.firm.name).toBe('Acme Advisory')
    expect(res._body.firm.persona_name).toBe('Max')
  })
})

describe('updateProfile', () => {
  test('returns 400 when no updatable fields are provided', async () => {
    const req = makeReq({ body: {} })
    const res = makeMockRes()

    await updateProfile(req, res, jest.fn())

    expect(res._status).toBe(400)
  })

  test('updates and returns 200 when valid fields provided', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])

    const req = makeReq({ body: { name: 'Updated Firm Name', persona_name: 'Advisor' } })
    const res = makeMockRes()

    await updateProfile(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.updated).toBe(true)
  })
})

// ── Storage usage ─────────────────────────────────────────────────────────────

describe('getStorageUsage', () => {
  test('returns 0 bytes when no usage row exists yet', async () => {
    db.execute.mockResolvedValue([[]])

    const req = makeReq()
    const res = makeMockRes()

    await getStorageUsage(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.bytesUsed).toBe(0)
    expect(res._body.percentUsed).toBe(0)
  })

  test('returns correct usage and percentage', async () => {
    db.execute.mockResolvedValue([[{ bytes_used: 250 * 1024 * 1024 }]]) // 250 MB of 500 MB

    const req = makeReq()
    const res = makeMockRes()

    await getStorageUsage(req, res, jest.fn())

    expect(res._status).toBe(200)
    expect(res._body.percentUsed).toBe(50)
  })
})
