/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * MeetingRecorder in 20-minute parts — item 8.4, `design/mockups/meeting-review-long-recording.html`,
 * approved by Mike 2026-10-01.
 *
 * Per the testing ruling (2026-08-24) nothing here asserts wording or CSS. What UAT cannot see:
 *   - a meeting is opened IN PARTS, and its audio goes to the live part — a single-file meeting
 *     past 23 min 20 s loses its transcript and its audio (OpenAI's 1400-second limit);
 *   - a part rolls over at 20 minutes, inside that limit — no tester records that long;
 *   - THE ADVISOR'S VOICE CLIP NEVER LEAVES THE BROWSER for a meeting that ends inside one part,
 *     and is sent before part 2 opens otherwise (Decision C, its privacy risk ruled by Mike);
 *   - finishing waits for the last chunk before telling the server to finish.
 */

const MeetingRecorder = require('../../components/MeetingRecorder.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

async function flush () {
  for (let i = 0; i < 10; i += 1) { await Promise.resolve() }
}

/** A stand-in MediaRecorder: records nothing, remembers what happened to it. */
class FakeRecorder {
  constructor (stream) {
    this.stream = stream
    this.state = 'inactive'
    FakeRecorder.made.push(this)
  }

  start (ms) { this.state = 'recording'; this.timeslice = ms }
  stop () {
    this.state = 'inactive'
    if (this.onstop) { this.onstop() }
  }
}
FakeRecorder.made = []

let calls = []
function reply (url, opts) {
  calls.push({ url, method: (opts && opts.method) || 'GET', body: opts && typeof opts.body === 'string' ? JSON.parse(opts.body) : null })
  let body = {}
  if (url === '/api/meeting/consent') { body = { retentionMonths: 18 } }
  if (url === '/api/meeting/recordings' && opts.method === 'POST') { body = { meetingId: 'm1' } }
  if (/\/segments$/.test(url)) {
    const n = calls.filter(c => /\/segments$/.test(c.url)).length
    body = { segment: n, segments: [{ n, state: 'recording' }] }
  }
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
}

function mount () {
  return mountWithBuefy(MeetingRecorder, { propsData: { apiToken: 'tok', scenarioId: 'discovery' } })
}

/** Start recording, let the 8-second clip finish, and agree to consent. */
async function startMeeting (w) {
  await w.vm.startRecording()
  FakeRecorder.made[1].ondataavailable({ data: new Blob(['VOICE'], { type: 'audio/webm' }) })
  jest.advanceTimersByTime(8000)
  await w.vm.confirmConsent()
}

const clipSent = () => calls.some(c => /\/voice-reference$/.test(c.url))

beforeEach(() => {
  calls = []
  FakeRecorder.made = []
  global.fetch = jest.fn(reply)
  global.MediaRecorder = FakeRecorder
  global.navigator.mediaDevices = { getUserMedia: jest.fn(() => Promise.resolve({ getTracks: () => [], active: true })) }
  jest.useFakeTimers('legacy')
})

afterEach(() => {
  jest.useRealTimers()
  delete global.fetch
  delete global.MediaRecorder
})

test('a meeting is opened in parts, part 1 first, and its audio goes to that part', async () => {
  const w = mount()
  await w.vm.startRecording()
  const start = calls.find(c => c.url === '/api/meeting/recordings')
  expect(start.body).toEqual({ scenarioId: 'discovery', clientId: null, segmented: true, parts: true })
  expect(calls.filter(c => /\/segments$/.test(c.url))).toHaveLength(1)

  FakeRecorder.made[0].ondataavailable({ data: new Blob(['a']) })
  await flush()
  expect(calls.some(c => c.url === '/api/meeting/recordings/m1/segments/1/chunk')).toBe(true)
})

test('a part rolls over at 20 minutes, and not before', async () => {
  const w = mount()
  await startMeeting(w)
  const spy = jest.spyOn(w.vm, 'rollOver').mockImplementation(() => Promise.resolve())
  w.vm._partStartedAt = Date.now() - (20 * 60 - 2) * 1000
  jest.advanceTimersByTime(1000)
  expect(spy).not.toHaveBeenCalled()
  w.vm._partStartedAt = Date.now() - 20 * 60 * 1000
  jest.advanceTimersByTime(1000)
  expect(spy).toHaveBeenCalled()
})

test('the voice clip is sent BEFORE part 2 opens, so part 1 is labelled by it', async () => {
  const w = mount()
  await startMeeting(w)
  expect(clipSent()).toBe(false)
  await w.vm.rollOver()
  const clipAt = calls.findIndex(c => /\/voice-reference$/.test(c.url))
  const part2At = calls.map(c => /\/segments$/.test(c.url)).lastIndexOf(true)
  expect(clipAt).toBeGreaterThan(-1)
  expect(clipAt).toBeLessThan(part2At)
  expect(w.vm.liveN).toBe(2)
})

test('a meeting that ends inside one part never sends the voice clip anywhere', async () => {
  const w = mount()
  await startMeeting(w)
  await w.vm.finishRecording()
  expect(clipSent()).toBe(false)
  expect(calls.some(c => c.url === '/api/meeting/recordings/m1/finish')).toBe(true)
})

test('finishing waits for the last chunk to reach the server before finishing', async () => {
  const w = mount()
  await startMeeting(w)
  let release
  global.fetch = jest.fn((url, opts) => /\/chunk$/.test(url)
    ? new Promise((resolve) => { release = () => resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }) })
    : reply(url, opts))
  FakeRecorder.made[0].ondataavailable({ data: new Blob(['last']) })
  const finishing = w.vm.finishRecording()
  await flush()
  expect(calls.some(c => /\/finish$/.test(c.url))).toBe(false)
  release()
  await finishing
  expect(calls.some(c => /\/finish$/.test(c.url))).toBe(true)
})

test('the server saying a part is full moves the meeting to the next part', async () => {
  const w = mount()
  await startMeeting(w)
  global.fetch = jest.fn((url, opts) => /\/chunk$/.test(url)
    ? Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ rollOver: true }) })
    : reply(url, opts))
  const spy = jest.spyOn(w.vm, 'rollOver').mockImplementation(() => Promise.resolve())
  await w.vm.uploadChunk(1, 1, new Blob(['a']))
  expect(spy).toHaveBeenCalled()
})
