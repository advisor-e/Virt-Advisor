'use strict'

// logModelChoice — item 7.5. What actually reaches the store.
//
// This is the boundary Decision 2 is enforced at, so the tests are about what is
// WRITTEN rather than about what is displayed. None of it is visible in UAT: every
// case below produces exactly the same answer on the advisor's screen.

jest.mock('../../server/utils/activityStore', () => ({ recordModelChoice: jest.fn() }))

const activityStore = require('../../server/utils/activityStore')
const { logModelChoice } = require('../../server/utils/activityLogger')

const BASE = {
  advisorId: 'adv-1',
  firmId: 'firm-a',
  advisorName: 'A. Advisor',
  domain: 'forecasting',
  models: ['/debtor-drag'],
  declined: false,
  source: 'declared',
  phase: 'recommendation'
}

beforeEach(() => {
  jest.clearAllMocks()
  activityStore.recordModelChoice.mockResolvedValue()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe('what is written', () => {
  test('one row per model named', async () => {
    await logModelChoice(Object.assign({}, BASE, { models: ['/debtor-drag', '/three-way-forecast'] }))
    expect(activityStore.recordModelChoice).toHaveBeenCalledTimes(2)
    expect(activityStore.recordModelChoice.mock.calls[0][0].modelRoute).toBe('/debtor-drag')
    expect(activityStore.recordModelChoice.mock.calls[1][0].modelRoute).toBe('/three-way-forecast')
  })

  test('a decline is ONE row with no route, and never a row per model', async () => {
    await logModelChoice(Object.assign({}, BASE, { models: [], declined: true }))
    expect(activityStore.recordModelChoice).toHaveBeenCalledTimes(1)
    const written = activityStore.recordModelChoice.mock.calls[0][0]
    expect(written.modelRoute).toBeNull()
    expect(written.declined).toBe(true)
  })

  test('a reply that named nothing and declined nothing writes NOTHING', async () => {
    // The screen's "said nothing about models" count comes from the session count by
    // subtraction. A row here for every ordinary conversation would make this table a
    // second copy of advisor_va_sessions, and the pattern would drown in it.
    await logModelChoice(Object.assign({}, BASE, { models: [], declined: false }))
    expect(activityStore.recordModelChoice).not.toHaveBeenCalled()
  })

  test('nothing is written without a verified advisor AND firm', async () => {
    await logModelChoice(Object.assign({}, BASE, { advisorId: null }))
    await logModelChoice(Object.assign({}, BASE, { firmId: null }))
    await logModelChoice(undefined)
    expect(activityStore.recordModelChoice).not.toHaveBeenCalled()
  })
})

describe('what can never be written', () => {
  test('only the named fields reach the store — no advisor text can ride along', async () => {
    // 🔴 Decision 2. A caller handing this function a transcript, a query or an intake
    // answer must not be able to get it into a table the mentor reads across firms.
    await logModelChoice(Object.assign({}, BASE, {
      situation: 'the client is in dispute with his brother',
      query: 'what should I do about my client',
      transcript: 'a whole meeting'
    }))
    const written = activityStore.recordModelChoice.mock.calls[0][0]
    expect(Object.keys(written).sort()).toEqual(
      ['advisorId', 'advisorName', 'declined', 'domain', 'firmId', 'modelRoute', 'phase', 'source'].sort()
    )
    expect(JSON.stringify(written)).not.toContain('dispute')
  })

  test('identity and domain are truncated to their column widths', async () => {
    await logModelChoice(Object.assign({}, BASE, {
      advisorId: 'a'.repeat(200),
      advisorName: 'n'.repeat(300),
      firmId: 'f'.repeat(200),
      domain: 'd'.repeat(300)
    }))
    const written = activityStore.recordModelChoice.mock.calls[0][0]
    expect(written.advisorId).toHaveLength(64)
    expect(written.advisorName).toHaveLength(128)
    expect(written.firmId).toHaveLength(64)
    expect(written.domain).toHaveLength(128)
  })
})

describe('it never costs an advisor their answer', () => {
  test('a store failure is swallowed and logged, not thrown', async () => {
    activityStore.recordModelChoice.mockRejectedValue(new Error('connection refused'))
    await expect(logModelChoice(BASE)).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })
})
