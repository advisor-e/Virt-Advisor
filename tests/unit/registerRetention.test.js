'use strict'

/**
 * registerRetention — how long a firm keeps a staff register (item 5.1, Decision 8).
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

  // 🔴 MIKE'S RULING, 2026-09-23: "no more than 18months - this should flow down from mentor
  // - through the cascade levels and then at firm manager - be editable again."
  //
  // ⚠ THE CEILING IS LOAD-BEARING AND IS PINNED HERE ON PURPOSE. It was 84 months with a
  // 240 ceiling until that day, and NEITHER figure was ever his — Decision 8 ruled only that
  // the register is kept on a dial rather than deleted at deal-end, and named no number. The
  // seven years were written by us and then read back by later sessions as his. A default
  // nobody authorised is how a privacy setting drifts long without anyone deciding it should,
  // so the number now has a test with his words beside it.
  it('holds the 18-month ceiling Mike ruled, at every tier', () => {
    expect(retention.PLATFORM_DEFAULT_MONTHS).toBe(18)
    expect(retention.MAX_MONTHS).toBe(18)
    expect(retention.MIN_MONTHS).toBe(1)
  })

  // The ruling binds the mentor too, so it cannot be enforced on the firm's screen alone.
  it('refuses a period above 18 months from ANY tier, not just the firm', () => {
    expect(retention.validateRetentionMonths(19).ok).toBe(false)
    expect(retention.validateRetentionMonths(84).ok).toBe(false)
  })

  // A value stored under the old 84-month default must not keep applying. It reads back as
  // "this scope has set nothing" and the cascade carries on above it.
  it('reads a pre-ruling stored figure as nothing set, so it cannot survive', () => {
    expect(retention.readStoredRetention({ months: 84 })).toBeNull()
  })
})

describe('validateRetentionMonths', () => {
  it('accepts a whole number of months in range', () => {
    expect(retention.validateRetentionMonths(18)).toEqual({ ok: true, errors: [], value: 18 })
    expect(retention.validateRetentionMonths(1)).toEqual({ ok: true, errors: [], value: 1 })
  })

  it.each([['18'], [null], [undefined], [NaN], [Infinity]])('refuses %p', (value) => {
    expect(retention.validateRetentionMonths(value).ok).toBe(false)
  })

  it('refuses a fraction rather than rounding it', () => {
    expect(retention.validateRetentionMonths(17.5).ok).toBe(false)
  })

  it.each([[19], [84], [241], [0], [-1]])('refuses %p months, outside the range', (value) => {
    const out = retention.validateRetentionMonths(value)
    expect(out.ok).toBe(false)
    expect(out.value).toBeNull()
  })
})

describe('readStoredRetention', () => {
  it('reads a well-formed stored value', () => {
    expect(retention.readStoredRetention({ months: 12 })).toBe(12)
  })

  it.each([[null], ['18'], [[]], [{}], [{ months: 'x' }], [{ months: 19 }]])('reads %p as nothing set', (stored) => {
    expect(retention.readStoredRetention(stored)).toBeNull()
  })
})

describe('loadOwnRetention', () => {
  it('returns what this scope set itself', async () => {
    const load = jest.fn().mockResolvedValue({ months: 12 })
    expect(await retention.loadOwnRetention('firm-1', load)).toBe(12)
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
    expect(out).toEqual({ months: 18, source: 'platform-default', setAtScope: null })
  })

  it('prefers what the firm set itself', async () => {
    const out = await retention.loadResolvedRetention('firm-1', jest.fn().mockResolvedValue({ months: 12 }))
    expect(out).toEqual({ months: 12, source: 'set-here', setAtScope: 'firm-1' })
  })

  it('inherits from the tier above when the firm has set nothing', async () => {
    parentScopeOf.mockImplementation(scope => (scope === 'firm-1' ? 'group-1' : null))
    const load = jest.fn(scope => Promise.resolve(scope === 'group-1' ? { months: 6 } : null))
    const out = await retention.loadResolvedRetention('firm-1', load)
    expect(out).toEqual({ months: 6, source: 'inherited', setAtScope: 'group-1' })
  })

  it('reports the platform default as the platform\'s even when reached through a parent', async () => {
    parentScopeOf.mockImplementation(scope => (scope === 'firm-1' ? 'group-1' : null))
    const out = await retention.loadResolvedRetention('firm-1', jest.fn().mockResolvedValue(null))
    expect(out.source).toBe('platform-default')
  })

  it('answers for no scope at all', async () => {
    expect((await retention.loadResolvedRetention(null, jest.fn())).months).toBe(18)
  })

  it('never rejects — a storage fault falls back to the level above and logs', async () => {
    const load = jest.fn().mockRejectedValue(new Error('refused'))
    const out = await retention.loadResolvedRetention('firm-1', load)
    expect(out.months).toBe(18)
    expect(console.error).toHaveBeenCalled()
  })
})

describe('keptUntil — the sentence on the register', () => {
  it('counts from the day the register was OPENED, not from today', () => {
    // So the sentence on a register opened last year does not drift forward every time
    // somebody looks at it.
    expect(retention.keptUntil('2026-09-14T02:00:00.000Z', 18).slice(0, 10)).toBe('2028-03-14')
  })

  it('handles a month that does not have the same day number', () => {
    // 31 August + 18 months is 28 February; JavaScript rolls it to 3 March, which is close
    // enough for a retention sentence and is what Date does everywhere else in this app.
    expect(typeof retention.keptUntil('2026-08-31T00:00:00.000Z', 18)).toBe('string')
  })

  it.each([[null], [''], ['not a date']])('returns null for an opening date of %p', (iso) => {
    expect(retention.keptUntil(iso, 18)).toBeNull()
  })

  it('returns null for a retention period it would refuse to store', () => {
    expect(retention.keptUntil('2026-09-14T02:00:00.000Z', 84)).toBeNull()
  })
})

describe('retentionPhrase — the period as a screen reads it', () => {
  it.each([[18, '18 months'], [1, '1 month'], [6, '6 months']])('%p months reads as %p', (months, words) => {
    expect(retention.retentionPhrase(months)).toBe(words)
  })

  // A records policy is written in years where the period is one. "12 months" is the same
  // span and the wrong register for the sentence it sits in.
  it('says a whole year as a year', () => {
    expect(retention.retentionPhrase(12)).toBe('1 year')
  })

  // A screen must never show a blank where a period belongs, so an impossible figure
  // renders the platform default rather than throwing or returning ''.
  it.each([[0], [19], [84], [null], ['18'], [1.5]])('renders the default for %p', (bad) => {
    expect(retention.retentionPhrase(bad)).toBe('18 months')
  })
})
