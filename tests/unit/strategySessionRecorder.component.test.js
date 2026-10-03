/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * StrategySessionRecorder — item 8.4, slice 4 (screens 1-3, 5, 6, approved 2026-09-28).
 *
 * Per the testing ruling (2026-08-24) nothing here asserts wording or CSS. What UAT cannot see,
 * and what these pin:
 *   - NOTHING RECORDS BEFORE THE ADVISOR PRESSES START, and consent is asked once, with the
 *     recording already running so the words land inside it (record → speak → confirm);
 *   - a session is opened as a SEGMENTED "Strategy Session" — a single-file recording fails
 *     past 1400 seconds of audio, the diarizing model's limit;
 *   - pressing the next card CLOSES the live segment before opening the next, never two at once;
 *   - a long segment rolls over as the SAME concept's next part, so its summary and countdown
 *     follow it;
 *   - "Stop and delete everything" really deletes, and "End recording" really finishes.
 */

const StrategySessionRecorder = require('../../components/strategy/StrategySessionRecorder.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

/** Let pending promises settle. Not a timer: the clock is faked in these tests. */
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
  pause () { this.state = 'paused' }
  resume () { this.state = 'recording' }
  stop () {
    this.state = 'inactive'
    if (this.onstop) { this.onstop() }
  }
}
FakeRecorder.made = []

const PORTER = { key: 'porters', conceptId: 'porters-5-forces', label: "Porter's 5 Forces" }
const BLUE = { key: 'blue', conceptId: 'blue-ocean', label: 'Blue Ocean Strategy' }

let calls = []
function reply (url, opts) {
  calls.push({ url, method: (opts && opts.method) || 'GET', body: opts && opts.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : null })
  let body = {}
  if (url === '/api/meeting/consent') { body = { retentionMonths: 18 } }
  if (url === '/api/meeting/recordings' && opts.method === 'POST') { body = { meetingId: 'm1' } }
  if (/\/segments$/.test(url)) {
    const n = calls.filter(c => /\/segments$/.test(c.url)).length
    body = { segment: n, rollBytes: 1, maxBytes: 2, segments: [{ n, label: 'x', state: 'recording' }] }
  }
  if (/\/recordings\/m1$/.test(url) && (!opts || !opts.method || opts.method === 'GET')) {
    body = { state: 'done', segments: [{ n: 1, state: 'done', summaryApproved: false }] }
  }
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
}

function mount () {
  return mountWithBuefy(StrategySessionRecorder, { propsData: { apiToken: 'tok', clientId: 'c1', strategySessionId: 41 } })
}

beforeEach(() => {
  calls = []
  FakeRecorder.made = []
  global.fetch = jest.fn(reply)
  global.MediaRecorder = FakeRecorder
  global.navigator.mediaDevices = { getUserMedia: jest.fn(() => Promise.resolve({ getTracks: () => [] })) }
  jest.useFakeTimers('legacy')
})

afterEach(() => {
  jest.useRealTimers()
  delete global.fetch
  delete global.MediaRecorder
})

async function startSession (w) {
  w.vm.recordCard(PORTER)
  await w.vm.startFirst()
  await w.vm.agree()
}

