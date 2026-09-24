/**
 * The capture tables — one per concept, whole.
 *
 * 🔴 THESE TESTS RECOMPUTE, THEY DO NOT PIN A NUMBER SOMEBODY TYPED. The lesson is
 * item 7.9's: a code header said "two collisions", every later note copied it, and
 * nobody re-derived it until it had cost a morning. So the alias list is checked by
 * resolving every concept's template, and the extracted data is checked against the
 * templates themselves — a workbook Mike edits fails the build rather than being
 * found in a session six weeks later.
 *
 * What is deliberately NOT asserted, per the testing rule: how a table looks, what
 * any label says, or that a file exists. A person in UAT sees all three instantly.
 * What UAT cannot see is a concept silently losing its table because a file was
 * renamed, or half a table going missing from the card an advisor works from.
 */

'use strict'

const forms = require('../../server/utils/strategyCaptureForms')
const { concepts } = require('../../data/strategy-frameworks.json')
const captureTables = require('../../data/strategy-capture-tables.json')

/** Concepts that name a fill-in template, whatever it resolves to. */
const withTemplate = concepts.filter(c => c.captureTemplate)

describe('the capture tables are Mike\'s own, and every concept that names one finds it', () => {
  test('every concept naming a template resolves it, or is a known gap', () => {
    const unresolved = withTemplate
      .map(c => ({ id: c.id, template: c.captureTemplate, hit: !!forms.resolveTemplate(c.captureTemplate) }))
      .filter(r => !r.hit)
      .map(r => r.id + ' -> ' + r.template)

    // The four with no workbook are the only permitted misses, and they are named
    // rather than counted so a fifth cannot hide inside a number.
    const permitted = forms.TEMPLATES_NOT_SUPPLIED
    const unexpected = unresolved.filter((line) => {
      return !permitted.some(name => line.includes('-> ' + name))
    })

    expect(unexpected).toEqual([])
  })

  test('no alias points at a template that is not there', () => {
    Object.keys(forms.TEMPLATE_ALIASES).forEach((from) => {
      const to = forms.TEMPLATE_ALIASES[from]
      expect(captureTables.templates[to]).toBeDefined()
    })
  })

  test('no alias is dead weight — each one is used by a concept', () => {
    const named = withTemplate.map(c => c.captureTemplate)
    Object.keys(forms.TEMPLATE_ALIASES).forEach((from) => {
      expect(named).toContain(from)
    })
  })
})

describe('a concept with no measured template is told so, never given a borrowed table', () => {
  test('the 32 unmeasured concepts return supplied:false with a reason', () => {
    const unmeasured = concepts.filter(c => !c.captureTemplate)
    unmeasured.forEach((c) => {
      const result = forms.captureForConcept(c)
      expect(result.supplied).toBe(false)
      expect(result.reason).toBe('no-capture-template-measured')
      expect(result.fields).toBeUndefined()
    })
  })

  test('🔴 every template a concept names resolves — from a workbook OR a deck page', () => {
    // This replaced a test asserting the opposite: that four templates were "not
    // supplied" and said so on screen. They were supplied — Branding, Customer
    // Loyalty, Pricing and Packaging keep their form on pages 34, 36, 38 and 40 of
    // the Sales & Marketing deck, facing the teaching page the app already shows, and
    // the app told advisors mid-session that his table did not exist. 29 questions.
    // Mike, 2026-09-22: "the content is right there and the forms are on the same page".
    //
    // Asserted across ALL of them rather than the four, so the next template read out
    // of a deck is covered the day it is added, and a renamed workbook fails here
    // instead of on a client's screen.
    const unresolved = withTemplate
      .map(c => (forms.resolveTemplate(c.captureTemplate) ? null : `${c.id}: ${c.captureTemplate}`))
      .filter(Boolean)

    expect(withTemplate.length).toBeGreaterThan(0)
    expect(unresolved).toEqual([])
  })
})

