/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy, translateStub } = require('../helpers/mountComponent')
const CpdRecord = require('~/components/CpdRecord.vue').default

/**
 * Component tests for the CPD Record section of "My Progress".
 *
 * WHAT MAKES THIS SCREEN DIFFERENT from the rest of the activity feature: everything
 * else here only ever READS. This one writes, and what it writes is a professional
 * declaration an advisor may submit to their own body. So the tests below care most
 * about three things:
 *
 * 1. **Nothing is recorded without the pledge being shown.** A claim must never be a
 *    one-click accident, and the advisor must see the exact words they are agreeing to.
 * 2. **The request names only a template and an activity.** The minutes, the real
 *    title and the pledge wording are resolved server-side (server/utils/cpdCatalogue.js);
 *    a screen that could name its own figure could inflate a regulated record.
 * 3. **A failed write is said out loud.** An advisor who is not told their pledge failed
 *    will believe they have declared something they have not — the same "renders as
 *    working" fault this workstream spent 2026-07-29 removing from the read path.
 *
 * Assertions target keys and structure, not English: the wording lives in
 * `locales/en.json` and the `$t` stand-in returns the key, so a re-wording moves the
 * copy without turning this file red.
 */

/** One activity as the backend returns it, with sensible claim-free defaults. */
function activity (over) {
  return Object.assign({
    activity: 'video',
    minutes: 11,
    pledgeKey: 'cpd.pledge.video',
    claimedCount: 0,
    claimedMinutes: 0,
    claims: []
  }, over)
}

/** One template row as the backend returns it. */
function template (over) {
  return Object.assign({
    title: 'Lite Planning',
    page: 'planning-session',
    lastUsedAt: '2026-07-28T10:00:00Z',
    activities: [activity()]
  }, over)
}

/** A full successful GET body. */
function record (over) {
  return Object.assign({
    success: true,
    advisorId: 'dev-advisor-001',
    totalMinutes: 0,
    claimedCount: 0,
    templates: [template()]
  }, over)
}

/**
 * Queue of fetch outcomes, consumed one per call. A single object is reused for
 * every call, which is what most tests want (load, then reload after a write).
 *
 * @param {object|object[]} outcomes - { ok?, body?, reject? } or a list of them.
 */
function stubFetch (outcomes) {
  const queue = Array.isArray(outcomes) ? outcomes.slice() : null
  const single = queue ? null : outcomes
  global.fetch = jest.fn(() => {
    const next = queue ? (queue.shift() || single || { body: record() }) : single
    if (next.reject) { return Promise.reject(new Error('network down')) }
    return Promise.resolve({
      ok: next.ok !== false,
      json: () => Promise.resolve(next.body)
    })
  })
}

async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

/**
 * `$tc` mirroring vue-i18n's real signature (key, choice, values) rather than the
 * shared two-argument stand-in — otherwise the count and minutes on "Recorded N times"
 * never reach the assertion and the test would pass without them.
 */
function tcStub (key, choice, values) {
  return values ? `${key} ${JSON.stringify(values)}` : `${key} ${choice}`
}

async function mountSection (outcomes) {
  stubFetch(outcomes || { body: record() })
  const wrapper = mountWithBuefy(CpdRecord, {
    propsData: { apiToken: 'test-token' },
    mocks: { $t: translateStub, $tc: tcStub }
  })
  await settle(wrapper)
  return wrapper
}

/** The POST calls fetch was given, in order. */
function writes () {
  return global.fetch.mock.calls.filter(c => c[1] && c[1].method === 'POST')
}

afterEach(() => { delete global.fetch })

