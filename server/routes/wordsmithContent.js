'use strict'

/**
 * Wordsmith — the hub tab's Restify routes. Item 15.14, screens 6 and 7 of
 * `design/mockups/wordsmith-screens.html`, approved by Mike 2026-09-29, and the split of what
 * each tier may change on `wordsmith-style-settings.html`, approved the same day.
 *
 * One route per action on the approved screen, shaped as Growth Aspect Questions' routes are.
 * Every action takes effect when it is made and is one saved version of this tier's decisions.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler reads a
 * scope from a body or a query, so a tier writes only its own decisions and never reaches the
 * tier above it or a sibling (`tier-cascade.md` P6, P11).
 *
 * Managers only (`firmAuth` + `requireManagerRole`, wired in restify-server.js). Advisors never
 * read this content; the planner's Wordsmith route resolves it for them on the server.
 */

const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const wc = require('../utils/wordsmithContent')
const { STATEMENT_NAMES } = require('../utils/wordsmith')

/** The limits the screen stops its boxes at, so a box never accepts what a save refuses. */
const LIMITS = {
  maxDefinition: wc.MAX_DEFINITION,
  maxQuestion: wc.MAX_QUESTION,
  maxRule: wc.MAX_RULE,
  maxInstruction: wc.MAX_INSTRUCTION,
  minWords: wc.MIN_WORDS,
  maxWords: wc.MAX_WORDS
}

/** The text field of each list part: a definition row's `text`, a question's `question`. */
const FIELD = { definition: 'text', questions: 'question' }

const notFound = { status: 404, code: 'NOT_FOUND', message: 'There is nothing here with that id' }
const notEdited = { status: 404, code: 'NOT_FOUND', message: 'That has not been edited here' }

async function view (req) {
  return Object.assign(await wc.resolveDetailed(req.firmId, wc.readScopeConfig), { limits: LIMITS })
}

/**
 * Load this tier's decisions, apply `change`, refuse a result that breaks a standing rule, save,
 * and answer with the tab's resolved content.
 *
 * `change(state, above, ctx)` mutates `state` in place and returns nothing on success, or
 * `{ status, code, message }` to refuse. `ctx.name` is the statement when the action names one.
 *
 * @param {object} req
 * @param {object} res
 * @param {boolean} needsStatement - whether the body must name one of the five
 * @param {Function} change
 * @returns {Promise<void>}
 */
async function act (req, res, needsStatement, change) {
  const body = req.body || {}
  const name = body.statement
  if (needsStatement && !STATEMENT_NAMES.includes(name)) {
    return sendError(res, 400, 'UNKNOWN_STATEMENT', 'That is not one of the five statements')
  }
  try {
    const state = wc.readState(await wc.readScopeConfig(req.firmId, wc.CONFIG_KEY))
    const above = await wc.loadInherited(req.firmId, wc.readScopeConfig)
    const ctx = { req, body, name, up: needsStatement ? above.statements.find(s => s.name === name) : null }

    const refused = await change(state, above, ctx)
    if (refused) { return sendError(res, refused.status, refused.code, refused.message) }

    // Step 1 tells the model what a statement is from its first Alignment document row, and the
    // Alignment document wins wherever best practice differs (Mike, build detail 12): a statement
    // is never left without one.
    if (needsStatement) {
      const mine = state.statements[name].definition
      const kept = ctx.up.definition.filter(r => !mine.declined.includes(r.id)).concat(mine.own)
      if (!kept.some(r => r.basis === 'alignment')) {
        return sendError(res, 400, 'LAST_ALIGNMENT_ROW', 'Every statement keeps at least one Alignment document row')
      }
    }

    await wc.writeScopeConfig(req.firmId, wc.CONFIG_KEY, wc.toStored(state), req.userEmail)
    res.send(200, await view(req))
  } catch (err) {
    console.error('[wordsmith-content] change failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save that just now')
  }
}

/** Refuse a part other than the two lists. */
function partOf (body) {
  return Object.prototype.hasOwnProperty.call(FIELD, body.part) ? body.part : null
}
const badPart = { status: 400, code: 'UNKNOWN_PART', message: 'part must be definition or questions' }

