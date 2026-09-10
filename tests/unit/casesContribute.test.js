'use strict'

/**
 * The review hook that pools a consenting firm's outcome (4.87 T015/T018/T019).
 *
 * What UAT cannot see: a review at a non-consenting firm leaking into the pool, a pool row
 * that names the advisor, and a review that fails because learning failed.
 */

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))
jest.mock('../../server/utils/caseStore', () => ({
  updateReview: jest.fn(),
  getVisibleCase: jest.fn(),
  listForAdvisor: jest.fn(),
  VISIBILITIES: ['private', 'shared']
}))
jest.mock('../../server/utils/templateLibrary', () => ({ loadEffectiveTemplates: jest.fn() }))
jest.mock('../../server/utils/coaching', () => ({ appendFirmCoachingEntry: jest.fn() }))
jest.mock('../../server/utils/openaiClient', () => ({ createOpenAIClient: jest.fn() }))
jest.mock('../../server/utils/anonymiseCase', () => ({ anonymiseCaseContent: jest.fn() }))

const overlay = require('../../server/utils/firmOverlay')
const caseStore = require('../../server/utils/caseStore')
const { loadEffectiveTemplates } = require('../../server/utils/templateLibrary')
const { reviewCase, listCases } = require('../../server/routes/cases')
const { industryVocabulary, POOL_SAVED_BY } = require('../../server/utils/outcomeContribute')
const { CONFIG_KEY, CONSENT_WORDING, firmToken, caseHash } = require('../../server/utils/outcomeConsent')
const { guardContribution } = require('../../server/utils/outcomeLearning')
const { SIGNAL_TYPES } = require('../../server/utils/signals')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const ADVISOR = 'advisor-from-jwt'
const FIRM = 'firm-from-jwt'
const CASE = 'case-77'
const LIB = [
  { title: 'Break-even Analysis', tags: ['Cafe & Bar', 'Hospitality', 'Profit', 'Shop'] },
  { title: 'Cashflow Forecast', tags: ['Plumber', 'Trades'] }
]

function makeRes () {
  return {
    headersSent: false,
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (json) { this._body = JSON.parse(json) }
  }
}
const req = (over = {}) => ({ advisorId: ADVISOR, firmId: FIRM, userEmail: 'adv@firm.example', params: { id: CASE }, body: {}, ...over })

const consentOn = () => ({ on: true, setBy: 'm@firm.example', setAt: '2026-09-01T00:00:00Z', wording: CONSENT_WORDING, withdrawals: [] })

const caseRow = (over = {}) => ({
  id: CASE,
  advisorId: ADVISOR,
  firmId: FIRM,
  domain: 'profit',
  staircaseStep: 'as-interpretation',
  updatedAt: '2026-09-04T00:00:00Z',
  review: { reviewedAt: '2026-09-04T03:00:00Z', wentWell: 'Bob loved it' },
  templateOutcomes: [{ title: 'break-even analysis', used: 'full', outcome: 'well' }],
  decisionTrace: {
    situation: { industry: 'Cafe', primaryIssue: 'Cost of sales has increased', clientName: 'Bob' },
    lenses: { engagementType: 'advice', signalTypes: ['client_awareness'] }
  },
  ...over
})

const originalSecret = process.env.OUTCOME_POOL_SECRET

beforeEach(() => {
  jest.clearAllMocks()
  process.env.OUTCOME_POOL_SECRET = 'test-pool-secret'
  caseStore.updateReview.mockResolvedValue(true)
  caseStore.getVisibleCase.mockResolvedValue(caseRow())
  loadEffectiveTemplates.mockResolvedValue(LIB)
  overlay.loadFirmConfig.mockResolvedValue(consentOn())
  overlay.saveFirmConfig.mockResolvedValue(1)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  console.error.mockRestore()
  if (originalSecret === undefined) { delete process.env.OUTCOME_POOL_SECRET } else { process.env.OUTCOME_POOL_SECRET = originalSecret }
})

