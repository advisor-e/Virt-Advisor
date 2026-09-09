'use strict'

/**
 * A client asks for a copy — the routes. Mike's eight rulings of 2026-09-10,
 * `design/mockups/client-record-request.html`. IPP6 access, IPP7 correction.
 *
 * 🔴 WHAT THESE TESTS EARN, and not one of them is visible to a person testing in UAT:
 *
 *   1. **The coaching notes never leave.** Ruling 1, in Mike's words: *"clients never get
 *      these notes."* A release that quietly included them would look like a successful
 *      release on every screen in the app — the client is the only person who would ever find
 *      out, by reading an assessment of their own advisor.
 *   2. **The advisor alone releases.** Ruling 2. A manager calling the ordinary release route
 *      must be refused, and the break-glass must refuse without its declaration. A shared test
 *      login never notices either.
 *   3. **The break-glass leaves a permanent, named record.** It is unverifiable by design, so
 *      the record IS the control. A release that recorded no declaration would be a manager
 *      reading a colleague's transcript with nothing to show for it.
 *   4. **Deletion takes all three documents and the correction.** Ruling 5. Removing the
 *      transcript alone leaves the client's words in the two reports — the letter of the
 *      promise kept and its substance broken, and the screen says "deleted" either way.
 *   5. **A correction never edits the transcript.** Ruling 4. Every coaching finding is
 *      verified against the transcript before storage, so an edit would strand findings that
 *      still read as evidenced.
 *   6. **Every route is scoped to `req.firmId` and to the request's own client.** A guessed
 *      meeting id must not release under somebody else's request.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ccr-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

jest.mock('../../server/utils/clientStore', () => ({
  getById: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const clientStore = require('../../server/utils/clientStore')
const routes = require('../../server/routes/clientCopyRequests')
const store = require('../../server/utils/meetingAudioStore')
const ccr = require('../../server/utils/clientCopyRequests')

const FIRM = 'firm-ccr-1'
const OTHER_FIRM = 'firm-ccr-2'
const DANA = 'adv-dana'
const OWEN = 'adv-owen'
const CLIENT = 'client-raman'
/** Screen B's two ticks, which the release route refuses without. */
const TICKS = { identityConfirmed: true, contentRead: true }
const OTHER_CLIENT = 'client-beckett'

/** The overlay, in memory: `{ 'firm|key': value }`. */
let configs = {}

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
  return Object.assign({
    firmId: FIRM,
    advisorId: DANA,
    advisorName: 'Dana Whitfield',
    body: {},
    params: {},
    query: {}
  }, overrides)
}

/** A meeting on disk, with whichever text it should hold. */
function seedMeeting (opts) {
  const { meetingId } = store.createMeeting({
    firmId: opts.firmId || FIRM,
    advisor: opts.advisor || DANA,
    advisorName: opts.advisorName || 'Dana Whitfield',
    clientId: opts.clientId === undefined ? CLIENT : opts.clientId,
    retentionMonths: opts.retentionMonths || 18
  })
  if (opts.transcript !== false) {
    store.writeTranscript(meetingId, { segments: [{ speaker: 'Client', text: 'twelve staff' }] })
  }
  if (opts.summary !== false) {
    store.writeReport(meetingId, 'summary', {
      actions: [],
      approvedAt: opts.summaryApproved === false ? undefined : '2026-09-01T00:00:00Z'
    })
  }
  if (opts.coaching !== false) {
    store.writeReport(meetingId, 'coaching', { findings: [{ quote: 'twelve staff' }] })
  }
  return meetingId
}

/** A logged request, returning its id. */
async function seedRequest (overrides = {}) {
  clientStore.getById.mockResolvedValue({ id: CLIENT, name: 'Raman Joinery Ltd' })
  const res = makeMockRes()
  await routes.logRequest(makeReq({
    body: Object.assign({
      clientId: CLIENT,
      kind: 'copy',
      channel: 'email',
      receivedAt: '2026-09-02T00:00:00Z'
    }, overrides)
  }), res)
  return res._body.request.id
}

