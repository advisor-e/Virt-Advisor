/**
 * @jest-environment jsdom
 */
'use strict'

// MeetingReview — the two reports (slice 3), against the drawing approved 2026-09-01 and the
// four differences Mike ruled on 2026-09-02.
//
// Per the testing ruling (2026-08-24) nothing here asserts wording or CSS — UAT judges those
// better. What UAT cannot see, and these tests pin:
//
// - the reports screen NEVER offers to play audio, because P8 destroyed it. A play button
//   that silently did nothing is exactly what a quick pass would miss;
// - "Copy for the client" copies the advisor's EDITED words when they have edited, not the
//   generated draft underneath. Copying the wrong version looks identical on screen;
// - a disagreement is sent for the right point, and the finding survives it (P5);
// - a "cannot be heard" answer is sent as a real boolean, so "No, I didn't" is stored rather
//   than read as an absence;
// - a failure states itself instead of rendering as a meeting in which nothing happened (P11).

const MeetingReview = require('../../components/MeetingReview.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function jsonResponse (body, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

const SEGMENTS = [
  { role: 'advisor', start: 72, end: 88, text: 'So what I want to do today is walk through the year.' },
  { role: 'client', start: 90, end: 96, text: 'That works for me, yes.' },
  { role: 'advisor', start: 1124, end: 1140, text: 'Think of the margin like a bucket with a slow leak.' }
]

const SUMMARY = {
  kind: 'summary',
  covered: 'We reviewed the year to 31 March.',
  actions: [{ who: 'James', what: 'send the schedule', when: '12 September' }],
  next: 'We meet again in November.',
  agreement: { quote: 'That works for me, yes.', at: '1:30' },
  approvedAt: null,
  editedText: null
}

const COACHING = {
  kind: 'coaching',
  metrics: {
    usable: true,
    attributionConfident: true,
    talkTime: { advisorPercent: 78, clientPercent: 22 },
    longestMonologue: { clock: '4:12' },
    questions: { open: 9, closed: 23 },
    pauseAfterAsking: { medianSeconds: 0.8, occasions: 4 },
    length: { clock: '47:03' }
  },
  findings: [
    { pointId: 'mo-1', text: 'I framed the meeting.', state: 'found', quote: 'So what I want to do today is walk through the year.', at: '1:12', atSeconds: 72 },
    { pointId: 'mo-2', text: 'I checked understanding.', state: 'not_found', quote: null, at: null, atSeconds: null },
    { pointId: 'mo-9', text: 'I drew the numbers out.', state: 'cannot_hear', hint: null, advisorAnswer: null }
  ],
  disputes: {}
}

const LOADED = {
  meetingId: 'abc',
  state: 'done',
  error: null,
  hasTranscript: true,
  attributionConfident: true,
  transcript: { segments: SEGMENTS },
  summary: SUMMARY,
  coaching: COACHING
}

function mountScreen (payload) {
  global.fetch = jest.fn(() => jsonResponse(payload || LOADED))
  return mountWithBuefy(MeetingReview, {
    propsData: { apiToken: 'test-token', meetingId: 'abc' },
    mocks: { $buefy: { toast: { open: jest.fn() }, dialog: { confirm: jest.fn() } } }
  })
}

afterEach(() => {
  delete global.fetch
  jest.clearAllMocks()
})

describe('loading', () => {
  it('reads the reports for this meeting with the bearer token', async () => {
    mountScreen()
    await flush()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/meeting/recordings/abc/reports')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  it('🔴 states a total failure rather than rendering an empty meeting', async () => {
    // P11. The one thing that must never happen is a tidy page of nothing standing in for a
    // failure — an advisor would read it as "I did none of these things".
    const wrapper = mountScreen({ ...LOADED, state: 'failed', summary: null, coaching: null })
    await flush()
    expect(wrapper.vm.state).toBe('failed')
    expect(wrapper.text()).toContain('could not be written')
  })

  it('says which report is missing when only one failed', async () => {
    const wrapper = mountScreen({ ...LOADED, state: 'partial', error: 'coaching failed', coaching: null })
    await flush()
    expect(wrapper.text()).toContain('coaching failed')
  })

  it('shows a load failure instead of an empty page', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(MeetingReview, {
      propsData: { apiToken: 't', meetingId: 'abc' },
      mocks: { $buefy: { toast: { open: jest.fn() } } }
    })
    await flush()
    expect(wrapper.vm.loadError).toContain('could not be loaded')
  })

  it('warns when the two voices could not be told apart', async () => {
    // §5 trap 1 — every figure that depends on who spoke is then a coin toss, and it must
    // fail visibly rather than render as a confident percentage.
    const wrapper = mountScreen({ ...LOADED, attributionConfident: false })
    await flush()
    expect(wrapper.text()).toContain('could not reliably tell the two voices apart')
  })
})

describe('🔴 the audio is gone, and the screen never pretends otherwise', () => {
  it('offers no way to play anything', async () => {
    // Mike's ruling 2026-09-02. P8 destroys the audio the moment a transcript exists, so a
    // "Play this moment" control could only ever fail silently.
    const wrapper = mountScreen()
    await flush()
    const text = wrapper.text().toLowerCase()
    expect(text).not.toContain('play this moment')
    expect(text).not.toContain('play 14:30')
    expect(wrapper.find('audio').exists()).toBe(false)
  })

  it('shows the citation in its surrounding transcript instead', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.toggleContext('mo-1')
    await wrapper.vm.$nextTick()
    // The client's reply at 1:30 sits inside the window either side of the quote at 1:12.
    expect(wrapper.text()).toContain('That works for me, yes.')
  })

  it('draws the context window from the citation, not the whole meeting', async () => {
    const wrapper = mountScreen()
    await flush()
    const lines = wrapper.vm.contextFor(COACHING.findings[0])
    // The 18:44 line is far outside the window and must not be dragged in.
    expect(lines.map(l => l.at)).toEqual(['1:12', '1:30'])
  })

  it('offers no context for a point that was never found', async () => {
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.contextFor(COACHING.findings[1])).toEqual([])
  })
})

