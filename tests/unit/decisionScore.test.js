'use strict'

/**
 * The Logic-Lab score sheet — and specifically the two safeguards ACTIONS made
 * conditions of building the page at all:
 *
 *   1. the allowlist of publishable reason codes FAILS CLOSED, and
 *   2. the hidden remainder always carries its number, so the arithmetic never
 *      has a gap.
 *
 * Both are IP-boundary rules, not cosmetics: the page must never reveal that the
 * engine relies on growth stages, engagement types, the Advisory Staircase or the
 * question order (Mike, 2026-08-02). A test is the only thing that stops the next
 * developer's new scoring rule from leaking one by accident.
 */

const {
  publishableReasons,
  buildRow,
  boostsFromProbe,
  treeHintsFor,
  scoreOneTemplate,
  PUBLISHABLE_REASONS
} = require('../../server/utils/decisionScore')
const logicTrees = require('../../server/utils/logicTrees')

describe('decisionScore — the publishable-reason allowlist', () => {
  it('publishes a distinction with the points the firm actually configured', () => {
    const { published, publishedPoints } = publishableReasons(['distinction:+8'])
    expect(published).toEqual([{ kind: 'distinction', points: 8, code: 'distinction:+8' }])
    expect(publishedPoints).toBe(8)
  })

  it('publishes the group form of a distinction boost', () => {
    const { published } = publishableReasons(['distinction:@rf-industry+5'])
    expect(published).toHaveLength(1)
    expect(published[0]).toMatchObject({ kind: 'distinction', points: 5 })
  })

  it('publishes a logic-table hint', () => {
    const { published, publishedPoints } = publishableReasons(['tree_hint:+3'])
    expect(published).toEqual([{ kind: 'tree_hint', points: 3, code: 'tree_hint:+3' }])
    expect(publishedPoints).toBe(3)
  })

  // ── THE FAIL-CLOSED PROOF ──────────────────────────────────────────────────
  it('HIDES a scoring rule nobody has thought about, rather than leaking it', () => {
    // Stand-in for the rule some future developer adds to templateResolver
    // without ever opening decisionScore.js. It must not reach the screen.
    const { published, publishedPoints } = publishableReasons(['brand_new_rule:+9'])
    expect(published).toEqual([])
    expect(publishedPoints).toBe(0)
  })

  it('hides every reason family that is protected IP', () => {
    const protectedCodes = [
      'growth:exact',
      'engagement:primary',
      'engagement:secondary',
      'advisor:confidence_match',
      'domain:primary_subsection',
      'semantic:4.5',
      'industry:title_match',
      'primary_issue:strong_match',
      'purpose:cashflow',
      'tag:staff',
      'penalty:modeling_declined',
      'history:already_delivered'
    ]
    const { published } = publishableReasons(protectedCodes)
    expect(published).toEqual([])
  })

  it('only ever clears the two firm-editable levers', () => {
    // A guard on the list itself: growing it is a deliberate act with a diff,
    // never something that happens because a regex was loosened.
    expect(PUBLISHABLE_REASONS.map(r => r.kind)).toEqual(['distinction', 'tree_hint'])
  })

  it('ignores malformed entries instead of throwing', () => {
    const { published, publishedPoints } = publishableReasons([null, 42, undefined, 'distinction:'])
    expect(published).toEqual([])
    expect(publishedPoints).toBe(0)
  })

  it('survives a missing reasons array', () => {
    expect(publishableReasons(undefined).published).toEqual([])
  })
})

describe('decisionScore — the numbers always add up', () => {
  it('folds everything withheld into one remainder', () => {
    const row = buildRow({
      title: 'Governance Introduction',
      page: 'p-1',
      score: 19,
      matchReasons: ['distinction:+5', 'tree_hint:+3', 'domain:primary_subsection', 'semantic:3.2']
    }, 1)

    expect(row.reasons.map(r => r.kind)).toEqual(['distinction', 'tree_hint'])
    // 19 total − (5 + 3) published = 11 held back, exactly the mockup's figure.
    expect(row.otherFactors).toBe(11)
    expect(row.score).toBe(19)
    // The published parts plus the remainder must equal the score, always.
    const publishedTotal = row.reasons.reduce((sum, r) => sum + r.points, 0)
    expect(publishedTotal + row.otherFactors).toBe(row.score)
  })

  it('keeps the arithmetic balanced when a NEW rule is added later', () => {
    // The same template, after someone adds a scoring rule worth +6. The rule is
    // hidden — and the remainder absorbs it, so the reader is never shown a
    // column that fails to sum to the score.
    const row = buildRow({
      title: 'Governance Introduction',
      score: 25,
      matchReasons: ['distinction:+5', 'tree_hint:+3', 'brand_new_rule:+6']
    }, 1)
    expect(row.reasons).toHaveLength(2)
    expect(row.otherFactors).toBe(17)
    expect(5 + 3 + row.otherFactors).toBe(row.score)
  })

  it('reports a NEGATIVE remainder rather than pretending a penalty is a bonus', () => {
    const row = buildRow({
      title: 'Held Back Template',
      score: 2,
      matchReasons: ['tree_hint:+3', 'history:already_delivered', 'penalty:modeling_declined']
    }, 4)
    expect(row.otherFactors).toBe(-1)
    expect(3 + row.otherFactors).toBe(row.score)
  })

  it('marks a row that no firm lever reached', () => {
    const row = buildRow({ title: 'Board Member Conduct', score: 9, matchReasons: ['semantic:2.0'] }, 4)
    expect(row.hasFirmLever).toBe(false)
    expect(row.otherFactors).toBe(9)
  })
})

