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

const { TAB_TIERS, HUB_SCOPES, HUB_TITLES, NAV_GROUPS } = require('../../components/FirmManagerHub.vue')

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

/**
 * Tabs DELIBERATELY added to a live hub since that baseline, each with the ruling that
 * put it there.
 *
 * 🔴 THIS LIST IS NOT A LICENCE TO EDIT `FIRM_BEFORE`. The baseline above stays frozen;
 * an addition is recorded HERE, by name, so the diff shows a tab being added rather than
 * a historical record being quietly rewritten. A tab appearing in neither still fails.
 *
 * - `propertyTaxRules` — Mike, 2026-08-17 (`MULTIPLE-PROPERTY-ASSESSMENT.md` §8 Q6):
 *   a group sets the property model's tax rules, a firm may correct them.
 * - `aiPrompts` — Mike, 2026-08-21 (`AI-PROMPTS-PAGE.md`, item 4.28), naming all four
 *   manager tiers himself: *"a 'AI Prompts' page in the hub pages (Mentor, Global Group
 *   Manager, Group Manager and Firm Manager)"*.
 * - ~~`educationGate`~~ — 🔴 **REMOVED FROM EVERY HUB 2026-08-26, on Mike's instruction.**
 *   It was here as "Mike, 2026-08-24, choosing 'the mentor screen ships in the same change'
 *   WHEN ASKED how far the change should go" — and that phrasing is the whole reason it is
 *   gone. He answered a question we put to him; he never asked for the page. His ruling of
 *   2026-08-26: mockups and pages still get built, but ONLY for features and ideas he
 *   specifically requests. The education-gate QUESTION still fires — only its editing
 *   screen was removed, so its wording now lives in `data/education-gate.json` and is
 *   changed by a developer.
 */
const FIRM_ADDED_SINCE = ['propertyTaxRules', 'aiPrompts']

/**
 * The same, for the MENTOR hub — which had nothing added to it between the baseline and
 * 2026-08-22, so this list did not exist until it did.
 *
 * 🔴 IT IS A SEPARATE LIST, NOT AN EDIT TO `MENTOR_BEFORE`, for exactly the reason the
 * firm's note gives: the baseline stays frozen so the diff shows a tab being ADDED rather
 * than a historical record being quietly rewritten.
 *
 * - `aiPrompts` — the same ruling as the firm's, which named the mentor first.
 * - ~~`educationGate`~~ — removed 2026-08-26 with the firm's, same ruling. See above.
 */
const MENTOR_ADDED_SINCE = ['aiPrompts']

