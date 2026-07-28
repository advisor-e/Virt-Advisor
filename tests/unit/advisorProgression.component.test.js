/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const AdvisorProgression = require('~/components/AdvisorProgression.vue').default

/**
 * Component tests for "My Progress" — an advisor's own capability record.
 *
 * This screen has been live and completely untested. These are its first tests,
 * written alongside the removal of the firm-wide team table that used to share the
 * component (it now lives in the Firm Manager Hub as FirmTeamProgress.vue).
 *
 * Two deliberate choices about HOW these assert:
 *
 * 1. **Structure and numbers, not sentences.** Every string on this screen is still
 *    hardcoded English — the i18n sweep is a separate open task (design/ACTIONS.md).
 *    Assertions therefore target elements and figures, so the sweep moves the wording
 *    without turning this file red. Where a message must be pinned, its element is
 *    pinned, not its words.
 * 2. **Empty and broken are checked apart.** A record that could not be READ must
 *    never render as an advisor who has simply done nothing — that equivalence is
 *    what hid this feature's only real defect until 2026-07-29.
 */

const ZERO = { vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null }

/** A full tiers object with only the named tiers filled in. */
function tiers (filled) {
  return {
    'entry-level': Object.assign({}, ZERO, (filled || {}).entryLevel),
    intermediate: Object.assign({}, ZERO, (filled || {}).intermediate),
    advanced: Object.assign({}, ZERO, (filled || {}).advanced)
  }
}

function stubFetch (result) {
  global.fetch = jest.fn(() => {
    if (result.reject) { return Promise.reject(new Error('network down')) }
    return Promise.resolve({
      ok: result.ok !== false,
      json: () => Promise.resolve(result.body)
    })
  })
}

async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountScreen (result) {
  stubFetch(result || { body: { success: true, tiers: tiers(), recentActivity: [] } })
  const wrapper = mountWithBuefy(AdvisorProgression, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('reading the advisor\'s own record', () => {
  test('asks the progression route with the bearer token', async () => {
    await mountScreen()
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/activity/progression')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  test('never asks for an advisor by name — the token decides whose record this is', async () => {
    // The advisorId prop is for display only. If it ever reached the request, an
    // advisor could read a colleague's record by changing it.
    stubFetch({ body: { success: true, tiers: tiers(), recentActivity: [] } })
    const wrapper = mountWithBuefy(AdvisorProgression, {
      propsData: { apiToken: 'test-token', advisorId: 'someone-else', firmId: 'another-firm' }
    })
    await settle(wrapper)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/activity/progression')
    expect(url).not.toContain('someone-else')
    expect(url).not.toContain('another-firm')
    expect(opts.body).toBeUndefined()
  })
})

describe('the three capability levels', () => {
  const withActivity = {
    body: {
      success: true,
      tiers: tiers({
        entryLevel: { vaSessions: 4, courseSessions: 2, avgQuizScore: 72, lastActive: '2026-07-28T10:00:00Z' },
        advanced: { vaSessions: 1, courseSessions: 0, avgQuizScore: null, lastActive: '2026-07-20T10:00:00Z' }
      }),
      recentActivity: []
    }
  }

  test('renders one card per level, always all three', async () => {
    const wrapper = await mountScreen(withActivity)
    expect(wrapper.findAll('.prog-tier-card').length).toBe(3)
  })

  test('shows each level\'s own counts, not a total', async () => {
    const wrapper = await mountScreen(withActivity)
    const entry = wrapper.findAll('.prog-tier-card').at(0)
    const figures = entry.findAll('.prog-stat-num').wrappers.map(w => w.text())
    expect(figures).toEqual(['4', '2', '72%'])
  })

  test('a level with sessions but no scored quiz shows a dash, never 0%', async () => {
    const wrapper = await mountScreen(withActivity)
    const advanced = wrapper.findAll('.prog-tier-card').at(2)
    const figures = advanced.findAll('.prog-stat-num').wrappers.map(w => w.text())
    expect(figures).toEqual(['1', '0', '—'])
  })

  test('a level that has never been used says so instead of showing a date', async () => {
    const wrapper = await mountScreen(withActivity)
    const cards = wrapper.findAll('.prog-tier-card')
    expect(cards.at(0).find('.prog-last-active').exists()).toBe(true)
    expect(cards.at(1).find('.prog-last-active').exists()).toBe(false)
    expect(cards.at(1).find('.prog-no-activity').exists()).toBe(true)
  })
})

describe('recent activity', () => {
  const recent = {
    body: {
      success: true,
      tiers: tiers({ entryLevel: { vaSessions: 1, courseSessions: 1 } }),
      recentActivity: [
        { type: 'course', courseTitle: 'Cashflow Rescue', sessionTitle: 'Session 2', quizScore: 73, tier: 'entry-level', completedAt: '2026-07-28T10:00:00Z' },
        { type: 'va', domain: 'profit', tier: 'entry-level', completedAt: '2026-07-27T10:00:00Z' }
      ]
    }
  }

  test('lists the entries the backend sent, in the order it sent them', async () => {
    const wrapper = await mountScreen(recent)
    const rows = wrapper.findAll('.prog-activity-row')
    expect(rows.length).toBe(2)
    expect(rows.at(0).find('.prog-activity-title').text()).toBe('Cashflow Rescue')
    expect(rows.at(1).find('.prog-activity-title').text()).toBe('Profitability')
  })

  test('names the advisory area in plain English, not its internal code', async () => {
    const wrapper = await mountScreen(recent)
    expect(wrapper.text()).toContain('Profitability')
    expect(wrapper.text()).not.toContain('profit')
  })

  test('an unmapped area falls back to the code rather than rendering blank', async () => {
    const wrapper = await mountScreen({
      body: {
        success: true,
        tiers: tiers({ entryLevel: { vaSessions: 1 } }),
        recentActivity: [{ type: 'va', domain: 'brand-new-area', tier: 'entry-level', completedAt: '2026-07-28T10:00:00Z' }]
      }
    })
    expect(wrapper.find('.prog-activity-title').text()).toBe('brand-new-area')
  })

  test('is absent entirely when there is nothing to list', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.find('.prog-recent').exists()).toBe(false)
  })
})

