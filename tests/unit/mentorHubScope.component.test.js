/**
 * @jest-environment jsdom
 */
'use strict'

// The Mentor Hub is the Firm Manager Hub re-scoped one level up.
//
// WHY THIS FILE EXISTS. Mike's ruling of 2026-07-30 — "all of the functionality that you
// see at firm manager is simply repeated at group manager or global manager… there's no
// new functionality" — is implemented as a single `scope` prop on FirmManagerHub rather
// than a copied component. That makes the two screens one screen, which is the point;
// it also means a change made for the firm silently reaches the mentor, and a change
// made for the mentor silently reaches every firm. Nothing else in the suite can see
// that, because the hub had no test asserting which tabs it shows to whom.
//
// So these tests pin BOTH directions:
//   - mentor scope gains its two tabs and loses the firm-flavoured distinctions tab;
//   - firm scope is byte-for-byte the screen it was before the prop existed.
//
// They assert ORDER as well as presence. "Every tier is the same screen" is a claim
// about what a person recognises when they look at it, and a hub whose tabs arrive in a
// different order at each tier has not honoured it, however complete the list.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmManagerHub = require('../../components/FirmManagerHub.vue').default
const MentorPage = require('../../pages/mentor.vue').default

/**
 * Every tab name the hub is currently showing, in the order a manager reads them.
 *
 * ⚠ CHANGED 2026-08-19 with the sidebar (design/HUB-NAVIGATION-GROUPING.md). This used
 * to read `nav.tabs li` — Buefy's horizontal tab bar, which no longer exists. That
 * selector did not start failing when the bar went; it started returning NOTHING, and
 * the order assertion below quietly passed on two empty arrays. A selector that finds
 * no elements is the most dangerous thing in a component test, because absence and
 * agreement look identical. Hence `assertMenuIsReallyThere` in the two order tests.
 *
 * Scoped to `.hub-menu` on purpose: four tab BODIES carry their own `b-menu` rail
 * (the domain list, the table list, the quiz banks), and an unscoped menu selector
 * would sweep those up as if they were hub tabs.
 */
function tabLabels (wrapper) {
  // ⚠ THE SCREEN-READER LINE IS STRIPPED, not asserted on. A menu entry carrying a
  // notification dot (item 4.84) renders the dot's meaning in words beside the label — "…
  // — Never opened" — for anyone who cannot see the colour, and `.text()` returns both.
  // These tests are about WHICH TABS EXIST and in what order; the dot's wording is pinned
  // once, next to the logic that produces it, in tests/unit/hubMenuDots.test.js.
  return wrapper.findAll('.hub-menu a[data-tab]').wrappers.map((a) => {
    const sr = a.find('.is-sr-only')
    const text = a.text().trim()
    return sr.exists() ? text.replace(sr.text().trim(), '').trim() : text
  })
}

/**
 * Mount the hub with every network call stubbed. The tab bodies each load themselves on
 * mount; none of that is what these tests are about, and letting the real loaders run
 * would make them fail for reasons unrelated to the tab list they guard.
 *
 * @param {object} [props] - propsData merged over the firm-scope defaults.
 * @returns {object} the test-utils Wrapper.
 */
async function mountHub (props) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
  const wrapper = mountWithBuefy(FirmManagerHub, {
    propsData: Object.assign({ firmId: 'firm-1', apiToken: 'test-token' }, props)
  })
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('FirmManagerHub — firm scope is unchanged by the scope prop', () => {
  it('defaults to firm scope when no scope is passed', async () => {
    const wrapper = await mountHub()
    expect(wrapper.vm.scope).toBe('firm')
  })

  it('shows the Firm Manager Hub heading and the firm id beneath it', async () => {
    const wrapper = await mountHub()
    expect(wrapper.find('.level-left .title').text()).toBe('Firm Manager Hub')
    expect(wrapper.find('.level-left .subtitle').text()).toBe('firm-1')
  })

  it('keeps the back-to-advisor link', async () => {
    const wrapper = await mountHub()
    expect(wrapper.find('a[href="/advisor"]').exists()).toBe(true)
  })

  it('shows the firm-flavoured Advisory Distinctions tab exactly once', async () => {
    const labels = tabLabels(await mountHub())
    expect(labels.filter(l => l === 'Advisory Distinctions')).toHaveLength(1)
  })

  it('does NOT show either mentor-only tab', async () => {
    const wrapper = await mountHub()
    expect(tabLabels(wrapper)).not.toContain('Case Reviews')
    expect(tabLabels(wrapper)).not.toContain('templateCheck.tab')
    expect(tabLabels(wrapper)).not.toContain('logicLabReport.tab')
    // Presence of the tab is the visible half; the body must not be mounted either,
    // or a firm manager's browser is running the mentor's cross-firm case reader.
    expect(wrapper.findComponent({ name: 'MentorReview' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'MentorDistinctions' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'MentorTemplateCheck' }).exists()).toBe(false)
    // The cross-firm rollup above all: a firm manager's browser must never be
    // running the one screen that reads every other firm's configuration.
    expect(wrapper.findComponent({ name: 'MentorLogicLabReport' }).exists()).toBe(false)
    // Nor the one that reads every other firm's activity.
    expect(tabLabels(wrapper)).not.toContain('mentorAdoption.tab')
    expect(wrapper.findComponent({ name: 'MentorAdoption' }).exists()).toBe(false)
  })

  it('KEEPS both team tabs — they are a manager\'s view of their own advisers', async () => {
    // The other half of the 2026-08-09 change. Hiding these at mentor level must not
    // have hidden them here, which is the failure a shared component makes easy.
    const wrapper = await mountHub()
    expect(tabLabels(wrapper)).toContain('firmTeamProgress.tab')
    expect(tabLabels(wrapper)).toContain('Team Case Studies')
    expect(wrapper.findComponent({ name: 'FirmTeamProgress' }).exists()).toBe(true)
  })
})

