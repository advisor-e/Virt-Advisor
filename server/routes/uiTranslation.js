'use strict'

/**
 * GET /api/ui-translation/:code — the app's wording in one reader's language.
 *
 * The browser sends a language code and, optionally, the version it already holds. It sends
 * no text: the English comes from the locale files on this server (see
 * server/utils/uiTranslation.js for why, and why chat messages do not come here).
 *
 * `firmAuth` only: every signed-in reader may choose a language, and the route reads no
 * identity. The guard is about who may spend model calls, not about scoping.
 */

const uiTranslation = require('../utils/uiTranslation')
const { sendError } = require('../utils/sendError')

/**
 * @route GET /api/ui-translation/:code?have=<version>
 * @returns {void} 200 `{ success, status: 'translating', done, total }` while the first
 *   translation runs — the browser asks again; or 200 `{ success, status: 'ready', version,
 *   messages | unchanged, english, total }`. 400 UNKNOWN_LANGUAGE for a code not offered.
 */
async function get (req, res) {
  try {
    const code = String((req.params && req.params.code) || '')
    const have = req.query && typeof req.query.have === 'string' ? req.query.have : ''
    const result = await uiTranslation.getLocale(code, have)
    res.send(200, Object.assign({ success: true }, result, { timestamp: new Date().toISOString() }))
  } catch (err) {
    if (err && err.code === 'UNKNOWN_LANGUAGE') {
      sendError(res, 400, 'UNKNOWN_LANGUAGE', 'That language is not offered')
      return
    }
    console.error('[ui-translation] route failed:', err && err.message)
    sendError(res, 500, 'TRANSLATION_UNAVAILABLE', 'The translation could not be loaded just now')
  }
}

module.exports = { get }
