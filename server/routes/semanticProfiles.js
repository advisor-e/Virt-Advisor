'use strict'

/**
 * @file Template Profiles — the mentor's route (item 4.97 / 7.2, US9, task T057).
 * @module server/routes/semanticProfiles
 *
 * Design: `design/mockups/template-profiles.html`, approved 2026-09-14.
 * Contract: `specs/003-engine-middle-learning-true/contracts/api.md` §New routes.
 *
 * A semantic profile is what the AI understands a client tool to be *about* — a
 * `{ signal: weight }` map matched against the signals read out of the advisor's
 * conversation. It is the resolver's dominant lever and today every profile is
 * COMPILED from each tool's written summary, which for the 44 tools with no summary
 * means no profile at all. This route is how Mike sees that for the first time.
 *
 * 🔴 READ-ONLY, AND THE OTHER THREE ROUTES ARE DELIBERATELY ABSENT — Mike's ruling,
 * 2026-09-16. The contract names four routes; this file registers one. He stopped the
 * build to ask whether it interferes with the working model, and the authoring half
 * would: a saved profile is only worth saving if the engine reads it (T058), and that
 * changes what every advisor is recommended, on the dominant lever, with no test able
 * to judge whether a weight is right. So `PUT /:page`, `GET /:page/history` and
 * `POST /:page/restore` are NOT built and must not be added here until he has seen the
 * screen and decided the authoring — 44 tools of data entry — is worth his time.
 * `validateProfile` in the store is written and tested ahead of that day; nothing
 * calls it yet, by design.
 *
 * MENTOR TIER ALONE. Profiles are platform content: one library, one set of profiles,
 * and no firm holds a different value for what a tool is about. Registered under
 * `mentorGuard` in `restify-server.js`; no lower tier has a view of this.
 */

const { sendError } = require('../utils/sendError')
// Held as the module, not destructured: the store is the seam a test replaces to prove a
// refusal returns the safe envelope rather than a stack trace, and a destructured copy
// would not see that replacement.
const store = require('../utils/semanticProfiles')
const { SIGNAL_REGISTRY, SIGNAL_DESCRIPTIONS } = require('../utils/problemSignals')

/**
 * GET /api/mentor/semantic-profiles — every client tool with the profile in force for it.
 *
 * One row per page, naming every tool that shares it: Advisor-e issues an ID per PAGE and
 * a page legitimately holds several tools, so 220 tools sit on 205 pages and those tools
 * SHARE one profile (Mike's ruling, 2026-09-16 — this is by design, not a collision).
 * `alsoOnPage` is how the screen shows a mentor that one profile governs both
 * `Working Capital Cycle` and `Activity Ratios`.
 *
 * `signals` carries every signal a profile may name, with its description, so the screen
 * can label a weight without a second call and cannot drift from the registry.
 *
 * Synchronous, and therefore `(req, res, next)`: the library, the compiled profiles and
 * the registry are all `require`d at module load, so there is nothing to await. Restify
 * refuses to mount a non-async handler that omits `next` — `tests/unit/serverMounts.test.js`
 * caught exactly that here on 2026-09-16. It becomes `async (req, res)` on the day an
 * authored row is read from the overlay store.
 *
 * @route GET /api/mentor/semantic-profiles
 * @param {object} req - Restify request; mentor-guarded, reads nothing from the caller
 * @param {object} res - Restify response
 * @param {Function} next - Restify continuation; called once the response is written
 * @returns {void} 200 `{ success, templates, signals, thinCount, total, pages }`
 */
function list (req, res, next) {
  try {
    const { rows, total, pages, thinCount } = store.listTemplateProfiles()
    res.send(200, {
      success: true,
      templates: rows,
      signals: Object.keys(SIGNAL_REGISTRY).map(type => ({
        type,
        description: SIGNAL_DESCRIPTIONS[type] || null
      })),
      thinCount,
      total,
      pages,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[semantic-profiles] list failed:', err.message)
    sendError(res, 500, 'PROFILES_UNAVAILABLE', 'Could not read the template profiles')
  }
  if (typeof next === 'function') { next() }
}

module.exports = { list }
