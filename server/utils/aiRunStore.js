'use strict'

/**
 * @file A run store for an AI feature — every run an advisor starts, what it returned, and
 *   which one they put their name to. One factory, one instance per feature.
 * @module server/utils/aiRunStore
 *
 * Extracted 2026-09-09 from `economicAnalysisRuns.js` (item 4.66) when the Business
 * Performance Report's next-steps draft (item 4.70, stage 6) needed the same two halves.
 * Everything below is that file's behaviour, parameterised; the Economic Analysis store is
 * now `createRunStore(...)` plus its one search-recording extra, and its route tests are
 * unchanged, which is what proves nothing moved.
 *
 * 🔴 TWO DIFFERENT LIFETIMES, AND THAT IS WHY THIS FILE HAS TWO HALVES.
 *
 * A RUN lives for minutes. It is started, polled, read, and either used or abandoned. It
 * holds the model's text, so it stays in memory and is swept: nothing is gained by
 * persisting a document the advisor is looking at right now, and a store that kept every
 * abandoned run would accumulate output nobody asked to keep.
 *
 * An APPROVAL lives for as long as the firm does. The moment an advisor ticks the box, the
 * standards' rule for financial work applies — an explicit `isApproved: true` before AI
 * output is committed — and the record of WHO decided WHICH RUN was fit for a client has to
 * outlive the browser tab. So that half is persisted.
 *
 * 🔴 EVERY RUN IS COUNTED, AND THE APPROVAL NAMES WHICH ONE WENT IN — ruled 2026-09-06.
 * Re-rolling until the answer flatters the client is the one habit these features must not
 * encourage. "Again" is kept deliberately, because the commonest reason to re-run is a bad
 * input, so the risk is made VISIBLE instead of impossible: one run looks like one run;
 * seven runs with the friendliest chosen is on the record and readable by a firm manager.
 *
 * ⚠ NO SCHEMA CHANGE. Approvals ride the existing firm-overlay config store under one key
 * per feature, which brings version history with it for free — the same call Meeting
 * Review made for transcripts, and stated there for the same reason.
 *
 * Node 14, CommonJS.
 */

const overlay = require('./firmOverlay')

/** A run is swept from memory this long after it was started. */
const RUN_TTL_MS = 2 * 60 * 60 * 1000

/**
 * Most runs one advisor may start against one context before the route refuses.
 *
 * Not a cost control. It is the backstop under the visibility rule above: a count that can
 * reach three figures is not a record anybody reads, and a loop that re-rolls forever is the
 * one use of these features nobody wants.
 */
const MAX_RUNS_PER_CONTEXT = 10

/** How many approvals are kept per firm before the oldest is dropped. */
const MAX_APPROVALS_KEPT = 500

/**
 * The group a run is counted within: one advisor, one firm, one client context.
 *
 * `clientRef` is an opaque string the screen supplies and this file never interprets — it
 * exists so "run 4 of 4" counts runs for THIS piece of work rather than every run the
 * advisor has ever made. It is never sent to a model.
 *
 * @param {string} firmId
 * @param {string} advisorId
 * @param {string} [clientRef]
 * @returns {string}
 */
function contextKey (firmId, advisorId, clientRef) {
  return [firmId, advisorId, clientRef || ''].join('::')
}

/**
 * Builds one feature's store.
 *
 * @param {object} spec
 * @param {string} spec.configKey - the overlay key the approvals are persisted under
 * @param {string} spec.idPrefix - run ids start with this, e.g. `ea_`
 * @param {string} spec.initialState - the state a new run is in, e.g. `researching`
 * @param {string} spec.logTag - the `[tag]` on this feature's log lines
 * @param {Function} [spec.runFields] - `(createSpec) => object` — extra fields a new run
 *   carries, e.g. the advisor's brief
 * @param {Function} [spec.approvalFields] - `(run) => object` — extra fields an approval
 *   records, e.g. the run's word count
 * @returns {object} the store
 */
