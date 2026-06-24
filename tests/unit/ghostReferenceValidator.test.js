'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// GHOST-REFERENCE VALIDATOR (validateLogicTreeReferences) — 2026-06-24.
//
// The validator flags client-delivery logic-tree template references that exist in
// no search-content title — dead links the AI then hallucinates a recommendation
// around. Scope is deliberately NODE trees only (the client-delivery path).
//
// flat_if_then (Get-the-Job) trees are intentionally NOT validated against the
// search content: they are Learn-mode-only (design §2.5) and their
// `branches[].templates` reference advisor-kit / framework materials that
// legitimately are absent from the client search JSON (provenance rule — valid if
// in the search JSON OR named in the source PDFs, the latter not machine-readable
// here). Scanning them against the search content false-positives every legitimate
// kit reference, so it is out of scope by decision (ACTIONS.md, 2026-06-24).
//
// Per the Constitution, validation functions that gate AI output get 100% coverage.
// Fixtures use titles verified present in search_content_20260519050251.json.
// ─────────────────────────────────────────────────────────────────────────────

const { validateLogicTreeReferences } = require('../../server/utils/logicTrees')

// Titles verified to exist in the search content (ground truth, not assumed).
const REAL_TEMPLATE = 'Dashboard Discussions'
const REAL_TEMPLATE_2 = 'Quick Position'

describe('validateLogicTreeReferences — ghost detection (node-tree scope)', () => {
  let errSpy
  beforeEach(() => { errSpy = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { errSpy.mockRestore() })

  test('a node tree referencing only real templates yields no ghosts', () => {
    const ghosts = validateLogicTreeReferences([
      { name: 't1', nodes: [{ id: 'n1', templates: [REAL_TEMPLATE, REAL_TEMPLATE_2] }] }
    ])
    expect(ghosts).toEqual([])
  })

  test('a fabricated template on a node is caught', () => {
    const ghosts = validateLogicTreeReferences([
      { name: 't1', nodes: [{ id: 'n1', templates: [REAL_TEMPLATE, 'Totally Made Up Report'] }] }
    ])
    expect(ghosts).toContain('Totally Made Up Report')
    expect(ghosts).not.toContain(REAL_TEMPLATE)
  })

  test('placeholder/prose-shaped entries are ignored, not flagged as ghosts', () => {
    const ghosts = validateLogicTreeReferences([
      {
        name: 't1',
        nodes: [{
          id: 'n1',
          templates: ['[choose a relevant template]', 'a suitable follow-up', 'x'.repeat(90)]
        }]
      }
    ])
    expect(ghosts).toEqual([])
  })

  test('the same ghost on two nodes is reported once', () => {
    const ghosts = validateLogicTreeReferences([
      { name: 'a', nodes: [{ id: 'n1', templates: ['Phantom Tool'] }] },
      { name: 'b', nodes: [{ id: 'n2', templates: ['Phantom Tool'] }] }
    ])
    expect(ghosts.filter(g => g === 'Phantom Tool')).toHaveLength(1)
  })

  test('DECISION GUARD: flat_if_then branch templates are NOT validated against search content', () => {
    // Get-the-Job branch templates legitimately live outside the client search JSON.
    // This asserts the deliberate exclusion (Option A, 2026-06-24) — if a future
    // change starts scanning branches, this test breaks and the provenance reasoning
    // in ACTIONS.md / logicTrees.js must be revisited first.
    const ghosts = validateLogicTreeReferences([
      {
        name: 'get_positioning',
        type: 'flat_if_then',
        branches: [{ branch_name: 'B1', templates: ['Some Advisor Kit Item Not In Search JSON'] }]
      }
    ])
    expect(ghosts).toEqual([])
  })

  test('empty input yields no ghosts', () => {
    expect(validateLogicTreeReferences([])).toEqual([])
  })
})