test('the first press asks for consent and records nothing — no microphone, no session', () => {
  const w = mount()
  w.vm.recordCard(PORTER)
  expect(w.vm.stage).toBe('consent1')
  expect(global.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
  expect(calls.some(c => c.url === '/api/meeting/recordings')).toBe(false)
})

test('"Start recording" opens a segmented Strategy Session and starts recording BEFORE the consent tick', async () => {
  const w = mount()
  w.vm.recordCard(PORTER)
  await w.vm.startFirst()
  const start = calls.find(c => c.url === '/api/meeting/recordings')
  // The planning session rides along so the server can place the words by its box timeline (screen 4).
  expect(start.body).toEqual({ scenarioId: 'strategy_session', clientId: 'c1', segmented: true, strategySessionId: 41 })
  const open = calls.find(c => /\/segments$/.test(c.url))
  expect(open.body).toEqual({ conceptId: 'porters-5-forces', label: "Porter's 5 Forces" })
  expect(w.vm.stage).toBe('consent2')
  // The segment's recorder and the 8-second voice clip's, both on the one microphone.
  expect(FakeRecorder.made.filter(r => r.state === 'recording')).toHaveLength(2)
  expect(calls.some(c => c.url === '/api/meeting/recordings/m1/consent')).toBe(false)
})

test('"Yes — continue" confirms consent, and only then is it recording', async () => {
  const w = mount()
  await startSession(w)
  expect(calls.some(c => c.url === '/api/meeting/recordings/m1/consent' && c.method === 'POST')).toBe(true)
  expect(w.vm.stage).toBe('recording')
})

test('the voice clip is sent after 8 seconds, as the session\'s own', async () => {
  const w = mount()
  await startSession(w)
  const clip = FakeRecorder.made[1]
  clip.ondataavailable({ data: new Blob(['VOICE'], { type: 'audio/webm' }) })
  jest.advanceTimersByTime(8000)
  await flush()
  expect(calls.some(c => c.url === '/api/meeting/recordings/m1/voice-reference')).toBe(true)
})

test('pressing the next card closes the live segment before opening the next', async () => {
  const w = mount()
  await startSession(w)
  const first = FakeRecorder.made[0]
  await w.vm.recordCard(BLUE)
  await flush()
  expect(first.state).toBe('inactive')
  const opens = calls.filter(c => /\/segments$/.test(c.url))
  expect(opens[1].body.conceptId).toBe('blue-ocean')
  expect(w.vm.live.key).toBe('blue')
})

test('pressing the live card again does nothing', async () => {
  const w = mount()
  await startSession(w)
  w.vm.recordCard(PORTER)
  expect(calls.filter(c => /\/segments$/.test(c.url))).toHaveLength(1)
})

test('a roll-over carries the SAME concept on as its next part, and its countdown keeps running', async () => {
  const w = mount()
  await startSession(w)
  const startedAt = w.vm.live.startedAt
  await w.vm.rollOver()
  const opens = calls.filter(c => /\/segments$/.test(c.url))
  expect(opens[1].body.conceptId).toBe('porters-5-forces')
  expect(opens[1].body.label).toMatch(/strategyPlanner\.recording\.part/)
  expect(w.vm.live.part).toBe(2)
  expect(w.vm.live.startedAt).toBe(startedAt)
})

// OpenAI refuses more than 1400 seconds of audio from the diarizing model (sent 40 minutes,
// 2026-10-01), and a section past it is lost with its audio. UAT never records that long.
test('a section rolls over at 20 minutes of recorded audio, inside the model\'s 1400-second limit', async () => {
  const w = mount()
  await startSession(w)
  const spy = jest.spyOn(w.vm, 'rollOver').mockImplementation(() => Promise.resolve())
  w.vm.recordedSeconds = () => 20 * 60 - 1
  jest.advanceTimersByTime(1000)
  expect(spy).not.toHaveBeenCalled()
  w.vm.recordedSeconds = () => 20 * 60
  jest.advanceTimersByTime(1000)
  expect(spy).toHaveBeenCalled()
})

test('a chunk the server says has passed the roll-over size rolls the segment over', async () => {
  const w = mount()
  await startSession(w)
  global.fetch = jest.fn((url, opts) => /\/chunk$/.test(url)
    ? Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ rollOver: true }) })
    : reply(url, opts))
  const spy = jest.spyOn(w.vm, 'rollOver').mockImplementation(() => Promise.resolve())
  await w.vm.uploadChunk(1, 1, new Blob(['a']))
  expect(spy).toHaveBeenCalled()
})

test('"End recording" stops the microphone\'s recorder and finishes the session', async () => {
  const w = mount()
  await startSession(w)
  await w.vm.endRecording()
  expect(FakeRecorder.made[0].state).toBe('inactive')
  expect(calls.some(c => c.url === '/api/meeting/recordings/m1/finish')).toBe(true)
  expect(w.vm.stage).toBe('finishing')
  await w.vm.poll()
  expect(w.vm.stage).toBe('done')
})

test('"Stop and delete everything" deletes the session and returns to nothing recorded', async () => {
  const w = mount()
  await startSession(w)
  await w.vm.deleteAll()
  expect(calls.some(c => c.url === '/api/meeting/recordings/m1' && c.method === 'DELETE')).toBe(true)
  expect(w.vm.stage).toBe('idle')
  expect(w.vm.meetingId).toBe('')
})

test('a refused microphone says so and starts nothing', async () => {
  global.navigator.mediaDevices.getUserMedia = jest.fn(() => Promise.reject(new Error('Permission denied')))
  const w = mount()
  w.vm.recordCard(PORTER)
  await w.vm.startFirst()
  expect(w.vm.fatal).toBe('Permission denied')
  expect(calls.some(c => c.url === '/api/meeting/recordings')).toBe(false)
})

test('a start the server refuses — no compliance declaration, say — shows the server\'s own reason', async () => {
  global.fetch = jest.fn((url, opts) => url === '/api/meeting/recordings'
    ? Promise.resolve({ ok: false, status: 403, statusText: 'Forbidden', json: () => Promise.resolve({ error: { message: 'Not yet available at your firm' } }) })
    : reply(url, opts))
  const w = mount()
  w.vm.recordCard(PORTER)
  await w.vm.startFirst()
  expect(w.vm.fatal).toBe('Not yet available at your firm')
  expect(w.vm.stage).toBe('consent1')
})

