'use strict'

/**
 * Tests for the language-switcher mixin (mixins/localeMixin.js).
 *
 * Methods/computed/hooks are invoked against a mock component `this`, with the
 * browser globals it touches (document, localStorage, fetch) stubbed per test.
 * Covers the picker open/close logic, locale switching (cached, fetched, and
 * failure paths), and the outside-click document handler.
 */

import mixin from '../../mixins/collaborate/localeMixin'

function data () { return mixin.data() }

describe('data', () => {
  test('starts with the picker closed and no error', () => {
    expect(data()).toEqual({ langPickerOpen: false, langSearch: '', loadingLang: null, langError: null })
  })
})

describe('computed', () => {
  test('currentLanguageName resolves the active locale name', () => {
    expect(mixin.computed.currentLanguageName.call({ $i18n: { locale: 'de' } })).toBe('Deutsch')
  })

  test('currentLanguageName falls back to the raw code when unknown', () => {
    expect(mixin.computed.currentLanguageName.call({ $i18n: { locale: 'zz' } })).toBe('zz')
  })

  test('filteredLanguages returns everything with no search', () => {
    const all = mixin.computed.filteredLanguages.call({ langSearch: '' })
    expect(all.length).toBeGreaterThan(10)
  })

  test('filteredLanguages matches on name or code', () => {
    const hits = mixin.computed.filteredLanguages.call({ langSearch: 'deu' })
    expect(hits.some(l => l.code === 'de')).toBe(true)
    expect(hits.every(l => l.name.toLowerCase().includes('deu') || l.code.includes('deu'))).toBe(true)
  })
})

describe('picker open/close', () => {
  test('toggleLangPicker opens and focuses the search box', () => {
    const focus = jest.fn()
    const c = { langPickerOpen: false, $nextTick: fn => fn(), $refs: { langSearch: { focus } } }
    mixin.methods.toggleLangPicker.call(c)
    expect(c.langPickerOpen).toBe(true)
    expect(focus).toHaveBeenCalled()
  })

  test('toggleLangPicker closing resets the search + error', () => {
    const c = { langPickerOpen: true, langSearch: 'x', langError: 'oops' }
    mixin.methods.toggleLangPicker.call(c)
    expect(c.langPickerOpen).toBe(false)
    expect(c.langSearch).toBe('')
    expect(c.langError).toBeNull()
  })

  test('closeLangPicker resets everything', () => {
    const c = { langPickerOpen: true, langSearch: 'x', langError: 'e' }
    mixin.methods.closeLangPicker.call(c)
    expect(c).toEqual({ langPickerOpen: false, langSearch: '', langError: null })
  })
})

describe('changeLocale', () => {
  test('ignores a change while a load is already in flight', async () => {
    const c = { loadingLang: 'de', $i18n: { locale: 'en' }, closeLangPicker: jest.fn() }
    await mixin.methods.changeLocale.call(c, { code: 'fr' })
    expect(c.$i18n.locale).toBe('en')
    expect(c.closeLangPicker).not.toHaveBeenCalled()
  })

  test('just closes the picker when the locale is already active', async () => {
    const c = { loadingLang: null, $i18n: { locale: 'en' }, closeLangPicker: jest.fn() }
    await mixin.methods.changeLocale.call(c, { code: 'en' })
    expect(c.closeLangPicker).toHaveBeenCalled()
  })

  test('switches directly when the locale is already loaded', async () => {
    const c = {
      loadingLang: null,
      $i18n: { locale: 'en', messages: { en: {}, fr: {} } },
      closeLangPicker: jest.fn()
    }
    await mixin.methods.changeLocale.call(c, { code: 'fr' })
    expect(c.$i18n.locale).toBe('fr')
    expect(c.closeLangPicker).toHaveBeenCalled()
  })

  test('loads a missing locale, then switches', async () => {
    const loadDynamicLocale = jest.fn(() => Promise.resolve())
    const c = {
      loadingLang: null,
      $i18n: { locale: 'en', messages: { en: {} } },
      loadDynamicLocale,
      closeLangPicker: jest.fn()
    }
    await mixin.methods.changeLocale.call(c, { code: 'fr' })
    expect(loadDynamicLocale).toHaveBeenCalled()
    expect(c.$i18n.locale).toBe('fr')
    expect(c.loadingLang).toBeNull()
  })

  test('records an error and does not switch when the load fails', async () => {
    const c = {
      loadingLang: null,
      $i18n: { locale: 'en', messages: { en: {} } },
      loadDynamicLocale: jest.fn(() => Promise.reject(new Error('down'))),
      closeLangPicker: jest.fn()
    }
    await mixin.methods.changeLocale.call(c, { code: 'fr' })
    expect(c.$i18n.locale).toBe('en')
    expect(c.langError).toMatch(/failed/i)
    expect(c.loadingLang).toBeNull()
  })
})

