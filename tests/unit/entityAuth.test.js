'use strict'

const jwt = require('jsonwebtoken')
const { AUTH } = require('../../config/integration')

/**
 * The business-entity sign-in (design/features/business-entity-reports.md, the stub).
 *
 * Two things a person in UAT cannot see, and this pins both:
 *   1. A CLIENT token can never walk into an advisor route. It carries a firm id — the
 *      switch table is the firm's — so firmAuth would otherwise admit it to the client
 *      register, the cases, the activity. firmAuth refuses it by name.
 *   2. entityAuth fails CLOSED while the master team has issued no role value: with
 *      AUTH.businessEntityRole empty, no real token is a client, and the dev token is
 *      honoured only where every other dev token is.
 */
function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

function setEnv (key, value) {
  if (value === undefined) { delete process.env[key] } else { process.env[key] = value }
}

/** Re-require with the given env so module-load constants reflect the scenario. */
function authWithEnv ({ allowDevAuth, nodeEnv }) {
  let mod
  const prevAllow = process.env.ALLOW_DEV_AUTH
  const prevNode = process.env.NODE_ENV
  setEnv('ALLOW_DEV_AUTH', allowDevAuth)
  setEnv('NODE_ENV', nodeEnv)
  jest.isolateModules(() => { mod = require('../../server/middleware/firmAuth') })
  setEnv('ALLOW_DEV_AUTH', prevAllow)
  setEnv('NODE_ENV', prevNode)
  return mod
}

const DEV_ENTITY_TOKEN = 'dev-local-entity'
const sign = payload => jwt.sign(payload, AUTH.secret)

describe('entityAuth — the dev client sign-in, on the same terms as every dev token', () => {
  it('is refused by default (ALLOW_DEV_AUTH unset)', () => {
    const { entityAuth } = authWithEnv({ allowDevAuth: undefined, nodeEnv: 'development' })
    const res = makeMockRes(); const next = jest.fn()
    entityAuth({ headers: { authorization: `Bearer ${DEV_ENTITY_TOKEN}` } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  it('is refused in production even with ALLOW_DEV_AUTH=true', () => {
    const { entityAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'production' })
    const res = makeMockRes(); const next = jest.fn()
    entityAuth({ headers: { authorization: `Bearer ${DEV_ENTITY_TOKEN}` } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  it('in dev, signs in as a CLIENT of the dev firm — no advisor id, a client id', () => {
    const { entityAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const req = { headers: { authorization: `Bearer ${DEV_ENTITY_TOKEN}` } }
    const res = makeMockRes(); const next = jest.fn()
    entityAuth(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('dev-firm-001')
    expect(req.businessEntityId).toBe('dev-client-001')
    expect(req.advisorId).toBeNull()
    expect(req.userRole).toBe('business_entity')
  })
})

describe('entityAuth — real tokens, fail closed', () => {
  it('refuses any real token while the master team has issued no client role', () => {
    // AUTH.businessEntityRole is '' in config today, so this token — which even says
    // "business_entity" — is not a client. Nothing is until the value is supplied.
    expect(AUTH.businessEntityRole).toBe('')
    const { entityAuth } = authWithEnv({ allowDevAuth: undefined, nodeEnv: 'production' })
    const token = sign({ firmId: 'firm-1', role: 'business_entity', businessEntityId: 'c-1' })
    const res = makeMockRes(); const next = jest.fn()
    entityAuth({ headers: { authorization: `Bearer ${token}` } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NOT_A_BUSINESS_ENTITY')
  })

  it('refuses an advisor\'s token', () => {
    const { entityAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const token = sign({ firmId: 'firm-1', role: 'firm_manager', advisorId: 'a-1' })
    const res = makeMockRes(); const next = jest.fn()
    entityAuth({ headers: { authorization: `Bearer ${token}` } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
  })

  it('in dev, a real token with the dev tier name is a client only if it names its firm AND its id', () => {
    const { entityAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const ok = sign({ firmId: 'firm-1', role: 'business_entity', businessEntityId: 'c-1', email: 'c@x' })
    const req = { headers: { authorization: `Bearer ${ok}` } }
    const res = makeMockRes(); const next = jest.fn()
    entityAuth(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('firm-1')
    expect(req.businessEntityId).toBe('c-1')

    const noId = sign({ firmId: 'firm-1', role: 'business_entity' })
    const res2 = makeMockRes(); const next2 = jest.fn()
    entityAuth({ headers: { authorization: `Bearer ${noId}` } }, res2, next2)
    expect(next2).not.toHaveBeenCalled()
    expect(res2._status).toBe(403)
    expect(res2._body.error.code).toBe('MISSING_ENTITY_CLAIMS')
  })

  it('requires a Bearer token at all', () => {
    const { entityAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const res = makeMockRes(); const next = jest.fn()
    entityAuth({ headers: {} }, res, next)
    expect(res._status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('firmAuth — a client token never reaches an advisor route', () => {
  it('refuses a client token by name, even though it carries a firm id', () => {
    const { firmAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const token = sign({ firmId: 'firm-1', role: 'business_entity', businessEntityId: 'c-1' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes(); const next = jest.fn()
    firmAuth(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('BUSINESS_ENTITY_NOT_ALLOWED')
  })

  it('refuses the dev client token too — it is not one of firmAuth\'s dev tokens', () => {
    const { firmAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const res = makeMockRes(); const next = jest.fn()
    firmAuth({ headers: { authorization: `Bearer ${DEV_ENTITY_TOKEN}` } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  it('still admits an advisor exactly as before', () => {
    const { firmAuth } = authWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const token = sign({ firmId: 'firm-1', role: 'firm_manager', advisorId: 'a-1' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes(); const next = jest.fn()
    firmAuth(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.businessEntityId).toBeNull()
  })
})
