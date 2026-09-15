'use strict'

/**
 * wagesRegisterGate — whether the Wages/Salary Review's staff register may be opened
 * for one client, and the record of the advisor who opened it.
 *
 * @module server/utils/wagesRegisterGate
 *
 * Design: `design/mockups/wages-model.html` Decision 6, RULED BY MIKE 2026-09-14, in his
 * words: *"it is not for 'general application' so this page could be 'turned on' only in
 * the cases of a firm being in a due diligence project?"* — and the reason: *"the re
 * structure may require tough decisions in places of 'role double up' so at some point,
 * someone has to decide who stays and who goes."*
 *
 * 🔴 WHY THIS FILE EXISTS AT ALL. The staff register is the only screen in the app that
 * holds a client's NAMED employees with pay, accrued leave, length of service and a rating
 * of what the business loses if they leave. Built ungated it is a standing rating of
 * someone's colleagues. The gate is what makes it instead a dated, attributable document
 * prepared for a transaction — which is the whole of Decision 6.
 *
 * TWO CONDITIONS, BOTH REQUIRED, and neither can stand in for the other:
 *   1. The client's case is in the `due-diligence` domain. This is the app's own record
 *      that a transaction is under way, and it CANNOT be set by opening the wages screen.
 *   2. The advisor switches the register on, and it records who and when. An automatic
 *      reveal is not a decision anyone made; the switch is what makes it attributable.
 *
 * 🔴 SO THE GATE HAS THREE STATES, NOT TWO. Decision 6 states two conditions, and each one
 * failing looks different to the advisor: with no due-diligence case there is nothing to
 * offer and no switch to show; with a case and no switch there is a decision waiting to be
 * made. Collapsing those two into one "closed" would put a switch on a screen that must
 * never carry one, which is the one thing this gate exists to prevent.
 *
 * 🔴 THE SWITCH TURNS BOTH WAYS (Mike, 2026-09-15). Decision 6 named only the switch-on and
 * the automatic close, and an advisor who opened the register on the wrong client had no way
 * back — that client is necessarily ANOTHER client in due diligence, so the automatic close
 * would never fire for them. Closing is recorded exactly as opening is, because closing is
 * the same kind of act: deliberate, and someone's. **Nothing is erased.** A close keeps the
 * opening it closed, and `firmOverlay`'s version history holds every earlier switch besides.
 *
 * ⚠ A CLOSED REGISTER RETURNS TO `available`, NOT TO A FOURTH STATE. Once closed, the truth
 * is exactly what `available` already says: a due-diligence project stands and the register
 * is not open. Inventing a "switched off" state would put a fourth sentence on screen for a
 * situation the third one already describes.
 *
 * 🔴 THE STORED SWITCH NEVER OPENS THE GATE BY ITSELF. `resolveGate` re-reads the case
 * domain every time, so — Decision 6 again — *"when the case leaves the due-diligence
 * domain the register closes again and what was entered is not shown. It is not a permanent
 * property of the client."* A build that trusted the stored flag alone would leave the
 * register standing open for the life of the client record, which is exactly the standing
 * opinion the ruling refuses.
 *
 * WHAT THIS DOES NOT DO, and should not (Decision 6): it does not stop an advisor writing
 * the same judgement in a document of their own. It is not a control on the advisor. It is
 * a refusal by our app to hold that material as ordinary standing data about a person.
 *
 * STORAGE. One `firmOverlay` key per client — `wages-register:<clientId>` — so version
 * history and restore ride the store every other firm setting uses, and the record of who
 * opened it cannot be quietly rewritten. Retention of the register's CONTENTS is Decision
 * 8 and is not this file's business: the gate is who may ever see it, retention is how long
 * the data exists.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('./firmOverlay')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')

/**
 * Dev-only stand-in, used when there is no MySQL — the same affordance `clientStore`,
 * `caseStore` and `copyRequestDeadline` all carry.
 *
 * 🔴 FOUND BY OPENING THE APP, NOT BY A TEST (2026-09-15). Without this, the gate answered
 * `closed` perfectly and 500'd on every other state, because the closed path never reads
 * the switch and the other two do. Every unit test mocks `firmOverlay`, so the real one was
 * never called and the fault was invisible to all 10,819 of them.
 *
 * @type {string}
 */
const DEV_FILE = 'data/dev-wages-register.json'

/**
 * The domain id in `data/domains.json` that opens condition 1. Not a label — the stored
 * `domain` column holds this exact id, and the keywords behind it are *acquisition*,
 * *merger*, *buying a business*.
 * @type {string}
 */
