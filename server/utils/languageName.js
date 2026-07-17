'use strict'

/**
 * @file Server-owned language-name resolution — closes the `languageName`
 * prompt-injection channel (sweep 2026-07-10). The browser used to send a
 * free-text `languageName` that was interpolated into the system prompt;
 * the engine now resolves the display name itself from the language CODE
 * against the canonical list, and the client-sent name is ignored.
 * @module server/utils/languageName
 */

// Single source shared with the frontend language picker (mixins/localeMixin.js).
// List = languages supported by LibreTranslate (libretranslate.com):
// preloaded true  = locale file exists in /locales (instant switch, no API call);
// preloaded false = fetched via LibreTranslate on first use, cached in localStorage.
const LANGUAGES = require('../../data/languages.json')

const _byCode = {}
for (const lang of LANGUAGES) {
  _byCode[lang.code] = lang.name
}

/**
 * Resolves a language code to its official display name.
 *
 * @param {*} code - BCP-47 language code as sent by the frontend (e.g. 'fr')
 * @returns {string|null} The canonical display name (e.g. 'Français'), or
 *   null when the code is unknown or not a string — callers must then omit
 *   the language instruction entirely (English default), never trust a
 *   client-supplied name instead.
 */
function nameForLanguageCode (code) {
  if (typeof code !== 'string') { return null }
  return _byCode[code] || null
}

module.exports = { nameForLanguageCode, LANGUAGES }
