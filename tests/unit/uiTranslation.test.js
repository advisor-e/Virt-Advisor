'use strict'

/**
 * server/utils/uiTranslation.js — the app's wording translated once per language by the
 * backend and shared (Mike, 2026-09-25).
 *
 * What these guard is what UAT cannot see: a translation that drops a `{name}` prints a blank
 * where a name belongs, one that drops a `|` breaks a plural, one that changes a tag puts
 * model-written markup into a `v-html`, and a batch that fails must stay English and be
 * retried — never stored as translated, which is exactly how the MyMemory design failed.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const ui = require('../../server/utils/uiTranslation')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

/** A model that "translates" by prefixing, which keeps every placeholder, pipe and tag. */
function fakeClient (translate) {
  const fn = translate || (v => 'XX ' + v)
  return {
    chat: {
      completions: {
        create: jest.fn((params) => {
          const payload = JSON.parse(params.messages[1].content)
          const out = {}
          Object.keys(payload).forEach((k) => { out[k] = fn(payload[k], k) })
          return Promise.resolve({ choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })
        })
      }
    }
  }
}

beforeEach(() => {
  ui._reset()
  overlay.loadFirmConfig.mockReset().mockResolvedValue(null)
  overlay.saveFirmConfig.mockReset().mockResolvedValue(1)
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { jest.restoreAllMocks() })

describe('checkTranslation — what a translated string must keep', () => {
  test('a faithful translation passes', () => {
    expect(ui.checkTranslation('Hello {name}', 'Bonjour {name}')).toEqual({ ok: true })
  })

  test.each([
    ['not a string', 'Hello', 42, 'not-a-string'],
    ['missing entirely', 'Hello', undefined, 'not-a-string'],
    ['empty', 'Hello', '   ', 'empty'],
    ['a placeholder dropped', 'Hi {name}', 'Salut', 'placeholders'],
    ['a placeholder translated', 'Hi {name}', 'Salut {nom}', 'placeholders'],
    ['a placeholder added', 'Hi', 'Salut {name}', 'placeholders'],
    ['a plural form lost', 'one item | {count} items', '{count} éléments', 'plural-forms'],
    ['a tag dropped', 'Remove <strong>{name}</strong>?', 'Supprimer {name} ?', 'tags'],
    ['an attribute added to a tag', 'Remove <strong>{name}</strong>?', 'Supprimer <strong onmouseover="x">{name}</strong> ?', 'tags'],
    ['message-link syntax introduced', 'Email us', 'Écrivez @:other', 'link-syntax'],
    ['wildly longer than the English', 'OK', 'x'.repeat(100), 'too-long'],
    ['a letter broken in decoding', 'Assets', 'Verm��genswerte', 'broken-character']
  ])('refuses %s', (_label, english, translated, reason) => {
    expect(ui.checkTranslation(english, translated)).toEqual({ ok: false, reason })
  })

  test('an empty English string may stay empty', () => {
    expect(ui.checkTranslation('', '')).toEqual({ ok: true })
  })

  test('placeholders may move within the sentence', () => {
    expect(ui.checkTranslation('{a} of {b}', '{b} の {a}')).toEqual({ ok: true })
  })
})

describe('buildBatches', () => {
  test('caps a batch by string count and by characters', () => {
    const flat = {}
    for (let i = 0; i < ui.BATCH_MAX_STRINGS + 5; i++) { flat['k' + i] = 'short' }
    flat.big1 = 'x'.repeat(ui.BATCH_MAX_CHARS - 10)
    flat.big2 = 'y'.repeat(ui.BATCH_MAX_CHARS - 10)
    const batches = ui.buildBatches(Object.keys(flat), flat)

    expect(batches.every(b => b.length <= ui.BATCH_MAX_STRINGS)).toBe(true)
    expect(batches.flat()).toEqual(Object.keys(flat))
    expect(batches.find(b => b.includes('big1'))).not.toContain('big2')
  })
})

describe('the English source', () => {
  test('holds the app wording and Collaborate\'s, with a stable version', () => {
    const { flat, version } = ui.englishSource()
    expect(flat['courseBuilder.picker.heading']).toBeDefined()
    expect(Object.keys(flat).some(k => k.startsWith('messages.'))).toBe(true)
    expect(ui.englishSource().version).toBe(version)
  })

  test('a shipped partial file is read for its own language only', () => {
    expect(Object.keys(ui.staticStrings('de')).length).toBeGreaterThan(0)
    expect(ui.staticStrings('ja')).toEqual({})
    expect(ui.staticStrings('en')).toEqual({})
  })
})

describe('getLocale — one language, translated once and shared', () => {
  test('refuses English and a code nobody offers', async () => {
    await expect(ui.getLocale('en')).rejects.toMatchObject({ code: 'UNKNOWN_LANGUAGE' })
    await expect(ui.getLocale('xx')).rejects.toMatchObject({ code: 'UNKNOWN_LANGUAGE' })
    await expect(ui.getLocale('__proto__')).rejects.toMatchObject({ code: 'UNKNOWN_LANGUAGE' })
  })

  test('the first ask starts a background translation and says so; a later ask is ready', async () => {
    const client = fakeClient()
    const first = await ui.getLocale('ja', '', { client })
    expect(first.status).toBe('translating')
    expect(first.total).toBe(Object.keys(ui.englishSource().flat).length)

    await ui._states.get('ja').jobPromise
    const ready = await ui.getLocale('ja', '', { client })

    expect(ready.status).toBe('ready')
    expect(ready.english).toBe(0)
    expect(ready.messages.courseBuilder.picker.heading).toBe('XX Your saved courses')
  })

  test('sends the model the app\'s wording only, as data, with privacy and moderation stated', async () => {
    const client = fakeClient()
    await ui.getLocale('ja', '', { client })
    await ui._states.get('ja').jobPromise

    const [params, options] = client.chat.completions.create.mock.calls[0]
    expect(options).toMatchObject({ personal: false, moderate: [] })
    expect(params.response_format).toEqual({ type: 'json_object' })
    const payload = JSON.parse(params.messages[1].content)
    const english = new Set(Object.values(ui.englishSource().flat))
    Object.values(payload).forEach(v => expect(english.has(v)).toBe(true))
  })

  test('the translation is stored at the platform scope, and a new process reads it back without calling the model', async () => {
    await ui.getLocale('ja', '', { client: fakeClient() })
    await ui._states.get('ja').jobPromise
    await ui._states.get('ja').saving

    const lastSave = overlay.saveFirmConfig.mock.calls[overlay.saveFirmConfig.mock.calls.length - 1]
    expect(lastSave[0]).toBe(PLATFORM_SCOPE)
    expect(lastSave[1]).toBe(ui.CONFIG_PREFIX + 'ja')

    ui._reset()
    overlay.loadFirmConfig.mockResolvedValue(lastSave[2])
    const client = fakeClient()
    const again = await ui.getLocale('ja', '', { client })

    expect(again.status).toBe('ready')
    expect(client.chat.completions.create).not.toHaveBeenCalled()
  })

  test('a string whose English changed is translated again; the rest are kept', async () => {
    const { flat } = ui.englishSource()
    const stored = {}
    Object.keys(flat).forEach((k) => { stored[k] = { h: 'stale', t: 'old' } })
    // Every string but one carries the hash of its current English.
    const crypto = require('crypto')
    Object.keys(flat).forEach((k) => {
      stored[k].h = crypto.createHash('sha1').update(flat[k]).digest('hex').slice(0, 12)
    })
    stored['courseBuilder.picker.heading'].h = 'stale'
    overlay.loadFirmConfig.mockResolvedValue({ strings: stored })
    const client = fakeClient()

    const first = await ui.getLocale('ja', '', { client })

    expect(first).toMatchObject({ status: 'translating', total: 1 })
  })

  test('a STORED string with a broken letter is translated again, and English is served meanwhile', async () => {
    const crypto = require('crypto')
    const { flat } = ui.englishSource()
    const stored = {}
    Object.keys(flat).forEach((k) => {
      stored[k] = { h: crypto.createHash('sha1').update(flat[k]).digest('hex').slice(0, 12), t: 'ok ' + flat[k] }
    })
    stored['courseBuilder.picker.heading'].t = 'Ihre gespeicherten Kurse ��'
    overlay.loadFirmConfig.mockResolvedValue({ strings: stored })

    const first = await ui.getLocale('ja', '', { client: fakeClient() })

    expect(first).toMatchObject({ status: 'translating', total: 1 })
  })

  test('the seven shipped files keep their wording, and only the rest is translated', async () => {
    const statics = ui.staticStrings('de')
    const client = fakeClient()
    const first = await ui.getLocale('de', '', { client })
    await ui._states.get('de').jobPromise
    const ready = await ui.getLocale('de', '', { client })

    expect(first.total).toBe(Object.keys(ui.englishSource().flat).length - Object.keys(statics).length)
    const someKey = Object.keys(statics)[0]
    const value = someKey.split('.').reduce((o, p) => o[p], ready.messages)
    expect(value).toBe(statics[someKey])
  })

  test('a batch the model fails is served in English, not stored, and not retried at once', async () => {
    const client = { chat: { completions: { create: jest.fn().mockRejectedValue(new Error('OpenAI API error 500: down')) } } }
    await ui.getLocale('ja', '', { client })
    await ui._states.get('ja').jobPromise
    await ui._states.get('ja').saving

    const ready = await ui.getLocale('ja', '', { client })
    expect(ready.status).toBe('ready')
    expect(ready.english).toBe(ready.total)
    expect(ready.messages.courseBuilder.picker.heading).toBe('Your saved courses')
    const saved = overlay.saveFirmConfig.mock.calls.map(c => c[2].strings)
    saved.forEach(s => expect(Object.keys(s)).toHaveLength(0))
  })

  test('a reply that is not JSON, and a string that fails its check, both stay English', async () => {
    let call = 0
    const client = {
      chat: {
        completions: {
          create: jest.fn((params) => {
            call += 1
            if (call === 1) { return Promise.resolve({ choices: [{ message: { content: 'not json' } }] }) }
            const payload = JSON.parse(params.messages[1].content)
            const out = {}
            Object.keys(payload).forEach((k) => { out[k] = 'XX' }) // drops every placeholder
            return Promise.resolve({ choices: [{ message: { content: JSON.stringify(out) } }] })
          })
        }
      }
    }
    await ui.getLocale('ja', '', { client })
    await ui._states.get('ja').jobPromise
    const ready = await ui.getLocale('ja', '', { client })

    expect(ready.messages.courseBuilder.picker.meta).toBe('{sessions} sessions · {complete} complete')
    expect(ready.english).toBeGreaterThan(0)
  })

  test('a browser holding the current version is told so rather than sent everything again', async () => {
    const client = fakeClient()
    await ui.getLocale('ja', '', { client })
    await ui._states.get('ja').jobPromise
    const ready = await ui.getLocale('ja', '', { client })

    const again = await ui.getLocale('ja', ready.version, { client })

    expect(again).toMatchObject({ status: 'ready', unchanged: true, version: ready.version })
    expect(again.messages).toBeUndefined()
  })

  test('no database: it still translates, into memory, and says why in the log', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no MySQL'))
    overlay.saveFirmConfig.mockRejectedValue(new Error('no MySQL'))
    const client = fakeClient()
    await ui.getLocale('ja', '', { client })
    await ui._states.get('ja').jobPromise
    await ui._states.get('ja').saving

    const ready = await ui.getLocale('ja', '', { client })
    expect(ready.status).toBe('ready')
    expect(ready.english).toBe(0)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('could not store'), 'no MySQL')
  })

  test('two readers asking at once start one translation, not two', async () => {
    const client = fakeClient()
    const [a, b] = await Promise.all([ui.getLocale('ja', '', { client }), ui.getLocale('ja', '', { client })])
    await ui._states.get('ja').jobPromise

    expect(a.status).toBe('translating')
    expect(b.status).toBe('translating')
    const batches = ui.buildBatches(Object.keys(ui.englishSource().flat), ui.englishSource().flat).length
    expect(client.chat.completions.create).toHaveBeenCalledTimes(batches)
  })
})

describe('flatten / unflatten', () => {
  test('round-trips, and a forbidden key never becomes a real path', () => {
    const flat = ui.flatten({ a: { b: 'x' }, c: 'y' })
    expect(flat).toEqual({ 'a.b': 'x', c: 'y' })
    expect(ui.unflatten(flat)).toEqual({ a: { b: 'x' }, c: 'y' })
    const polluted = ui.unflatten({ '__proto__.bad': 'x', 'constructor.prototype.bad': 'y', ok: 'z' })
    expect(polluted).toEqual({ ok: 'z' })
    expect({}.bad).toBeUndefined()
  })
})