describe('the client summary', () => {
  it('🔴 copies the advisor’s edited words once they have edited', async () => {
    // Copying the generated draft after the advisor rewrote it looks identical on screen and
    // sends the client the wrong document.
    const wrapper = mountScreen({
      ...LOADED,
      summary: { ...SUMMARY, editedText: 'The words I actually want to send.' }
    })
    await flush()
    expect(wrapper.vm.summaryAsText()).toContain('The words I actually want to send.')
    expect(wrapper.vm.summaryAsText()).not.toContain('We reviewed the year to 31 March.')
  })

  it('carries the agreed actions into the copied text', async () => {
    const wrapper = mountScreen()
    await flush()
    const text = wrapper.vm.summaryAsText()
    expect(text).toContain('James')
    expect(text).toContain('12 September')
  })

  it('saves an edit to the summary route', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.draft = 'My own words.'
    await wrapper.vm.saveEdit()
    const call = global.fetch.mock.calls.find(c => c[0].endsWith('/reports/summary'))
    expect(call[1].method).toBe('PUT')
    expect(JSON.parse(call[1].body)).toEqual({ text: 'My own words.' })
  })

  it('approves through the approve route', async () => {
    const wrapper = mountScreen()
    await flush()
    await wrapper.vm.approve()
    expect(global.fetch.mock.calls.some(c => c[0].endsWith('/reports/summary/approve'))).toBe(true)
  })

  it('tells the advisor when the browser refuses to copy, rather than doing nothing', async () => {
    const wrapper = mountScreen()
    await flush()
    global.navigator.clipboard = { writeText: jest.fn().mockRejectedValue(new Error('denied')) }
    await wrapper.vm.copyForClient()
    expect(wrapper.vm.$buefy.toast.open).toHaveBeenCalled()
  })
})

describe('the observation points', () => {
  it('🔴 sends a disagreement for the right point, and the finding survives it', async () => {
    // P5 — the disagreement is kept BESIDE the finding, never instead of it. That is the line
    // between coaching and surveillance.
    const wrapper = mountScreen()
    await flush()
    await wrapper.vm.dispute(COACHING.findings[0])
    const call = global.fetch.mock.calls.find(c => c[0].endsWith('/coaching/dispute'))
    expect(JSON.parse(call[1].body)).toEqual({ pointId: 'mo-1' })
    expect(wrapper.vm.coaching.findings[0].state).toBe('found')
  })

  it('🔴 sends "No, I didn’t" as a real false, not as nothing', async () => {
    const wrapper = mountScreen()
    await flush()
    await wrapper.vm.answerHeard(COACHING.findings[2], false)
    const call = global.fetch.mock.calls.find(c => c[0].endsWith('/coaching/heard'))
    expect(JSON.parse(call[1].body)).toEqual({ pointId: 'mo-9', answer: false })
  })

  it('offers the two answers only while the point is unsettled', async () => {
    const answered = {
      ...COACHING,
      findings: [{ ...COACHING.findings[2], advisorAnswer: true }]
    }
    const wrapper = mountScreen({ ...LOADED, coaching: answered })
    await flush()
    expect(wrapper.text()).toContain('You answered')
  })

  it('does not offer to disagree twice with the same point', async () => {
    const disputed = { ...COACHING, disputes: { 'mo-1': { at: 'now', note: '' } } }
    const wrapper = mountScreen({ ...LOADED, coaching: disputed })
    await flush()
    expect(wrapper.vm.disputed(COACHING.findings[0])).toBe(true)
  })
})

describe('the measured figures', () => {
  it('🔴 shows a dash, not a zero, when the adviser always left space', async () => {
    // Zero seconds would read as the worst possible score for what is actually the good
    // outcome: they never filled their own silence.
    const quiet = {
      ...COACHING,
      metrics: { ...COACHING.metrics, pauseAfterAsking: { medianSeconds: null, occasions: 0 } }
    }
    const wrapper = mountScreen({ ...LOADED, coaching: quiet })
    await flush()
    expect(wrapper.vm.pauseValue).toBe('—')
  })

  it('shows the figure when there were occasions', async () => {
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.pauseValue).toBe('0.8s')
  })

  it('🔴 renders no jargon tile, because no glossary exists to count against', async () => {
    // Mike's ruling 2026-09-02. A permanently blank figure reads as a bug; the tile is absent
    // rather than empty, and this is what stops it drifting back in.
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.text().toLowerCase()).not.toContain('jargon')
  })

  it('keeps "actions agreed" out of the block captioned as AI-free', async () => {
    // It cannot be counted, only understood, so it comes from the summary with a citation.
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.text()).toContain('Actions were agreed at 1:30')
  })
})

describe('generating when there is nothing yet', () => {
  it('asks the backend to write them and then polls', async () => {
    const wrapper = mountScreen({ ...LOADED, state: 'none', summary: null, coaching: null })
    await flush()
    await wrapper.vm.generate()
    const call = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(call[0]).toBe('/api/meeting/recordings/abc/reports')
    expect(wrapper.vm.poller).not.toBeNull()
    wrapper.destroy()
  })

  it('stops polling when the component goes away', async () => {
    const wrapper = mountScreen({ ...LOADED, state: 'generating' })
    await flush()
    expect(wrapper.vm.poller).not.toBeNull()
    wrapper.destroy()
    expect(wrapper.vm.poller).toBeNull()
  })
})
