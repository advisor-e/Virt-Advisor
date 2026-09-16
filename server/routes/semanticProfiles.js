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
 * 🔴 AUTHORING IS LIVE, AND MIKE TURNED IT ON KNOWING WHAT IT DOES — 2026-09-16, his
 * second ruling of the day. He first stopped the build to ask whether it interferes with
 * the working model. It does: a profile saved here OVERRIDES the compiled guess and
 * changes which tool an advisor is recommended, on the resolver's dominant lever, and no
 * test can say a weight is right. He was told that plainly and said yes, because 44 tools
 * have no profile at all and he knows them better than a keyword script does.
 *
 * WHAT STANDS IN FOR THE TEST NOBODY CAN WRITE: every save is a version carrying its
 * author and reason, and the compiled row is always restorable. `restore` puts back any
 * earlier version INCLUDING the script's own. Reversibility is the guard here.
 *
 * 🔴 `savedBy` COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. It is the name beside a
 * weight that changes what every advisor at every firm is shown.
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
const overlay = require('../utils/firmOverlay')
const { PLATFORM_SCOPE } = require('../utils/platformScope')
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
 * Async now that authored rows are read from the overlay store, so it takes `(req, res)`
 * and no `next` — Restify accepts either shape but not a mixture, and a non-async handler
 * omitting `next` is refused at mount (`tests/unit/serverMounts.test.js` caught exactly
 * that here on 2026-09-16, which would have stopped the whole backend booting).
 *
 * @route GET /api/mentor/semantic-profiles
 * @param {object} req - Restify request; mentor-guarded, reads nothing from the caller
 * @param {object} res - Restify response
 * @returns {Promise<void>} 200 `{ success, templates, signals, thinCount, total, pages }`
 */
async function list (req, res) {
  try {
    const { rows, total, pages, thinCount } = await store.listTemplateProfiles()
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
}

/**
 * PUT /api/mentor/semantic-profiles/:page — save one page's authored profile.
 *
 * 🔴 THIS CHANGES WHAT ADVISORS ARE RECOMMENDED. The saved profile overrides the compiled
 * guess for that page from the next resolver pass onward. Validation is therefore strict
 * and refuses rather than coerces: an unknown signal, a weight outside 1–10 or a fractional
 * one, an over-long note, or a page the library does not hold.
 *
 * An empty tick list is VALID and means "authored as none" (data-model §6) — a deliberate
 * "this tool answers no client problem", which stays thin but is no longer unreviewed.
 *
 * @route PUT /api/mentor/semantic-profiles/:page
 * @param {object} req - Restify request; `params.page`, `body.profile`, `body.note`
 * @param {object} res - Restify response
 * @returns {Promise<void>} 200 `{ success, version }`; 400 `INVALID_PROFILE`
 */
async function save (req, res) {
  const page = req.params && req.params.page
  const verdict = store.validateProfile(
    Object.assign({}, req.body, { page }),
    null,
    store.libraryPages()
  )
  if (!verdict.ok) {
    sendError(res, 400, verdict.code, verdict.message)
    return
  }
  try {
    // The author is the verified token's, never the body's — see the file header.
    const saved = await store.saveProfile(page, verdict.value, req.userEmail)
    res.send(200, { success: true, version: saved && saved.version, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[semantic-profiles] save failed:', err.message)
    sendError(res, 500, 'PROFILE_SAVE_FAILED', 'Could not save that profile')
  }
}

/**
 * GET /api/mentor/semantic-profiles/:page/history — every saved version of one page's
 * profile, newest first, so the mentor can see who changed what and return to any of it.
 *
 * @route GET /api/mentor/semantic-profiles/:page/history
 * @param {object} req - Restify request; `params.page`
 * @param {object} res - Restify response
 * @returns {Promise<void>} 200 `{ success, history: [{ id, version, is_active, saved_by, created_at }] }`
 */
async function history (req, res) {
  const page = req.params && req.params.page
  if (!store.libraryPages().has(page)) {
    sendError(res, 400, 'INVALID_PROFILE', 'Unknown template page')
    return
  }
  try {
    const rows = await overlay.getVersionHistory(PLATFORM_SCOPE, store.PROFILE_PREFIX + page)
    res.send(200, { success: true, history: rows || [], timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[semantic-profiles] history failed:', err.message)
    sendError(res, 500, 'PROFILES_UNAVAILABLE', 'Could not read that profile\'s history')
  }
}

/**
 * POST /api/mentor/semantic-profiles/:page/restore — put an earlier version back.
 *
 * This is the reversibility the header calls the real guard: a weight nobody can test is
 * safe to try because any version, including the script's own compiled row, can be restored.
 *
 * @route POST /api/mentor/semantic-profiles/:page/restore
 * @param {object} req - Restify request; `params.page`, `body.versionId`
 * @param {object} res - Restify response
 * @returns {Promise<void>} 200 `{ success, version }`; 400 on an unknown page or missing id
 */
async function restore (req, res) {
  const page = req.params && req.params.page
  const versionId = req.body && req.body.versionId
  if (!store.libraryPages().has(page)) {
    sendError(res, 400, 'INVALID_PROFILE', 'Unknown template page')
    return
  }
  if (!versionId) {
    sendError(res, 400, 'INVALID_PROFILE', 'A version to restore is required')
    return
  }
  try {
    const restored = await overlay.restoreVersion(PLATFORM_SCOPE, store.PROFILE_PREFIX + page, versionId)
    store.clearProfileCache()
    res.send(200, { success: true, version: restored && restored.version, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[semantic-profiles] restore failed:', err.message)
    sendError(res, 500, 'PROFILE_RESTORE_FAILED', 'Could not restore that version')
  }
}

module.exports = { list, save, history, restore }
