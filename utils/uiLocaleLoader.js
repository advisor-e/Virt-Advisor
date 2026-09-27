/**
 * The app's wording in one reader's language, from the backend — shared by both language
 * pickers (mixins/localeMixin.js and mixins/collaborate/localeMixin.js).
 *
 * The browser sends a language code, never text: the backend translates the English it holds
 * once per language and shares the result (server/utils/uiTranslation.js). The first reader
 * of a language waits while that runs, so this asks again until it is ready.
 *
 * Kept in this browser under `va_ui_<code>` with the version it came with; the backend says
 * when that version is still current, so an unchanged language is not downloaded twice.
 *
 * Browser only — call it from a method, never at module load.
 */

const CACHE_PREFIX = 'va_ui_'
/**
 * The previous design's cache. It could hold a translation that was mostly English, saved
 * as finished when MyMemory ran out of allowance — so it is removed, never read.
 */
const OLD_CACHE_PREFIX = 'va_locale_'
const POLL_MS = 4000
const GIVE_UP_MS = 20 * 60 * 1000
/** More than this share still in English is a failed translation, not a partial one. */
const MOSTLY_ENGLISH = 0.5

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * A copy of a messages object with every forbidden key dropped, at any depth. The reply
 * and the browser cache are both data from outside, so neither is trusted to be clean.
 * @param {*} obj
 * @returns {*}
 */
export function cleanMessages (obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { return obj }
  const out = {}
  Object.keys(obj).forEach((k) => {
    if (FORBIDDEN_KEYS.has(k)) { return }
    out[k] = cleanMessages(obj[k])
  })
  return out
}

function storage () {
  return typeof window !== 'undefined' ? window.localStorage : null
}

function readCache (code) {
  try {
    const raw = storage() && storage().getItem(CACHE_PREFIX + code)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed.version === 'string' && parsed.messages ? parsed : null
  } catch (e) {
    return null
  }
}

function authHeader () {
  const token = storage() && storage().getItem('advisor_e_token')
  return 'Bearer ' + (token || 'dev-local-bypass')
}

/**
 * Load one language's messages.
 *
 * @param {string} code - a language code, never 'en'
 * @param {object} [deps] - tests only: `{ fetch, wait }`
 * @returns {Promise<object>} the nested messages object for vue-i18n
 * @throws {Error} on an HTTP failure, an error envelope, a mostly-English result, or a
 *   translation still running after twenty minutes — so the picker leaves the reader where
 *   they were
 */
export async function loadUiLocale (code, deps) {
  const fetchImpl = (deps && deps.fetch) || fetch
  const wait = (deps && deps.wait) || (ms => new Promise(resolve => setTimeout(resolve, ms)))
  try { storage() && storage().removeItem(OLD_CACHE_PREFIX + code) } catch (e) { /* storage blocked */ }

  const cached = readCache(code)
  const started = Date.now()
  const url = '/api/ui-translation/' + encodeURIComponent(code) +
    (cached ? '?have=' + encodeURIComponent(cached.version) : '')

  for (;;) {
    const res = await fetchImpl(url, { headers: { Authorization: authHeader() } })
    if (!res.ok) { throw new Error('HTTP ' + res.status) }
    const body = await res.json()
    if (!body || body.success === false || body.error) { throw new Error('translation unavailable') }

    if (body.status === 'translating') {
      if (Date.now() - started > GIVE_UP_MS) { throw new Error('translation still running') }
      await wait(POLL_MS)
      continue
    }
    if (body.status !== 'ready') { throw new Error('unexpected reply') }
    if (body.total && body.english / body.total > MOSTLY_ENGLISH) { throw new Error('translation mostly unavailable') }

    if (body.unchanged && cached) { return cleanMessages(cached.messages) }
    if (!body.messages || typeof body.messages !== 'object') { throw new Error('no messages in reply') }
    const messages = cleanMessages(body.messages)
    try {
      storage() && storage().setItem(CACHE_PREFIX + code, JSON.stringify({ version: body.version, messages }))
    } catch (e) {
      // Storage full or blocked: the reader still gets the language, just not remembered.
    }
    return messages
  }
}

/** The reader's chosen language, remembered in this browser (Mike, 2026-09-25). */
const READER_LOCALE_KEY = 'va_reader_locale'

/**
 * Remember the language the reader just chose, so the next page opens in it. Without this
 * every page load started in English, and the manager hubs — which have no picker — could
 * only be read in another language by arriving from the advisor screen without a reload.
 * @param {string} code
 */
export function rememberReaderLocale (code) {
  try { storage() && storage().setItem(READER_LOCALE_KEY, String(code)) } catch (e) { /* storage blocked */ }
}

/**
 * Open the page in the remembered language: at once from this browser's copy when it has
 * one, then refreshed from the backend. Never throws — a failure leaves the page in the
 * language it opened in.
 *
 * @param {object} i18n - the app's VueI18n instance
 * @param {object} [deps] - tests only: passed through to `loadUiLocale`
 * @returns {Promise<void>}
 */
export async function restoreReaderLocale (i18n, deps) {
  let code = null
  try { code = storage() && storage().getItem(READER_LOCALE_KEY) } catch (e) { return }
  if (!code || code === 'en' || !i18n || i18n.locale === code) { return }

  const cached = readCache(code)
  if (cached) {
    i18n.setLocaleMessage(code, cleanMessages(cached.messages))
    i18n.locale = code
  }
  try {
    const messages = await loadUiLocale(code, deps)
    i18n.setLocaleMessage(code, messages)
    i18n.locale = code
  } catch (e) {
    // A shipped partial file still beats English, exactly as the picker decides.
    if (!cached && i18n.messages && i18n.messages[code]) { i18n.locale = code }
  }
}

export { CACHE_PREFIX, OLD_CACHE_PREFIX, POLL_MS, GIVE_UP_MS, MOSTLY_ENGLISH, READER_LOCALE_KEY }
