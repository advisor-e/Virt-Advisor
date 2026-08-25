'use strict'

/**
 * A level's own prompt material — Restify routes. Item 4.31, Lane B of
 * `design/PROMPT-CONTRIBUTION-SAFETY.md`.
 *
 * 🔴 SEPARATE FROM `promptCheck.js` ON PURPOSE. That route is Lane A and its promise is
 * that it stores nothing — a promise a test asserts by reading its source for any sign of
 * a writer. An accountant asking *"is this any good?"* must never be able to change
 * anything by accident.
 *
 * 🔴 EVERY HANDLER IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT, and no
 * handler reads a scope from a body or a query. A level writes its own material, its own
 * edits and its own declines, and nothing else — `tier-cascade.md` P6.
 *
 * ⚠ THE MATERIAL IS CHECKED HERE, NOT TRUSTED FROM THE SCREEN, and the prose is never
 * logged.
 *
 * Node 14, CommonJS.
 */

const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const {
  read,
  write,
  loadState,
  loadInherited,
  resolveForScope,
  findChangedAbove,
  validateContribution,
  signatureOf,
  mintId,
  OWN_KEY,
  DECLINES_KEY,
  OVERRIDES_KEY,
  BASELINES_KEY,
  MAX_IN_FORCE,
  MAX_TITLE,
  MAX_TEXT
} = require('../utils/promptContributions')

/**
 * Everything the screen draws: the material in force here, what was inherited before this
 * level touched it, which rows this level has switched off, and which of its edits the
 * level above has since moved underneath.
 *
 * @route GET /api/firm-manager/prompt-contributions
 */
async function list (req, res) {
  try {
    const resolved = await resolveForScope(req.firmId, read)
    const inherited = await loadInherited(req.firmId, read)
    const state = await loadState(req.firmId, read)

    res.send(200, {
      resolved,
      inherited,
      declinedIds: state.declinedIds,
      changedAbove: await findChangedAbove(req.firmId, read),
      limits: { maxInForce: MAX_IN_FORCE, maxTitle: MAX_TITLE, maxText: MAX_TEXT }
    })
  } catch (err) {
    console.error('[prompt-contributions] read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read your firm\'s material')
  }
}

/**
 * Add a piece of material of this level's own. It is in force here at once, and is pushed
 * down to the levels below.
 *
 * A refusal comes back as a 200 with `refused`, carrying the shape the paste box draws.
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
    const own = (await loadState(req.firmId, read)).ownRows
    const rows = own.concat([{
      id: mintId(req.firmId, own),
      title: checked.value.title,
      text: checked.value.text,
      addedBy: req.userEmail || 'unknown',
      addedAt: new Date().toISOString()
    }])

    await write(req.firmId, OWN_KEY, rows, req.userEmail)
    res.send(200, { saved: true, refused: false, resolved: await resolveForScope(req.firmId, read) })
  } catch (err) {
    console.error('[prompt-contributions] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save that just now')
  }
}

/**
 * Edit a piece of material.
 *
 * A row this level added is edited in place. A row it inherited is edited by storing an
 * override against its id — the level above keeps its own version, and this level's
 * replaces it here and downward. The baseline is stamped at the same time, so a later
 * change above is noticed rather than silently overwriting the edit.
 *
 * @route PUT /api/firm-manager/prompt-contributions/:id
 * @param {object} req.body - `{ title, text }`
 */
async function update (req, res) {
  const id = req.params && req.params.id
  if (typeof id !== 'string' || id.trim() === '') {
    return sendError(res, 400, 'INVALID_ID', 'That is not a piece of material')
  }

  const checked = validateContribution(req.body)
  if (!checked.ok && checked.refusal) {
    return res.send(200, { saved: false, refused: true, refusal: checked.refusal })
  }
  if (!checked.ok) {
    return sendError(res, 400, 'INVALID_CONTRIBUTION', checked.error)
  }

  try {
    const state = await loadState(req.firmId, read)
    const mine = state.ownRows.filter(row => row.id === id)[0]

    if (mine) {
      const rows = state.ownRows.map(row => (
        row.id === id ? Object.assign({}, row, checked.value) : row
      ))
      await write(req.firmId, OWN_KEY, rows, req.userEmail)
    } else {
      const inherited = (await loadInherited(req.firmId, read)).filter(row => row.id === id)[0]
      if (!inherited) {
        return sendError(res, 404, 'NOT_FOUND', 'There is nothing here with that name')
      }
      const overrides = Object.assign({}, state.overrides)
      overrides[id] = checked.value
      await write(req.firmId, OVERRIDES_KEY, overrides, req.userEmail)

      const baselines = Object.assign({}, await read(req.firmId, BASELINES_KEY) || {})
      baselines[id] = signatureOf(inherited)
      await write(req.firmId, BASELINES_KEY, baselines, req.userEmail)
    }

    res.send(200, { saved: true, refused: false, resolved: await resolveForScope(req.firmId, read) })
  } catch (err) {
    console.error('[prompt-contributions] update failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save that just now')
  }
}

