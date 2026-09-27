/**
 * The agenda sheet of Our Session Objective — item 15.26, from the drawing Mike approved on
 * 2026-09-26 (design/mockups/strategy-session-objective-two-sheets.html).
 *
 * 🔴 WHAT THIS CATCHES THAT UAT CANNOT. A tester opens a session of five or six steps and
 * sees a tidy page. The line that runs across the firm's logo, or off the frame, only
 * appears at a size nobody tests by hand — so every size the app allows is laid out here and
 * every row is held to the drawing's two bounds.
 */

'use strict'

const {
  agendaGroups, layoutAgenda, agendaSheetCount, AGENDA_CONCEPT,
  ROW, STEP, RIGHT, LAST_BASELINE, MAX_COLUMNS
} = require('../../utils/agendaLayout')
const frameworks = require('../../server/utils/strategyFrameworks')
const standard = require('../../data/session-processes.json').process

/** The same estimate the layout uses, so a wrapped line can be held to its space. */
const est = r => r.text.length * r.size * 0.54

const NAMES = frameworks.listConcepts().filter(c => c.id !== AGENDA_CONCEPT).map(c => c.name)
const LONG_STEP = 'x'.repeat(128).replace(/x{8}/g, 'Assess, ')
const spread = (steps, names) => Array.from({ length: steps }, (_, i) => ({
  name: 'Step ' + (i + 1), children: names.filter((_, j) => j % steps === i)
}))

const CASES = {
  'one step, nothing in it': [{ name: 'Only step', children: [] }],
  'the standard session': standard.steps.map(s => ({ name: s.name, children: s.items })),
  'eight steps, twenty-two concepts': spread(8, NAMES.slice(0, 22)),
  'every concept across twelve steps': spread(12, NAMES),
  'forty steps, the most a session holds': Array.from({ length: 40 }, (_, i) => ({ name: 'Step ' + (i + 1), children: [] })),
  'forty steps holding every concept': spread(40, NAMES),
  'one step holding every concept': [{ name: 'Everything', children: NAMES }],
  'the longest names': [{ name: LONG_STEP, children: NAMES.slice().sort((a, b) => b.length - a.length).slice(0, 4) }]
}

describe('every row stays clear of the firm\'s mark and inside the frame', () => {
  Object.keys(CASES).forEach((label) => {
    test(label, () => {
      const sheets = layoutAgenda(CASES[label])
      expect(sheets.length).toBeGreaterThan(0)
      sheets.forEach((sheet) => {
        sheet.rows.forEach((r) => {
          expect(r.y).toBeGreaterThanOrEqual(ROW.firstY)
          expect(r.y).toBeLessThanOrEqual(LAST_BASELINE)
          expect(r.x + r.max).toBeLessThanOrEqual(RIGHT + 0.1)
          // Wider than this and the layout should have wrapped it, not left it to a squeeze.
          expect(est(r)).toBeLessThanOrEqual(r.max * 1.15 + 0.1)
        })
        expect(new Set(sheet.rows.filter(r => r.kind === 'step').map(r => r.markX)).size)
          .toBeLessThanOrEqual(MAX_COLUMNS)
      })
    })
  })

  test('nothing is dropped: every step and every concept is printed, in order', () => {
    Object.keys(CASES).forEach((label) => {
      const printed = [].concat(...layoutAgenda(CASES[label]).map(s => s.rows))
      const leads = printed.filter(r => r.kind === 'step' && r.lead).map(r => r.text)
      expect(leads.length).toBe(CASES[label].length)
      const children = printed.filter(r => r.kind === 'child' && r.lead).length
      expect(children).toBe(CASES[label].reduce((n, g) => n + g.children.length, 0))
    })
  })
})

describe('the layout the approved drawing shows', () => {
  test('the standard session is one sheet, one column', () => {
    const [sheet, more] = layoutAgenda(CASES['the standard session'])
    expect(more).toBeUndefined()
    expect(new Set(sheet.rows.map(r => r.markX > ROW.textX ? 'child' : r.markX)).size).toBeLessThanOrEqual(2)
    expect(sheet.rows.every(r => r.x < 400)).toBe(true)
  })

  test('a step is a parent in bold navy, its concepts beneath it at 21pt grey', () => {
    const rows = layoutAgenda([{ name: 'A step', children: ['A concept'] }])[0].rows
    expect(rows[0]).toMatchObject({ kind: 'step', size: STEP.size, weight: 700, ink: '#002B64' })
    expect(rows[1]).toMatchObject({ kind: 'child', size: 21, ink: '#434343' })
    expect(rows[1].y).toBeGreaterThan(rows[0].y)
    expect(rows[1].x).toBeGreaterThan(rows[0].x)
  })

  test('🔴 a step is never parted from its concepts when it fits a column', () => {
    layoutAgenda(CASES['every concept across twelve steps']).forEach((sheet) => {
      let column = null
      sheet.rows.forEach((r) => {
        if (r.kind === 'step' && r.lead) { column = r.markX; return }
        expect(r.markX - (ROW.textX - ROW.bulletX)).toBeCloseTo(column, 5)
      })
    })
  })

  test('what three columns cannot hold continues on another sheet', () => {
    expect(agendaSheetCount(CASES['every concept across twelve steps'])).toBeGreaterThan(1)
    expect(agendaSheetCount(CASES['the standard session'])).toBe(1)
  })

  test('no steps is one sheet, showing his own lines', () => {
    expect(layoutAgenda([])).toEqual([])
    expect(agendaSheetCount([])).toBe(1)
  })
})

describe('the groups come from the session\'s own steps', () => {
  const steps = [
    { name: 'Open', items: [{ conceptId: AGENDA_CONCEPT, name: 'Our Session Objective' }, { conceptId: 'x', name: 'Porter\'s 5 Forces' }] },
    { name: '  ', items: [{ conceptId: 'y', name: 'Blue Ocean Strategy' }] },
    { name: 'Do It & Review It', items: [] }
  ]

  test('🔴 the page never lists itself on its own agenda', () => {
    expect(agendaGroups(steps)[0]).toEqual({ name: 'Open', children: ['Porter\'s 5 Forces'] })
  })

  test('a step with nothing in it still prints; a step with no name does not', () => {
    expect(agendaGroups(steps).map(g => g.name)).toEqual(['Open', 'Do It & Review It'])
  })
})
