/**
 * Turn Mike's fill-in tables into the fields an advisor types into.
 *
 * `data/strategy-capture-tables.json` holds each template as the GRID its
 * document draws — faithful and uninterpreted. This module is where the
 * judgement lives: which cells of that grid are labels, which are capture
 * fields, and which are Mike's own worked examples.
 *
 * 🔴 IT DERIVES, IT DOES NOT AUTHOR. Every label returned here is a string read
 * off one of his documents. Nothing in this file writes a label, a prompt or a
 * heading of its own, because a client reads these words in the room.
 *
 * WHY A GENERAL MAPPER RATHER THAN NINE. Census §3 names nine capture forms, and
 * a mapper per form is nine places for the tenth template to be forgotten. The
 * grid already says what it is: a cell Mike numbered (`1,` `11` `a`) or left
 * empty is a line to write on; a cell with words is either the label above those
 * lines or the example he filled in to show what one looks like.
 *
 * @module server/utils/strategyCaptureForms
 */

'use strict'

const captureTables = require('../../data/strategy-capture-tables.json')

/**
 * Concepts name their template in `captureTemplate`; the template is a file on
 * disk. Eight of the twenty disagree by a suffix, a plural or a parenthetical.
 *
 * 🔴 THE ALIAS IS RECORDED HERE RATHER THAN THE DATA BEING CORRECTED. Both sides
 * are read off Mike's own material — the concept row from a deck's Session Scope
 * table, the file name from the workbook he saved — so neither is wrong, and
 * rewriting either to match the other loses the fact that he calls it two
 * things. `nameCollisions` on the Model Library side is the same lesson: compare
 * through a resolver, never by hoping two strings match.
 *
 * Each entry is `what a concept calls it` → `the file's own name`.
 */
const TEMPLATE_ALIASES = {
  '10 Critical Marketing Statements': 'Our 10 Critical Marketing Statements_',
  'Customer Types (nine personas)': 'Customer Types',
  'Leadership Review': 'Leadership Review_',
  'Profit Levers': 'Profit Levers (1)'
}

/**
 * Templates named by a concept for which no workbook was supplied.
 *
 * These four are prompt → answer sheets in census §3 and have no file in
 * `design/planning-templates/fill-in-tables/`. They resolve to nothing on
 * purpose: a concept with no table is reported as having none, never given a
 * borrowed one, because a table an advisor puts in front of a client has to be
 * the table Mike wrote.
 */
const TEMPLATES_NOT_SUPPLIED = ['Branding', 'Customer Loyalty', 'Packaging', 'Pricing']

/**
 * Resolve a concept's `captureTemplate` to the extracted template.
 *
 * @param {string} name  as `captureTemplate` spells it
 * @returns {?{file: string, format: string, tables: Array}}  null when not supplied
 */
function resolveTemplate (name) {
  if (!name) { return null }
  const key = TEMPLATE_ALIASES[name] || name
  return captureTables.templates[key] || null
}

/**
 * Is this row the labels for the lines beneath it?
 *
 * A label row is row 0, or a row of words whose NEXT row is all ruled lines —
 * which is exactly how a banded grid alternates ("How Customers May Change",
 * then 1–4). A run of prose rows, as a prompt → answer sheet is, contains no
 * label rows beyond its header.
 *
 * 🔴 A ROW THAT HOLDS A RULED LINE IS NEVER A LABEL ROW, whatever sits beside it.
 * A label row is skipped whole, so calling one a label loses every box on it. Blue
 * Ocean Fronts row 1 is `"1, Enter your thoughts here…" | <ruled line>`; it was read
 * as a label and the client lost a box Mike's document gives them — 14 where the
 * page has 15. Found 2026-09-19 by counting the drawing against the document.
 *
 * @param {Array} rows
 * @param {number} i
 * @returns {boolean}
 */
function isColumnHeaderRow (cells) {
  // 🔴 A COLUMN-HEADER ROW OPENS WITH EMPTY CORNER CELLS, and the rule above could not
  // see one. Customer Types heads its personas `blank | blank | Farm Wagon | Other 1 …`
  // and Operational Objectives its stages `blank | Stage 1 | Stage 2 | Stage 3`; both
  // carry a ruled line in the corner, so both rows were refused and EVERY column name
  // was lost with them — 181 boxes with no persona on any of them, 25 with no stage.
  // Found 2026-09-21 by counting the screen against his documents.
  //
  // The two conditions keep Blue Ocean Fronts out, which is what the rule above exists
  // for: its `"1, Enter your thoughts here…" | <ruled line>` has words in the FIRST
  // column and only one cell of them, so it is a content row and stays one.
  const firstWord = cells.findIndex(c => c.text && !c.blank)
  if (firstWord < 1) { return false }
  const named = cells.slice(firstWord)
  return named.length >= 2 && named.every(c => c.text && !c.blank)
}