const DUE_DILIGENCE_DOMAIN = 'due-diligence'

/** The overlay key prefix. One row per client. */
const KEY_PREFIX = 'wages-register:'

/** `firm_framework_versions.config_key` is VARCHAR(128); a longer id cannot be keyed. */
const MAX_CLIENT_ID = 64

/** The three states, named so a caller cannot invent a fourth by typo. */
const STATE_OPEN = 'open'
const STATE_AVAILABLE = 'available'
const STATE_CLOSED = 'closed'

/**
 * Why the gate is in the state it is. Rendered as an explanation to the advisor, so each
 * one has to be true of exactly one situation.
 */
const REASON_NO_CLIENT = 'no-client'
const REASON_NO_DUE_DILIGENCE_CASE = 'no-due-diligence-case'
const REASON_NOT_SWITCHED_ON = 'not-switched-on'
const REASON_SWITCHED_ON = 'switched-on'

function fail (code, message) {
  const e = new Error(message)
  e.code = code
  return e
}

/**
 * The firmOverlay key for one client's register switch.
 * @param {string} clientId
 * @returns {string}
 * @throws {Error} err.code 'BAD_CLIENT' when the id cannot safely be part of a key
 */
function configKey (clientId) {
  const id = String(clientId || '')
  if (!id || id.length > MAX_CLIENT_ID || id.includes(':')) {
    throw fail('BAD_CLIENT', 'The client id cannot be used as a storage key.')
  }
  return KEY_PREFIX + id
}

/**
 * The client's most recent due-diligence case, from cases the caller may already see.
 *
 * ⚠ THIS FUNCTION GRANTS NO ACCESS. It filters a list the caller has already been given by
 * `caseStore.listForClient`, whose boundary is the advisor's own cases plus the firm's
 * shared ones. Passing it a wider list would widen the gate, so callers pass exactly what
 * that function returned and nothing else.
 *
 * Newest first is the caller's order (`listForClient` sorts by `created_at DESC`), so the
 * first match is the current transaction where a client has had more than one.
 *
 * @param {object[]} cases - as returned by `caseStore.listForClient`
 * @returns {{id: string, title: string}|null} the case, or null when none is in the domain
 */
function findDueDiligenceCase (cases) {
  if (!Array.isArray(cases)) { return null }
  for (let i = 0; i < cases.length; i += 1) {
    const c = cases[i]
    if (c && c.domain === DUE_DILIGENCE_DOMAIN) {
      return { id: c.id, title: c.title || '' }
    }
  }
  return null
}

/**
 * THE GATE DECISION, and it is deliberately pure — no database, no request, no clock.
 *
 * Kept pure because this is the one piece of the register that must be provably right: it
 * decides whether personal data about named employees may be shown at all. A decision
 * reachable only through a route and a live MySQL connection is a decision nobody can test
 * every branch of.
 *
 * @param {{id: string, title: string}|null} dueDiligenceCase - from `findDueDiligenceCase`
 * @param {{openedBy: object, openedAt: string}|null} stored - from `readSwitch`
 * @returns {{state: string, reason: string, case: object|null, openedBy: object|null, openedAt: string|null}}
 */
function resolveGate (dueDiligenceCase, stored) {
  // 🔴 THERE IS NO PERMISSION CHECK LEFT HERE — Mike's ruling, 2026-09-15: *"i dont need any
  // bullshit gates telling my advisors what they can and cant do. if they're engaged to run a
  // due diligence project they will fucking tell you — end of fucking argument!"*
  //
  // The due-diligence condition is GONE. It was unmeetable in any case: the only thing in the
  // app that could ever satisfy it was the Virtual Advisor inferring the domain from an
  // advisor's words mid-conversation (`VirtualAdvisor.vue`, `domain: this.sessionDomain`), and
  // no screen anywhere let a human say so — so an advisor on a real due-diligence engagement
  // was shown a true sentence and no way to act on it.
  //
  // ⚠ SO THIS FUNCTION NO LONGER DECIDES WHO MAY; IT REPORTS WHETHER IT IS OPEN. Two states do
  // that — `available` (not opened yet) and `open`. `closed` survives for ONE case only, and
  // it is not a refusal: no client has been chosen, so there is no register to speak about.
  //
  // WHAT IS KEPT IS THE RECORD, which was always the substance of Decision 6: who opened it
  // and when, from the verified token. `declaredAt` marks an opening made on the advisor's own
  // say-so rather than against a case already in the domain — a note in the record, never a
  // condition on the screen. It stops nobody. It is what lets a firm answer, afterwards, who
  // decided to show this client's named staff.
  const declared = !!(stored && stored.declaredAt && !stored.closedAt)
  const theCase = dueDiligenceCase || null
  const declaredBy = declared ? (stored.declaredBy || null) : null
  const declaredAt = declared ? stored.declaredAt : null

  // Condition 1 holds, condition 2 has not been met: the advisor may open it, and has not —
  // either never, or because they closed it again. Both are the same truth on screen, so
  // both are `available` rather than a fourth state saying the same thing differently.
  if (!stored || !stored.openedAt || stored.closedAt) {
    return {
      state: STATE_AVAILABLE,
      reason: REASON_NOT_SWITCHED_ON,
      case: theCase,
      canDeclare: false,
      declaredBy,
      declaredAt,
      openedBy: null,
      openedAt: null
    }
  }

  // Both conditions met.
  return {
    state: STATE_OPEN,
    reason: REASON_SWITCHED_ON,
    case: theCase,
    canDeclare: false,
    declaredBy,
    declaredAt,
    openedBy: stored.openedBy || null,
    openedAt: stored.openedAt
  }
}

