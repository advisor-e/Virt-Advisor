/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * localeMixin — the language picker, and switching the reader to the translated wording.
 *
 * How the wording is fetched, cached and cleaned of prototype-polluting keys is
 * utils/uiLocaleLoader.js, tested in uiLocaleLoader.test.js. What is pinned here:
 *
 *   1. WHEN THE LANGUAGE CHANGES — only after a successful load, except a shipped language
 *      whose own file still beats refusing it when the backend cannot help.
 *   2. A DOCUMENT-LEVEL CLICK LISTENER added in mounted() and removed in beforeDestroy().
 *      That is the same teardown class as the microphone defect recorded in
 *      speechMixin.component.test.js — a listener that outlives its component keeps
 *      firing against a destroyed instance.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const localeMixin = require('~/mixins/localeMixin').default
const LANGUAGES = require('~/data/languages.json')

const FR = LANGUAGES.find(l => l.code === 'fr')
const ES = LANGUAGES.find(l => l.code === 'es')

// A host carrying the two refs the mixin reaches for, so the picker's focus and
// click-outside behaviour are exercised as they are in the real header.
const Host = {
  name: 'LocaleHost',
  mixins: [localeMixin],
  render (h) {
    return h('div', { ref: 'langPicker' }, [
      h('input', { ref: 'langSearch' }),
      h('span', 'inside')
    ])
  }
}

function makeI18n (overrides) {
  return Object.assign({
    locale: 'en',
    messages: { en: { hello: 'Hello', nested: { deep: 'Deep' } } },
    setLocaleMessage: jest.fn()
  }, overrides)
}

function mountHost (i18n) {
  return mountWithBuefy(Host, { mocks: { $i18n: i18n || makeI18n() } })
}

beforeEach(() => {
  window.localStorage.clear()
  global.fetch = jest.fn()
})

afterEach(() => {
  delete global.fetch
  jest.clearAllMocks()
})

describe('localeMixin — what the picker shows', () => {
  test('names the current language from the shared language list', () => {
    const wrapper = mountHost(makeI18n({ locale: 'fr' }))

    expect(wrapper.vm.currentLanguageName).toBe(FR.name)
  })

  test('falls back to the raw code for a language not in the list', () => {
    const wrapper = mountHost(makeI18n({ locale: 'kl' }))

    expect(wrapper.vm.currentLanguageName).toBe('kl')
  })

  test('lists every language when the search box is empty', () => {
    const wrapper = mountHost()

    expect(wrapper.vm.filteredLanguages).toHaveLength(LANGUAGES.length)
  })

  test('filters by name, case-insensitively', () => {
    const wrapper = mountHost()
    wrapper.vm.langSearch = ES.name.toUpperCase()

    expect(wrapper.vm.filteredLanguages).toContainEqual(ES)
  })

  test('filters by language code too', () => {
    const wrapper = mountHost()
    wrapper.vm.langSearch = 'fr'

    expect(wrapper.vm.filteredLanguages.map(l => l.code)).toContain('fr')
  })
})

describe('localeMixin — opening and closing', () => {
  test('opening focuses the search box', async () => {
    const wrapper = mountHost()
    const focus = jest.spyOn(wrapper.vm.$refs.langSearch, 'focus')

    wrapper.vm.toggleLangPicker()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.langPickerOpen).toBe(true)
    expect(focus).toHaveBeenCalled()
  })

  test('closing clears the search text and any error', () => {
    const wrapper = mountHost()
    wrapper.vm.langPickerOpen = true
    wrapper.vm.langSearch = 'span'
    wrapper.vm.langError = 'Translation failed — please try again.'

    wrapper.vm.toggleLangPicker()

    expect(wrapper.vm.langPickerOpen).toBe(false)
    expect(wrapper.vm.langSearch).toBe('')
    expect(wrapper.vm.langError).toBeNull()
  })

  test('a click outside the picker closes it', () => {
    const wrapper = mountHost()
    wrapper.vm.langPickerOpen = true

    document.body.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

    expect(wrapper.vm.langPickerOpen).toBe(false)
  })

  test('a click INSIDE the picker leaves it open', () => {
    const wrapper = mountHost()
    wrapper.vm.langPickerOpen = true

    wrapper.vm.$refs.langSearch.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

    expect(wrapper.vm.langPickerOpen).toBe(true)
  })

  test('the document listener is removed on destroy, not left firing', () => {
    const remove = jest.spyOn(document, 'removeEventListener')
    const wrapper = mountHost()

    wrapper.destroy()

    expect(remove).toHaveBeenCalledWith('click', expect.any(Function))
    remove.mockRestore()
  })
})

describe('localeMixin — changing language', () => {
  const READY = { success: true, status: 'ready', version: 'v1', english: 0, total: 1, messages: { hello: 'Bonjour' } }
  const ok = body => ({ ok: true, json: () => Promise.resolve(body) })

  test('does nothing while another language is still loading', async () => {
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)
    wrapper.vm.loadingLang = 'de'

    await wrapper.vm.changeLocale(FR)

    expect(i18n.locale).toBe('en')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('choosing the current language just closes the picker', async () => {
    const i18n = makeI18n({ locale: 'fr' })
    const wrapper = mountHost(i18n)
    wrapper.vm.langPickerOpen = true

    await wrapper.vm.changeLocale(FR)

    expect(wrapper.vm.langPickerOpen).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('English switches with no translation call', async () => {
    const i18n = makeI18n({ locale: 'fr' })
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(LANGUAGES.find(l => l.code === 'en'))

    expect(i18n.locale).toBe('en')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('a language is loaded from the backend, then applied', async () => {
    global.fetch.mockResolvedValue(ok(READY))
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(FR)

    expect(global.fetch.mock.calls[0][0]).toBe('/api/ui-translation/fr')
    expect(i18n.setLocaleMessage).toHaveBeenCalledWith('fr', { hello: 'Bonjour' })
    expect(i18n.locale).toBe('fr')
    expect(wrapper.vm.loadingLang).toBeNull()
    expect(wrapper.vm.langPickerOpen).toBe(false)
    // Remembered, so the next page opens in it.
    expect(window.localStorage.getItem('va_reader_locale')).toBe('fr')
  })

  test('a SHIPPED language still asks the backend — that is what fills in the rest of it', async () => {
    global.fetch.mockResolvedValue(ok(READY))
    const i18n = makeI18n({ messages: { en: { hello: 'Hello' }, fr: { other: 'Autre' } } })
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(FR)

    expect(global.fetch).toHaveBeenCalled()
    expect(i18n.setLocaleMessage).toHaveBeenCalledWith('fr', { hello: 'Bonjour' })
  })

  test('a failed load with no shipped file shows an error and leaves the language alone', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 502 })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(ES)

    expect(wrapper.vm.langError).toBe('Translation failed — please try again.')
    expect(wrapper.vm.loadingLang).toBeNull()
    expect(i18n.locale).toBe('en')
    expect(i18n.setLocaleMessage).not.toHaveBeenCalled()
  })

  test('a failed load for a shipped language still switches, on its own file', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 502 })
    const i18n = makeI18n({ messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } } })
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(FR)

    expect(i18n.locale).toBe('fr')
    expect(wrapper.vm.langError).toBeNull()
    expect(i18n.setLocaleMessage).not.toHaveBeenCalled()
  })
})
