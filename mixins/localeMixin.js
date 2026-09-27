// Single source shared with the backend (server/utils/languageName.js) — the
// engine resolves the prompt's language name from this same list, by code.
import LANGUAGES from '~/data/languages.json'
import { loadUiLocale, rememberReaderLocale } from '~/utils/uiLocaleLoader'

/**
 * localeMixin — the language picker, and the translated wording behind it.
 *
 * WHAT MAKES THIS APP TRANSLATABLE AT ALL. Only `locales/en.json` is authored. When a
 * reader picks another language, the backend translates the English it holds — once per
 * language, shared by every reader — and this browser keeps a copy (utils/uiLocaleLoader.js).
 * The consequence worth knowing before editing any screen: **a string in `en.json` can
 * become any language; a string hardcoded in a template stays English for ever.** That is
 * why hardcoded UI text is a defect here rather than a tidiness preference.
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
     * Switch the reader to `lang`, loading its wording from the backend first.
     *
     * Every language but English is asked for, including the seven with a shipped file:
     * those files are a partial head start, and asking is what fills in the rest. The
     * locale is only assigned AFTER a successful load, so a failure leaves the reader on
     * the language they could read, with `langError` saying why — never on a
     * half-translated screen. The one exception is a shipped language when the backend
     * cannot help: its own file is still better than refusing it. Re-entry is blocked while
     * `loadingLang` is set.
     *
     * @param {{code: string, name: string}} lang - the chosen language.
     * @returns {Promise<void>}
     */
    async changeLocale (lang) {
      if (this.loadingLang) { return }
      if (this.$i18n.locale === lang.code) { this.closeLangPicker(); return }
      if (lang.code !== 'en') {
        this.loadingLang = lang.code
        this.langError = null
        try {
          this.$i18n.setLocaleMessage(lang.code, await loadUiLocale(lang.code))
        } catch (e) {
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
