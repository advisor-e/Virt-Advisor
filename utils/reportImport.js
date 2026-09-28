'use strict'

/**
 * @file Bringing a client's saved Business Performance Report into a Strategy Planner card
 *   (item 15.13; the approved drawing is design/mockups/strategy-current-position-import.html).
 * @module utils/reportImport
 *
 * 🔴 NOTHING IS COPIED. The card reads the client's one saved report — the same row
 * /dashboard-reports opens — and the report's own pages route works its figures out again,
 * exactly as the report's page does. So the card can never show a figure the report would
 * not, and a change saved to the report shows the next time it is brought in.
 *
 * Kept as a plain module so the one judgement here — whether a saved row is a report at
 * all — is testable without a component.
 */

const { emptyState, applySavedDashboardReport } = require('./dashboardReportsSavedShape')

/** The one report a card may bring in today — `CONCEPT_IMPORT_REPORTS` on the backend. */
const IMPORT_ROUTE = '/dashboard-reports'

/**
 * The one session entry such a card saves: that the advisor brought the report in. The
 * plan prints the report's Executive Summary only then (Decision D). A marker, never a
 * figure. The backend's save guard reads this same constant.
 */
const REPORT_IMPORT_KEY = 'report-import'

/**
 * Whether a loaded report has what its pages are made from: this year's confirmed revenue.
 *
 * 🔴 A SAVED ROW IS NOT THE SAME AS A COMPLETED REPORT. The report saves from its first step,
 * so a row can hold an industry and a financial year and not one figure — and every page of
 * it would then be dashes. Mike's message for that case says "no completed Business
 * Performance Report", so a row like that gets his message, never a report of blanks.
 *
 * @param {object} state - a state from `applySavedDashboardReport`
 * @returns {boolean}
 */
function isCompletedReport (state) {
  const line = state && state.current && state.current.figures && state.current.figures.tradingIncome
  const v = line && line.value !== null && line.value !== undefined ? Number(line.value) : NaN
  return Number.isFinite(v)
}

/**
 * The period a report names itself by, as its own screen does.
 * @param {object} state
 * @returns {string}
 */
function periodOf (state) {
  const s = state || {}
  return (s.setup && s.setup.financialYear) || (s.current && (s.current.profitLossDate || s.current.balanceSheetDate)) || ''
}

/**
 * Read the answer of `getSavedReport` into what the card shows.
 *
 * @param {{report: ?{inputs: object, savedAt: string, savedBy: ?{name: string}}}} answer
 * @returns {{completed: false} | {completed: true, state: object, period: string, savedAt: string, savedBy: string}}
 */
function importFromSaved (answer) {
  const report = answer && answer.report
  if (!report || !report.inputs || typeof report.inputs !== 'object') { return { completed: false } }
  const state = applySavedDashboardReport(emptyState(), report.inputs)
  if (!isCompletedReport(state)) { return { completed: false } }
  return {
    completed: true,
    state,
    period: periodOf(state),
    savedAt: typeof report.savedAt === 'string' ? report.savedAt : '',
    savedBy: report.savedBy && typeof report.savedBy.name === 'string' ? report.savedBy.name : ''
  }
}

module.exports = {
  IMPORT_ROUTE,
  REPORT_IMPORT_KEY,
  isCompletedReport,
  periodOf,
  importFromSaved
}
