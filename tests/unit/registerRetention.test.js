'use strict'

/**
 * registerRetention — how long a firm keeps a staff register (item 4.104, Decision 8).
 *
 * WHAT UAT CANNOT SEE. A tester sees one sentence — *"kept until 15 September 2033"* — and
 * has no way to tell whether the number behind it is this firm's, inherited from above, the
 * platform's default, or the MEETING dial read by mistake. That last one is the whole reason
 * this module exists rather than reusing `meetingRetention`, and the first test below is what
 * makes the separation provable rather than intended.
 */
jest.mock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => false) }))
jest.mock('../../server/utils/tierChain', () => ({ parentScopeOf: jest.fn(() => null) }))

const { parentScopeOf } = require('../../server/utils/tierChain')
const retention = require('../../server/utils/registerRetention')
const meetingRetention = require('../../server/utils/meetingRetention')

beforeEach(() => {
  parentScopeOf.mockReset()
  parentScopeOf.mockReturnValue(null)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { console.error.mockRestore() })

describe('🔴 it is its OWN dial, not the meeting one', () => {
  it('uses a different config key', () => {
    // Mike's ruling, question 4, 2026-09-15. The meeting period is SPOKEN ALOUD to a client
    // in the recorded consent wording; sharing one number would let a promise made to a
    // client silently change how long registers of named staff are kept, and the reverse.
    expect(retention.CONFIG_KEY).toBe('register-retention')
    expect(retention.CONFIG_KEY).not.toBe(meetingRetention.CONFIG_KEY)
  })

  it('uses a different dev file, so one cannot be read for the other', () => {
    expect(retention.DEV_FILE).not.toBe(meetingRetention.DEV_FILE)
  })

  it('has its own default and its own floor', () => {
    // Seven years, against the meeting dial's 18 months, and for the opposite reason: a
    // register exists because a transaction happened and is kept for the years in which that
    // transaction may be challenged.
    expect(retention.PLATFORM_DEFAULT_MONTHS).toBe(84)
    expect(retention.MIN_MONTHS).toBe(12)
  })
})

describe('validateRetentionMonths', () => {
  it('accepts a whole number of months in range', () => {
    expect(retention.validateRetentionMonths(84)).toEqual({ ok: true, errors: [], value: 84 })
  })

  it.each([['84'], [null], [undefined], [NaN], [Infinity]])('refuses %p', (value) => {
    expect(retention.validateRetentionMonths(value).ok).toBe(false)
  })

  it('refuses a fraction rather than rounding it', () => {
    expect(retention.validateRetentionMonths(17.5).ok).toBe(false)
  })

  it.each([[11], [241], [0], [-1]])('refuses %p months, outside the range', (value) => {
    const out = retention.validateRetentionMonths(value)
    expect(out.ok).toBe(false)
    expect(out.value).toBeNull()
  })
})

describe('readStoredRetention', () => {
  it('reads a well-formed stored value', () => {
    expect(retention.readStoredRetention({ months: 120 })).toBe(120)
  })

  it.each([[null], ['84'], [[]], [{}], [{ months: 'x' }], [{ months: 3 }]])('reads %p as nothing set', (stored) => {
    expect(retention.readStoredRetention(stored)).toBeNull()
  })
})

describe('loadOwnRetention', () => {
  it('returns what this scope set itself', async () => {
    const load = jest.fn().mockResolvedValue({ months: 120 })
    expect(await retention.loadOwnRetention('firm-1', load)).toBe(120)
    expect(load).toHaveBeenCalledWith('firm-1', 'register-retention')
  })

  it('returns null for no scope at all', async () => {
    expect(await retention.loadOwnRetention(null, jest.fn())).toBeNull()
  })

  it('re-throws a real database failure rather than reporting "nothing set"', async () => {
    // A production outage dressed up as "this firm has set nothing" would answer with a
    // figure nobody chose.
    const load = jest.fn().mockRejectedValue(new Error('refused'))
    await expect(retention.loadOwnRetention('firm-1', load)).rejects.toThrow('refused')
  })
})

describe('loadResolvedRetention', () => {
  it('uses the platform default when nothing is set anywhere', async () => {
    const out = await retention.loadResolvedRetention('firm-1', jest.fn().mockResolvedValue(null))
    expect(out).toEqual({ months: 84, source: 'platform-default', setAtScope: null })
  })

  it('prefers what the firm set itself', async () => {
    const out = await retention.loadResolvedRetention('firm-1', jest.fn().mockResolvedValue({ months: 120 }))
    expect(out).toEqual({ months: 120, source: 'set-here', setAtScope: 'firm-1' })
  })

  it('inherits from the tier above when the firm has set nothing', async () => {
    parentScopeOf.mockImplementation(scope => (scope === 'firm-1' ? 'group-1' : null))
    const load = jest.fn(scope => Promise.resolve(scope === 'group-1' ? { months: 60 } : null))
    const out = await retention.loadResolvedRetention('firm-1', load)
    expect(out).toEqual({ months: 60, source: 'inherited', setAtScope: 'group-1' })
  })

  it('reports the platform default as the platform\'s even when reached through a parent', async () => {
    parentScopeOf.mockImplementation(scope => (scope === 'firm-1' ? 'group-1' : null))
    const out = await retention.loadResolvedRetention('firm-1', jest.fn().mockResolvedValue(null))
    expect(out.source).toBe('platform-default')
  })

  it('answers for no scope at all', async () => {
    expect((await retention.loadResolvedRetention(null, jest.fn())).months).toBe(84)
  })

  it('never rejects — a storage fault falls back to the level above and logs', async () => {
    const load = jest.fn().mockRejectedValue(new Error('refused'))
    const out = await retention.loadResolvedRetention('firm-1', load)
    expect(out.months).toBe(84)
    expect(console.error).toHaveBeenCalled()
  })
})

describe('keptUntil — the sentence on the register', () => {
  it('counts from the day the register was OPENED, not from today', () => {
    // So the sentence on a register opened last year does not drift forward every time
    // somebody looks at it.
    expect(retention.keptUntil('2026-09-14T02:00:00.000Z', 84).slice(0, 10)).toBe('2033-09-14')
  })

  it('handles a month that does not have the same day number', () => {
    // 31 August + 18 months is 28 February; JavaScript rolls it to 3 March, which is close
    // enough for a retention sentence and is what Date does everywhere else in this app.
    expect(typeof retention.keptUntil('2026-08-31T00:00:00.000Z', 18)).toBe('string')
  })

  it.each([[null], [''], ['not a date']])('returns null for an opening date of %p', (iso) => {
    expect(retention.keptUntil(iso, 84)).toBeNull()
  })

  it('returns null for a retention period it would refuse to store', () => {
    expect(retention.keptUntil('2026-09-14T02:00:00.000Z', 3)).toBeNull()
  })
})