function isLabelRow (rows, i) {
  const anyLine = rows[i].cells.some(c => c.blank)
  // Only the table's own first row may be a header with empty corner cells; a row of
  // words beside a ruled line anywhere further down is content, as Blue Ocean proved.
  if (anyLine) { return i === 0 && isColumnHeaderRow(rows[i].cells) }
  if (i === 0) { return true }
  const next = rows[i + 1]
  if (!next) { return false }
  const hasWords = rows[i].cells.some(c => c.text && !c.blank)
  const nextAllLines = next.cells.length > 0 && next.cells.every(c => c.blank)
  return hasWords && nextAllLines
}

/**
 * The fields of one grid.
 *
 * Two families, and the grid says which it is. When it contains ruled lines,
 * those lines ARE the fields and the words around them are labels or examples.
 * When it contains none — every cell carries words — the first column is the
 * prompt and the rest are what gets answered.
 *
 * @param {{columns: number, rows: Array}} table
 * @param {number} tableIndex  a template can hold more than one table
 * @returns {Array<object>}  fields in reading order
 */
/**
 * The fields of a grid whose ROWS are named and whose COLUMNS are the things being
 * compared — Customer Types' nine personas against nine attributes.
 *
 * ⚠ THIS IS THE ONE PLACE THIS MODULE READS A TEMPLATE'S FORM NAME, AND THE HEADER
 * ABOVE ARGUES AGAINST IT. Stated rather than slipped in. The general reading cannot
 * settle this table on its own: Customer Types' second column is a 0.10-inch gutter and
 * Operational Objectives' first column is where the advisor names each objective, and in
 * the extracted grid the two are the same thing — every cell empty, no words anywhere.
 * Only the width tells them apart, and width is not extracted. `captureForm` already
 * carries the answer on every concept, authored from the census, so it is read here
 * rather than a reading being invented that cannot be right.
 *
 * @param {{columns: number, rows: Array}} table
 * @param {number} tableIndex
 * @returns {Array<object>} fields in reading order
 */
function attributeRowFields (table, tableIndex) {
  const rows = table.rows
  const header = rows[0]
  const entity = []
  header.cells.forEach((cell, c) => {
    if (cell.text && !cell.blank) { entity.push({ column: c, label: cell.text }) }
  })
  if (!entity.length) { return [] }

  const fields = []
  let attribute = ''

  rows.forEach((row, r) => {
    if (r === 0) { return }
    // His attribute name carries down: a named row opens the attribute, the unnamed
    // rows beneath it are its remaining lines. Four of them under "3 Key Concerns/
    // Common Problems", three under "3 Dominant Buying Motives".
    const first = row.cells[0]
    if (first && first.text && !first.blank) { attribute = first.text }
    // The rows above his first attribute are the document's own spacing.
    if (!attribute) { return }

    entity.forEach((col) => {
      const cell = row.cells[col.column]
      if (!cell) { return }
      fields.push({
        key: 't' + tableIndex + 'r' + r + 'c' + col.column,
        row: r,
        column: col.column,
        columnLabel: col.label,
        rowLabel: attribute,
        example: '',
        // His own worked answer arrives IN the box to be typed over — his ruling of
        // 2026-09-21, and a departure from the banded grid's rule that a line carrying
        // words is shown and never typed into. It applies where the example is a whole
        // named COLUMN, never to a line inside one.
        prefilled: (cell.text && !cell.blank) ? cell.text : ''
      })
    })
  })

  return fields
}