describe('reading the advisor\'s own CPD record', () => {
  test('asks the CPD route with the bearer token, naming nobody', async () => {
    await mountSection()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/activity/cpd')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    // Identity comes from the verified pass. If an advisor id ever reached the
    // request, an advisor could read or claim against a colleague's record.
    expect(opts.body).toBeUndefined()
    expect(url).not.toContain('advisor')
  })

  test('shows each template with its activities and times', async () => {
    const wrapper = await mountSection({
      body: record({
        totalMinutes: 0,
        templates: [template({
          activities: [
            activity({ activity: 'video', minutes: 11 }),
            activity({ activity: 'reading', minutes: 40, pledgeKey: 'cpd.pledge.reading' }),
            activity({ activity: 'rehearsal', minutes: 20, pledgeKey: 'cpd.pledge.rehearsal' })
          ]
        })]
      })
    })
    expect(wrapper.findAll('.cpd-template').length).toBe(1)
    expect(wrapper.find('.cpd-template-title').text()).toBe('Lite Planning')

    const labels = wrapper.findAll('.cpd-activity-label')
    expect(labels.length).toBe(3)
    // The label is composed from the activity's NAME plus its minutes, so a template
    // worth 11 minutes can never be shown carrying another one's figure.
    expect(labels.at(0).text()).toContain('cpd.activityName.video')
    expect(labels.at(0).text()).toContain('"n":11')
    expect(labels.at(1).text()).toContain('cpd.activityName.reading')
    expect(labels.at(1).text()).toContain('"n":40')
    expect(labels.at(2).text()).toContain('cpd.activityName.rehearsal')
    expect(labels.at(2).text()).toContain('"n":20')
  })

  test('the total is the server\'s figure, formatted as hours and minutes', async () => {
    const wrapper = await mountSection({ body: record({ totalMinutes: 260 }) })
    // The rendered sentence nests one translation inside another, so the figures are
    // checked on the formatter itself and the sentence only for which form it used.
    expect(wrapper.find('.cpd-total').text()).toContain('cpd.hoursMinutes')
    const formatted = wrapper.vm.formatMinutes(260)
    expect(formatted).toContain('"h":4')
    expect(formatted).toContain('"m":20')
  })

  test('a whole number of hours drops the minutes, and zero still says zero', async () => {
    const exact = await mountSection({ body: record({ totalMinutes: 120 }) })
    expect(exact.find('.cpd-total').text()).toContain('cpd.hoursOnly')
    expect(exact.vm.formatMinutes(120)).toContain('"h":2')

    const none = await mountSection({ body: record({ totalMinutes: 0 }) })
    // Not hidden: a record with nothing in it should say so rather than show a gap.
    expect(none.find('.cpd-total').text()).toContain('cpd.minutesOnly')
    expect(none.vm.formatMinutes(0)).toContain('"m":0')
  })

  test('nothing claimable shows the empty state, not a blank section', async () => {
    const wrapper = await mountSection({ body: record({ templates: [] }) })
    expect(wrapper.find('.cpd-empty').text()).toBe('cpd.empty')
    expect(wrapper.findAll('.cpd-template').length).toBe(0)
  })
})

describe('a record that could not be read never reads as nothing recorded', () => {
  // The equivalence this whole workstream exists to remove: a broken record and an
  // advisor who has claimed nothing must never render the same.
  test('a failed response shows the error and no empty state', async () => {
    const wrapper = await mountSection({ ok: false, body: {} })
    expect(wrapper.find('.cpd-error-msg').text()).toBe('cpd.loadFailed')
    expect(wrapper.find('.cpd-empty').exists()).toBe(false)
    expect(wrapper.find('.cpd-total').exists()).toBe(false)
  })

  test('a body that is well-formed but unsuccessful is still a failure', async () => {
    const wrapper = await mountSection({ body: { success: false, templates: [], totalMinutes: 0 } })
    expect(wrapper.find('.cpd-error-msg').text()).toBe('cpd.loadFailed')
  })

  test('a FAILED response carrying a healthy-looking body is still a failure', async () => {
    // Found by mutation: deleting the HTTP-status check changed nothing, because every
    // other failure fixture also tripped the success-flag guard below it. A proxy or
    // gateway answering 502 with its own JSON is the real case — a record the server
    // never sent must never be shown as an advisor's CPD, least of all with a total
    // they might declare. (The same gap was found on the Team Progress tab.)
    const wrapper = await mountSection({
      ok: false,
      body: record({ totalMinutes: 240, templates: [template()] })
    })
    expect(wrapper.find('.cpd-error-msg').text()).toBe('cpd.loadFailed')
    expect(wrapper.find('.cpd-total').exists()).toBe(false)
    expect(wrapper.findAll('.cpd-template').length).toBe(0)
  })

  test('no connection at all is reported as a connection failure', async () => {
    const wrapper = await mountSection({ reject: true })
    expect(wrapper.find('.cpd-error-msg').text()).toBe('advisorProgress.connectFailed')
  })

  test('Try Again re-reads and clears the error', async () => {
    const wrapper = await mountSection({ ok: false, body: {} })
    stubFetch({ body: record({ totalMinutes: 11 }) })
    wrapper.find('.btn-cpd-retry').trigger('click')
    await settle(wrapper)
    expect(wrapper.find('.cpd-error').exists()).toBe(false)
    expect(wrapper.findAll('.cpd-template').length).toBe(1)
  })
})

