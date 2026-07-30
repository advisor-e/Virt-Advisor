'use strict'

/**
 * The Advisory Staircase a firm actually works to — the platform base with that
 * firm's saved override blended over it.
 *
 * ONE function, TWO readers, deliberately. The advisor engine reads it to set the
 * complexity ceiling; `GET /api/advisor/staircase` reads it to give the on-screen
 * selector its wording. Until 2026-07-31 the engine blended inline and the selector
 * read the raw platform file, so a firm could rename a step in Firm Manager, save
 * it, and see it in version history while every advisor still chose from Advisor-e's
 * wording. Two readers of one config must never blend it two ways — that is the
 * whole reason this file exists rather than a second copy of three lines.
 *
 * A firm that has customised nothing gets the platform base object itself, so
 * behaviour is identical to before for those firms.
 */

const fs = require('fs')
const path = require('path')
const BASE_STAIRCASE = require('../../data/advisory-staircase.json')
const { deepMerge } = require('./deepMerge')

const CONFIG_KEY = 'advisory-staircase'
const IS_DEV = process.env.NODE_ENV !== 'production'
const DEV_STAIRCASE_FILE = path.resolve(__dirname, '../../data/dev-firm-staircase.json')

/**
 * Dev-only: the firm's staircase from the JSON stand-in that
 * `routes/firmManager.js` writes to while the MySQL table is unprovisioned.
 *
 * Without this the fix would be invisible in the only environment it can be tried
 * in: a firm manager saves a renamed step, it lands in this file, and a read that
 * only knows about MySQL reports "no override" and serves Advisor-e's wording —
 * looking exactly like a feature that does not work. TEST/DEV ONLY; production
 * reads MySQL and never touches this file.
 *
 * @param {string} firmId
 * @returns {Object|null} the saved config, or null if the file is absent or junk.
 */
function _devReadStaircase (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_STAIRCASE_FILE, 'utf8'))
    return all[firmId] || null
  } catch { return null }
}

/**
 * Load a firm's effective staircase.
 *
 * @param {string|null} firmId - the firm, taken from the verified JWT and never
 *   from a request body (a body-supplied firmId would be an IDOR — it would let
 *   one firm read another's config).
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the
 *   overlay reader, injected rather than imported so the engine reuses the client
 *   it already has and tests need no database. Mirrors loadFirmDomainSupport.
 * @returns {Promise<Object>} the blended staircase config. Falls back to the
 *   platform base when the firm has no override, has no firm id, or the store
 *   cannot be reached. Never rejects: a storage problem must not stop a session
 *   or leave the advisor with no staircase to choose from.
 */
async function loadBlendedStaircase (firmId, loadFirmConfig) {
  if (!firmId) { return BASE_STAIRCASE }

  let override = null
  try {
    override = await loadFirmConfig(firmId, CONFIG_KEY)
  } catch (err) {
    // No MySQL yet — in dev the Firm Manager save lands in a JSON stand-in, so the
    // read has to look there or a firm's saved staircase is invisible in the very
    // environment it was edited in. Mirrors routes/currency.js.
    if (IS_DEV) { override = _devReadStaircase(firmId) } else {
      // In production an unreachable store is a real fault: log it, serve the base.
      console.error('[staircase] firm override read failed:', err.message)
      return BASE_STAIRCASE
    }
  }

  return override ? deepMerge(BASE_STAIRCASE, override) : BASE_STAIRCASE
}

module.exports = { loadBlendedStaircase, CONFIG_KEY, BASE_STAIRCASE }
