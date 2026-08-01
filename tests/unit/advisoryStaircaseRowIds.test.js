'use strict'

// Stable row ids for the Advisory Staircase.
//
// WHY THEY EXIST. Until these were added a step was identified only by `step` —
// its POSITION on the ladder. The same defect as a title-keyed row and the last
// of the four in this codebase: domain support had it (title), the coaching
// reference had it (title), firm-added logic rows had it (position). Insert a
// step at 3 and every stored answer reading "Step 3" silently means a different
// step, with a different complexity ceiling and therefore different templates
// recommended. No error, no warning.
//
// WHAT THE ID IS FOR, AND WHAT IT IS NOT. It is the identity a firm's decisions
// about a row hang off — switch it off, edit it, keep their version when the
// platform changes theirs — the same way `pd-N` works for Advisory Distinctions.
// It is NOT what the engine currently resolves an advisor's answer by: the
// answer travels as chat text, which carries the step's number and name but no
// id (see resolveStaircaseStep). Wiring the id through the answer belongs with
// the firm-editable cascade, and this is the piece that has to exist first.
//
// THE RULE THIS LOCKS. An id is assigned once and never changes. It was seeded
// from the step's name so a human reading the JSON can tell rows apart, but it
// is NOT required to keep matching the name: a renamed step keeps its original
// id, on purpose. Do not "tidy" an id to match a new name — that is precisely
// the breakage this guards against.
//
// Adding a step means adding its id to the list below, deliberately. The list is
// the control; a comment asking people to be careful is not.

const fs = require('fs')
const path = require('path')

const STAIRCASE_FILE = path.resolve(process.cwd(), 'data/advisory-staircase.json')

const LOCKED_IDS = [
  'as-compilation-verification',
  'as-assimilation',
  'as-interpretation',
  'as-application',
  'as-observation'
]

function readSteps () {
  return JSON.parse(fs.readFileSync(STAIRCASE_FILE, 'utf8')).steps
}

describe('advisory-staircase row ids', () => {
  test('the file actually yields steps — an empty read would pass every check below', () => {
    // The vacuous-pass trap: every other test here iterates the list, so a file
    // that produced nothing would report a clean bill of health.
    expect(Array.isArray(readSteps())).toBe(true)
    expect(readSteps().length).toBeGreaterThan(0)
  })

  test('every step carries a non-empty string id', () => {
    const missing = []
    readSteps().forEach((row, i) => {
      if (typeof row.id !== 'string' || row.id.trim() === '') {
        missing.push('[' + i + '] ' + (row.name || '(unnamed)'))
      }
    })
    expect(missing).toEqual([])
  })

  test('ids are unique', () => {
    const ids = readSteps().map(r => r.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  test('every id carries the as- prefix', () => {
    const strays = readSteps().map(r => r.id).filter(id => !String(id).startsWith('as-'))
    expect(strays).toEqual([])
  })

  test('no id is merely the position it happens to sit at', () => {
    // The defect in one assertion: an id of "3", "step-3" or "as-3" would be the
    // position wearing a new hat, and would move the moment a step is inserted.
    const positional = readSteps().filter(r => /^(as-)?(step-?)?\d+$/i.test(String(r.id)))
    expect(positional).toEqual([])
  })

  test('the id set is exactly the locked set — a changed id breaks a firm’s saved choices', () => {
    expect(readSteps().map(r => r.id).sort()).toEqual(LOCKED_IDS.slice().sort())
  })

  test('adding a step is a deliberate act — the row count is locked too', () => {
    expect(readSteps().length).toBe(LOCKED_IDS.length)
  })

  test('the position numbers are still intact and unique — the id replaces neither', () => {
    // `step` remains the DISPLAY position (the badge, the "Step N:" label, the
    // ceiling lookup). The id is identity; the number is order. Both must hold.
    const steps = readSteps().map(r => r.step)
    expect(steps.every(Number.isInteger)).toBe(true)
    expect(steps.length).toBe(new Set(steps).size)
  })
})