describe('recording a claim requires the pledge', () => {
  test('pressing Record writes NOTHING — it opens the pledge', async () => {
    const wrapper = await mountSection()
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)

    expect(writes().length).toBe(0)
    expect(wrapper.vm.pledgeOpen).toBe(true)
  })

  test('the pledge shows the exact declaration for THAT activity, plus the notice', async () => {
    const wrapper = await mountSection({
      body: record({
        templates: [template({
          activities: [
            activity({ activity: 'video', pledgeKey: 'cpd.pledge.video' }),
            activity({ activity: 'rehearsal', minutes: 20, pledgeKey: 'cpd.pledge.rehearsal' })
          ]
        })]
      })
    })
    // The SECOND activity's Record button — a pledge showing the first activity's
    // words would have the advisor declaring something they never did.
    wrapper.findAll('.btn-cpd-record').at(1).trigger('click')
    await settle(wrapper)

    expect(wrapper.find('.cpd-modal-pledge').text()).toBe('cpd.pledge.rehearsal')
    expect(wrapper.find('.cpd-modal-declaration').text()).toBe('cpd.declaration')
    expect(wrapper.find('.modal-card-title').text()).toBe('Lite Planning')
  })

  test('the pledge key comes from the RECORD, not from the activity name', async () => {
    // The server stores the key shown at the moment of the claim, so a later rewording
    // cannot change what an advisor agreed to. The screen must therefore render the
    // key it was handed, even when it disagrees with the activity.
    const wrapper = await mountSection({
      body: record({
        templates: [template({ activities: [activity({ pledgeKey: 'cpd.pledge.reading' })] })]
      })
    })
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    expect(wrapper.find('.cpd-modal-pledge').text()).toBe('cpd.pledge.reading')
  })

  test('confirming posts only the template and the activity', async () => {
    const wrapper = await mountSection([
      { body: record() },
      { body: { success: true, claim: { id: 1 } } },
      { body: record({ totalMinutes: 11 }) }
    ])
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    wrapper.find('.modal-card-foot button').trigger('click')
    await settle(wrapper)

    expect(writes().length).toBe(1)
    const [url, opts] = writes()[0]
    expect(url).toBe('/api/activity/cpd/record')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    // Exactly two fields. Minutes, the real title and the pledge are the server's to
    // decide; a screen that could send its own figure could inflate a CPD return.
    expect(JSON.parse(opts.body)).toEqual({ templateTitle: 'Lite Planning', activity: 'video' })
  })

  test('a successful claim closes the pledge and re-reads the server\'s total', async () => {
    const wrapper = await mountSection([
      { body: record() },
      { body: { success: true, claim: { id: 1 } } },
      { body: record({ totalMinutes: 11 }) }
    ])
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    wrapper.find('.modal-card-foot button').trigger('click')
    await settle(wrapper)

    expect(wrapper.vm.pledgeOpen).toBe(false)
    // Re-read, not incremented locally: the figure an advisor may declare is the
    // server's, computed from the rows it actually stored.
    expect(wrapper.vm.totalMinutes).toBe(11)
    expect(wrapper.find('.cpd-total').text()).toContain('cpd.minutesOnly')
  })

  test('closing the pledge records nothing', async () => {
    const wrapper = await mountSection()
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    wrapper.find('.modal-card-head .delete').trigger('click')
    await settle(wrapper)

    expect(writes().length).toBe(0)
    expect(wrapper.vm.pledgeOpen).toBe(false)
    expect(wrapper.vm.pledge).toBe(null)
  })
})

