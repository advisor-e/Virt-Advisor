/**
 * @jest-environment jsdom
 */
'use strict'

// The Outcome Learning page as the mentor actually meets it — item 4.87, T027.
//
// 🔴 WHAT THIS FILE IS FOR. A mentor sees a chip turn green. What they cannot see, and what
// UAT cannot see either, is what was sent and what was offered:
//
//   1. ACCEPT IS NEVER OFFERED BELOW THE FLOOR, on an orphan, or on a rejected row. The
//      backend refuses those anyway; a button that can only fail teaches a mentor the page
//      is broken.
//
//   2. A REJECTION CARRIES A REASON, OR IT IS NOT SENT (Mike, 2026-09-10). A hold sends none.
//
//   3. EACH BUTTON SENDS EXACTLY THE FIELDS THE ROUTE READS. The mentor's name is the token's.
//
//   4. THE PAGE IS RE-READ AFTER EVERY WRITE rather than patched: the state, the tile and the
//      history follow from the backend's recompute, never from the screen's guess.
//
// Assertions are on payloads and state, never on wording or CSS — `$t` returns the key.

const { mountWithBuefy } = require('../helpers/mountComponent')
const MentorOutcomeLearning = require('../../components/mentor/MentorOutcomeLearning.vue').default

const BASE = '/api/mentor/outcome-learning'

function adj (over) {
  return Object.assign({
    id: 'break-even|domain|profit',
    template: 'Break-Even',
    dimension: 'domain',
    value: 'profit',
    delivered: 31,
    less: 12,
    well: 19,
    firms: 6,
    cases: 31,
    holdBack: 4,
    meetsFloor: true,
    state: 'proposed',
    decision: null
  }, over || {})
}

function pagePayload (over) {
  return Object.assign({
    success: true,
    firms: 7,
    cases: 212,
    lastRecomputeAt: '2026-09-11T09:14:00Z',
    floor: { minFirms: 5, minCases: 25 },
    capMax: 10,
    adjustments: [adj()],
    orphaned: [],
    benches: null
  }, over || {})
}

function calls () {
  return global.fetch.mock.calls.map(([path, opts]) => [opts.method, path, opts.body ? JSON.parse(opts.body) : null])
}

function posts () {
  return calls().filter(c => c[0] === 'POST')
}

async function settle (wrapper) {
  for (let i = 0; i < 8; i++) { await wrapper.vm.$nextTick() }
}

