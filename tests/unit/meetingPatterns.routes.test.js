'use strict'

/**
 * The manager's aggregate route.
 *
 * 🔴 THE TWO THAT MATTER, AND NEITHER IS VISIBLE TO A PERSON TESTING IN UAT:
 *
 *   1. **It does not cascade upward.** Brief P13 keeps everything derived from a recorded
 *      meeting inside the firm it came from, because the consent line promises a named client
 *      exactly that. A group or global manager must be REFUSED, not shown an empty screen —
 *      and a tester signed in as one would read an empty screen as "no meetings yet".
 *   2. **A firm collects its own meetings and nobody else's.** Ownership is checked against
 *      each meeting's own record. A tester with one firm's login can never see the failure,
 *      because the wrong figures would still look like figures.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mpat-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

const routes = require('../../server/routes/meetingPatterns')
const store = require('../../server/utils/meetingAudioStore')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-patterns-1'
const OTHER = 'firm-patterns-2'

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

/**
 * A stored meeting with coaching notes, dated now so it falls in the current period.
 *
 * @param {string} firmId
 * @param {string} advisor
 * @param {string} state
 * @returns {string} the meeting id
 */
function storeMeeting (firmId, advisor, state) {
  const { meetingId } = store.createMeeting({ firmId, advisor, retentionMonths: 18 })
  store.writeReport(meetingId, 'coaching', {
    findings: [{ pointId: 'p1', text: 'Meeting framed in the first two minutes', state: state || 'found' }]
  })
  return meetingId
}

function call (firmId) {
  const req = { firmId }
  const res = makeMockRes()
  routes.getPatterns(req, res, () => {})
  return res
}

afterAll(() => {
  try { fs.rmdirSync(ROOT, { recursive: true }) } catch (_e) { /* the OS will sweep it */ }
})

describe('who may read the figures at all', () => {
  test('🔴 the mentor is refused — meeting figures never leave the firm (P13)', () => {
    const res = call(PLATFORM_SCOPE)
    expect(res._status).toBe(403)
    expect(errorBody(res).error.code).toBe('NOT_FIRM_TIER')
  })

  test('🔴 a global group manager is refused', () => {
    const res = call('__global__:advisor-e')
    expect(res._status).toBe(403)
  })

  test('🔴 a group manager is refused', () => {
    const res = call('__group__:advisor-e:nz')
    expect(res._status).toBe(403)
  })

  test('a refusal is a refusal, never an empty screen', () => {
    // An empty screen reads as "your firm did nothing", which is a different and untrue
    // statement — and the one a tester would report as working.
    const res = call(PLATFORM_SCOPE)
    expect(res._body).not.toEqual(expect.objectContaining({ points: expect.anything() }))
  })

  test('no verified scope is refused rather than defaulted', () => {
    const res = call(null)
    expect(res._status).toBe(401)
    expect(errorBody(res).error.code).toBe('NO_SCOPE')
  })
})

describe('a firm sees its own meetings only', () => {
  test('another firm\'s meetings are not counted', () => {
    for (let i = 0; i < 22; i++) { storeMeeting(FIRM, 'adv-' + (i % 6)) }
    for (let i = 0; i < 30; i++) { storeMeeting(OTHER, 'other-' + (i % 9)) }

    const res = call(FIRM)
    expect(res._status).toBe(200)
    expect(res._body.meetings).toBe(22)
    expect(res._body.advisors).toBe(6)

    const serialised = JSON.stringify(res._body)
    expect(serialised).not.toContain(OTHER)
    expect(serialised).not.toContain('other-')
  })

  test('no advisor identifier reaches the response', () => {
    const res = call(FIRM)
    expect(res._status).toBe(200)
    expect(JSON.stringify(res._body)).not.toContain('adv-')
  })

  test('the threshold arrives from the backend so the screen cannot hold its own copy', () => {
    const res = call(FIRM)
    expect(res._body.minAdvisors).toBe(5)
    expect(res._body.minMeetings).toBe(20)
  })

  test('a firm with no meetings gets an honest empty answer', () => {
    const res = call('firm-with-nothing')
    expect(res._status).toBe(200)
    expect(res._body.meetings).toBe(0)
    expect(res._body.enough).toBe(false)
    expect(res._body.points).toEqual([])
  })
})

describe('recordsForFirm', () => {
  test('a meeting with no coaching notes is still collected, and the aggregate drops it', () => {
    // The route hands everything to the aggregate rather than pre-filtering, so the rule about
    // what contributes lives in one place and is tested there.
    const id = store.createMeeting({ firmId: 'firm-solo', advisor: 'a1', retentionMonths: 18 }).meetingId
    const rows = routes.recordsForFirm('firm-solo')
    expect(rows).toHaveLength(1)
    expect(rows[0].meta.meetingId).toBe(id)
    expect(rows[0].coaching).toBeNull()
  })

  test('a stray directory that is not a minted meeting is ignored', () => {
    fs.mkdirSync(path.join(ROOT, 'not-a-meeting'), { recursive: true })
    expect(() => routes.recordsForFirm(FIRM)).not.toThrow()
  })
})
