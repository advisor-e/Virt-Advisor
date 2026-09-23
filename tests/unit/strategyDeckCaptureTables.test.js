/**
 * The five capture tables that live on a DECK PAGE, not in a workbook.
 *
 * 🔴 THEY ARE NOT ALL ONE SHAPE, AND THIS FILE USED TO ASSUME THEY WERE. Four are the
 * Sales & Marketing "<X> Considerations | Your <X> Ideas" sheets, two columns of
 * question → answer. The fifth, **Divisional KPI's**, is a three-column grid of named
 * rows: his six divisions down the side, Primary Output and Divisional KPI across.
 * Every assertion that reads "each" now says WHICH, because a rule applied to the
 * wrong shape is how a form gets read as the half it is not (Brief §0, forms 5 and 6).
 *
 * 🔴 WHY THIS FILE CANNOT DO WHAT ITS WORKBOOK EQUIVALENT DOES.
 * `strategyCaptureForms.test.js` re-parses every .docx and .xlsx and compares the
 * result to the committed data, because those workbooks are in the repository. These
 * five come out of a PDF deck that sits OUTSIDE it — `C:\Documents\Visual Code
 * Projects\Strategy Planner` — which neither machine's test run nor the master team
 * can open. So the committed extraction is guarded by its SHAPE instead, the same
 * arrangement the 33 concept drawings use.
 *
 * Every assertion below caught, or would have caught, something real. None of them
 * asserts wording: the question text is Mike's and is read off his page, so pinning
 * it here would only break the day he edits a question, which is exactly the kind of
 * test his 2026-08-24 ruling says not to write.
 */

'use strict'

const deckTables = require('../../data/strategy-deck-capture-tables.json')
const reader = require('../../scripts/read-deck-capture-tables')
const forms = require('../../server/utils/strategyCaptureForms')
const { concepts } = require('../../data/strategy-frameworks.json')

const TEMPLATES = Object.keys(deckTables.templates)

/**
 * The four two-column question sheets, NAMED rather than derived from the data.
 *
 * Deriving this list (`…filter(columns === 2)`) would make the shape assertions below
 * describe whatever was extracted instead of what his pages hold — a guard that agrees
 * with every result is not a guard. A fifth question sheet is added here by hand.
 */
const QUESTION_SHEETS = ['Branding', 'Customer Loyalty', 'Pricing', 'Packaging']

/** The one named-row grid. Its own shape is asserted in its own describe, below. */
const NAMED_ROW_GRIDS = ['Divisional KPIs']

describe('the five forms on his deck pages are read, not declared missing', () => {
  test('every deck-page template is accounted for by one of the two shapes', () => {
    // Without this, a sixth template could be added and every shape assertion below
    // would simply skip it — passing while guarding nothing.
    expect([...QUESTION_SHEETS, ...NAMED_ROW_GRIDS].sort()).toEqual([...TEMPLATES].sort())
  })

  test('every page the reader is told to read has a committed table', () => {
    expect(reader.PAGES.length).toBeGreaterThan(0)
    reader.PAGES.forEach((p) => {
      const t = deckTables.templates[p.template]
      expect(t).toBeDefined()
      expect(t.deck).toBe(p.deck)
      expect(t.page).toBe(p.page)
    })
  })

  test('each question sheet is one two-column grid — his question beside the client\'s answer', () => {
    QUESTION_SHEETS.forEach((name) => {
      const t = deckTables.templates[name]
      expect(t.tables).toHaveLength(1)
      expect(t.tables[0].columns).toBe(2)
      expect(t.tables[0].rows.length).toBeGreaterThan(1)
    })
  })

  test('the header row names both columns, and every row under it asks something', () => {
    // A row with an empty first column would be a box under no question at all —
    // the fault that cost Customer Types 181 unlabelled boxes on a different form.
    TEMPLATES.forEach((name) => {
      const rows = deckTables.templates[name].tables[0].rows
      expect(rows[0].cells[0].text).not.toBe('')
      expect(rows[0].cells[1].text).not.toBe('')
      rows.slice(1).forEach((r, i) => {
        expect(`${name} row ${i + 1}: ${r.cells[0].text}`).not.toMatch(/: $/)
      })
    })
  })

  test('🔴 his page number is not sitting in a client\'s answer box', () => {
    // It was, on three of the four. Every deck page carries its number in grey at the
    // bottom right, and on p34, p36 and p38 it falls a couple of points INSIDE the
    // grid's last rule — so read by position it landed in the box where the client
    // answers his final question, and the extraction wrote "34", "36" and "38" there.
    // Found by reading the table back rather than trusting the row counts.
    // ⚠ EVERY cell, not just the last column. That was enough while all four grids had
    // two columns and the number could only fall in the right-hand one; Divisional KPI's
    // has three, so the corner it lands in is no longer a fixed index.
    TEMPLATES.forEach((name) => {
      const t = deckTables.templates[name]
      t.tables[0].rows.slice(1).forEach((r) => {
        r.cells.forEach((c) => {
          expect(`${name}|${c.text}`).not.toMatch(new RegExp(`\\|${t.page}$`))
        })
      })
    })
  })

  test('🔴 no ligature glyph reaches the advisor, so his questions are not read as typos', () => {
    // A PDF text layer stores "define" as d-e-ﬁ-n-e, one glyph for the fi. Left alone
    // the advisor reads "deﬁne" and "diﬀerentiate" in Mike's own questions and
    // reasonably reports them as spelling mistakes. Six spans on the Branding page.
    TEMPLATES.forEach((name) => {
      deckTables.templates[name].tables[0].rows.forEach((r) => {
        r.cells.forEach((c) => {
          expect(`${name}: ${c.text}`).not.toMatch(/[\uFB00-\uFB06]/)
        })
      })
    })
  })

  test('no answer cell is marked as a ruled line, or his worked examples stop being boxes', () => {
    // `fieldsOfTable` switches its whole reading on whether any cell is `blank`: with
    // ruled lines only the lines are boxes. These pages rule no line inside a cell, so
    // marking the empty ones blank would drop Branding from eight boxes to six — the
    // two carrying his own examples.
    TEMPLATES.forEach((name) => {
      deckTables.templates[name].tables[0].rows.forEach((r) => {
        r.cells.forEach((c) => { expect(c.blank).toBeUndefined() })
      })
    })
  })
})

