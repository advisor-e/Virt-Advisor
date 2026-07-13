'use strict'

// Verifies the /api/clients routes through to clientStore, with the DB mocked.
// Focus: identity always comes from the verified JWT (never the request body),
// the register is firm-scoped, and the "did you mean…?" duplicate guard fires
// before a near-duplicate client is created (warns — never hard-blocks).

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn()
}))

const db = require('../../server/utils/db')
const { listClients, createClient, renameClient } = require('../../server/routes/clients')

// ── Helpers (same pattern as cases.routes.test.js) ────────────────────────────

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

// A request as it looks AFTER firmAuth has run: advisorId/firmId from the JWT.
function makeReq (overrides = {}) {
  return {
    advisorId: 'advisor-from-jwt',
    firmId: 'firm-from-jwt',
    query: {},
    body: {},
    params: {},
    ...overrides
  }
}

// A va_clients row as the DB returns it (snake_case).
function clientRow (over = {}) {
  return {
    id: 'client-1',
    firm_id: 'firm-from-jwt',
    name: 'Vanoss Scaffolding',
    name_key: 'vanossscaffolding',
    created_by: 'advisor-from-jwt',
    created_at: '2026-07-14T00:00:00.000Z',
    ...over
  }
}

beforeEach(() => jest.clearAllMocks())

// ── listClients ───────────────────────────────────────────────────────────────

describe('listClients', () => {
  test('returns 403 when the verified pass carries no firm identity', async () => {
    const res = makeMockRes()
    await listClients(makeReq({ firmId: null }), res)

    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_FIRM_IDENTITY')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('scopes the query to the JWT firm, ignoring a firmId in the query string (IDOR closed)', async () => {
    db.execute.mockResolvedValue([[clientRow()]])
    const res = makeMockRes()

    await listClients(makeReq({ query: { firmId: 'ATTACKER-firm' } }), res)

    expect(res._status).toBe(200)
    expect(db.execute.mock.calls[0][1]).toEqual(['firm-from-jwt'])
    // snake_case → camelCase mapping
    expect(res._body.clients[0]).toMatchObject({
      id: 'client-1',
      firmId: 'firm-from-jwt',
      name: 'Vanoss Scaffolding',
      nameKey: 'vanossscaffolding'
    })
  })
})

// ── createClient ──────────────────────────────────────────────────────────────

describe('createClient', () => {
  test('returns 403 without an advisor identity', async () => {
    const res = makeMockRes()
    await createClient(makeReq({ advisorId: null, body: { name: 'Vanoss' } }), res)

    expect(res._status).toBe(403)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('rejects a blank name', async () => {
    const res = makeMockRes()
    await createClient(makeReq({ body: { name: '   ' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_NAME')
  })

  test('a near-duplicate name is NOT created — the "did you mean…?" list comes back instead', async () => {
    // The register already holds "Vanoss Scaffolding"; the advisor types a variant.
    db.execute.mockResolvedValueOnce([[clientRow()]]) // listForFirm
    const res = makeMockRes()

    await createClient(makeReq({ body: { name: 'vanoss-scaffolding Ltd' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.created).toBe(false)
    expect(res._body.possibleDuplicates.map(c => c.id)).toEqual(['client-1'])
    // Exactly one call (the register read) — no INSERT happened.
    expect(db.execute).toHaveBeenCalledTimes(1)
  })

  test('confirmed: true creates despite the near-duplicate (two businesses CAN share a name)', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }]) // INSERT
    const res = makeMockRes()

    await createClient(makeReq({ body: { name: 'Vanoss Scaffolding', confirmed: true } }), res)

    expect(res._status).toBe(200)
    expect(res._body.created).toBe(true)
    expect(res._body.client.name).toBe('Vanoss Scaffolding')
    // confirmed skips the register read: the single call is the INSERT.
    expect(db.execute).toHaveBeenCalledTimes(1)
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/INSERT INTO va_clients/)
    // firm + creator come from the JWT — position 1 is firm_id, 4 is created_by.
    expect(params[1]).toBe('firm-from-jwt')
    expect(params[4]).toBe('advisor-from-jwt')
  })

  test('a genuinely new name creates first time, with the generated hidden id', async () => {
    db.execute
      .mockResolvedValueOnce([[]]) // listForFirm — empty register
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT
    const res = makeMockRes()

    await createClient(makeReq({ body: { name: "Dave's Bakery" } }), res)

    expect(res._body.created).toBe(true)
    expect(res._body.client.name).toBe("Dave's Bakery")
    expect(res._body.client.nameKey).toBe('davesbakery')
    // UUID v4 shape — the identity the advisor never sees.
    expect(res._body.client.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  test('firm/creator identity comes from the JWT even if the body carries ids', async () => {
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
    const res = makeMockRes()

    await createClient(makeReq({
      body: { name: 'New Co', firmId: 'ATTACKER-firm', createdBy: 'ATTACKER' }
    }), res)

    const params = db.execute.mock.calls[1][1]
    expect(params[1]).toBe('firm-from-jwt')
    expect(params[4]).toBe('advisor-from-jwt')
  })
})

// ── renameClient ──────────────────────────────────────────────────────────────

describe('renameClient', () => {
  test('renames a firm-owned client: label changes, id (and so case history) survives', async () => {
    db.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
      .mockResolvedValueOnce([[clientRow({ name: 'Vanoss Group', name_key: 'vanossgroup' })]]) // getById
    const res = makeMockRes()

    await renameClient(makeReq({ params: { id: 'client-1' }, body: { name: 'Vanoss Group' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.client.id).toBe('client-1') // identity unchanged
    expect(res._body.client.name).toBe('Vanoss Group')
    // The UPDATE is firm-scoped from the JWT.
    const params = db.execute.mock.calls[0][1]
    expect(params).toEqual(['Vanoss Group', 'vanossgroup', 'client-1', 'firm-from-jwt'])
  })

  test("another firm's client id returns 404, exactly as if it did not exist", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    const res = makeMockRes()

    await renameClient(makeReq({ params: { id: 'other-firms-client' }, body: { name: 'Hijack' } }), res)

    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
  })

  test('rejects a blank name without touching the DB', async () => {
    const res = makeMockRes()
    await renameClient(makeReq({ params: { id: 'client-1' }, body: { name: ' ' } }), res)

    expect(res._status).toBe(400)
    expect(db.execute).not.toHaveBeenCalled()
  })
})
