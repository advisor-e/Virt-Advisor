'use strict'

/**
 * Guards `server/utils/meetingRetention.js` — Meeting Review slice 2, the retention dial.
 *
 * 🔴 WHY THIS FILE EXISTS, AND WHY UAT CANNOT DO ITS JOB. This number is **spoken aloud to a
 * client** by an advisor reading the approved consent line. A person testing in UAT sees a
 * screen showing "18 months" and has no way to tell whether that is the firm's setting being
 * rendered or the platform default being hardcoded — the two look identical right up until a
 * firm changes the dial, and then advisors are telling clients something untrue with nothing
 * on screen to show it. That is the trap the wording artefact's banner names, and only a test
 * can hold it.
 *
 * The second thing UAT cannot see is the DEV FALLBACK. A refused database statement must
 * never be answered with the platform default dressed up as a firm's own choice — a figure
 * nobody chose, spoken to a client as though they had.
 */

const retention = require('../../server/utils/meetingRetention')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-test-1'
const KEY = retention.CONFIG_KEY

/** An injected overlay reader over a plain `{ scopeId: { configKey: value } }` map. */
function readerFor (store) {
  return (scopeId, key) => {
    const scope = store[scopeId]
    if (!scope || !Object.prototype.hasOwnProperty.call(scope, key)) { return Promise.resolve(null) }
    return Promise.resolve(scope[key])
  }
}