describe('loadDynamicLocale', () => {
  afterEach(() => { delete global.localStorage; delete global.fetch })

  test('uses the cached translation without calling the API', async () => {
    const setLocaleMessage = jest.fn()
    global.localStorage = { getItem: jest.fn(() => JSON.stringify({ a: { b: 'cached' } })), setItem: jest.fn() }
    global.fetch = jest.fn()
    const c = { $i18n: { setLocaleMessage, messages: { en: {} } } }

    await mixin.methods.loadDynamicLocale.call(c, { code: 'fr' })

    expect(setLocaleMessage).toHaveBeenCalledWith('fr', { a: { b: 'cached' } })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('fetches, un-flattens, applies and caches when not cached', async () => {
    const setLocaleMessage = jest.fn()
    const setItem = jest.fn()
    global.localStorage = { getItem: jest.fn(() => null), setItem }
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ 'greeting.hello': 'Bonjour' }) }))
    const c = { $i18n: { setLocaleMessage, messages: { en: { greeting: { hello: 'Hello' } } } } }

    await mixin.methods.loadDynamicLocale.call(c, { code: 'fr' })

    expect(global.fetch).toHaveBeenCalledWith('/api/translate/locale', expect.objectContaining({ method: 'POST' }))
    expect(setLocaleMessage).toHaveBeenCalledWith('fr', { greeting: { hello: 'Bonjour' } })
    expect(setItem).toHaveBeenCalledWith('va_locale_fr', JSON.stringify({ greeting: { hello: 'Bonjour' } }))
  })

  test('throws on a non-OK HTTP response', async () => {
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() }
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 502 }))
    const c = { $i18n: { setLocaleMessage: jest.fn(), messages: { en: {} } } }

    await expect(mixin.methods.loadDynamicLocale.call(c, { code: 'fr' })).rejects.toThrow('HTTP 502')
  })

  test('throws when the API returns an error payload', async () => {
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() }
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ error: { message: 'quota' } }) }))
    const c = { $i18n: { setLocaleMessage: jest.fn(), messages: { en: {} } } }

    await expect(mixin.methods.loadDynamicLocale.call(c, { code: 'fr' })).rejects.toThrow('quota')
  })
})

describe('outside-click handler (mounted/beforeDestroy)', () => {
  afterEach(() => { delete global.document })

  test('closes the picker on a click outside, and cleans up on destroy', () => {
    let handler
    global.document = {
      addEventListener: jest.fn((ev, h) => { handler = h }),
      removeEventListener: jest.fn()
    }
    const closeLangPicker = jest.fn()
    const c = { $refs: { langPicker: { contains: () => false } }, closeLangPicker }

    mixin.mounted.call(c)
    expect(global.document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))

    handler({ target: {} }) // click outside the picker
    expect(closeLangPicker).toHaveBeenCalled()

    mixin.beforeDestroy.call(c)
    expect(global.document.removeEventListener).toHaveBeenCalledWith('click', c._onDocClick)
  })

  test('ignores a click inside the picker', () => {
    let handler
    global.document = { addEventListener: jest.fn((ev, h) => { handler = h }), removeEventListener: jest.fn() }
    const closeLangPicker = jest.fn()
    const c = { $refs: { langPicker: { contains: () => true } }, closeLangPicker }

    mixin.mounted.call(c)
    handler({ target: {} }) // click inside → no close
    expect(closeLangPicker).not.toHaveBeenCalled()
  })
})
