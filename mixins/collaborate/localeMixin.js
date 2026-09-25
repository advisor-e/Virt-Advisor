import { LANGUAGES } from '~/data/collaborate/languages'
import { loadUiLocale, rememberReaderLocale } from '~/utils/uiLocaleLoader'

// Collaborate's header picker. The wording comes from the same backend translation as the
// main picker (mixins/localeMixin.js explains the behaviour); only the language list differs.
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
      if (lang.code !== 'en') {
        this.loadingLang = lang.code
        this.langError = null
        try {
          this.$i18n.setLocaleMessage(lang.code, await loadUiLocale(lang.code))
        } catch (e) {
          // A shipped partial file still beats refusing the language outright.
          if (!this.$i18n.messages[lang.code]) {
            this.langError = 'Translation failed — please try again.'
            this.loadingLang = null
            return
          }
        }
        this.loadingLang = null
      }
      this.$i18n.locale = lang.code
      rememberReaderLocale(lang.code)
      this.closeLangPicker()
    }
  }
}