describe('a new advisor and a broken record look different', () => {
  test('no activity shows the encouraging notice, the tier cards, and no error', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.find('.prog-empty-notice').exists()).toBe(true)
    expect(wrapper.findAll('.prog-tier-card').length).toBe(3)
    expect(wrapper.find('.prog-error').exists()).toBe(false)
  })

  test('the notice disappears as soon as there is any activity', async () => {
    const wrapper = await mountScreen({
      body: { success: true, tiers: tiers({ advanced: { courseSessions: 1 } }), recentActivity: [] }
    })
    expect(wrapper.find('.prog-empty-notice').exists()).toBe(false)
  })

  const failures = [
    ['an HTTP error', { ok: false, body: {} }],
    ['no network at all', { reject: true }],
    ['a body reporting failure', { body: { success: false, error: { code: 'DB_ERROR' } } }]
  ]

  test.each(failures)('%s shows the error state instead of a page of zeros', async (_label, result) => {
    const wrapper = await mountScreen(result)
    expect(wrapper.find('.prog-error').exists()).toBe(true)
    expect(wrapper.find('.btn-prog-retry').exists()).toBe(true)
    expect(wrapper.findAll('.prog-tier-card').length).toBe(0)
    expect(wrapper.find('.prog-empty-notice').exists()).toBe(false)
  })

  test('the retry button re-reads and recovers', async () => {
    const wrapper = await mountScreen({ ok: false, body: {} })
    stubFetch({
      body: { success: true, tiers: tiers({ entryLevel: { vaSessions: 3 } }), recentActivity: [] }
    })
    wrapper.find('.btn-prog-retry').trigger('click')
    await settle(wrapper)
    expect(wrapper.find('.prog-error').exists()).toBe(false)
    expect(wrapper.findAll('.prog-tier-card').length).toBe(3)
  })
})

describe('this screen is one advisor\'s own record and nothing else', () => {
  // Guards the removal: the firm-wide table lived here behind an isFirmManager
  // prop the app never set, so it was unreachable AND untested. If either the prop
  // or the table comes back, that is a second copy of the Hub tab and these fail.
  test('takes no firm-manager switch', () => {
    expect(AdvisorProgression.props.isFirmManager).toBeUndefined()
  })

  test('never renders a team table, whatever it is handed', async () => {
    const wrapper = await mountScreen({
      body: {
        success: true,
        tiers: tiers({ entryLevel: { vaSessions: 1 } }),
        recentActivity: [],
        advisors: [{ advisorId: 'someone-else', tiers: tiers(), totalSessions: 9 }]
      }
    })
    expect(wrapper.find('.prog-team-table').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('someone-else')
  })
})
