/**
 * @jest-environment jsdom
 */
'use strict'

// The Outcome Sharing tab as a firm manager actually meets it — item 4.87, T020.
//
// 🔴 WHAT THIS FILE IS FOR. A manager sees a switch go green and a count come back. What
// they cannot see, and what UAT cannot see either, is what was SENT and what was not:
//
//   1. A CONSENT NOBODY TICKED IS NEVER SENT. The tick is the manager's signature on the
//      pinned sentence; a path through this screen that posted `on: true` without it would
//      be a consent the record says was given and nobody gave.
//
//   2. EACH BUTTON SENDS EXACTLY ONE FIELD. The signer's name is the token's — a body that
//      grew a `setBy` or a `firmId` would be an invitation the backend has to keep refusing.
//
//   3. STOP AND WITHDRAW ARE TWO DIFFERENT CALLS, and neither makes the other. Mike's task
//      text: opting out "stops future contributions without deleting what was already
//      pooled unless the manager asks for that too". A withdrawal that flipped the switch, or
//      a stop that deleted rows, would look identical on screen and be a different promise.
//
//   4. WITHDRAWAL NEEDS ITS OWN TICK, because the rows are deleted, not marked.
//
// Assertions are on the payload and on component state, never on wording or CSS — the
// `$t` stand-in returns the key, so wording is not this file's business.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmOutcomeConsent = require('../../components/firm/FirmOutcomeConsent.vue').default

const WORDING = 'the pinned sentence, as the backend sends it'

const CONSENT_ON = {
  on: true,
  setBy: 'janine@apex.example',
  setAt: '2026-09-10T09:41:00Z',
  wording: WORDING,
  withdrawals: [],
  events: [{ on: true, by: 'janine@apex.example', at: '2026-09-10T09:41:00Z' }]
}

/** A read response as the real route builds it. */
function readPayload (over) {
  return Object.assign({ success: true, consent: null, wording: WORDING, pooledCount: 0, adjustmentsApplying: null }, over || {})
}

/** Every call the component made, as `[method, path, body]`. */
function calls () {
  return global.fetch.mock.calls.map(([path, opts]) => [
    opts.method,
    path,
    opts.body ? JSON.parse(opts.body) : null
  ])
}

function posts () {
  return calls().filter(c => c[0] === 'POST')
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick() }
}

/**
 * Mount with a fetch that answers every GET with `read` and every POST with `{ success: true }`.
 * `read` may be a function of the call index so a re-read after a write can differ.
 */
async function mountTab (read, postStatus) {
  let gets = 0
  global.fetch = jest.fn((path, opts) => {
    if (opts.method === 'GET') {
      const payload = typeof read === 'function' ? read(gets++) : (read === undefined ? readPayload() : read)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    }
    const ok = !postStatus || postStatus < 400
    return Promise.resolve({
      ok,
      status: postStatus || 200,
      json: () => Promise.resolve(ok ? { success: true } : { success: false, error: { code: 'X', message: 'refused by the backend' } })
    })
  })
  const wrapper = mountWithBuefy(FirmOutcomeConsent, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('what a manager opens', () => {
  it('reads the switch on mount with the bearer token, and takes the wording from the backend', async () => {
    const wrapper = await mountTab()
    expect(calls()[0].slice(0, 2)).toEqual(['GET', '/api/firm-manager/outcome-consent'])
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
    expect(wrapper.vm.wording).toBe(WORDING)
    expect(wrapper.vm.sharing).toBe(false)
  })

  it('a failed load is reported, not an empty page', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ success: false, error: { message: 'Could not read the sharing setting' } }) }))
    const wrapper = mountWithBuefy(FirmOutcomeConsent, { propsData: { apiToken: 'test-token' } })
    await settle(wrapper)
    expect(wrapper.vm.loadError).toBe('Could not read the sharing setting')
    expect(wrapper.vm.loading).toBe(false)
  })

  it('a network failure is reported in words, not thrown', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    const wrapper = mountWithBuefy(FirmOutcomeConsent, { propsData: { apiToken: 'test-token' } })
    await settle(wrapper)
    expect(wrapper.vm.loadError).toBe('outcomeConsent.unreachable')
  })
})

describe('starting to share', () => {
  it('sends nothing until the sentence is ticked', async () => {
    const wrapper = await mountTab()
    await wrapper.vm.setSharing(true)
    expect(posts()).toEqual([])
  })

  it('with the tick, sends exactly { on: true } and nothing about who or which firm', async () => {
    const wrapper = await mountTab(i => (i === 0 ? readPayload() : readPayload({ consent: CONSENT_ON, adjustmentsApplying: 2 })))
    wrapper.vm.ticked = true
    await wrapper.vm.setSharing(true)
    expect(posts()).toEqual([['POST', '/api/firm-manager/outcome-consent', { on: true }]])
    // Re-read rather than patched: the state on screen is the backend's, not a guess.
    expect(wrapper.vm.sharing).toBe(true)
    expect(wrapper.vm.adjustmentsApplying).toBe(2)
    expect(wrapper.vm.ticked).toBe(false)
  })

  it('a refusal from the backend keeps the manager where they were, with the message', async () => {
    const wrapper = await mountTab(undefined, 403)
    wrapper.vm.ticked = true
    await wrapper.vm.setSharing(true)
    expect(wrapper.vm.switchError).toBe('refused by the backend')
    expect(wrapper.vm.sharing).toBe(false)
  })
})