describe('a claim that failed to save says so', () => {
  test('a refused claim shows the failure and keeps the pledge open', async () => {
    const wrapper = await mountSection([
      { body: record() },
      { ok: false, body: {} }
    ])
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    wrapper.find('.modal-card-foot button').trigger('click')
    await settle(wrapper)

    // Still open, with the reason on it. A closed modal and a silent screen would
    // leave the advisor believing they had declared something.
    expect(wrapper.vm.pledgeOpen).toBe(true)
    expect(wrapper.find('.cpd-modal .cpd-write-error').text()).toBe('cpd.recordFailed')
  })

  test('a claim that never reached the server is also reported', async () => {
    const wrapper = await mountSection([
      { body: record() },
      { reject: true }
    ])
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    wrapper.find('.modal-card-foot button').trigger('click')
    await settle(wrapper)
    expect(wrapper.find('.cpd-modal .cpd-write-error').text()).toBe('cpd.recordFailed')
  })

  test('a 200 carrying success:false is a failure, not a claim', async () => {
    const wrapper = await mountSection([
      { body: record() },
      { body: { success: false } }
    ])
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    wrapper.find('.modal-card-foot button').trigger('click')
    await settle(wrapper)
    expect(wrapper.find('.cpd-modal .cpd-write-error').text()).toBe('cpd.recordFailed')
    expect(wrapper.vm.pledgeOpen).toBe(true)
  })

  test('the failure does not follow the advisor into the next pledge', async () => {
    const wrapper = await mountSection([
      { body: record() },
      { ok: false, body: {} }
    ])
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    wrapper.find('.modal-card-foot button').trigger('click')
    await settle(wrapper)
    expect(wrapper.vm.writeError).toBe('cpd.recordFailed')

    wrapper.find('.modal-card-head .delete').trigger('click')
    await settle(wrapper)
    expect(wrapper.vm.writeError).toBe(null)
  })
})

describe('repeats count, and the tally is the server\'s', () => {
  const claimed = {
    body: record({
      totalMinutes: 33,
      templates: [template({
        activities: [activity({
          claimedCount: 3,
          claimedMinutes: 33,
          claims: [
            { id: 1, minutes: 11, claimedAt: '2026-07-27T09:00:00Z', withdrawnAt: null },
            { id: 2, minutes: 11, claimedAt: '2026-07-28T09:00:00Z', withdrawnAt: null },
            { id: 3, minutes: 11, claimedAt: '2026-07-29T09:00:00Z', withdrawnAt: null }
          ]
        })]
      })]
    })
  }

  test('shows how many times it was recorded, and for how long', async () => {
    const wrapper = await mountSection(claimed)
    const text = wrapper.find('.cpd-activity-claimed').text()
    expect(text).toContain('cpd.recorded')
    expect(text).toContain('"n":3')
    expect(text).toContain('"minutes":33')
  })

  test('Record stays available after a claim — an advisor may do the work again', async () => {
    // The owner ruling this screen is built on: three viewings is three records, so
    // this is a tally, never a tick that disappears once used.
    const wrapper = await mountSection(claimed)
    expect(wrapper.find('.btn-cpd-record').exists()).toBe(true)
    expect(wrapper.find('.btn-cpd-withdraw').exists()).toBe(true)
  })

  test('an activity the export no longer offers is history, and cannot be claimed again', async () => {
    const wrapper = await mountSection({
      body: record({
        templates: [template({
          activities: [activity({
            minutes: null,
            claimedCount: 1,
            claimedMinutes: 11,
            claims: [{ id: 7, minutes: 11, claimedAt: '2026-07-20T09:00:00Z', withdrawnAt: null }]
          })]
        })]
      })
    })
    // Named without a time, because it no longer has one to offer…
    expect(wrapper.find('.cpd-activity-label').text()).toBe('cpd.activityName.video')
    // …no Record button, but the standing claim is still shown and still withdrawable.
    expect(wrapper.find('.btn-cpd-record').exists()).toBe(false)
    expect(wrapper.find('.btn-cpd-withdraw').exists()).toBe(true)
  })

  test('nothing claimed yet shows no tally and no Withdraw', async () => {
    const wrapper = await mountSection()
    expect(wrapper.find('.cpd-activity-claimed').exists()).toBe(false)
    expect(wrapper.find('.btn-cpd-withdraw').exists()).toBe(false)
  })
})

