'use strict'

/**
 * strategyOrgChart — the Org Chart Builder's backend half.
 *
 * @module server/utils/strategyOrgChart
 *
 * Approved artefact: `design/mockups/strategy-capture-parent-child-list.html`, five
 * decisions ruled by Mike 2026-09-21. Item 15.1, stage 5, capture form 3 of 9.
 *
 * TWO JOBS, AND NEITHER IS THE RECORD SHAPE. The keys and the chart geometry live in
 * `utils/orgChart.js`, which this file requires rather than copying — the screen writes
 * those keys and this guard admits them, so a second copy would drift and the advisor would
 * be told their typing could not be saved with nothing to explain it. What is here is what
 * only the backend can do:
 *
 * 1. **Read his own workbook.** The 24-role worked example and the one column heading his
 *    sheet gives are lifted out of `Org Chart.xlsx` through
 *    `data/strategy-capture-tables.json`. Nothing is typed: the drawing's own example was
 *    read by a script and so is this one.
 * 2. **Serve the capture shape** for the one concept that uses this form.
 *
 * Node 14, CommonJS.
 */

const captureTables = require('../../data/strategy-capture-tables.json')
const orgChart = require('../../utils/orgChart')

/** The template his Org Chart concept names, as `captureTemplate` spells it. */
const TEMPLATE = 'Org Chart'

/** The capture form this module serves, as `captureForm` spells it on the concept. */
const FORM = 'parent-child-list'

/**
 * His table, or null where the workbook is not in the extract.
 * @returns {?{columns: number, rows: Array}}
 */
function table () {
  const template = captureTables.templates[TEMPLATE]
  if (!template || !template.tables || !template.tables.length) { return null }
  return template.tables[0]
}

/**
 * Mike's own 24-role worked example, read off `Org Chart.xlsx`.
 *
 * 🔴 READ, NEVER TYPED. A row counts as his where the Role cell carries words; his empty
 * rows 25–30 are ruled lines waiting for a client and are not part of the example. Decision
 * A, ruled 2026-09-21: the screen opens EMPTY and this arrives on one click, because an org
 * chart is the client's own and 24 roles that are not theirs is 24 deletions before they can
 * begin.
 *
 * @returns {Array<{name: string, reportsTo: string}>} in his document's order
 */
function exampleRoles () {
  const t = table()
  if (!t) { return [] }
  const out = [];
  (t.rows || []).forEach((row, i) => {
    if (i === 0) { return }
    const name = row.cells[1]
    const head = row.cells[2]
    if (!name || name.blank || !name.text) { return }
    out.push({
      name: name.text,
      reportsTo: (head && !head.blank && head.text) ? head.text : ''
    })
  })
  return out
}

/**
 * The one column heading his sheet gives — "Reporting Head".
 *
 * ⚠ IT IS READ RATHER THAN WRITTEN, and the Role column beside it is the ONE word on this
 * screen that is ours (Decision B, ruled 2026-09-21). His sheet leaves that column unheaded;
 * a blank heading beside a filled one reads as a fault rather than as his document, which is
 * why he ruled it headed. That word lives in the locale file and is marked there as ours.
 *
 * @returns {string}
 */
function headColumnLabel () {
  const t = table()
  if (!t) { return '' }
  const header = (t.rows || [])[0]
  if (!header) { return '' }
  const cell = header.cells[2]
  return (cell && !cell.blank && cell.text) ? cell.text : ''
}

/**
 * The capture payload for a concept on this form.
 *
 * `fields` stays EMPTY and that is the true state rather than an omission: there are no
 * fixed boxes to enumerate, because the list is what the advisor builds. The screen reads
 * `orgChart` instead, and the save guard reads `isOrgChartKey`.
 *
 * @returns {{roster: string, maxRoles: number, headLabel: string, example: Array}}
 */
function captureShape () {
  return {
    roster: orgChart.ROSTER_KEY,
    maxRoles: orgChart.MAX_ROLES,
    headLabel: headColumnLabel(),
    example: exampleRoles()
  }
}

module.exports = {
  TEMPLATE,
  FORM,
  isOrgChartKey: orgChart.isOrgChartKey,
  exampleRoles,
  headColumnLabel,
  captureShape
}