/**
 * The gate for a caller who has not chosen a client yet. Never a switch, never a case.
 *
 * ⚠ AND NEVER THE DECLARATION EITHER — `canDeclare` is false here. The declaration is made
 * ABOUT a client and recorded AGAINST one, so with no client chosen there is nothing to
 * declare and nowhere to keep it. Offering the question first would collect an answer that
 * belongs to nobody.
 */
function noClientGate () {
  return {
    state: STATE_CLOSED,
    reason: REASON_NO_CLIENT,
    case: null,
    canDeclare: false,
    declaredBy: null,
    declaredAt: null,
    openedBy: null,
    openedAt: null
  }
}

/** Dev-only: the whole `{ firmId: { clientId: row } }` map. */
function _readDevMap () {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DEV_FILE), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/** Dev-only: one client's stored switch, or null. */
function _readDev (firmId, clientId) {
  const firm = _readDevMap()[firmId]
  return (firm && Object.prototype.hasOwnProperty.call(firm, clientId)) ? firm[clientId] : null
}

/** Dev-only: write one client's switch. */
function _writeDev (firmId, clientId, row) {
  const all = _readDevMap()
  if (!all[firmId]) { all[firmId] = {} }
  all[firmId][clientId] = row
  fs.writeFileSync(path.resolve(process.cwd(), DEV_FILE), JSON.stringify(all, null, 2))
}

/**
 * Write the switch, falling back to the dev file when nothing answered.
 *
 * 🔴 THE FALLBACK IS DEV-ONLY AND `dbFailure` IS WHAT MAKES THAT SAFE: it refuses when a
 * live server REFUSED the statement, so a rejected write can never land in a scratch file
 * and be reported as a register that was opened. For this gate that matters more than for
 * most — a false "opened" is a record saying someone decided to show a client's named staff
 * when no such record exists.
 *
 * ⚠ `configKey` IS CALLED OUTSIDE THE TRY, deliberately. It throws `BAD_CLIENT` for an id
 * that cannot safely be keyed, and that error carries no `sqlState` — so inside the try the
 * fallback would accept it as "nothing answered" and write the row to the dev file under
 * the very id it just refused.
 *
 * @param {string} firmId @param {string} clientId @param {object} row @param {string|null} savedBy
 */
async function _save (firmId, clientId, row, savedBy) {
  const key = configKey(clientId)
  try {
    await overlay.saveFirmConfig(firmId, key, row, savedBy)
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    _writeDev(firmId, clientId, row)
  }
}

/**
 * Read the stored switch for one client. Null when the register has never been opened.
 *
 * A CLOSED register still has a row, and this returns it: the record of who opened it, and
 * of who closed it, outlives the closing. `resolveGate` is what decides that such a row does
 * not open the gate.
 *
 * @param {string} firmId - the authenticated scope id, never client-supplied
 * @param {string} clientId - a client of that firm (the route checks it belongs)
 * @returns {Promise<{openedBy: object, openedAt: string, closedBy: object|null, closedAt: string|null}|null>}
 */
async function readSwitch (firmId, clientId) {
  // Outside the try for the same reason as in `_save`: a BAD_CLIENT must not be read as
  // "nothing answered".
  const key = configKey(clientId)
  let stored
  try {
    stored = await overlay.loadFirmConfig(firmId, key)
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    stored = _readDev(firmId, clientId)
  }
  if (!stored || typeof stored !== 'object' || !stored.openedAt) { return null }
  return stored
}