describe('the five concepts reach their table on screen', () => {
  const conceptFor = template => concepts.find(c => c.captureTemplate === template)

  test('each question sheet resolves to a prompt → answer sheet with one box per question he asks', () => {
    // The count is taken from his own grid, never typed here, so a question he adds
    // moves the expectation with it.
    QUESTION_SHEETS.forEach((name) => {
      const concept = conceptFor(name)
      expect(concept).toBeDefined()

      const capture = forms.captureForConcept(concept)
      expect(capture.supplied).toBe(true)
      expect(capture.form).toBe('prompt-answer-sheet')
      expect(capture.fields).toHaveLength(deckTables.templates[name].tables[0].rows.length - 1)
    })
  })

  test('🔴 Divisional KPI\'s gives every division a box under each of his two headings', () => {
    // Six divisions x two columns. Counted off his own grid rather than typed: the row
    // count less the header, times the columns less the one holding the division name.
    // His Finance row is worked in full and is still offered as boxes — a client fills
    // in their own, and `example` is what carries his answer to the screen.
    const grid = deckTables.templates['Divisional KPIs'].tables[0]
    const capture = forms.captureForConcept(conceptFor('Divisional KPIs'))

    expect(capture.supplied).toBe(true)
    expect(capture.form).toBe('attribute-rows-entity-columns')
    expect(capture.fields).toHaveLength((grid.rows.length - 1) * (grid.columns - 1))

    // Every box says WHICH division and WHICH of his two questions it answers. A box
    // carrying one and not the other is the Customer Types fault — 181 boxes with no
    // persona on any of them — on a grid built the same way.
    capture.fields.forEach((f) => {
      expect(typeof f.rowLabel).toBe('string')
      expect(f.rowLabel).not.toBe('')
      expect(typeof f.columnLabel).toBe('string')
      expect(f.columnLabel).not.toBe('')
    })

    // His division names are the rows, in his order, each appearing once per column.
    const divisions = grid.rows.slice(1).map(r => r.cells[0].text)
    expect([...new Set(capture.fields.map(f => f.rowLabel))]).toEqual(divisions)
  })

  test('every box carries the question it answers', () => {
    TEMPLATES.forEach((name) => {
      const capture = forms.captureForConcept(conceptFor(name))
      expect(capture.fields.filter(f => !f.rowLabel)).toHaveLength(0)
    })
  })

  test('his worked answers arrive as guidance, never as the client\'s own text', () => {
    // Branding is the one of the four he part-filled: two of its eight answers carry
    // his examples, which reach the screen as the box's placeholder.
    const capture = forms.captureForConcept(conceptFor('Branding'))
    const examples = capture.fields.filter(f => f.example)
    expect(examples.length).toBeGreaterThan(0)
    examples.forEach((f) => { expect(f.value).toBeUndefined() })
  })
})
