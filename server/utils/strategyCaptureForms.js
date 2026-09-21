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
const deckCaptureTables = require('../../data/strategy-deck-capture-tables.json')
const orgChart = require('./strategyOrgChart')

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
 * Resolve a concept's `captureTemplate` to the extracted template.
 *
 * 🔴 A TABLE COMES FROM A WORKBOOK **OR** FROM A DECK PAGE, and for four concepts it
 * was always the second. This used to consult the workbooks alone and carry a list
 * called `TEMPLATES_NOT_SUPPLIED` — Branding, Customer Loyalty, Packaging, Pricing —
 * which told an advisor mid-session that *"the Branding table has not been supplied
 * yet"*. It had been. His form is page 34 of the Sales & Marketing deck, facing the
 * teaching page the app already shows, and the other three are pages 36, 38 and 40:
 * 29 questions the app said did not exist. Mike, 2026-09-22: *"the content is right
 * there and the forms are on the same page"*.
 *
 * The list is gone rather than emptied, because there is nothing left in it and a
 * template a concept names that resolves to neither source is now a defect —
 * `template-not-found` — not a gap in his material. `scripts/read-deck-capture-tables.js`
 * writes the second source.
 *
 * @param {string} name  as `captureTemplate` spells it
 * @returns {?{file: string, format: string, tables: Array}}  null when neither has it
 */