describe('decisionScore — distinction boosts come from the probe that ran', () => {
  it('sums every matched distinction onto the templates it names', () => {
    const boosts = boostsFromProbe({
      matched: [
        { description: 'Owner cannot let go', boost: 5, templates: ['Succession Plan', 'Quality Decisions'] },
        { description: 'No single version of the numbers', boost: 8, templates: ['Quality Decisions'] }
      ]
    })
    expect(boosts).toEqual({ 'Succession Plan': 5, 'Quality Decisions': 13 })
  })

  it('falls back to the default boost when a row carries none', () => {
    expect(boostsFromProbe({ matched: [{ templates: ['A'] }] })).toEqual({ A: 5 })
  })

  it('returns an empty map when nothing matched', () => {
    expect(boostsFromProbe({ matched: [] })).toEqual({})
    expect(boostsFromProbe(null)).toEqual({})
  })
})

describe('decisionScore — a template missing from the ranking log', () => {
  /**
   * THE 2026-08-03 DEFECT, found by Mike on the running app. `scoringLog` is
   * capped at the top 20 and drops anything scoring zero (templateResolver
   * L622), so "absent from the log" carries two completely different meanings.
   * The page reported both as "the engine did not rank this template at all",
   * which was false for a template that had scored 1 and simply placed 21st.
   */
  const caseState = {
    domain: 'strategy',
    primaryIssue: '',
    industry: null,
    solutionCategories: ['strategy'],
    complexityCeiling: null,
    client: {},
    advisor: {},
    problemSignals: {}
  }
  const strategy = { engagementType: 'facilitation', templateBudget: 2 }
  const pool = [
    { page: 'p-1', title: 'Governance Introduction', menuSection: 'do-the-job', subSection: 'Governance Tools' },
    { page: 'p-2', title: 'Lite Strategy', menuSection: 'do-the-job', subSection: 'Strategy Tools' }
  ]

  it('scores it in isolation rather than calling it unranked', () => {
    const row = scoreOneTemplate('Governance Introduction', pool, caseState, strategy, {})
    // Whatever it scores, the answer must be a NUMBER — the gap depends on it,
    // and a null score made the whole gap block silently disappear.
    expect(typeof row.score).toBe('number')
    if (row.outsideSheet) {
      expect(row.score).toBeGreaterThan(0)
      // Its true position is unknown — below the 20 the log keeps — and
      // inventing a rank would be worse than saying so.
      expect(row.rank).toBeNull()
    }
  })

  it('reports zero as zero, so the gap arithmetic still works', () => {
    const row = scoreOneTemplate('Lite Strategy', pool, caseState, strategy, {})
    expect(typeof row.score).toBe('number')
    expect(row.score).toBeGreaterThanOrEqual(0)
  })

  it('distinguishes "not in your library" from "scored nothing"', () => {
    const row = scoreOneTemplate('A Template That Never Existed', pool, caseState, strategy, {})
    expect(row.unscored).toBe(true)
    expect(row.inLibrary).toBe(false)
    expect(row.score).toBe(0)
  })

  it('matches on title case-insensitively — a picker value must not miss', () => {
    const row = scoreOneTemplate('gOvErNaNcE iNtRoDuCtIoN', pool, caseState, strategy, {})
    expect(row.inLibrary !== false || row.outsideSheet).toBeTruthy()
  })
})

describe('decisionScore — the logic-table hints match the live engine', () => {
  afterEach(() => jest.restoreAllMocks())

  it('skips Learn-mode tables exactly as a client session does', () => {
    // The engine skips on `mode` (advisorEngine L2625). The probe's rows carry
    // `shape`, not `mode` — reading those would let a Learn table award points a
    // real session never awards, and the score sheet would quietly disagree with
    // production.
    jest.spyOn(logicTrees, 'detectLogicTrees').mockReturnValue([
      { id: 'learn_tree', mode: 'learn' },
      { id: 'client_tree' }
    ])
    const walk = jest.spyOn(logicTrees, 'walkLogicTree').mockReturnValue(['Quality Decisions'])

    const names = treeHintsFor('governance', 'poor decision making', null)

    expect(walk).toHaveBeenCalledTimes(1)
    expect(walk.mock.calls[0][1]).toBe('client_tree')
    expect(names).toEqual(['Quality Decisions'])
  })

  it('walks with the detected area, the way a session builds its signal text', () => {
    jest.spyOn(logicTrees, 'detectLogicTrees').mockReturnValue([{ id: 'client_tree' }])
    const walk = jest.spyOn(logicTrees, 'walkLogicTree').mockReturnValue([])

    treeHintsFor('governance', 'poor decision making', null)

    expect(walk.mock.calls[0][0]).toEqual({
      detectedDomain: 'governance',
      situationDiagnostic: 'poor decision making'
    })
  })

  it('returns nothing when no table opens', () => {
    jest.spyOn(logicTrees, 'detectLogicTrees').mockReturnValue([])
    expect(treeHintsFor('governance', 'nothing matches this', null)).toEqual([])
  })
})
