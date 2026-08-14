'use strict'

// 🔴 WHY THIS EXISTS. On 2026-08-15 two pieces of work reached Mike dressed as
// priorities that nobody had asked for. One of them had grown out of a single
// AI-written sentence in `ACTIONS.md` that a later session read as an instruction.
// His ruling produced the five fields every item must carry — score, why, risk,
// askedBy, touches — and `to-do.md` §2 recorded them while admitting plainly:
// "Not yet enforced… a guard test that fails the build on an item missing any of
// the five is the control this needs, and it is not built."
//
// This is that control. The field that matters most is `askedBy`: an item that
// cannot name Mike or a named person outside the project must say `ours: true`
// out loud. Neither of the two wasted pieces of work could have filled it in
// honestly, which is the whole point — the field is not paperwork, it is the
// question that stops the work.
//
// The cross-check against `to-do.md` is here because the data and the page a
// human reads are two copies of the same nine facts until Phase 3 generates one
// from the other. Two copies drift; a test is what stops them drifting quietly.

const { readFileSync } = require('fs')
const { resolve } = require('path')

const FEATURES = resolve(__dirname, '..', '..', 'design', 'features')
const DATA_FILE = resolve(FEATURES, 'to-do-items.json')
const LIST_FILE = resolve(FEATURES, 'to-do.md')

const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
const items = data.items

/** Who an item may be waiting on. A free-text value here hides a blocker. */
const WAITING = ['Mike', 'Us', 'Outside']

/** Refs quoted in the order Mike set, so a silent re-sort by a script is visible. */
const refs = items.map(i => i.ref)

describe('the to-do data carries what the list\'s own rules demand', () => {
  test('there are items at all, and the file says who ordered them', () => {
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)
    expect(typeof data.orderedByMikeOn).toBe('string')
  })

  test.each(refs)('%s carries all five fields, none of them blank', (ref) => {
    const item = items.find(i => i.ref === ref)

    // Reported as one object so a failure names every missing field at once
    // rather than stopping at the first — the same reason productionGuard
    // reports all three violations together.
    const present = {
      score: Number.isInteger(item.score),
      why: typeof item.why === 'string' && item.why.trim().length > 0,
      risk: typeof item.risk === 'string' && item.risk.trim().length > 0,
      askedBy: !!(item.askedBy && String(item.askedBy.who || '').trim()),
      touches: typeof item.touches === 'string' && item.touches.trim().length > 0
    }

    expect(present).toEqual({
      score: true, why: true, risk: true, askedBy: true, touches: true
    })
  })

  test.each(refs)('%s scores 1-5 — a 0 is deleted with its code, never filed', (ref) => {
    const item = items.find(i => i.ref === ref)
    expect(item.score).toBeGreaterThanOrEqual(1)
    expect(item.score).toBeLessThanOrEqual(5)
  })

  test.each(refs)('%s says out loud whether anybody outside asked for it', (ref) => {
    const item = items.find(i => i.ref === ref)
    expect(typeof item.askedBy.ours).toBe('boolean')

    // `ours: true` is allowed and honest. What is NOT allowed is claiming it
    // unexplained: an item nobody requested has to justify itself in writing.
    if (item.askedBy.ours) {
      expect(String(item.askedBy.detail || '').trim().length).toBeGreaterThan(0)
    }
  })

  test.each(refs)('%s waits on a known party, and a blocker says what it blocks', (ref) => {
    const item = items.find(i => i.ref === ref)
    expect(WAITING).toContain(item.waitingOn)
    expect(typeof item.blocker).toBe('boolean')
    if (item.blocker) {
      expect(String(item.blocks || '').trim().length).toBeGreaterThan(0)
    }
  })

  test('no ref appears twice', () => {
    expect(refs).toEqual(Array.from(new Set(refs)))
  })
})

describe('the data and the page a human reads hold the same items', () => {
  const md = readFileSync(LIST_FILE, 'utf8')

  // The ranked table in §1: rows read `| 3 | **2.6** name | 4 | — | Mike |`.
  const tableRefs = []
  const ROW = /^\|\s*\d+\s*\|\s*(?:🔒\s*)?\*\*([\d.]+)\*\*/gm
  let m
  while ((m = ROW.exec(md)) !== null) { tableRefs.push(m[1]) }

  test('to-do.md still has a ranked table to compare against', () => {
    expect(tableRefs.length).toBeGreaterThan(0)
  })

  test('every item in the data appears in the table, and in the same order', () => {
    expect(tableRefs).toEqual(refs)
  })
})

// 🔴 WHY THIS BLOCK EXISTS. The cross-check above compared the items and nothing
// compared the PHASES, so on 2026-08-15 the data recorded phase 1 as not done
// while to-do.md recorded it as done that same day — a contradiction inside one
// feature, in two files edited in one sitting, that the guard test sat beside
// and never looked at. An item that tracks its own phases has two copies of that
// progress until Phase 3 generates one from the other, and two copies drift.
describe('an item\'s phases say the same thing in both files', () => {
  const md = readFileSync(LIST_FILE, 'utf8')

  const lines = md.split(/\r?\n/)
  const phased = items.filter(item => Array.isArray(item.phases))

  /**
   * §6's phase table, found by its own header rather than by row shape.
   *
   * A row-shaped pattern is not enough: §2's scoring key opens its rows with
   * `| **5** |` too, so a loose match reads the six scores as six phases and
   * compares the wrong table. Anchoring on `| Phase | What | State |` is what
   * makes the comparison mean what it says.
   *
   * @returns {Object<number, boolean>} phase number → ticked on the page
   */
  function phasesOnPage () {
    const heads = lines
      .map((line, i) => (/^\|\s*Phase\s*\|\s*What\s*\|\s*State\s*\|/.test(line) ? i : -1))
      .filter(i => i !== -1)

    // Two phase tables and this guard would silently pick the first.
    expect(heads).toHaveLength(1)

    const out = {}
    for (let i = heads[0] + 1; i < lines.length && lines[i].charAt(0) === '|'; i++) {
      const cells = lines[i].split('|').slice(1, -1)
      const n = (cells[0] || '').replace(/[*\s]/g, '')
      if (!/^\d+$/.test(n)) { continue } // the separator row
      out[Number(n)] = (cells[2] || '').includes('✅')
    }
    return out
  }

  test('at least one item tracks phases, or this guard is dead weight', () => {
    expect(phased.length).toBeGreaterThan(0)
  })

  test.each(phased.map(i => i.ref))('%s numbers its phases 1..n, once each', (ref) => {
    const item = items.find(i => i.ref === ref)
    expect(item.phases.map(p => p.n)).toEqual(item.phases.map((_, i) => i + 1))
    item.phases.forEach((phase) => {
      expect(typeof phase.done).toBe('boolean')
      expect(String(phase.what || '').trim().length).toBeGreaterThan(0)
    })
  })

  test('a phase ticked in the data is ticked on the page, and the reverse', () => {
    const onPage = phasesOnPage()

    // An empty {} would pass every comparison below by matching nothing.
    expect(Object.keys(onPage).length).toBeGreaterThan(0)

    phased.forEach((item) => {
      const inData = {}
      item.phases.forEach((phase) => { inData[phase.n] = phase.done })
      expect(inData).toEqual(onPage)
    })
  })
})