describe('every supplied table produces fields an advisor can actually type into', () => {
  const supplied = withTemplate
    .map(c => ({ concept: c, capture: forms.captureForConcept(c) }))
    .filter(r => r.capture.supplied)

  // 🔴 ONE FORM HAS NO FIELDS BY DESIGN, AND IT IS EXCEPTED BY NAME RATHER THAN BY
  // LOOSENING THE RULE. Mike ruled the Org Chart a mini-app on 2026-09-21: its rows are
  // people the advisor adds and removes, so there is no fixed list of boxes to enumerate.
  // Every other supplied template must still produce fields — a template that quietly
  // stopped producing any would otherwise reach an advisor as a card with nothing on it.
  const boxed = supplied.filter(r => r.capture.form !== 'parent-child-list')

  test('there is at least one, and each has fields', () => {
    expect(boxed.length).toBeGreaterThan(0)
    boxed.forEach((r) => {
      expect(r.capture.fields.length).toBeGreaterThan(0)
    })
  })

  test('the one form with no fields carries its own shape instead', () => {
    const miniApp = supplied.filter(r => r.capture.form === 'parent-child-list')
    expect(miniApp.length).toBe(1)
    miniApp.forEach((r) => {
      expect(r.capture.fields).toEqual([])
      // Without these the screen has no example to load and no heading of Mike's to put
      // over the second column, and it would render as an empty card.
      expect(r.capture.orgChart.example.length).toBeGreaterThan(0)
      expect(r.capture.orgChart.headLabel).toBeTruthy()
    })
  })

  test('field keys are unique within a concept, or a save overwrites its neighbour', () => {
    supplied.forEach((r) => {
      const keys = r.capture.fields.map(f => f.key)
      expect(new Set(keys).size).toBe(keys.length)
    })
  })

  test('no table is so large it is a spreadsheet rather than a form', () => {
    // The Org Chart workbook's second sheet is its first transposed into a chart
    // layout. Read as a form it produced 1,126 fields nobody types into, and this
    // is what catches the next one rather than a person noticing on screen.
    const oversized = supplied
      .filter(r => r.capture.fields.length > 400)
      .map(r => r.concept.id + ': ' + r.capture.fields.length)
    expect(oversized).toEqual([])
  })
})

// 🔴 MIKE'S RULING, 2026-09-21: "each concept … are only listed once. they appear as an
// option and get selected in scope, sorted into the correct order in build session … appear
// ONCE in the run session and ONCE in the produce plan."
//
// This file used to hold four tests asserting the OPPOSITE — that Porter's table split into
// an observation part and a response part so the concept could be worked twice. The split
// and the function behind it are deleted. These guards catch it coming back, which matters
// because it was subtle: it produced a second card that looked like a duplicate to remove.
describe('a concept is captured ONCE, with its whole table', () => {
  const everySupplied = withTemplate
    .map(c => ({ concept: c, capture: forms.captureForConcept(c) }))
    .filter(r => r.capture.supplied)

  test('no capture carries a parts split any more', () => {
    expect(everySupplied.length).toBeGreaterThan(0)
    everySupplied.forEach((r) => {
      expect(r.capture.parts).toBeUndefined()
    })
  })

  test('the module no longer exposes a way to split a table into visits', () => {
    expect(forms.partsOfFields).toBeUndefined()
  })

  test("Porter's table comes back whole, observations and responses together", () => {
    const porters = concepts.find(c => c.id === 'porters-5-forces')
    const capture = forms.captureForConcept(porters)

    expect(capture.supplied).toBe(true)
    // Both kinds of column are present in the ONE set of fields the advisor now sees.
    // This string is pinned deliberately: it is the column heading on Mike's own Porter's
    // table, and its presence here is what proves the response columns were not dropped
    // along with the split that used to separate them.
    const labels = capture.fields.map(f => f.columnLabel)
    expect(labels).toContain('How We Plan To Respond')
    expect(labels.some(l => l && l !== 'How We Plan To Respond')).toBe(true)
  })
})

