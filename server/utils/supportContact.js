'use strict'

/**
 * @file The address a firm manager is told to write to when we refuse their prompt.
 * @module server/utils/supportContact
 *
 * 🔴 WHY THIS IS A FILE AND NOT A CONSTANT. Mike asked, 2026-08-25: *"make it really easy
 * for me to change that address in future as required please"*. Easy for a non-developer
 * means one obvious file, one line, plain text, and no rebuild — not an edit buried in a
 * route among a hundred lines of error handling. `data/support-contact.json` is that file
 * and it explains itself at the top.
 *
 * 🔴 READ ON EVERY CALL, DELIBERATELY. Caching it would mean an edit did nothing until
 * somebody restarted the server, which is exactly the kind of "why hasn't it changed"
 * that makes people stop trusting a setting. The file is a few hundred bytes and the
 * route it serves is capped at ten calls a minute, so reading it each time costs nothing
 * anybody can measure.
 *
 * ⚠ IT CANNOT FAIL. A missing file, a renamed file, a syntax error, a blank address or
 * something that is not an address at all all fall back to `FALLBACK_EMAIL`. The design
 * forbids a refusal with no route back to a person
 * (`design/PROMPT-CONTRIBUTION-SAFETY.md` §5), so a broken config must never turn into a
 * dead button on an accountant's screen — it degrades to the last address we knew.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')

/** Used when the file is missing, unreadable or does not hold a usable address. */
const FALLBACK_EMAIL = 'mike@advisor-e.com'

const FILE = path.resolve(__dirname, '../../data/support-contact.json')

/**
 * Deliberately loose. This is a sanity check on a value Mike typed, not an attempt to
 * validate email addresses — the real test of an address is whether mail reaches it, and
 * a strict pattern here would reject perfectly good ones and silently fall back.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The support address currently configured.
 *
 * @returns {string} A usable email address — never empty, never null.
 */
function supportEmail () {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    const value = raw && typeof raw.supportEmail === 'string' ? raw.supportEmail.trim() : ''
    if (LOOKS_LIKE_EMAIL.test(value)) { return value }
    // A file that exists but holds nothing usable is worth saying out loud once per call:
    // somebody edited it and got it wrong, and silence would hide that from them.
    console.warn('[support-contact] no usable address in data/support-contact.json — using the fallback')
  } catch (err) {
    // Missing file on a fresh checkout is normal and not worth a line of noise; anything
    // else (a syntax error from a hand edit) is.
    if (err.code !== 'ENOENT') {
      console.warn('[support-contact] could not read data/support-contact.json:', err.message)
    }
  }
  return FALLBACK_EMAIL
}

module.exports = { supportEmail, FALLBACK_EMAIL, FILE }
