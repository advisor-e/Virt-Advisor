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

/** Every tab label the hub is currently showing, in the order they appear. */
function tabLabels (wrapper) {
  return wrapper.findAll('nav.tabs li').wrappers.map(li => li.text().trim())
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
  const FIRM_ONLY = ['firmTeamProgress.tab', 'Team Case Studies']
  const MENTOR_ONLY = ['mentorAdoption.tab', 'Case Reviews', 'templateCheck.tab', 'logicLabReport.tab']

  it('presents every shared tab in the same order at both scopes', async () => {
    const firm = tabLabels(await mountHub())
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))

    const sharedInMentor = mentor.filter(l => !MENTOR_ONLY.includes(l))
    const sharedInFirm = firm.filter(l => !FIRM_ONLY.includes(l))

    expect(sharedInMentor).toEqual(sharedInFirm)
  })

  it('the tier-only exceptions are exactly the ones ruled on, and no others', async () => {
    // The guard on the guard. Without this, a future tab quietly added to one tier
    // only would be absorbed by widening the lists above and nothing would object.
    const firm = tabLabels(await mountHub())
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))

    expect(firm.filter(l => !mentor.includes(l))).toEqual(FIRM_ONLY)
    expect(mentor.filter(l => !firm.includes(l)).sort()).toEqual([...MENTOR_ONLY].sort())
  })

  it('adds the mentor-only tabs at the end, so the shared run is uninterrupted', async () => {
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))
    expect(mentor.slice(-3)).toEqual(['logicLabReport.tab', 'templateCheck.tab', 'Case Reviews'])
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