beforeEach(() => {
  configs = {}
  jest.clearAllMocks()

  overlay.loadFirmConfig.mockImplementation((firmId, key) => {
    const at = firmId + '|' + key
    return Promise.resolve(
      Object.prototype.hasOwnProperty.call(configs, at) ? configs[at] : null
    )
  })
  overlay.saveFirmConfig.mockImplementation((firmId, key, value) => {
    const at = firmId + '|' + key
    if (value === null) { delete configs[at] } else { configs[at] = value }
    return Promise.resolve()
  })
  overlay.loadFirmConfigsByPrefix.mockImplementation((firmId, prefix) => {
    const out = {}
    Object.keys(configs).forEach((at) => {
      const [scope, key] = [at.slice(0, at.indexOf('|')), at.slice(at.indexOf('|') + 1)]
      if (scope !== firmId || key.indexOf(prefix) !== 0) { return }
      const suffix = key.slice(prefix.length)
      if (suffix) { out[suffix] = configs[at] }
    })
    return Promise.resolve(out)
  })

  clientStore.getById.mockResolvedValue({ id: CLIENT, name: 'Raman Joinery Ltd' })
})

afterAll(() => {
  fs.rmdirSync(ROOT, { recursive: true })
})

// ══════════════════════════════════════════════════════════════════════════════════════════

describe('logging a request', () => {
  it('stores it and returns the client’s name', async () => {
    const res = makeMockRes()
    await routes.logRequest(makeReq({
      body: {
        clientId: CLIENT,
        kind: 'copy',
        channel: 'email',
        receivedAt: '2026-09-02T00:00:00Z',
        note: 'asked by email'
      }
    }), res)

    expect(res._status).toBe(201)
    expect(res._body.request.clientName).toBe('Raman Joinery Ltd')
    expect(res._body.request.loggedBy).toBe('Dana Whitfield')
    expect(res._body.request.state).toBe('open')
  })

  it('🔴 refuses a client that is not on THIS firm’s register', async () => {
    // The same IDOR-safe shape startRecording uses: `getById` is scoped to req.firmId, so an
    // id belonging to another firm resolves to nothing and is refused rather than attaching
    // one firm's client to another firm's request.
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.logRequest(makeReq({
      body: { clientId: 'someone-elses', kind: 'copy', channel: 'email', receivedAt: '2026-09-02' }
    }), res)

    expect(res._status).toBe(404)
    expect(errorBody(res).error.code).toBe('NO_SUCH_CLIENT')
  })

  it('refuses a request with no client, rather than storing a note nobody can action', async () => {
    const res = makeMockRes()
    await routes.logRequest(makeReq({
      body: { kind: 'copy', channel: 'email', receivedAt: '2026-09-02' }
    }), res)
    expect(res._status).toBe(400)
  })

  it('refuses an unknown kind and an unknown channel', async () => {
    const bad = makeMockRes()
    await routes.logRequest(makeReq({
      body: { clientId: CLIENT, kind: 'everything', channel: 'email', receivedAt: '2026-09-02' }
    }), bad)
    expect(bad._status).toBe(400)

    const worse = makeMockRes()
    await routes.logRequest(makeReq({
      body: { clientId: CLIENT, kind: 'copy', channel: 'carrier-pigeon', receivedAt: '2026-09-02' }
    }), worse)
    expect(worse._status).toBe(400)
  })

  it('🔴 dates the clock from when the CLIENT asked, not from when it was typed in', async () => {
    // A request logged a week late is already a week into its allowance. A screen that
    // pretended otherwise would hide exactly the lateness it exists to show.
    const id = await seedRequest({ receivedAt: '2026-09-02T00:00:00Z' })
    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)
    expect(res._body.request.receivedAt).toBe('2026-09-02T00:00:00.000Z')
    expect(res._body.clock.due.slice(0, 10)).toBe('2026-09-30')
  })
})

