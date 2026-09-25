// The languages Collaborate's picker offers — the same codes as data/languages.json.
// preloaded: true  = a partial locale file ships in /locales
// Every language but English is completed by the backend's translation
// (server/utils/uiTranslation.js via utils/uiLocaleLoader.js), then kept in this browser.
export const LANGUAGES = [
  // --- Pre-loaded (instant) ---
  { code: 'en', name: 'English',           preloaded: true  },
  { code: 'fr', name: 'Français',          preloaded: true  },
  { code: 'es', name: 'Español',           preloaded: true  },
  { code: 'de', name: 'Deutsch',           preloaded: true  },
  { code: 'pt', name: 'Português',         preloaded: true  },
  { code: 'it', name: 'Italiano',          preloaded: true  },
  { code: 'nl', name: 'Nederlands',        preloaded: true  },
  { code: 'pl', name: 'Polski',            preloaded: true  },
  // --- No shipped file: translated by the backend on first use ---
  { code: 'ar', name: 'العربية',           preloaded: false },
  { code: 'az', name: 'Azərbaycan',        preloaded: false },
  { code: 'ca', name: 'Català',            preloaded: false },
  { code: 'cs', name: 'Čeština',           preloaded: false },
  { code: 'da', name: 'Dansk',             preloaded: false },
  { code: 'el', name: 'Ελληνικά',          preloaded: false },
  { code: 'eo', name: 'Esperanto',         preloaded: false },
  { code: 'fi', name: 'Suomi',             preloaded: false },
  { code: 'he', name: 'עברית',             preloaded: false },
  { code: 'hi', name: 'हिन्दी',             preloaded: false },
  { code: 'hu', name: 'Magyar',            preloaded: false },
  { code: 'id', name: 'Bahasa Indonesia',  preloaded: false },
  { code: 'ja', name: '日本語',             preloaded: false },
  { code: 'ko', name: '한국어',             preloaded: false },
  { code: 'ru', name: 'Русский',           preloaded: false },
  { code: 'sk', name: 'Slovenčina',        preloaded: false },
  { code: 'sv', name: 'Svenska',           preloaded: false },
  { code: 'tr', name: 'Türkçe',            preloaded: false },
  { code: 'uk', name: 'Українська',        preloaded: false },
  { code: 'zh', name: '中文（简体）',        preloaded: false }
]
