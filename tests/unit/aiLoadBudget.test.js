'use strict'

/**
 * The AI document-reading cap — item 4.82.
 *
 * 🔴 NONE OF THIS IS VISIBLE TO A PERSON IN UAT, which is why it is tested here. A tester
 * loading two or three documents sees a feature working perfectly; the twenty-first reading,
 * the boundary of the rolling window, and what happens when the store cannot be read are all
 * invisible until someone gets a bill or an outage silently removes the limit.
 *
 *   1. THE TWENTY-FIRST IS REFUSED, AND REFUSED BEFORE ANYTHING IS SPENT.
 *   2. THE WINDOW ROLLS. A reading that has aged out frees its slot; one still inside it
 *      does not. A cap that never released would lock a firm out permanently.
 *   3. A REFUSAL RECORDS NOTHING. Otherwise a firm at its limit would keep writing rows and
 *      keep pushing its own window forward.
 *   4. IT FAILS CLOSED (Mike, 2026-09-11). A store that cannot be read refuses the reading,
 *      because that is exactly when we cannot know what has already been spent.
 */

// The production persistence path, mocked so no test touches MySQL or the dev JSON file.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const budget = require('../../server/utils/aiLoadBudget')

const FIRM = 'firm-test-123'
const USER = 'advisor@example.com'
const NOW = new Date('2026-09-11T12:00:00.000Z')

/** `n` readings, each `minutesAgo` apart, all inside the window unless said otherwise. */
function loadsAgo (hoursAgo) {
  return hoursAgo.map(h => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString())
}

/** What the store holds for this firm. */
function stored (value) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
    Promise.resolve(scopeId === FIRM && key === budget.CONFIG_KEY ? value : null))
}

/** The value the last write put in the store. */
function written () {
  const calls = overlay.saveFirmConfig.mock.calls
  return calls.length ? calls[calls.length - 1][2] : null
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
})

