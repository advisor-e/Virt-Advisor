/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmTeamProgress = require('~/components/firm/FirmTeamProgress.vue').default

/**
 * Component tests for the Firm Manager Hub's Team Progress tab.
 *
 * The claims that matter here are mostly about what the screen says when it has
 * NOTHING to show, because this feature's only real fault has always hidden in that
 * gap: until 2026-07-29 an unreachable database and a firm whose advisors had done
 * nothing produced the identical page of zeros. So the tests below pin the two apart
 * — a read failure must say so and offer a retry, an empty result must read as a
 * genuinely new team — and they pin the security claim (the firm is never sent from
 * the browser) and the arithmetic in each tier cell.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

/** One advisor row in the shape GET /api/activity/team returns. */
function advisor (id, opts) {
  const o = opts || {}
  const tier = t => Object.assign(
    { vaSessions: 0, courseSessions: 0, avgQuizScore: null },
    o[t] || {}
  )
  return {
    advisorId: id,
    tiers: {
      'entry-level': tier('entryLevel'),
      intermediate: tier('intermediate'),
      advanced: tier('advanced')
    },
    lastActive: o.lastActive === undefined ? '2026-07-28T10:00:00Z' : o.lastActive,
    totalSessions: o.totalSessions === undefined ? 0 : o.totalSessions
  }
}

/** Serve one team payload; `ok:false` or a rejection models a failed read. */
function stubFetch (result) {
  global.fetch = jest.fn(() => {
    if (result.reject) { return Promise.reject(new Error('network down')) }
    return Promise.resolve({
      ok: result.ok !== false,
      statusText: result.statusText || 'Error',
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

async function mountTab (result) {
  stubFetch(result || { body: { success: true, advisors: [] } })
  const wrapper = mountWithBuefy(FirmTeamProgress, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('loading the team', () => {
  test('asks the team route with the bearer token', async () => {
    await mountTab()
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/activity/team')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  test('never sends a firm or advisor id — identity is the token, not the browser', async () => {
    await mountTab()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).not.toMatch(/firmId|advisorId/i)
    expect(opts.body).toBeUndefined()
  })
})

describe('a team with activity', () => {
  const team = {
    body: {
      success: true,
      advisors: [
        advisor('adv-1', {
          entryLevel: { vaSessions: 3, courseSessions: 2, avgQuizScore: 72 },
          advanced: { vaSessions: 1, courseSessions: 0, avgQuizScore: null },
          totalSessions: 6,
          lastActive: '2026-07-28T10:00:00Z'
        }),
        advisor('adv-2', { totalSessions: 0, lastActive: null })
      ]
    }
  }

  test('renders one row per advisor, naming each', async () => {
    const wrapper = await mountTab(team)
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(wrapper.text()).toContain('adv-1')
    expect(wrapper.text()).toContain('adv-2')
  })

  test('a tier cell adds VA cases and course sessions into one count', async () => {
    const wrapper = await mountTab(team)
    // 3 VA + 2 course at entry level = 5, which is what the manager sees.
    expect(wrapper.vm.tierSessions(team.body.advisors[0], 'entry-level')).toBe(5)
    expect(wrapper.findAll('tbody tr').at(0).text()).toContain('5')
  })

  test('shows the average quiz score where one exists, and nothing where none does', async () => {
    const wrapper = await mountTab(team)
    const firstRow = wrapper.findAll('tbody tr').at(0)
    expect(firstRow.text()).toContain('72%')
    // The advanced tier has a session but no scored quiz — no invented 0%.
    expect(firstRow.text()).not.toContain('0%')
  })

  test('renders an unambiguous date, and a dash when the advisor has never been active', async () => {
    const wrapper = await mountTab(team)
    const rows = wrapper.findAll('tbody tr')
    expect(rows.at(0).text()).toContain('Jul 2026')
    expect(rows.at(1).text()).toContain('—')
  })

  test('shows the legend explaining the two numbers in each cell', async () => {
    const wrapper = await mountTab(team)
    expect(wrapper.text()).toContain('firmTeamProgress.cellLegend')
  })

  test('a payload missing a tier still renders the advisor rather than blanking the row', async () => {
    const partial = advisor('adv-3', { totalSessions: 1 })
    delete partial.tiers.advanced
    const wrapper = await mountTab({ body: { success: true, advisors: [partial] } })
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    expect(wrapper.text()).toContain('adv-3')
    expect(wrapper.vm.tierSessions(partial, 'advanced')).toBe(0)
    expect(wrapper.vm.tierScore(partial, 'advanced')).toBeNull()
  })
})

describe('an empty team reads as a new team, not as a fault', () => {
  test('shows the empty message and no error', async () => {
    const wrapper = await mountTab({ body: { success: true, advisors: [] } })
    expect(wrapper.text()).toContain('firmTeamProgress.empty')
    expect(wrapper.text()).not.toContain('firmTeamProgress.loadFailed')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})

describe('a read failure is said out loud', () => {
  // Each of these produced a silent page of zeros before the 2026-07-29 fix.
  const failures = [
    ['an HTTP error', { ok: false, statusText: 'Internal Server Error', body: {} }],
    ['no network at all', { reject: true }],
    ['a body reporting failure', { body: { success: false, error: { code: 'DB_ERROR' } } }]
  ]

  test.each(failures)('%s shows the failure message, not the empty message', async (_label, result) => {
    const wrapper = await mountTab(result)
    expect(wrapper.text()).toContain('firmTeamProgress.loadFailed')
    expect(wrapper.text()).not.toContain('firmTeamProgress.empty')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  test('a non-OK response is refused even when its body looks like real data', async () => {
    // Mutation-driven: the three cases above all fail the success-flag guard too, so
    // none of them proved the status check does anything. A proxy or gateway can
    // return a well-formed-looking body with an error status — those advisors must
    // not reach the screen.
    const wrapper = await mountTab({
      ok: false,
      body: { success: true, advisors: [advisor('ghost-advisor', { totalSessions: 99 })] }
    })
    expect(wrapper.text()).toContain('firmTeamProgress.loadFailed')
    expect(wrapper.text()).not.toContain('ghost-advisor')
  })

  test('offers a retry that re-reads and recovers', async () => {
    const wrapper = await mountTab({ ok: false, body: {} })
    expect(wrapper.text()).toContain('firmTeamProgress.retry')

    stubFetch({ body: { success: true, advisors: [advisor('adv-9', { totalSessions: 2 })] } })
    wrapper.find('button').trigger('click')
    await settle(wrapper)

    expect(wrapper.text()).not.toContain('firmTeamProgress.loadFailed')
    expect(wrapper.text()).toContain('adv-9')
  })
})
