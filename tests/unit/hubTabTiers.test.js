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
 * - `templateLibraryFirm` — Mike, 2026-09-01 (`SEARCH-CONTENT-CASCADE-PLAN.md` Phase 3,
 *   item 4.55): the firm's own template-export upload, firm tier only.
 * - `meetingObservations` — Mike, 2026-09-01, who asked for Meeting Review itself and
 *   approved its drawing (`design/mockups/meeting-review.html` Stage A). The firm gets it
 *   because `meeting-review.md` §3 names a firm's own scripts and standards as the whole
 *   of the request. ⚠ **WIDENED TO ALL FOUR MANAGER TIERS 2026-09-02**, on his instruction
 *   that the points "cascade down to global group and group manager before firm manager,
 *   they accept or edit" — the mentor-alone default of 2026-08-24 holds until a tier has a
 *   real reason, and he gave it.
 * - `depreciationRates` — Mike, 2026-09-08 (item 4.78): the rates a client's forecast writes
 *   assets down at, read from that country's tax authority's documents. **ALL FOUR MANAGER
 *   TIERS ON HIS OWN WORDS** rather than on our judgement — he ruled that the FIRM owns it and
 *   that *"it cant be reliant on the group manager"*, and asked for full cascade functionality
 *   in the same breath. ⚠ Renamed from *Tax Rules* on his ruling of 2026-09-09: IR265 is a
 *   depreciation schedule published BY the tax office, not a set of tax rules.
 * - `taxRates` — Mike, 2026-09-08 (item 4.81), the same request `depreciationRates` was filed
 *   under: *"is it worth having a field in the firm manager hub where tax pdfs can be loaded to
 *   be read by the AI so it can be accurate per country?"*, and confirmed on 2026-09-09 —
 *   *"of course i want the tax rate made contry aware - i literally asked for that!"*
 *   **A SEPARATE TAB, approved by him before the drawing was drawn**
 *   (`design/mockups/tax-rates.html`): he had renamed the tab above the same day precisely so
 *   a tab's name predicts what is inside it, and these are the tax rates that name promised.
 *   All four tiers for the reason stated in `TAB_TIERS.taxRates` — a tax rate is national, and
 *   a firm must not wait on the tier above, which is his own ruling on the sibling.
 * - `clientCopyRequests` — Mike, 2026-09-10: *"you also need to include the feature for a client
 *   to request a copy of the meeting notes."* The tab's name is his own word too, ruling 9 of
 *   `design/mockups/client-record-request.html` — *"name it 'Client Copy Request'"*.
 *   🔴 **THE FIRM ALONE, AND IT IS THE ONLY ENTRY ON THIS LIST THAT CAN NEVER GAIN A TIER.**
 *   Every other narrow line here is the default-is-mentor-alone ruling of 2026-08-24, which
 *   says a tier is added the moment one has a real reason. This is the opposite direction:
 *   Brief **P13** keeps everything derived from a recorded meeting inside the firm it came
 *   from, because the consent line promises a named client exactly that — so cascading it
 *   upward would break a promise rather than add a feature. Same ruling as the manager's
 *   aggregate, which is firm-tier-only for the same sentence.
 * - `compliance` — Mike, 2026-09-10 (item 4.83), naming all four manager tiers in his own
 *   words: *"i want these compliance pages to show in the mentor, global manager, group manager
 *   and firm manager hubs - again, cascading so that if I as a mentor, gets new information, I
 *   can share it downwards but they can seek their own legal opinion and comply thereafter"*.
 *   **NOT the default-is-mentor-alone case of 2026-08-24** — he named the four and gave the
 *   reason, which is that a global group manager or group manager has material of its own to
 *   publish for its country or brand. ⚠ The firm is where it lands and where the declaration
 *   that gates Meeting Review is recorded (slice 3).
 * - `outcomeConsent` — Mike, 2026-09-10 (item 4.87), in his own words: *"A firm manager opts
 *   the firm in, and can opt out at any time, on a hub page at the firm tier."* 🔴 **THE FIRM
 *   ALONE, and stated rather than assumed:** consent is a firm's own undertaking, and the
 *   tiers above contribute no reviews and receive no adjustment, so they have nothing to
 *   switch (spec FR-014). The mentor's page for the same feature is a separate tab.
 * - `sessionProcess` — Mike, 2026-09-21, Decision C of `design/mockups/strategy-session-process.html`
 *   (item 15.1): *"all four manager tiers may write their own standard session"*. **NOT the
 *   default-is-mentor-alone case of 2026-08-24** — that default was put to him and he ruled
 *   against it, and the reason is printed on the drawing: a firm's planning method is exactly
 *   what one firm does differently from another. ⚠ The ADVISOR is not a tier here: he edits the
 *   session in front of one client, and his changes never become the firm's standard.
 * - `ownerFocusTasks` — Mike, 2026-09-24 (item 5.4), in his own words: the starting tasks
 *   *"cascade down from mentor thru the levels to firm manager"*. All four managing tiers, the
 *   Session Processes shape. ⚠ Each owner's own tasks are edited on the model and saved against
 *   the client; nothing typed there reaches this tab.
 * - `salesTeam`, `salesLists` — Mike, 2026-09-22 (item 17 stage 4), in his own words:
 *   *"make sure the firm manager hub is running too - so i can see the lists and report"*.
 *   🔴 **THE FIRM ALONE, and stated rather than assumed** (the default since 2026-08-24 is the
 *   mentor alone; this is neither). Both screens read `va_sales_pipeline`, whose every row
 *   carries one `firm_id`: the roll-up groups ONE firm's advisors, and the lists are the
 *   dropdown values that firm's advisors pick from. The mentor has no advisors of its own
 *   selling, and a brand or country has no shared prospect list — a group-level roll-up would
 *   be a table of firms, a different screen nobody has asked for. Cascading becomes mandatory
 *   the day a group has a real reason to compare its firms; the store already scopes by firm
 *   and `parentScopeOf` already walks the chain, so adding a tier is the whole change.
 *   ⚠ The THREE ADVISOR Sales Tracker screens are deliberately not hub tabs at any tier: the
 *   hub sits behind `requireManagerRole`, so a tab would put an advisor's own tool where its
 *   users cannot reach it (Mike's ruling 2026-09-21).
 * - `currency` — Mike, 2026-09-22: *"BOTH those issues must be fixed, add them to the to do
 *   list"*, and his ruling of 2026-09-23 that the picker appears in BOTH places — the Hub to
 *   SET it, the Model Library read-only so a reader can still tell which currency a report is
 *   in. 🔴 **THE FIRM ALONE, and stated rather than assumed** (the default since 2026-08-24 is
 *   the mentor alone; this is neither). The setting is account-wide, stored per firm, and its
 *   write route was already manager-gated. **The MENTOR has no currency of its own** — it is
 *   above every firm and reports in none — so a mentor picker would set one firm's display
 *   setting on behalf of all of them, which is the Property Tax Rules case Mike already ruled
 *   on. The two MIDDLE tiers are excluded more narrowly: a brand spans countries and a
 *   country's firms may still report in different currencies, so neither has one value to
 *   hold. Cascading becomes mandatory the day a group needs a default for its firms;
 *   `firmOverlay` already carries a row per scope, so adding a tier here is the whole change.
 * - `modelChoices` — Mike, 2026-09-16, Decision 3 of `design/mockups/model-choices.html`
 *   (item 7.5). 🔴 **ALL FOUR TIERS, AND THE RULING REVERSED THE RECOMMENDATION PUT TO HIM**,
 *   which was the mentor alone. The argument for mentor-alone was that no other tier could act
 *   on what the page shows; **Decision 2 — the firm and the advisor on every row — removed it**,
 *   because a firm manager now has their own rows to read, and the roll-up ruling of 2026-08-10
 *   then applies plainly. Each tier is scoped by the route to its own level, never by this list.
 *   ⚠ **This is the first entry in "Rolled up from below" a FIRM MANAGER has ever seen** — the
 *   other three stop at the group tier. Named on the drawing before it was found, and put to
 *   Mike as a visible change to their hub.
 */
/*
 * - `registerRetention` — Mike, 2026-09-23 (item 5.1, Decision 8), in his own words: *"the
 *   data holding period to be no more than 18months - this should flow down from mentor -
 *   through the cascade levels and then at firm manager - be editable again. this way, at
 *   least a set period is loaded as a default."* 🔴 **ALL FOUR TIERS, AND HE NAMED THEM** —
 *   not the default-is-mentor-alone case of 2026-08-24, and not a judgement of ours: he
 *   described the cascade himself. Unlike `currency`, every tier has a real answer here,
 *   because a retention period is a records policy and firms under one brand in one
 *   jurisdiction share the law that shapes it.
 *   ⚠ **The backend had answered "how long" since 2026-09-15 and NOTHING COULD CHANGE IT** —
 *   the register showed a date computed from a platform default no manager could reach. A
 *   privacy control that exists and is unreachable is not a control.
 *   ⚠ **The 18-month ceiling is NOT enforced by this list.** It lives in
 *   `validateRetentionMonths`, which every read and write passes through, so no tier can
 *   exceed it from a screen, a route, or a value stored before the ruling.
 *   ⚠ **NOT the Meeting Review retention dial**, and the two must never be merged: that
 *   period is spoken aloud to a client in approved consent wording, and one dial would let a
 *   manager change a promise made out loud while believing they were shortening how long
 *   staff data is kept.
 */
const FIRM_ADDED_SINCE = ['propertyTaxRules', 'aiPrompts', 'templateLibraryFirm', 'meetingObservations', 'depreciationRates', 'taxRates', 'clientCopyRequests', 'compliance', 'outcomeConsent', 'sessionProcess', 'salesTeam', 'salesLists', 'modelChoices', 'currency', 'registerRetention', 'ownerFocusTasks']

/**
 * The same, for the MENTOR hub — which had nothing added to it between the baseline and
 * 2026-08-22, so this list did not exist until it did.
 *
 * 🔴 IT IS A SEPARATE LIST, NOT AN EDIT TO `MENTOR_BEFORE`, for exactly the reason the
 * firm's note gives: the baseline stays frozen so the diff shows a tab being ADDED rather
 * than a historical record being quietly rewritten.
 *
 * - `aiPrompts` — the same ruling as the firm's, which named the mentor first.
 * - `templateLibrary` — Mike, 2026-08-31 (`SEARCH-CONTENT-CASCADE-PLAN.md` Phase 1,
 *   approved in session): the master export upload, mentor-only, placed beside
 *   Template Check. Stored inert until Phase 2 rewires the loader.
 * - `meetingObservations` — Mike, 2026-09-01. The mentor authors the platform list, which
 *   is where the cascade starts; the firm's copy is the same ruling's other half.
 * - `trendThresholds` — Mike, 2026-09-03 (item 4.61b, `design/mockups/three-way-forecast-trend.html`):
 *   the bands the Three-Way Forecast's two-year trend read draws. He was offered a plain
 *   read with no judgement and chose warning bands **on thresholds he sets** — so the
 *   screen is not an extra, it is what that ruling requires: content that shapes what an
 *   advisor is told cannot live only in a constant. ⚠ MENTOR ALONE, per the
 *   default-is-mentor-alone ruling of 2026-08-24 and stated in `TAB_TIERS`; the resolver
 *   and routes already carry every tier, so a firm that one day needs its own numbers
 *   costs one line there.
 * - `sellDownLadder` — Mike, 2026-09-04 (item 4.64): the price ladder imported stock sells
 *   down at as it ages, and the tab's name is his. It is the other half of the overseas
 *   section he approved and built the same day — his figures were driving a client's
 *   revenue from a data file no screen rendered, which the hub-page rule does not allow.
 *   ⚠ MENTOR ALONE, same default and same statement in `TAB_TIERS` as `trendThresholds`.
 * - `industryBenchmarks` — Mike, 2026-09-08 (item 4.70 stage 3, `design/mockups/benchmarker-hub-tab.html`):
 *   the Stats NZ benchmarker release in force and the two-file upload that replaces it.
 *   ⚠ MENTOR ALONE by design, not by default: one national table, stored at the platform scope.
 * - `depreciationRates` — Mike, 2026-09-08 (item 4.78). The mentor is included because the
 *   cascade starts there and a firm with no table of its own inherits the nearest above it;
 *   the firm is included because he ruled a firm must never wait on the tier above. This is
 *   NOT the default-is-mentor-alone case — all four tiers are his own words.
 * - `taxRates` — Mike, 2026-09-08 (item 4.81), and the mentor is included for the same reason
 *   its sibling's is: the cascade starts there, and a firm with no figures of its own inherits
 *   the nearest tier above it. Also NOT the default-is-mentor-alone case.
 * - `compliance` — Mike, 2026-09-10 (item 4.83), and the mentor is the tier the cascade STARTS
 *   at: the platform's own assessment of what this software does with a client's information is
 *   the first thing published, and every tier beneath inherits it. The mentor is also the only
 *   tier with nothing published TO it, which is the one way its screen differs.
 * - `outcomeLearning` — Mike, 2026-09-10 (item 4.87): *"It surfaces on the Mentor Hub first. A
 *   page shows what has been learned … and the mentor accepts, holds or rejects each one before
 *   it goes live."* ⚠ MENTOR ALONE by design (spec FR-014): the pool is one platform-wide set,
 *   and a lower tier would see the same rows and could take no different decision on them.
 * - `semanticProfiles` — item 4.97 / 7.2 US9, Mike 2026-09-14 ("yes" to a screen to review each
 *   template's signals and profile), built READ-ONLY on his ruling of 2026-09-16. ⚠ MENTOR ALONE:
 *   a profile says what a template is FOR, which does not change from firm to firm; a firm's own
 *   vocabulary already reaches scoring through Advisory Distinctions, which every tier has.
 * - `sessionProcess` — the same ruling as the firm's (Decision C, 2026-09-21). The mentor is
 *   where the cascade starts: a tier that has written nothing inherits the nearest one above,
 *   and the shipped platform session is the mentor's own starting point.
 * - `modelChoices` — the same ruling as the firm's (Decision 3, 2026-09-16). The mentor reads
 *   every firm, which is the view the drawing itself is drawn as. ⚠ The model summaries this
 *   page audits are PLATFORM content no other tier may edit — that was the argument for mentor
 *   alone, and Mike ruled against it once each tier had its own rows to read.
 */
/*
 * - `registerRetention` — the same ruling as the firm's, and the mentor is the tier the
 *   cascade STARTS at: his words are *"flow down from mentor"*, so the platform's 18 months
 *   is the mentor's own figure and every tier below inherits it until it sets one. The
 *   reasoning in full is beside `FIRM_ADDED_SINCE` above.
 */
const MENTOR_ADDED_SINCE = ['aiPrompts', 'templateLibrary', 'semanticProfiles', 'meetingObservations', 'trendThresholds', 'sellDownLadder', 'industryBenchmarks', 'depreciationRates', 'taxRates', 'compliance', 'outcomeLearning', 'sessionProcess', 'modelChoices', 'registerRetention', 'ownerFocusTasks']

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
  // identical" — a global group manager and a group manager do the same job at a
  // different width.
  //
  // 🔴 NO LONGER QUITE IDENTICAL, AND IT IS MIKE'S RULING OF 2026-09-11 RATHER THAN A SLIP.
  // Country Rate Schedules (item 4.92) is the FIRST tab either middle tier holds alone:
  // "it loads at the global group manager tier — one person loads the schedules for every
  // country their brand operates in". A group manager works in one country and INHERITS that
  // country's table; a second copy would be two tables for one country with no rule for
  // which wins.
  //
  // The drawing's "why the two middle columns are identical" is not overturned — the two
  // tiers still do the same job at a different width for everything else, which is what this
  // now holds them to. EXACTLY ONE TAB DIFFERS, and it is named, so a second one appearing
  // fails the build rather than quietly making the tiers diverge.
  it('the two middle tiers differ by exactly the one tab Mike ruled onto the global tier', () => {
    const global = tabsAt('global')
    const group = tabsAt('group')
    expect(global.filter(k => !group.includes(k))).toEqual(['countrySchedules'])
    expect(group.filter(k => !global.includes(k))).toEqual([])
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
    //
    // 🔴 EIGHT SINCE 2026-09-02, NOT SEVEN. Meeting Review's observation points were widened
    // from ['mentor', 'firm'] to all four manager tiers on Mike's instruction that day — the
    // points "cascade down to global group and group manager before firm manager, they accept
    // or edit". So a middle tier now shows 14: six unconditional plus eight conditional.
    //
    // 🔴 NINE SINCE 2026-09-09, NOT EIGHT. Depreciation Rates (item 4.78) was ruled onto all
    // four manager tiers by Mike on 2026-09-08 — the FIRM owns it and "it cant be reliant on
    // the group manager", with full cascade functionality asked for in the same breath. So a
    // middle tier now shows 15: six unconditional plus nine conditional.
    //
    // 🔴 TEN SINCE 2026-09-09, NOT NINE. Tax Rates (item 4.81) joined it — the same request of
    // Mike's, the same country table underneath, and a separate tab because he renamed the
    // other one that day so a tab's name would predict what is inside it. So a middle tier now
    // shows 16: six unconditional plus ten conditional.
    //
    // 🔴 ELEVEN SINCE 2026-09-10, NOT TEN. Compliance (item 4.83) was named onto all four
    // manager tiers by Mike that day, with the cascade asked for in the same sentence. So a
    // middle tier now shows 17: six unconditional plus eleven conditional.
    //
    // 🔴 TWELVE SINCE 2026-09-11, NOT ELEVEN — AND THIS COUNT IS NOW THE GLOBAL TIER'S ALONE.
    // Country Rate Schedules (item 4.92) was ruled onto the global group manager tier by Mike
    // that day, overriding the default-is-mentor-alone rule for this feature. It is the first
    // tab that makes the two middle tiers differ, so the group tier's own count is asserted
    // beside it rather than assumed to match.
    //
    // 🔴 THIRTEEN SINCE 2026-09-21, NOT TWELVE. Session Processes (item 15.1) was ruled onto
    // all four manager tiers by Mike that day — Decision C, against the mentor-alone default
    // he was offered. So the global tier now shows 19: six unconditional plus thirteen
    // conditional, and the group tier 12.
    //
    // 🔴 FOURTEEN SINCE 2026-09-23, NOT THIRTEEN. Model Choices (item 7.5) was ruled onto all
    // four manager tiers by Mike on 2026-09-16 — Decision 3, which REVERSED the mentor-alone
    // recommendation put to him once Decision 2 gave each tier its own rows to read. The tab
    // was built on 2026-09-23, the day the hub file came free. So the global tier now shows
    // 20: six unconditional plus fourteen conditional, and the group tier 13.
    //
    // ⚠ FIFTEEN AND TWENTY-ONE SINCE 2026-09-23: `registerRetention` is the fifteenth
    // conditional tab, on all four tiers in Mike's own words (item 5.1, Decision 8 — the
    // reasoning is beside FIRM_ADDED_SINCE). The middle tiers gain it for the same reason
    // the firm does: a brand or a country holds a records policy, unlike a currency.
    //
    // ⚠ SIXTEEN AND TWENTY-TWO SINCE 2026-09-24: `ownerFocusTasks` (item 5.4) is on all four
    // tiers in Mike's own words — the starting tasks "cascade down from mentor thru the levels
    // to firm manager". The reasoning is beside FIRM_ADDED_SINCE.
    expect(conditional).toHaveLength(16)
    expect(unconditional).toHaveLength(6)
    expect(unconditional.concat(conditional)).toHaveLength(22)
    expect(tabsAt('group')).toHaveLength(15)
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
