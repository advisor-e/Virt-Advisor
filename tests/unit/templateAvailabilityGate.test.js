'use strict'

/**
 * Template availability gate — server/utils/logicTrees.js
 *
 * WHY THIS EXISTS. The logic trees are faithful to the source tables in
 * `Logic Tables/`, whose THEN column names tools the master export has not
 * published under that title (design/TREE-RECOMMENDATION-REVIEW.md). The tree
 * declares the name; this gate withholds it from the AI prompt until the
 * catalogue can serve it, so an advisor is never sent after a page they cannot
 * open. When the export catches up the name flows automatically.
 *
 * The gate sits directly on the prompt path, so the last test here is the one
 * that matters most: against the REAL tree data, nothing is withheld today, and
 * every prompt therefore comes out exactly as it did before the gate existed.
 */

const { isTemplateName, splitByAvailability, loadLogicTrees } = require('../../server/utils/logicTrees')
const templates = require('../../data/templates.json')

// The app's own loader, not a raw require of the JSON — the file is an object
// with a `trees` key, and this test must see exactly what the engine sees.
const logicTrees = loadLogicTrees()

const catalogueTitle = templates.find(t => t && t.title).title

describe('isTemplateName — reference vs deliberate placeholder', () => {
  it('treats an ordinary title as a reference', () => {
    expect(isTemplateName('Formal Risk Management')).toBe(true)
  })

  it('does NOT treat a prose stand-in as a reference', () => {
    // 18 of these are live in the trees; they are guidance, not references, and
    // gating them would silently strip real instruction from the prompt.
    expect(isTemplateName('a goal-setting template [Planning — tags: goals, targets]')).toBe(false)
  })

  it('does NOT treat a bracketed placeholder as a reference', () => {
    expect(isTemplateName('[domain template]')).toBe(false)
  })

  it('rejects empty and non-string input', () => {
    expect(isTemplateName('')).toBe(false)
    expect(isTemplateName(null)).toBe(false)
    expect(isTemplateName(undefined)).toBe(false)
    expect(isTemplateName(42)).toBe(false)
  })
})

describe('splitByAvailability', () => {
  it('emits a name the catalogue carries', () => {
    const { available, withheld } = splitByAvailability([catalogueTitle])
    expect(available).toEqual([catalogueTitle])
    expect(withheld).toEqual([])
  })

  it('withholds a real name the catalogue does not carry yet', () => {
    // One of the six named in the source logic tables but absent from the export.
    const { available, withheld } = splitByAvailability(['Offshoring Review'])
    expect(available).toEqual([])
    expect(withheld).toEqual(['Offshoring Review'])
  })

  it('passes a prose placeholder through untouched', () => {
    const placeholder = 'a feedback framework template [People & Performance — tags: feedback]'
    const { available, withheld } = splitByAvailability([placeholder])
    expect(available).toEqual([placeholder])
    expect(withheld).toEqual([])
  })

  it('keeps order and splits a mixed list correctly', () => {
    const { available, withheld } = splitByAvailability([catalogueTitle, 'Offshoring Review', catalogueTitle])
    expect(available).toEqual([catalogueTitle, catalogueTitle])
    expect(withheld).toEqual(['Offshoring Review'])
  })

  it('returns empty lists for empty, missing or non-array input', () => {
    expect(splitByAvailability([])).toEqual({ available: [], withheld: [] })
    expect(splitByAvailability(undefined)).toEqual({ available: [], withheld: [] })
    expect(splitByAvailability(null)).toEqual({ available: [], withheld: [] })
    expect(splitByAvailability('Formal Risk Management')).toEqual({ available: [], withheld: [] })
  })
})

describe('the gate changes nothing about today\'s prompts', () => {
  it('withholds NOTHING from the real logic trees', () => {
    // The proof that adding the gate is behaviour-preserving. If this ever fails,
    // a tree has declared a name the catalogue cannot serve — which is either the
    // deliberate next step (six names from the source tables) or a typo. Either
    // way it must be a decision, not a surprise: update this test with the reason.
    const withheld = []
    for (const tree of logicTrees) {
      for (const node of (tree.nodes || [])) {
        for (const field of ['templates', 'templates_if_unsure', 'support_templates']) {
          for (const name of splitByAvailability(node[field]).withheld) {
            withheld.push(`${tree.name || tree.id} · ${node.id} · ${field} · "${name}"`)
          }
        }
      }
    }
    expect(withheld).toEqual([])
  })
})