describe('FirmManagerHub — mentor scope', () => {
  it('shows the Mentor Hub heading, with no firm id beneath it', async () => {
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(wrapper.find('.level-left .title').text()).toBe('Mentor Hub')
    // There is no one firm at this tier, so the line that names one must not render
    // an empty grey strap under the heading. Scoped to the page header deliberately —
    // `.subtitle` is Bulma's, and several tab bodies use it further down the screen.
    expect(wrapper.find('.level-left .subtitle').exists()).toBe(false)
  })

  it('drops the back-to-advisor link — the mentor sits above every firm', async () => {
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(wrapper.find('a[href="/advisor"]').exists()).toBe(false)
  })

  it('adds the Case Reviews tab', async () => {
    const labels = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))
    expect(labels).toContain('Case Reviews')
  })

  it('adds the Logic Lab Report tab, and mounts it', async () => {
    // The addition that makes this the Mentor Hub rather than a re-scoped copy
    // (design/MENTOR-AI-HUB-STUB.md, and the mockup Mike approved 2026-08-04).
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(tabLabels(wrapper)).toContain('logicLabReport.tab')
    expect(wrapper.findComponent({ name: 'MentorLogicLabReport' }).exists()).toBe(true)
  })

  it('adds the Template Check tab, and mounts it', async () => {
    // Mentor-only because a correction made here is meant to cascade to every
    // firm — a firm fixing its own copy is the opposite of the point.
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(tabLabels(wrapper)).toContain('templateCheck.tab')
    expect(wrapper.findComponent({ name: 'MentorTemplateCheck' }).exists()).toBe(true)
  })

  it('shows Advisory Distinctions exactly once — the plain-CRUD one, not the firm form', async () => {
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(tabLabels(wrapper).filter(l => l === 'Advisory Distinctions')).toHaveLength(1)
    expect(wrapper.findComponent({ name: 'MentorDistinctions' }).exists()).toBe(true)
    // The firm's version carries decline / override / reset-to-platform, which need a
    // layer above to mean anything. Its form must not be on this screen at all.
    expect(wrapper.findComponent({ name: 'FirmDistinctionForm' }).exists()).toBe(false)
  })

  it('mounts the cross-firm case reader', async () => {
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(wrapper.findComponent({ name: 'MentorReview' }).exists()).toBe(true)
  })

  it('DROPS Team Progress — a mentor has no advisers, and names must not travel up', async () => {
    // Before 2026-08-09 this tab rendered empty at mentor level, which read as a
    // broken screen. Widening it was the obvious fix and the wrong one: it lists a
    // firm's advisers BY NAME. Hidden, and replaced by the adoption tab below.
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(tabLabels(wrapper)).not.toContain('firmTeamProgress.tab')
    // The body must not be mounted either, or the mentor's browser is calling a
    // firm-scoped route with no firm and showing whatever comes back.
    expect(wrapper.findComponent({ name: 'FirmTeamProgress' }).exists()).toBe(false)
  })

  it('DROPS Team Case Studies — the consent-gated version is already beside it', async () => {
    // Rolling this up would have shown a mentor every firm's shared cases without
    // the anonymise-and-approve step that the Case Reviews tab depends on.
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(tabLabels(wrapper)).not.toContain('Team Case Studies')
    expect(wrapper.findComponent({ name: 'MentorReview' }).exists()).toBe(true)
  })

  it('does not fetch the firm-scoped case feed at all', async () => {
    // Presence of the tab is the visible half. The mounted hook called this route
    // unconditionally, so at mentor level it fired a firm-scoped request with no
    // firm — and a failure there raises a red toast over a Hub where nothing is wrong.
    await mountHub({ scope: 'mentor', firmId: '' })
    const called = global.fetch.mock.calls.map(c => String(c[0]))
    expect(called.some(u => u.includes('/api/firm-manager/cases'))).toBe(false)
  })

  it('adds the adoption tab, and mounts it', async () => {
    // Design: design/mockups/mentor-adoption-view.html, ruled by Mike 2026-08-09.
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(tabLabels(wrapper)).toContain('mentorAdoption.tab')
    expect(wrapper.findComponent({ name: 'MentorAdoption' }).exists()).toBe(true)
  })

  it('rejects a scope that is neither tier', () => {
    const validator = FirmManagerHub.props.scope.validator
    expect(validator('firm')).toBe(true)
    expect(validator('mentor')).toBe(true)
    expect(validator('group_manager')).toBe(false)
  })
})

