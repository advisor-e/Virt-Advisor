'use strict'

/**
 * @file Storage for the mentor's Template Check decisions.
 * @module server/utils/templateCheckRulings
 *
 * A ruling is Mike saying, about one row of the Template Check report, either
 * "this name means that template" or "this was never a document". Both must
 * survive a page reload, or the screen raises the same false alarms every time it
 * is opened and stops being trusted — which the approved mockup says in as many
 * words ("A dismissal is remembered and can always be undone").
 *
 * SAME MECHANISM AS THE MENTOR'S DISTINCTIONS, deliberately: the reserved global
 * overlay scope (`__platform__`) under its own config key, so this inherits
 * version history and one-click restore with no new table, and cannot collide
 * with any real firm's rows. See server/utils/platformDistinctions.js — this is
 * that pattern applied to a second kind of mentor-authored content, which is the
 * first evidence that it generalises to the rest of the cascade.
 *
 * A ruling is NOT an edit to the logic table. Nothing here changes what an
 * advisor sees; it records a decision so it can be applied later, in one reviewed
 * pass. The mockup shows that distinction on the row itself ("Ruled 5 August. Not
 * yet applied to the table.").
 */

const fs = require('fs')
const path = require('path')

/** Reserved global scope — not a real firm id, so it can never collide. */
const { PLATFORM_SCOPE } = require('./platformScope')
const { devFallbackAllowed } = require('./dbFailure')
const CONFIG_KEY = 'template-check-rulings'

/** Dev fallback when MySQL is unavailable. Gitignored, like its siblings. */
const DEV_FILE = path.resolve(process.cwd(), 'data/dev-template-check-rulings.json')

/** The two things a ruling can say. */
const RULING = { POINTS_AT: 'ruled', NOT_A_TOOL: 'dismissed', FLAGGED: 'flagged' }

// Evaluated at call time, so the fallback honours the env in force when the write
// actually happens rather than at require time.
// See server/utils/dbFailure.js. Pass the caught error inside a catch block and
// the fallback ALSO refuses to run when a live server refused the statement.
// Called with no argument (outside a catch) it keeps the original meaning.
function _isDev (err) { return devFallbackAllowed(err) }

function _readDev () {
  try {
    const obj = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null
  } catch (_e) {
    return null
  }
}

function _writeDev (map) {
  fs.writeFileSync(DEV_FILE, JSON.stringify(map, null, 2))
}

/**
 * Load every ruling the mentor has made.
 *
 * A clean miss returns `{}` — no rulings yet is the normal starting state, not an
 * error. In production a READ ERROR IS RE-THROWN rather than answered with an
 * empty map: every save is a read-modify-write, so quietly returning `{}` on a
 * failed read would let one new ruling erase every earlier one.
 *
 * @param {Function} [loadFirmConfig] - async (firmId, key) => stored value.
 * @returns {Promise<object>} keyed by findingKey.
 * @throws in production, when the store cannot be read.
 */
async function loadRulings (loadFirmConfig) {
  if (typeof loadFirmConfig === 'function') {
    try {
      const stored = await loadFirmConfig(PLATFORM_SCOPE, CONFIG_KEY)
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) { return stored }
      return {}
    } catch (err) {
      if (!_isDev(err)) { throw err }
      return _readDev() || {}
    }
  }
  if (!_isDev()) { return {} }
  return _readDev() || {}
}

/**
 * Persist the full ruling map. Dev falls back to the JSON file; production
 * re-throws so a failed save is never mistaken for a saved decision.
 *
 * @param {object} map - the complete map, keyed by findingKey.
 * @param {Function} saveFirmConfig - async (firmId, key, json, savedBy) => version.
 * @param {string} savedBy - audit attribution (the mentor's email).
 * @returns {Promise<void>}
 */
async function saveRulings (map, saveFirmConfig, savedBy) {
  try {
    await saveFirmConfig(PLATFORM_SCOPE, CONFIG_KEY, map, savedBy)
  } catch (err) {
    if (_isDev(err)) { _writeDev(map); return }
    throw err
  }
}

/**
 * Validate and normalise one incoming ruling before it is stored.
 *
 * Deliberately strict about shape and deliberately silent about content: the
 * title is whatever Mike picked, and this module does not second-guess it.
 *
 * @param {object} body - { verdict, title, note }
 * @param {string} savedBy
 * @param {string} at - ISO timestamp, supplied by the caller.
 * @returns {{ok: true, value: object}|{ok: false, message: string}}
 */
function normaliseRuling (body, savedBy, at) {
  const b = body || {}
  const verdict = String(b.verdict || '')
  if (!Object.values(RULING).includes(verdict)) {
    return { ok: false, message: `verdict must be one of ${Object.values(RULING).join(', ')}` }
  }
  const title = typeof b.title === 'string' ? b.title.trim() : ''
  // Pointing a name at a template without naming the template is the one
  // combination that would store a decision nobody can act on.
  if (verdict === RULING.POINTS_AT && !title) {
    return { ok: false, message: 'a template title is required when pointing a name at a template' }
  }
  // "Apply it" — the second step the approved mockup shows on the row, after the
  // ruling itself. Only meaningful on a ruling that points at a template: a
  // dismissal and a flag both correctly produce no edit to any table, so asking to
  // apply one would be asking for nothing. Refused rather than ignored, or the
  // screen would show a row queued for a change that can never appear in a patch.
  const applyRequested = b.applyRequested === true
  if (applyRequested && verdict !== RULING.POINTS_AT) {
    return { ok: false, message: 'only a ruling that points at a template can be applied to a table' }
  }

  return {
    ok: true,
    value: {
      verdict,
      title: title || null,
      note: typeof b.note === 'string' ? b.note.trim().slice(0, 500) : '',
      ruledBy: savedBy || '',
      ruledAt: at,
      applyRequested,
      // Null until asked for, so "when was this queued" is answerable separately
      // from "when was it decided" — they are often not the same day.
      applyRequestedAt: applyRequested ? at : null
    }
  }
}

module.exports = { loadRulings, saveRulings, normaliseRuling, RULING, PLATFORM_SCOPE, CONFIG_KEY, DEV_FILE }