/**
 * Switch a piece of material off, or back on.
 *
 * A row this level added is deleted. A row it inherited is declined — the level above
 * keeps it, and it stops reaching this level and the levels below. Declining is free and
 * reversible, and changes nothing above.
 *
 * @route POST /api/firm-manager/prompt-contributions/:id/off
 * @param {object} req.body - `{ off }`
 */
async function setOff (req, res) {
  const id = req.params && req.params.id
  if (typeof id !== 'string' || id.trim() === '') {
    return sendError(res, 400, 'INVALID_ID', 'That is not a piece of material')
  }
  const off = req.body && req.body.off
  if (typeof off !== 'boolean') {
    return sendError(res, 400, 'INVALID_OPTION', 'off must be true or false')
  }

  try {
    const state = await loadState(req.firmId, read)
    const mine = state.ownRows.filter(row => row.id === id)[0]

    if (mine) {
      if (!off) {
        // A row this level added is deleted rather than declined, so there is nothing to
        // switch back on. Saying so beats silently doing nothing.
        return sendError(res, 400, 'NOT_DECLINABLE', 'That is your own material — add it again to bring it back')
      }
      await write(req.firmId, OWN_KEY, state.ownRows.filter(row => row.id !== id), req.userEmail)
    } else {
      const inherited = (await loadInherited(req.firmId, read)).filter(row => row.id === id)[0]
      if (!inherited) {
        return sendError(res, 404, 'NOT_FOUND', 'There is nothing here with that name')
      }
      const without = state.declinedIds.filter(declined => declined !== id)
      await write(req.firmId, DECLINES_KEY, off ? without.concat([id]) : without, req.userEmail)
    }

    res.send(200, { resolved: await resolveForScope(req.firmId, read) })
  } catch (err) {
    console.error('[prompt-contributions] off failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not record that just now')
  }
}

/**
 * Take the level above's newer version, dropping this level's edit.
 *
 * @route POST /api/firm-manager/prompt-contributions/:id/adopt
 */
async function adopt (req, res) {
  const id = req.params && req.params.id
  if (typeof id !== 'string' || id.trim() === '') {
    return sendError(res, 400, 'INVALID_ID', 'That is not a piece of material')
  }
  try {
    const state = await loadState(req.firmId, read)
    if (!Object.prototype.hasOwnProperty.call(state.overrides, id)) {
      return sendError(res, 404, 'NOT_FOUND', 'You have not edited that')
    }
    const overrides = Object.assign({}, state.overrides)
    delete overrides[id]
    await write(req.firmId, OVERRIDES_KEY, overrides, req.userEmail)

    const baselines = Object.assign({}, await read(req.firmId, BASELINES_KEY) || {})
    delete baselines[id]
    await write(req.firmId, BASELINES_KEY, baselines, req.userEmail)

    res.send(200, { resolved: await resolveForScope(req.firmId, read) })
  } catch (err) {
    console.error('[prompt-contributions] adopt failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not record that just now')
  }
}

/**
 * Refuse the level above's newer version and keep this level's own wording.
 *
 * The edit is untouched; only the baseline moves, so the row stops being reported as
 * changed until the level above changes it again.
 *
 * @route POST /api/firm-manager/prompt-contributions/:id/keep-mine
 */
async function keepMine (req, res) {
  const id = req.params && req.params.id
  if (typeof id !== 'string' || id.trim() === '') {
    return sendError(res, 400, 'INVALID_ID', 'That is not a piece of material')
  }
  try {
    const state = await loadState(req.firmId, read)
    if (!Object.prototype.hasOwnProperty.call(state.overrides, id)) {
      return sendError(res, 404, 'NOT_FOUND', 'You have not edited that')
    }
    const inherited = (await loadInherited(req.firmId, read)).filter(row => row.id === id)[0]
    if (!inherited) {
      return sendError(res, 404, 'NOT_FOUND', 'There is nothing above you with that name')
    }

    const baselines = Object.assign({}, await read(req.firmId, BASELINES_KEY) || {})
    baselines[id] = signatureOf(inherited)
    await write(req.firmId, BASELINES_KEY, baselines, req.userEmail)

    res.send(200, { changedAbove: await findChangedAbove(req.firmId, read) })
  } catch (err) {
    console.error('[prompt-contributions] keep-mine failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not record that just now')
  }
}

/**
 * Every saved version of this level's own material.
 * @route GET /api/firm-manager/prompt-contributions/history
 */
async function history (req, res) {
  try {
    res.send(200, { history: await overlay.getVersionHistory(req.firmId, OWN_KEY) })
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
    res.send(200, { restored: true, resolved: await resolveForScope(req.firmId, read) })
  } catch (err) {
    console.error('[prompt-contributions] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { list, add, update, setOff, adopt, keepMine, history, restore }
