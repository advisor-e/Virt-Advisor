'use strict'

/**
 * @file Strategy Planner — the session an advisor runs with a client.
 * @module server/routes/strategyPlanner
 *
 * To-do item 15.1. Approved artefact: `design/mockups/strategy-planner.html`, eleven
 * decisions ruled by Mike 2026-09-16 and registered in `design/ARTEFACTS.md`.
 *
 * 🔴 THE TOKEN DECIDES THE FIRM, AND THE REQUEST NEVER DOES. `req.firmId` and
 * `req.advisorId` are resolved by firmAuth from the verified token. A firmId in a body or
 * query string would be an IDOR straight into another firm's client plans, so none is
 * read anywhere in this file. The store scopes every statement by firm as well, so this
 * is the outer of two boundaries rather than the only one.
 *
 * 🔴 WHAT THESE ROUTES MOVE IS SENSITIVE. A client's whole strategic plan in their own
 * words, the staff they named in Task / Whom / When, and — once Meeting Review's three
 * non-coding gates clear — the original spoken passages behind each tidied sentence. A
 * session that does not belong to the caller's firm reads as ABSENT rather than
 * forbidden, so an id cannot be probed for existence one number at a time.
 *
 * 🔴 NOTHING HERE SENDS ANYTHING TO A MODEL. Decision 11 keeps AI out of placement
 * entirely: the field open at the time claims the words, from the navigation timeline.
 * If a future route asks a model where a passage belongs, that ruling has been broken
 * and LLM output is being trusted as structured data.
 *
 * Node 14, CommonJS.
 */

const frameworks = require('../utils/strategyFrameworks')
const store = require('../utils/strategySessionStore')
const { sendError } = require('../utils/sendError')

/**
 * Bounds one request body's entry list. The Action Plan alone is 24 boxes, so this has to
 * clear a whole table being saved at once and still refuse a bulk import.
 */
const MAX_ENTRIES_PER_SAVE = 60

/**
 * The nine Growth Aspects, already authored in `data/growth-fundamentals.json` — names and
 * one-line descriptions. The ~100 probing questions behind them are NOT here and are item
 * 15.2, filed on Mike's yes rather than quietly deferred.
 */
const GROWTH_ASPECTS = (require('../../data/growth-fundamentals.json').growthAspects || [])
  .map(a => ({ name: a.name, description: a.description }))

/**
 * The caller's firm, or null when the token carried none.
 * @param {object} req
 * @returns {string|null}
 */
function firmOf (req) {
  return req.firmId || null
}

/**
 * GET /api/strategy/frameworks
 *
 * Platform content — the frameworks and their capture shapes. No client data, but it is
 * behind firmAuth like every other advisor-facing read so an unauthenticated caller
 * cannot enumerate the library.
 *
 * @route GET /api/strategy/frameworks
 * @param {object} req - firmAuth-verified; optional `?planningDomain=` filter
 * @param {object} res
 * @returns {200} { success, planningDomains, frameworks, timestamp }
 */