describe('hub tab matrix — the live hubs are untouched', () => {
  it('the firm hub shows what it showed before the middle tiers existed, plus only what was ruled onto it', () => {
    expect(tabsAt('firm')).toEqual(FIRM_BEFORE.concat(FIRM_ADDED_SINCE).sort())
  })

  it('the mentor hub shows what it showed before the middle tiers existed, plus only what was ruled onto it', () => {
    expect(tabsAt('mentor')).toEqual(MENTOR_BEFORE.concat(MENTOR_ADDED_SINCE).sort())
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

  it('each middle tier shows every unconditional tab plus its own six conditional ones', () => {
    // The 7 unconditional tabs (Domain Support, Logic Tables, Logic-Lab, Advisory
    // Staircase, Coaching Reference, Quizzes, Adviser Network) carry no TAB_TIERS
    // entry, so the conditional count is 13 - 7 = 6.
    //
    // ⚠ THE UNCONDITIONAL COUNT WAS WRONG HERE UNTIL 2026-08-19, and the assertion
    // could not see it. This said SIX and listed six, omitting Coaching Reference,
    // which became unconditional on 2026-08-15. The number asserted is the CONDITIONAL
    // count, so the total in the test's own name drifted from 13 to 14 with nothing
    // failing. A count that only lives in a comment is not a count anything checks —
    // recorded here rather than silently corrected.
    //
    // It was 13 when the two hubs were built on 2026-08-11. Template Check came off
    // the same day on the owner's ruling. Property Tax Rules was ruled ON on
    // 2026-08-17 (taking it to 14), and Team Case Studies came off on 2026-08-19 as
    // the duplicate — back to 13, by a different route than it started. AI Prompts was
    // ruled ON on 2026-08-21 (Mike, naming all four manager tiers), taking it to 14.
    //
    // 🔴 THE TOTAL IS NOW DERIVED, NOT WRITTEN DOWN. The note above records that this
    // test's own headline count drifted from 13 to 14 with nothing failing, because the
    // number asserted was the conditional half and the total lived only in prose. It is
    // computed from NAV_GROUPS here, so the two can no longer disagree in silence.
    const conditional = tabsAt('global')
    const everyMenuKey = NAV_GROUPS.reduce((keys, g) => keys.concat(g.items.map(i => i.key)), [])
    const unconditional = everyMenuKey.filter(k => !TAB_TIERS[k])

    // ⚠ AND IT CAUGHT ONE IMMEDIATELY. The comment above said "7 unconditional"; there
    // are SIX — Coaching Reference came off the hub on 2026-08-20 (item 4.24, Mike) and
    // this test's prose was never updated. So a middle tier shows 13, not 14: six
    // unconditional plus seven conditional. Recorded rather than silently corrected,
    // exactly as the 13-to-14 drift above was.
    // ⚠ 2026-08-24: the Education Gate was ruled ON (item 2.9, all four manager tiers),
    // taking the conditional count from 7 to 8 and the total from 13 to 14. Recorded
    // here by name, in the same style as every change above it, so the diff shows a tab
    // being added rather than a number being quietly bumped to make a test pass.
    // 🔴 2026-08-26: and ruled straight back OFF — Mike, on being shown that he had only
    // ever ANSWERED a question about that page and never asked for it. Conditional 8 → 7,
    // total 14 → 13. His rule from that day: pages still get built, but only for features
    // he specifically requests. The gate's QUESTION is untouched; only its editing screen
    // went. Named here, not bumped, for the same reason as every line above.
    expect(conditional).toHaveLength(7)
    expect(unconditional).toHaveLength(6)
    expect(unconditional.concat(conditional)).toHaveLength(13)
  })

  it('a middle tier takes the FIRM flavour of Advisory Distinctions, not the mentor\'s', () => {
    // It has a layer above it, so decline / override / reset-to-platform all mean
    // something. The mentor's plain-CRUD twin would offer it nothing to inherit.
    expect(TAB_TIERS.distinctionsFirm).toEqual(expect.arrayContaining(['global', 'group']))
    expect(TAB_TIERS.distinctionsMentor).not.toContain('global')
    expect(TAB_TIERS.distinctionsMentor).not.toContain('group')
  })

  it('every report rolls up to both middle tiers (ruled 2026-08-10) — bar the named exceptions', () => {
    for (const key of ['teamProgress', 'adoption', 'caseReviews', 'logicLabReport']) {
      expect(TAB_TIERS[key]).toContain('global')
      expect(TAB_TIERS[key]).toContain('group')
    }
  })

  it('Team Case Studies is firm-only — the DUPLICATE, not a report that stopped rolling up', () => {
    // 🔴 ASSERTED RATHER THAN DELETED FROM THE LOOP ABOVE, for the same reason as
    // Template Check below: an exception quietly dropped from a list is
    // indistinguishable from one never considered.
    //
    // ⚠ THIS IS NOT A BREACH OF "every report rolls up". Those cases still reach the
    // group, global and mentor tiers — through Case Reviews, which at those tiers was
    // returning the IDENTICAL list. Both called caseStore.listSharedWithMentor through
    // withOrigin at the same scope, so a group manager opened two differently named
    // tabs and found the same cases in both. Decision 5 of
    // design/HUB-NAVIGATION-GROUPING.md, approved by Mike 2026-08-19: close one door,
    // not the room.
    //
    // 🔴 AND IT IS NOT A REVERT OF THE 2026-08-12 WIDENING, which was correct — before
    // it, a middle tier opened this tab and was shown an empty list. That fix created
    // the overlap unnoticed. Anyone widening this back must read that first, because
    // it restores the duplicate rather than repairing anything.
    expect(TAB_TIERS.teamCaseStudies).toEqual(['firm'])
    expect(TAB_TIERS.caseReviews).toContain('global')
    expect(TAB_TIERS.caseReviews).toContain('group')
  })

  it('Template Check is the exception, and it is MENTOR ONLY', () => {
    // 🔴 ASSERTED RATHER THAN DELETED FROM THE LOOP ABOVE, and that is the point of
    // this test existing at all. "Every report rolls up, no exceptions" was ruled on
    // 2026-08-10; the owner narrowed it on 2026-08-11 — "template check should only
    // be for the mentor since we use it to improve the overall system. it does not
    // relate to people/advisor performance or group manager selection/access
    // permission to templates."
    //
    // An exception quietly dropped from a list looks identical to one never
    // considered. This line is the difference: if a later session widens Template
    // Check back to the middle tiers, it fails here and has to read the ruling.
    expect(TAB_TIERS.templateCheck).toEqual(['mentor'])
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