/**
 * GET /api/firm-manager/wordsmith  (manager)
 * @route GET /api/firm-manager/wordsmith
 * @returns {{statements: Array<object>, style: Array<object>, limits: object}} see
 *   `wordsmithContent.resolveDetailed`
 */
async function getForManager (req, res) {
  try {
    res.send(200, await view(req))
  } catch (err) {
    console.error('[wordsmith-content] read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read Wordsmith\'s content')
  }
}

/**
 * Add a definition row or a question of this tier's own. A definition row names its basis — only
 * a row a level adds chooses one (build detail 11).
 * @route POST /api/firm-manager/wordsmith/rows
 * @param {object} req.body - `{ statement, part, text?, question?, basis?, cites? }`
 */
async function addRow (req, res) {
  await act(req, res, true, async (state, above, { body, name }) => {
    const part = partOf(body)
    if (!part) { return badPart }
    const mine = state.statements[name][part]
    if (mine.own.length >= wc.MAX_OWN_PER_PART) {
      return { status: 400, code: 'TOO_MANY', message: 'A statement takes ' + wc.MAX_OWN_PER_PART + ' added rows at most' }
    }
    const checked = part === 'definition'
      ? wc.checkText(body.text, wc.MAX_DEFINITION, 'A definition row')
      : wc.checkText(body.question, wc.MAX_QUESTION, 'A question')
    if (!checked.ok) { return { status: 400, code: 'INVALID_TEXT', message: checked.error } }
    let row
    if (part === 'definition') {
      if (!wc.BASES.includes(body.basis)) { return { status: 400, code: 'INVALID_BASIS', message: 'basis must be alignment or best-practice' } }
      const cites = wc.checkCites(body.cites)
      if (!cites.ok) { return { status: 400, code: 'INVALID_CITES', message: cites.error } }
      row = { basis: body.basis, text: checked.value, ...(cites.value ? { cites: cites.value } : {}) }
    } else {
      row = { question: checked.value }
    }
    const seqKey = name + ':' + part
    const seqs = await wc.readScopeConfig(req.firmId, wc.NEXT_SEQ_KEY) || {}
    const minted = wc.nextOwnId(req.firmId, part, mine.own, seqs[seqKey])
    mine.own.push(Object.assign({ id: minted.id }, row))
    // The counter is written first: a row saved under an id the counter never recorded is the one
    // a later add would mint again.
    await wc.writeScopeConfig(req.firmId, wc.NEXT_SEQ_KEY, Object.assign({}, seqs, { [seqKey]: minted.seq }), req.userEmail)
  })
}

/**
 * Edit a definition row (and its sources) or a question. One this tier added is edited in place;
 * an inherited one by an override, with the wording it was edited against as its baseline, so a
 * later change above is offered rather than lost. Editing back to the inherited wording drops
 * the edit. An inherited row keeps its basis (build detail 11).
 * @route PUT /api/firm-manager/wordsmith/rows
 * @param {object} req.body - `{ statement, part, id, text?, question?, cites? }`
 */
async function editRow (req, res) {
  await act(req, res, true, (state, above, { body, name, up }) => {
    const part = partOf(body)
    if (!part) { return badPart }
    const field = FIELD[part]
    const checked = part === 'definition'
      ? wc.checkText(body.text, wc.MAX_DEFINITION, 'A definition row')
      : wc.checkText(body.question, wc.MAX_QUESTION, 'A question')
    if (!checked.ok) { return { status: 400, code: 'INVALID_TEXT', message: checked.error } }
    const cites = part === 'definition' ? wc.checkCites(body.cites) : { ok: true, value: undefined }
    if (!cites.ok) { return { status: 400, code: 'INVALID_CITES', message: cites.error } }

    const mine = state.statements[name][part]
    const own = mine.own.find(r => r.id === body.id)
    if (own) {
      own[field] = checked.value
      if (cites.value) { own.cites = cites.value }
      return
    }
    const inherited = (part === 'definition' ? up.definition : up.elements).find(r => r.id === body.id)
    if (!inherited) { return notFound }
    if (checked.value === inherited[field] && !cites.value) {
      delete mine.overrides[body.id]
      delete mine.baselines[body.id]
      return
    }
    mine.overrides[body.id] = Object.assign({ [field]: checked.value }, cites.value ? { cites: cites.value } : {})
    mine.baselines[body.id] = inherited[field]
  })
}

