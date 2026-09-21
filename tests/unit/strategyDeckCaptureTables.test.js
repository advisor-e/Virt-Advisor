/**
 * The four capture tables that live on a DECK PAGE, not in a workbook.
 *
 * 🔴 WHY THIS FILE CANNOT DO WHAT ITS WORKBOOK EQUIVALENT DOES.
 * `strategyCaptureForms.test.js` re-parses every .docx and .xlsx and compares the
 * result to the committed data, because those workbooks are in the repository. These
 * four come out of a PDF deck that sits OUTSIDE it — `C:\Documents\Visual Code
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

describe('the four forms on his deck pages are read, not declared missing', () => {
  test('every page the reader is told to read has a committed table', () => {
    expect(reader.PAGES.length).toBeGreaterThan(0)
    reader.PAGES.forEach((p) => {
      const t = deckTables.templates[p.template]
      expect(t).toBeDefined()
      expect(t.deck).toBe(p.deck)
      expect(t.page).toBe(p.page)
    })
  })

  test('each is one two-column grid — his question beside the client\'s answer', () => {
    TEMPLATES.forEach((name) => {
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
    TEMPLATES.forEach((name) => {
      const t = deckTables.templates[name]
      t.tables[0].rows.slice(1).forEach((r) => {
        expect(`${name}|${r.cells[1].text}`).not.toMatch(new RegExp(`\\|${t.page}$`))
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

describe('the four concepts reach their table on screen', () => {
  const conceptFor = template => concepts.find(c => c.captureTemplate === template)

  test('each resolves to a prompt → answer sheet with one box per question he asks', () => {
    // The count is taken from his own grid, never typed here, so a question he adds
    // moves the expectation with it.
    TEMPLATES.forEach((name) => {
      const concept = conceptFor(name)
      expect(concept).toBeDefined()

      const capture = forms.captureForConcept(concept)
      expect(capture.supplied).toBe(true)
      expect(capture.form).toBe('prompt-answer-sheet')
      expect(capture.fields).toHaveLength(deckTables.templates[name].tables[0].rows.length - 1)
    })
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
