'use strict'

/**
 * THE ADVISOR FIRM'S BRAND — GET /api/report/firm/brand (item 16.2).
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS. A tester looks at a printed plan and sees a logo
 * or does not; none of the below shows on screen:
 *   - a failing lookup answering 200 WITH NULLS rather than an error, because a thrown
 *     brand would take a client's whole plan down over a piece of decoration;
 *   - the firm coming from the verified token and never from the request, so one firm
 *     can never read another's brand;
 *   - `isDefault` telling "this firm holds no logo" apart from "we could not look",
 *     which is what decides between the initials disc and a retry;
 *   - a malformed logo or colour arriving as null rather than being rendered — the
 *     validation lives in firmBrand(), and this proves the route does not undo it.
 */

jest.mock('../../server/utils/firmsDirectory', () => ({ firmBrand: jest.fn() }))

const directory = require('../../server/utils/firmsDirectory')
const route = require('../../server/routes/firmBrand')

const FIRM = 'firm-test-123'

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

const makeReq = () => ({ firmId: FIRM })

beforeEach(() => { jest.clearAllMocks() })

describe('the brand a client document is branded with', () => {
  test('a firm with a logo and a colour gets all three back', async () => {
    directory.firmBrand.mockResolvedValue({
      id: FIRM, name: 'Ashgrove Advisory', logo: 'https://cdn.example/ash.png', colour: '#7a4b8f'
    })
    const res = makeMockRes()
    await route.get(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({
      name: 'Ashgrove Advisory',
      logo: 'https://cdn.example/ash.png',
      colour: '#7a4b8f',
      isDefault: false
    })
  })

  test('the firm is taken from the token, never from the request', async () => {
    directory.firmBrand.mockResolvedValue({ id: FIRM, name: 'Ashgrove', logo: null, colour: null })
    await route.get(makeReq(), makeMockRes())
    expect(directory.firmBrand).toHaveBeenCalledWith(FIRM)
  })

  test('a name with no logo still resolves — the renderer falls back to the disc', async () => {
    directory.firmBrand.mockResolvedValue({ id: FIRM, name: 'Ashgrove Advisory', logo: null, colour: null })
    const res = makeMockRes()
    await route.get(makeReq(), res)
    expect(res._body.name).toBe('Ashgrove Advisory')
    expect(res._body.logo).toBeNull()
    // A firm we could read but that holds no logo is NOT the default state.
    expect(res._body.isDefault).toBe(false)
  })

  test('an unknown firm answers 200 with nulls, marked as the default', async () => {
    directory.firmBrand.mockResolvedValue(null)
    const res = makeMockRes()
    await route.get(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ name: null, logo: null, colour: null, isDefault: true })
  })
})

// ── The one that matters most ───────────────────────────────────────────────

describe('a failing lookup never breaks the document', () => {
  test('🔴 a thrown lookup is 200 with nulls, NOT an error body', async () => {
    directory.firmBrand.mockRejectedValue(new Error('db down'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()
    await route.get(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ name: null, logo: null, colour: null, isDefault: true })
    // No error envelope: a brand is decoration on a page whose figures matter.
    expect(res._body.success).toBeUndefined()
    expect(res._body.error).toBeUndefined()
    spy.mockRestore()
  })

  test('the failure is logged server-side, and the message never reaches the client', async () => {
    directory.firmBrand.mockRejectedValue(new Error('ER_ACCESS_DENIED at 10.0.0.4'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()
    await route.get(makeReq(), res)
    expect(spy).toHaveBeenCalled()
    expect(JSON.stringify(res._body)).not.toMatch(/ER_ACCESS_DENIED|10\.0\.0\.4/)
    spy.mockRestore()
  })

  test('an empty brand object is still the default state', async () => {
    directory.firmBrand.mockResolvedValue({ id: FIRM, name: null, logo: null, colour: null })
    const res = makeMockRes()
    await route.get(makeReq(), res)
    expect(res._body.isDefault).toBe(true)
  })
})