test('the page is told what is live and every segment\'s state', async () => {
  const w = mount()
  await startSession(w)
  const events = w.emitted()['state-changed']
  const last = events[events.length - 1][0]
  expect(last.meetingId).toBe('m1')
  expect(last.live.conceptId).toBe('porters-5-forces')
})

test('the chip reads number, label and state, as the drawing prints it', () => {
  const w = mount()
  expect(w.vm.chipText({ n: 2, label: 'Blue', state: 'done', audioDeleted: true }))
    .toBe('2 · Blue · strategyPlanner.recording.stateReady · strategyPlanner.recording.stateAudioDeleted')
  expect(w.vm.chipText({ n: 3, label: 'P', state: 'transcribing' })).toContain('stateTranscribing')
  expect(w.vm.chipText({ n: 4, label: 'P', state: 'failed' })).toContain('stateFailed')
  expect(w.vm.chipClass({ state: 'failed' })['is-fail']).toBe(true)
})

describe('"Take a break" (Mike\'s wording, 2026-09-28): nothing records over a break', () => {
  test('closes the live section on the server and stops the microphone\'s recorder', async () => {
    const w = mount()
    await startSession(w)
    await w.vm.takeBreak()
    expect(FakeRecorder.made[0].state).toBe('inactive')
    expect(calls.some(c => c.url === '/api/meeting/recordings/m1/segments/close' && c.method === 'POST')).toBe(true)
    expect(w.vm.stage).toBe('break')
    expect(w.vm.live).toBeNull()
  })

  test('the next card starts a fresh section, with no second consent', async () => {
    const w = mount()
    await startSession(w)
    await w.vm.takeBreak()
    const consentsBefore = calls.filter(c => c.url === '/api/meeting/recordings/m1/consent').length
    w.vm.recordCard(BLUE)
    await flush()
    expect(w.vm.stage).toBe('recording')
    expect(w.vm.live.key).toBe('blue')
    expect(calls.filter(c => c.url === '/api/meeting/recordings/m1/consent')).toHaveLength(consentsBefore)
    expect(FakeRecorder.made[FakeRecorder.made.length - 1].state).toBe('recording')
  })

  test('the session can still be ended during a break', async () => {
    const w = mount()
    await startSession(w)
    await w.vm.takeBreak()
    await w.vm.endRecording()
    expect(calls.some(c => c.url === '/api/meeting/recordings/m1/finish')).toBe(true)
  })

  test('a break the server refuses keeps recording and says why', async () => {
    const w = mount()
    await startSession(w)
    global.fetch = jest.fn((url, opts) => /segments\/close$/.test(url)
      ? Promise.resolve({ ok: false, statusText: 'x', json: () => Promise.resolve({ error: { message: 'Could not close that section' } }) })
      : reply(url, opts))
    await w.vm.takeBreak()
    expect(w.vm.fatal).toMatch(/Could not close/)
    expect(w.vm.stage).toBe('recording')
  })
})

describe('the alarm — Meeting Review\'s own, word for word (Mike, 2026-09-28)', () => {
  test('a recording that stops without being asked raises it and stops the clock', async () => {
    const w = mount()
    await startSession(w)
    FakeRecorder.made[0].stop() // a locked screen, a suspended tab
    expect(w.vm.interrupted).toBe(true)
    expect(w.vm._clock).toBeNull()
  })

  test('"Resume recording" carries the same concept on as its next part, with no second consent', async () => {
    const w = mount()
    await startSession(w)
    FakeRecorder.made[0].stop()
    await w.vm.resumeRecording()
    const opens = calls.filter(c => /\/segments$/.test(c.url))
    expect(opens[opens.length - 1].body.conceptId).toBe('porters-5-forces')
    expect(w.vm.live.part).toBe(2)
    expect(w.vm.interrupted).toBe(false)
    expect(calls.filter(c => c.url === '/api/meeting/recordings/m1/consent')).toHaveLength(1)
  })

  test('stops the advisor asked for never raise it — a card, a break, the end, a delete', async () => {
    const w = mount()
    await startSession(w)
    await w.vm.switchTo(BLUE)
    expect(w.vm.interrupted).toBe(false)
    await w.vm.takeBreak()
    expect(w.vm.interrupted).toBe(false)
    w.vm.recordCard(PORTER)
    await flush()
    await w.vm.deleteAll()
    expect(w.vm.interrupted).toBe(false)
  })

  test('a microphone that cannot be reopened on resume says why', async () => {
    const w = mount()
    await startSession(w)
    FakeRecorder.made[0].stop()
    w.vm._stream = { active: false }
    global.navigator.mediaDevices.getUserMedia = jest.fn(() => Promise.reject(new Error('Permission denied')))
    await w.vm.resumeRecording()
    expect(w.vm.fatal).toBe('Permission denied')
    expect(w.vm.interrupted).toBe(true)
  })
})