describe('the two tiers are recognisably the same screen', () => {
  // The ruling is not "the mentor gets a superset of the tabs" — it is that a person
  // who knows the firm screen recognises the mentor screen. Shared tabs arriving in a
  // different order at each tier breaks that quietly, and no other test would notice.
  //
  // ⚠ AMENDED 2026-08-09. Until then the mentor screen WAS a strict superset, and this
  // test asserted it. Two tabs are now firm-only, and that is a ruling rather than a
  // regression: both are a manager's view of THEIR OWN ADVISERS BY NAME, which is the
  // one thing that must not travel up a tier. They are listed by name below so the
  // exception stays small and visible — a growing list here means the "same screen"
  // claim is being eroded a tab at a time, which is exactly what this file is for.
  //
  // ⚠ AMENDED AGAIN 2026-08-18, and the list is now THREE. Property Tax Rules is firm-only
  // for a DIFFERENT reason from the two above, which is why it gets its own sentence rather
  // than joining their line: it is not a view of named advisers, it is a country's tax
  // settings. Ruled by Mike 2026-08-17 (MULTIPLE-PROPERTY-ASSESSMENT.md §8 Q6) — a group is
  // normally a country, so a group sets these and a firm may correct them. Option (c), the
  // platform seeding New Zealand first, was put to him and turned down: the mentor has no
  // country of its own to speak for, and the New Zealand base ships in
  // data/property-tax-rules.json rather than being edited from a screen.
  //
  // 🔴 The tab IS also shown to the global and group tiers (TAB_TIERS.propertyTaxRules), so
  // it is firm-only relative to the MENTOR alone. This file compares those two scopes only.
  //
  // ⚠ THIS LIST IS IN MENU ORDER, not in the order the exceptions were ruled on. The
  // second assertion below compares it against `firm.filter(...)`, which comes off the
  // screen in the order the names are drawn, so appending a new one is wrong whenever
  // its entry does not sit last.
  //
  // ⚠ REORDERED 2026-08-19 by the sidebar, and this is the trap the design file warned
  // about (HUB-NAVIGATION-GROUPING.md §6). Grouping moved Property Tax Rules from third
  // to LAST of the three — it is the whole of "Model Inputs", which sits after "Your Team
  // In Action". Nothing about the ruling changed; only where the name is drawn.
  //
  // ⚠ AMENDED 2026-09-01, and the list is now FOUR. `firmTemplateLibrary.tab` is the
  // firm's OWN template upload (SEARCH-CONTENT-CASCADE-PLAN.md Phase 3 §7, Mike's yes
  // 2026-09-01, item 4.55) — firm-only because since Phase 2 the nearest tier's upload
  // wins the whole library, and a firm is the tier with a real reason to hold its own
  // set. It sits FIRST here because it is drawn in "Your AI coach", the first group,
  // while the other three sit in later groups — menu order, per the note above.
  //
  // ⚠ AMENDED 2026-09-10, and the list is now FIVE. `Client Copy Request` is Mike's own tab
  // name (ruling 9 of design/mockups/client-record-request.html) for a client asking for a
  // copy of what was recorded about them. 🔴 IT IS FIRM-ONLY IN A DIFFERENT SENSE FROM EVERY
  // OTHER ENTRY HERE: the others are narrow for economy and gain a tier the moment one has a
  // reason, while this one can never gain a tier at all — Brief P13 keeps everything derived
  // from a recorded meeting inside the firm it came from, so cascading it upward would break
  // the promise a named client heard spoken. It sits SECOND because it is drawn immediately
  // after Meeting Review in "Your AI coach", the first group — menu order, per the note above.
  //
  // ⚠ AMENDED 2026-09-11, and the list is now SIX. `outcomeConsent.tab` is the firm's Outcome
  // Sharing switch (item 4.87, Mike 2026-09-10: "on a hub page at the firm tier"). Firm-only
  // as a stated judgement: consent is the firm's own undertaking, and the tiers above
  // contribute no reviews and receive no adjustment. It sits LAST because it is appended to
  // the Compliance group, the last heading the firm sees — menu order, per the note above.
  // ⚠ AMENDED 2026-09-22, and the list is now EIGHT. `Team Pipeline` and `Sales Tracker
  // Lists` are the Sales Tracker's manager half (item 17 stage 4, on Mike's ask: "make sure
  // the firm manager hub is running too - so i can see the lists and report"). Firm-only as
  // a stated judgement: both read `va_sales_pipeline`, whose every row carries one firm_id,
  // so the mentor has no advisors of its own selling and no prospect list to hold. They sit
  // after `Team Case Studies` because both are appended to "Your Team In Action", where
  // Session Processes already sits — menu order, per the note above.
  // ⚠ AMENDED 2026-09-23, and the list is now NINE. `firmCurrency.tab` is the currency
  // picker's new home (item 13.3, Mike 2026-09-22 — it was the one manager-gated setting
  // living outside the Hub). FIRM-ONLY as a stated judgement: the mentor has no currency of
  // its own, and a brand or a country has no single value to hold for firms that may report
  // in different ones. It sits LAST because it is appended to "Model Inputs" — menu order,
  // per the note above. 🔴 It does NOT leave the Model Library: Mike ruled on 2026-09-23
  // that the picker appears in BOTH, the Hub to set it and the library read-only, so a
  // reader can still tell which currency a report is in.
  const FIRM_ONLY = ['firmTemplateLibrary.tab', 'Client Copy Request', 'firmTeamProgress.tab', 'Team Case Studies', 'Team Pipeline', 'Sales Tracker Lists', 'Property Tax Rules', 'firmCurrency.tab', 'outcomeConsent.tab']
  // `templateLibrary.tab` — Mike, 2026-08-31 (SEARCH-CONTENT-CASCADE-PLAN.md Phase 1):
  // the master export upload, mentor-only beside Template Check, drawn last in the menu.
  //
  // ⚠ `Forecast Trend Thresholds` IS MENTOR-ONLY BUT IS **NOT** IN THE TAIL, and that is
  // why there are two lists below rather than one. Every other mentor-only tab sits under
  // "Rolled up from below", the last heading; this one sits under "Model Inputs", which
  // comes before it (Mike, 2026-09-03, item 4.61b — the bands the forecast's two-year
  // trend read draws, mentor-only per the default of 2026-08-24). The old single list
  // conflated "mentor-only" with "at the end of the menu", which was true until today.
  //
  // ⚠ AMENDED 2026-09-04: `Imported Stock Prices` joins it, for the same structural reason.
  // It is the price ladder imported stock sells down at as it ages (Mike, 2026-09-04, item
  // 4.64 — the tab's name is his), and it sits beside `Forecast Trend Thresholds` under
  // "Model Inputs", not in the tail. Mentor-only per the same default of 2026-08-24.
  //
  // ⚠ AMENDED 2026-09-11: `outcomeLearning.tab` joins the tail — the mentor's Outcome Learning
  // page (item 4.87, Mike 2026-09-10: "It surfaces on the Mentor Hub first"), drawn last under
  // "Rolled up from below" beside Case Reviews and Template Check because it is the same kind
  // of thing: what the firms' reviews add up to. Mentor-only by design (spec FR-014).
  //
  // ⚠ AMENDED 2026-09-16: `semanticProfiles.tab` joins the tail, BESIDE `templateLibrary.tab`
  // rather than at the end — item 4.97 / 7.2 US9, and the drawing places it there because the
  // two are one object from two sides: the library is what a template IS, the profile is what
  // it ANSWERS. Mentor-only as a stated judgement (a profile says what a tool is FOR, which
  // does not vary by firm). Built READ-ONLY on Mike's ruling of 2026-09-16.
  //
  // 🔴 AMENDED 2026-09-23, AND THE SHAPE OF THIS CHANGED RATHER THAN ITS LENGTH.
  // `modelChoices.tab` is appended at the END of "Rolled up from below" (item 7.5,
  // Decision 3, Mike 2026-09-16) and it is NOT mentor-only — it is all four tiers,
  // because Decision 2 put the firm and the advisor on every row, which gave a firm
  // manager their own rows to read.
  //
  // So the LAST tab in the menu is no longer a mentor-only one, which is the assumption
  // the tail test below was built on. The tail is therefore taken as the mentor-only run
  // ENDING AT modelChoices rather than at the end of the list — `sliceEnd` below. This is
  // the first time a shared tab has sat under this heading, and it is also why a FIRM
  // MANAGER now sees the heading "Rolled up from below" for the first time: the other
  // three entries all stop at the group tier. Named on the drawing before it was found.
  const MENTOR_ONLY_TAIL = ['mentorAdoption.tab', 'logicLabReport.tab', 'Case Reviews', 'templateCheck.tab', 'templateLibrary.tab', 'semanticProfiles.tab', 'outcomeLearning.tab']

  /** Tabs every tier sees that sit AFTER the mentor-only run, newest last. */
  const SHARED_AFTER_TAIL = ['modelChoices.tab']
  //
  // ⚠ AMENDED 2026-09-08: `Industry Benchmarks` joins it — the Stats NZ benchmarker release in
  // force and the two-file upload that replaces it (Mike, 2026-09-08, item 4.70 stage 3; the
  // tab's name is the approved drawing's). Under "Model Inputs" beside the two above. Mentor-only
  // by DESIGN rather than by default: one national table, and no firm has a different Stats NZ.
  const MENTOR_ONLY = ['Forecast Trend Thresholds', 'Imported Stock Prices', 'Industry Benchmarks'].concat(MENTOR_ONLY_TAIL)

  /**
   * A selector that matches nothing makes every comparison below succeed against an
   * empty list. Assert the menu is genuinely on the screen before trusting a word of it.
   *
   * @param {string[]} labels - what tabLabels() returned
   */
  function assertMenuIsReallyThere (labels) {
    expect(labels.length).toBeGreaterThan(8)
    expect(labels).toContain('Domain Support')
  }

  it('presents every shared tab in the same order at both scopes', async () => {
    const firm = tabLabels(await mountHub())
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))
    assertMenuIsReallyThere(firm)
    assertMenuIsReallyThere(mentor)

    const sharedInMentor = mentor.filter(l => !MENTOR_ONLY.includes(l))
    const sharedInFirm = firm.filter(l => !FIRM_ONLY.includes(l))

    expect(sharedInMentor).toEqual(sharedInFirm)
  })

  it('the tier-only exceptions are exactly the ones ruled on, and no others', async () => {
    // The guard on the guard. Without this, a future tab quietly added to one tier
    // only would be absorbed by widening the lists above and nothing would object.
    const firm = tabLabels(await mountHub())
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))
    assertMenuIsReallyThere(firm)
    assertMenuIsReallyThere(mentor)

    expect(firm.filter(l => !mentor.includes(l))).toEqual(FIRM_ONLY)
    expect(mentor.filter(l => !firm.includes(l)).sort()).toEqual([...MENTOR_ONLY].sort())
  })

  it('adds the rolled-up mentor-only tabs at the end, so the shared run is uninterrupted', async () => {
    // The roll-up tabs all sit under "Rolled up from below", the last heading — so that
    // run is the tail of the menu rather than names scattered through a band of twelve.
    // (Sliced by the list's own length: the hardcoded -4 turned this into a count
    // pin that broke the day a fifth mentor-only tab was ruled on.)
    //
    // ⚠ SINCE 2026-09-23 THE RUN NO LONGER REACHES THE END OF THE MENU. Model Choices is
    // appended after it and every tier sees it, so the slice stops where that begins —
    // taken from the list's own length rather than a number, for the same reason the -4
    // above was removed.
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))
    const sliceEnd = mentor.length - SHARED_AFTER_TAIL.length
    expect(mentor.slice(sliceEnd - MENTOR_ONLY_TAIL.length, sliceEnd)).toEqual(MENTOR_ONLY_TAIL)
    // And the shared tabs really are after it, rather than the slice above having
    // silently matched an earlier run of the same names.
    expect(mentor.slice(sliceEnd)).toEqual(SHARED_AFTER_TAIL)
  })
})

