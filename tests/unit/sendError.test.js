'use strict'

const { sendError } = require('../../server/utils/sendError')

function makeMockRes () {
  const res = {
    headersSent: false,
    _status: null,
    _headers: null,
    _body: null,
    _ended: false,
    writeHead (status, headers) {
      this._status = status
      this._headers = headers
      this.headersSent = true
    },
    end (body) {
      this._body = body
      this._ended = true
    }
  }
  return res
}

describe('sendError', () => {
  test('writes correct status code', () => {
    const res = makeMockRes()
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON')
    expect(res._status).toBe(400)
  })

  test('sets Content-Type to application/json', () => {
    const res = makeMockRes()
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON')
    expect(res._headers['Content-Type']).toBe('application/json')
  })

  test('body contains success: false', () => {
    const res = makeMockRes()
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON')
    const body = JSON.parse(res._body)
    expect(body.success).toBe(false)
  })

  test('body contains error.code', () => {
    const res = makeMockRes()
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON')
    const body = JSON.parse(res._body)
    expect(body.error.code).toBe('INVALID_JSON')
  })

  test('body contains error.message', () => {
    const res = makeMockRes()
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON')
    const body = JSON.parse(res._body)
    expect(body.error.message).toBe('Invalid JSON')
  })

  test('body contains a valid ISO timestamp', () => {
    const res = makeMockRes()
    sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error')
    const body = JSON.parse(res._body)
    expect(typeof body.timestamp).toBe('string')
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  test('ends the response', () => {
    const res = makeMockRes()
    sendError(res, 413, 'BODY_TOO_LARGE', 'Request body too large')
    expect(res._ended).toBe(true)
  })

  test('does nothing if headers already sent', () => {
    const res = makeMockRes()
    res.headersSent = true
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON')
    expect(res._status).toBeNull()
    expect(res._ended).toBe(false)
  })

  test('works for all standard error codes', () => {
    const cases = [
      [400, 'REQUEST_ERROR', 'Request error'],
      [413, 'BODY_TOO_LARGE', 'Request body too large'],
      [400, 'INVALID_JSON', 'Invalid JSON'],
      [400, 'INVALID_REQUEST', 'Invalid request body'],
      [400, 'QUERY_REQUIRED', 'Query is required'],
      [400, 'PARAMS_REQUIRED', 'texts and langCode are required'],
      [500, 'INTERNAL_ERROR', 'Internal server error'],
      [500, 'TRANSLATION_FAILED', 'Translation failed']
    ]
    for (const [status, code, message] of cases) {
      const res = makeMockRes()
      sendError(res, status, code, message)
      const body = JSON.parse(res._body)
      expect(body).toMatchObject({ success: false, error: { code, message } })
      expect(res._status).toBe(status)
    }
  })
})