describe('🔴 screen 11 — pause after 3 minutes of silence (Mike, 2026-09-28)', () => {
  const T = 5000000

  /** A session whose consent line was read at a speaking level of 0.4. */
  async function calibrated () {
    const w = mount()
    w.vm.recordCard(PORTER)
    await w.vm.startFirst()
    for (let i = 0; i < 20; i += 1) { w.vm.onLevel(i < 2 ? 0 : 0.4, T) }
    await w.vm.agree()
    w.vm._lastSoundAt = T
    return w
  }

  test('Decision K: silence is a quarter of the advisor\'s own level, read from the consent line', async () => {
    const w = await calibrated()
    expect(w.vm._silenceLevel).toBeCloseTo(0.1)
  })

  test('a consent line that measured nothing falls back to a floor rather than zero', async () => {
    const w = mount()
    w.vm.recordCard(PORTER)
    await w.vm.startFirst()
    await w.vm.agree()
    expect(w.vm._silenceLevel).toBe(0.01)
  })

  test('it pauses at 3 minutes of quiet, and not a moment before', async () => {
    const w = await calibrated()
    w.vm.onLevel(0.05, T + 179000)
    expect(w.vm.paused).toBe(false)
    w.vm.onLevel(0.05, T + 180000)
    expect(w.vm.paused).toBe(true)
    expect(FakeRecorder.made[0].state).toBe('paused')
  })

  test('speech below the silence level counts as quiet; speech above it resets the clock', async () => {
    const w = await calibrated()
    w.vm.onLevel(0.2, T + 100000)
    w.vm.onLevel(0.05, T + 250000)
    expect(w.vm.paused).toBe(false)
  })

  test('Decision L: the first sound resumes the same section and reports where the pause fell and how long it lasted', async () => {
    const w = await calibrated()
    w.vm._segmentStartedAt = T
    w.vm.onLevel(0.05, T + 180000)
    const segmentsBefore = calls.filter(c => /\/segments$/.test(c.url)).length
    w.vm.onLevel(0.4, T + 480000)
    await flush()
    expect(w.vm.paused).toBe(false)
    expect(FakeRecorder.made[0].state).toBe('recording')
    const pause = calls.find(c => /\/segments\/1\/pauses$/.test(c.url))
    expect(pause.body).toEqual({ at: 180, duration: 300 })
    expect(calls.filter(c => /\/segments$/.test(c.url))).toHaveLength(segmentsBefore)
  })

  test('the section\'s clock stops while paused — those minutes are not being recorded', async () => {
    const w = await calibrated()
    w.vm._segmentStartedAt = T
    w.vm.onLevel(0.05, T + 180000)
    expect(w.vm.recordedSeconds(T + 400000)).toBe(180)
  })

  test('the chip says "paused" while paused', async () => {
    const w = await calibrated()
    w.vm.onLevel(0.05, T + 180000)
    expect(w.vm.chipText({ n: 1, label: 'P', state: 'recording' })).toContain('statePaused')
  })

  test('a section ended while paused has no later words to move, so no pause is reported', async () => {
    const w = await calibrated()
    w.vm.onLevel(0.05, T + 180000)
    await w.vm.takeBreak()
    expect(w.vm.paused).toBe(false)
    expect(calls.some(c => /\/pauses$/.test(c.url))).toBe(false)
  })

  test('readings outside a recording — before consent, during a break — change nothing', async () => {
    const w = await calibrated()
    await w.vm.takeBreak()
    w.vm.onLevel(0, T + 999999)
    expect(w.vm.paused).toBe(false)
  })
})

test('🔴 screen 11: while paused, the chip is amber and the page is told, so nothing still says "recording"', async () => {
  const w = mount()
  w.vm.recordCard(PORTER)
  await w.vm.startFirst()
  await w.vm.agree()
  w.vm._lastSoundAt = 1
  w.vm.onLevel(0, 1 + 180000)
  await w.vm.$nextTick()
  const cls = w.vm.chipClass({ n: w.vm.liveN, state: 'recording' })
  expect(cls['is-now']).toBe(false)
  expect(cls['is-work']).toBe(true)
  const events = w.emitted()['state-changed']
  expect(events[events.length - 1][0].paused).toBe(true)
})

test('the finished banner counts sections and minutes in the singular when there is one (Mike, 2026-09-28)', async () => {
  const w = mount()
  const tc = jest.fn((key, n) => key + ':' + n)
  w.vm.$tc = tc
  await w.setData({ stage: 'done', segments: [{ n: 1, state: 'done', summaryApproved: true }], sessionSeconds: 60 })
  expect(tc).toHaveBeenCalledWith('strategyPlanner.recording.sectionsCount', 1, { count: 1 })
  expect(tc).toHaveBeenCalledWith('strategyPlanner.recording.minutesCount', 1, { count: 1 })
})
