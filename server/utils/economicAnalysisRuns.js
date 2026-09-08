'use strict'

/**
 * @file The Economic Analysis run store — every research run an advisor starts, what it
 *   returned, and which one they put their name to.
 * @module server/utils/economicAnalysisRuns
 *
 * Item 4.66. Screens: `design/mockups/three-way-forecast-economic-analysis.html`.
 *
 * Since 2026-09-09 this is one instance of `aiRunStore.createRunStore` — the two-lifetime
 * design (a run in memory for minutes, an approval persisted for as long as the firm), the
 * per-context run count, the owner check and the approval record all live there, and the
 * reasoning for each is written there once. What is this feature's alone stays here: the
 * advisor's brief on the run, the model's search phrases for the waiting screen, and the
 * source and word counts the approval names.
 *
 * Node 14, CommonJS.
 */

const { createRunStore } = require('./aiRunStore')

const store = createRunStore({
  /** Where approvals are stored, per firm, in the overlay. */
  configKey: 'economic-analysis-approvals',
  idPrefix: 'ea_',
  initialState: 'researching',
  logTag: 'economic-analysis',
  /**
   * The brief is stored so the approval can name what was asked as well as what came back;
   * the searches are the model's own, shown to the advisor as they happen.
   */
  runFields: spec => ({ brief: spec.brief, searches: [], searchCount: 0 }),
  approvalFields: run => ({
    brief: run.brief,
    sourceCount: run.result ? run.result.sources.length : 0,
    wordCount: run.result ? run.result.wordCount : 0
  })
})

/**
 * Records a search the model reported, for the waiting screen.
 *
 * Duplicates are kept: a model searching the same phrase twice did search twice, and
 * smoothing that out would make a stalled run look busier than it is.
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

module.exports = Object.assign({ recordSearch }, store)