function resolveTemplate (name) {
  if (!name) { return null }
  const key = TEMPLATE_ALIASES[name] || name
  return captureTables.templates[key] || deckCaptureTables.templates[key] || null
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

/**
 * The fields of a table that is a STACK OF NAMED FIELDS — his name, his worked
 * example, and one box.
 *
 * 🔴 IT IS READ BY FORM NAME, AND THE REASON IS MEASURED RATHER THAN ASSERTED. Six
 * of Mike's other tables are structurally IDENTICAL to Strategic Statements — two
 * columns, headings on row 0, not one blank cell between them: Marketing Answers,
 * the 10 Critical Marketing Statements, Branding, Customer Loyalty, Pricing and
 * Packaging. In every one of those his first column holds the QUESTIONS and must
 * never become a box. Nothing in the grid separates them, so the form name the
 * concept already carries is the only honest signal, exactly as it is for the
 * persona grid above.
 *
 * Two orientations, and the grid says which — his own two documents are one each:
 *
 * - **No ruled lines → the names run ACROSS row 0** (Strategic Statements). Row 1
 *   is one box per column, HIS FIRST COLUMN INCLUDED. The general reading below
 *   assumes column 0 is a prompt when a table has no ruled lines, which is true of
 *   the six sheets above and false here: it offered 1 box where his slide gives 2,
 *   so his Strategic Objective statement had nowhere to go at all.
 * - **Ruled lines → the names run DOWN column 0** (Productive Habits), each on the
 *   dark band his document shades `#434343`. That band is printed wording, never a
 *   writing area; the general reading put a box inside it and headed the box beside
 *   it with his whole worked-example SENTENCE, offering 8 boxes for 5 fields.
 *
 * 🔴 EVERY NAMED ROW GETS A BOX, INCLUDING THE LAST — Mike's ruling, 2026-09-22.
 * His four other fields have a blank row beneath them and `Plan:` does not, because
 * it is the last row and the table simply ends there. Keying the box to the line
 * BENEATH each name would therefore have dropped Plan, which is the one field the
 * session exists to produce. So the box is keyed to the field's own row: uniform,
 * and there is no field his grid cannot carry one for. ⚠ `Plan:`'s box is the only
 * box on this form that is his RULING rather than his DOCUMENT.
 *
 * 🔴 AND HIS BLANK ROWS ARE A GAP, NOT ROWS — his words, 2026-09-22: *"we need a gap
 * between content rows on the productive habits but the additional small row spaces
 * can be deleted."* They are skipped here and the spacing is the screen's.
 *
 * ⚠ DEFINED FOR TWO-COLUMN TABLES, which is what both of his are.
 * `namedFieldStackIsTwoColumns` in the suite fails the build if a third column ever
 * arrives, rather than letting it be dropped silently.
 *
 * @param {{columns: number, rows: Array}} table
 * @param {number} tableIndex
 * @returns {Array<object>} fields in reading order
 */
function namedFieldStackFields (table, tableIndex) {
  const rows = table.rows
  const hasRuledLines = rows.some(r => r.cells.some(c => c.blank))
  const fields = []

  const push = (r, c, name, cell) => {
    fields.push({
      key: 't' + tableIndex + 'r' + r + 'c' + c,
      row: r,
      column: c,
      // His field name. Both his documents name every field, so unlike the banded
      // grid there is never a box here without one.
      columnLabel: name,
      rowLabel: '',
      // His worked example, shown inside the box as guide text the advisor types
      // over — Mike's ruling on Decision 2, 2026-09-22. Never a heading of its own.
      example: (cell && !cell.blank && cell.text) ? cell.text : ''
    })
  }

  if (!hasRuledLines) {
    const head = rows[0]
    const body = rows[1]
    if (!head || !body) { return [] }
    head.cells.forEach((name, c) => {
      if (!name.text || name.blank) { return }
      push(1, c, name.text, body.cells[c])
    })
    return fields
  }

  rows.forEach((row, r) => {
    const name = row.cells[0]
    if (!name || !name.text || name.blank) { return }
    push(r, 1, name.text, row.cells[1])
  })
  return fields
}

/**
 * The fields of a table that is TWO INDEPENDENT LISTS SIDE BY SIDE — his Product Fit
 * page, where the left column asks about the client's own customers and the right
 * about their competitors.
 *
 * 🔴 THEY ARE NOT ROWS OF ONE TABLE, AND READING THEM AS ROWS IS THE WHOLE DEFECT.
 * In Word the two sit inside one two-column table, so they look like one list. They
 * are not: the left asks 3 questions and stops at row 6, the right asks 6 and runs to
 * row 12. Read positionally his page offered **15 boxes for 9 questions** — one
 * question put to the client SEVEN times — and **3 of his questions reached no screen
 * at all**. Two faults, one cause:
 *
 * - **The left column's empty tail became boxes.** Every blank cell below its last
 *   question was read as a line to write on, each headed with his LAST left-hand
 *   question, because that was the most recent heading the general reader had seen.
 * - **`isLabelRow` refuses any row holding a blank cell** — which from row 7 down is
 *   every remaining right-hand question. They were read as content: not a heading,
 *   not a box, gone. *"Based on the std Competition Fronts list…"*, *"Re-above, Are
 *   these the fronts…"* and *"How can you best respond to competition?"* were on his
 *   page and on no screen.
 *
 * 🔴 MIKE RULED IT SPLIT, 2026-09-22, and went further than the recommendation:
 * *"it might be easier to split the tables into 2 - 1- customer orientation and
 * 2-competitor comparison."* So this walks each column as its own list and **a list
 * ends where it ends** — trailing blanks are empty page, and carry no heading down
 * with them. `columnLabel` is his table heading and `rowLabel` his question, which is
 * what makes the screen render his two tables: `blocks` in
 * `StrategyConceptCapture.vue` already groups by `columnLabel`, so no second grouping
 * had to be invented for it.
 *
 * ⚠ A QUESTION WITH NO LINE BENEATH IT STILL GETS A BOX, keyed to its own cell. That
 * does not arise in his document — every question here has one — and it is the same
 * answer his `Plan:` ruling gave on the named-field stack: a list's last question is
 * not dropped because the page ran out.
 *
 * @param {{columns: number, rows: Array}} table
 * @param {number} tableIndex
 * @returns {Array<object>} fields in reading order — his first list, then his second
 */
function parallelPromptPairFields (table, tableIndex) {
  const rows = table.rows
  const head = rows[0]
  if (!head) { return [] }
  const fields = []

  head.cells.forEach((groupCell, c) => {
    const group = (groupCell.text && !groupCell.blank) ? groupCell.text : ''
    rows.forEach((row, r) => {
      if (r === 0) { return }
      const cell = row.cells[c]
      // A blank cell is either his writing line, taken below, or — past this column's
      // last question — empty page. Neither is a field in its own right.
      if (!cell || cell.blank || !cell.text) { return }
      const below = rows[r + 1] && rows[r + 1].cells[c]
      const boxRow = (below && below.blank) ? r + 1 : r
      fields.push({
        key: 't' + tableIndex + 'r' + boxRow + 'c' + c,
        row: boxRow,
        column: c,
        // His table heading — what groups the questions into his two tables.
        columnLabel: group,
        // His question, shown above the box it belongs to.
        rowLabel: cell.text,
        // His page carries no worked example on this form; every answer cell is blank.
        example: ''
      })
    })
  })

  return fields
}

/** The stack of named fields — Strategic Statements and Productive Habits. */
const NAMED_FIELD_STACK = 'named-field-stack'

/** Two independent lists side by side — his Product Fit page. */
const PARALLEL_PROMPT_PAIR = 'parallel-prompt-pair'

function fieldsOfTable (table, tableIndex, form) {
  if (form === NAMED_FIELD_STACK) {
    return namedFieldStackFields(table, tableIndex)
  }

  if (form === PARALLEL_PROMPT_PAIR) {
    return parallelPromptPairFields(table, tableIndex)
  }

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

  // 🔴 A ROW WITH NOTHING ON IT AT ALL, IN A TWO-COLUMN QUESTION SHEET, IS THE GAP
  // BETWEEN HIS GROUPS — NOT A QUESTION. Customer & Skills Review asks 24 questions and
  // puts a blank row between each customer segment; read as lines, those three rows
  // offered six more boxes than his document does, under no heading at all. This is the
  // same rule as 2026-09-19's, not a new one: the screen offers exactly the boxes his
  // document rules, no more and no fewer.
  //
  // ⚠ NARROW ON PURPOSE, AND THE WIDE VERSION WAS MEASURED BEFORE THIS WAS WRITTEN. A
  // blank row is USUALLY a real line: dropping every one of them takes 32 boxes off
  // Porter's, 28 off the Profit Levers and 14 off Blue Ocean. It is a gap only where the
  // table is two columns, every row of it either asks a question in the first column or
  // is entirely empty, and the questions outnumber the empties two to one. Measured
  // across all 20 templates: Customer & Skills Review is the only one this touches.
  const body = rows.slice(1)
  const asks = body.filter(r => r.cells[0] && r.cells[0].text && !r.cells[0].blank).length
  const empties = body.filter(r => r.cells.every(c => c.blank)).length
  const isQuestionSheet = table.columns === 2 &&
    asks + empties === body.length &&
    empties > 0 && asks >= empties * 2

  const fields = []
  const columnLabels = []

  rows.forEach((row, r) => {
    if (isQuestionSheet && r > 0 && row.cells.every(c => c.blank)) { return }
    const labelRow = isLabelRow(rows, r)

    if (labelRow) {
      row.cells.forEach((cell, c) => {
        if (cell.text && !cell.blank) { columnLabels[c] = cell.text }
      })
      // 🔴 A LABEL ROW DESCRIBES WHAT FOLLOWS; NOTHING IS TYPED INTO IT — AND THAT IS
      // TRUE WHETHER OR NOT THE TABLE HAS RULED LINES. This used to skip it only when
      // `hasRuledLines`, which meant a heading survived as a box in exactly the
      // templates Mike has WORKED THROUGH: fill an example into every cell and no cell
      // is blank, so the table has no ruled lines and its heading fell through. 6
      // Marketing Questions offered 7 boxes and 10 Marketing Messages offered 11 — the
      // extra one asking an advisor to answer the words "The Question", with his
      // opposite heading shown beneath as the worked example. The concept titles are the
      // acceptance test, and `isLabelRow` has already decided this row is a heading;
      // there was never a reason for the decision to be re-litigated by line style.
      // Measured across all 20 templates before changing: four tables have no ruled
      // lines and every one of them genuinely opens with a heading. Found 2026-09-22.
      return
    }

    // The row's own name, where it has one — a prompt, an aim, an attribute. A label row
    // has already returned above, so this is always a content row.
    const rowLabel = row.cells[0] && row.cells[0].text && !row.cells[0].blank
      ? row.cells[0].text
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
    // Every template a concept names now resolves, from a workbook or a deck page,
    // and `templatesAllResolve` in the suite keeps it that way. So reaching here is
    // a defect on our side — a renamed file, a typo — never a gap in Mike's
    // material, and it must not tell an advisor his table "has not been supplied".
    return {
      supplied: false,
      reason: 'template-not-found',
      template: concept.captureTemplate
    }
  }

  // 🔴 ONE FORM IS NOT A GRID OF BOXES AT ALL, AND IT CANNOT BE READ AS ONE. Mike ruled the
  // Org Chart a mini-app on 2026-09-21 — "which is why the original is in a spreadsheet".
  // Read positionally it offers 49 boxes, 32 of them from a column that is empty top to
  // bottom in his sheet, and the save guard below would REFUSE role 31 because his document
  // has 30 rows. So this form carries no `fields` and the screen builds the list instead.
  // Its record shape and its guard are `utils/orgChart.js`.
  if (concept.captureForm === orgChart.FORM) {
    return {
      supplied: true,
      template: concept.captureTemplate,
      file: template.file,
      form: concept.captureForm,
      // Empty, and true: there are no fixed boxes to enumerate. Everything on the screen
      // comes from the roster the advisor builds.
      fields: [],
      orgChart: orgChart.captureShape()
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
 * 🔴 AND THE ORG CHART IS WHY THIS GUARD NEEDED A SECOND SHAPE, NOT A LOOSER ONE. Its rows
 * are people the advisor adds and removes, so there is no list of positions to check against
 * — his sheet stops at row 30 and the 31st name would have been refused with "your typing
 * could not be saved". `isOrgChartKey` is still a whitelist: the roster, or `orgrole-<n>-name`
 * / `orgrole-<n>-head` with n inside a fixed ceiling, and nothing else. It is reachable ONLY
 * from a concept authored on that form, so no other concept gains a key it should not have.
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
  if (capture.form === orgChart.FORM) { return orgChart.isOrgChartKey(fieldKey) }
  return capture.fields.some(f => f.key === fieldKey)
}

module.exports = {
  resolveTemplate,
  captureForConcept,
  hasCaptureField,
  fieldsOfTable,
  NAMED_FIELD_STACK,
  PARALLEL_PROMPT_PAIR,
  TEMPLATE_ALIASES
}
