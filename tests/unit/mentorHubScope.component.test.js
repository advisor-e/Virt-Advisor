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
    // Presence of the tab is the visible half; the body must not be mounted either,
    // or a firm manager's browser is running the mentor's cross-firm case reader.
    expect(wrapper.findComponent({ name: 'MentorReview' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'MentorDistinctions' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'MentorTemplateCheck' }).exists()).toBe(false)
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
  it('presents every shared tab in the same order at both scopes', async () => {
    const firm = tabLabels(await mountHub())
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))

    const mentorOnly = ['Case Reviews', 'templateCheck.tab']
    const sharedInMentor = mentor.filter(l => !mentorOnly.includes(l))

    expect(sharedInMentor).toEqual(firm)
  })

  it('adds the mentor-only tabs at the end, so the shared run is uninterrupted', async () => {
    const mentor = tabLabels(await mountHub({ scope: 'mentor', firmId: '' }))
    expect(mentor.slice(-2)).toEqual(['templateCheck.tab', 'Case Reviews'])
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