/**
 * Who moved the switch, trimmed to what the column can hold. Shared by both directions so
 * an opening and a closing are recorded in exactly the same shape.
 * @param {{name: string, email: string}} who - from the verified token, never the body
 * @returns {{name: string, email: string}}
 */
function recordOf (who) {
  return {
    name: (who && who.name) ? String(who.name).slice(0, 128) : '',
    email: (who && who.email) ? String(who.email).slice(0, 190) : ''
  }
}

/**
 * Record that an advisor switched the register on for this client.
 *
 * The record is the point, not the flag: Decision 6 asks for *"who and when"* because that
 * is what makes the register a dated, attributable act rather than a screen that happened
 * to be showing.
 *
 * Opening an ALREADY-OPEN register changes nothing — the first decision is the one that was
 * made. Opening a CLOSED one is a new decision and is recorded as one, replacing the
 * previous pair rather than accumulating: what is on screen must name the opening now in
 * force, and `firmOverlay`'s version history keeps the ones before it.
 *
 * 🔴 `declared` IS THE ADVISOR ANSWERING THE QUESTION (Mike, 2026-09-15) — "yes, this client
 * is in a due-diligence project". It is recorded in the same shape and from the same verified
 * token as the opening, because it is the same kind of act and carries more weight: the
 * opening says who showed the register, the declaration says on whose word it could be shown
 * at all. One act, not two — an advisor answering the question has already decided.
 *
 * @param {string} firmId - the authenticated scope id
 * @param {string} clientId - a client of that firm (the route checks it belongs)
 * @param {{name: string, email: string}} who - from the verified token, never the body
 * @param {boolean} [declared] - the advisor declared the project; the route requires this
 *   when no case is already in the domain, and refuses the open without it
 * @returns {Promise<{openedBy: object, openedAt: string, declaredBy: object|null, declaredAt: string|null, closedBy: null, closedAt: null}>}
 */
async function openRegister (firmId, clientId, who, declared) {
  const existing = await readSwitch(firmId, clientId)
  if (existing && !existing.closedAt) { return existing }
  const at = new Date().toISOString()
  const row = {
    openedBy: recordOf(who),
    openedAt: at,
    // Absent unless the advisor declared it, so a register opened on a case already in the
    // domain does not claim a declaration nobody made.
    declaredBy: declared ? recordOf(who) : null,
    declaredAt: declared ? at : null,
    closedBy: null,
    closedAt: null
  }
  await _save(firmId, clientId, row, (who && who.email) || null)
  return row
}

/**
 * Record that an advisor switched the register off again (Mike, 2026-09-15).
 *
 * 🔴 THE OPENING IS KEPT, NOT ERASED. A close writes `closedBy`/`closedAt` alongside the
 * `openedBy`/`openedAt` it closes, so the pair reads as a decision taken and a decision
 * reversed — which is a fuller record than the one-way switch it replaces, never a thinner
 * one. Closing an already-closed or never-opened register changes nothing and writes
 * nothing: there is no decision to record, and a second `closedAt` would move the date on
 * one that was already taken.
 *
 * @param {string} firmId - the authenticated scope id
 * @param {string} clientId - a client of that firm (the route checks it belongs)
 * @param {{name: string, email: string}} who - from the verified token, never the body
 * @returns {Promise<{openedBy: object, openedAt: string, closedBy: object, closedAt: string}|null>}
 */
async function closeRegister (firmId, clientId, who) {
  const existing = await readSwitch(firmId, clientId)
  if (!existing || existing.closedAt) { return existing }
  const row = Object.assign({}, existing, {
    closedBy: recordOf(who),
    closedAt: new Date().toISOString()
  })
  await _save(firmId, clientId, row, (who && who.email) || null)
  return row
}

module.exports = {
  DUE_DILIGENCE_DOMAIN,
  DEV_FILE,
  KEY_PREFIX,
  STATE_OPEN,
  STATE_AVAILABLE,
  STATE_CLOSED,
  REASON_NO_CLIENT,
  REASON_NO_DUE_DILIGENCE_CASE,
  REASON_NOT_SWITCHED_ON,
  REASON_SWITCHED_ON,
  configKey,
  findDueDiligenceCase,
  resolveGate,
  noClientGate,
  readSwitch,
  openRegister,
  closeRegister
}