describe('stopping', () => {
  it('sends exactly { on: false } and never a withdrawal', async () => {
    const wrapper = await mountTab(readPayload({ consent: CONSENT_ON, pooledCount: 14 }))
    expect(wrapper.vm.sharing).toBe(true)
    await wrapper.vm.setSharing(false)
    expect(posts()).toEqual([['POST', '/api/firm-manager/outcome-consent', { on: false }]])
  })
})

describe('withdrawing what was shared', () => {
  it('is offered only when the pool holds something of this firm\'s', async () => {
    expect((await mountTab(readPayload({ consent: CONSENT_ON, pooledCount: 14 }))).vm.canWithdraw).toBe(true)
    expect((await mountTab(readPayload({ consent: CONSENT_ON, pooledCount: 0 }))).vm.canWithdraw).toBe(false)
    // No secret on the server: the count is null and there is nothing to withdraw through.
    expect((await mountTab(readPayload({ consent: CONSENT_ON, pooledCount: null }))).vm.canWithdraw).toBe(false)
    expect((await mountTab(readPayload({ consent: CONSENT_ON, pooledCount: null }))).vm.poolConfigured).toBe(false)
  })

  it('is offered to a firm that has STOPPED sharing but still has rows in the pool', async () => {
    const wrapper = await mountTab(readPayload({ consent: Object.assign({}, CONSENT_ON, { on: false }), pooledCount: 5 }))
    expect(wrapper.vm.sharing).toBe(false)
    expect(wrapper.vm.canWithdraw).toBe(true)
  })

  it('opening the confirmation sends nothing, and neither does confirming without the tick', async () => {
    const wrapper = await mountTab(readPayload({ consent: CONSENT_ON, pooledCount: 14 }))
    wrapper.vm.openWithdraw()
    await wrapper.vm.withdraw()
    expect(posts()).toEqual([])
    expect(wrapper.vm.withdrawing).toBe(true)
  })

  it('with the tick, sends exactly { confirm: true } to the withdraw route and touches the switch not at all', async () => {
    const after = Object.assign({}, CONSENT_ON, {
      withdrawals: [{ requestedBy: 'janine@apex.example', requestedAt: '2026-11-14T10:00:00Z', removed: 14 }]
    })
    const wrapper = await mountTab(i => (i === 0
      ? readPayload({ consent: CONSENT_ON, pooledCount: 14 })
      : readPayload({ consent: after, pooledCount: 0 })))
    wrapper.vm.openWithdraw()
    wrapper.vm.withdrawTicked = true
    await wrapper.vm.withdraw()
    expect(posts()).toEqual([['POST', '/api/firm-manager/outcome-consent/withdraw', { confirm: true }]])
    expect(wrapper.vm.sharing).toBe(true)
    expect(wrapper.vm.pooledCount).toBe(0)
    expect(wrapper.vm.withdrawing).toBe(false)
  })

  it('a refusal keeps the confirmation open with the message, and nothing else is sent', async () => {
    const wrapper = await mountTab(readPayload({ consent: CONSENT_ON, pooledCount: 14 }), 503)
    wrapper.vm.openWithdraw()
    wrapper.vm.withdrawTicked = true
    await wrapper.vm.withdraw()
    expect(posts()).toHaveLength(1)
    expect(wrapper.vm.withdrawError).toBe('refused by the backend')
    expect(wrapper.vm.withdrawing).toBe(true)
  })
})

describe('the history card', () => {
  it('lists every switch and every withdrawal, newest first', async () => {
    const consent = {
      on: false,
      setBy: 'janine@apex.example',
      setAt: '2026-11-14T09:00:00Z',
      wording: WORDING,
      withdrawals: [{ requestedBy: 'janine@apex.example', requestedAt: '2026-11-14T10:00:00Z', removed: 14 }],
      events: [
        { on: true, by: 'janine@apex.example', at: '2026-09-10T09:41:00Z' },
        { on: false, by: 'janine@apex.example', at: '2026-11-14T09:00:00Z' }
      ]
    }
    const wrapper = await mountTab(readPayload({ consent, pooledCount: 0 }))
    expect(wrapper.vm.history.map(h => [h.kind, h.on, h.removed])).toEqual([
      ['withdrew', undefined, 14],
      ['switch', false, undefined],
      ['switch', true, undefined]
    ])
  })

  it('a record written before switches were kept shows its current state as the one switch', async () => {
    const wrapper = await mountTab(readPayload({ consent: Object.assign({}, CONSENT_ON, { events: [] }), pooledCount: 3 }))
    expect(wrapper.vm.history).toEqual([{ kind: 'switch', at: CONSENT_ON.setAt, by: CONSENT_ON.setBy, on: true }])
  })

  it('a firm that has never switched has no history', async () => {
    expect((await mountTab()).vm.history).toEqual([])
  })
})
