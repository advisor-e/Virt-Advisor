/**
 * The capture tables that live on a DECK PAGE, not in a workbook.
 *
 * 🔴 THEY ARE THREE SHAPES, AND EVERY ASSERTION SAYS WHICH. The question sheets are
 * "<X> Considerations | Your <X> Ideas", two columns of question → answer. The
 * named-row grids name their rows down the side — Divisional KPI's' six divisions, the
 * Story-Board's cost tiers. The LINE GRIDS (item 15.16, 2026-09-24) are ruled writing
 * lines under column headings, the shape his workbooks call a banded grid. A rule
 * applied to the wrong shape is how a form gets read as the half it is not (Brief §0,
 * forms 5 and 6) — and it is exactly what happened to the line grids before they were
 * declared: Deming's "Common Cause" column lost all six of its lines.
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
const QUESTION_SHEETS = ['Branding', 'Customer Loyalty', 'Pricing', 'Packaging',
  'Sparketing Thoughts', 'Sales Distribution (Channel) Options']

/** The named-row grids. Their own shape is asserted in their own tests, below. */
const NAMED_ROW_GRIDS = ['Divisional KPIs', 'Engagement Story-Board']

/** The grids of ruled writing lines — the ones the reader is told are `grid`. */
const LINE_GRIDS = ['Vertical/ & Horizontal Integration Tasks', 'Revenue Streams',
  'Volatility Graph Observations', 'A.I.D.C.R.A Advertisement', 'Outbound Communication Plan',
  'Price For Problem Solving', 'Price For Delivery Medium']

/** The two shapes read as words beside answers, where no cell is a ruled line. */
const WORD_SHAPES = [...QUESTION_SHEETS, ...NAMED_ROW_GRIDS]

/**
 * A card of TWO forms, each part naming its own — item 15.28. Its shape is asserted in its
 * own test below, because neither of the three shapes' rules fits the whole of it.
 */
const PART_CARDS = ['Alignment Statements']

/** The pages a reader entry reads, in order, whichever way the entry names them. */
const pagesOf = p => (p.parts ? p.parts.map(part => part.page) : (p.pages || [p.page]))

