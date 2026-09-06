'use strict'

/**
 * @file The Economic Analysis run store — every research run an advisor starts, what it
 *   returned, and which one they put their name to.
 * @module server/utils/economicAnalysisRuns
 *
 * Item 4.66. Screens: `design/mockups/three-way-forecast-economic-analysis.html`.
 *
 * 🔴 TWO DIFFERENT LIFETIMES, AND THAT IS WHY THIS FILE HAS TWO HALVES.
 *
 * A RUN lives for minutes. It is started, polled for about a hundred seconds, read, and
 * either used or abandoned. It holds the research text, so it stays in memory and is swept:
 * nothing is gained by persisting a document the advisor is looking at right now, and a
 * store that kept every abandoned run would accumulate research nobody asked to keep.
 *
 * An APPROVAL lives for as long as the firm does. The moment an advisor ticks "include in
 * the report the client receives", the standards' rule for financial work applies — an
 * explicit `isApproved: true` before AI output is committed — and the record of WHO decided
 * WHICH RUN was fit for a lender has to outlive the browser tab. So that half is persisted.
 *
 * 🔴 EVERY RUN IS COUNTED, AND THE APPROVAL NAMES WHICH ONE WENT IN — ruled 2026-09-06.
 * The screens' own note says why, and it is not bookkeeping: re-rolling research until the
 * answer flatters the client is the one habit this feature must not encourage. "Research
 * again" was kept deliberately, because the commonest reason to re-run is a BAD BRIEF, so
 * the risk is made VISIBLE instead of impossible. One run looks like one run; seven runs
 * with the friendliest chosen is on the record and readable by a firm manager. This is the
 * standards' own Original / AI Suggestion / Final Approved discipline applied to a re-run.
 *
 * ⚠ NO SCHEMA CHANGE, and it was not asked for. Approvals ride the existing firm-overlay
 * config store under one key, which brings version history with it for free — the same call
 * Meeting Review made for transcripts, and stated there for the same reason.
 *
 * Node 14, CommonJS.
 */

const overlay = require('./firmOverlay')

/** Where approvals are stored, per firm, in the overlay. */
const CONFIG_KEY = 'economic-analysis-approvals'

/** A run is swept from memory this long after it was started. */
const RUN_TTL_MS = 2 * 60 * 60 * 1000

/**
 * Most runs one advisor may start against one context before the route refuses.
 *
 * Not a cost control — four live runs cost about £1.10 all in. It is the backstop under
 * the visibility rule above: a count that can reach three figures is not a record anybody
 * reads, and a loop that re-rolls forever is the one use of this feature nobody wants.
 */
const MAX_RUNS_PER_CONTEXT = 10

/** How many approvals are kept per firm before the oldest is dropped. */
const MAX_APPROVALS_KEPT = 500

/** runId → run. In memory only, by design (see the file note). */
const runs = new Map()

/** Monotonic suffix so two runs started in the same millisecond cannot collide. */
let sequence = 0

/**
 * The group a run is counted within: one advisor, one firm, one client context.
 *
 * `clientRef` is an opaque string the screen supplies and this file never interprets — it
 * exists so "run 4 of 4" counts runs for THIS piece of work rather than every run the
 * advisor has ever made. It is not a client id and is never sent to a model.
 *
 * @param {string} firmId
 * @param {string} advisorId
 * @param {string} [clientRef]
 * @returns {string}
 */
function contextKey (firmId, advisorId, clientRef) {
  return [firmId, advisorId, clientRef || ''].join('::')
}

/** Removes runs past their time to live. Called on every create; cheap at this scale. */
function sweep (now) {
  const cutoff = (typeof now === 'number' ? now : Date.now()) - RUN_TTL_MS
  for (const [id, run] of runs) {
    if (run.startedAt < cutoff) { runs.delete(id) }
  }
}

/**
 * How many runs already exist in this context.
 *
 * @param {string} firmId
 * @param {string} advisorId
 * @param {string} [clientRef]
 * @returns {number}
 */
function countInContext (firmId, advisorId, clientRef) {
  const key = contextKey(firmId, advisorId, clientRef)
  let n = 0
  for (const run of runs.values()) {
    if (run.contextKey === key) { n += 1 }
  }
  return n
}

/**
 * Starts a new run record in the `researching` state.
 *
 * @param {object} spec
 * @param {string} spec.firmId - from the verified token, never the body
 * @param {string} spec.advisorId - from the verified token, never the body
 * @param {string} [spec.clientRef]
 * @param {string} spec.brief - the advisor's own words, stored so the approval can name
 *   what was asked as well as what came back
 * @returns {object} the run
 */
