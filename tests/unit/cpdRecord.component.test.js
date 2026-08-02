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

/**
 * Press Withdraw on the row, then Withdraw again in the confirmation box.
 *
 * TWO deliberate presses: the row's button no longer writes anything by itself. The
 * tests below are about which claim is taken back, so they go through the whole real
 * path rather than calling the method — a confirmation that could be bypassed in a
 * test is one that could be bypassed in the screen.
 */
async function withdrawConfirmed (wrapper) {
  wrapper.find('.btn-cpd-withdraw').trigger('click')
  await settle(wrapper)
  wrapper.find('.cpd-withdraw-modal .modal-card-foot button').trigger('click')
  await settle(wrapper)
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

  test('Cancel on the pledge records nothing', async () => {
    const wrapper = await mountSection()
    wrapper.find('.btn-cpd-record').trigger('click')
    await settle(wrapper)
    // The SECOND footer button. The first is Record, and pressing that would prove
    // nothing about Cancel.
    wrapper.findAll('.modal-card-foot button').at(1).trigger('click')
    await settle(wrapper)

    expect(writes().length).toBe(0)
    expect(wrapper.vm.pledgeOpen).toBe(false)
    expect(wrapper.vm.pledge).toBe(null)
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
    // Once only, for the same reason as the withdrawal's.
    expect(wrapper.findAll('.cpd-write-error').length).toBe(1)
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

describe('withdrawing asks first', () => {
  /** One standing claim — enough to put a Withdraw button on the row. */
  function withOneClaim () {
    return {
      body: record({
        totalMinutes: 11,
        templates: [template({
          activities: [activity({
            claimedCount: 1,
            claimedMinutes: 11,
            claims: [{ id: 4, minutes: 11, claimedAt: '2026-07-29T09:00:00Z', withdrawnAt: null }]
          })]
        })]
      })
    }
  }

  test('pressing Withdraw writes NOTHING — it opens the confirmation', async () => {
    const wrapper = await mountSection(withOneClaim())
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)

    // The whole point of this box: a professional record is not altered by one press.
    expect(writes().length).toBe(0)
    expect(wrapper.vm.withdrawOpen).toBe(true)
  })

  test('the confirmation asks the question and says the recording is kept', async () => {
    const wrapper = await mountSection(withOneClaim())
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)

    expect(wrapper.find('.cpd-withdraw-modal .cpd-modal-pledge').text()).toBe('cpd.withdrawQuestion')
    expect(wrapper.find('.cpd-withdraw-modal .cpd-modal-declaration').text()).toBe('cpd.withdrawNote')
  })

  test('Cancel withdraws nothing', async () => {
    const wrapper = await mountSection(withOneClaim())
    wrapper.find('.btn-cpd-withdraw').trigger('click')
    await settle(wrapper)
    wrapper.findAll('.cpd-withdraw-modal .modal-card-foot button').at(1).trigger('click')
    await settle(wrapper)

    expect(writes().length).toBe(0)
    expect(wrapper.vm.withdrawOpen).toBe(false)
    expect(wrapper.vm.withdrawTarget).toBe(null)
  })

  test('the confirmation acts on the row that was pressed, not the first one', async () => {
    const wrapper = await mountSection([
      {
        body: record({
          totalMinutes: 31,
          templates: [template({
            activities: [
              activity({
                claimedCount: 1,
                claimedMinutes: 11,
                claims: [{ id: 1, minutes: 11, claimedAt: '2026-07-27T09:00:00Z', withdrawnAt: null }]
              }),
              activity({
                activity: 'rehearsal',
                minutes: 20,
                pledgeKey: 'cpd.pledge.rehearsal',
                claimedCount: 1,
                claimedMinutes: 20,
                claims: [{ id: 2, minutes: 20, claimedAt: '2026-07-28T09:00:00Z', withdrawnAt: null }]
              })
            ]
          })]
        })
      },
      { body: { success: true } },
      { body: record() }
    ])
    wrapper.findAll('.btn-cpd-withdraw').at(1).trigger('click')
    await settle(wrapper)
    wrapper.find('.cpd-withdraw-modal .modal-card-foot button').trigger('click')
    await settle(wrapper)

    // id 2 is the rehearsal. A box that had lost track of its row would take back the
    // video instead — a wrong figure on a record that may go to a professional body.
    expect(JSON.parse(writes()[0][1].body)).toEqual({ claimId: 2 })
  })

  test('a failed withdrawal keeps the confirmation open with the reason on it', async () => {
    const wrapper = await mountSection([withOneClaim(), { ok: false, body: {} }])
    await withdrawConfirmed(wrapper)

    // Same rule as a failed pledge: an advisor told nothing would believe the recording
    // had gone, and would not press again.
    expect(wrapper.vm.withdrawOpen).toBe(true)
    expect(wrapper.find('.cpd-withdraw-modal .cpd-write-error').text()).toBe('cpd.withdrawFailed')
    // Exactly ONE. The message belongs inside the box the advisor is looking at, not
    // there AND behind it — two copies of a failure read as two failures.
    expect(wrapper.findAll('.cpd-write-error').length).toBe(1)
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
    await withdrawConfirmed(wrapper)

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
    await withdrawConfirmed(wrapper)
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
    await withdrawConfirmed(wrapper)
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
    await withdrawConfirmed(wrapper)
    expect(JSON.parse(writes()[0][1].body)).toEqual({ claimId: 2 })
  })

  test('a successful withdrawal re-reads the record rather than adjusting it here', async () => {
    const wrapper = await mountSection([
      withClaims(threeClaims),
      { body: { success: true } },
      withClaims(threeClaims.slice(0, 2))
    ])
    await withdrawConfirmed(wrapper)
    expect(wrapper.vm.withdrawOpen).toBe(false)
    expect(wrapper.vm.totalMinutes).toBe(22)
    expect(wrapper.find('.cpd-activity-claimed').text()).toContain('"n":2')
  })

  test('a failed withdrawal is reported, and the record is not quietly changed', async () => {
    const wrapper = await mountSection([
      withClaims(threeClaims),
      { ok: false, body: {} }
    ])
    await withdrawConfirmed(wrapper)

    expect(wrapper.find('.cpd-write-error').text()).toBe('cpd.withdrawFailed')
    expect(wrapper.vm.totalMinutes).toBe(33)
    expect(wrapper.find('.cpd-activity-claimed').text()).toContain('"n":3')
  })

  test('a withdrawal that never reached the server is also reported', async () => {
    const wrapper = await mountSection([withClaims(threeClaims), { reject: true }])
    await withdrawConfirmed(wrapper)
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
    wrapper.setData({
      busy: true,
      withdrawTarget: activity({ claims: [{ id: 1, claimedAt: '2026-07-29T09:00:00Z' }] })
    })
    await wrapper.vm.confirmWithdraw()
    expect(writes().length).toBe(0)
  })
})

// ── The printed statement ─────────────────────────────────────────────────────
//
// This half of the screen exists to leave the building. The advisor sends it to their
// professional body, so the tests care about what a stranger reading the paper would
// see: whose record it is, when it was produced, and which entries are on it. The
// assertions stay on keys and structure like the rest of the file — except where a
// value IS the point (a name, a date, an id), because that is the whole content.

/** Three standing claims plus one already withdrawn, deliberately out of date order. */
function mixedClaims () {
  return record({
    advisorName: 'Jordan Reeve',
    totalMinutes: 22,
    templates: [template({
      activities: [activity({
        claimedCount: 2,
        claimedMinutes: 22,
        claims: [
          { id: 3, minutes: 11, claimedAt: '2026-07-29T09:00:00Z', withdrawnAt: null },
          { id: 2, minutes: 11, claimedAt: '2026-07-14T09:00:00Z', withdrawnAt: '2026-07-20T09:00:00Z' },
          { id: 1, minutes: 11, claimedAt: '2026-07-12T09:00:00Z', withdrawnAt: null }
        ]
      })]
    })]
  })
}

describe('the Download button is offered only when there is something to declare', () => {
  test('nothing recorded yet — no button', async () => {
    const wrapper = await mountSection()
    expect(wrapper.find('.btn-cpd-pdf').exists()).toBe(false)
  })

  test('one standing claim — the button appears', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    expect(wrapper.find('.btn-cpd-pdf').exists()).toBe(true)
  })

  test('a record that failed to load offers no statement', async () => {
    // Printing here would produce a page with a heading, a name and a total of zero —
    // which reads as "I have done no CPD" rather than "this did not load".
    const wrapper = await mountSection({ ok: false })
    expect(wrapper.find('.btn-cpd-pdf').exists()).toBe(false)
  })

  test('claims that have all been withdrawn are not something to declare', async () => {
    const wrapper = await mountSection({
      body: record({
        templates: [template({
          activities: [activity({
            claimedCount: 0,
            claims: [{ id: 1, minutes: 11, claimedAt: '2026-07-12T09:00:00Z', withdrawnAt: '2026-07-20T09:00:00Z' }]
          })]
        })]
      })
    })
    expect(wrapper.find('.btn-cpd-pdf').exists()).toBe(false)
  })
})

