/**
 * @jest-environment jsdom
 */
'use strict'

// MeetingUnfinished — item 8.5, the advisor's recordings that were started and never finished.
//
// Per the testing ruling (2026-08-24) nothing here asserts wording or CSS; Mike's red warning is
// his own wording and a person sees it at once. What UAT cannot see, and these tests pin:
//
// - "Use what was captured" finishes THAT recording and no other — two unfinished recordings
//   look alike on screen;
// - "Stop and delete" sends a DELETE for that recording, and the row goes only once the server
//   has confirmed it — a row vanishing on a failed delete would read as a deleted recording;
// - a refusal (no confirmed consent) shows the server's own reason rather than nothing;
// - a list that failed to load says so, never renders as "nothing unfinished".

const MeetingUnfinished = require('../../components/MeetingUnfinished.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function jsonResponse (body, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

const LIST = {
  recordings: [
    { meetingId: 'aaa', meetingType: 'Strategy Session', createdAt: '2026-09-28T10:00:00.000Z', consentConfirmed: true },
    { meetingId: 'bbb', meetingType: 'End of Year Meeting', createdAt: '2026-09-29T10:00:00.000Z', consentConfirmed: false }
  ]
}

function mount () {
  return mountWithBuefy(MeetingUnfinished, { propsData: { apiToken: 'tok' } })
}

afterEach(() => { delete global.fetch })

test('nothing unfinished renders nothing at all', async () => {
  global.fetch = jest.fn(() => jsonResponse({ recordings: [] }))
  const wrapper = mount()
  await flush()
  expect(wrapper.find('.munf').exists()).toBe(false)
})

test('a list that failed to load says so, rather than looking like nothing unfinished', async () => {
  global.fetch = jest.fn(() => jsonResponse({ error: { message: 'Could not list' } }, false))
  const wrapper = mount()
  await flush()
  expect(wrapper.find('.munf').exists()).toBe(true)
  expect(wrapper.vm.loadError).toBe('Could not list')
})

test('finishing sends the finish for THAT recording only, with the advisor\'s token', async () => {
  global.fetch = jest.fn(() => jsonResponse(LIST))
  const wrapper = mount()
  await flush()
  global.fetch = jest.fn(url => jsonResponse(url.endsWith('/finish') ? { started: true } : { state: 'transcribing' }))

  await wrapper.vm.finish(LIST.recordings[1])
  const [url, opts] = global.fetch.mock.calls[0]
  expect(url).toBe('/api/meeting/recordings/bbb/finish')
  expect(opts.method).toBe('POST')
  expect(opts.headers.Authorization).toBe('Bearer tok')
  expect(wrapper.vm.state.bbb).toBe('finishing')
  expect(wrapper.vm.state.aaa).toBeUndefined()
  clearTimeout(wrapper.vm._poll)
})

test('a refused finish shows the server\'s own reason', async () => {
  global.fetch = jest.fn(() => jsonResponse(LIST))
  const wrapper = mount()
  await flush()
  global.fetch = jest.fn(() => jsonResponse({ error: { message: 'This recording has no confirmed consent' } }, false))
  await wrapper.vm.finish(LIST.recordings[1])
  expect(wrapper.vm.errors.bbb).toMatch(/no confirmed consent/)
  expect(wrapper.vm.state.bbb).toBeUndefined()
})

test('once transcribed, the recording offers its reports', async () => {
  global.fetch = jest.fn(() => jsonResponse(LIST))
  const wrapper = mount()
  await flush()
  global.fetch = jest.fn(() => jsonResponse({ state: 'done' }))
  await wrapper.vm.poll('aaa')
  expect(wrapper.vm.state.aaa).toBe('done')
})

test('a transcription that failed drops the row — its audio is already gone', async () => {
  global.fetch = jest.fn(() => jsonResponse(LIST))
  const wrapper = mount()
  await flush()
  global.fetch = jest.fn(() => jsonResponse({ state: 'failed' }))
  await wrapper.vm.poll('aaa')
  expect(wrapper.vm.recordings.map(r => r.meetingId)).toEqual(['bbb'])
})

test('"Stop and delete" deletes that recording, and the row goes only once the server confirms', async () => {
  global.fetch = jest.fn(() => jsonResponse(LIST))
  const wrapper = mount()
  await flush()

  global.fetch = jest.fn(() => jsonResponse({ error: { message: 'Some of this recording could not be deleted' } }, false))
  await wrapper.vm.remove(LIST.recordings[0])
  expect(wrapper.vm.recordings).toHaveLength(2)
  expect(wrapper.vm.errors.aaa).toMatch(/could not be deleted/)

  global.fetch = jest.fn(() => jsonResponse({ deleted: true }))
  await wrapper.vm.remove(LIST.recordings[0])
  const [url, opts] = global.fetch.mock.calls[0]
  expect(url).toBe('/api/meeting/recordings/aaa')
  expect(opts.method).toBe('DELETE')
  expect(wrapper.vm.recordings.map(r => r.meetingId)).toEqual(['bbb'])
})