// eslint-disable-next-line require-await -- see below
async function getFrameworks (req, res) {
  // ⚠ `async` THOUGH NOTHING IS AWAITED, AND IT IS NOT OPTIONAL. Restify accepts a
  // handler that is async with (req, res), or callback-based with (req, res, next), and
  // REFUSES a plain two-argument function — it throws at mount time, so the whole backend
  // fails to start rather than this one route failing. Caught by
  // tests/unit/serverMounts.test.js, which exists for exactly this.
  try {
    const domain = req.query && req.query.planningDomain
    // 🔴 CLOSERS ARE EXCLUDED FROM `frameworks`, and that is not tidiness. Screen 1 builds
    // its Session Scope table from this list by Planning Domain, so a closing framework
    // left in it would appear as something to tick — and every session already gets it.
    // Caught by the route test, which counted what came back.
    const list = domain
      ? frameworks.frameworksForPlanningDomain(domain)
      : frameworks.listFrameworks().filter(f => !f.closesTheSession)

    res.send(200, {
      success: true,
      // The four domains with the deck's own descriptions, each carrying its count. A
      // count of zero stays visible on purpose — see listPlanningDomains.
      planningDomains: frameworks.listPlanningDomains(),
      frameworks: list,
      // The two that close every session — Strategic Statements and the Action Plan.
      // Never on a Session Scope table, because they are never chosen.
      closingFrameworks: frameworks.closingFrameworks(),
      // The nine Growth Aspects, for the coverage check. Orientation 1's own instruction:
      // "Objectives should be tested against the 9 Growth Aspects." Names and descriptions
      // come from data/growth-fundamentals.json, where they already lived.
      growthAspects: GROWTH_ASPECTS,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[strategy-planner] getFrameworks failed:', err.message)
    sendError(res, 500, 'FRAMEWORKS_ERROR', 'Could not load the planning frameworks')
  }
}

/**
 * POST /api/strategy/sessions
 *
 * Opens a planning session for one client. Decision 1: nothing is pre-ticked, so a
 * session legitimately exists before any framework is chosen.
 *
 * @route POST /api/strategy/sessions
 * @param {object} req - firmAuth-verified; body `{ clientId, scope? }`
 * @param {object} res
 * @returns {201} { success, sessionId, timestamp }
 */
async function createSession (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  const body = req.body || {}
  try {
    const sessionId = await store.createSession({
      clientId: body.clientId,
      advisorId: req.advisorId,
      advisorName: req.advisorName,
      firmId,
      scope: body.scope
    })

    res.send(201, {
      success: true,
      sessionId,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    if (err.code === 'BAD_INPUT') {
      sendError(res, 400, 'BAD_INPUT', err.message)
      return
    }
    console.error('[strategy-planner] createSession failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not open the planning session')
  }
}

/**
 * GET /api/strategy/sessions/:id
 *
 * One session with everything captured in it, and its navigation timeline.
 *
 * @route GET /api/strategy/sessions/:id
 * @param {object} req - firmAuth-verified
 * @param {object} res
 * @returns {200} { success, session, entries, timeline, timestamp }
 * @returns {404} when the session does not exist OR belongs to another firm — the two are
 *   deliberately indistinguishable.
 */
async function getSession (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  try {
    const session = await store.getSession(req.params.id, firmId)
    if (!session) {
      sendError(res, 404, 'NOT_FOUND', 'No such planning session')
      return
    }

    const [entries, timeline] = await Promise.all([
      store.loadEntries(session.id, firmId),
      store.loadTimeline(session.id, firmId)
    ])

    res.send(200, {
      success: true,
      session,
      entries,
      timeline,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    if (err.code === 'BAD_INPUT') {
      sendError(res, 400, 'BAD_INPUT', err.message)
      return
    }
    console.error('[strategy-planner] getSession failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the planning session')
  }
}

/**
 * GET /api/strategy/sessions?clientId=
 *
 * Every session this firm holds for one client, newest first. The decks carry tables
 * forward between sessions, so this is how the next session finds the last one.
 *
 * @route GET /api/strategy/sessions
 * @param {object} req - firmAuth-verified; `?clientId=` required
 * @param {object} res
 * @returns {200} { success, sessions, timestamp }
 */
async function listSessions (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  const clientId = req.query && req.query.clientId
  try {
    const sessions = await store.listSessionsForClient(clientId, firmId)
    res.send(200, { success: true, sessions, timestamp: new Date().toISOString() })
  } catch (err) {
    if (err.code === 'BAD_INPUT') {
      sendError(res, 400, 'BAD_INPUT', err.message)
      return
    }
    console.error('[strategy-planner] listSessions failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the planning sessions')
  }
}

/**
 * PUT /api/strategy/sessions/:id/scope
 *
 * Records what screen 1 ticked. Every framework named must be one the Planner actually
 * holds — a scope naming something unauthored would render an empty session.
 *
 * @route PUT /api/strategy/sessions/:id/scope
 * @param {object} req - firmAuth-verified; body `{ domains: string[], frameworks: string[] }`
 * @param {object} res
 * @returns {200} { success, timestamp }
 */
async function putScope (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  const body = req.body || {}
  const chosen = Array.isArray(body.frameworks) ? body.frameworks : []
  const unknown = chosen.filter(id => !frameworks.getFramework(id))
  if (unknown.length) {
    sendError(res, 400, 'UNKNOWN_FRAMEWORK',
      'The session names a framework that does not exist: ' + unknown.join(', '))
    return
  }

  try {
    const done = await store.setScope(req.params.id, firmId, {
      domains: Array.isArray(body.domains) ? body.domains : [],
      frameworks: chosen
    })
    if (!done) {
      sendError(res, 404, 'NOT_FOUND', 'No such planning session')
      return
    }
    res.send(200, { success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    if (err.code === 'BAD_INPUT') {
      sendError(res, 400, 'BAD_INPUT', err.message)
      return
    }
    console.error('[strategy-planner] putScope failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the session scope')
  }
}

/**
 * PUT /api/strategy/sessions/:id/entries
 *
 * Saves one or more capture boxes. A save REPLACES what a box holds — it is a live
 * worksheet an advisor edits in the room.
 *
 * 🔴 A BOX NOBODY AUTHORED IS REFUSED. `hasField` checks the framework really has that
 * field, so a malformed or hostile body cannot invent rows in a client's plan that no
 * screen will ever show and no one will ever find.
 *
 * @route PUT /api/strategy/sessions/:id/entries
 * @param {object} req - firmAuth-verified; body `{ entries: [{ frameworkId, fieldKey,
 *   value, source?, originalText? }] }`
 * @param {object} res
 * @returns {200} { success, saved, timestamp }
 */
async function putEntries (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  const body = req.body || {}
  const entries = Array.isArray(body.entries) ? body.entries : []
  if (!entries.length) {
    sendError(res, 400, 'BAD_INPUT', 'No entries to save')
    return
  }
  if (entries.length > MAX_ENTRIES_PER_SAVE) {
    sendError(res, 400, 'BAD_INPUT', 'Too many entries in one save')
    return
  }

  const invalid = entries.filter(e => !e || !frameworks.hasField(e.frameworkId, e.fieldKey))
  if (invalid.length) {
    sendError(res, 400, 'UNKNOWN_FIELD',
      'A capture box in this save does not belong to its framework')
    return
  }

  try {
    let saved = 0
    // Sequential rather than parallel: they all write to the same session, and an
    // advisor saving a card is a handful of boxes, not a bulk import.
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      const done = await store.saveEntry({
        sessionId: req.params.id,
        firmId,
        frameworkId: e.frameworkId,
        fieldKey: e.fieldKey,
        value: e.value,
        source: e.source,
        originalText: e.originalText
      })
      if (!done) {
        sendError(res, 404, 'NOT_FOUND', 'No such planning session')
        return
      }
      saved++
    }

    res.send(200, { success: true, saved, timestamp: new Date().toISOString() })
  } catch (err) {
    if (err.code === 'BAD_INPUT') {
      sendError(res, 400, 'BAD_INPUT', err.message)
      return
    }
    console.error('[strategy-planner] putEntries failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the session entries')
  }
}

/**
 * POST /api/strategy/sessions/:id/timeline
 *
 * The advisor moved to a box, or left the session.
 *
 * 🔴 THIS IS DECISION 11'S MECHANISM, NOT TELEMETRY. It is what lets a recording's words
 * be apportioned to the right box without a model deciding anything. A build that treats
 * it as optional has left AI judgement as the only route, which that ruling forbids.
 *
 * @route POST /api/strategy/sessions/:id/timeline
 * @param {object} req - firmAuth-verified; body `{ frameworkId, fieldKey }` to open a
 *   box, or `{ close: true }` to close whatever is open
 * @param {object} res
 * @returns {200} { success, timestamp }
 */
async function postTimeline (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  const body = req.body || {}
  try {
    let done
    if (body.close === true) {
      done = await store.closeOpenField(req.params.id, firmId)
    } else {
      if (!frameworks.hasField(body.frameworkId, body.fieldKey)) {
        sendError(res, 400, 'UNKNOWN_FIELD',
          'That capture box does not belong to its framework')
        return
      }
      done = await store.openField({
        sessionId: req.params.id,
        firmId,
        frameworkId: body.frameworkId,
        fieldKey: body.fieldKey
      })
    }

    if (!done) {
      sendError(res, 404, 'NOT_FOUND', 'No such planning session')
      return
    }
    res.send(200, { success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    if (err.code === 'BAD_INPUT') {
      sendError(res, 400, 'BAD_INPUT', err.message)
      return
    }
    console.error('[strategy-planner] postTimeline failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not record the session timeline')
  }
}

module.exports = {
  getFrameworks,
  createSession,
  getSession,
  listSessions,
  putScope,
  putEntries,
  postTimeline
}