/**
 * Switch an inherited row off or back on; `off: true` on a row this tier added removes it.
 * @route POST /api/firm-manager/wordsmith/rows/off
 * @param {object} req.body - `{ statement, part, id, off }`
 */
async function setRowOff (req, res) {
  await act(req, res, true, (state, above, { body, name, up }) => {
    const part = partOf(body)
    if (!part) { return badPart }
    if (typeof body.off !== 'boolean') { return { status: 400, code: 'INVALID_OPTION', message: 'off must be true or false' } }
    const mine = state.statements[name][part]
    if (mine.own.some(r => r.id === body.id)) {
      if (!body.off) { return { status: 400, code: 'NOT_DECLINABLE', message: 'A row added here is removed, not switched off' } }
      mine.own = mine.own.filter(r => r.id !== body.id)
      return
    }
    if (!(part === 'definition' ? up.definition : up.elements).some(r => r.id === body.id)) { return notFound }
    const without = mine.declined.filter(id => id !== body.id)
    mine.declined = body.off ? without.concat([body.id]) : without
  })
}

/**
 * Drop this tier's edit of an inherited row and take the wording above — both "Use the inherited
 * wording" and "Use theirs" on the approved screen.
 * @route POST /api/firm-manager/wordsmith/rows/use-inherited
 * @param {object} req.body - `{ statement, part, id }`
 */
async function useInheritedRow (req, res) {
  await act(req, res, true, (state, above, { body, name }) => {
    const part = partOf(body)
    if (!part) { return badPart }
    const mine = state.statements[name][part]
    if (!mine.overrides[body.id]) { return notEdited }
    delete mine.overrides[body.id]
    delete mine.baselines[body.id]
  })
}

/**
 * Keep this tier's edit and stop offering the newer wording above, until it changes again.
 * @route POST /api/firm-manager/wordsmith/rows/keep-mine
 * @param {object} req.body - `{ statement, part, id }`
 */
async function keepMineRow (req, res) {
  await act(req, res, true, (state, above, { body, name, up }) => {
    const part = partOf(body)
    if (!part) { return badPart }
    const mine = state.statements[name][part]
    const inherited = (part === 'definition' ? up.definition : up.elements).find(r => r.id === body.id)
    if (!mine.overrides[body.id] || !inherited) { return notEdited }
    mine.baselines[body.id] = inherited[FIELD[part]]
  })
}

/** The one-value fields, their stored names and what they are checked against above. */
const VALUES = {
  rule: { stored: 'rule', baseline: 'ruleBaseline', aboveOf: up => up.domain.rule, check: v => wc.checkText(v, wc.MAX_RULE, 'A writing rule') },
  maxWords: { stored: 'maxWords', baseline: 'maxWordsBaseline', aboveOf: up => up.maxWords, check: wc.checkMaxWords }
}
const badValue = { status: 400, code: 'UNKNOWN_FIELD', message: 'field must be rule or maxWords' }
const valueOf = body => (Object.prototype.hasOwnProperty.call(VALUES, body.field) ? VALUES[body.field] : null)

/**
 * Edit a statement's writing rule or word limit for this tier and those below. Setting it back to
 * the inherited value drops the edit.
 * @route PUT /api/firm-manager/wordsmith/value
 * @param {object} req.body - `{ statement, field: 'rule'|'maxWords', value }`
 */
async function editValue (req, res) {
  await act(req, res, true, (state, above, { body, name, up }) => {
    const v = valueOf(body)
    if (!v) { return badValue }
    const checked = v.check(body.value)
    if (!checked.ok) { return { status: 400, code: 'INVALID_VALUE', message: checked.error } }
    const mine = state.statements[name]
    if (checked.value === v.aboveOf(up)) {
      mine[v.stored] = undefined
      mine[v.baseline] = undefined
      return
    }
    mine[v.stored] = checked.value
    mine[v.baseline] = v.aboveOf(up)
  })
}

