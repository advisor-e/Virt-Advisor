'use strict'

/**
 * The Meeting Review report routes — slice 3.
 *
 * 🔴 THE FOUR THAT MATTER, and not one of them is visible to a person testing in UAT:
 *
 *   1. **My Coaching Notes belong to the advisor who made the recording** (Brief P2). Every
 *      route checks the advisor as well as the firm. A shared test login never notices, and a
 *      manager quietly reading a named advisor's report is the exact thing P2 forbids.
 *   2. **A dispute is kept BESIDE the finding, never instead of it** (P5). A tester who
 *      disagrees with something sees it recorded either way; only a test can show the finding
 *      survived, which is what makes this coaching rather than surveillance.
 *   3. **"Stop and delete" takes the reports too.** A coaching note quoting a meeting the
 *      client withdrew consent to is exactly the text `MEETING-CONSENT-WORDING.md` §4 says must
 *      not survive.
 *   4. **Editing an approved summary un-approves it.** The record must never say the new words
 *      were signed off, and nothing on screen would reveal that it did.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mrep-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

jest.mock('../../server/utils/meetingReports', () => {
  const actual = jest.requireActual('../../server/utils/meetingReports')
  return {
    ...actual,
    generateSummary: jest.fn(),
    generateCoachingNotes: jest.fn()
  }
})

const overlay = require('../../server/utils/firmOverlay')
const reports = require('../../server/utils/meetingReports')
const routes = require('../../server/routes/meetingReview')
const store = require('../../server/utils/meetingAudioStore')

const FIRM = 'firm-test-1'
const ADVISOR = 'adv-1'

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

/** `sendError` writes a JSON STRING through writeHead/end — parse it or assertions lie. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function makeReq (overrides = {}) {
  return {
    firmId: FIRM,
    advisorId: ADVISOR,
    userRole: 'firm_manager',
    userEmail: 'adviser@testfirm.com',
    body: {},
    params: {},
    query: {},
    ...overrides
  }
}

const SEGMENTS = [
  { role: 'advisor', start: 72, end: 88, text: 'So what I want to do today is walk through the year.' },
  { role: 'client', start: 90, end: 96, text: 'That works for me, yes.' }
]

function seedMeeting (opts = {}) {
  const { meetingId } = store.createMeeting({
    firmId: opts.firmId || FIRM,
    advisor: opts.advisor || ADVISOR,
    scenarioId: 'eoy_meeting',
    retentionMonths: 18
  })
  store.updateMeta(meetingId, { consentConfirmedAt: new Date().toISOString() })
  if (opts.transcript !== false) {
    store.writeTranscript(meetingId, { segments: SEGMENTS, text: '…', attributionConfident: true })
  }
  if (opts.summary) { store.writeReport(meetingId, 'summary', opts.summary) }
  if (opts.coaching) { store.writeReport(meetingId, 'coaching', opts.coaching) }
  return meetingId
}

const A_SUMMARY = { kind: 'summary', covered: 'We met.', actions: [], next: '', approvedAt: null, editedText: null }
const A_COACHING = {
  kind: 'coaching',
  findings: [
    { pointId: 'mo-eoy-1', text: 'I framed the meeting.', state: 'found', quote: 'So what I want to do today is walk through the year.', at: '1:12' },
    { pointId: 'mo-eoy-9', text: 'I drew the numbers out.', state: 'cannot_hear', hint: null, advisorAnswer: null }
  ],
  disputes: {}
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  routes.reportJobs.clear()
})

afterAll(() => {
  try { fs.rmdirSync(ROOT, { recursive: true }) } catch (e) { /* temp dir */ }
})

