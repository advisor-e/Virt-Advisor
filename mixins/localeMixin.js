/**
 * localeMixin
 *
 * Drives the in-app language picker and on-demand UI translation. Holds the
 * picker's open/search/loading state, and when the user picks a language whose
 * messages aren't loaded yet, fetches a machine translation of the English
 * locale from the backend, caches it in localStorage, and installs it into
 * vue-i18n. The actual OpenAI translation runs on the backend (Req 7) — this
 * mixin only proxies to /api/translate/locale and holds the result.
 */

import { LANGUAGES } from '~/data/languages'

// Prototype-pollution guard: these keys are skipped when flattening/unflattening
// the translated payload so a crafted locale response cannot reach Object.prototype.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Flatten a nested locale-message object into dot-delimited keys
 * (e.g. { a: { b: 1 } } -> { 'a.b': 1 }). Dangerous prototype keys are dropped.
 * @param {object} obj - the nested object to flatten
 * @param {string} [prefix=''] - key prefix used during recursion
 * @returns {object<string,string>} flat map of dotted key -> leaf value
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
 * Rebuild a nested locale-message object from a dot-delimited flat map (the
 * inverse of flattenObj). Keys containing a prototype-pollution segment are
 * skipped entirely.
 * @param {object<string,string>} flat - flat map of dotted key -> value
 * @returns {object} the nested locale-message object
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

export default {
  data () {
    return {
      langPickerOpen: false,
      langSearch: '',
      loadingLang: null,
      langError: null
    }
  },

  computed: {
    /**
     * Display name of the currently active locale (falls back to the raw code).
     * @returns {string}
     */
    currentLanguageName () {
      const lang = LANGUAGES.find(l => l.code === this.$i18n.locale)
      return lang ? lang.name : this.$i18n.locale
    },
    /**
     * Languages matching the picker search box (by name or code), or the full
     * list when the search is empty.
     * @returns {Array<{code: string, name: string}>}
     */
    filteredLanguages () {
      if (!this.langSearch) { return LANGUAGES }
      const q = this.langSearch.toLowerCase()
      return LANGUAGES.filter(l => l.name.toLowerCase().includes(q) || l.code.includes(q))
    }
  },

  // Register the outside-click handler in mounted() — document is browser-only
  // and must never be touched during SSR. The handler closes the picker when a
  // click lands outside its root ref. Removed in beforeDestroy() to avoid leaks.
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
    /**
     * Open or close the language picker. On open, focuses the search box on the
     * next tick; on close, clears the search term and any error.
     * @returns {void}
     */
    toggleLangPicker () {
      this.langPickerOpen = !this.langPickerOpen
      if (this.langPickerOpen) {
        this.$nextTick(() => this.$refs.langSearch && this.$refs.langSearch.focus())
      } else {
        this.langSearch = ''
        this.langError = null
      }
    },

    /**
     * Close the language picker and reset its search term and error.
     * @returns {void}
     */
    closeLangPicker () {
      this.langPickerOpen = false
      this.langSearch = ''
      this.langError = null
    },

    /**
     * Switch the active UI language. No-ops if a load is already in flight or
     * the language is already active. If the target locale's messages aren't
     * loaded, fetches them first (showing a loading/error state) before
     * switching; on translation failure the locale is left unchanged.
     * @param {{code: string, name: string}} lang - the language to switch to
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
     * Load (or fetch + cache) the translated messages for a locale and install
     * them into vue-i18n. Returns the localStorage-cached copy if present;
     * otherwise flattens the English messages and POSTs them to the backend
     * translation route, then unflattens, installs, and caches the result.
     * The translation itself (an OpenAI call) is backend-only per Req 7 — this
     * method only proxies to it.
     * @route POST /api/translate/locale
     *   request body: { texts: object<string,string>, langCode: string }
     *   response: flat map of translated dotted key -> string,
     *             or { error: { message } } on failure
     * @param {{code: string, name: string}} lang - the target language
     * @returns {Promise<void>}
     * @throws {Error} if the HTTP request fails or the backend returns an error
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