/** GETs answer with `page` (or a function of the call index); history with `versions`; POSTs with success. */
async function mountPage (page, versions, postStatus) {
  let gets = 0
  global.fetch = jest.fn((path, opts) => {
    if (opts.method === 'GET' && path === BASE + '/history') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, versions: versions || [] }) })
    }
    if (opts.method === 'GET') {
      const payload = typeof page === 'function' ? page(gets++) : (page === undefined ? pagePayload() : page)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    }
    const ok = !postStatus || postStatus < 400
    return Promise.resolve({
      ok,
      status: postStatus || 200,
      json: () => Promise.resolve(ok ? pagePayload() : { success: false, error: { code: 'X', message: 'refused by the backend' } })
    })
  })
  const wrapper = mountWithBuefy(MentorOutcomeLearning, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('what the mentor opens', () => {
  it('reads the page and the history with the bearer token', async () => {
    const wrapper = await mountPage()
    expect(calls().map(c => c.slice(0, 2))).toEqual([['GET', BASE], ['GET', BASE + '/history']])
    global.fetch.mock.calls.forEach(([, opts]) => expect(opts.headers.Authorization).toBe('Bearer test-token'))
    expect(wrapper.vm.page.firms).toBe(7)
    expect(wrapper.vm.isEmpty).toBe(false)
  })

  it('a young pool is the empty state, with its numbers, not a broken page', async () => {
    const wrapper = await mountPage(pagePayload({ firms: 2, cases: 11, adjustments: [] }))
    expect(wrapper.vm.isEmpty).toBe(true)
    expect(wrapper.vm.page.cases).toBe(11)
    expect(wrapper.vm.loadError).toBe('')
  })

  it('a failed load is reported, not shown as an empty pool', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ success: false, error: { message: 'Could not read the outcome pool' } }) }))
    const wrapper = mountWithBuefy(MentorOutcomeLearning, { propsData: { apiToken: 'test-token' } })
    await settle(wrapper)
    expect(wrapper.vm.loadError).toBe('Could not read the outcome pool')
  })

  it('a history that cannot be read does not take the table with it', async () => {
    global.fetch = jest.fn(path => path === BASE + '/history'
      ? Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
      : Promise.resolve({ ok: true, json: () => Promise.resolve(pagePayload()) }))
    const wrapper = mountWithBuefy(MentorOutcomeLearning, { propsData: { apiToken: 'test-token' } })
    await settle(wrapper)
    expect(wrapper.vm.loadError).toBe('')
    expect(wrapper.vm.page.adjustments).toHaveLength(1)
    expect(wrapper.vm.versions).toEqual([])
  })

  it('counts the states for the tile from the backend\'s rows', async () => {
    const wrapper = await mountPage(pagePayload({
      adjustments: [
        adj({ id: 'a', state: 'live', decision: { state: 'live', at: '2026-11-03T00:00:00Z', by: 'm' } }),
        adj({ id: 'b', state: 'proposed' }),
        adj({ id: 'c', state: 'proposed' }),
        adj({ id: 'd', state: 'held', decision: { state: 'held', at: '2026-11-12T00:00:00Z', by: 'm' } }),
        adj({ id: 'e', state: 'below_floor', meetsFloor: false, firms: 4, cases: 19 })
      ]
    }))
    expect(wrapper.vm.counts).toEqual({ live: 1, proposed: 2, held: 1, below: 1 })
  })
})

describe('what is offered', () => {
  it('accept is never offered below the floor, on a rejected row, or on a live one', async () => {
    const wrapper = await mountPage()
    expect(wrapper.vm.canAccept(adj({ state: 'proposed' }))).toBe(true)
    expect(wrapper.vm.canAccept(adj({ state: 'held' }))).toBe(true)
    expect(wrapper.vm.canAccept(adj({ state: 'below_floor', meetsFloor: false }))).toBe(false)
    expect(wrapper.vm.canAccept(adj({ state: 'orphaned' }))).toBe(false)
    expect(wrapper.vm.canAccept(adj({ state: 'rejected' }))).toBe(false)
    expect(wrapper.vm.canAccept(adj({ state: 'live' }))).toBe(false)
  })

  it('a rejected or below-floor row gets no buttons at all', async () => {
    const wrapper = await mountPage()
    for (const state of ['rejected', 'below_floor']) {
      const a = adj({ state, meetsFloor: state !== 'below_floor' })
      expect(wrapper.vm.canAccept(a) || wrapper.vm.canHold(a) || wrapper.vm.canReject(a)).toBe(false)
    }
  })

  // The "needs N more" sub-line is arithmetic against the floor the backend sent, and a
  // wrong number here would send a mentor chasing the wrong firms.
  it('says how far below the floor a row is, from the floor the backend sent', async () => {
    const wrapper = await mountPage(pagePayload({ floor: { minFirms: 5, minCases: 25 } }))
    const sub = wrapper.vm.stateSub(adj({ state: 'below_floor', meetsFloor: false, firms: 4, cases: 19 }))
    expect(sub).toContain('outcomeLearning.moreFirms 1')
    expect(sub).toContain('outcomeLearning.moreCases 6')
  })

  it('a domain or engagement type is shown by its label, a signal as words, an industry as typed', async () => {
    const wrapper = await mountPage()
    expect(wrapper.vm.situationWords({ dimension: 'domain', value: 'profit' })).toBe('profitability and feasibility')
    expect(wrapper.vm.situationWords({ dimension: 'engagementType', value: 'education' })).toBe('education')
    expect(wrapper.vm.situationWords({ dimension: 'signal', value: 'financial_foundations_gap' })).toBe('financial foundations gap')
    expect(wrapper.vm.situationWords({ dimension: 'industry', value: 'cafe' })).toBe('cafe')
  })
})

