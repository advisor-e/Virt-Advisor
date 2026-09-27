'use strict'

/**
 * GET /api/ui-translation/:code — the route in front of server/utils/uiTranslation.js.
 * It passes a code and a version through, and never lets a failure's detail out.
 */

jest.mock('../../server/utils/uiTranslation', () => ({ getLocale: jest.fn() }))

const uiTranslation = require('../../server/utils/uiTranslation')
const route = require('../../server/routes/uiTranslation')

function fakeRes () {
  return { send: jest.fn(), writeHead: jest.fn(), end: jest.fn(), headersSent: false }
}

beforeEach(() => {
  uiTranslation.getLocale.mockReset()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { jest.restoreAllMocks() })

test('passes the code and the held version, and answers 200 with the result', async () => {
  uiTranslation.getLocale.mockResolvedValue({ status: 'ready', version: 'v2', unchanged: true })
  const res = fakeRes()

  await route.get({ params: { code: 'ja' }, query: { have: 'v2' } }, res)

  expect(uiTranslation.getLocale).toHaveBeenCalledWith('ja', 'v2')
  expect(res.send).toHaveBeenCalledWith(200, expect.objectContaining({ success: true, status: 'ready', unchanged: true }))
})

test('a missing version is sent as an empty one, never undefined', async () => {
  uiTranslation.getLocale.mockResolvedValue({ status: 'translating', done: 0, total: 5 })
  const res = fakeRes()

  await route.get({ params: { code: 'ja' }, query: {} }, res)

  expect(uiTranslation.getLocale).toHaveBeenCalledWith('ja', '')
})

test('an unknown language is a 400 with the standard envelope', async () => {
  const err = new Error('uiTranslation: unknown language "xx"')
  err.code = 'UNKNOWN_LANGUAGE'
  uiTranslation.getLocale.mockRejectedValue(err)
  const res = fakeRes()

  await route.get({ params: { code: 'xx' }, query: {} }, res)

  expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object))
  expect(JSON.parse(res.end.mock.calls[0][0])).toMatchObject({ success: false, error: { code: 'UNKNOWN_LANGUAGE' } })
})

test('any other failure is a 500 that does not repeat the internal message', async () => {
  uiTranslation.getLocale.mockRejectedValue(new Error('ER_ACCESS_DENIED at /srv/db.js:12'))
  const res = fakeRes()

  await route.get({ params: { code: 'ja' }, query: {} }, res)

  expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object))
  const body = res.end.mock.calls[0][0]
  expect(body).toContain('TRANSLATION_UNAVAILABLE')
  expect(body).not.toContain('ER_ACCESS_DENIED')
})