describe('the forms on his deck pages are read, not declared missing', () => {
  test('every deck-page template is accounted for by one of the three shapes, or is a card of parts', () => {
    // Without this, another template could be added and every shape assertion below
    // would simply skip it — passing while guarding nothing.
    expect([...WORD_SHAPES, ...LINE_GRIDS, ...PART_CARDS].sort()).toEqual([...TEMPLATES].sort())
  })

  test('the reader is told which pages are line grids, and it is exactly these', () => {
    // The declaration is the only thing standing between a line grid and being read as
    // a question sheet, so the list here and the reader's must agree.
    expect(reader.PAGES.filter(p => p.grid).map(p => p.template).sort()).toEqual([...LINE_GRIDS].sort())
  })

  test('every page the reader is told to read has a committed table', () => {
    expect(reader.PAGES.length).toBeGreaterThan(0)
    reader.PAGES.forEach((p) => {
      const t = deckTables.templates[p.template]
      expect(t).toBeDefined()
      expect(t.deck).toBe(p.deck)
      expect(t.page).toBe(pagesOf(p)[0])
      expect(t.tables).toHaveLength(pagesOf(p).length)
    })
  })

  test('🔴 Alignment Statements is five named statements, then his three-by-three table — item 15.28', () => {
    // Read as ONE form, either the statements flowed four across or the table became a
    // stack. Each part names its own, and the gaps between his statement bands are marked
    // blank so the stack reads names DOWN the first column and never offers a gap as a box.
    const [stack, table] = deckTables.templates['Alignment Statements'].tables
    expect(stack.form).toBe('named-field-stack')
    expect(stack.columns).toBe(2)
    const named = stack.rows.filter(r => r.cells[0].text && !r.cells[0].blank)
    expect(named).toHaveLength(5)
    stack.rows.filter(r => !named.includes(r)).forEach((r) => {
      expect(r.cells.every(c => c.blank && !c.text)).toBe(true)
    })

    // p9's worked example, read as p10's empty table: a header and three rows of lines.
    expect(table.form).toBeUndefined()
    expect(table.columns).toBe(3)
    expect(table.rows).toHaveLength(4)
    table.rows.slice(1).forEach(r => expect(r.cells.every(c => c.blank)).toBe(true))
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
    WORD_SHAPES.forEach((name) => {
      deckTables.templates[name].tables.forEach((table) => {
        const rows = table.rows
        expect(rows[0].cells[0].text).not.toBe('')
        expect(rows[0].cells[1].text).not.toBe('')
        rows.slice(1).forEach((r, i) => {
          expect(`${name} row ${i + 1}: ${r.cells[0].text}`).not.toMatch(/: $/)
        })
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
      t.tables.forEach(table => table.rows.slice(1).forEach((r) => {
        r.cells.forEach((c) => {
          expect(`${name}|${c.text}`).not.toMatch(new RegExp(`\\|${t.page}$`))
        })
      }))
    })
  })

  test('🔴 no ligature glyph reaches the advisor, so his questions are not read as typos', () => {
    // A PDF text layer stores "define" as d-e-ﬁ-n-e, one glyph for the fi. Left alone
    // the advisor reads "deﬁne" and "diﬀerentiate" in Mike's own questions and
    // reasonably reports them as spelling mistakes. Six spans on the Branding page.
    TEMPLATES.forEach((name) => {
      deckTables.templates[name].tables.forEach(table => table.rows.forEach((r) => {
        r.cells.forEach((c) => {
          expect(`${name}: ${c.text}`).not.toMatch(/[\uFB00-\uFB06]/)
        })
      }))
    })
  })

  test('no answer cell on a question sheet or named-row grid is marked as a ruled line', () => {
    // `fieldsOfTable` switches its whole reading on whether any cell is `blank`: with
    // ruled lines only the lines are boxes. These pages rule no line inside a cell, so
    // marking the empty ones blank would drop Branding from eight boxes to six — the
    // two carrying his own examples.
    WORD_SHAPES.forEach((name) => {
      deckTables.templates[name].tables.forEach(table => table.rows.forEach((r) => {
        r.cells.forEach((c) => { expect(c.blank).toBeUndefined() })
      }))
    })
  })
})

describe('the line grids keep every line he drew', () => {
  const conceptsFor = template => concepts.filter(c => c.captureTemplate === template)

  test('every line grid is reached by at least one concept', () => {
    LINE_GRIDS.forEach((name) => { expect(`${name}: ${conceptsFor(name).length}`).not.toMatch(/: 0$/) })
  })

  test('🔴 no column of a line grid is left without a box', () => {
    // Read as a question sheet, his first column became the questions: Deming's
    // "Common Cause" lost all six lines and Revenue Streams lost its whole Upstream
    // column. A headed column with a line in it and no box on screen is that fault.
    LINE_GRIDS.forEach((name) => {
      const capture = forms.captureForConcept(conceptsFor(name)[0])
      const table = deckTables.templates[name].tables[0]
      const lined = table.rows[0].cells
        .map((c, i) => (table.rows.some(r => r.cells[i].blank) ? i : -1))
        .filter(i => i >= 0)
      expect(lined.length).toBeGreaterThan(0)
      const boxed = new Set(capture.fields.map(f => f.column))
      lined.forEach((i) => { expect(`${name} column ${i}: ${boxed.has(i)}`).toMatch(/true$/) })
    })
  })

  test('every box on a line grid carries his column heading', () => {
    LINE_GRIDS.forEach((name) => {
      const capture = forms.captureForConcept(conceptsFor(name)[0])
      expect(capture.fields.length).toBeGreaterThan(0)
      expect(capture.fields.filter(f => !f.columnLabel).map(f => `${name} ${f.key}`)).toEqual([])
    })
  })

  test('🔴 a merged cell is one box, and a merged row name labels every line it spans', () => {
    // Revenue Streams' "Our Core Product / Service" is one cell nine rows tall; read row
    // by row it was nine boxes. Integration Tasks' "Priority Tasks" spans four lines and
    // labelled only the one its words happened to sit beside.
    const revenue = forms.captureForConcept(conceptsFor('Revenue Streams')[0])
    expect(revenue.fields.filter(f => f.column === 1)).toHaveLength(1)

    const tasks = forms.captureForConcept(conceptsFor('Vertical/ & Horizontal Integration Tasks')[0])
    expect(tasks.fields.filter(f => !f.rowLabel)).toEqual([])
  })

  test('🔴 one heading over two columns stays two lists, each naming its own side', () => {
    // Revenue Streams heads both its Upstream and Downstream thoughts "Our Thoughts to
    // Support These Ideas". Grouped by heading they merged into one list of eight and no
    // one could tell which side a thought was about — on screen and in the printed plan.
    const capture = forms.captureForConcept(conceptsFor('Revenue Streams')[0])
    const shared = capture.fields.filter(f => f.columnHead)
    expect(shared.length).toBeGreaterThan(0)
    const sides = new Set(shared.map(f => f.columnHead))
    expect(sides.size).toBe(new Set(shared.map(f => f.column)).size)
    shared.forEach(f => expect(f.columnHead).not.toBe(f.columnLabel))
  })

  test('a heading row of questions reaches every line under it', () => {
    // A.I.D.C.R.A asks one question per stage and the Price tables name a fee under
    // each heading. Missed, six of his questions were never shown.
    const withQuestions = reader.PAGES.filter(p => p.grid && p.grid.headerRows === 2).map(p => p.template)
    expect(withQuestions.length).toBeGreaterThan(0)
    withQuestions.forEach((name) => {
      const capture = forms.captureForConcept(conceptsFor(name)[0])
      expect(capture.fields.filter(f => !f.rowLabel).map(f => `${name} ${f.key}`)).toEqual([])
    })
  })
})

describe('the line-grid reader, on a page built here', () => {
  // A deck page cannot be re-read in a test — the decks are outside the repository — so
  // this builds one small page with every case the reader distinguishes, and checks each.
  const rule = (x0, y, x1) => ({ type: 's', rect: [x0, y, x1, y] })
  const vrule = (x, y0, y1) => ({ type: 's', rect: [x, y0, x, y1] })
  const span = (text, x, y, bold) => ({ text, bbox: [x, y, x + 10, y + 5], bold: Boolean(bold) })
  const page = {
    deck: 'test',
    page: 99,
    pageRect: { widthPt: 720, heightPt: 405, viewBoxWidth: 1500 },
    // Three columns at 0-100-200-300; rows bounded at 0, 10, 20, 30, 40, 50. Column 0's
    // rows 1-2 are merged (a row name) and column 2's rows 1-4 (one answer).
    drawings: [
      vrule(0, 0, 50), vrule(100, 0, 50), vrule(200, 0, 50), vrule(300, 0, 50),
      rule(0, 0, 300), rule(0, 10, 300), rule(100, 20, 200), rule(0, 30, 200),
      rule(100, 40, 200), rule(0, 50, 300)
    ],
    spans: [
      span('Name', 110, 2, true), span('Core', 210, 2, true),
      span('Tasks', 5, 22, true), span('his example', 105, 12), span('Used Cars', 205, 22),
      span('1', 105, 32), span('Heading', 105, 42, true)
    ]
  }
  const grid = reader.gridOfPage(page, { grid: { headerRows: 1, labelColumns: [0] } }).rows

  test('a merged row name carries down; a merged answer is one cell', () => {
    expect(grid[1].cells[0]).toEqual({ text: 'Tasks' })
    expect(grid[2].cells[0]).toEqual({ text: 'Tasks', merged: true })
    expect(grid[1].cells[2]).toEqual({ text: 'Used Cars', blank: true, guide: true })
    expect(grid[3].cells[2]).toEqual({ text: '', merged: true })
  })

  test('his example is a line with guide text; a line number is a line; bold is a heading', () => {
    expect(grid[1].cells[1]).toEqual({ text: 'his example', blank: true, guide: true })
    expect(grid[2].cells[1]).toEqual({ text: '', blank: true })
    expect(grid[3].cells[1]).toEqual({ text: '1', blank: true })
    expect(grid[4].cells[1]).toEqual({ text: 'Heading' })
  })

  test('a question sheet is read exactly as before — no flags at all', () => {
    reader.gridOfPage(page).rows.forEach(r => r.cells.forEach((c) => {
      expect(Object.keys(c)).toEqual(['text'])
    }))
  })
})

describe('the question sheets and named-row grids reach their table on screen', () => {
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
    WORD_SHAPES.forEach((name) => {
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
