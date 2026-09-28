'use strict'

/**
 * Growth Aspect Questions — the hub tab's Restify routes. Item 15.2, screens 3 and 3b of
 * `design/mockups/growth-aspect-questions.html`, approved 2026-09-27 and 2026-09-28.
 *
 * One route per action on the approved screen. Every action takes effect when it is made,
 * as on the Meeting Review tab, and each is one saved version of this tier's decisions.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler
 * reads a scope from a body or a query, so a tier writes only its own decisions and can
 * never reach the tier above it or a sibling (`tier-cascade.md` P6, P11).
 *
 * Managers only (`firmAuth` + `requireManagerRole`, wired in restify-server.js). Advisors
 * read the resolved wording through `GET /api/strategy/frameworks`, never through these.
 */

const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const ga = require('../utils/growthAspects')

/** The limits the screen stops its boxes at, so a box never accepts what a save refuses. */
const LIMITS = { maxQuestion: ga.MAX_QUESTION, maxDescription: ga.MAX_DESCRIPTION }

/**
 * Load this tier's decisions for one aspect, apply `change`, refuse a result that leaves the
 * aspect with no questions, save, and answer with the tab's resolved nine.
 *
 * `change(mine, above, ctx)` mutates `mine` in place and returns nothing on success, or
 * `{ status, code, message }` to refuse.
 *
 * @param {object} req
 * @param {object} res
 * @param {Function} change
 * @returns {Promise<void>}
 */
async function act (req, res, change) {
  const body = req.body || {}
  const name = body.aspect
  if (!ga.ASPECT_NAMES.includes(name)) {
    return sendError(res, 400, 'UNKNOWN_ASPECT', 'That is not one of the nine Growth Aspects')
  }
  try {
    const state = ga.readState(await ga.readScopeConfig(req.firmId, ga.CONFIG_KEY))
    const above = (await ga.loadInherited(req.firmId, ga.readScopeConfig)).find(a => a.name === name)
    const mine = state[name]

    const refused = await change(mine, above, { req, body })
    if (refused) { return sendError(res, refused.status, refused.code, refused.message) }

    // An aspect with nothing behind it would offer "Show the 0 questions" on the wheel and
    // give the AI an aspect to name with nothing to put forward.
    const visible = above.questions.filter(q => !mine.declined.includes(q.id)).length + mine.own.length
    if (visible === 0) {
      return sendError(res, 400, 'LAST_QUESTION', 'Every aspect keeps at least one question')
    }

    await ga.writeScopeConfig(req.firmId, ga.CONFIG_KEY, ga.toStored(state), req.userEmail)
    res.send(200, { aspects: await ga.resolveDetailed(req.firmId, ga.readScopeConfig), limits: LIMITS })
  } catch (err) {
    console.error('[growth-aspects] change failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save that just now')
  }
}

/** The inherited question with this id, or undefined. */
const inheritedQuestion = (above, id) => above.questions.find(q => q.id === id)
const notFound = { status: 404, code: 'NOT_FOUND', message: 'There is no question here with that id' }

/**
 * GET /api/firm-manager/growth-aspects  (manager)
 * @route GET /api/firm-manager/growth-aspects
 * @returns {{aspects: Array<object>, limits: object}} see `growthAspects.resolveDetailed`
 */
async function getForManager (req, res) {
  try {
    res.send(200, { aspects: await ga.resolveDetailed(req.firmId, ga.readScopeConfig), limits: LIMITS })
  } catch (err) {
    console.error('[growth-aspects] read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the Growth Aspect questions')
  }
}

/**
 * Add a question of this tier's own, after the inherited ones.
 * @route POST /api/firm-manager/growth-aspects/questions
 * @param {object} req.body - `{ aspect, text }`
 */
async function addQuestion (req, res) {
  await act(req, res, async (mine, above, { body }) => {
    const checked = ga.checkQuestionText(body.text)
    if (!checked.ok) { return { status: 400, code: 'INVALID_QUESTION', message: checked.error } }
    if (mine.own.length >= ga.MAX_OWN_PER_ASPECT) {
      return { status: 400, code: 'TOO_MANY', message: `An aspect takes ${ga.MAX_OWN_PER_ASPECT} added questions at most` }
    }
    const seqs = await ga.readScopeConfig(req.firmId, ga.NEXT_SEQ_KEY) || {}
    const minted = ga.nextOwnId(req.firmId, mine.own, seqs[body.aspect])
    mine.own.push({ id: minted.id, text: checked.value })
    // The counter is written first: a question saved under an id the counter never recorded
    // is the one a later add would mint again.
    await ga.writeScopeConfig(req.firmId, ga.NEXT_SEQ_KEY, Object.assign({}, seqs, { [body.aspect]: minted.seq }), req.userEmail)
  })
}

/**
 * Edit a question. One this tier added is edited in place; an inherited one is edited by an
 * override, with the wording it was edited against stamped as its baseline so a later change
 * above is offered rather than lost. Editing back to the inherited wording drops the edit.
 * @route PUT /api/firm-manager/growth-aspects/questions
 * @param {object} req.body - `{ aspect, id, text }`
 */
async function editQuestion (req, res) {
  await act(req, res, (mine, above, { body }) => {
    const checked = ga.checkQuestionText(body.text)
    if (!checked.ok) { return { status: 400, code: 'INVALID_QUESTION', message: checked.error } }
    const own = mine.own.find(q => q.id === body.id)
    if (own) { own.text = checked.value; return }
    const up = inheritedQuestion(above, body.id)
    if (!up) { return notFound }
    if (checked.value === up.text) {
      delete mine.overrides[body.id]
      delete mine.baselines[body.id]
      return
    }
    mine.overrides[body.id] = { text: checked.value }
    mine.baselines[body.id] = up.text
  })
}

