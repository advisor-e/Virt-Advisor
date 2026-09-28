/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * StrategyConceptSummary — item 8.4, slice 4 (screen 10, approved 2026-09-28).
 *
 * Nothing here asserts wording or CSS. What UAT cannot see:
 *   - "Approve summary" does NOTHING until the client's tick is ticked, and when it acts it
 *     sends `clientAgreed: true` — the server's own condition;
 *   - an edit sends every heading's words and clears the approval on screen, as the server does;
 *   - the summary is read once it has been written, not before, and a failed read says so.
 */

const StrategyConceptSummary = require('../../components/strategy/StrategyConceptSummary.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const URL = '/api/meeting/recordings/m1/segments/2/summary'
const SECTIONS = [
  { heading: 'How Suppliers May Change', text: 'Only two coaters.' },
  { heading: 'How Customers May Change', text: null }
]

function ok (body) { return Promise.resolve({ ok: true, json: () => Promise.resolve(body) }) }

function mount (state) {
  return mountWithBuefy(StrategyConceptSummary, {
    propsData: { apiToken: 'tok', meetingId: 'm1', segment: { n: 2, summaryState: state || 'ready' } }
  })
}

afterEach(() => { delete global.fetch })

test('a written summary is read with the segment\'s own address and the advisor\'s token', async () => {
  global.fetch = jest.fn(() => ok({ sections: SECTIONS, summary: { approvedAt: null } }))
  const w = mount()
  await flush()
  const [url, opts] = global.fetch.mock.calls[0]
  expect(url).toBe(URL)
  expect(opts.headers.Authorization).toBe('Bearer tok')
  expect(w.vm.sections).toEqual(SECTIONS)
})

test('a summary still being written is not read until it is ready', async () => {
  global.fetch = jest.fn(() => ok({ sections: SECTIONS, summary: {} }))
  const w = mount('writing')
  await flush()
  expect(global.fetch).not.toHaveBeenCalled()
  await w.setProps({ segment: { n: 2, summaryState: 'ready' } })
  await flush()
  expect(global.fetch).toHaveBeenCalledTimes(1)
})

test('a failed read says so rather than showing nothing', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'x', json: () => Promise.resolve({ error: { message: 'That section has not been turned into text.' } }) }))
  const w = mount()
  await flush()
  expect(w.vm.loadError).toMatch(/not been turned into text/)
})

test('🔴 without the client\'s tick, approving sends nothing', async () => {
  global.fetch = jest.fn(() => ok({ sections: SECTIONS, summary: { approvedAt: null } }))
  const w = mount()
  await flush()
  global.fetch.mockClear()
  await w.vm.approve()
  expect(global.fetch).not.toHaveBeenCalled()
})

test('🔴 with the tick, approving sends clientAgreed: true, and the card shows it approved', async () => {
  global.fetch = jest.fn(() => ok({ sections: SECTIONS, summary: { approvedAt: null } }))
  const w = mount()
  await flush()
  w.vm.clientAgrees = true
  global.fetch = jest.fn(() => ok({ approved: true, at: '2026-09-28T09:48:00.000Z' }))
  await w.vm.approve()
  const [url, opts] = global.fetch.mock.calls[0]
  expect(url).toBe(URL + '/approve')
  expect(JSON.parse(opts.body)).toEqual({ clientAgreed: true })
  expect(w.vm.approvedAt).toBe('2026-09-28T09:48:00.000Z')
  expect(w.emitted().changed[0]).toEqual([2])
})

test('an edit sends every heading\'s words and clears the approval', async () => {
  global.fetch = jest.fn(() => ok({ sections: SECTIONS, summary: { approvedAt: '2026-09-28T09:00:00.000Z' } }))
  const w = mount()
  await flush()
  w.vm.startEdit()
  w.vm.draft[0] = 'One coater, full until March.'
  global.fetch = jest.fn(() => ok({ saved: true, sections: [{ heading: 'How Suppliers May Change', text: 'One coater, full until March.' }, SECTIONS[1]] }))
  await w.vm.save()
  const body = JSON.parse(global.fetch.mock.calls[0][1].body)
  expect(body.sections).toEqual([
    { heading: 'How Suppliers May Change', text: 'One coater, full until March.' },
    { heading: 'How Customers May Change', text: '' }
  ])
  expect(w.vm.approvedAt).toBeNull()
  expect(w.vm.clientAgrees).toBe(false)
  expect(w.vm.editing).toBe(false)
})

test('a refused approval or edit shows the server\'s reason and changes nothing', async () => {
  global.fetch = jest.fn(() => ok({ sections: SECTIONS, summary: { approvedAt: null } }))
  const w = mount()
  await flush()
  w.vm.clientAgrees = true
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'x', json: () => Promise.resolve({ error: { message: 'Tick that the client agrees first.' } }) }))
  await w.vm.approve()
  expect(w.vm.actError).toMatch(/client agrees/)
  expect(w.vm.approvedAt).toBeNull()
  w.vm.startEdit()
  await w.vm.save()
  expect(w.vm.editing).toBe(true)
})

describe('a summary the AI could not write (Mike\'s wording, 2026-09-28)', () => {
  test('says so, rather than showing a concept with nothing in it', () => {
    global.fetch = jest.fn()
    const w = mount('failed')
    expect(w.vm.failed).toBe(true)
    expect(w.find('.scs').exists()).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('"Write it again" asks the server once, then picks up the rewritten summary', async () => {
    const w = mount('failed')
    const replies = [
      ok({ started: true }),
      ok({ state: 'writing', summary: null, sections: [] }),
      ok({ state: 'ready', summary: { approvedAt: null }, sections: SECTIONS })
    ]
    global.fetch = jest.fn(() => replies.shift())
    jest.useFakeTimers('legacy')
    await w.vm.retry()
    expect(global.fetch.mock.calls[0][0]).toBe(URL)
    expect(global.fetch.mock.calls[0][1].method).toBe('POST')
    expect(w.vm.failed).toBe(false)
    for (let i = 0; i < 5; i += 1) { await Promise.resolve() }
    jest.advanceTimersByTime(4000)
    for (let i = 0; i < 5; i += 1) { await Promise.resolve() }
    jest.useRealTimers()
    expect(w.vm.sections).toEqual(SECTIONS)
    expect(w.vm.retrying).toBe(false)
  })

  test('failing a second time shows the failure again, with the button', async () => {
    const w = mount('failed')
    const replies = [ok({ started: true }), ok({ state: 'failed', summary: null, sections: [] })]
    global.fetch = jest.fn(() => replies.shift())
    await w.vm.retry()
    await flush()
    expect(w.vm.retrying).toBe(false)
    expect(w.vm.failed).toBe(true)
  })

  test('a refused retry — an approved summary, say — shows the server\'s reason', async () => {
    const w = mount('failed')
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'x', json: () => Promise.resolve({ error: { message: 'This summary is approved. Edit it instead.' } }) }))
    await w.vm.retry()
    expect(w.vm.actError).toMatch(/approved/)
  })
})