/**
 * @route POST /api/firm-manager/wordsmith/value/use-inherited
 * @param {object} req.body - `{ statement, field }`
 */
async function useInheritedValue (req, res) {
  await act(req, res, true, (state, above, { body, name }) => {
    const v = valueOf(body)
    if (!v) { return badValue }
    const mine = state.statements[name]
    if (mine[v.stored] === undefined) { return notEdited }
    mine[v.stored] = undefined
    mine[v.baseline] = undefined
  })
}

/**
 * @route POST /api/firm-manager/wordsmith/value/keep-mine
 * @param {object} req.body - `{ statement, field }`
 */
async function keepMineValue (req, res) {
  await act(req, res, true, (state, above, { body, name, up }) => {
    const v = valueOf(body)
    if (!v) { return badValue }
    const mine = state.statements[name]
    if (mine[v.stored] === undefined) { return notEdited }
    mine[v.baseline] = v.aboveOf(up)
  })
}

/** The inherited style option with this id, or undefined. */
const styleOption = (above, id) => above.style.flatMap(r => r.options).find(o => o.id === id)

/**
 * Reword the instruction behind one style choice. The choices themselves are fixed in code, so
 * there is no switch-off and no add (Mike, 2026-09-29): a row is only ever edited.
 * @route PUT /api/firm-manager/wordsmith/style
 * @param {object} req.body - `{ id, instruction }`
 */
async function editStyle (req, res) {
  await act(req, res, false, (state, above, { body }) => {
    const up = styleOption(above, body.id)
    if (!up) { return notFound }
    const checked = wc.checkText(body.instruction, wc.MAX_INSTRUCTION, 'An instruction')
    if (!checked.ok) { return { status: 400, code: 'INVALID_TEXT', message: checked.error } }
    if (checked.value === up.instruction) {
      delete state.style.overrides[body.id]
      delete state.style.baselines[body.id]
      return
    }
    state.style.overrides[body.id] = { instruction: checked.value }
    state.style.baselines[body.id] = up.instruction
  })
}

/**
 * @route POST /api/firm-manager/wordsmith/style/use-inherited
 * @param {object} req.body - `{ id }`
 */
async function useInheritedStyle (req, res) {
  await act(req, res, false, (state, above, { body }) => {
    if (!state.style.overrides[body.id]) { return notEdited }
    delete state.style.overrides[body.id]
    delete state.style.baselines[body.id]
  })
}

/**
 * @route POST /api/firm-manager/wordsmith/style/keep-mine
 * @param {object} req.body - `{ id }`
 */
async function keepMineStyle (req, res) {
  await act(req, res, false, (state, above, { body }) => {
    const up = styleOption(above, body.id)
    if (!state.style.overrides[body.id] || !up) { return notEdited }
    state.style.baselines[body.id] = up.instruction
  })
}

/**
 * GET /api/firm-manager/wordsmith/history  (manager)
 * @route GET /api/firm-manager/wordsmith/history
 * @returns {{history: Array<object>}} every saved version of THIS tier's decisions.
 */
async function history (req, res) {
  try {
    res.send(200, { history: await require('../utils/firmOverlay').getVersionHistory(req.firmId, wc.CONFIG_KEY) })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[wordsmith-content] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/wordsmith/restore  (manager)
 *
 * Restores this tier's decisions only. The id counter is a separate record and is never restored.
 *
 * @route POST /api/firm-manager/wordsmith/restore
 * @param {object} req.body - `{ versionId: number }`
 */
async function restore (req, res) {
  const versionId = Number(req.body && req.body.versionId)
  if (!Number.isInteger(versionId) || versionId < 1) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    // Scoped by req.firmId inside restoreVersion: another scope's version matches no row.
    await require('../utils/firmOverlay').restoreVersion(req.firmId, wc.CONFIG_KEY, versionId)
    res.send(200, Object.assign({ restored: true }, await view(req)))
  } catch (err) {
    console.error('[wordsmith-content] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = {
  getForManager,
  addRow,
  editRow,
  setRowOff,
  useInheritedRow,
  keepMineRow,
  editValue,
  useInheritedValue,
  keepMineValue,
  editStyle,
  useInheritedStyle,
  keepMineStyle,
  history,
  restore
}