describe('spending a firm’s twenty readings', () => {
  test('a firm that has read nothing may read, and the reading is recorded', async () => {
    const result = await budget.consume(FIRM, USER, NOW)

    expect(result.ok).toBe(true)
    expect(result.used).toBe(1)
    expect(result.remaining).toBe(19)
    expect(written().loads).toEqual([NOW.toISOString()])
    // Its own key — it can never disturb the rates or the proposals beside it.
    expect(overlay.saveFirmConfig.mock.calls[0][1]).toBe(budget.CONFIG_KEY)
  })

  test('the twentieth is allowed and the twenty-first is refused', async () => {
    // Nineteen already spent, all within the last few hours.
    stored({ loads: loadsAgo([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7]) })

    const twentieth = await budget.consume(FIRM, USER, NOW)
    expect(twentieth.ok).toBe(true)
    expect(twentieth.used).toBe(20)
    expect(twentieth.remaining).toBe(0)

    stored({ loads: written().loads })
    const twentyFirst = await budget.consume(FIRM, USER, NOW)
    expect(twentyFirst.ok).toBe(false)
    expect(twentyFirst.status).toBe(429)
    expect(twentyFirst.code).toBe('AI_LOAD_LIMIT')
  })

  test('a refused reading writes nothing, so a firm at its limit cannot push its own window forward', async () => {
    stored({ loads: loadsAgo(new Array(20).fill(1)) })

    const result = await budget.consume(FIRM, USER, NOW)

    expect(result.ok).toBe(false)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('the count is asked for THIS scope, never another firm’s', async () => {
    await budget.consume(FIRM, USER, NOW)
    expect(overlay.loadFirmConfig.mock.calls[0][0]).toBe(FIRM)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
  })
})

describe('the window rolls', () => {
  test('a reading twenty-five hours old has left the window and frees its slot', async () => {
    const aged = loadsAgo(new Array(20).fill(25))
    stored({ loads: aged })

    const result = await budget.consume(FIRM, USER, NOW)

    expect(result.ok).toBe(true)
    // 🔴 And the aged rows are DROPPED rather than kept, so the stored list cannot grow for
    // the life of the firm.
    expect(written().loads).toEqual([NOW.toISOString()])
  })

  test('a reading exactly twenty-four hours old frees its slot; one an hour younger does not', async () => {
    stored({ loads: loadsAgo(new Array(19).fill(1).concat([24])) })
    const atBoundary = await budget.consume(FIRM, USER, NOW)
    expect(atBoundary.ok).toBe(true)

    stored({ loads: loadsAgo(new Array(19).fill(1).concat([23])) })
    const insideWindow = await budget.consume(FIRM, USER, NOW)
    expect(insideWindow.ok).toBe(false)
  })

  test('twenty spread over the last day still bar the twenty-first', async () => {
    stored({ loads: loadsAgo([0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 23]) })
    const result = await budget.consume(FIRM, USER, NOW)
    expect(result.ok).toBe(false)
    expect(result.used).toBe(20)
  })
})

describe('when the store will not answer', () => {
  let quiet
  const realEnv = process.env.NODE_ENV

  beforeEach(() => { quiet = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => {
    quiet.mockRestore()
    if (realEnv === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = realEnv }
  })

  test('a read that fails in production refuses the reading and spends nothing', async () => {
    process.env.NODE_ENV = 'production'
    overlay.loadFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED'))

    const result = await budget.consume(FIRM, USER, NOW)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
    expect(result.code).toBe('BUDGET_UNAVAILABLE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a write that fails in production refuses the reading — an unrecordable reading is uncountable', async () => {
    process.env.NODE_ENV = 'production'
    overlay.saveFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED'))

    const result = await budget.consume(FIRM, USER, NOW)

    expect(result.ok).toBe(false)
    expect(result.code).toBe('BUDGET_UNAVAILABLE')
  })

  test('a live database REFUSING the write is never treated as an absent one', async () => {
    // A refusal carries a sqlState; a connection failure does not. Outside production the
    // dev fallback may run for the second, and must never run for the first.
    process.env.NODE_ENV = 'development'
    const refused = new Error('FK constraint fails')
    refused.sqlState = '23000'
    overlay.saveFirmConfig.mockRejectedValue(refused)

    const result = await budget.consume(FIRM, USER, NOW)

    expect(result.ok).toBe(false)
    expect(result.code).toBe('BUDGET_UNAVAILABLE')
  })

  test('a stored value that makes no sense is treated as no readings, never as a lockout', async () => {
    // A corrupt counter must not bar a firm from the feature for ever with no way back. The
    // thing at stake here is a bill, not anyone's data.
    stored({ loads: 'not an array' })
    const result = await budget.consume(FIRM, USER, NOW)
    expect(result.ok).toBe(true)
    expect(result.used).toBe(1)
  })

  test('an unreadable timestamp among good ones is ignored rather than counted', async () => {
    stored({ loads: loadsAgo([1, 2, 3]).concat(['not a date', null, 42]) })
    const result = await budget.consume(FIRM, USER, NOW)
    expect(result.ok).toBe(true)
    expect(result.used).toBe(4)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Item 4.92 — the SECOND allowance. Mike ruled on 2026-09-11 that a country
// schedule has its own reading allowance, kept apart from a firm's 20 a day,
// and that the number is 10.
//
// 🔴 THE POINT UNDER TEST IS THE SEPARATION. The two allowances share every rule
// in this module and must share no COUNT: a group that has loaded ten schedules
// must still be able to read a document, and a firm that has spent its twenty
// documents must still be able to load a schedule. Nothing a person can see in
// UAT would reveal the two counters bleeding into each other until somebody was
// stopped for a reason that made no sense to them.
// ─────────────────────────────────────────────────────────────────────────────

const GROUP = '__global__:Advisor-e'

/** What the store holds for a named allowance. */
function storedFor (configKey, value) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
    Promise.resolve(key === configKey ? value : null))
}

describe('the country-schedule allowance is its own', () => {
  test('a group that has loaded nothing may load, and the load is recorded', async () => {
    const result = await budget.consumeScheduleLoad(GROUP, USER, NOW)

    expect(result.ok).toBe(true)
    expect(result.used).toBe(1)
    expect(result.remaining).toBe(budget.SCHEDULE_LIMIT - 1)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      GROUP, budget.SCHEDULE_CONFIG_KEY, expect.any(Object), USER
    )
  })

  test('the eleventh is refused, and refused before anything is spent', async () => {
    storedFor(budget.SCHEDULE_CONFIG_KEY, { loads: loadsAgo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) })

    const result = await budget.consumeScheduleLoad(GROUP, USER, NOW)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(429)
    expect(result.code).toBe('SCHEDULE_LOAD_LIMIT')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('it is counted in SCHEDULES, so one load is one reading however many passes it takes', async () => {
    // A 71-page schedule is nine model calls. Counting the calls would make the allowance
    // mean "how long is your country's document", which nobody can plan around.
    await budget.consumeScheduleLoad(GROUP, USER, NOW)
    expect(written().loads).toHaveLength(1)
  })

  test('it never spends the firm document allowance, and is never spent by it', async () => {
    // The separate config key is what guarantees this, rather than a rule to remember.
    storedFor(budget.CONFIG_KEY, { loads: loadsAgo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) })

    const schedule = await budget.consumeScheduleLoad(GROUP, USER, NOW)
    expect(schedule.ok).toBe(true)

    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(undefined)
    storedFor(budget.SCHEDULE_CONFIG_KEY, { loads: loadsAgo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) })

    const document = await budget.consume(FIRM, USER, NOW)
    expect(document.ok).toBe(true)
  })

  test('its window rolls too — a load that has aged out frees its slot', async () => {
    storedFor(budget.SCHEDULE_CONFIG_KEY, { loads: loadsAgo([25, 2, 3, 4, 5, 6, 7, 8, 9, 10]) })

    const result = await budget.consumeScheduleLoad(GROUP, USER, NOW)

    expect(result.ok).toBe(true)
    // The aged-out entry is dropped on the way past rather than carried for ever.
    expect(written().loads).toHaveLength(10)
  })

  // Fail-closed is proved in production, exactly as the document allowance's own tests do it:
  // outside production a connection-shaped failure is allowed to reach the dev JSON mirror, and
  // that affordance is not what is under test here.
  const realEnv = process.env.NODE_ENV
  afterEach(() => {
    if (realEnv === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = realEnv }
  })

  test('it fails closed when the store cannot be read', async () => {
    process.env.NODE_ENV = 'production'
    overlay.loadFirmConfig.mockRejectedValue(new Error('connection refused'))

    const result = await budget.consumeScheduleLoad(GROUP, USER, NOW)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
    expect(result.code).toBe('BUDGET_UNAVAILABLE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('it fails closed when the load cannot be recorded', async () => {
    process.env.NODE_ENV = 'production'
    overlay.saveFirmConfig.mockRejectedValue(new Error('connection refused'))

    const result = await budget.consumeScheduleLoad(GROUP, USER, NOW)

    expect(result.ok).toBe(false)
    expect(result.code).toBe('BUDGET_UNAVAILABLE')
  })
})