/** A failure a LIVE MySQL answered and refused — never eligible for the dev fallback. */
function refusal () {
  return Object.assign(new Error('refused'), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}

describe('what a firm may set', () => {
  test('a whole number inside the range is accepted', () => {
    expect(retention.validateRetentionMonths(24)).toEqual({ ok: true, errors: [], value: 24 })
  })

  test('a fraction is refused rather than rounded', () => {
    // Rounding a manager's typing into a promise made aloud is worse than refusing it:
    // "17.5 months" spoken to a client is a figure nobody chose.
    const result = retention.validateRetentionMonths(17.5)
    expect(result.ok).toBe(false)
    expect(result.value).toBeNull()
  })

  test.each([
    ['zero', 0],
    ['negative', -6],
    ['past the ceiling', 121],
    ['a string', '18'],
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['an object', { months: 18 }],
    ['an array', [18]]
  ])('%s is refused', (_label, value) => {
    expect(retention.validateRetentionMonths(value).ok).toBe(false)
  })

  test('the bounds themselves are allowed', () => {
    expect(retention.validateRetentionMonths(retention.MIN_MONTHS).ok).toBe(true)
    expect(retention.validateRetentionMonths(retention.MAX_MONTHS).ok).toBe(true)
  })
})

describe('malformed storage never blocks the consent screen', () => {
  // An advisor who cannot open the consent screen cannot record a meeting they have a client
  // sitting in front of them for. So bad storage reads as "nothing set here" and the cascade
  // carries on, rather than throwing.
  test.each([
    ['a bare number', 18],
    ['a string', 'eighteen'],
    ['an array', [18]],
    ['null', null],
    ['an object with no months', { period: 18 }],
    ['an object with a bad months', { months: 'eighteen' }],
    ['an out-of-range months', { months: 9999 }]
  ])('%s reads as nothing set', (_label, stored) => {
    expect(retention.readStoredRetention(stored)).toBeNull()
  })

  test('a well-formed value is read back', () => {
    expect(retention.readStoredRetention({ months: 36 })).toBe(36)
  })
})

describe('the cascade', () => {
  test('a scope that has set nothing gets the platform default', async () => {
    const result = await retention.loadResolvedRetention(FIRM, readerFor({}))
    expect(result.months).toBe(retention.PLATFORM_DEFAULT_MONTHS)
    expect(result.source).toBe(retention.RETENTION_SOURCES.platform)
    expect(result.setAtScope).toBeNull()
  })

  test("a firm's own figure wins, and is marked as its own", async () => {
    const result = await retention.loadResolvedRetention(FIRM, readerFor({
      [FIRM]: { [KEY]: { months: 36 } }
    }))
    expect(result.months).toBe(36)
    expect(result.source).toBe(retention.RETENTION_SOURCES.own)
    expect(result.setAtScope).toBe(FIRM)
  })

  test("the mentor's figure reaches a firm that has set none, marked as inherited", async () => {
    // 🔴 THE ONE THAT MATTERS. A firm inheriting the mentor's 30 months must SAY 30, because
    // that is the number its advisors read aloud. A cascade that quietly fell back to the
    // platform default here would have every inheriting firm promising 18.
    const result = await retention.loadResolvedRetention(FIRM, readerFor({
      [PLATFORM_SCOPE]: { [KEY]: { months: 30 } }
    }))
    expect(result.months).toBe(30)
    expect(result.source).toBe(retention.RETENTION_SOURCES.inherited)
    expect(result.setAtScope).toBe(PLATFORM_SCOPE)
  })

  test("a firm's own figure is not overwritten by the mentor's", async () => {
    const result = await retention.loadResolvedRetention(FIRM, readerFor({
      [PLATFORM_SCOPE]: { [KEY]: { months: 30 } },
      [FIRM]: { [KEY]: { months: 6 } }
    }))
    expect(result.months).toBe(6)
    expect(result.setAtScope).toBe(FIRM)
  })

  test('malformed storage at the firm falls through to the level above', async () => {
    const result = await retention.loadResolvedRetention(FIRM, readerFor({
      [PLATFORM_SCOPE]: { [KEY]: { months: 30 } },
      [FIRM]: { [KEY]: { months: 'whenever' } }
    }))
    expect(result.months).toBe(30)
  })

  test('no scope at all is the platform default', async () => {
    const result = await retention.loadResolvedRetention(null, readerFor({}))
    expect(result.months).toBe(retention.PLATFORM_DEFAULT_MONTHS)
  })
})

describe('a refused database is never answered with a default', () => {
  test('loadOwnRetention rethrows a live refusal instead of falling back', async () => {
    // 🔴 The dev-JSON fallback is for a machine with no MySQL. A live server that REFUSED the
    // statement must surface, or an outage is presented to a manager as "this firm has not
    // set a retention period" — and the platform default then gets spoken to a client as
    // though the firm had chosen it.
    const reader = () => Promise.reject(refusal())
    await expect(retention.loadOwnRetention(FIRM, reader)).rejects.toThrow('refused')
  })

  test('loadResolvedRetention survives it by using the level above, and logs', async () => {
    // The consent screen must still open — but it opens on the INHERITED figure, which is a
    // number somebody actually chose, not on a guess.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const reader = (scopeId, key) => {
      if (scopeId === FIRM) { return Promise.reject(refusal()) }
      return Promise.resolve(scopeId === PLATFORM_SCOPE && key === KEY ? { months: 30 } : null)
    }
    const result = await retention.loadResolvedRetention(FIRM, reader)
    expect(result.months).toBe(30)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('the figure as it is said out loud', () => {
  test('plural months', () => {
    expect(retention.retentionPhrase(18)).toBe('18 months')
  })

  test('one month is singular', () => {
    // "kept for 1 months" in front of a client is the kind of carelessness that makes the
    // rest of the sentence sound untrue too.
    expect(retention.retentionPhrase(1)).toBe('1 month')
  })

  test.each([[0], [-3], [null], ['18'], [NaN], [1.5]])(
    'an unusable value (%p) falls back to the platform default rather than printing itself',
    (value) => {
      expect(retention.retentionPhrase(value)).toBe(retention.PLATFORM_DEFAULT_MONTHS + ' months')
    }
  )
})

describe('the platform default', () => {
  test("is Mike's ruling of 2026-09-01", () => {
    // 🔴 A DELIBERATE PIN, and `CLAUDE.md` says to say why. This is not a tuning constant: it
    // is a ruling, and it is the number a client hears when a firm has changed nothing. A
    // silent edit here changes what is promised in every meeting at every firm that has not
    // set its own.
    expect(retention.PLATFORM_DEFAULT_MONTHS).toBe(18)
  })
})
