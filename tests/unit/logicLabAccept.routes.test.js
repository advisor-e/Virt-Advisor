'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

/**
 * POST /api/firm-manager/logic-lab/accept — the Logic-Lab page's one write.
 *
 * THE PROMISE, in Mike's words (2026-08-03): "All I want is that if my adviser
 * uses that phrase, I want them to get their template."
 *
 * FOUR THINGS THAT MAKE THAT PROMISE KEEPABLE, and each is a test below:
 *
 *  1. IT PROVES THE OUTCOME, it does not assert it. The strength needed is
 *     arithmetic, but whether the AI matches the new distinction to those words
 *     is a judgement. So the route re-runs the phrase through the real engine and
 *     only reports success when the template really did come first.
 *  2. IT PUTS THE CONFIGURATION BACK when it could not deliver. A change that did
 *     not do what it promised is worse than no change: it is a change the manager
 *     believes worked.
 *  3. IT WRITES THROUGH THE SAME STORAGE THE MANUAL SCREENS USE, so an accepted
 *     idea and a hand-typed row are indistinguishable afterwards and the existing
 *     version history covers this feature for free.
 *  4. NO ACCEPT WITHOUT A RECORD. The log is the mentor rollup's feed and captures
 *     intent, which no count of configuration can.
 *
 * `decisionScore` is mocked because it makes live AI calls. What is under test is
 * the DECISION the route makes from its answers — including the one nobody would
 * write by hand: what to do when the engine says no.
 */

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn(),
  listFirmIdsWithConfigKey: jest.fn()
}))
jest.mock('../../server/utils/decisionScore', () => ({ diagnose: jest.fn() }))

const overlay = require('../../server/utils/firmOverlay')
const decisionScore = require('../../server/utils/decisionScore')
const { acceptLogicLabIdea } = require('../../server/routes/firmManager')

const PHRASE = 'two business owners who struggle to make effective decisions and have no clear goals'
const WANT = 'Governance Introduction'

const LIBRARY = [
  { page: 'p1', title: 'Governance Introduction' },
  { page: 'p2', title: '1 pg Bizz Case' }
]

/** Mike's real numbers: the wanted template on 1, the winner on 10. */
function diagnosisBefore () {
  return {
    scored: true,
    domain: 'strategy',
    sheet: [{ rank: 1, title: '1 pg Bizz Case', score: 10 }],
    expected: { rank: null, title: WANT, score: 1, unscored: true, inLibrary: true },
    gap: 9
  }
}

/** After the write: the wanted template now first. */
function diagnosisAfterWin () {
  return {
    scored: true,
    domain: 'strategy',
    sheet: [{ rank: 1, title: WANT, score: 11 }],
    expected: { rank: 1, title: WANT, score: 11 },
    gap: 0
  }
}

/** After the write: it still lost. */
function diagnosisAfterLoss () {
  return {
    scored: true,
    domain: 'strategy',
    sheet: [{ rank: 1, title: '1 pg Bizz Case', score: 10 }],
    expected: { rank: 3, title: WANT, score: 6 },
    gap: 4
  }
}

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    header () {},
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = typeof body === 'string' ? JSON.parse(body) : body }
  }
}

function makeReq (body = {}) {
  return {
    firmId: 'firm-test-123',
    userRole: 'firm_manager',
    userEmail: 'mgr@testfirm.com',
    query: {},
    params: {},
    body: { text: PHRASE, templateTitle: WANT, ...body }
  }
}

let store

beforeEach(() => {
  jest.clearAllMocks()
  store = {
    'advisory-distinctions': [],
    'advisory-distinctions-platform': [],
    'distinction-declines': [],
    'distinction-overrides': {},
    templates: LIBRARY,
    'logic-lab-accepted': []
  }
  overlay.loadFirmConfig.mockImplementation((_firmId, key) =>
    Promise.resolve(Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)
  )
  overlay.saveFirmConfig.mockImplementation((_firmId, key, value) => {
    store[key] = value
    return Promise.resolve(1)
  })
})

/** Every value written under one config key, in order. */
function saved (key) {
  return overlay.saveFirmConfig.mock.calls.filter(c => c[1] === key).map(c => c[2])
}