function createRun (spec) {
  sweep()
  sequence += 1

  const key = contextKey(spec.firmId, spec.advisorId, spec.clientRef)
  const run = {
    runId: 'ea_' + Date.now().toString(36) + '_' + sequence.toString(36),
    contextKey: key,
    firmId: spec.firmId,
    advisorId: spec.advisorId,
    clientRef: spec.clientRef || null,
    brief: spec.brief,
    runNumber: countInContext(spec.firmId, spec.advisorId, spec.clientRef) + 1,
    state: 'researching',
    searches: [],
    searchCount: 0,
    result: null,
    error: null,
    approval: null,
    startedAt: Date.now(),
    finishedAt: null
  }

  runs.set(run.runId, run)
  return run
}

/**
 * A run, but only for the advisor who started it.
 *
 * Both identities are checked, not just the firm: a colleague at the same firm is as much
 * a stranger to this advisor's client research as another firm is — the guard Meeting
 * Review uses on recordings, for the same reason.
 *
 * @param {string} runId
 * @param {string} firmId
 * @param {string} advisorId
 * @returns {object|null}
 */
function ownedRun (runId, firmId, advisorId) {
  const run = runs.get(runId)
  if (!run) { return null }
  if (run.firmId !== firmId || run.advisorId !== advisorId) { return null }
  return run
}

/**
 * Records a search the model reported, for the waiting screen.
 *
 * The query is the model's own, shown to the advisor as it happens. Duplicates are kept:
 * a model searching the same phrase twice did search twice, and smoothing that out would
 * make a stalled run look busier than it is.
 *
 * @param {object} run
 * @param {string} query
 */
function recordSearch (run, query) {
  if (!run) { return }
  run.searchCount += 1
  const text = String(query || '').slice(0, 200)
  if (text) { run.searches.push(text) }
}

/**
 * Marks a run finished with validated research.
 * @param {object} run
 * @param {object} data - the `data` half of a `validateResearch` result
 */
function completeRun (run, data) {
  if (!run) { return }
  run.state = 'done'
  run.result = data
  run.finishedAt = Date.now()
}

/**
 * Marks a run failed. The advisor sees the message; the cause is logged, never returned.
 * @param {object} run
 * @param {string} code
 * @param {string} message
 */
function failRun (run, code, message) {
  if (!run) { return }
  run.state = 'failed'
  run.error = { code, message }
  run.finishedAt = Date.now()
}

/**
 * Records the second tick — the approval gate — and persists it.
 *
 * 🔴 THE TICK IS THE APPROVAL. There is no separate Approve button, because an advisor
 * reading the research and choosing to put it in front of a lender IS the approval the
 * standards require. What that makes mandatory is the RECORD: `isApproved`, who, when, and
 * which run of how many.
 *
 * Persistence never fails the tick. A firm whose overlay is unreachable must not be told
 * their approval was refused when the decision itself is sound — but the failure is
 * returned so the caller can say plainly that the record did not save, rather than
 * implying it did.
 *
 * @param {object} run
 * @param {{name: string, email: string}} who
 * @param {number} totalRuns - runs in this context at the moment of approval
 * @returns {Promise<{approval: object, recorded: boolean}>}
 */
async function approveRun (run, who, totalRuns) {
  const approval = {
    isApproved: true,
    runId: run.runId,
    runNumber: run.runNumber,
    totalRuns,
    approvedBy: { name: (who && who.name) || 'unknown', email: (who && who.email) || '' },
    approvedAt: new Date().toISOString(),
    clientRef: run.clientRef,
    brief: run.brief,
    sourceCount: run.result ? run.result.sources.length : 0,
    wordCount: run.result ? run.result.wordCount : 0
  }

  run.approval = approval

  let recorded = false
  try {
    const existing = await overlay.loadFirmConfig(run.firmId, CONFIG_KEY)
    const list = (existing && Array.isArray(existing.approvals)) ? existing.approvals : []
    list.push(approval)
    const kept = list.slice(-MAX_APPROVALS_KEPT)
    await overlay.saveFirmConfig(run.firmId, CONFIG_KEY, { approvals: kept }, approval.approvedBy)
    recorded = true
  } catch (err) {
    console.error('[economic-analysis] approval record failed:', err.message)
  }

  return { approval, recorded }
}

/**
 * Clears an approval — what "Research again" does, so unread research can never be
 * included on the strength of a tick set against a run nobody looked at.
 * @param {object} run
 */
function clearApproval (run) {
  if (run) { run.approval = null }
}

/** Test seam: empties the in-memory store. */
function _reset () {
  runs.clear()
  sequence = 0
}

module.exports = {
  CONFIG_KEY,
  RUN_TTL_MS,
  MAX_RUNS_PER_CONTEXT,
  MAX_APPROVALS_KEPT,
  contextKey,
  countInContext,
  createRun,
  ownedRun,
  recordSearch,
  completeRun,
  failRun,
  approveRun,
  clearApproval,
  _reset
}
