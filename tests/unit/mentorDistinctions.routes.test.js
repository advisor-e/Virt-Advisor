'use strict'

// Mentor Advisory Distinctions — the cascade ORIGIN. The mentor authors the
// platform set via plain CRUD, written to the reserved GLOBAL overlay scope
// (never a firmId). These tests mock firmOverlay so load/save are controllable.

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  // No firm overrides any row in these tests → delete-promotion (Stage D) is a no-op
  // and never touches the dev files (keeps the delete tests hermetic).
  listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([]))
}))

const overlay = require('../../server/utils/firmOverlay')
const { PLATFORM_SCOPE, PLATFORM_CONFIG_KEY } = require('../../server/utils/platformDistinctions')
const {
  listMentorDistinctions,
  createMentorDistinction,
  updateMentorDistinction,
  deleteMentorDistinction
} = require('../../server/routes/mentor')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

const MENTOR_REQ = { userEmail: 'mentor@advisor-e.com' }

function rows () {
  return [
    { id: 'pd-1', domain: 'conflict', triggers: ['fight'], description: 'Active conflict', templates: ['Force Field Analysis'], boost: 5 },
    { id: 'pd-2', domain: 'profit', triggers: ['losing money'], description: 'Bleeding cash', templates: ['Quick & Worst'], boost: 8 }
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(1)
})

describe('listMentorDistinctions', () => {
  test('returns the platform set from the global scope', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const res = makeMockRes()
    await listMentorDistinctions(MENTOR_REQ, res)
    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.distinctions).toHaveLength(2)
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, PLATFORM_CONFIG_KEY)
  })
})

describe('createMentorDistinction', () => {
  test('appends a new row with the next pd-N id and saves to the global scope', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const req = {
      ...MENTOR_REQ,
      body: { domain: 'staff', description: 'Key person leaving', triggers: [' resigning '], templates: ['People vs Process'], boost: 12 }
    }
    const res = makeMockRes()
    await createMentorDistinction(req, res)

    expect(res._status).toBe(201)
    expect(res._body).toEqual({ success: true, id: 'pd-3' })

    const [scope, key, saved, savedBy] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe(PLATFORM_CONFIG_KEY)
    expect(savedBy).toBe('mentor@advisor-e.com')
    expect(saved).toHaveLength(3)
    const added = saved[2]
    expect(added.id).toBe('pd-3')
    expect(added.domain).toBe('staff')
    expect(added.triggers).toEqual(['resigning']) // trimmed
    expect(added.boost).toBe(12)
    expect(added.created_by).toBe('mentor@advisor-e.com')
  })

  test('next id is max(N)+1, not count+1 (ids never reused after a delete)', async () => {
    overlay.loadFirmConfig.mockResolvedValue([
      { id: 'pd-1', domain: 'conflict', triggers: ['x'], description: 'd', templates: ['T'], boost: 5 },
      { id: 'pd-9', domain: 'profit', triggers: ['y'], description: 'd', templates: ['T'], boost: 5 }
    ])
    const req = { ...MENTOR_REQ, body: { domain: 'risk', description: 'd', triggers: ['z'], templates: ['T'] } }
    const res = makeMockRes()
    await createMentorDistinction(req, res)
    expect(res._body.id).toBe('pd-10')
  })

  test('rejects an unrecognised domain', async () => {
    const req = { ...MENTOR_REQ, body: { domain: 'not-a-domain', description: 'd', triggers: ['x'], templates: ['T'] } }
    const res = makeMockRes()
    await createMentorDistinction(req, res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_DOMAIN')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('rejects empty triggers and empty templates', async () => {
    const res1 = makeMockRes()
    await createMentorDistinction({ ...MENTOR_REQ, body: { domain: 'profit', description: 'd', triggers: [], templates: ['T'] } }, res1)
    expect(res1._body.error.code).toBe('INVALID_TRIGGERS')

    const res2 = makeMockRes()
    await createMentorDistinction({ ...MENTOR_REQ, body: { domain: 'profit', description: 'd', triggers: ['x'], templates: [] } }, res2)
    expect(res2._body.error.code).toBe('INVALID_TEMPLATES')
  })

  test('clamps boost into 1..20', async () => {
    overlay.loadFirmConfig.mockResolvedValue([])
    const req = { ...MENTOR_REQ, body: { domain: 'profit', description: 'd', triggers: ['x'], templates: ['T'], boost: 999 } }
    const res = makeMockRes()
    await createMentorDistinction(req, res)
    expect(overlay.saveFirmConfig.mock.calls[0][2][0].boost).toBe(20)
  })
})

describe('updateMentorDistinction', () => {
  test('edits fields, keeps the id pinned even if the body tries to change it', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const req = { ...MENTOR_REQ, params: { id: 'pd-2' }, body: { id: 'pd-HACK', boost: 15, description: 'Reworded' } }
    const res = makeMockRes()
    await updateMentorDistinction(req, res)

    expect(res._status).toBe(200)
    const saved = overlay.saveFirmConfig.mock.calls[0][2]
    const edited = saved.find(r => r.domain === 'profit')
    expect(edited.id).toBe('pd-2') // pinned, body's pd-HACK ignored
    expect(edited.boost).toBe(15)
    expect(edited.description).toBe('Reworded')
    expect(edited.triggers).toEqual(['losing money']) // untouched field preserved
    expect(edited.updated_by).toBe('mentor@advisor-e.com')
  })

  test('allows a domain change (a mentor-tier move)', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const req = { ...MENTOR_REQ, params: { id: 'pd-1' }, body: { domain: 'risk' } }
    const res = makeMockRes()
    await updateMentorDistinction(req, res)
    expect(res._status).toBe(200)
    const moved = overlay.saveFirmConfig.mock.calls[0][2].find(r => r.id === 'pd-1')
    expect(moved.domain).toBe('risk')
  })

  test('404 when the id does not exist', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const res = makeMockRes()
    await updateMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-999' }, body: { boost: 5 } }, res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('rejects an unrecognised domain', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const res = makeMockRes()
    await updateMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-1' }, body: { domain: 'nope' } }, res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_DOMAIN')
  })
})

describe('deleteMentorDistinction', () => {
  test('removes the row and saves the rest', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const res = makeMockRes()
    await deleteMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-1' } }, res)
    expect(res._status).toBe(200)
    const saved = overlay.saveFirmConfig.mock.calls[0][2]
    expect(saved.map(r => r.id)).toEqual(['pd-2'])
  })

  test('404 when the id does not exist (no save)', async () => {
    overlay.loadFirmConfig.mockResolvedValue(rows())
    const res = makeMockRes()
    await deleteMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-404' } }, res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// A delete that stops PART-WAY is covered in mentorDeletePartial.routes.test.js — it
// must run with NODE_ENV=production, because in dev every firm write falls back to a
// file and therefore cannot fail, which is exactly the behaviour this file relies on to
// stay hermetic.

describe('production persistence errors surface (no silent swallow)', () => {
  test('a save failure in production returns 500', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    overlay.loadFirmConfig.mockResolvedValue(rows())
    overlay.saveFirmConfig.mockRejectedValue(new Error('connection refused'))

    const res = makeMockRes()
    await deleteMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-1' } }, res)
    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')

    process.env.NODE_ENV = prev
  })
})
