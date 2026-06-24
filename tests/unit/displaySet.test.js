'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY-SET DETERMINISM — the guarantee that closes the display-drop defect.
//
// Stage 6 used to hand the AI a wide candidate net and let it pick the final
// cards, so the AI could silently drop the top-scored template (the café/crisis
// defect, ACTIONS §display-drop). buildDisplaySet makes the CODE decide the cards
// (Principle 4): the engine's #1 can never be dropped, the §13 two-card model is
// honoured, and the set is capped at budget. The AI only writes copy for this set.
//
// These tests pin that contract. The integration case re-runs the live café-crisis
// repro and asserts the top-scored template ("Cafe") is always in the display set.
// ─────────────────────────────────────────────────────────────────────────────

const { buildDisplaySet, resolveTemplatesWithOutlier } = require('../../server/utils/templateResolver')
const templates = require('../../data/templates.json')

// Minimal resolvedResult shapes — buildDisplaySet reads only .primary.selected,
// .withinRange.selected and .hasOutlier, so we mock just those.
const T = (title, score) => ({ title, page: 'id-' + title, score, subSection: 'General Tools' })

describe('buildDisplaySet — pure contract', () => {
  test('no outlier: returns the unrestricted top-N, capped at budget, top-scored first', () => {
    const r = {
      hasOutlier: false,
      primary: { selected: [T('A', 30), T('B', 25), T('C', 20), T('D', 10)] },
      withinRange: { selected: [T('A', 30), T('B', 25), T('C', 20)] }
    }
    const out = buildDisplaySet(r, 3).map(t => t.title)
    expect(out).toEqual(['A', 'B', 'C'])
    expect(out).toContain('A') // top-scored can never be dropped
  })

  test('outlier: leads with the Pass-1 top (the stretch), then fills with within-range', () => {
    const r = {
      hasOutlier: true,
      primary: { selected: [T('Stretch', 40), T('X', 20)] }, // Stretch is above range
      withinRange: { selected: [T('InRange1', 18), T('InRange2', 15)] }
    }
    const out = buildDisplaySet(r, 3).map(t => t.title)
    expect(out[0]).toBe('Stretch') // outlier leads
    expect(out).toEqual(['Stretch', 'InRange1', 'InRange2'])
  })

  test('outlier: de-dupes when the outlier also appears in the within-range list', () => {
    const r = {
      hasOutlier: true,
      primary: { selected: [T('Top', 40)] },
      withinRange: { selected: [T('Top', 40), T('Other', 12)] }
    }
    const out = buildDisplaySet(r, 3).map(t => t.title)
    expect(out).toEqual(['Top', 'Other']) // 'Top' appears once
  })

  test('respects the template budget (cap)', () => {
    const r = {
      hasOutlier: false,
      primary: { selected: [T('A', 30), T('B', 25), T('C', 20)] },
      withinRange: { selected: [] }
    }
    expect(buildDisplaySet(r, 1).map(t => t.title)).toEqual(['A'])
    expect(buildDisplaySet(r, 2).map(t => t.title)).toEqual(['A', 'B'])
  })

  test('defaults to budget 1 when budget is missing or non-positive', () => {
    const r = {
      hasOutlier: false,
      primary: { selected: [T('A', 30), T('B', 25)] },
      withinRange: { selected: [] }
    }
    expect(buildDisplaySet(r, 0).map(t => t.title)).toEqual(['A'])
    expect(buildDisplaySet(r, undefined).map(t => t.title)).toEqual(['A'])
  })

  test('empty resolver output → empty set (caller falls back to walkLogicTree)', () => {
    const r = { hasOutlier: false, primary: { selected: [] }, withinRange: { selected: [] } }
    expect(buildDisplaySet(r, 3)).toEqual([])
  })
})

describe('buildDisplaySet — café-crisis acceptance (the actual defect)', () => {
  // The exact live repro: a café profitability case with the firm's crisis
  // distinction boosts. The engine scores "Cafe" highest; the old Stage 6 dropped
  // it from the display. The contract: the top-scored template is ALWAYS shown.
  const caseState = {
    domain: 'profit',
    detectedDomain: 'profit',
    industry: 'cafes',
    solutionCategories: [],
    complexityCeiling: 'analytical',
    problemSignals: {},
    client: {},
    advisor: {}
  }
  const strategyDecision = { engagementType: 'advice', templateBudget: 3 }
  const distinctionBoosts = {
    'Quick & Worst': 20,
    'Receivership vs Liquidation': 20,
    '@rf-industry': 20
  }

  test('the top-scored template ("Cafe") is never dropped from the display set', () => {
    const resolved = resolveTemplatesWithOutlier(caseState, strategyDecision, templates, { distinctionBoosts })
    const topScored = resolved.primary.selected[0].title
    expect(topScored).toBe('Cafe') // engine still ranks it #1 (unchanged)

    const display = buildDisplaySet(resolved, 3).map(t => t.title)
    expect(display).toContain('Cafe') // ← the guarantee the fix adds
    expect(display[0]).toBe('Cafe') // and it leads, since there is no outlier here
  })
})
