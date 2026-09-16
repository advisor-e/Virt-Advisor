'use strict'

/**
 * Whether a backup AI provider is connected — so the advisor is TOLD before a conversation,
 * rather than finding out when one ends halfway through (item 4.97 US8, Mike's ruling of
 * 2026-09-15: "always give warning but let the user continue").
 *
 * 🔴 IT WARNS; IT NEVER BLOCKS. No fallback is a perfectly normal, supported state — the
 * primary answers exactly as it always has. What was missing was that nobody knew: if the
 * provider dropped mid-conversation the session simply failed, with no earlier signal that
 * there was no safety net. This route is that signal and nothing more.
 *
 * 🔴 IT NAMES NO PROVIDER, NO HOST AND NO KEY. A boolean is the whole answer. Which providers
 * a deployment uses is configuration, not something to publish to every signed-in browser,
 * and `hasFallback()` is read through the seam so this file holds no second copy of the rule.
 *
 * READ open to any signed-in firm user (`firmAuth`), like /api/advisor/industry-vocabulary
 * beside it: every advisor in a client session needs it. It never breaks a session — on any
 * failure it answers 200 saying a backup IS present, because an unproven warning shown on
 * every conversation would teach advisors to ignore the one that matters.
 */

const { hasFallback } = require('../utils/aiProvider')

/**
 * GET /api/advisor/ai-readiness  (firmAuth)
 *
 * @route GET /api/advisor/ai-readiness
 * @param {Function} next - Restify's chain callback. REQUIRED, and not decoration: a handler
 *   that is neither `async (req, res)` nor `(req, res, next)` is REFUSED AT MOUNT TIME, and the
 *   server does not start at all. `tests/unit/serverMounts.test.js` exists because that once
 *   reached a release tag; it caught this route on 2026-09-15 before it left the machine.
 * @returns {void} always 200. Synchronous on purpose: `hasFallback()` reads config already in
 *   memory, so there is nothing to await and no store to be slow.
 */
function get (req, res, next) {
  try {
    res.send(200, { backupProvider: hasFallback() })
  } catch (err) {
    // Fail towards silence, not towards a warning nobody can act on. See the header.
    console.error('[ai-readiness] read failed:', err.message)
    res.send(200, { backupProvider: true })
  }
  next()
}

module.exports = { get }