// 🔴 EVERY COLUMN NAME WAS BEING DROPPED, AND THE SUITE WAS GREEN THROUGHOUT.
// Measured against Mike's own documents on 2026-09-21: Customer Types offered 181 boxes
// with NOT ONE persona name on any of them and 99 carrying no label at all, and
// Operational Objectives offered 25 with no stage on any. The cause was one rule —
// a row containing a ruled line was never read as column headings — and his header rows
// open with an empty corner cell. UAT cannot catch this: a wall of unlabelled boxes looks
// like a form to anyone who has not counted his page.
//
// These recompute from the workbook rather than pinning a typed number, as the rest of
// this file does: the expectation moves when a template Mike edits moves.
describe('a column that Mike named reaches the box beneath it', () => {
  const captureOf = id => forms.captureForConcept(concepts.find(c => c.id === id))

  /** The column headings his document carries, read from the grid itself. */
  const headingsIn = (templateName) => {
    const tpl = forms.resolveTemplate(templateName)
    const out = []
    tpl.tables.forEach((t) => {
      const first = t.rows[0]
      const lead = first.cells.findIndex(c => c.text && !c.blank)
      if (lead < 1) { return }
      first.cells.slice(lead).forEach((c) => {
        if (c.text && !c.blank && !out.includes(c.text)) { out.push(c.text) }
      })
    })
    return out
  }

  test('Customer Types: every box carries a persona, and every persona he named is on screen', () => {
    const capture = captureOf('customer-persona-type-table')
    expect(capture.supplied).toBe(true)

    const unlabelled = capture.fields.filter(f => !f.columnLabel)
    expect(unlabelled).toHaveLength(0)

    const onScreen = [...new Set(capture.fields.map(f => f.columnLabel))].sort()
    expect(onScreen).toEqual(headingsIn('Customer Types').sort())
  })

  test('Customer Types: every box carries the attribute it belongs to, including his continuation lines', () => {
    // A named row opens an attribute and the unnamed rows beneath it are its remaining
    // lines — four under "3 Key Concerns/ Common Problems". Read without carrying the
    // name down, those lines stood under nothing.
    const capture = captureOf('customer-persona-type-table')
    expect(capture.fields.filter(f => !f.rowLabel)).toHaveLength(0)
  })

  test('Customer Types: his worked column arrives in the boxes rather than being dropped', () => {
    // Mike's ruling, 2026-09-21: the example column is the advisor's first persona,
    // prefilled and typed over. Before this it was read as neither label nor box, so the
    // one thing showing what an answer looks like never reached the screen at all.
    const capture = captureOf('customer-persona-type-table')
    const prefilled = capture.fields.filter(f => f.prefilled)
    expect(prefilled.length).toBeGreaterThan(0)
    // They are all in ONE column — his, not spread across the advisor's blank ones.
    expect(new Set(prefilled.map(f => f.column)).size).toBe(1)
  })

  test('Operational Objectives: his three stages reach the screen', () => {
    const capture = captureOf('develop-cascaded-operational-objectives')
    const labels = capture.fields.map(f => f.columnLabel)
    headingsIn('Operational Objectives List').forEach((h) => {
      expect(labels).toContain(h)
    })
  })

  test('Operational Objectives: the column he left unheaded stays unheaded', () => {
    // His sheet heads three of four columns; the advisor names each objective in the
    // first. Nothing writes a heading for it — see the drawing's decision B.
    const capture = captureOf('develop-cascaded-operational-objectives')
    expect(capture.fields.some(f => !f.columnLabel)).toBe(true)
  })

  test('the banded grid is untouched — a heading beside a ruled line is still content', () => {
    // The rule that reads his corner cells must not undo the 2026-09-19 fix, which is
    // the opposite case: Blue Ocean's "1, Enter your thoughts here…" sits beside a ruled
    // line and is his placeholder, not a heading. Counted from his workbook.
    const ruledLines = name => forms.resolveTemplate(name).tables
      .reduce((n, t) => n + t.rows.reduce((m, r) => m + r.cells.filter(c => c.blank).length, 0), 0)

    expect(captureOf('blue-ocean-strategy').fields.length).toBe(ruledLines('Blue Ocean Fronts'))
    expect(captureOf('porters-5-forces').fields.length).toBe(ruledLines("Porter's 5 Forces"))
    expect(captureOf('the-8-profit-levers').fields.length).toBe(ruledLines('Profit Levers (1)'))
  })

  test('a table authored two-dimensional but written as one question and one answer is left alone', () => {
    // Customer & Skills Review carries `attribute-rows-entity-columns` and is nothing of
    // the kind — "Review Section | Review Findings", no corner cell. Read as a matrix it
    // offered 54 boxes where his document asks 24, which is why the form name alone does
    // not decide: the grid has to agree with it.
    const capture = captureOf('assess-current-position-by-reviewing-pre-meeting-data-sectio')
    expect(capture.fields.some(f => f.prefilled)).toBe(false)
  })

  test('🔴 his blank spacer rows are a gap, not six questions he never asked', () => {
    // The 2026-09-19 rule, not a new one: the screen offers exactly the boxes his
    // document rules. He puts a blank row between each customer segment; read as lines
    // they offered SIX boxes more than his sheet asks, under no heading at all.
    //
    // Counted from his workbook rather than typed here, so a segment he adds moves the
    // expectation with it.
    const tpl = forms.resolveTemplate('Customer & Skills Review')
    const questions = tpl.tables.reduce((n, t) => n + t.rows.filter(
      (r, i) => i > 0 && r.cells[0].text && !r.cells[0].blank).length, 0)

    const capture = captureOf('assess-current-position-by-reviewing-pre-meeting-data-sectio')
    expect(capture.fields).toHaveLength(questions)
    expect(capture.fields.every(f => f.columnLabel)).toBe(true)
  })

  test('a blank row everywhere else is still a line — the wide version of that rule was measured', () => {
    // Dropping every empty row takes 32 boxes off Porter's, 28 off the Profit Levers and
    // 14 off Blue Ocean. Those counts are the reason the gap rule is narrow, and this is
    // what catches a later session widening it.
    const ruled = name => forms.resolveTemplate(name).tables
      .reduce((n, t) => n + t.rows.reduce((m, r) => m + r.cells.filter(c => c.blank).length, 0), 0)

    expect(captureOf('porters-5-forces').fields.length).toBe(ruled("Porter's 5 Forces"))
    expect(captureOf('the-8-profit-levers').fields.length).toBe(ruled('Profit Levers (1)'))
    expect(captureOf('blue-ocean-strategy').fields.length).toBe(ruled('Blue Ocean Fronts'))
  })
})

