'use strict'

/**
 * Lane B — a level's own prompt material, stored and cascaded. Item 4.31, step 4 of
 * `design/PROMPT-CONTRIBUTION-SAFETY.md` §7.
 *
 * 🔴 THIS IS A SEPARATE FILE FROM `promptCheck.js` ON PURPOSE. That route is Lane A and
 * its promise is that it stores nothing — a promise a test asserts by reading its source
 * for any sign of a writer. Putting Lane B beside it would have made that promise false
 * for both lanes at once. An accountant asking *"is this any good?"* still reaches a
 * route that cannot write anywhere.
 *
 * 🔴 EVERY HANDLER IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler
 * reads a scope from a body or a query, so a level can only ever write its own material
 * and can only ever accept an offer it was actually made. That is `tier-cascade.md` P6
 * and the IDOR rule, and here it is load-bearing rather than precautionary: this is the
 * first block where one level's free text can reach another level's advice at all.
 *
 * 🔴 NOTHING TRAVELS UP OR SIDEWAYS. There is no route that writes to a parent scope and
 * none that names another firm. The only cross-scope read is `loadOffered`, which walks
 * from this scope toward the platform through the verified chain.
 *
 * ⚠ THE MATERIAL IS RE-CHECKED HERE, NOT TRUSTED FROM THE SCREEN. `validateContribution`
 * runs the same six deterministic checks the paste box runs. A route that assumes its
 * caller validated has no validation.
 *
 * ⚠ AND THE PROSE IS NEVER LOGGED. Same rule as the paste route: it is a firm's own
 * working material and may carry anything.
 *
 * Node 14, CommonJS.
 */

const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const {
  read,
  write,
  validateContribution,
  loadOwn,
  loadAccepted,
  loadOffered,
  resolveInForce,
  nextId,
  OWN_KEY,
  ACCEPTED_KEY,
  MAX_IN_FORCE,
  MAX_TITLE,
  MAX_TEXT
} = require('../utils/promptContributions')

/**
 * The whole screen's payload: this level's own material, what the levels above have
 * offered it with the accept state of each, and what is actually in force.
 *
 * @route GET /api/firm-manager/prompt-contributions
 * @returns {{own: object[], offered: object[], inForce: object[], limits: object}}
 */
async function list (req, res) {
  try {
    const own = await loadOwn(req.firmId, read)
    const offered = await loadOffered(req.firmId, read)
    const inForce = await resolveInForce(req.firmId, read)

    res.send(200, {
      own,
      offered,
      inForce,
      limits: { maxInForce: MAX_IN_FORCE, maxTitle: MAX_TITLE, maxText: MAX_TEXT }
    })
  } catch (err) {
    console.error('[prompt-contributions] read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read your firm\'s material')
  }
}

/**
 * Add one piece of material to THIS level.
 *
 * 🔴 IT APPLIES IMMEDIATELY AND NOBODY SIGNS IT OFF. That is Layer 4 as Mike corrected it
 * on 2026-08-22: *"it doesnt have to be signed off by a level above. many firms in
 * corporate groups will have their own opinion so will want it their own way."* An
 * approval queue here would have made a group manager the gatekeeper of a firm's opinion.
 *
 * A refusal comes back as a 200 with `refused`, carrying the same shape the paste box
 * draws, so one wording serves both screens.
 *
 * @route POST /api/firm-manager/prompt-contributions
 * @param {object} req.body - `{ title, text }`
 */
async function add (req, res) {
  const checked = validateContribution(req.body)

  if (!checked.ok && checked.refusal) {
    return res.send(200, { saved: false, refused: true, refusal: checked.refusal })
  }
  if (!checked.ok) {
    return sendError(res, 400, 'INVALID_CONTRIBUTION', checked.error)
  }

  try {
    const own = await loadOwn(req.firmId, read)
    const rows = own.concat([{
      id: nextId(own),
      title: checked.value.title,
      text: checked.value.text,
      addedBy: req.userEmail || 'unknown',
      addedAt: new Date().toISOString()
    }])

    await write(req.firmId, OWN_KEY, rows, req.userEmail)
    res.send(200, { saved: true, refused: false, own: rows })
  } catch (err) {
    console.error('[prompt-contributions] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save that just now')
  }
}