describe('the request list', () => {
  it('carries each request’s clock and puts open requests first', async () => {
    const openId = await seedRequest()
    const closedId = await seedRequest({ receivedAt: '2026-08-01T00:00:00Z' })

    const closeRes = makeMockRes()
    await routes.closeRequest(
      makeReq({ params: { requestId: closedId }, body: { outcome: 'sent' } }), closeRes)
    expect(closeRes._status).toBe(200)

    const res = makeMockRes()
    await routes.listRequests(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.requests[0].id).toBe(openId)
    expect(res._body.requests[0].clock).not.toBeNull()
    // A closed request has no clock — a countdown on something already answered reads as a
    // deadline still running.
    expect(res._body.requests[1].clock).toBeNull()
  })

  it('leaves a row nameless rather than dropping it when the register read fails', async () => {
    await seedRequest()
    clientStore.getById.mockRejectedValue(new Error('register down'))
    const res = makeMockRes()
    await routes.listRequests(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.requests).toHaveLength(1)
    expect(res._body.requests[0].clientName).toBe('')
  })
})

describe('one request', () => {
  it('finds every meeting with that client, whoever recorded it', async () => {
    // 🔴 IT DOES NOT FILTER ON ADVISOR. A client's request is about the CLIENT, so filtering
    // by the caller here would quietly answer half of it.
    const mine = seedMeeting({ advisor: DANA })
    const theirs = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)

    const ids = res._body.meetings.map(m => m.meetingId)
    expect(ids).toContain(mine)
    expect(ids).toContain(theirs)
  })

  it('🔴 marks only the caller’s own meetings as theirs to act on', async () => {
    const mine = seedMeeting({ advisor: DANA })
    const theirs = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)

    const byId = {}
    res._body.meetings.forEach((m) => { byId[m.meetingId] = m })
    expect(byId[mine].yours).toBe(true)
    expect(byId[theirs].yours).toBe(false)
  })

  it('🔴 excludes another firm’s meeting with a client of the same id', async () => {
    // P13. Two firms can hold register ids that collide; the firm on the meeting record is
    // what separates them, and without this check one firm's request would surface another
    // firm's transcript.
    const elsewhere = seedMeeting({ firmId: OTHER_FIRM, advisor: DANA })
    const ours = seedMeeting({ firmId: FIRM, advisor: DANA })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)

    const ids = res._body.meetings.map(m => m.meetingId)
    expect(ids).toContain(ours)
    expect(ids).not.toContain(elsewhere)
  })

  it('🔴 names an expired meeting’s OWN retention period, never the firm’s current dial', async () => {
    // Ruling 7, and meetingPurge's own rule. A firm that later extended to 24 months still
    // reports 18 against an old meeting, because 18 is what that client was told that day.
    const old = seedMeeting({ retentionMonths: 18, transcript: false, summary: false, coaching: false })
    store.updateMeta(old, { transcriptPurgedAt: '2026-05-11T00:00:00Z' })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)

    const row = res._body.meetings.find(m => m.meetingId === old)
    expect(row.expired).toBe(true)
    expect(row.expiredAt).toBe('2026-05-11T00:00:00Z')
    expect(row.expiredReason).toBe('retention')
    expect(row.retentionMonths).toBe(18)
    expect(row.holds).toEqual([])
  })

  it('answers 404 for an id that is not a request id at all', async () => {
    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: '../../etc/passwd' } }), res)
    expect(res._status).toBe(404)
  })
})

