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
 * 🔴 ONE ROUTE SENDS TO A MODEL, AND EXACTLY ONE. `postSuggest` — the "Suggest for this
 * client" button, Decision C, stage 6 — sends the advisor's own summaries of the client's
 * last two conversations and nothing else. No id of any kind and no transcript leaves this
 * file. Every other route here is local.
 *
 * 🔴 DECISION 11 IS UNTOUCHED BY THAT, AND IT KEEPS AI OUT OF PLACEMENT ENTIRELY: the
 * field open at the time claims the words, from the navigation timeline. If a future route
 * asks a model where a passage belongs, that ruling has been broken and LLM output is
 * being trusted as structured data. Suggesting what to DISCUSS and deciding where spoken
 * words BELONG are different questions; the first is ruled in, the second ruled out.
 *
 * Node 14, CommonJS.
 */

const frameworks = require('../utils/strategyFrameworks')
const captureForms = require('../utils/strategyCaptureForms')
const store = require('../utils/strategySessionStore')
const pretick = require('../utils/strategyPretick')
const caseStore = require('../utils/caseStore')
const clientStore = require('../utils/clientStore')
const { getClient } = require('../utils/aiProvider')
const sessionProcess = require('../utils/sessionProcess')
const { tierOfScope } = require('../utils/tierChain')
const { loadFirmConfig, saveFirmConfig, getVersionHistory, restoreVersion } = require('../utils/firmOverlay')
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
 * GET /api/strategy/concepts
 *
 * The session scope menu — the 47 concepts as the five panels the advisor ticks, in Mike's
 * own order. Platform content, behind firmAuth like every other advisor-facing read.
 *
 * 🔴 GROUPED BY DECK, NEVER BY DOMAIN. Strategic Orientation is one Planning Domain in two
 * decks and only the second carries a scope table. The acceptance test — Pivot.pdf — takes
 * nine concepts from one deck and two from another, so the panels are documents and the
 * ticks cross freely between them.
 *
 * 🔴 EVERY WORD IN A ROW IS MIKE'S, read off his decks by machine. Decision A: this route
 * joins and counts, and it never rewrites, summarises or fills a blank. A null description
 * is an agenda row whose line he has not written (Decision B) and is returned as null.
 *
 * @route GET /api/strategy/concepts
 * @param {object} req - firmAuth-verified; takes no parameters
 * @param {object} res
 * @returns {200} { success, decks, conceptCount, timestamp }
 */
