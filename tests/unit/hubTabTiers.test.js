'use strict'

/**
 * THE TAB MATRIX — AND THE PROOF THAT ADDING TWO TIERS CHANGED NEITHER LIVE HUB.
 *
 * Three tabs used to be gated on `scope !== 'mentor'`. That rule was written when
 * 'firm' and 'mentor' were the only two scopes, and it is a rule expressed as a
 * negative: the moment a third scope exists it becomes TRUE for it. Team Progress
 * and Team Case Studies would have switched themselves on at the new tiers, and
 * Advisory Distinctions — gated on `scope === 'firm'` — would have vanished from
 * them. Nothing would have errored. No test would have failed, because no test can
 * assert what a scope that does not yet exist should show.
 *
 * So the FIRST half of this file is the guard that could not have existed before:
 * the firm and mentor columns pinned to exactly what they showed at commit
 * `2d38c60`, before the middle tiers were added. If a future change to TAB_TIERS
 * disturbs a live hub, this fails — which is the difference between a claim that
 * the change is behaviour-preserving and a demonstration of it.
 *
 * The SECOND half pins the two new tiers to the approved design,
 * design/mockups/tier-hub-pages.html §2 (ruled by Mike 2026-08-10).
 */

const { TAB_TIERS, HUB_SCOPES, HUB_TITLES } = require('../../components/FirmManagerHub.vue')

/** Every conditional tab this tier shows, sorted. */
function tabsAt (scope) {
  return Object.keys(TAB_TIERS).filter(k => TAB_TIERS[k].includes(scope)).sort()
}

// ── What the two live hubs showed BEFORE the middle tiers existed ──────────────
// Read out of the component at 2d38c60. Do not "update" these to match a change;
// if a change moves them, that change alters a screen running in UAT.
const FIRM_BEFORE = [
  'distinctionsFirm',
  'teamCaseStudies',
  'teamProgress'
].sort()

const MENTOR_BEFORE = [
  'adoption',
  'caseReviews',
  'distinctionsMentor',
  'logicLabReport',
  'templateCheck'
].sort()

describe('hub tab matrix — the live hubs are untouched', () => {
  it('the firm hub shows exactly what it showed before the middle tiers existed', () => {
    expect(tabsAt('firm')).toEqual(FIRM_BEFORE)
  })

  it('the mentor hub shows exactly what it showed before the middle tiers existed', () => {
    expect(tabsAt('mentor')).toEqual(MENTOR_BEFORE)
  })

  it('the firm still never sees the accuracy reports or the adoption roll-up', () => {
    // These read across firms. A firm seeing them is a boundary breach, not a
    // cosmetic slip, so they are asserted by name rather than by count.
    for (const key of ['adoption', 'caseReviews', 'logicLabReport', 'templateCheck']) {
      expect(TAB_TIERS[key]).not.toContain('firm')
    }
  })

  it('the mentor still never sees a firm\'s advisers by name', () => {
    // The 2026-08-09 ruling: Advisor-e is an OUTSIDE party to a customer's staff.
    // The mentor reads the adoption tab instead, which strips who did what.
    expect(TAB_TIERS.teamProgress).not.toContain('mentor')
    expect(TAB_TIERS.teamCaseStudies).not.toContain('mentor')
  })
})

describe('hub tab matrix — the two new tiers', () => {
  // design/mockups/tier-hub-pages.html §2: "Why the two middle columns are
  // identical" — a global group manager and a country group manager do the same
  // job at a different width.
  it('the global and group tiers show identical tabs', () => {
    expect(tabsAt('global')).toEqual(tabsAt('group'))
  })

  it('each middle tier shows 13 tabs — 8 unconditional plus these', () => {
    // The 6 unconditional tabs (Domain Support, Logic Tables, Logic-Lab, Advisory
    // Staircase, Quizzes, Adviser Network) carry no TAB_TIERS entry, so the
    // conditional count is 13 - 6 = 7.
    expect(tabsAt('global')).toHaveLength(7)
  })

  it('a middle tier takes the FIRM flavour of Advisory Distinctions, not the mentor\'s', () => {
    // It has a layer above it, so decline / override / reset-to-platform all mean
    // something. The mentor's plain-CRUD twin would offer it nothing to inherit.
    expect(TAB_TIERS.distinctionsFirm).toEqual(expect.arrayContaining(['global', 'group']))
    expect(TAB_TIERS.distinctionsMentor).not.toContain('global')
    expect(TAB_TIERS.distinctionsMentor).not.toContain('group')
  })

  it('every report rolls up to both middle tiers (ruled 2026-08-10, no exceptions)', () => {
    for (const key of ['teamProgress', 'teamCaseStudies', 'adoption', 'caseReviews', 'logicLabReport', 'templateCheck']) {
      expect(TAB_TIERS[key]).toContain('global')
      expect(TAB_TIERS[key]).toContain('group')
    }
  })
})

describe('hub tab matrix — the shape that stops the next silent switch-on', () => {
  it('every tab names its tiers positively — no entry is empty', () => {
    for (const key of Object.keys(TAB_TIERS)) {
      expect(Array.isArray(TAB_TIERS[key])).toBe(true)
      expect(TAB_TIERS[key].length).toBeGreaterThan(0)
    }
  })

  it('every tier named by a tab is a real hub scope', () => {
    // A typo like 'globals' would silently hide a tab at every tier. Catching it
    // here costs nothing; finding it on screen costs a session.
    for (const key of Object.keys(TAB_TIERS)) {
      for (const tier of TAB_TIERS[key]) {
        expect(HUB_SCOPES).toContain(tier)
      }
    }
  })

  it('every hub scope has a title, and no two tiers share one', () => {
    const titles = HUB_SCOPES.map(s => HUB_TITLES[s])
    for (const t of titles) {
      expect(typeof t).toBe('string')
      expect(t.trim().length).toBeGreaterThan(0)
    }
    expect(new Set(titles).size).toBe(HUB_SCOPES.length)
  })

  it('the two new titles are Mike\'s own words', () => {
    expect(HUB_TITLES.global).toBe('Global Group Manager Hub')
    expect(HUB_TITLES.group).toBe('Group Manager Hub')
  })
})
