import { LANGUAGES } from '~/data/languages'

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

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
    currentLanguageName () {
      const lang = LANGUAGES.find(l => l.code === this.$i18n.locale)
      return lang ? lang.name : this.$i18n.locale
    },
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
    toggleLangPicker () {
      this.langPickerOpen = !this.langPickerOpen
      if (this.langPickerOpen) {
        this.$nextTick(() => this.$refs.langSearch && this.$refs.langSearch.focus())
      } else {
        this.langSearch = ''
        this.langError = null
      }
    },

    closeLangPicker () {
      this.langPickerOpen = false
      this.langSearch = ''
      this.langError = null
    },

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
