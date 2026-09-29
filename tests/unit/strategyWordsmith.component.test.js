/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * Wordsmith on the Alignment Statements card — item 15.14, screens 1–5.
 *
 * What UAT cannot see: what each button sends, and what a failure leaves behind. A rewrite that
 * sent the tone or the client's words from the browser, a box written without the client's tick,
 * or a box "saved" when the server refused all look like buttons that worked. The server's rules
 * are in tests/unit/wordsmith.routes.test.js; this proves the screen mirrors them.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyWordsmith = require('~/components/strategy/StrategyWordsmith.vue').default

const CAPTURE = { supplied: true, fields: [{ key: 't0r0c1', columnLabel: 'Vision' }, { key: 't0r2c1', columnLabel: 'Purpose' }] }
const RESULT = {
  purpose: 'a poster',
  style: 'humble',
  settings: { sentenceLength: 'short', formality: 'plain', jargon: 'avoid', voice: 'we', tone: ['warm'], audience: 'staff' },
  statements: [{ name: 'Vision', empty: false, quotes: [{ text: 'We want to be trusted.', room: false }], questions: [], draft: { text: 'We are trusted.', why: 'w' }, checks: { passed: true, issues: [] } }]
}

let responses
function fetchMock () {
  return jest.fn((url, opts) => {
    const method = (opts && opts.method) || 'GET'
    const next = responses.find(r => r.method === method && String(url).endsWith(r.ends))
    const { status = 200, body } = next || { status: 500, body: {} }
    return Promise.resolve({ ok: status < 400, status, statusText: 'x', json: () => Promise.resolve(body) })
  })
}

async function settle (wrapper) {
  for (let i = 0; i < 8; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
}

const sentBodies = method => global.fetch.mock.calls.filter(c => c[1] && c[1].method === method).map(c => ({ url: String(c[0]), body: JSON.parse(c[1].body) }))

function mount (segments) {
  return mountWithBuefy(StrategyWordsmith, {
    propsData: { apiToken: 't', meetingId: 'm1', sessionId: 7, capture: CAPTURE, segments: segments || [{ n: 2, state: 'done' }], entries: {} }
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  responses = [
    { method: 'POST', ends: '/wordsmith', body: { runId: 'r1', runNumber: 1 } },
    { method: 'GET', ends: '/wordsmith/r1', body: { state: 'done', result: RESULT } }
  ]
  global.fetch = fetchMock()
})
afterEach(() => { jest.useRealTimers() })

test.each([
  [[], true],
  [[{ n: 2, state: 'transcribing' }], true],
  [[{ n: 2, state: 'done' }], false]
])('Decision A: sections %j leave the button disabled = %p', async (segments, disabled) => {
  const wrapper = mount(segments)
  await settle(wrapper)
  expect(wrapper.find('button').attributes('disabled') !== undefined).toBe(disabled)
})

async function writtenPanel () {
  const wrapper = mount()
  wrapper.vm.open = true
  wrapper.vm.purpose = 'a poster'
  wrapper.vm.style = 'humble'
  await wrapper.vm.start()
  await settle(wrapper)
  return wrapper
}

test('🔴 "Write again with these" sends four choices and the base run — never the tone, the reader or the client\'s words', async () => {
  const wrapper = await writtenPanel()
  wrapper.vm.settings.voice = 'the-business'
  await wrapper.vm.againWithSettings()
  const last = sentBodies('POST').pop()
  expect(last.body).toEqual({ baseRunId: 'r1', settings: { sentenceLength: 'short', formality: 'plain', jargon: 'avoid', voice: 'the-business' } })
})

test('🔴 "Use this wording" is disabled until the client\'s tick, and sends clientAgreed only then', async () => {
  const wrapper = await writtenPanel()
  const draft = wrapper.findComponent({ name: 'StrategyWordsmithDraft' })
  const useButton = () => draft.findAll('button').filter(b => b.text() === 'strategyPlanner.wordsmith.buttons.use').at(0)
  expect(useButton().attributes('disabled')).toBeDefined()
  draft.vm.clientAgrees = true
  await settle(wrapper)
  expect(useButton().attributes('disabled')).toBeUndefined()
})

test('the box is reported written only after the server saved it; a refusal writes nothing', async () => {
  const wrapper = await writtenPanel()
  responses.unshift({ method: 'POST', ends: '/use', status: 500, body: { error: { code: 'WORDSMITH_SAVE_FAILED', message: 'x' } } })
  await wrapper.vm.use({ statement: 'Vision', text: 'We are trusted.' })
  expect(wrapper.emitted('wording-used')).toBeUndefined()
  responses.shift()
  responses.unshift({ method: 'POST', ends: '/use', body: { fieldKey: 't0r0c1', value: 'We are trusted.', markerKey: 'wordsmith:t0r0c1', marker: '{}' } })
  await wrapper.vm.use({ statement: 'Vision', text: 'We are trusted.' })
  expect(wrapper.emitted('wording-used')[0][0]).toMatchObject({ fieldKey: 't0r0c1' })
  expect(sentBodies('POST').pop().body).toEqual({ sessionId: 7, statement: 'Vision', text: 'We are trusted.', clientAgreed: true })
})

test('checking back stops when the panel goes', async () => {
  responses[1] = { method: 'GET', ends: '/wordsmith/r1', body: { state: 'writing' } }
  const wrapper = await writtenPanel()
  const before = global.fetch.mock.calls.length
  wrapper.destroy()
  jest.advanceTimersByTime(30000)
  await Promise.resolve()
  expect(global.fetch.mock.calls.length).toBe(before)
})
