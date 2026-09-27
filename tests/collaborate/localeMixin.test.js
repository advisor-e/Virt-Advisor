'use strict'

/**
 * Tests for the language-switcher mixin (mixins/localeMixin.js).
 *
 * Methods/computed/hooks are invoked against a mock component `this`, with the
 * browser globals it touches (document, localStorage, fetch) stubbed per test.
 * Covers the picker open/close logic, locale switching (loaded, and failure paths —
 * the loading itself is utils/uiLocaleLoader.js, tested on its own), and the
 * outside-click document handler.
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

  test('English switches with no call to the backend', async () => {
    global.fetch = jest.fn()
    const c = { loadingLang: null, $i18n: { locale: 'fr', messages: { en: {} } }, closeLangPicker: jest.fn() }
    await mixin.methods.changeLocale.call(c, { code: 'en' })
    expect(c.$i18n.locale).toBe('en')
    expect(global.fetch).not.toHaveBeenCalled()
    delete global.fetch
  })

  test('loads the language from the backend — shipped or not — then switches', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, status: 'ready', version: 'v', english: 0, total: 1, messages: { hi: 'Salut' } })
    }))
    const setLocaleMessage = jest.fn()
    const c = {
      loadingLang: null,
      $i18n: { locale: 'en', messages: { en: {}, fr: {} }, setLocaleMessage },
      closeLangPicker: jest.fn()
    }
    await mixin.methods.changeLocale.call(c, { code: 'fr' })
    expect(global.fetch.mock.calls[0][0]).toBe('/api/ui-translation/fr')
    expect(setLocaleMessage).toHaveBeenCalledWith('fr', { hi: 'Salut' })
    expect(c.$i18n.locale).toBe('fr')
    expect(c.loadingLang).toBeNull()
    delete global.fetch
  })

  test('records an error and does not switch when the load fails and nothing is shipped', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 502 }))
    const c = { loadingLang: null, $i18n: { locale: 'en', messages: { en: {} }, setLocaleMessage: jest.fn() }, closeLangPicker: jest.fn() }
    await mixin.methods.changeLocale.call(c, { code: 'ja' })
    expect(c.$i18n.locale).toBe('en')
    expect(c.langError).toMatch(/failed/i)
    expect(c.loadingLang).toBeNull()
    delete global.fetch
  })

  test('a failed load for a shipped language still switches, on its own file', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 502 }))
    const c = { loadingLang: null, $i18n: { locale: 'en', messages: { en: {}, fr: {} }, setLocaleMessage: jest.fn() }, closeLangPicker: jest.fn() }
    await mixin.methods.changeLocale.call(c, { code: 'fr' })
    expect(c.$i18n.locale).toBe('fr')
    expect(c.langError).toBeNull()
    delete global.fetch
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