describe('the statement names the advisor, from the verified pass', () => {
  test('prints the display name the server reported', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    expect(wrapper.find('.cpd-statement-who').text()).toContain('"name":"Jordan Reeve"')
  })

  test('falls back to the advisor id when the token carries no name', async () => {
    // Never invented, never assembled from anything else. An id on a submitted
    // document is poor; a guessed name on one is worse.
    const wrapper = await mountSection({
      body: Object.assign(mixedClaims(), { advisorName: null })
    })
    expect(wrapper.find('.cpd-statement-who').text()).toContain('"name":"dev-advisor-001"')
  })

  test('carries the statement heading, not the on-screen section title', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    expect(wrapper.find('.cpd-statement-title').text()).toBe('cpd.statementTitle')
  })
})

describe('the statement lists standing claims, dated, oldest first', () => {
  test('one dated line per standing claim', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    const lines = wrapper.findAll('.cpd-claim-date')
    // Three claims arrived; the withdrawn one is not on a submission.
    expect(lines.length).toBe(2)
  })

  test('oldest first, whatever order they arrived in', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    const lines = wrapper.findAll('.cpd-claim-date')
    expect(lines.at(0).text()).toContain('12 Jul 2026')
    expect(lines.at(1).text()).toContain('29 Jul 2026')
  })

  test('a withdrawn claim never reaches the paper', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    expect(wrapper.find('.cpd-record').text()).not.toContain('14 Jul 2026')
  })

  test('an unreadable date prints as nothing, never "Invalid Date"', async () => {
    const wrapper = await mountSection({
      body: record({
        advisorName: 'Jordan Reeve',
        templates: [template({
          activities: [activity({
            claimedCount: 1,
            claims: [{ id: 1, minutes: 11, claimedAt: 'not-a-date', withdrawnAt: null }]
          })]
        })]
      })
    })
    expect(wrapper.find('.cpd-claim-date').text()).toContain('"date":""')
  })
})