describe('the hub menu — the sidebar itself', () => {
  // design/HUB-NAVIGATION-GROUPING.md, approved by Mike 2026-08-19. These pin the three
  // claims the menu makes that nothing else in the suite can see.

  /** The group headings the hub is showing, in order. */
  function groupHeadings (wrapper) {
    return wrapper.findAll('.hub-menu .menu-label').wrappers.map(p => p.text().trim())
  }

  it('groups the firm manager’s tabs under the headings NAV_GROUPS gives them', async () => {
    // Was eleven until 2026-08-20, when the Coaching Reference tab was removed with the
    // fifteen platform rows behind it (item 4.24, Mike: "remove the tab") — ten. Back to
    // eleven on 2026-08-22, when AI Prompts joined "Your AI coach" (item 4.28, Mike
    // 2026-08-21, naming all four manager tiers). THIRTEEN on 2026-09-01, when the two
    // machines each appended one to that same group on the same day: the firm's own
    // Template Library (item 4.55, Phase 3 §7) and Meeting Review's observation points
    // (Mike asked for the feature and approved its drawing that day). Template Library
    // reached master first, so it holds index 6 and Meeting Review follows at 7.
    //
    // FOURTEEN on 2026-09-09, when Depreciation Rates was appended to Model Inputs (item
    // 4.78). Mike ruled it onto all four manager tiers on 2026-09-08 — the firm owns it and
    // "it cant be reliant on the group manager". Appended at the end of that group, so the
    // three index assertions below are untouched, which is the point of appending.
    //
    // FIFTEEN the same day, when Tax Rates followed it into Model Inputs (item 4.81) — the
    // same request of Mike's and the same country table, kept a SEPARATE tab because he had
    // renamed the one above it hours earlier so that a tab's name predicts what is inside it.
    // Appended again, so the three index assertions below are untouched again.
    //
    // SIXTEEN on 2026-09-10, when Client Copy Request was appended to "Your AI coach" — a
    // client asking for a copy of what was recorded about them, asked for by Mike that day
    // and named by him. ⚠ IT IS THE FIRST ADDITION TO THIS GROUP SINCE MEETING REVIEW, so it
    // takes index 8 and the three assertions below are untouched once more. The group heading
    // is a poor fit and that is stated in NAV_GROUPS rather than papered over: this feature
    // uses no AI at all, and it sits there because it is entirely about meeting records and
    // is where somebody would look for it.
    //
    // 🔴 SEVENTEEN ON 2026-09-10, AND THE FIRST NEW HEADING SINCE THE MENU WAS APPROVED.
    // Compliance (item 4.83) was named onto all four manager tiers by Mike that day, with
    // the cascade asked for in the same sentence. None of the four existing headings is true
    // of it, so a fifth is added at the end — after Model Inputs and before the roll-up, which
    // the firm never sees.
    //
    // ⚠ THE HEADING IS "COMPLIANCE", NOT THE DRAWING'S "YOUR FIRM". It was built as the
    // drawing had it and then found to break the rule one heading down — a heading has to be
    // true at every tier that sees it, and a mentor has no firm. Mike ruled for his own pinned
    // word the same day. ⚠ ADVISER NETWORK IS NOT MOVED INTO IT, though the drawing's sidebar
    // shows it there: it has been under "Your Team In Action" since 2026-08-19 and moving it
    // would move something already on a manager's screen.
    //
    // EIGHTEEN on 2026-09-11, when Outcome Sharing was appended to Compliance (item 4.87) —
    // the firm's consent to pool its anonymised template outcomes, asked for by Mike on
    // 2026-09-10 for the firm tier alone and drawn beside Compliance because consent is a
    // firm's own undertaking in the same way its declaration is. Appended at the end of the
    // last group the firm sees, so the four index assertions below are untouched.
    //
    // 🔴 A FIFTH HEADING SINCE 2026-09-23, AND IT IS THE FIRST TIME A FIRM MANAGER HAS EVER
    // SEEN "Rolled up from below". Model Choices (item 7.5) was ruled onto all four manager
    // tiers by Mike on 2026-09-16 — Decision 3, which REVERSED the mentor-alone recommendation
    // once Decision 2 gave each tier its own rows to read. Every other entry under that heading
    // stops at the group tier, which is why the heading has never appeared here before.
    //
    // ⚠ IT IS ACCURATE RATHER THAN CONVENIENT — the rows ARE rolled up from a firm manager's
    // own advisors — and it was named on the drawing before it was found, and put to Mike as
    // a visible change to a firm manager's hub. It is appended LAST, so nothing already on
    // their screen moved.
    const wrapper = await mountHub()
    expect(groupHeadings(wrapper)).toEqual([
      'Your AI coach', 'Your Team In Action', 'Model Inputs', 'Compliance', 'Rolled up from below'
    ])
    //
    // ⚠ 19 SINCE 2026-09-21, when Session Processes joined (item 15.1, Decision C — Mike
    // ruled all four manager tiers, against the mentor-alone default he was offered). It is
    // appended to the END of "Your Team In Action", so the four index assertions below are
    // untouched, which is what "appended" is asserted to mean here.
    //
    // ⚠ 21 SINCE 2026-09-22, when the Sales Tracker's two manager screens joined — Team
    // Pipeline and Sales Tracker Lists (item 17 stage 4, Mike: "so i can see the lists and
    // report"). Both appended to the END of the same group, for the same reason: appending
    // moves nothing already on a manager's screen, and the index assertions below still hold.
    //
    // ⚠ 22 SINCE 2026-09-23, when Model Choices joined (item 7.5, Decision 3 — all four
    // manager tiers). Appended as the very last tab, under a heading the firm sees for the
    // first time, so the four index assertions below are untouched once again.
    //
    // ⚠ AND 23 THE SAME DAY, when Currency joined the END of "Model Inputs" (item 13.3 —
    // the one manager-gated setting that was living outside the Hub, on Mike's ask of
    // 2026-09-22). Firm-only, appended again, so the four index assertions still hold.
    //
    // ⚠ AND 24, when Staff Register Retention joined the END of "Compliance" (item 5.1,
    // Decision 8 — Mike's ruling of 2026-09-23, all four tiers in his own words). Under
    // Compliance rather than Model Inputs because it is a records-retention policy about
    // personal data, not a figure any model reads. Appended once more.
    //
    // ⚠ AND 25 ON 2026-09-24, when Owner Focus Tasks joined the END of "Model Inputs" (item
    // 5.3 — all four tiers in Mike's own words). Appended, so the index assertions still hold.
    expect(tabLabels(wrapper)).toHaveLength(25)
    // Appended, not inserted: nothing already on a manager's screen moved to make room.
    // Each addition is checked in place, because "appended" is only true of the LAST one
    // added unless every one before it is still where it was.
    expect(tabLabels(wrapper)[5]).toBe('AI Prompts')
    expect(tabLabels(wrapper)[6]).toBe('firmTemplateLibrary.tab')
    expect(tabLabels(wrapper)[7]).toBe('Meeting Review')
    expect(tabLabels(wrapper)[8]).toBe('Client Copy Request')
  })

  it('gives the mentor a Model Inputs heading holding only what it is entitled to', async () => {
    // ⚠ THIS TEST SAID THE OPPOSITE UNTIL 2026-09-03, and the change is a ruling rather
    // than a regression. The mentor had NO Model Inputs heading because the only thing in
    // that group — Property Tax Rules — is gated to the tiers with a layer above them.
    // Forecast Trend Thresholds joined the group that day (Mike, item 4.61b) and is
    // mentor-only, so the heading now appears for the mentor and holds exactly that one
    // entry, while Property Tax Rules stays absent.
    //
    // The rule the old test was really protecting — an empty group is DROPPED, not drawn
    // empty, because one gap in a list of twelve reads as a bug — is unchanged and is
    // still covered: the FIRM sees no Property Tax Rules entry under Model Inputs it is
    // not entitled to, and a group with nothing in it never renders.
    //
    // ⚠ THIS PARAGRAPH USED TO CITE "the firm sees no 'Rolled up from below' heading at
    // all" as the proof, and that stopped being true on 2026-09-23 when Model Choices was
    // built onto all four tiers (item 7.5, Mike's Decision 3 of 2026-09-16). The mechanism
    // it was pointing at is unchanged; the example was replaced rather than annotated.
    //
    // ⚠ A "Compliance" HEADING JOINED THE LIST ON 2026-09-10 with the tab of the same name
    // (item 4.83), which Mike named onto all four tiers. It is drawn at the mentor too,
    // because the mentor is where the cascade starts and it publishes from this same screen —
    // and the heading reads correctly here, which is exactly why he chose that word over the
    // drawing's "Your firm".
    const wrapper = await mountHub({ scope: 'mentor', firmId: '' })
    expect(groupHeadings(wrapper)).toEqual([
      'Your AI coach', 'Your Team In Action', 'Model Inputs', 'Compliance', 'Rolled up from below'
    ])
    const names = tabLabels(wrapper)
    expect(names).toContain('Forecast Trend Thresholds')
    expect(names).not.toContain('Property Tax Rules')
  })

  it('🔴 keeps the five that teach the AI in ONE group', async () => {
    // Mike rejected a two-way split on sight: it "sends the message that AI is not
    // working across the logic tables and advisory staircase — which is NOT true".
    // server/advisorEngine.js, the prompt builder, loads all of them. A heading implying
    // otherwise is a permanent falsehood taught from the navigation, and no other test
    // in this suite could ever catch it — the split was internally consistent.
    //
    // ⚠ SIX UNTIL 2026-08-20. Coaching Reference left this group when item 4.24 removed
    // the block behind it; the rule is unchanged and the count follows the group.
    const wrapper = await mountHub()
    const headings = groupHeadings(wrapper)
    const names = tabLabels(wrapper)
    expect(headings.filter(h => /coach/i.test(h))).toHaveLength(1)
    expect(names.slice(0, 5)).toEqual([
      'Domain Support', 'Advisory Distinctions',
      'Logic Tables', 'Advisory Staircase', 'Logic-Lab'
    ])
  })

  it('every menu entry has a panel behind it, and no panel is unreachable', async () => {
    // The one thing the split between NAV_GROUPS and the panels can get wrong. The
    // panels no longer sit in menu order, so nothing about reading the file reveals a
    // name pointing at a panel that is not there, or a panel with no way in.
    const wrapper = await mountHub()
    const keys = wrapper.findAll('.hub-menu a[data-tab]').wrappers.map(a => a.attributes('data-tab'))
    for (const key of keys) {
      expect(wrapper.vm.tabVisible(key)).toBe(true)
    }
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('🔴 a group manager no longer sees the same cases under two names', async () => {
    // Decision 5, approved by Mike 2026-08-19. Above the firm, Team Case Studies and
    // Case Reviews returned the identical list — same store call, same scope, same
    // decoration. The counts here were the approved design's own
    // (design/HUB-NAVIGATION-GROUPING.md §2: "group and global 4 / 13"), asserted off
    // the screen rather than off the matrix, because the matrix is what the design
    // predicted and this is what a manager actually gets.
    //
    // ⚠ WENT TO 12 ON 2026-08-20, when the Coaching Reference tab was removed (item
    // 4.24), and back to the design's 13 on 2026-08-22, when AI Prompts joined (item
    // 4.28) — the same number by a different route, as has now happened twice here.
    // The headings are unchanged throughout; only entries within them have moved.
    //
    // ⚠ AND TO 14 ON 2026-09-02, when Meeting Review's observation points were widened
    // to all four manager tiers on Mike's instruction — the points "cascade down to
    // global group and group manager before firm manager, they accept or edit". This
    // is the first entry to exceed the approved design's 13, and it is a ruling of his
    // rather than drift, which is why the number moves rather than the tab.
    //
    // ⚠ AND TO 15 ON 2026-09-09, when Depreciation Rates joined Model Inputs (item 4.78).
    // Mike ruled it onto all four manager tiers on 2026-09-08 — the firm owns it and "it
    // cant be reliant on the group manager" — so, like Meeting Review above, the number
    // moves because he ruled, not because anything drifted.
    //
    // ⚠ AND TO 16 THE SAME DAY, when Tax Rates joined Model Inputs beside it (item 4.81) —
    // the same request of his, the same country table underneath, and a separate tab because
    // he renamed Depreciation Rates that day precisely so a tab's name would predict what is
    // inside it. Again his ruling, again not drift.
    //
    // ⚠ AND TO 17 ON 2026-09-10, when Compliance arrived under a heading of its own (item
    // 4.83) — named onto all four manager tiers by Mike, with the cascade asked for in the
    // same sentence. His ruling again, and the first time a HEADING has moved rather than an
    // entry within one.
    //
    // ⚠ AND TO 18 ON 2026-09-21, when Session Processes joined "Your Team In Action" (item
    // 15.1, Decision C). Mike ruled all four manager tiers, against the mentor-alone default
    // he was offered, because a firm's planning method is what one firm does differently.
    // His ruling again, and appended rather than inserted.
    //
    // ⚠ AND TO 19 ON 2026-09-23, when Model Choices joined the END of "Rolled up from below"
    // (item 7.5, Decision 3 — Mike ruled all four manager tiers on 2026-09-16, reversing the
    // mentor-alone recommendation once each tier had its own rows to read). His ruling again,
    // and appended rather than inserted: this group manager's existing eighteen have not moved.
    //
    // ⚠ AND TO 20 THE SAME DAY, when Staff Register Retention joined the END of "Compliance"
    // (item 5.1, Decision 8 — all four tiers in Mike's own words, 2026-09-23). A middle tier
    // gains it because a brand or a country genuinely holds a records policy, which is what
    // separates this from Currency, where neither middle tier has one value to hold.
    const wrapper = await mountHub({ scope: 'group' })
    expect(groupHeadings(wrapper)).toEqual([
      'Your AI coach', 'Your Team In Action', 'Model Inputs', 'Compliance', 'Rolled up from below'
    ])
    // ⚠ AND 21 ON 2026-09-24: Owner Focus Tasks, appended to the END of "Model Inputs" (item
    // 5.3), on all four tiers in Mike's own words.
    expect(tabLabels(wrapper)).toHaveLength(21)
    expect(tabLabels(wrapper)).not.toContain('Team Case Studies')
    expect(tabLabels(wrapper)).toContain('Case Reviews')
  })

  it('the firm keeps its own version — a different screen, not the same one', async () => {
    // listSharedForFirm, their own advisors in full and not anonymised. Dropping it
    // here too would have removed a screen rather than a duplicate.
    const wrapper = await mountHub()
    expect(tabLabels(wrapper)).toContain('Team Case Studies')
    expect(tabLabels(wrapper)).not.toContain('Case Reviews')
  })

  it('🔴 the menu does not collapse itself when a tab is opened', async () => {
    // Ruled 2026-08-15: nothing moves under the owner's hand. Four tab bodies carry
    // their own left-hand list, and tidying the hub menu away to make room for one is
    // exactly the helpful side effect that ruling forbids.
    const wrapper = await mountHub()
    wrapper.findAll('.hub-menu a[data-tab]').wrappers
      .find(a => a.attributes('data-tab') === 'logicTables')
      .trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.activeTab).toBe('logicTables')
    expect(wrapper.vm.menuHidden).toBe(false)
    expect(wrapper.find('.hub-menu').exists()).toBe(true)
  })

  it('leaves the way back on screen when the manager hides it', async () => {
    // A control that hides its own means of return is a trap, not a preference.
    const wrapper = await mountHub()
    wrapper.vm.toggleMenu()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.hub-menu').exists()).toBe(false)
    expect(wrapper.find('.hub-menu-closed button').text().trim()).toBe('Show menu')
  })
})

describe('/mentor page', () => {
  // The page is four lines of wiring, and every one of them is a way to ship a Mentor
  // Hub that silently renders the firm's screen instead.
  async function mountPage () {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(MentorPage)
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('renders the hub at mentor scope, not at firm scope', async () => {
    const hub = (await mountPage()).findComponent({ name: 'FirmManagerHub' })
    expect(hub.exists()).toBe(true)
    expect(hub.props('scope')).toBe('mentor')
  })

  it('passes no firm id — there is no one firm at this tier', async () => {
    const hub = (await mountPage()).findComponent({ name: 'FirmManagerHub' })
    expect(hub.props('firmId')).toBe('')
  })

  it('authorises on localhost via the dev bypass, with the mentor role', async () => {
    // jsdom serves from localhost, which is the dev-only auto-login path. The role
    // matters: the hub gates its admin-only tab on it, so a blank role here would show
    // the mentor a narrower screen than the firm manager's.
    const wrapper = await mountPage()
    expect(wrapper.vm.authorised).toBe(true)
    expect(wrapper.vm.apiToken).toBe('dev-local-mentor')
    expect(wrapper.vm.userRole).toBe('platform_admin')
  })
})