describe('the extracted file is what the templates say', () => {
  test('re-reading the templates reproduces the committed data exactly', () => {
    // Not a file-exists check: it re-parses every .docx, .xlsx and .pptx and compares
    // the result. A template Mike edits, or an extractor change that quietly alters a
    // label, fails here. UAT cannot catch this — the screen looks fine either way.
    const { build } = require('../../scripts/read-capture-tables')
    expect(build()).toEqual(
      JSON.parse(JSON.stringify(captureTables))
    )
  })
})

describe('a ruled line is a box, and a heading is never one', () => {
  // 🔴 BOTH OF THESE WERE WRONG ON SCREEN UNTIL 2026-09-19, AND THE SUITE WAS GREEN.
  // They are recomputed from the workbook, never pinned to a number typed here: the
  // count comes from counting Mike's own blank cells, so a template he edits moves the
  // expectation with it. UAT cannot catch either — a form with one box missing, or one
  // box too many, looks perfectly reasonable to anybody who has not counted his page.

  /** Every cell Mike ruled as a blank line, across a template's grids. */
  const ruledLinesIn = (templateName) => {
    const tpl = forms.resolveTemplate(templateName)
    return tpl.tables.reduce(
      (n, t) => n + t.rows.reduce((m, r) => m + r.cells.filter(c => c.blank).length, 0), 0)
  }

  const captureOf = id => forms.captureForConcept(concepts.find(c => c.id === id))

  test('Blue Ocean offers a box for every line Mike ruled — a heading beside a line lost one', () => {
    // His row 1 is "1, Enter your thoughts here…" beside a ruled line. Read as a
    // heading row, the whole row was skipped and the line went with it.
    const capture = captureOf('blue-ocean-strategy')
    expect(capture.fields.length).toBe(ruledLinesIn('Blue Ocean Fronts'))
  })

  test('Blue Ocean keeps Mike\'s first heading, which his placeholder had displaced', () => {
    // The heading is load-bearing: it is the question the client answers, and with it
    // gone the first four boxes stood under his placeholder text instead.
    const capture = captureOf('blue-ocean-strategy')
    const headings = capture.fields.map(f => f.columnLabel)
    expect(headings).toContain('What Are Our ‘Red Water’ Competition Fronts?')
    expect(headings.join(' ')).not.toContain('Enter your thoughts here')
  })

  test('the Profit Levers offers no box that is one of Mike\'s column names', () => {
    // His "Our (7) Aims | Task" sits in a one-row table of its own above the grid.
    // Read as a prompt sheet, "Task" became somewhere to type.
    const capture = captureOf('the-8-profit-levers')
    expect(capture.fields.length).toBe(ruledLinesIn('Profit Levers (1)'))
  })

  test('every banded-grid concept offers exactly the lines its workbook rules', () => {
    // The general form of all three above: across every concept whose capture form is
    // the banded grid, the boxes on screen are the blank cells in Mike's document.
    const banded = concepts.filter(c => c.captureForm === 'banded-grid' && c.captureTemplate)
    expect(banded.length).toBeGreaterThan(0)
    const wrong = banded
      .map((c) => {
        const capture = forms.captureForConcept(c)
        if (!capture.supplied) { return null }
        const want = ruledLinesIn(c.captureTemplate)
        return capture.fields.length === want
          ? null
          : `${c.id}: ${capture.fields.length} boxes, workbook rules ${want} lines`
      })
      .filter(Boolean)
    expect(wrong).toEqual([])
  })

  test('a template Mike has WORKED THROUGH offers no box that is one of his headings', () => {
    // 🔴 THE ONE CASE THE RULE ABOVE DID NOT COVER, AND THE SUITE WAS GREEN THROUGHOUT.
    // A heading used to be skipped only where the table carried ruled lines — so in the
    // templates he has filled his own example into, where NO cell is blank and there are
    // no ruled lines at all, the heading fell through and became somewhere to type. 6
    // Marketing Questions offered 7 boxes and 10 Marketing Messages offered 11, the extra
    // one asking an advisor to answer the words "The Question" with his opposite heading
    // shown beneath it as the worked example.
    //
    // Recomputed from his workbook like the rest of this block: in a worked-through grid
    // the first row is the headings and every row under it is one answer per answering
    // column, so a template he edits moves the expectation with it. UAT cannot catch this
    // — seven boxes on a six-question sheet looks entirely reasonable to anyone who has
    // not counted his page.
    // Every table of the template, so the count below can be the whole concept's boxes.
    // A template mixing worked-through and ruled grids would need its fields split by
    // table; none does, and this says so rather than assuming it.
    const workedThrough = tpl => tpl.tables.length > 0 &&
      tpl.tables.every(t => t.rows.length > 1 && !t.rows.some(r => r.cells.some(c => c.blank)))

    // 🔴 "ONE ANSWER PER ANSWERING COLUMN" IS `columns - 1` ONLY WHERE HIS FIRST COLUMN
    // IS THE PROMPT — which is the prompt → answer sheet, and was every worked-through
    // template until 2026-09-22. On the named-field stack row 0 names EVERY column and
    // every one of them answers, so his Strategic Statements slide asks for two. Left as
    // `columns - 1` this test asserted the very defect the form was built to remove: it
    // was green while his Strategic Objective statement had nowhere on the screen to go.
    const answeringColumns = (c, t) =>
      c.captureForm === forms.NAMED_FIELD_STACK ? t.columns : t.columns - 1

    const checked = []
    const wrong = concepts
      // The small comparison grid is worked through too, but its first column is an
      // answer, not a prompt — it has its own test, below.
      .filter(c => c.captureTemplate && c.captureForm && c.captureForm !== forms.SMALL_COMPARISON_GRID)
      .map((c) => {
        const capture = forms.captureForConcept(c)
        if (!capture.supplied || !capture.fields) { return null }
        const tpl = forms.resolveTemplate(c.captureTemplate)
        if (!workedThrough(tpl)) { return null }
        checked.push(c.id)
        const want = tpl.tables.reduce(
          (n, t) => n + (t.rows.length - 1) * answeringColumns(c, t), 0)
        return capture.fields.length === want
          ? null
          : `${c.id}: ${capture.fields.length} boxes, his rows ask ${want}`
      })
      .filter(Boolean)

    // Without this the test passes by checking nothing the day a template is renamed.
    expect(checked.length).toBeGreaterThan(0)
    expect(wrong).toEqual([])
  })

  test('🔴 the small comparison grid puts every word of his worked table in exactly one box', () => {
    // Curve & Cycle Notes is worked through top to bottom, so there is no blank cell to
    // say where the boxes are. Read as a question sheet, his whole Diffusion Curve column
    // became questions: 3 boxes where the page asks 4. So the check is that NOTHING he
    // wrote is lost or used twice — each cell below the headings is a box's label, its
    // example, or both halves of `Name: example` — and both his columns are present.
    const users = concepts.filter(c => c.captureForm === forms.SMALL_COMPARISON_GRID)
    expect(users.length).toBeGreaterThan(0)
    users.forEach((c) => {
      const table = forms.resolveTemplate(c.captureTemplate).tables[0]
      const fields = forms.captureForConcept(c).fields
      const written = []
      table.rows.slice(1).forEach(r => r.cells.forEach((cell) => { if (cell.text) { written.push(cell.text) } }))
      const carried = []
      fields.forEach((f) => {
        const whole = `${f.rowLabel}: ${f.example}`
        if (written.includes(whole)) { carried.push(whole) } else { carried.push(f.rowLabel, f.example) }
      })
      expect(carried.sort()).toEqual(written.sort())
      expect(new Set(fields.map(f => f.columnLabel)).size).toBe(table.columns)
    })
  })

  test('🔴 a WORKED EXAMPLE under a heading is never read as the heading', () => {
    // Insights Summary bands as `headings -> his worked answer in prose -> ruled lines`,
    // twice. Judged on "words, then ruled lines" alone the EXAMPLE matches and the
    // HEADING does not, so every box was headed with his example sentence and neither
    // `What We Do LESS Well` nor `What Resources We Need` reached a screen at all.
    // Porter's and Blue Ocean have no example row between, which is why it showed here
    // first and on nothing else. Found 2026-09-23.
    //
    // Every expectation is READ OFF HIS TABLE, never typed: the headings are whichever
    // rows sit above his ruled lines, so editing the template moves the test with it.
    const tpl = forms.resolveTemplate('Insights Summary')
    const rows = tpl.tables[0].rows
    const capture = captureOf('review-internal-insights-data')

    // His band headings: a row of words that OPENS a band — the table's first row, or
    // the row after the previous band's ruled lines. That is what separates a heading
    // from the worked example directly beneath it, which is words above lines as well.
    const headingRows = rows.filter((r, i) => {
      const words = r.cells.every(c => c.text && !c.blank)
      const opensBand = i === 0 || rows[i - 1].cells.every(c => c.blank)
      return words && opensBand
    })
    const headings = new Set()
    headingRows.forEach(r => r.cells.forEach(c => headings.add(c.text)))

    // Two bands of two columns each, so four distinct headings and nothing else.
    expect(headings.size).toBe(4)
    expect(new Set(capture.fields.map(f => f.columnLabel))).toEqual(headings)

    // And his worked answers are not offered as boxes to type over.
    const examples = rows
      .filter(r => r.cells.every(c => c.text && !c.blank))
      .flatMap(r => r.cells.map(c => c.text))
      .filter(t => !headings.has(t))
    expect(examples.length).toBeGreaterThan(0)
    examples.forEach((text) => {
      expect(capture.fields.map(f => f.columnLabel)).not.toContain(text)
    })
  })
})