describe('pressing Download prints, and leaves the page as it found it', () => {
  let printed

  beforeEach(() => {
    printed = []
    window.print = jest.fn(() => {
      // Captured DURING the print, which is the only moment the class should exist.
      printed.push(document.body.classList.contains('cpd-printing'))
    })
  })

  afterEach(() => {
    delete window.print
    document.body.classList.remove('cpd-printing')
  })

  test('presses through to the browser print dialog', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    await wrapper.vm.downloadPdf()
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  test('the section is isolated while printing and released afterwards', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    await wrapper.vm.downloadPdf()
    expect(printed).toEqual([true])
    // A page left in printing mode renders blank to the advisor still looking at it.
    expect(document.body.classList.contains('cpd-printing')).toBe(false)
  })

  test('a print that throws still releases the page', async () => {
    window.print = jest.fn(() => { throw new Error('no printer') })
    const wrapper = await mountSection({ body: mixedClaims() })
    await expect(wrapper.vm.downloadPdf()).rejects.toThrow('no printer')
    expect(document.body.classList.contains('cpd-printing')).toBe(false)
  })

  test('the produced date is stamped at the press, and reaches the page before printing', async () => {
    const wrapper = await mountSection({ body: mixedClaims() })
    // Before the press there is no produced date — the statement is not a document yet.
    expect(wrapper.find('.cpd-statement-who').text()).toContain('"date":""')

    await wrapper.vm.downloadPdf()

    const expected = wrapper.vm.formatDate(new Date())
    expect(wrapper.find('.cpd-statement-who').text()).toContain(`"date":"${expected}"`)
    expect(expected).not.toBe('')
  })
})