describe('who may read a report', () => {
  test('🔴 another ADVISOR at the same firm cannot read the coaching notes', () => {
    // Brief P2. This is the assertion that makes "belongs to the advisor" true rather than
    // merely intended — a colleague is as much a stranger to a client's meeting as a rival is.
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.getReports(makeReq({ advisorId: 'adv-2', params: { meetingId } }), res)
    expect(res._status).toBe(404)
  })

  test('another FIRM cannot read them either', () => {
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.getReports(makeReq({ firmId: 'firm-other', params: { meetingId } }), res)
    expect(res._status).toBe(404)
  })

  test('a malformed meeting id is answered 404, never a filesystem error', () => {
    const res = makeMockRes()
    routes.getReports(makeReq({ params: { meetingId: '../../etc/passwd' } }), res)
    expect(res._status).toBe(404)
  })

  test('the owning advisor reads both reports', () => {
    const meetingId = seedMeeting({ summary: A_SUMMARY, coaching: A_COACHING })
    const res = makeMockRes()
    routes.getReports(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(200)
    expect(res._body.summary.covered).toBe('We met.')
    expect(res._body.coaching.findings).toHaveLength(2)
  })
})

describe('generating', () => {
  test('refuses a meeting with no transcript rather than writing an empty report', async () => {
    const meetingId = seedMeeting({ transcript: false })
    const res = makeMockRes()
    await routes.generateReports(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(409)
    expect(errorBody(res).error.code).toBe('NO_TRANSCRIPT')
  })

  test('starts a job and returns at once, because two model calls are not a page render', async () => {
    reports.generateSummary.mockResolvedValue(A_SUMMARY)
    reports.generateCoachingNotes.mockResolvedValue(A_COACHING)
    const meetingId = seedMeeting()
    const res = makeMockRes()
    await routes.generateReports(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(202)
  })

  test('🔴 keeps the summary when the coaching call fails, and says which one is missing', async () => {
    // P11: a failure is stated. Discarding a good report because the other call failed would
    // cost the advisor their client summary for no reason.
    reports.generateSummary.mockResolvedValue(A_SUMMARY)
    reports.generateCoachingNotes.mockRejectedValue(new Error('model refused'))
    const meetingId = seedMeeting()

    await routes.runReports(meetingId, { points: [], scenarioName: 'End of year meeting' })

    expect(store.readReport(meetingId, 'summary')).not.toBeNull()
    expect(store.readReport(meetingId, 'coaching')).toBeNull()
    const res = makeMockRes()
    routes.getReports(makeReq({ params: { meetingId } }), res)
    expect(res._body.state).toBe('partial')
    expect(res._body.error).toContain('coaching')
  })

  test('reports a total failure as failed, never as a meeting with nothing in it', async () => {
    reports.generateSummary.mockRejectedValue(new Error('down'))
    reports.generateCoachingNotes.mockRejectedValue(new Error('down'))
    const meetingId = seedMeeting()

    await routes.runReports(meetingId, { points: [], scenarioName: null })

    const res = makeMockRes()
    routes.getReports(makeReq({ params: { meetingId } }), res)
    expect(res._body.state).toBe('failed')
  })

  test('passes degraded speaker separation out to the screen rather than swallowing it', () => {
    // §5 trap 1: every role-dependent figure becomes a coin toss, while still rendering as a
    // confident percentage. The screen has to be able to say so.
    const meetingId = seedMeeting()
    store.writeTranscript(meetingId, { segments: SEGMENTS, attributionConfident: false })
    const res = makeMockRes()
    routes.getReports(makeReq({ params: { meetingId } }), res)
    expect(res._body.attributionConfident).toBe(false)
  })
})

describe('the client summary', () => {
  test('cannot be saved empty', () => {
    const meetingId = seedMeeting({ summary: A_SUMMARY })
    const res = makeMockRes()
    routes.saveSummaryEdit(makeReq({ params: { meetingId }, body: { text: '   ' } }), res)
    expect(res._status).toBe(400)
  })

  test('records the advisor’s edit', () => {
    const meetingId = seedMeeting({ summary: A_SUMMARY })
    const res = makeMockRes()
    routes.saveSummaryEdit(makeReq({ params: { meetingId }, body: { text: 'My own words.' } }), res)
    expect(res._status).toBe(200)
    expect(store.readReport(meetingId, 'summary').editedText).toBe('My own words.')
  })

  test('🔴 an edit after approval clears the approval', () => {
    // The record must never say the new words were the ones signed off.
    const meetingId = seedMeeting({ summary: A_SUMMARY })
    routes.approveSummary(makeReq({ params: { meetingId } }), makeMockRes())
    expect(store.readReport(meetingId, 'summary').approvedAt).not.toBeNull()

    routes.saveSummaryEdit(makeReq({ params: { meetingId }, body: { text: 'Changed my mind.' } }), makeMockRes())
    expect(store.readReport(meetingId, 'summary').approvedAt).toBeNull()
  })

  test('approving a report that was never generated is a 404, not a new one', () => {
    const meetingId = seedMeeting()
    const res = makeMockRes()
    routes.approveSummary(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(404)
  })
})

describe('disagreeing with a finding', () => {
  test('🔴 keeps the finding as well as the disagreement', () => {
    // P5 — this is the line between coaching and surveillance, and the only honest source of
    // data for improving the observation points themselves.
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.disputeFinding(makeReq({ params: { meetingId }, body: { pointId: 'mo-eoy-1', note: 'I did say it.' } }), res)

    expect(res._status).toBe(200)
    const stored = store.readReport(meetingId, 'coaching')
    expect(stored.disputes['mo-eoy-1'].note).toBe('I did say it.')
    expect(stored.findings.find(f => f.pointId === 'mo-eoy-1').state).toBe('found')
  })

  test('refuses a point that is not in this report', () => {
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.disputeFinding(makeReq({ params: { meetingId }, body: { pointId: 'mo-not-here' } }), res)
    expect(res._status).toBe(400)
  })

  test('accepts a disagreement with no note', () => {
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.disputeFinding(makeReq({ params: { meetingId }, body: { pointId: 'mo-eoy-1' } }), res)
    expect(res._status).toBe(200)
  })
})

describe('settling a point the recording could not hear', () => {
  test('stores the advisor’s answer', () => {
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.answerCannotHear(makeReq({ params: { meetingId }, body: { pointId: 'mo-eoy-9', answer: true } }), res)

    expect(res._status).toBe(200)
    const finding = store.readReport(meetingId, 'coaching').findings.find(f => f.pointId === 'mo-eoy-9')
    expect(finding.advisorAnswer).toBe(true)
  })

  test('stores a "no" as a real answer, not as an absence', () => {
    const meetingId = seedMeeting({ coaching: A_COACHING })
    routes.answerCannotHear(makeReq({ params: { meetingId }, body: { pointId: 'mo-eoy-9', answer: false } }), makeMockRes())
    const finding = store.readReport(meetingId, 'coaching').findings.find(f => f.pointId === 'mo-eoy-9')
    expect(finding.advisorAnswer).toBe(false)
  })

  test('requires an actual yes or no', () => {
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.answerCannotHear(makeReq({ params: { meetingId }, body: { pointId: 'mo-eoy-9', answer: 'maybe' } }), res)
    expect(res._status).toBe(400)
  })

  test('🔴 refuses to overwrite a finding the recording COULD hear', () => {
    // Otherwise an advisor could set "found" on a point the model answered, and the citation
    // and the answer would then disagree with nothing to show which was which.
    const meetingId = seedMeeting({ coaching: A_COACHING })
    const res = makeMockRes()
    routes.answerCannotHear(makeReq({ params: { meetingId }, body: { pointId: 'mo-eoy-1', answer: true } }), res)
    expect(res._status).toBe(400)
  })
})

describe('deletion', () => {
  test('🔴 "stop and delete" takes the reports as well as the transcript', () => {
    // MEETING-CONSENT-WORDING.md §4. A coaching note quoting the meeting is exactly the text a
    // client's withdrawal must remove.
    const meetingId = seedMeeting({ summary: A_SUMMARY, coaching: A_COACHING })
    expect(store.readReport(meetingId, 'summary')).not.toBeNull()

    const res = makeMockRes()
    routes.deleteRecording(makeReq({ params: { meetingId } }), res)

    expect(res._status).toBe(200)
    expect(store.readReport(meetingId, 'summary')).toBeNull()
    expect(store.readReport(meetingId, 'coaching')).toBeNull()
    expect(store.readTranscript(meetingId)).toBeNull()
  })
})