describe('reviewCase with consent on', () => {
  test('saves the review, then pools one anonymous row at the platform scope that equals the guard\'s return', async () => {
    const res = makeRes()
    await reviewCase(req({ body: { wentWell: 'great', templateOutcomes: [{ title: 'Break-even Analysis', used: 'full', outcome: 'well' }] } }), res)

    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true })
    expect(caseStore.updateReview).toHaveBeenCalledWith(CASE, ADVISOR, expect.objectContaining({ wentWell: 'great' }))
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(FIRM, CONFIG_KEY)
    expect(caseStore.getVisibleCase).toHaveBeenCalledWith(CASE, ADVISOR, FIRM)

    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe('outcome-pool:' + firmToken(FIRM) + ':' + caseHash(CASE))
    expect(by).toBe(POOL_SAVED_BY)
    expect(value).toEqual({
      v: 1,
      month: '2026-09',
      domain: 'profit',
      primaryIssue: 'Cost of sales has increased',
      industry: 'cafe',
      signals: ['client_awareness'],
      engagementType: 'advice',
      staircaseStep: 'as-interpretation',
      templates: [{ title: 'Break-even Analysis', used: 'full', outcome: 'well' }]
    })
    expect(guardContribution(value, { libraryTitles: LIB.map(t => t.title), signalTypes: Object.values(SIGNAL_TYPES) })).toBe(value)
    // Nothing that names anyone reaches the store.
    const written = JSON.stringify(overlay.saveFirmConfig.mock.calls[0])
    expect(written).not.toContain('Bob')
    expect(written).not.toContain(ADVISOR)
    expect(written).not.toContain(FIRM)
    expect(written).not.toContain(CASE)
    expect(written).not.toContain('adv@firm.example')
  })

  test('the review saves first: no pool write happens when the update returns false', async () => {
    caseStore.updateReview.mockResolvedValue(false)
    const res = makeRes()
    await reviewCase(req(), res)
    expect(res._status).toBe(404)
    expect(caseStore.getVisibleCase).not.toHaveBeenCalled()
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a guard refusal is logged with the case id and the review response is unchanged', async () => {
    caseStore.getVisibleCase.mockResolvedValue(caseRow({ decisionTrace: { situation: {}, lenses: { engagementType: 'get', signalTypes: [] } } }))
    const res = makeRes()
    await reviewCase(req(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true })
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(CASE), 'OUTCOME_GUARD_ENGAGEMENT_TYPE')
  })

  test('a missing secret is logged and the review response is unchanged, and the case is never read', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    const res = makeRes()
    await reviewCase(req(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true })
    expect(caseStore.getVisibleCase).not.toHaveBeenCalled()
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(CASE), 'OUTCOME_POOL_SECRET_MISSING')
  })

  test('a store failure in the contribution is logged and the review response is unchanged', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('ER_LOCK_DEADLOCK'))
    const res = makeRes()
    await reviewCase(req(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true })
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(CASE), 'ER_LOCK_DEADLOCK')
  })

  test('nothing to pool: no outcomes on the case, or the case cannot be read back', async () => {
    caseStore.getVisibleCase.mockResolvedValue(caseRow({ templateOutcomes: null }))
    await reviewCase(req(), makeRes())
    caseStore.getVisibleCase.mockResolvedValue(null)
    await reviewCase(req(), makeRes())
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  test('falls back to the committed seed titles when no library is uploaded', async () => {
    loadEffectiveTemplates.mockResolvedValue(null)
    caseStore.getVisibleCase.mockResolvedValue(caseRow({ templateOutcomes: [{ title: 'Not A Real Template', used: 'full', outcome: 'well' }] }))
    await reviewCase(req(), makeRes())
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('reviewCase with consent off', () => {
  test.each([
    ['switched off', { on: false, setBy: 'm@firm.example', setAt: '2026-09-01T00:00:00Z' }],
    ['no record', null],
    ['a malformed record', { on: 'true' }]
  ])('pools nothing when consent is %s, and never reads the case', async (_label, consent) => {
    overlay.loadFirmConfig.mockResolvedValue(consent)
    const res = makeRes()
    await reviewCase(req(), res)
    expect(res._status).toBe(200)
    expect(caseStore.getVisibleCase).not.toHaveBeenCalled()
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('listCases carries outcomeContribution', () => {
  beforeEach(() => { caseStore.listForAdvisor.mockResolvedValue([{ id: 'c1' }]) })

  test('true when the firm consents, from req.firmId', async () => {
    const res = makeRes()
    await listCases(req(), res)
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(FIRM, CONFIG_KEY)
    expect(res._body).toEqual({ success: true, advisorId: ADVISOR, cases: [{ id: 'c1' }], outcomeContribution: true })
  })

  test('false when off, and false with the cases still returned when the consent read fails', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ ...consentOn(), on: false })
    const res = makeRes()
    await listCases(req(), res)
    expect(res._body.outcomeContribution).toBe(false)

    overlay.loadFirmConfig.mockRejectedValue(new Error('boom'))
    const res2 = makeRes()
    await listCases(req(), res2)
    expect(res2._status).toBe(200)
    expect(res2._body).toMatchObject({ cases: [{ id: 'c1' }], outcomeContribution: false })
  })
})

describe('industryVocabulary', () => {
  test('is every title and tag word the resolver would accept, lowercased', () => {
    const vocab = industryVocabulary(LIB)
    expect(vocab.has('cafe')).toBe(true)
    expect(vocab.has('hospitality')).toBe(true)
    expect(vocab.has('plumber')).toBe(true)
    expect(vocab.has('break')).toBe(true)
    // Too short ('bar'), or a stop word under the resolver's industry list ('shop').
    expect(vocab.has('bar')).toBe(false)
    expect(vocab.has('shop')).toBe(false)
  })

  test('tolerates garbage', () => {
    expect(industryVocabulary(null).size).toBe(0)
    expect(industryVocabulary([null, 'x', { title: 7, tags: 'nope' }]).size).toBe(0)
  })
})