/**
 * Switch an inherited question off or back on; `off: true` on a question this tier added
 * removes it (there is nothing above to switch back on to).
 * @route POST /api/firm-manager/growth-aspects/questions/off
 * @param {object} req.body - `{ aspect, id, off }`
 */
async function setQuestionOff (req, res) {
  await act(req, res, (mine, above, { body }) => {
    if (typeof body.off !== 'boolean') { return { status: 400, code: 'INVALID_OPTION', message: 'off must be true or false' } }
    if (mine.own.some(q => q.id === body.id)) {
      if (!body.off) { return { status: 400, code: 'NOT_DECLINABLE', message: 'A question added here is removed, not switched off' } }
      mine.own = mine.own.filter(q => q.id !== body.id)
      return
    }
    if (!inheritedQuestion(above, body.id)) { return notFound }
    const without = mine.declined.filter(id => id !== body.id)
    mine.declined = body.off ? without.concat([body.id]) : without
  })
}

/**
 * Drop this tier's edit of an inherited question and take the wording above — both "Use the
 * inherited wording" and "Use theirs" on the approved screen.
 * @route POST /api/firm-manager/growth-aspects/questions/use-inherited
 * @param {object} req.body - `{ aspect, id }`
 */
async function useInheritedQuestion (req, res) {
  await act(req, res, (mine, above, { body }) => {
    if (!mine.overrides[body.id]) { return { status: 404, code: 'NOT_FOUND', message: 'That question has not been edited here' } }
    delete mine.overrides[body.id]
    delete mine.baselines[body.id]
  })
}

/**
 * Keep this tier's edit and stop offering the newer wording above — until it changes again.
 * Only the baseline moves.
 * @route POST /api/firm-manager/growth-aspects/questions/keep-mine
 * @param {object} req.body - `{ aspect, id }`
 */
async function keepMineQuestion (req, res) {
  await act(req, res, (mine, above, { body }) => {
    const up = inheritedQuestion(above, body.id)
    if (!mine.overrides[body.id] || !up) { return { status: 404, code: 'NOT_FOUND', message: 'That question has not been edited here' } }
    mine.baselines[body.id] = up.text
  })
}

/**
 * Edit the aspect's description for this tier and the tiers below. Editing it back to the
 * inherited wording drops the edit.
 * @route PUT /api/firm-manager/growth-aspects/description
 * @param {object} req.body - `{ aspect, text }`
 */
async function editDescription (req, res) {
  await act(req, res, (mine, above, { body }) => {
    const checked = ga.checkDescriptionText(body.text)
    if (!checked.ok) { return { status: 400, code: 'INVALID_DESCRIPTION', message: checked.error } }
    if (checked.value === above.description) {
      mine.description = undefined
      mine.descriptionBaseline = undefined
      return
    }
    mine.description = checked.value
    mine.descriptionBaseline = above.description
  })
}

/**
 * Drop this tier's description and take the one above.
 * @route POST /api/firm-manager/growth-aspects/description/use-inherited
 * @param {object} req.body - `{ aspect }`
 */
async function useInheritedDescription (req, res) {
  await act(req, res, (mine) => {
    if (mine.description === undefined) { return { status: 404, code: 'NOT_FOUND', message: 'The description has not been edited here' } }
    mine.description = undefined
    mine.descriptionBaseline = undefined
  })
}

/**
 * Keep this tier's description and stop offering the newer one above.
 * @route POST /api/firm-manager/growth-aspects/description/keep-mine
 * @param {object} req.body - `{ aspect }`
 */
async function keepMineDescription (req, res) {
  await act(req, res, (mine, above) => {
    if (mine.description === undefined) { return { status: 404, code: 'NOT_FOUND', message: 'The description has not been edited here' } }
    mine.descriptionBaseline = above.description
  })
}

/**
 * GET /api/firm-manager/growth-aspects/history  (manager)
 * @route GET /api/firm-manager/growth-aspects/history
 * @returns {{history: Array<object>}} every saved version of THIS tier's decisions.
 */
async function history (req, res) {
  try {
    res.send(200, { history: await require('../utils/firmOverlay').getVersionHistory(req.firmId, ga.CONFIG_KEY) })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[growth-aspects] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/growth-aspects/restore  (manager)
 *
 * Restores this tier's decisions only. The id counter is a separate record and is never
 * restored, so a restored version can never hand a new question an id already issued.
 *
 * @route POST /api/firm-manager/growth-aspects/restore
 * @param {object} req.body - `{ versionId: number }`
 */
async function restore (req, res) {
  const versionId = Number(req.body && req.body.versionId)
  if (!Number.isInteger(versionId) || versionId < 1) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    // Scoped by req.firmId inside restoreVersion: another scope's version matches no row.
    await require('../utils/firmOverlay').restoreVersion(req.firmId, ga.CONFIG_KEY, versionId)
    res.send(200, { restored: true, aspects: await ga.resolveDetailed(req.firmId, ga.readScopeConfig), limits: LIMITS })
  } catch (err) {
    console.error('[growth-aspects] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = {
  getForManager,
  addQuestion,
  editQuestion,
  setQuestionOff,
  useInheritedQuestion,
  keepMineQuestion,
  editDescription,
  useInheritedDescription,
  keepMineDescription,
  history,
  restore
}
