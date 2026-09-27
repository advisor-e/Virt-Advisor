/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * utils/uiLocaleLoader.js — how the browser gets a language's wording from the backend.
 *
 * Guards what a reader cannot see: that a mostly-English result is refused rather than
 * shown as the language, that the old MyMemory cache (which could hold exactly that) is
 * thrown away, and that neither the reply nor the browser cache can pollute Object.prototype.
 */

const loader = require('~/utils/uiLocaleLoader')

function reply (body, ok) {
  return { ok: ok !== false, status: ok === false ? 502 : 200, json: () => Promise.resolve(body) }
}

const READY = { success: true, status: 'ready', version: 'v1', english: 0, total: 10, messages: { hello: 'Bonjour' } }

beforeEach(() => { window.localStorage.clear() })

test('asks the backend for the language by code, sending no text', async () => {
  const fetch = jest.fn().mockResolvedValue(reply(READY))

  const messages = await loader.loadUiLocale('fr', { fetch })

  expect(messages).toEqual({ hello: 'Bonjour' })
  const [url, opts] = fetch.mock.calls[0]
  expect(url).toBe('/api/ui-translation/fr')
  expect(opts.body).toBeUndefined()
  expect(opts.headers.Authorization).toMatch(/^Bearer /)
})

test('waits while the first translation runs, then takes the ready reply', async () => {
  const fetch = jest.fn()
    .mockResolvedValueOnce(reply({ success: true, status: 'translating', done: 1, total: 10 }))
    .mockResolvedValueOnce(reply(READY))
  const wait = jest.fn().mockResolvedValue()

  const messages = await loader.loadUiLocale('ja', { fetch, wait })

  expect(wait).toHaveBeenCalledWith(loader.POLL_MS)
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(messages).toEqual({ hello: 'Bonjour' })
})

test('keeps the result with its version, and sends that version next time', async () => {
  const fetch = jest.fn().mockResolvedValue(reply(READY))
  await loader.loadUiLocale('fr', { fetch })

  expect(JSON.parse(window.localStorage.getItem(loader.CACHE_PREFIX + 'fr')).version).toBe('v1')

  fetch.mockResolvedValue(reply({ success: true, status: 'ready', version: 'v1', unchanged: true, english: 0, total: 10 }))
  const again = await loader.loadUiLocale('fr', { fetch })

  expect(fetch.mock.calls[1][0]).toBe('/api/ui-translation/fr?have=v1')
  expect(again).toEqual({ hello: 'Bonjour' })
})

test('throws away the old MyMemory cache, which could hold a mostly-English translation', async () => {
  window.localStorage.setItem(loader.OLD_CACHE_PREFIX + 'fr', JSON.stringify({ hello: 'Hello' }))
  const fetch = jest.fn().mockResolvedValue(reply(READY))

  await loader.loadUiLocale('fr', { fetch })

  expect(window.localStorage.getItem(loader.OLD_CACHE_PREFIX + 'fr')).toBeNull()
})

test('a result that is mostly English is a failure, not the language', async () => {
  const fetch = jest.fn().mockResolvedValue(reply(Object.assign({}, READY, { english: 6, total: 10 })))

  await expect(loader.loadUiLocale('ja', { fetch })).rejects.toThrow(/mostly unavailable/)
})

test.each([
  ['an HTTP failure', reply({}, false)],
  ['the error envelope', reply({ success: false, error: { code: 'X', message: 'y' } })],
  ['an unknown status', reply({ success: true, status: 'weird' })],
  ['a ready reply with no messages', reply({ success: true, status: 'ready', version: 'v', english: 0, total: 1 })]
])('%s throws, so the picker leaves the reader where they were', async (_label, response) => {
  const fetch = jest.fn().mockResolvedValue(response)

  await expect(loader.loadUiLocale('ja', { fetch })).rejects.toThrow()
})

test('gives up on a translation still running after twenty minutes', async () => {
  const fetch = jest.fn().mockResolvedValue(reply({ success: true, status: 'translating', done: 0, total: 10 }))
  const now = jest.spyOn(Date, 'now')
  let t = 0
  now.mockImplementation(() => t)
  const wait = jest.fn(() => { t += loader.GIVE_UP_MS; return Promise.resolve() })

  await expect(loader.loadUiLocale('ja', { fetch, wait })).rejects.toThrow(/still running/)
  now.mockRestore()
})

describe('the reader\'s language survives a page load', () => {
  function fakeI18n (messages) {
    return { locale: 'en', messages: messages || { en: {} }, setLocaleMessage: jest.fn() }
  }

  test('a remembered language opens at once from this browser\'s copy, then refreshes', async () => {
    loader.rememberReaderLocale('fr')
    window.localStorage.setItem(loader.CACHE_PREFIX + 'fr', JSON.stringify({ version: 'v0', messages: { hello: 'Salut' } }))
    const fetch = jest.fn().mockResolvedValue(reply(READY))
    const i18n = fakeI18n()

    await loader.restoreReaderLocale(i18n, { fetch })

    expect(i18n.setLocaleMessage.mock.calls[0]).toEqual(['fr', { hello: 'Salut' }])
    expect(i18n.setLocaleMessage.mock.calls[1]).toEqual(['fr', { hello: 'Bonjour' }])
    expect(i18n.locale).toBe('fr')
  })

  test('nothing remembered, or English remembered, changes nothing and asks nothing', async () => {
    const fetch = jest.fn()
    const i18n = fakeI18n()
    await loader.restoreReaderLocale(i18n, { fetch })
    loader.rememberReaderLocale('en')
    await loader.restoreReaderLocale(i18n, { fetch })

    expect(fetch).not.toHaveBeenCalled()
    expect(i18n.locale).toBe('en')
  })

  test('a backend failure keeps a shipped language on its own file, and anything else in English', async () => {
    const fetch = jest.fn().mockResolvedValue(reply({}, false))
    loader.rememberReaderLocale('de')
    const shipped = fakeI18n({ en: {}, de: { hello: 'Hallo' } })
    await loader.restoreReaderLocale(shipped, { fetch })
    expect(shipped.locale).toBe('de')

    loader.rememberReaderLocale('ja')
    const unshipped = fakeI18n()
    await loader.restoreReaderLocale(unshipped, { fetch })
    expect(unshipped.locale).toBe('en')
  })
})

test('a forbidden key in the reply or the cache never reaches the page', async () => {
  const poisoned = JSON.parse('{"__proto__":{"polluted":"yes"},"a":{"constructor":{"prototype":{"owned":"yes"}},"b":"ok"}}')
  const fetch = jest.fn().mockResolvedValue(reply(Object.assign({}, READY, { messages: poisoned })))

  const messages = await loader.loadUiLocale('fr', { fetch })

  expect(messages).toEqual({ a: { b: 'ok' } })
  expect({}.polluted).toBeUndefined()
  expect({}.owned).toBeUndefined()
})
