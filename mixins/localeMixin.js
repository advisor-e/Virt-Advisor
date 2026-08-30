// Single source shared with the backend (server/utils/languageName.js) — the
// engine resolves the prompt's language name from this same list, by code.
import LANGUAGES from '~/data/languages.json'

/**
 * Keys that must never be written while rebuilding a nested object from dotted paths.
 *
 * WHY: `unflattenObj` walks a key like `a.b.c` and creates each level as it goes. A
 * translated payload containing `__proto__.x` would otherwise reach `Object.prototype`
 * and change behaviour for every object in the page — prototype pollution. The payload
 * is the response of an AI translation call, so it is data from outside and is treated
 * as hostile, exactly as CLAUDE.md requires of anything an LLM produces.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Flatten a nested locale object into dotted keys — `{a:{b:'x'}}` → `{'a.b':'x'}`.
 *
 * The translation route takes a flat map of strings, so the whole English locale is
 * flattened before it is sent and rebuilt by `unflattenObj` when it comes back.
 *
 * @param {object} obj - a locale message object, nested to any depth.
 * @param {string} [prefix] - the dotted path accumulated so far (recursion only).
 * @returns {Object<string, string>} every leaf string, keyed by its dotted path.
 */
function flattenObj (obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    if (FORBIDDEN_KEYS.has(k)) { return acc }
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(acc, flattenObj(obj[k], key))
    } else {
      acc[key] = obj[k]
    }
    return acc
  }, {})
}

/**
 * Rebuild a nested locale object from dotted keys — the inverse of `flattenObj`.
 *
 * Any key whose path contains a `FORBIDDEN_KEYS` segment is DROPPED rather than
 * written, and dropped silently on purpose: a poisoned key is not something the reader
 * can act on, and refusing the whole payload over one bad entry would leave them with
 * no translation at all.
 *
 * @param {Object<string, string>} flat - translated strings keyed by dotted path.
 * @returns {object} the nested message object vue-i18n expects.
 */
function unflattenObj (flat) {
  const result = {}
  for (const key of Object.keys(flat)) {
    const parts = key.split('.')
    if (parts.some(p => FORBIDDEN_KEYS.has(p))) { continue }
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) { cur[parts[i]] = {} }
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = flat[key]
  }
  return result
}

/**
 * localeMixin — the language picker, and the on-demand translation behind it.
 *
 * WHAT MAKES THIS APP TRANSLATABLE AT ALL. Only `locales/en.json` is authored. When a
 * reader picks a language we do not ship, the whole English locale is sent to
 * `/api/translate/locale`, translated once, and cached in `localStorage` for that
 * browser. The consequence worth knowing before editing any screen: **a string in
 * `en.json` can become any language; a string hardcoded in a template stays English
 * for ever.** That is why hardcoded UI text is a defect here rather than a tidiness
 * preference.
 *
 * Any component using this mixin needs a `langPicker` ref on the picker's root element
 * (the outside-click handler closes on it) and may use a `langSearch` ref for focus.
 *
 * @mixin
 */
export default {
  /**
   * @returns {{langPickerOpen: boolean, langSearch: string, loadingLang: (string|null),
   *   langError: (string|null)}} picker visibility, its filter text, the code currently
   *   being fetched (which also acts as the in-flight lock), and any failure to show.
   */
  data () {
    return {
      langPickerOpen: false,
      langSearch: '',
      loadingLang: null,
      langError: null
    }
  },

  computed: {
    /** @returns {string} the current locale's display name, or its code if unlisted. */
    currentLanguageName () {
      const lang = LANGUAGES.find(l => l.code === this.$i18n.locale)
      return lang ? lang.name : this.$i18n.locale
    },
    /**
     * The picker's list, filtered by `langSearch` on either name or code.
     * @returns {Array<{code: string, name: string}>} every language when the box is empty.
     */
    filteredLanguages () {
      if (!this.langSearch) { return LANGUAGES }
      const q = this.langSearch.toLowerCase()
      return LANGUAGES.filter(l => l.name.toLowerCase().includes(q) || l.code.includes(q))
    }
  },

  mounted () {
    this._onDocClick = (e) => {
      if (this.$refs.langPicker && !this.$refs.langPicker.contains(e.target)) {
        this.closeLangPicker()
      }
    }
    document.addEventListener('click', this._onDocClick)
  },

  beforeDestroy () {
    document.removeEventListener('click', this._onDocClick)
  },

  methods: {
    /** Open or close the picker; opening focuses the search box. @returns {void} */
    toggleLangPicker () {
      this.langPickerOpen = !this.langPickerOpen
      if (this.langPickerOpen) {
        this.$nextTick(() => this.$refs.langSearch && this.$refs.langSearch.focus())
      } else {
        this.langSearch = ''
        this.langError = null
      }
    },

    /** Close the picker and clear its search text and error. @returns {void} */
    closeLangPicker () {
      this.langPickerOpen = false
      this.langSearch = ''
      this.langError = null
    },

    /**
     * Switch the reader to `lang`, fetching its translation first if we do not hold it.
     *
     * The locale is only assigned AFTER a successful load, so a failed translation
     * leaves the reader on the language they could read, with `langError` explaining
     * why — never on a half-translated screen. Re-entry is blocked while `loadingLang`
     * is set, so double-clicking a language cannot start two translations.
     *
     * @param {{code: string, name: string}} lang - the chosen language.
     * @returns {Promise<void>}
     */
    async changeLocale (lang) {
      if (this.loadingLang) { return }
      if (this.$i18n.locale === lang.code) { this.closeLangPicker(); return }
      if (!this.$i18n.messages[lang.code]) {
        this.loadingLang = lang.code
        this.langError = null
        try {
          await this.loadDynamicLocale(lang)
        } catch (e) {
          this.langError = 'Translation failed — please try again.'
          this.loadingLang = null
          return
        }
        this.loadingLang = null
      }
      this.$i18n.locale = lang.code
      this.closeLangPicker()
    },

    /**
     * Fetch one language's messages and register them with vue-i18n.
     *
     * @route POST /api/translate/locale — body `{ texts, langCode }`, where `texts` is
     *   the flattened English locale; returns the same keys with translated values.
     *
     * Cached in `localStorage` under `va_locale_<code>`, so the cost is paid once per
     * browser rather than once per visit. The cache is only ever read back through
     * `unflattenObj`, which drops prototype-polluting keys — so a tampered cache entry
     * is no more dangerous than a tampered response.
     *
     * @param {{code: string, name: string}} lang - the language to fetch.
     * @returns {Promise<void>}
     * @throws {Error} on a non-OK response or an error body, so `changeLocale` can
     *   leave the reader where they were.
     */
    async loadDynamicLocale (lang) {
      const cacheKey = `va_locale_${lang.code}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        this.$i18n.setLocaleMessage(lang.code, JSON.parse(cached))
        return
      }
      const flat = flattenObj(this.$i18n.messages.en)
      const res = await fetch('/api/translate/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: flat, langCode: lang.code })
      })
      if (!res.ok) { throw new Error(`HTTP ${res.status}`) }
      const translated = await res.json()
      if (translated.error) { throw new Error(translated.error.message || String(translated.error)) }
      const nested = unflattenObj(translated)
      this.$i18n.setLocaleMessage(lang.code, nested)
      localStorage.setItem(cacheKey, JSON.stringify(nested))
    }
  }
}