describe('releasing a meeting', () => {
  it('🔴 NEVER includes the coaching notes, even though the meeting holds them', async () => {
    // RULING 1, and the single most important assertion in this file. In Mike's words:
    // "clients never get these notes." A release that included them would look like a
    // successful release on every screen in the app.
    const meetingId = seedMeeting({})
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: TICKS }), res)

    expect(res._status).toBe(201)
    expect(res._body.release.documents).toEqual(['transcript', 'summary'])
    expect(res._body.release.documents).not.toContain('coaching')
    // And the notes are still on disk — released is not deleted.
    expect(store.readReport(meetingId, 'coaching')).not.toBeNull()
  })

  it('🔴 refuses without BOTH of Screen B’s ticks, on the ROUTE and not the screen', async () => {
    // The two ticks are the control ruling 8 rests on — "warn, and remove nothing
    // automatically" is only a control if somebody actually passed through the warning.
    // A disabled button is not a control: a caller who never loaded the screen would sail
    // past it, and the release record would say a firm had read what it never opened.
    const meetingId = seedMeeting({})
    const id = await seedRequest()

    const neither = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: {} }), neither)
    expect(neither._status).toBe(400)
    expect(errorBody(neither).error.code).toBe('CONFIRMATION_REQUIRED')

    const onlyIdentity = makeMockRes()
    await routes.releaseMeeting(makeReq({
      params: { requestId: id, meetingId }, body: { identityConfirmed: true }
    }), onlyIdentity)
    expect(onlyIdentity._status).toBe(400)

    const onlyRead = makeMockRes()
    await routes.releaseMeeting(makeReq({
      params: { requestId: id, meetingId }, body: { contentRead: true }
    }), onlyRead)
    expect(onlyRead._status).toBe(400)

    // And nothing was recorded by any of the three.
    const check = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), check)
    expect(check._body.releases).toHaveLength(0)
  })

  it('🔴 refuses a meeting the caller did not record', async () => {
    // RULING 2. A manager must use the break-glass, which records why.
    const meetingId = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: TICKS }), res)

    expect(res._status).toBe(403)
    expect(errorBody(res).error.code).toBe('NOT_YOUR_MEETING')
  })

  it('🔴 does not release a summary the advisor never approved', async () => {
    // P7 makes the summary a DRAFT until the advisor approves it — "the app writes; the
    // advisor publishes". Handing over an unapproved draft would publish on their behalf.
    const meetingId = seedMeeting({ summaryApproved: false })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: TICKS }), res)

    expect(res._status).toBe(201)
    expect(res._body.release.documents).toEqual(['transcript'])
  })

  it('refuses when the meeting holds nothing, rather than recording an empty envelope', async () => {
    const meetingId = seedMeeting({ transcript: false, summary: false, coaching: false })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: TICKS }), res)

    expect(res._status).toBe(409)
    expect(errorBody(res).error.code).toBe('NOTHING_TO_RELEASE')
  })

  it('refuses a second release of the same meeting', async () => {
    const meetingId = seedMeeting({})
    const id = await seedRequest()

    const first = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: TICKS }), first)
    expect(first._status).toBe(201)

    const second = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: TICKS }), second)
    expect(second._status).toBe(409)
    expect(errorBody(second).error.code).toBe('ALREADY_RELEASED')
  })

  it('🔴 stores each release under its OWN key, so two advisors cannot overwrite each other', async () => {
    // Item 4.75's lost-update fault, which ruling 2 walks straight into: a client's request
    // spans several advisors and each releases their own part. One row holding them all would
    // lose a release and show the client's meeting as sent.
    const mine = seedMeeting({ advisor: DANA })
    const theirs = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()

    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId: mine }, body: TICKS }), makeMockRes())
    await routes.releaseMeeting(
      makeReq({ advisorId: OWEN, advisorName: 'Owen Fraser', params: { requestId: id, meetingId: theirs }, body: TICKS }),
      makeMockRes())

    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)
    expect(res._body.releases).toHaveLength(2)
    expect(res._body.releases.map(r => r.meetingId).sort()).toEqual([mine, theirs].sort())
  })

  it('refuses to release against a closed request', async () => {
    const meetingId = seedMeeting({})
    const id = await seedRequest()
    await routes.closeRequest(makeReq({ params: { requestId: id }, body: {} }), makeMockRes())

    const res = makeMockRes()
    await routes.releaseMeeting(makeReq({ params: { requestId: id, meetingId }, body: TICKS }), res)
    expect(res._status).toBe(409)
  })

  it('🔴 refuses a meeting belonging to a different client on this firm’s books', async () => {
    // A meeting id guessed from elsewhere must not be releasable under somebody else's
    // request — the release record would then say a client was sent another client's meeting.
    const otherClients = seedMeeting({ clientId: OTHER_CLIENT })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseMeeting(
      makeReq({ params: { requestId: id, meetingId: otherClients }, body: TICKS }), res)
    expect(res._status).toBe(404)
  })
})

