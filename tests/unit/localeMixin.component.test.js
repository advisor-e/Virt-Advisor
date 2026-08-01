/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * localeMixin — the language picker, and the on-demand AI translation of the whole UI.
 *
 * Untested until 2026-07-30 (design/COVERAGE-DEBT.md), and it carries two things worth
 * more than the coverage number:
 *
 *   1. PROTOTYPE-POLLUTION GUARDS. `loadDynamicLocale` sends the flattened English
 *      messages to an LLM route and turns the reply back into a nested object. Building
 *      an object from keys you did not author is the classic pollution path — a returned
 *      key of `__proto__.x` or `constructor.prototype.x` would otherwise write onto every
 *      object in the page. The mixin filters FORBIDDEN_KEYS on both the flatten and the
 *      unflatten side; nothing was checking that it still does.
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

  test('an already-loaded language switches with no translation call', async () => {
    const i18n = makeI18n({ messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } } })
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(FR)

    expect(i18n.locale).toBe('fr')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('an unloaded language is translated first, then applied', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ hello: 'Bonjour' }) })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(FR)

    expect(i18n.setLocaleMessage).toHaveBeenCalledWith('fr', { hello: 'Bonjour' })
    expect(i18n.locale).toBe('fr')
    expect(wrapper.vm.loadingLang).toBeNull()
    expect(wrapper.vm.langPickerOpen).toBe(false)
  })

  test('a failed translation shows an error and leaves the language alone', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 502 })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(FR)

    expect(wrapper.vm.langError).toBe('Translation failed — please try again.')
    expect(wrapper.vm.loadingLang).toBeNull()
    expect(i18n.locale).toBe('en')
    expect(i18n.setLocaleMessage).not.toHaveBeenCalled()
  })

  test("the route's error envelope is treated as a failure, not as translations", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: { code: 'TRANSLATE_FAILED', message: 'upstream refused' } })
    })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.changeLocale(FR)

    expect(wrapper.vm.langError).toBe('Translation failed — please try again.')
    expect(i18n.setLocaleMessage).not.toHaveBeenCalled()
  })
})

describe('localeMixin — the translation cache', () => {
  test('sends the flattened English messages and the target code', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ hello: 'Bonjour' }) })
    const wrapper = mountHost()

    await wrapper.vm.loadDynamicLocale(FR)

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/translate/locale')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.langCode).toBe('fr')
    // Nested keys are sent flattened, dot-joined.
    expect(body.texts['nested.deep']).toBe('Deep')
  })

  test('caches the result, and a second load never calls the route again', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ hello: 'Bonjour' }) })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.loadDynamicLocale(FR)
    expect(window.localStorage.getItem('va_locale_fr')).toBe(JSON.stringify({ hello: 'Bonjour' }))

    global.fetch.mockClear()
    await wrapper.vm.loadDynamicLocale(FR)

    expect(global.fetch).not.toHaveBeenCalled()
    expect(i18n.setLocaleMessage).toHaveBeenCalledTimes(2)
  })

  test('rebuilds nested structure from the flat reply', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 'nested.deep': 'Profond', hello: 'Bonjour' })
    })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.loadDynamicLocale(FR)

    expect(i18n.setLocaleMessage).toHaveBeenCalledWith('fr', {
      hello: 'Bonjour',
      nested: { deep: 'Profond' }
    })
  })
})

// The reply is built by an LLM. Anything that turns keys it chose into an object must
// refuse the ones that write onto every object in the page.
describe('localeMixin — a translation reply cannot pollute the prototype', () => {
  test('a __proto__ key in the reply is dropped, and Object.prototype is untouched', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ '__proto__.polluted': 'yes', hello: 'Bonjour' })
    })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.loadDynamicLocale(FR)

    expect({}.polluted).toBeUndefined()
    const applied = i18n.setLocaleMessage.mock.calls[0][1]
    expect(applied).toEqual({ hello: 'Bonjour' })
  })

  test('a constructor.prototype key in the reply is dropped too', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 'constructor.prototype.owned': 'yes', hello: 'Bonjour' })
    })
    const i18n = makeI18n()
    const wrapper = mountHost(i18n)

    await wrapper.vm.loadDynamicLocale(FR)

    expect({}.owned).toBeUndefined()
    expect(i18n.setLocaleMessage.mock.calls[0][1]).toEqual({ hello: 'Bonjour' })
  })

  test('a forbidden key in the SOURCE messages is never sent for translation', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const messages = { en: { hello: 'Hello' } }
    // Assigned rather than written as a literal, which would set the real prototype.
    Object.defineProperty(messages.en, 'constructor', { value: { bad: 'x' }, enumerable: true, configurable: true })
    const wrapper = mountHost(makeI18n({ messages }))

    await wrapper.vm.loadDynamicLocale(ES)

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(Object.keys(body.texts)).toEqual(['hello'])
  })
})