// eslint-disable-next-line require-await -- Restify refuses a plain (req, res) handler; see getFrameworks
async function getConcepts (req, res) {
  try {
    const decks = frameworks.listDecks()
    res.send(200, {
      success: true,
      decks,
      // The advisor is told the size of the menu rather than left to count five panels.
      conceptCount: decks.reduce((n, d) => n + d.conceptCount, 0),
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[strategy-planner] getConcepts failed:', err.message)
    sendError(res, 500, 'CONCEPTS_ERROR', 'Could not load the session scope menu')
  }
}

/**
 * GET /api/strategy/concepts/:id/capture
 *
 * The table an advisor fills in for one concept, read from Mike's own fill-in
 * template rather than authored here. Every label in the reply is a string from
 * one of his documents.
 *
 * 🔴 A CONCEPT WITH NO TABLE SAYS SO. 11 of the 47 have none, because none was ever
 * measured against a template (census §4 is explicit that choosing one is a design
 * decision, not a reading). Those reply `supplied: false` with the reason. A borrowed table would put words in
 * front of a client that Mike did not write.
 *
 * 🔴 THE WHOLE TABLE COMES BACK, AND A CONCEPT IS WORKED ONCE. Mike's ruling,
 * 2026-09-21: a concept is listed once, chosen once, sorted once, and appears once
 * in Run session and once in the plan. This route used to return a `parts` split as
 * well, so Porter's 16 observation lines and 16 response lines could be opened as
 * two separate visits; that split is deleted and the advisor gets Mike's table as
 * he wrote it, in one place.
 *
 * @route GET /api/strategy/concepts/:id/capture
 * @param {object} req - firmAuth-verified; `params.id` is a concept id
 * @param {object} res
 * @returns {200} { success, conceptId, capture, timestamp }
 * @returns {404} when no concept carries that id
 */
// Restify's own contract, not a style choice: a handler is either async with
// (req, res) or callback-based with (req, res, next), and mounting one that is
// neither throws at boot. This route reads two files already in memory, so it has
// nothing to await; every other handler here is async and a lone callback
// signature would be the odd one out. `tests/unit/serverMounts.test.js` proves it.
// eslint-disable-next-line require-await
async function getConceptCapture (req, res) {
  const id = String((req.params && req.params.id) || '')
  try {
    const concept = frameworks.getConcept(id)
    if (!concept) {
      sendError(res, 404, 'NO_CONCEPT', 'No such concept')
      return
    }

    res.send(200, {
      success: true,
      conceptId: concept.id,
      name: concept.name,
      // 🔴 THE CONCEPT TRAVELS WITH ITS TABLE. An advisor teaches the concept and
      // then captures it; a card that carries only the boxes cannot be taught from,
      // which is exactly what Mike found on 2026-09-17 — "how am I supposed to
      // explain Porter's 5 Forces, I can't even see the concept". Both lines are
      // his own, from the deck's Session Scope table.
      conceptSummary: concept.conceptSummary || '',
      helpsClientTo: concept.helpsClientTo || '',
      teachingForm: concept.teachingForm || '',
      // Which page of which deck teaches this concept, and — where the deck holds
      // the fill-in table instead of a workbook — the page the client writes on.
      // These are REFERENCES to the source, not images: the route served JPEG
      // paths until 2026-09-18 and no longer does, because Mike's deck pages carry
      // the advisor-e.com logo and a client is always shown the advisor's own.
      deckPage: concept.page || null,
      responsePage: concept.responsePage || null,
      // His own page words, where a concept teaches from its instruction pages (item 15.23).
      pageWords: concept.pageWords || [],
      capture: captureForms.captureForConcept(concept),
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[strategy-planner] getConceptCapture failed:', err.message)
    sendError(res, 500, 'CAPTURE_ERROR', 'Could not load the capture table')
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
 * Records what screen 1 ticked, and the steps screen 2 named. Every framework named must be
 * one the Planner actually holds — a scope naming something unauthored would render an empty
 * session.
 *
 * ⚠ THE STEPS ARE BOUNDED, NOT VALIDATED AGAINST THE SCOPE, and the store says why: a step's
 * items name *cards*, not frameworks, and a card that is no longer scoped renders nothing
 * rather than refusing the whole save.
 *
 * @route PUT /api/strategy/sessions/:id/scope
 * @param {object} req - firmAuth-verified; body `{ domains: string[], frameworks: string[], steps?: Array<{name: string, items: string[], purpose?: string}> }`
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

  // 🔴 A SCOPE ID IS A CONCEPT OR A FRAMEWORK, AND CHECKING ONLY ONE REJECTED EVERY REAL
  // SAVE. Stage 1 changed the menu on 2026-09-17 from the handful of authored frameworks
  // to Mike's own 52 CONCEPTS, and this guard was left checking `getFramework` alone — so
  // a scope of real ticked concepts came back 400 UNKNOWN_FRAMEWORK. Nothing called the
  // route until the step builder did on 2026-09-20, which is why it sat unfound: the
  // session is OPENED through POST /sessions, which does not validate.
  const unknown = chosen.filter(id => !frameworks.getFramework(id) && !frameworks.getConcept(id))
  if (unknown.length) {
    sendError(res, 400, 'UNKNOWN_FRAMEWORK',
      'The session names a framework or concept that does not exist: ' + unknown.join(', '))
    return
  }

  try {
    const done = await store.setScope(req.params.id, firmId, {
      domains: Array.isArray(body.domains) ? body.domains : [],
      frameworks: chosen,
      steps: Array.isArray(body.steps) ? body.steps : []
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
 * POST /api/strategy/suggest
 *
 * The "Suggest for this client" button. Item 15.1 stage 6; **Decision C, ruled by Mike
 * 2026-09-17** on `design/mockups/strategy-session-menu.html`.
 *
 * 🔴 IT SUGGESTS AND IT CHANGES NOTHING. The reply is a list of concept ids each with one
 * line of reason. It is NOT a scope, it is never written to `frameworks`, and the session's
 * count still follows the advisor's ticks — Decision C(a). The suggestion is stored beside
 * the ticks, never in place of them (C(b)), and every row the model names is checked
 * against the real catalogue before it is returned (C(c), `strategyPretick.validateSuggestion`).
 *
 * 🔴 IT IS KEYED ON THE CLIENT, NOT THE SESSION, AND THAT IS THE FLOW RATHER THAN A
 * PREFERENCE. The button sits on Scope session, which an advisor opens BEFORE pressing
 * "Build the session" — so at the moment it is pressed there is usually no session to hang
 * it on. A session id is accepted and used when there is one, so the suggestion is stored
 * the moment it can be; when there is not, the screen carries it into `POST /sessions`,
 * whose `scope` writes it with the first ticks. Either way it is stored exactly once.
 *
 * 🔴 A CLIENT ID IN A BODY IS SAFE ONLY BECAUSE OF THIS LINE: `clientStore.getById` is
 * firm-scoped, so a client belonging to another firm reads as absent. The firm still comes
 * from the token and never from the request — see the file header.
 *
 * 🔴 WHAT IS SENT, AND THE TWO THINGS THAT ARE NOT. The advisor's own summaries of this
 * client's last two conversations go to the model. **No id of any kind goes** — case,
 * client, advisor or firm — and **no transcript goes**: a transcript is personal data and
 * Meeting Review is the only feature cleared to send one (CLAUDE.md, Mike 2026-09-01).
 *
 * ⚠ A CLIENT WITH NO HISTORY GETS AN HONEST EMPTY, NOT A GUESS. The drawing's input is
 * "this client's last two conversations"; a client with none, or whose summaries are
 * blank, replies `reason: 'no-history'` with no concepts, so the screen can say so.
 * Inventing a suggestion from nothing would be the failure this route exists to avoid —
 * a pre-tick nobody can account for.
 *
 * @route POST /api/strategy/suggest
 * @param {object} req - firmAuth-verified; body `{ clientId, sessionId? }`
 * @param {object} res
 * @returns {200} { success, suggestion: { at, concepts: [{id, reason}] }, reason, timestamp }
 * @returns {404} when no client with that id belongs to the caller's firm
 * @returns {502} when the model could not be reached
 */
async function postSuggest (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  const body = req.body || {}
  const clientId = String(body.clientId || '')
  if (!clientId) {
    sendError(res, 400, 'BAD_INPUT', 'No client on this request')
    return
  }

  try {
    const client = await clientStore.getById(clientId, firmId)
    if (!client) {
      sendError(res, 404, 'NOT_FOUND', 'No such client')
      return
    }

    const cases = await caseStore.listForClient(req.advisorId, firmId, clientId)
    const situation = pretick.situationFromCases(cases)
    if (!situation) {
      res.send(200, {
        success: true,
        suggestion: { at: new Date().toISOString(), concepts: [] },
        reason: 'no-history',
        timestamp: new Date().toISOString()
      })
      return
    }

    const concepts = frameworks.listConcepts()
    let reply
    try {
      reply = await getClient('classify').chat.completions.create({
        messages: pretick.buildMessages({ situation, concepts }),
        temperature: 0,
        max_tokens: 1800,
        response_format: { type: 'json_object' }
        // moderate: [] — the situation is saved case summaries, nothing typed here (item 8.2).
      }, { personal: false, moderate: [] })
    } catch (err) {
      console.error('[strategy-planner] postSuggest model call failed:', err.message)
      sendError(res, 502, 'SUGGEST_UNAVAILABLE',
        'The suggestion could not be produced just now. Tick the concepts yourself and try again later.')
      return
    }

    const content = reply && reply.choices && reply.choices[0] &&
      reply.choices[0].message
? reply.choices[0].message.content
: ''
    const known = concepts.map(c => c.id)
    const validated = pretick.validateSuggestion(content, known)

    // Decision C(c) again, on the logging side: what the model got wrong is recorded
    // server-side rather than shown. A row it invented is a fact about the model, not
    // something an advisor can act on.
    if (validated.dropped.length) {
      console.warn('[strategy-planner] postSuggest dropped ' + validated.dropped.length +
        ' tick(s): ' + validated.dropped.map(d => d.id + '(' + d.why + ')').join(', '))
    }

    const suggestion = { at: new Date().toISOString(), concepts: validated.concepts }
    // 🔴 A FAILED WRITE DOES NOT WITHHOLD THE SUGGESTION. The advisor is in front of a
    // client; losing the audit row is a real fault and is logged as one, but refusing to
    // show a suggestion that was produced would be the worse of the two. With no session
    // yet there is nothing to write to, and the screen carries it into POST /sessions.
    if (body.sessionId) {
      try {
        await store.saveSuggestion(body.sessionId, firmId, suggestion)
      } catch (err) {
        console.error('[strategy-planner] postSuggest could not store the suggestion:', err.message)
      }
    }

    res.send(200, {
      success: true,
      suggestion,
      reason: validated.concepts.length ? 'ok' : 'nothing-matched',
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[strategy-planner] postSuggest failed:', err.message)
    sendError(res, 500, 'SUGGEST_ERROR', 'Could not produce a suggestion for this session')
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

  // A box is legitimate if it belongs to one of the built frameworks (the closing
  // cards) OR to a concept's own capture table read from Mike's workbooks. Both
  // are whitelists; a key belonging to neither is still refused.
  const invalid = entries.filter(e => !e || !(
    frameworks.hasField(e.frameworkId, e.fieldKey) ||
    captureForms.hasCaptureField(e.frameworkId, e.fieldKey, frameworks.getConcept)
  ))
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
 * PUT /api/strategy/sessions/:id/edits
 *
 * The advisor's own wording for one block of one concept page, or "Put back the original".
 * Item 15.25 — Mike's request of 2026-09-25, *"I want to be able to EDIT the presentation"*,
 * built from the test he approved: `design/mockups/strategy-edit-text-test.html`.
 *
 * 🔴 THIS SESSION ONLY. Mike's Decision C, 2026-09-21: the advisor's changes never become
 * the firm's standard. The drawing is never written; the edit rides the session's scope.
 *
 * 🔴 WHETHER THE WORDS FIT IS DECIDED IN THE BROWSER, BEFORE THIS IS CALLED. Mike ruled the
 * same day that an edit that does not fit is not saved. Fit is a property of the drawn page
 * — its shapes, fonts and column widths — which this server never renders. The screen
 * measures it and only then saves; this route enforces a real concept, a well-formed block
 * name, a bounded string, and the firm.
 *
 * @route PUT /api/strategy/sessions/:id/edits
 * @param {object} req - firmAuth-verified; body `{ conceptId: string, sheet: number,
 *   block: string, text: string|null }` — null or blank puts back the original
 * @param {object} res
 * @returns {200} { success, timestamp }
 */
async function putEdit (req, res) {
  const firmId = firmOf(req)
  if (!firmId) {
    sendError(res, 400, 'MISSING_SCOPE', 'No firm on this request')
    return
  }

  const body = req.body || {}
  const conceptId = String(body.conceptId || '')
  const sheet = Number(body.sheet)
  if (!frameworks.getConcept(conceptId)) {
    sendError(res, 400, 'UNKNOWN_CONCEPT', 'That concept does not exist')
    return
  }
  if (!Number.isInteger(sheet) || sheet < 0 || sheet > 99) {
    sendError(res, 400, 'BAD_INPUT', 'The page number is not valid')
    return
  }

  try {
    const done = await store.saveTextEdit({
      sessionId: req.params.id,
      firmId,
      sheetKey: conceptId + '#' + sheet,
      blockKey: body.block,
      text: body.text
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
    console.error('[strategy-planner] putEdit failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the edit')
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
      // 🔴 BOTH WHITELISTS, THE SAME PAIR `putEntries` CHECKS. This route checked only the
      // built frameworks, so every box on the 16 concepts read from Mike's own workbooks was
      // refused here while its SAVE succeeded — the timeline half of the pair was never
      // updated when those tables arrived on 2026-09-17. Nothing on screen said so, because
      // the page swallows a timeline failure on purpose (an error banner mid-sentence costs
      // the advisor more than the gap does), so this was invisible in both directions for
      // four days: Decision 11's mechanism silently recording nothing for most of a session.
      // Found 2026-09-21 by watching the network while driving the Org Chart Builder, and
      // proved against the running server with a Porter's box, which has nothing to do with
      // it. ⚠ THE TWO LISTS MUST BE CHANGED TOGETHER — that is the whole lesson here.
      if (!frameworks.hasField(body.frameworkId, body.fieldKey) &&
          !captureForms.hasCaptureField(body.frameworkId, body.fieldKey, frameworks.getConcept)) {
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

/**
 * GET /api/strategy/session-process
 *
 * The standard planning session this caller works to, and WHOSE it is.
 *
 * 🔴 READ BY THE ADVISOR AS WELL AS BY A MANAGER, deliberately, and that is the whole
 * point of Decision A: the advisor's Build session opens on a process already handed down
 * rather than on a blank step. So this sits behind `firmAuth` alone — the WRITE below is
 * what carries the manager gate.
 *
 * 🔴 THE SCOPE COMES FROM THE TOKEN. `req.firmId` is resolved by firmAuth; a scope in a
 * query string would let one firm read another tier's unpublished session.
 *
 * @route GET /api/strategy/session-process
 * @param {object} req - firmAuth-verified; takes no parameters
 * @param {object} res
 * @returns {200} { success, process, source, inherited, ownedHere, timestamp }
 */
async function getSessionProcess (req, res) {
  try {
    const scope = firmOf(req)
    const resolved = await sessionProcess.resolveProcess(scope, loadFirmConfig)
    res.send(200, {
      success: true,
      process: resolved.process,
      // Whose session this is — the scope, its tier, and whether it was ever authored at
      // all or is the shipped platform default. Decision C: a tier that has written
      // nothing shows what it inherits and says whose it is.
      source: resolved.source,
      // 🔴 AND WHICH TIER THE CALLER IS, WHICH `source` CANNOT SAY. With the shipped
      // default in force, `source` reads "mentor" for everybody — so without this the
      // mentor's own screen told the mentor it was inheriting from somebody else. Found
      // by opening the screen on 2026-09-21; every test was green.
      tier: scope ? tierOfScope(scope) : null,
      inherited: resolved.inherited,
      // Does THIS caller's own level hold it? What the manager's screen needs to decide
      // between "edit yours" and "you are inheriting this".
      ownedHere: !resolved.inherited && !resolved.source.shipped,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[strategy-planner] getSessionProcess failed:', err.message)
    sendError(res, 500, 'SESSION_PROCESS_ERROR', 'Could not load the standard session')
  }
}

/**
 * GET /api/strategy/session-process/cards
 *
 * Every card a standard session could hold — the whole library, with no client and no
 * scope in it. This is what the authoring screen offers a manager to drag into steps.
 *
 * 🔴 THE SAME KEY VOCABULARY THE ADVISOR'S SCREEN USES, built on the backend so there is
 * one place that decides what a card key looks like. A concept with an approved framework
 * card is `fw-<frameworkId>` and is NOT also offered as a concept card: Mike's ruling of
 * 2026-09-21 is that a concept appears once, and offering both would let a manager put the
 * same concept in two steps under two names.
 *
 * ⚠ `hasTable` IS RETURNED RATHER THAN FILTERED ON. Whether a concept with no table is
 * still placeable depends on whether an approved DRAWING exists, and that registry is a
 * frontend module. The caller applies `isPlaceableConcept`, which is the one home for that
 * rule and is shared with the advisor's screen.
 *
 * ⚠ NO CLOSING BLOCKS. Decision D took them off this screen entirely.
 *
 * @route GET /api/strategy/session-process/cards
 * @param {object} req - firmAuth-verified, manager role; takes no parameters
 * @param {object} res
 * @returns {200} { success, cards, timestamp }
 */
// eslint-disable-next-line require-await -- Restify refuses a plain (req, res) handler
async function getSessionProcessCards (req, res) {
  try {
    // The deck's own NAME, not its id: the tray groups by it, and an id there reads as
    // gibberish — the exact defect found on the advisor's screen on 2026-09-21.
    const deckNameByConcept = {}
    frameworks.listDecks().forEach((deck) => {
      (deck.concepts || []).forEach((c) => { deckNameByConcept[c.id] = deck.name })
    })

    const cards = []
    const frameworkByConcept = {}

    frameworks.listFrameworks()
      .filter(f => !f.closesTheSession && f.conceptId)
      .forEach((f) => {
        frameworkByConcept[f.conceptId] = true
        cards.push({
          key: 'fw-' + f.id,
          conceptId: f.conceptId,
          name: f.name,
          deck: deckNameByConcept[f.conceptId] || '',
          hasTable: true
        })
      })

    frameworks.listConcepts().forEach((concept) => {
      if (frameworkByConcept[concept.id]) { return }
      const capture = captureForms.captureForConcept(concept)
      cards.push({
        key: concept.id,
        conceptId: concept.id,
        name: concept.name,
        deck: deckNameByConcept[concept.id] || '',
        hasTable: Boolean(capture.supplied)
      })
    })

    res.send(200, { success: true, cards, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[strategy-planner] getSessionProcessCards failed:', err.message)
    sendError(res, 500, 'SESSION_PROCESS_ERROR', 'Could not load the concept library')
  }
}

/**
 * PUT /api/strategy/session-process
 *
 * Write THIS tier's own standard session. Mounted behind `requireManagerRole`, so an
 * advisor cannot reach it: Decision C gives authoring to the four managing tiers and
 * leaves the advisor editing only the session in front of him.
 *
 * ⚠ THE BODY IS UNTRUSTED AND IS VALIDATED BEFORE ANYTHING IS STORED. A malformed process
 * saved here would reach an advisor mid-meeting and a client's printed plan.
 *
 * @route PUT /api/strategy/session-process
 * @param {object} req - firmAuth-verified, manager role; body { name?, steps: [...] }
 * @param {object} res
 * @returns {200} { success, process, timestamp }
 */
async function putSessionProcess (req, res) {
  try {
    const scope = firmOf(req)
    if (!scope) {
      sendError(res, 400, 'BAD_INPUT', 'No scope on this token')
      return
    }

    const checked = sessionProcess.validateProcess(req.body)
    if (!checked.ok) {
      sendError(res, 400, 'BAD_INPUT', checked.error)
      return
    }

    await sessionProcess.saveOwnProcess(scope, checked.process, req.advisorId || 'unknown', saveFirmConfig)
    res.send(200, { success: true, process: checked.process, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[strategy-planner] putSessionProcess failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the standard session')
  }
}

/**
 * DELETE /api/strategy/session-process
 *
 * Stop holding one of your own and go back to inheriting the level above.
 *
 * 🔴 WITHOUT THIS, AUTHORING IS A ONE-WAY DOOR. A firm that writes its own session once
 * could never return to the mentor's, and would silently stop receiving every later
 * improvement to it — the frozen-private-copy failure the Advisory Staircase was rebuilt
 * to escape in July.
 *
 * ⚠ NOTHING IS DESTROYED. The rows stay in `firm_framework_versions` as inactive versions,
 * so the session is still in the history and can be restored.
 *
 * @route DELETE /api/strategy/session-process
 * @param {object} req - firmAuth-verified, manager role
 * @param {object} res
 * @returns {200} { success, process, source, inherited, ownedHere, timestamp }
 */
async function deleteSessionProcess (req, res) {
  try {
    const scope = firmOf(req)
    if (!scope) {
      sendError(res, 400, 'BAD_INPUT', 'No scope on this token')
      return
    }

    await sessionProcess.clearOwnProcess(scope, saveFirmConfig)
    const resolved = await sessionProcess.resolveProcess(scope, loadFirmConfig)
    res.send(200, {
      success: true,
      process: resolved.process,
      source: resolved.source,
      tier: scope ? tierOfScope(scope) : null,
      inherited: resolved.inherited,
      ownedHere: !resolved.inherited && !resolved.source.shipped,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[strategy-planner] deleteSessionProcess failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not return to the inherited session')
  }
}

/**
 * GET /api/strategy/session-process/versions
 *
 * Every version this scope has saved, newest first — the same history and restore the
 * Advisory Distinctions table already gives, which is what the drawing means by "the
 * cascade needs no new plumbing".
 *
 * @route GET /api/strategy/session-process/versions
 * @param {object} req - firmAuth-verified, manager role
 * @param {object} res
 * @returns {200} { success, versions, timestamp }
 */
async function getSessionProcessVersions (req, res) {
  try {
    const scope = firmOf(req)
    if (!scope) {
      sendError(res, 400, 'BAD_INPUT', 'No scope on this token')
      return
    }
    const versions = await getVersionHistory(scope, sessionProcess.CONFIG_KEY)
    res.send(200, { success: true, versions, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[strategy-planner] getSessionProcessVersions failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the session history')
  }
}

/**
 * POST /api/strategy/session-process/versions/:id/restore
 *
 * Put an earlier saved version back in force at this scope.
 *
 * 🔴 THE SCOPE IS THE TOKEN'S, NOT THE URL'S. `restoreVersion` is given `req.firmId` and
 * the version id together, and its own SQL requires the row to belong to that scope AND
 * that config key — so a version id guessed from another tier restores nothing rather than
 * crossing a boundary.
 *
 * @route POST /api/strategy/session-process/versions/:id/restore
 * @param {object} req - firmAuth-verified, manager role; `:id` the version row id
 * @param {object} res
 * @returns {200} { success, process, timestamp }
 */
async function restoreSessionProcessVersion (req, res) {
  try {
    const scope = firmOf(req)
    if (!scope) {
      sendError(res, 400, 'BAD_INPUT', 'No scope on this token')
      return
    }
    await restoreVersion(scope, sessionProcess.CONFIG_KEY, req.params.id)
    const resolved = await sessionProcess.resolveProcess(scope, loadFirmConfig)
    res.send(200, { success: true, process: resolved.process, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[strategy-planner] restoreSessionProcessVersion failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = {
  getFrameworks,
  getConcepts,
  getConceptCapture,
  createSession,
  getSession,
  listSessions,
  putScope,
  postSuggest,
  putEntries,
  putEdit,
  postTimeline,
  getSessionProcess,
  getSessionProcessCards,
  putSessionProcess,
  deleteSessionProcess,
  getSessionProcessVersions,
  restoreSessionProcessVersion
}