describe('the break-glass — a manager releases an absent advisor’s meeting', () => {
  it('🔴 refuses without the declaration', async () => {
    const meetingId = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseAbsent(makeReq({ params: { requestId: id, meetingId }, body: {} }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('DECLARATION_REQUIRED')
  })

  it('🔴 refuses without the reading tick as well — the break-glass does not excuse it', async () => {
    // If anything it matters more here: the person releasing was not in the room and has
    // never read a word of this meeting.
    const meetingId = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseAbsent(makeReq({
      advisorId: 'mgr-marcus',
      advisorName: 'Marcus Bell',
      params: { requestId: id, meetingId },
      body: { declared: true }
    }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('CONFIRMATION_REQUIRED')
  })

  it('🔴 records the declaration permanently, with both names', async () => {
    // The tick cannot be verified — this app holds no advisors table and does not handle
    // sign-in — so the RECORD is the entire control. A release that stored no declaration
    // would be a manager reading a colleague's transcript with nothing to show for it.
    const meetingId = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseAbsent(makeReq({
      advisorId: 'mgr-marcus',
      advisorName: 'Marcus Bell',
      params: { requestId: id, meetingId },
      body: { declared: true, contentRead: true }
    }), res)

    expect(res._status).toBe(201)
    expect(res._body.release.breakGlass).toMatchObject({
      absentAdvisor: 'Owen Fraser',
      declaredBy: 'Marcus Bell'
    })
    expect(res._body.release.documents).not.toContain('coaching')
  })

  it('🔴 refuses on the caller’s OWN meeting', async () => {
    // Their own meeting needs no break-glass, and recording one would put a permanent
    // declaration about an absent colleague on a meeting the caller took themselves.
    const meetingId = seedMeeting({ advisor: DANA })
    const id = await seedRequest()

    const res = makeMockRes()
    await routes.releaseAbsent(makeReq({
      params: { requestId: id, meetingId }, body: { declared: true, contentRead: true }
    }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('YOUR_OWN_MEETING')
  })

  it('survives a read-back — the declaration is not lost between write and screen', async () => {
    const meetingId = seedMeeting({ advisor: OWEN, advisorName: 'Owen Fraser' })
    const id = await seedRequest()
    await routes.releaseAbsent(makeReq({
      advisorId: 'mgr-marcus',
      advisorName: 'Marcus Bell',
      params: { requestId: id, meetingId },
      body: { declared: true, contentRead: true }
    }), makeMockRes())

    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)
    expect(res._body.releases[0].breakGlass.declaredBy).toBe('Marcus Bell')
  })
})

describe('a correction', () => {
  it('🔴 attaches the client’s statement and leaves the transcript untouched', async () => {
    // RULING 4. Every coaching finding quotes the transcript and is verified against it before
    // storage, so an edit would strand findings that still read as evidenced.
    const meetingId = seedMeeting({})
    const before = JSON.stringify(store.readTranscript(meetingId))
    const id = await seedRequest({ kind: 'correction' })

    const res = makeMockRes()
    await routes.attachCorrection(makeReq({
      params: { requestId: id, meetingId },
      body: { statement: 'I said two staff, not twelve.', quote: 'twelve staff', quoteAt: '00:31:08' }
    }), res)

    expect(res._status).toBe(201)
    expect(JSON.stringify(store.readTranscript(meetingId))).toBe(before)

    const held = store.readCorrections(meetingId)
    expect(held).toHaveLength(1)
    expect(held[0].statement).toBe('I said two staff, not twelve.')
    expect(held[0].quote).toBe('twelve staff')
  })

  it('refuses an empty statement', async () => {
    const meetingId = seedMeeting({})
    const id = await seedRequest({ kind: 'correction' })
    const res = makeMockRes()
    await routes.attachCorrection(makeReq({
      params: { requestId: id, meetingId }, body: { statement: '   ' }
    }), res)
    expect(res._status).toBe(400)
  })

  it('refuses when the transcript has already gone', async () => {
    // A statement disputing words nobody can read would sit on a record whose text is gone.
    const meetingId = seedMeeting({ transcript: false })
    const id = await seedRequest({ kind: 'correction' })
    const res = makeMockRes()
    await routes.attachCorrection(makeReq({
      params: { requestId: id, meetingId }, body: { statement: 'I said two.' }
    }), res)
    expect(res._status).toBe(409)
    expect(errorBody(res).error.code).toBe('NO_TRANSCRIPT')
  })

  it('refuses a meeting the caller did not record', async () => {
    const meetingId = seedMeeting({ advisor: OWEN })
    const id = await seedRequest({ kind: 'correction' })
    const res = makeMockRes()
    await routes.attachCorrection(makeReq({
      params: { requestId: id, meetingId }, body: { statement: 'I said two.' }
    }), res)
    expect(res._status).toBe(403)
  })

  it('appends rather than replacing, so a second statement does not erase the first', async () => {
    const meetingId = seedMeeting({})
    const id = await seedRequest({ kind: 'correction' })
    const req = () => makeReq({ params: { requestId: id, meetingId }, body: { statement: 'x' } })
    await routes.attachCorrection(req(), makeMockRes())
    await routes.attachCorrection(req(), makeMockRes())
    expect(store.readCorrections(meetingId)).toHaveLength(2)
  })
})

describe('early deletion at the client’s request', () => {
  it('🔴 destroys the transcript, BOTH reports and any correction together', async () => {
    // RULING 5. Removing the transcript alone leaves the client's words in the two reports —
    // the letter of the promise kept and its substance broken, and the screen says "deleted"
    // either way.
    const meetingId = seedMeeting({})
    const id = await seedRequest({ kind: 'deletion' })
    store.appendCorrection(meetingId, { id: 'c1', at: '2026-09-01', statement: 'I said two.' })

    const res = makeMockRes()
    await routes.deleteMeetingText(makeReq({
      params: { requestId: id, meetingId }, body: { clientAsked: true, confirmed: true }
    }), res)

    expect(res._status).toBe(200)
    expect(store.readTranscript(meetingId)).toBeNull()
    expect(store.readReport(meetingId, 'summary')).toBeNull()
    expect(store.readReport(meetingId, 'coaching')).toBeNull()
    expect(store.readCorrections(meetingId)).toEqual([])
  })

  it('🔴 keeps the meeting record, stamped, so the deletion is provable', async () => {
    // P8. A firm has to be able to prove the deletion happened rather than show an empty
    // folder and ask to be believed.
    const meetingId = seedMeeting({})
    const id = await seedRequest({ kind: 'deletion' })
    await routes.deleteMeetingText(makeReq({
      params: { requestId: id, meetingId }, body: { clientAsked: true, confirmed: true }
    }), makeMockRes())

    const meta = store.readMeta(meetingId)
    expect(meta).not.toBeNull()
    expect(meta.deletedForClientAt).toEqual(expect.any(String))
    expect(meta.deletedForRequestId).toBe(id)
    expect(meta.clientId).toBe(CLIENT)
  })

  it('distinguishes a client-asked deletion from an ordinary expiry on the screen', async () => {
    const meetingId = seedMeeting({})
    const id = await seedRequest({ kind: 'deletion' })
    await routes.deleteMeetingText(makeReq({
      params: { requestId: id, meetingId }, body: { clientAsked: true, confirmed: true }
    }), makeMockRes())

    const res = makeMockRes()
    await routes.getRequest(makeReq({ params: { requestId: id } }), res)
    const row = res._body.meetings.find(m => m.meetingId === meetingId)
    expect(row.expiredReason).toBe('client-asked')
  })

  it('🔴 refuses without BOTH ticks — and they say different things', async () => {
    // Screen D has two, and collapsing them into one would lose the first. Without "the
    // client asked", a firm could destroy a record for its own reasons and have the
    // surviving stub read afterwards as a client's request — which is precisely what a
    // later reader of that stub relies on.
    const meetingId = seedMeeting({})
    const id = await seedRequest({ kind: 'deletion' })

    const neither = makeMockRes()
    await routes.deleteMeetingText(makeReq({
      params: { requestId: id, meetingId }, body: {}
    }), neither)
    expect(neither._status).toBe(400)

    const onlyUndone = makeMockRes()
    await routes.deleteMeetingText(makeReq({
      params: { requestId: id, meetingId }, body: { confirmed: true }
    }), onlyUndone)
    expect(onlyUndone._status).toBe(400)

    const onlyAsked = makeMockRes()
    await routes.deleteMeetingText(makeReq({
      params: { requestId: id, meetingId }, body: { clientAsked: true }
    }), onlyAsked)
    expect(onlyAsked._status).toBe(400)

    expect(store.readTranscript(meetingId)).not.toBeNull()
  })

  it('refuses a meeting the caller did not record', async () => {
    const meetingId = seedMeeting({ advisor: OWEN })
    const id = await seedRequest({ kind: 'deletion' })
    const res = makeMockRes()
    await routes.deleteMeetingText(makeReq({
      params: { requestId: id, meetingId }, body: { clientAsked: true, confirmed: true }
    }), res)

    expect(res._status).toBe(403)
    expect(store.readTranscript(meetingId)).not.toBeNull()
  })
})

describe('the deadline routes', () => {
  it('returns the platform default and the units a firm may choose', async () => {
    const res = makeMockRes()
    await routes.getDeadline(makeReq(), res)
    expect(res._body.resolved).toMatchObject({ count: 20, unit: 'working-days' })
    expect(res._body.units).toContain('calendar-months')
  })

  it('saves a firm’s own figure and reports it as set here', async () => {
    const put = makeMockRes()
    await routes.setDeadline(makeReq({ body: { count: 1, unit: 'calendar-months' } }), put)
    expect(put._status).toBe(200)

    const res = makeMockRes()
    await routes.getDeadline(makeReq(), res)
    expect(res._body.resolved).toMatchObject({ count: 1, unit: 'calendar-months', source: 'set-here' })
    expect(res._body.phrase).toBe('1 calendar month')
  })

  it('refuses a bad figure rather than storing it', async () => {
    const res = makeMockRes()
    await routes.setDeadline(makeReq({ body: { count: 17.5, unit: 'working-days' } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('BAD_DEADLINE')
  })

  it('resets back to the level above', async () => {
    await routes.setDeadline(makeReq({ body: { count: 5, unit: 'calendar-days' } }), makeMockRes())
    const reset = makeMockRes()
    await routes.resetDeadline(makeReq(), reset)
    expect(reset._body.resolved).toMatchObject({ count: 20, unit: 'working-days' })
  })

  it('🔴 uses the firm’s own unit on every request’s clock', async () => {
    await routes.setDeadline(makeReq({ body: { count: 1, unit: 'calendar-months' } }), makeMockRes())
    await seedRequest()

    const res = makeMockRes()
    await routes.listRequests(makeReq(), res)
    expect(res._body.requests[0].clock.due.slice(0, 10)).toBe('2026-10-02')
  })
})

describe('closing a request', () => {
  it('keeps it, with who closed it and when', async () => {
    // Closed requests are kept deliberately: being able to show a request was answered, and
    // how quickly, is the evidence half of the all-care basis.
    const id = await seedRequest()
    const res = makeMockRes()
    await routes.closeRequest(makeReq({
      params: { requestId: id }, body: { outcome: 'transcript and summary sent' }
    }), res)

    expect(res._status).toBe(200)
    expect(res._body.request.state).toBe('closed')
    expect(res._body.request.closedBy).toBe('Dana Whitfield')
    expect(res._body.request.outcome).toBe('transcript and summary sent')

    const list = makeMockRes()
    await routes.listRequests(makeReq(), list)
    expect(list._body.requests).toHaveLength(1)
  })

  it('refuses to close twice', async () => {
    const id = await seedRequest()
    await routes.closeRequest(makeReq({ params: { requestId: id }, body: {} }), makeMockRes())
    const res = makeMockRes()
    await routes.closeRequest(makeReq({ params: { requestId: id }, body: {} }), res)
    expect(res._status).toBe(409)
  })
})

describe('the storage shape', () => {
  it('🔴 addresses a release by request AND meeting', () => {
    const a = 'a'.repeat(32)
    const b = 'b'.repeat(32)
    expect(ccr.releaseConfigKey(a, b)).toBe('client-copy-release:' + a + ':' + b)
    expect(ccr.releaseIdsFromSuffix(a + ':' + b)).toEqual({ requestId: a, meetingId: b })
  })

  it('refuses to build a key from an id that is not one', () => {
    expect(() => ccr.requestConfigKey('../etc')).toThrow()
    expect(() => ccr.releaseConfigKey('a'.repeat(32), 'nope')).toThrow()
  })
})
