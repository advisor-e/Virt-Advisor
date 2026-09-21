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

  test('a concept whose workbook was never supplied says which one', () => {
    const missing = withTemplate.filter(c => forms.TEMPLATES_NOT_SUPPLIED.includes(c.captureTemplate))
    expect(missing.length).toBeGreaterThan(0)
    missing.forEach((c) => {
      const result = forms.captureForConcept(c)
      expect(result.supplied).toBe(false)
      expect(result.reason).toBe('template-not-supplied')
      expect(result.template).toBe(c.captureTemplate)
    })
  })
})

describe('every supplied table produces fields an advisor can actually type into', () => {
  const supplied = withTemplate
    .map(c => ({ concept: c, capture: forms.captureForConcept(c) }))
    .filter(r => r.capture.supplied)

  test('there is at least one, and each has fields', () => {
    expect(supplied.length).toBeGreaterThan(0)
    supplied.forEach((r) => {
      expect(r.capture.fields.length).toBeGreaterThan(0)
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
})
