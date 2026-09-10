'use strict'

/**
 * What a session reads from Outcome Learning and writes to the trace (4.87 T033/T035).
 *
 * What UAT cannot see: an adjustment applied at a firm that never consented, a session
 * that dies because the pool could not be read, and a trace that claims a hold-back the
 * resolver never applied.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn()
}))
jest.mock('../../server/utils/templateLibrary', () => ({ loadEffectiveTemplates: jest.fn() }))
jest.mock('../../server/utils/caseStore', () => ({}))

const overlay = require('../../server/utils/firmOverlay')
const { loadEffectiveTemplates } = require('../../server/utils/templateLibrary')
const { loadPooledForSession, buildOutcomeLearningTrace, clearPooledCache } = require('../../server/utils/outcomeLearningSession')
const { CONFIG_KEY, CONSENT_WORDING } = require('../../server/utils/outcomeConsent')
const { POOL_PREFIX, DECISIONS_KEY } = require('../../server/utils/outcomeLearning')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-from-jwt'
const ID = 'break-even-analysis|domain|profit'
const consentOn = () => ({ on: true, setBy: 'm@firm.example', setAt: '2026-09-01T00:00:00Z', wording: CONSENT_WORDING, withdrawals: [] })

function pool ({ firms, cases, less }) {
  const rows = {}
  for (let i = 0; i < cases; i++) {
    rows['t' + (i % firms) + ':c' + i] = { domain: 'profit', templates: [{ title: 'Break-even Analysis', used: 'full', outcome: i < less ? 'less' : 'well' }] }
  }
  return rows
}

beforeEach(() => {
  jest.clearAllMocks()
  clearPooledCache()
  loadEffectiveTemplates.mockResolvedValue([{ title: 'Break-even Analysis' }])
  overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool({ firms: 6, cases: 30, less: 12 }))
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { console.error.mockRestore() })

describe('loadPooledForSession', () => {
  test('a session with no firm reads nothing', async () => {
    expect(await loadPooledForSession(null)).toEqual({ consented: false, available: true, adjustments: [] })
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })

  test.each([['switched off', { ...consentOn(), on: false }], ['no record', null], ['malformed', { on: 'true' }]])(
    'consent %s: nothing applied and the pool is never read', async (_l, consent) => {
      overlay.loadFirmConfig.mockResolvedValue(consent)
      expect(await loadPooledForSession(FIRM)).toEqual({ consented: false, available: true, adjustments: [] })
      expect(overlay.loadFirmConfig).toHaveBeenCalledWith(FIRM, CONFIG_KEY)
      expect(overlay.loadFirmConfigsByPrefix).not.toHaveBeenCalled()
    })

  test('consent on: only LIVE adjustments come back, from the platform scope', async () => {
    overlay.loadFirmConfig.mockImplementation((scope, key) => {
      if (scope === FIRM && key === CONFIG_KEY) { return Promise.resolve(consentOn()) }
      if (scope === PLATFORM_SCOPE && key === DECISIONS_KEY) { return Promise.resolve({ decisions: { [ID]: { state: 'live' }, 'break-even-analysis|engagementType|advice': { state: 'held' } } }) }
      return Promise.resolve(null)
    })
    const out = await loadPooledForSession(FIRM)
    expect(overlay.loadFirmConfigsByPrefix).toHaveBeenCalledWith(PLATFORM_SCOPE, POOL_PREFIX)
    expect(out.consented).toBe(true)
    expect(out.available).toBe(true)
    expect(out.adjustments).toEqual([{ id: ID, template: 'Break-even Analysis', dimension: 'domain', value: 'profit', holdBack: 4, firms: 6, cases: 30 }])
  })

  test('no decisions row, or a malformed one, means nothing is live', async () => {
    overlay.loadFirmConfig.mockImplementation(scope => Promise.resolve(scope === FIRM ? consentOn() : ['bad']))
    expect((await loadPooledForSession(FIRM)).adjustments).toEqual([])
    clearPooledCache()
    overlay.loadFirmConfig.mockImplementation(scope => Promise.resolve(scope === FIRM ? consentOn() : null))
    expect((await loadPooledForSession(FIRM)).adjustments).toEqual([])
  })

  test('the pool read failing degrades to nothing, available false, consent still true, and is logged', async () => {
    overlay.loadFirmConfig.mockImplementation(scope => Promise.resolve(scope === FIRM ? consentOn() : null))
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await loadPooledForSession(FIRM)).toEqual({ consented: true, available: false, adjustments: [] })
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('unavailable'), 'ECONNREFUSED')
  })

  test('the consent read failing degrades to nothing with consent unknown as false', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('store down'))
    expect(await loadPooledForSession(FIRM)).toEqual({ consented: false, available: false, adjustments: [] })
  })

  test('the live list is cached for a minute per process, and clearPooledCache drops it', async () => {
    overlay.loadFirmConfig.mockImplementation(scope => Promise.resolve(scope === FIRM ? consentOn() : { decisions: { [ID]: { state: 'live' } } }))
    await loadPooledForSession(FIRM)
    await loadPooledForSession(FIRM)
    expect(overlay.loadFirmConfigsByPrefix).toHaveBeenCalledTimes(1)
    clearPooledCache()
    await loadPooledForSession(FIRM)
    expect(overlay.loadFirmConfigsByPrefix).toHaveBeenCalledTimes(2)
  })

  test('falls back to the seed titles when no library is uploaded', async () => {
    loadEffectiveTemplates.mockResolvedValue(null)
    overlay.loadFirmConfig.mockImplementation(scope => Promise.resolve(scope === FIRM ? consentOn() : { decisions: { [ID]: { state: 'live' } } }))
    // 'Break-even Analysis' is not a seed title, so it is orphaned and never live.
    expect((await loadPooledForSession(FIRM)).adjustments).toEqual([])
  })
})

describe('buildOutcomeLearningTrace', () => {
  const adjustments = [
    { id: ID, template: 'Break-even Analysis', dimension: 'domain', value: 'profit', holdBack: 4, firms: 6, cases: 31 },
    { id: 'break-even-analysis|industry|cafe', template: 'Break-even Analysis', dimension: 'industry', value: 'cafe', holdBack: 3, firms: 5, cases: 28 },
    { id: '7-cash-drivers|signal|client-awareness', template: '7 Cash Drivers', dimension: 'signal', value: 'client_awareness', holdBack: 3, firms: 5, cases: 28 }
  ]
  const log = [
    { title: 'Break-even Analysis', matchReasons: ['domain:primary_subsection', 'pooled:held_back-7'] },
    { title: '7 Cash Drivers', matchReasons: ['distinction:+5', 'pooled:outweighed'] },
    { title: 'Working Capital Cycle', matchReasons: ['domain:primary_subsection'] },
    null,
    { title: 8 },
    { title: 'No Reasons' }
  ]

  test('applied lists only held-back templates with the hold-back the resolver wrote, and the weakest evidence', () => {
    const block = buildOutcomeLearningTrace(log, adjustments, { consented: true, available: true })
    expect(block).toEqual({
      consented: true,
      available: true,
      applied: [{ template: 'Break-even Analysis', holdBack: 7, id: ID, dimension: 'domain', value: 'profit', firms: 5, cases: 28 }],
      outweighed: [{ template: '7 Cash Drivers', holdBack: 3, id: '7-cash-drivers|signal|client-awareness', dimension: 'signal', value: 'client_awareness', firms: 5, cases: 28, by: 'distinction' }]
    })
  })

  test('consented false gives both lists empty whatever the log says', () => {
    expect(buildOutcomeLearningTrace(log, adjustments, { consented: false, available: true })).toEqual({ consented: false, available: true, applied: [], outweighed: [] })
  })

  test('available false is carried through', () => {
    expect(buildOutcomeLearningTrace([], [], { consented: true, available: false })).toEqual({ consented: true, available: false, applied: [], outweighed: [] })
    expect(buildOutcomeLearningTrace([], [], null)).toEqual({ consented: false, available: true, applied: [], outweighed: [] })
  })

  test('a held-back template with no matching adjustment still shows, with no evidence', () => {
    const block = buildOutcomeLearningTrace([{ title: 'Mystery', matchReasons: ['pooled:held_back-2'] }], [null, { template: 5 }], { consented: true })
    expect(block.applied).toEqual([{ template: 'Mystery', holdBack: 2, id: null, dimension: null, value: null, firms: 0, cases: 0 }])
    expect(buildOutcomeLearningTrace('nope', undefined, { consented: true }).applied).toEqual([])
    // An outweighed template whose adjustment carries no numeric hold-back reports 0, not NaN.
    const odd = buildOutcomeLearningTrace([{ title: 'Odd', matchReasons: ['pooled:outweighed'] }], [{ id: 'odd|domain|x', template: 'Odd', firms: 5, cases: 25 }], { consented: true })
    expect(odd.outweighed).toEqual([{ template: 'Odd', holdBack: 0, id: 'odd|domain|x', dimension: null, value: null, firms: 5, cases: 25, by: 'distinction' }])
    const none = buildOutcomeLearningTrace([{ title: 'Nobody', matchReasons: ['pooled:outweighed'] }], [], { consented: true })
    expect(none.outweighed).toEqual([{ template: 'Nobody', holdBack: 0, id: null, dimension: null, value: null, firms: 0, cases: 0, by: 'distinction' }])
  })
})