describe('deciding', () => {
  it('accept sends exactly { id, state: "live" } and re-reads the page', async () => {
    const wrapper = await mountPage(i => (i === 0 ? pagePayload() : pagePayload({ adjustments: [adj({ state: 'live', decision: { state: 'live', at: '2026-09-11T10:00:00Z', by: 'm@x' } })] })))
    await wrapper.vm.decide(adj(), 'live')
    expect(posts()).toEqual([['POST', BASE + '/decision', { id: 'break-even|domain|profit', state: 'live' }]])
    expect(wrapper.vm.page.adjustments[0].state).toBe('live')
  })

  it('hold sends exactly { id, state: "held" } with no reason', async () => {
    const wrapper = await mountPage()
    await wrapper.vm.decide(adj(), 'held')
    expect(posts()).toEqual([['POST', BASE + '/decision', { id: 'break-even|domain|profit', state: 'held' }]])
  })

  it('reject sends nothing without a reason', async () => {
    const wrapper = await mountPage()
    wrapper.vm.openReject(adj())
    wrapper.vm.rejectReason = '   '
    await wrapper.vm.confirmReject()
    expect(posts()).toEqual([])
    expect(wrapper.vm.rejecting).not.toBeNull()
  })

  it('reject with a reason sends exactly { id, state: "rejected", reason } and closes the dialog', async () => {
    const wrapper = await mountPage()
    wrapper.vm.openReject(adj())
    wrapper.vm.rejectReason = '  taught first in this domain  '
    await wrapper.vm.confirmReject()
    expect(posts()).toEqual([['POST', BASE + '/decision', { id: 'break-even|domain|profit', state: 'rejected', reason: 'taught first in this domain' }]])
    expect(wrapper.vm.rejecting).toBeNull()
  })

  it('a refusal from the backend keeps the dialog open with the message', async () => {
    const wrapper = await mountPage(undefined, [], 400)
    wrapper.vm.openReject(adj())
    wrapper.vm.rejectReason = 'why'
    await wrapper.vm.confirmReject()
    expect(wrapper.vm.rejectError).toBe('refused by the backend')
    expect(wrapper.vm.rejecting).not.toBeNull()
  })

  it('recompute now posts to the recompute route with no body', async () => {
    const wrapper = await mountPage()
    await wrapper.vm.recomputeNow()
    expect(posts()).toEqual([['POST', BASE + '/recompute', null]])
  })
})

describe('history', () => {
  it('lists decisions newest first with what they were taken on', async () => {
    const wrapper = await mountPage(pagePayload({
      adjustments: [
        adj({ id: 'a', state: 'live', decision: { state: 'live', at: '2026-11-03T00:00:00Z', by: 'r@x', reason: '' } }),
        adj({ id: 'b', state: 'held', decision: { state: 'held', at: '2026-11-12T00:00:00Z', by: 'r@x', reason: 'wait' } }),
        adj({ id: 'c', state: 'proposed' })
      ],
      orphaned: [adj({ id: 'o', template: 'Gone', state: 'orphaned', decision: { state: 'live', at: '2026-10-20T00:00:00Z', by: 'r@x' } })]
    }))
    expect(wrapper.vm.decisionRows.map(d => [d.id, d.state])).toEqual([['b', 'held'], ['a', 'live'], ['o', 'live']])
  })

  it('only saved versions that are not the live one can be restored, and restore sends the version id alone', async () => {
    const wrapper = await mountPage(undefined, [
      { id: 9, version: 3, is_active: 1, saved_by: 'm@x', created_at: '2026-11-12T00:00:00Z' },
      { id: 8, version: 2, is_active: 0, saved_by: 'm@x', created_at: '2026-11-03T00:00:00Z' }
    ])
    expect(wrapper.vm.restorable.map(v => v.id)).toEqual([8])
    await wrapper.vm.restore(wrapper.vm.restorable[0])
    expect(posts()).toEqual([['POST', BASE + '/restore', { versionId: 8 }]])
  })
})