describe('withdrawing takes back the most recent recording', () => {
  /** Three standing claims, deliberately NOT in date order in the array. */
  const threeClaims = [
    { id: 5, minutes: 11, claimedAt: '2026-07-28T09:00:00Z', withdrawnAt: null },
    { id: 9, minutes: 11, claimedAt: '2026-07-29T09:00:00Z', withdrawnAt: null },
    { id: 2, minutes: 11, claimedAt: '2026-07-27T09:00:00Z', withdrawnAt: null }
  ]

  function withClaims (claims) {
    return {
      body: record({
        totalMinutes: claims.filter(c => !c.withdrawnAt).length * 11,
        templates: [template({
          activities: [activity({
            claimedCount: claims.filter(c => !c.withdrawnAt).length,
            claimedMinutes: claims.filter(c => !c.withdrawnAt).length * 11,
            claims
          })]
        })]
      })
    }
  }

  test('posts the newest standing claim\'s id, whatever order they arrive in', async () => {
    const wrapper = await mountSection([
      withClaims(threeClaims),
      { body: { success: true } },
      withClaims(threeClaims.slice(0, 1))
    ])
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)

    const [url, opts] = writes()[0]
    expect(url).toBe('/api/activity/cpd/withdraw')
    expect(JSON.parse(opts.body)).toEqual({ claimId: 9 })
  })

  test('a claim already withdrawn is never withdrawn twice', async () => {
    const wrapper = await mountSection([
      withClaims([
        { id: 1, minutes: 11, claimedAt: '2026-07-27T09:00:00Z', withdrawnAt: null },
        { id: 4, minutes: 11, claimedAt: '2026-07-29T09:00:00Z', withdrawnAt: '2026-07-29T10:00:00Z' }
      ]),
      { body: { success: true } },
      { body: record() }
    ])
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)
    // id 4 is the newest but is already withdrawn; the newest STANDING one is id 1.
    expect(JSON.parse(writes()[0][1].body)).toEqual({ claimId: 1 })
  })

  test('claims sharing a timestamp resolve to exactly one — the higher id', async () => {
    // A date column with no sub-second precision can return two identical stamps, and
    // "most recent" must still pick one row rather than depend on array order.
    const wrapper = await mountSection([
      withClaims([
        { id: 3, minutes: 11, claimedAt: '2026-07-29T09:00:00Z', withdrawnAt: null },
        { id: 8, minutes: 11, claimedAt: '2026-07-29T09:00:00Z', withdrawnAt: null }
      ]),
      { body: { success: true } },
      { body: record() }
    ])
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)
    expect(JSON.parse(writes()[0][1].body)).toEqual({ claimId: 8 })
  })

  test('a claim with no readable date is never mistaken for the newest', async () => {
    const wrapper = await mountSection([
      withClaims([
        { id: 6, minutes: 11, claimedAt: null, withdrawnAt: null },
        { id: 2, minutes: 11, claimedAt: '2026-07-27T09:00:00Z', withdrawnAt: null }
      ]),
      { body: { success: true } },
      { body: record() }
    ])
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)
    expect(JSON.parse(writes()[0][1].body)).toEqual({ claimId: 2 })
  })

  test('a successful withdrawal re-reads the record rather than adjusting it here', async () => {
    const wrapper = await mountSection([
      withClaims(threeClaims),
      { body: { success: true } },
      withClaims(threeClaims.slice(0, 2))
    ])
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)
    expect(wrapper.vm.totalMinutes).toBe(22)
    expect(wrapper.find('.cpd-activity-claimed').text()).toContain('"n":2')
  })

  test('a failed withdrawal is reported, and the record is not quietly changed', async () => {
    const wrapper = await mountSection([
      withClaims(threeClaims),
      { ok: false, body: {} }
    ])
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)

    expect(wrapper.find('.cpd-write-error').text()).toBe('cpd.withdrawFailed')
    expect(wrapper.vm.totalMinutes).toBe(33)
    expect(wrapper.find('.cpd-activity-claimed').text()).toContain('"n":3')
  })

  test('a withdrawal that never reached the server is also reported', async () => {
    const wrapper = await mountSection([withClaims(threeClaims), { reject: true }])
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)
    expect(wrapper.find('.cpd-write-error').text()).toBe('cpd.withdrawFailed')
  })
})

describe('a write in flight cannot be started twice', () => {
  test('both buttons are disabled while a claim is being recorded', async () => {
    const wrapper = await mountSection()
    wrapper.setData({ busy: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.btn-cpd-record').attributes('disabled')).toBeTruthy()
  })

  test('a second confirm while one is in flight records nothing extra', async () => {
    const wrapper = await mountSection()
    wrapper.setData({ busy: true, pledge: { templateTitle: 'Lite Planning', activity: activity() } })
    await wrapper.vm.$nextTick()
    await wrapper.vm.confirmPledge()
    // A double-click on a pledge would otherwise record a second claim the advisor
    // never made — and repeats are legitimate here, so nothing else would catch it.
    expect(writes().length).toBe(0)
  })

  test('a withdraw while one is in flight does nothing', async () => {
    const wrapper = await mountSection()
    wrapper.setData({ busy: true })
    await wrapper.vm.withdraw(activity({ claims: [{ id: 1, claimedAt: '2026-07-29T09:00:00Z' }] }))
    expect(writes().length).toBe(0)
  })
})