function createRunStore (spec) {
  const CONFIG_KEY = spec.configKey
  const runFields = typeof spec.runFields === 'function' ? spec.runFields : () => ({})
  const approvalFields = typeof spec.approvalFields === 'function' ? spec.approvalFields : () => ({})

  /** runId → run. In memory only, by design (see the file note). */
  const runs = new Map()

  /** Monotonic suffix so two runs started in the same millisecond cannot collide. */
  let sequence = 0

  /** Removes runs past their time to live. Called on every create; cheap at this scale. */
  function sweep (now) {
    const cutoff = (typeof now === 'number' ? now : Date.now()) - RUN_TTL_MS
    for (const [id, run] of runs) {
      if (run.startedAt < cutoff) { runs.delete(id) }
    }
  }

  /**
   * How many runs already exist in this context.
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
   * Starts a new run record in the feature's initial state.
   *
   * @param {object} create
   * @param {string} create.firmId - from the verified token, never the body
   * @param {string} create.advisorId - from the verified token, never the body
   * @param {string} [create.clientRef]
   * @returns {object} the run
   */
  function createRun (create) {
    sweep()
    sequence += 1

    const key = contextKey(create.firmId, create.advisorId, create.clientRef)
    const run = Object.assign({
      runId: spec.idPrefix + Date.now().toString(36) + '_' + sequence.toString(36),
      contextKey: key,
      firmId: create.firmId,
      advisorId: create.advisorId,
      clientRef: create.clientRef || null,
      runNumber: countInContext(create.firmId, create.advisorId, create.clientRef) + 1,
      state: spec.initialState,
      result: null,
      error: null,
      approval: null,
      startedAt: Date.now(),
      finishedAt: null
    }, runFields(create))

    runs.set(run.runId, run)
    return run
  }

  /**
   * A run, but only for the advisor who started it.
   *
   * Both identities are checked, not just the firm: a colleague at the same firm is as much
   * a stranger to this advisor's client work as another firm is — the guard Meeting Review
   * uses on recordings, for the same reason.
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
   * Marks a run finished with validated output.
   * @param {object} run
   * @param {object} data - the validated result
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
   * Appends one approval record to the firm's persisted list.
   *
   * Persistence never fails the tick. A firm whose overlay is unreachable must not be told
   * their approval was refused when the decision itself is sound — but the failure is
   * returned so the caller can say plainly that the record did not save, rather than
   * implying it did.
   *
   * @param {string} firmId
   * @param {object} approval - must carry `approvedBy`
   * @returns {Promise<boolean>} whether the record was written
   */
  async function persistApproval (firmId, approval) {
    try {
      const list = await listApprovals(firmId)
      list.push(approval)
      const kept = list.slice(-MAX_APPROVALS_KEPT)
      await overlay.saveFirmConfig(firmId, CONFIG_KEY, { approvals: kept }, approval.approvedBy)
      return true
    } catch (err) {
      console.error('[' + spec.logTag + '] approval record failed:', err.message)
      return false
    }
  }

  /**
   * The firm's persisted approvals, oldest first. Empty when none, or when the overlay
   * cannot be read — the caller decides what an unreadable record means for it.
   * @param {string} firmId
   * @returns {Promise<object[]>}
   */
  async function listApprovals (firmId) {
    const existing = await overlay.loadFirmConfig(firmId, CONFIG_KEY)
    return (existing && Array.isArray(existing.approvals)) ? existing.approvals.slice() : []
  }

  /**
   * Records the tick — the approval gate — against a finished run, and persists it.
   *
   * 🔴 THE TICK IS THE APPROVAL. There is no separate Approve button, because an advisor
   * reading the output and choosing to put it in front of a client IS the approval the
   * standards require. What that makes mandatory is the RECORD: `isApproved`, who, when, and
   * which run of how many.
   *
   * @param {object} run
   * @param {{name: string, email: string}} who
   * @param {number} totalRuns - runs in this context at the moment of approval
   * @returns {Promise<{approval: object, recorded: boolean}>}
   */
  async function approveRun (run, who, totalRuns) {
    const approval = Object.assign({
      isApproved: true,
      runId: run.runId,
      runNumber: run.runNumber,
      totalRuns,
      approvedBy: { name: (who && who.name) || 'unknown', email: (who && who.email) || '' },
      approvedAt: new Date().toISOString(),
      clientRef: run.clientRef
    }, approvalFields(run))

    run.approval = approval
    const recorded = await persistApproval(run.firmId, approval)
    return { approval, recorded }
  }

  /**
   * Clears a run's approval — what "again" does, so unread output can never be included on
   * the strength of a tick set against a run nobody looked at.
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

  return {
    CONFIG_KEY,
    RUN_TTL_MS,
    MAX_RUNS_PER_CONTEXT,
    MAX_APPROVALS_KEPT,
    contextKey,
    countInContext,
    createRun,
    ownedRun,
    completeRun,
    failRun,
    approveRun,
    clearApproval,
    persistApproval,
    listApprovals,
    _reset
  }
}

module.exports = { createRunStore, contextKey, RUN_TTL_MS, MAX_RUNS_PER_CONTEXT, MAX_APPROVALS_KEPT }