/**
 * Remove one piece of THIS level's own material.
 *
 * ⚠ IT DOES NOT REACH DOWNWARD. A level below that accepted this material keeps its
 * acceptance — the offer simply stops existing, so `loadOffered` no longer lists it and
 * `resolveInForce` no longer includes it. Nothing has to be cleaned up at the level
 * below, and nothing there breaks: an accepted id that names nothing resolves to nothing.
 *
 * @route DELETE /api/firm-manager/prompt-contributions/:id
 */
async function remove (req, res) {
  const id = Number(req.params && req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, 'INVALID_ID', 'That is not a piece of material')
  }
  try {
    const own = await loadOwn(req.firmId, read)
    const rows = own.filter(row => Number(row.id) !== id)
    if (rows.length === own.length) {
      return sendError(res, 404, 'NOT_FOUND', 'There is nothing here with that name')
    }
    await write(req.firmId, OWN_KEY, rows, req.userEmail)
    res.send(200, { removed: true, own: rows })
  } catch (err) {
    console.error('[prompt-contributions] remove failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not remove that just now')
  }
}

/**
 * Accept, or un-accept, one offer from a level above.
 *
 * 🔴 THIS IS P11'S FIRST IMPLEMENTATION, AND ITS POLARITY IS THE POINT. Nothing offered
 * is in force until it appears on this list. Absence of a decision is not consent, which
 * is the opposite of every other cascade in this app — see the header of
 * `server/utils/promptContributions.js` for why that difference is deliberate.
 *
 * 🔴 A FORGED OFFER ID NAMES NOTHING. The id from the body is matched against the offers
 * THIS scope was actually made, resolved server-side by walking the verified chain. An id
 * naming another firm's material, or a level this scope does not sit under, is a 404.
 *
 * @route POST /api/firm-manager/prompt-contributions/accept
 * @param {object} req.body - `{ offerId, accepted }`
 */
async function setAccepted (req, res) {
  const body = req.body || {}
  if (typeof body.offerId !== 'string' || body.offerId.trim() === '') {
    return sendError(res, 400, 'INVALID_OFFER', 'No offer was named')
  }
  if (typeof body.accepted !== 'boolean') {
    return sendError(res, 400, 'INVALID_OFFER', 'accepted must be true or false')
  }

  try {
    const offered = await loadOffered(req.firmId, read)
    const match = offered.filter(offer => offer.offerId === body.offerId)[0]
    if (!match) {
      return sendError(res, 404, 'NOT_FOUND', 'That is not something you have been offered')
    }

    const accepted = await loadAccepted(req.firmId, read)
    const without = accepted.filter(id => id !== body.offerId)
    const next = body.accepted ? without.concat([body.offerId]) : without

    await write(req.firmId, ACCEPTED_KEY, next, req.userEmail)

    res.send(200, {
      offered: await loadOffered(req.firmId, read),
      inForce: await resolveInForce(req.firmId, read)
    })
  } catch (err) {
    console.error('[prompt-contributions] accept failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not record that just now')
  }
}

/**
 * Every saved version of THIS scope's own material — free with `firmOverlay`, and the
 * reason the design can say a bad contribution is "one click from undone".
 *
 * @route GET /api/firm-manager/prompt-contributions/history
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, OWN_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[prompt-contributions] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * Put an earlier version back.
 * @route POST /api/firm-manager/prompt-contributions/restore
 * @param {object} req.body - `{ versionId }`
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (versionId === undefined || versionId === null || versionId === '') {
    return sendError(res, 400, 'INVALID_VERSION', 'No version was named')
  }
  try {
    await overlay.restoreVersion(req.firmId, OWN_KEY, versionId)
    res.send(200, { restored: true, own: await loadOwn(req.firmId, read) })
  } catch (err) {
    console.error('[prompt-contributions] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { list, add, remove, setAccepted, history, restore }
