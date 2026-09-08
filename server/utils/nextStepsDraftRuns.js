'use strict'

/**
 * @file The next-steps draft run store — every draft an advisor asks for on the Business
 *   Performance Report, and the record of the three lines they ticked ready.
 * @module server/utils/nextStepsDraftRuns
 *
 * Item 4.70, stage 6. Drawing: `design/mockups/business-performance-report-next-steps-draft.html`.
 * One instance of `aiRunStore.createRunStore`, which holds the two-lifetime design and
 * the reasoning for it. What is this feature's alone is below.
 *
 * 🔴 THE TICK IS ON THE WORDS, NOT ON THE DRAFT. An advisor who types all three next steps
 * still ticks, so there is one rule rather than two, and the approval record carries the
 * three lines AS APPROVED. Page 8 prints only when the saved report's three lines equal
 * the approved copy — `matches()` below — so editing a word after the tick clears it by
 * construction, and nobody can print unapproved words by editing the saved row. That is
 * why `recordReady` takes the words and does not need a run: a run, where there was one,
 * is what the record NAMES, so the Original / AI Suggestion / Final Approved discipline
 * the standards require is on the record for a manager to read.
 *
 * Node 14, CommonJS.
 */

const { createRunStore } = require('./aiRunStore')

const store = createRunStore({
  /** Where approvals are stored, per firm, in the overlay. */
  configKey: 'next-steps-approvals',
  idPrefix: 'ns_',
  initialState: 'drafting',
  logTag: 'next-steps',
  /** `sent` is the exact list that left the app — the eight measures and their bands. */
  runFields: spec => ({ sent: spec.sent })
})

/** One next step as the approval keeps it. @param {object} s @returns {{title: string, body: string}} */
function lineOf (s) {
  return {
    title: String((s && s.title) || ''),
    body: String((s && s.body) || '')
  }
}

/**
 * Whether three lines equal an approval's three lines, word for word.
 *
 * @param {object|null} approval - as `recordReady` writes it
 * @param {Array<{title: string, body: string}>} steps
 * @returns {boolean}
 */
function matches (approval, steps) {
  if (!approval || approval.isApproved !== true || !Array.isArray(approval.steps)) { return false }
  const mine = (Array.isArray(steps) ? steps : []).map(lineOf)
  if (mine.length !== 3 || approval.steps.length !== 3) { return false }
  return approval.steps.every((s, i) => s.title === mine[i].title && s.body === mine[i].body)
}

/**
 * Records the tick — or its removal — for one client's report, and persists it.
 *
 * @param {object} spec
 * @param {string} spec.firmId - from the verified token
 * @param {string} spec.clientRef - which client's report; an opaque id, never sent to a model
 * @param {boolean} spec.ready - the tick's new state
 * @param {Array<{title: string, body: string}>} spec.steps - the three lines as they stand
 * @param {object|null} [spec.run] - the draft run the lines came from, where there was one
 * @param {{name: string, email: string}} spec.who
 * @param {number} [spec.totalDrafts] - drafts in this context at the moment of the tick
 * @returns {Promise<{approval: object, recorded: boolean}>}
 */
async function recordReady (spec) {
  const steps = [0, 1, 2].map(i => lineOf(spec.steps && spec.steps[i]))
  const run = spec.run || null
  const draft = run && run.result && Array.isArray(run.result.steps) ? run.result.steps.map(lineOf) : null
  const approval = {
    isApproved: spec.ready === true,
    clientRef: spec.clientRef,
    runId: run ? run.runId : null,
    draftNumber: run ? run.runNumber : 0,
    totalDrafts: typeof spec.totalDrafts === 'number' ? spec.totalDrafts : 0,
    approvedBy: { name: (spec.who && spec.who.name) || 'unknown', email: (spec.who && spec.who.email) || '' },
    approvedAt: new Date().toISOString(),
    /** The exact list that was sent, where a draft was used — what the model was given. */
    sent: run ? run.sent : null,
    /** The AI suggestion as it arrived, where there was one. */
    draft,
    /** The model's own statement of its limits (platform protocol 4), recorded, never printed. */
    limits: run && run.result && typeof run.result.limits === 'string' ? run.result.limits : null,
    /** The final approved lines. */
    steps,
    /** Per line: whether the approved line differs from the draft. All false with no draft. */
    edited: steps.map((s, i) => Boolean(draft && (draft[i].title !== s.title || draft[i].body !== s.body)))
  }
  if (run) { run.approval = approval.isApproved ? approval : null }
  const recorded = await store.persistApproval(spec.firmId, approval)
  return { approval, recorded }
}

/**
 * The latest record for one client's report, or null. The newest wins, so a tick removed
 * after a tick set reads as removed.
 *
 * @param {string} firmId
 * @param {string} clientRef
 * @returns {Promise<object|null>}
 */
async function latestApproval (firmId, clientRef) {
  const list = await store.listApprovals(firmId)
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i] && list[i].clientRef === clientRef) { return list[i] }
  }
  return null
}

/**
 * What a screen or a printed page may know of an approval: whether it holds for these
 * words, who and when, and which draft of how many. Never the lines themselves — the
 * caller already has the words it is asking about.
 *
 * @param {object|null} approval
 * @param {Array<{title: string, body: string}>} steps
 * @returns {{approved: boolean, approvedBy: object|null, approvedAt: string|null, draftNumber: number, totalDrafts: number, edited: boolean[]}}
 */
function summarise (approval, steps) {
  const ok = matches(approval, steps)
  return {
    approved: ok,
    approvedBy: ok ? approval.approvedBy : null,
    approvedAt: ok ? approval.approvedAt : null,
    draftNumber: ok ? approval.draftNumber : 0,
    totalDrafts: ok ? approval.totalDrafts : 0,
    edited: ok ? approval.edited.slice() : [false, false, false]
  }
}

module.exports = Object.assign({ recordReady, latestApproval, matches, summarise }, store)
