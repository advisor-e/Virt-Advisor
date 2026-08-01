'use strict'

// Stable row ids for the logic tables (data/logic_trees.json).
//
// WHY THIS EXISTS. Every one of these rows already carries an id — 356 graph
// `nodes` across 37 trees and 25 `branches` across 5 flat_if_then trees, none
// missing. NOTHING ENFORCED IT. The ids were there by the care of whoever wrote
// them, and a branch added tomorrow without one would have been committed with
// no complaint.
//
// That matters because the firm-editable cascade keys a firm's decisions about a
// row — switch it off, reword it, keep their version when the mentor changes
// theirs — to the row's id. A row with no id falls back to its position or its
// text, and both change silently: insert a branch above it and a firm's edits
// land on a different rule, with no error and nothing to see. Same defect the
// coaching reference and domain support each had, arriving from the other
// direction: not "the ids are missing" but "nothing stops them going missing".
//
// TWO SHAPES, AND THE SHAPE GUARD MATTERS. A tree is either graph-shaped
// (`nodes`) or flat (`branches`). The shape test below is not decoration: a tree
// arriving in some third shape would make the id checks iterate an empty list
// and pass vacuously, which is worse than failing.
//
// SCOPE, STATED HONESTLY. This locks the PLATFORM file. Rows a firm adds through
// Firm Manager are assigned an id by _mergeBranchRows in server/routes/
// firmManager.js and are not covered here.

const fs = require('fs')
const path = require('path')

const TREES_FILE = path.resolve(process.cwd(), 'data/logic_trees.json')

function readTrees () {
  const parsed = JSON.parse(fs.readFileSync(TREES_FILE, 'utf8'))
  return Array.isArray(parsed.trees) ? parsed.trees : []
}

/** The rows of a tree, whichever shape it uses, or null if it is neither. */
function rowsOf (tree) {
  if (Array.isArray(tree.nodes)) { return tree.nodes }
  if (Array.isArray(tree.branches)) { return tree.branches }
  return null
}

/**
 * Every id problem in a set of trees. Kept as a plain function so the checks can
 * be run against a deliberately broken tree below — a test that has never been
 * seen to fail is not evidence.
 * @param {Array<Object>} trees
 * @returns {string[]} one readable line per problem, [] when clean
 */
function findRowIdProblems (trees) {
  const problems = []
  for (const tree of trees) {
    const rows = rowsOf(tree)
    if (rows === null) { continue } // the shape test owns this case
    const seen = new Set()
    rows.forEach((row, i) => {
      if (typeof row.id !== 'string' || row.id.trim() === '') {
        problems.push(tree.id + '[' + i + '] ' + (row.branch_name || '(unnamed)') + ' — no id')
      } else if (seen.has(row.id)) {
        problems.push(tree.id + ' — duplicate id ' + row.id)
      }
      seen.add(row.id)
    })
  }
  return problems
}

describe('logic table row ids', () => {
  test('every tree carries a non-empty string id, and they are unique', () => {
    const trees = readTrees()
    const bad = trees.filter(t => typeof t.id !== 'string' || t.id.trim() === '')
    expect(bad.map((t, i) => t.name || '(tree ' + i + ')')).toEqual([])
    const ids = trees.map(t => t.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  test('every tree is one of the two known shapes — a third shape would pass the id checks vacuously', () => {
    const strays = readTrees()
      .filter(t => rowsOf(t) === null)
      .map(t => t.id + ' has neither nodes nor branches')
    expect(strays).toEqual([])
  })

  test('every row carries a non-empty id, unique within its tree', () => {
    expect(findRowIdProblems(readTrees())).toEqual([])
  })

  test('the checks actually see rows — an empty read would pass everything above', () => {
    const total = readTrees().reduce((n, t) => n + (rowsOf(t) || []).length, 0)
    expect(total).toBeGreaterThan(300)
  })

  test('the check catches what it claims to — proven on a deliberately broken tree', () => {
    const broken = [
      { id: 'missing', nodes: [{ branch_name: 'no id here' }] },
      { id: 'dupe', branches: [{ id: 'b1' }, { id: 'b1' }] }
    ]
    expect(findRowIdProblems(broken)).toEqual([
      'missing[0] no id here — no id',
      'dupe — duplicate id b1'
    ])
  })
})