function fieldsOfTable (table, tableIndex, form) {
  // 🔴 THE FORM NAME IS NOT ENOUGH ON ITS OWN, and reading it alone broke a table.
  // Customer & Skills Review is authored `attribute-rows-entity-columns` and is nothing
  // of the kind: its header is `Review Section | Review Findings`, one question and one
  // answer, with NO corner cell. Read as a matrix it offered 54 boxes where his document
  // asks 24. So the grid has to agree — an attribute-rows table heads its columns AFTER
  // one or more empty corner cells, because those corner cells are the label column.
  if (form === 'attribute-rows-entity-columns' &&
      table.rows.length > 1 && isColumnHeaderRow(table.rows[0].cells)) {
    return attributeRowFields(table, tableIndex)
  }

  const rows = table.rows
  const hasRuledLines = rows.some(r => r.cells.some(c => c.blank))

  // 🔴 A ONE-ROW TABLE OF WORDS IS A HEADING, NOT A FORM. Mike's Profit Levers
  // document puts its column names — "Our (7) Aims" | "Task" — in a table of their
  // own above the grid. Read as a prompt sheet, its first column became the prompt
  // and "Task" became a box to type into, so the screen offered 29 boxes where the
  // document has 28 and one of them was his own heading. `columnNamesOfTemplate`
  // below picks the row up as what it is. Found 2026-09-19.
  if (!hasRuledLines && rows.length === 1) { return [] }

  const fields = []
  const columnLabels = []

  rows.forEach((row, r) => {
    const labelRow = isLabelRow(rows, r)

    if (labelRow) {
      row.cells.forEach((cell, c) => {
        if (cell.text && !cell.blank) { columnLabels[c] = cell.text }
      })
      // A label row describes what follows; nothing is typed into it.
      if (hasRuledLines) { return }
    }

    // The row's own name, where it has one — a prompt, an aim, an attribute.
    const rowLabel = (!hasRuledLines || !labelRow)
      ? (row.cells[0] && row.cells[0].text && !row.cells[0].blank ? row.cells[0].text : '')
      : ''

    row.cells.forEach((cell, c) => {
      const isCapture = hasRuledLines
        ? cell.blank
        : (c > 0)

      if (!isCapture) { return }

      fields.push({
        key: 't' + tableIndex + 'r' + r + 'c' + c,
        row: r,
        column: c,
        // Both labels are Mike's words. Either may be absent; a banded grid's
        // lines carry only a column label, a prompt sheet only a row label.
        columnLabel: columnLabels[c] || '',
        rowLabel: rowLabel || '',
        // What he filled in to show what an answer looks like. Shown as guidance,
        // never saved as the client's own text.
        example: (!cell.blank && cell.text) ? cell.text : ''
      })
    })
  })

  return fields
}

/**
 * The capture table for one concept, ready to render.
 *
 * @param {object} concept  a row of `concepts` in data/strategy-frameworks.json
 * @returns {{
 *   supplied: boolean,
 *   reason?: string,
 *   template?: string,
 *   form?: string,
 *   fields?: Array<object>
 * }}
 *
 * 🔴 ONE CONCEPT, ONE CARD, AND THE WHOLE TABLE ON IT. Mike's ruling, 2026-09-21: a
 * concept is listed once, chosen once in Scope session, sorted once in Build session, and
 * appears once in Run session and once in the plan. This used to return a `parts` split as
 * well, which existed so Porter's could be visited twice — observation columns first,
 * response columns an hour later. That is gone, with the function that computed it.
 */
function captureForConcept (concept) {
  if (!concept || !concept.captureTemplate) {
    return {
      supplied: false,
      // Census §4 is explicit that picking a form for one of the other 32 is a
      // design decision, not a reading. Saying so is the honest state.
      reason: 'no-capture-template-measured'
    }
  }

  const template = resolveTemplate(concept.captureTemplate)
  if (!template) {
    return {
      supplied: false,
      reason: TEMPLATES_NOT_SUPPLIED.includes(concept.captureTemplate)
        ? 'template-not-supplied'
        : 'template-not-found',
      template: concept.captureTemplate
    }
  }

  const fields = []
  template.tables.forEach((table, i) => {
    fieldsOfTable(table, i, concept.captureForm).forEach(f => fields.push(f))
  })

  return {
    supplied: true,
    template: concept.captureTemplate,
    file: template.file,
    form: concept.captureForm || '',
    fields
  }
}

/**
 * Does this concept's capture table really contain this box?
 *
 * 🔴 THE SAVE GUARD, AND IT HAS TO KNOW ABOUT THE NEW TABLES. `strategyFrameworks`
 * knows only the five frameworks hand-built in September; every box read out of
 * Mike's own workbooks is unknown to it, so a save of one was refused with "a
 * capture box in this save does not belong to its framework" and the advisor was
 * told their typing could not be saved. Found by typing into the screen on
 * 2026-09-17 — the suite was green throughout, because no test posts an entry
 * from a concept table.
 *
 * It stays a whitelist: a key that is not a real box on that concept's table is
 * still refused, so nothing arbitrary reaches the store.
 *
 * @param {string} conceptId
 * @param {string} fieldKey
 * @param {function(string): ?object} getConcept  injected to avoid a require cycle
 * @returns {boolean}
 */
function hasCaptureField (conceptId, fieldKey, getConcept) {
  if (!conceptId || !fieldKey) { return false }
  const concept = getConcept(conceptId)
  if (!concept) { return false }
  const capture = captureForConcept(concept)
  if (!capture.supplied) { return false }
  return capture.fields.some(f => f.key === fieldKey)
}

module.exports = {
  resolveTemplate,
  captureForConcept,
  hasCaptureField,
  fieldsOfTable,
  TEMPLATE_ALIASES,
  TEMPLATES_NOT_SUPPLIED
}