describe('the parallel prompt pair — two independent lists, not rows of one table', () => {
  // 🔴 CAPTURE FORM 6 OF 9, from design/mockups/strategy-capture-parallel-prompt-pair.html,
  // ruled by Mike on 2026-09-22. THE WORST OF THE FORMS MEASURED: his page asks 9 questions
  // and the screen offered 15 BOXES, one of them put to the client seven times, while 3 of
  // his questions reached no screen at all. Both concepts on this form were affected and the
  // suite was green throughout.
  //
  // Recomputed from his document like the rest of this file.

  const TEMPLATE = 'Product Fit (Customer Orientation)'
  const stackConcepts = concepts.filter(c => c.captureForm === forms.PARALLEL_PROMPT_PAIR)
  const captureOf = c => forms.captureForConcept(c)
  const tableOf = () => forms.resolveTemplate(TEMPLATE).tables[0]

  /** His questions in one column: a cell with words below row 0. */
  const questionsIn = (column) => {
    const t = tableOf()
    return t.rows
      .filter((r, i) => i > 0 && r.cells[column] && r.cells[column].text && !r.cells[column].blank)
      .map(r => r.cells[column].text)
  }
  const allQuestions = () => tableOf().rows[0].cells
    .map((_, c) => questionsIn(c)).reduce((a, b) => a.concat(b), [])

  test('both concepts are on this form, and both read the same page of his', () => {
    // Without this the block passes by checking nothing the day a concept is re-authored.
    expect(stackConcepts.length).toBe(2)
    stackConcepts.forEach((c) => { expect(c.captureTemplate).toBe(TEMPLATE) })
  })

  test('a box for every question his page asks, and not one more', () => {
    // 🔴 15 BOXES FOR 9 QUESTIONS. The left column's questions run out at row 6 and every
    // blank cell beneath was read as a line to write on.
    stackConcepts.forEach((c) => {
      expect(captureOf(c).fields).toHaveLength(allQuestions().length)
    })
  })

  test('every question he asks is on the screen, in his order', () => {
    // 🔴 THREE OF HIS QUESTIONS REACHED NO SCREEN. A row where one cell is blank and the
    // other carries words is never a label row, so from row 7 down his right-hand questions
    // were read as content — not a heading, not a box. This asserts the whole list rather
    // than a count, because a count alone passes with the wrong questions in it.
    stackConcepts.forEach((c) => {
      expect(captureOf(c).fields.map(f => f.rowLabel)).toEqual(allQuestions())
    })
  })

  test('no question is asked twice', () => {
    // One question was put to the client SEVEN times, another four, because each phantom box
    // carried the most recent heading the reader had seen.
    stackConcepts.forEach((c) => {
      const asked = captureOf(c).fields.map(f => f.rowLabel)
      expect(new Set(asked).size).toBe(asked.length)
    })
  })

  test('🔴 his two tables survive as two groups — Mike\'s ruling of 2026-09-22', () => {
    // "it might be easier to split the tables into 2 - 1- customer orientation and
    // 2-competitor comparison." Every box carries its own table's heading, and there are
    // exactly as many groups as his page has headed columns — read from row 0, not typed.
    const headings = tableOf().rows[0].cells
      .filter(c => c.text && !c.blank).map(c => c.text)
    stackConcepts.forEach((c) => {
      const groups = captureOf(c).fields.map(f => f.columnLabel)
      expect([...new Set(groups)]).toEqual(headings)
      expect(groups.every(Boolean)).toBe(true)
    })
  })

  test('each of his lists keeps its own length — they are not padded to match', () => {
    // The two lists are different lengths and that is the point: reading them as rows of one
    // table is what invented six boxes. Counted per column from his document.
    stackConcepts.forEach((c) => {
      const fields = captureOf(c).fields
      tableOf().rows[0].cells.forEach((head, col) => {
        if (!head.text || head.blank) { return }
        expect(fields.filter(f => f.columnLabel === head.text)).toHaveLength(questionsIn(col).length)
      })
    })
  })

  test('a box never lands on one of his question cells', () => {
    // His question is the label; the blank line beneath it in the same column is the box.
    // A key pointing at a cell that carries words would save the client's answer on top of
    // his question's position and read back as though he had never asked it.
    const t = tableOf()
    stackConcepts.forEach((c) => {
      captureOf(c).fields.forEach((f) => {
        const cell = t.rows[f.row] && t.rows[f.row].cells[f.column]
        expect(cell && !!cell.blank).toBe(true)
      })
    })
  })
})