describe('when it can deliver', () => {
  beforeEach(() => {
    decisionScore.diagnose
      .mockResolvedValueOnce(diagnosisBefore())
      .mockResolvedValueOnce(diagnosisAfterWin())
  })

  it('files a distinction of the firm’s own, strong enough to come first', async () => {
    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.delivered).toBe(true)

    const rows = saved('advisory-distinctions')[0]
    expect(rows.length).toBe(1)
    // The manager's own words, filed in the area their phrase was read as.
    expect(rows[0].description).toBe(PHRASE)
    expect(rows[0].triggers).toEqual([PHRASE])
    expect(rows[0].domain).toBe('strategy')
    // ONE template — naming a second would spread the boost onto it.
    expect(rows[0].templates).toEqual([WANT])
    // 10 - 1 + 1: enough to clear the winner, not merely draw with it.
    expect(rows[0].boost).toBe(10)
    // Provenance, so a later reader can tell this from a hand-typed row.
    expect(rows[0].created_from).toBe('logic-lab')
  })

  it('CHECKS the outcome against the real engine before reporting success', async () => {
    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)

    // Twice: once to measure the gap, once to prove the change delivered.
    expect(decisionScore.diagnose).toHaveBeenCalledTimes(2)
    expect(res._body.delivered).toBe(true)
    expect(res._body.templateTitle).toBe(WANT)
  })

  it('writes the accepted-idea record in the same call', async () => {
    const res = makeRes()
    await acceptLogicLabIdea(makeReq({
      context: { sentence: PHRASE, domain: 'strategy', gap: 9 }
    }), res)

    const log = saved('logic-lab-accepted')
    expect(log.length).toBe(1)
    expect(log[0][0].sentence).toBe(PHRASE)
    expect(log[0][0].expectedTemplate).toBe(WANT)
    expect(log[0][0].by).toBe('mgr@testfirm.com')
  })
})

describe('when it CANNOT deliver', () => {
  beforeEach(() => {
    decisionScore.diagnose
      .mockResolvedValueOnce(diagnosisBefore())
      .mockResolvedValueOnce(diagnosisAfterLoss())
  })

  it('says so plainly instead of reporting a success that did not happen', async () => {
    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.delivered).toBe(false)
    expect(res._body.topTemplate).toBe('1 pg Bizz Case')
  })

  it('PUTS THE CONFIGURATION BACK exactly as it was', async () => {
    // The failure this guards against is not a crash. It is a manager walking
    // away believing their advisors will now get the template.
    store['advisory-distinctions'] = [{ id: 1, domain: 'conflict', description: 'something they had', templates: ['x'], boost: 5 }]
    const before = JSON.parse(JSON.stringify(store['advisory-distinctions']))

    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)

    expect(res._body.reverted).toBe(true)
    // The LAST write to the rows key restores what was there.
    const writes = saved('advisory-distinctions')
    expect(writes[writes.length - 1]).toEqual(before)
  })

  it('writes NO record — nothing was accepted, because nothing stuck', async () => {
    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)
    expect(saved('logic-lab-accepted')).toEqual([])
  })
})

describe('the refusals', () => {
  it('400s when the words are not recognised as any area', async () => {
    // Distinctions are only read inside an area, so there is nowhere to file it
    // that the engine would ever look.
    decisionScore.diagnose.mockResolvedValue({ scored: false, domain: null, sheet: [], expected: null, gap: null })
    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_DOMAIN')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('400s on a template the firm’s library does not have', async () => {
    decisionScore.diagnose.mockResolvedValue(diagnosisBefore())
    const res = makeRes()
    await acceptLogicLabIdea(makeReq({ templateTitle: 'Ghost Template' }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('TEMPLATE_NOT_IN_LIBRARY')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('400s on an empty phrase', async () => {
    decisionScore.diagnose.mockResolvedValue(diagnosisBefore())
    const res = makeRes()
    await acceptLogicLabIdea(makeReq({ text: '   ' }), res)

    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('500s with a safe message when the engine itself fails', async () => {
    decisionScore.diagnose.mockRejectedValue(new Error('openai unreachable'))
    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)

    expect(res._status).toBe(500)
    // Never a stack trace or an internal name (Engineering Standards).
    expect(JSON.stringify(res._body)).not.toContain('openai unreachable')
  })
})

describe('pressing it twice for the same phrase', () => {
  it('updates the row it wrote before rather than leaving two', async () => {
    store['advisory-distinctions'] = [{
      id: 4, domain: 'strategy', description: PHRASE, templates: [WANT], boost: 6, created_from: 'logic-lab'
    }]
    decisionScore.diagnose
      .mockResolvedValueOnce(diagnosisBefore())
      .mockResolvedValueOnce(diagnosisAfterWin())

    const res = makeRes()
    await acceptLogicLabIdea(makeReq(), res)

    expect(res._body.delivered).toBe(true)
    const rows = saved('advisory-distinctions')[0]
    expect(rows.length).toBe(1)
    expect(rows[0].id).toBe(4)
    expect(rows[0].boost).toBe(10)
  })
})