describe('the named-field stack — his name, his worked example, one box', () => {
  // 🔴 CAPTURE FORM 5 OF 9, from design/mockups/strategy-capture-named-field-stack.html,
  // all three decisions ruled by Mike on 2026-09-22. Both faults below were live on a
  // screen an advisor runs in front of a client, and the suite was green throughout —
  // because nothing had ever counted these two tables against his own documents.
  //
  // Recomputed from his workbook like the rest of this file, never pinned to a number
  // typed here: a document he edits moves the expectation with it.

  const captureOf = id => forms.captureForConcept(concepts.find(c => c.id === id))
  const stackConcepts = concepts.filter(c => c.captureForm === forms.NAMED_FIELD_STACK)

  /** His own field names, read off the template rather than listed here. */
  const namesAcross = tpl => tpl.tables[0].rows[0].cells
    .filter(c => c.text && !c.blank).map(c => c.text)
  const namesDown = tpl => tpl.tables[0].rows
    .filter(r => r.cells[0] && r.cells[0].text && !r.cells[0].blank)
    .map(r => r.cells[0].text)

  test('both of his templates are on this form, and nothing else is', () => {
    // Without this the whole block passes by checking nothing the day a concept is
    // re-authored onto another form.
    expect(stackConcepts.map(c => c.captureTemplate).sort())
      .toEqual(['Productive Habits', 'Strategic Statements'])
  })

  test('Strategic Statements offers a box for every statement his slide asks for', () => {
    // 🔴 IT OFFERED ONE WHERE HIS SLIDE GIVES TWO. His row 0 heads both columns —
    // Strategic Objective and Strategy — and the general reading treats column 0 of a
    // table with no ruled lines as the PROMPT column, which is true of the six prompt →
    // answer sheets and false here. His Strategic Objective statement had nowhere to go.
    const tpl = forms.resolveTemplate('Strategic Statements')
    const capture = captureOf('determine-the-business-strategic-objective-and-document-the')
    expect(capture.fields).toHaveLength(namesAcross(tpl).length)
  })

  test('each of his two headings reaches the box beneath it, and neither is lost', () => {
    // The count alone would pass with both boxes under one heading. His headings are the
    // question the client answers, so a box under the wrong one is the wrong statement.
    const tpl = forms.resolveTemplate('Strategic Statements')
    const capture = captureOf('determine-the-business-strategic-objective-and-document-the')
    expect(capture.fields.map(f => f.columnLabel)).toEqual(namesAcross(tpl))
  })

  test('Productive Habits offers one box per named field, his last one included', () => {
    // 🔴 IT OFFERED EIGHT FOR FIVE FIELDS — two per field, one of them inside the dark
    // band his document prints the field NAMES in — and dropped Plan entirely, because
    // his table simply ends after it with no blank row beneath.
    const tpl = forms.resolveTemplate('Productive Habits')
    const capture = captureOf('understanding-our-habit-drivers')
    expect(capture.fields.map(f => f.columnLabel)).toEqual(namesDown(tpl))
  })

  test('🔴 his LAST field gets a box, and that box is Mike\'s ruling not his document', () => {
    // Mike's ruling, 2026-09-22. This is the one box on this form that his grid does not
    // itself rule: keying each box to the blank line BENEATH its name would have been a
    // faithful reading of the document and would have silently dropped the one field the
    // session exists to produce. The assertion is here so that stays a decision somebody
    // made rather than something a later reading quietly undoes.
    const tpl = forms.resolveTemplate('Productive Habits')
    const rows = tpl.tables[0].rows
    const last = rows.length - 1

    // His document really does end on a named row with no line under it — proved here
    // rather than asserted, so this test says something true if he edits the file.
    expect(rows[last].cells[0].text).toBeTruthy()
    expect(rows[last].cells.some(c => c.blank)).toBe(false)

    const capture = captureOf('understanding-our-habit-drivers')
    expect(capture.fields.map(f => f.columnLabel)).toContain(rows[last].cells[0].text)
  })

  test('no box sits in the column his document prints the field names in', () => {
    // The dark #434343 band down his first column is printed wording, not a writing
    // area. Four of the eight boxes were in it.
    const capture = captureOf('understanding-our-habit-drivers')
    expect(capture.fields.every(f => f.column > 0)).toBe(true)
  })

  test('no box is headed by one of his worked-example sentences', () => {
    // The second half of the same fault: his example sentence became a column NAME over
    // the box beside it, so the client read "We're becoming more competitive…" as the
    // heading of a field. An example belongs inside its own box as guide text —
    // Mike's ruling on Decision 2, 2026-09-22.
    stackConcepts.forEach((c) => {
      const capture = forms.captureForConcept(c)
      const examples = capture.fields.map(f => f.example).filter(Boolean)
      capture.fields.forEach((f) => {
        expect(examples).not.toContain(f.columnLabel)
      })
    })
  })

  test('every box carries one of his own field names — none is unlabelled', () => {
    // Both his documents name every field, so unlike the banded grid there is never a
    // box here without a heading. A box with no name is a client asked to write
    // something with nothing saying what.
    stackConcepts.forEach((c) => {
      const capture = forms.captureForConcept(c)
      expect(capture.fields.length).toBeGreaterThan(0)
      expect(capture.fields.every(f => !!f.columnLabel)).toBe(true)
    })
  })

  test('⚠ the form is defined for two-column tables, and a third would be dropped', () => {
    // Both of his are two columns. The reading takes his name from column 0 and the box
    // from column 1, so a third column would vanish with nothing on screen to show it.
    // This fails the build rather than letting that happen quietly.
    stackConcepts.forEach((c) => {
      const tpl = forms.resolveTemplate(c.captureTemplate)
      tpl.tables.forEach((t) => {
        expect(t.columns).toBe(2)
      })
    })
  })

  test('the prompt → answer sheets are untouched — his questions never became boxes', () => {
    // The regression this form could have caused. Six of his sheets are structurally
    // IDENTICAL to Strategic Statements — two columns, headings on row 0, no blank cells
    // — and in every one the first column holds his QUESTIONS. That is why the form is
    // read by name and not guessed from the grid.
    //
    // Leadership Review is excluded by its own shape, not by name: his is a ONE-column
    // table of question, line, question, so its boxes are correctly in column 0.
    const sheets = concepts.filter(c => c.captureForm === 'prompt-answer-sheet' && c.captureTemplate)
    expect(sheets.length).toBeGreaterThan(0)
    const wrong = sheets
      .map((c) => {
        const capture = forms.captureForConcept(c)
        if (!capture.supplied) { return null }
        const tpl = forms.resolveTemplate(c.captureTemplate)
        if (tpl.tables.every(t => t.columns < 2)) { return null }
        const inPromptColumn = capture.fields.filter(f => f.column === 0).length
        return inPromptColumn === 0 ? null : `${c.captureTemplate}: ${inPromptColumn} boxes on his questions`
      })
      .filter(Boolean)
    expect(wrong).toEqual([])
  })
})
