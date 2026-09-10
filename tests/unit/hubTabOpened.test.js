'use strict'

/**
 * The hub-tab opened record — item 4.84, slice 1.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. THE ADDRESS CARRIES THE MANAGER. A config key is not on any screen, so a key built
 *      without the manager's id in it would look perfectly normal and would give one firm's
 *      managers a single shared reading history — one person's visit clearing another's dot.
 *      Item 4.75 is the same fault one level along, and it reached production unnoticed.
 *
 *   2. A SUBMITTED TAB KEY CANNOT ADD A PART TO THE ADDRESS. The manager's id is server-side,
 *      so the worst a rogue value could do is litter that manager's own prefix — but a `:` in
 *      it would make the key mean something other than one tab of one person, and nothing on
 *      screen would say so.
 *
 *   3. A BAD ROW COSTS ONE DOT, NEVER THE MENU. A manager whose whole menu loses its dots
 *      because one stored row is malformed has lost the feature; a manager with one tab wrongly
 *      blue has lost nothing they will notice.
 */

const {
  STALE_DAYS,
  MAX_MANAGER_ID_LENGTH,
  MAX_TAB_KEY_LENGTH,
  isValidTabKey,
  managerKeyPrefix,
  tabOpenedKey,
  readOpenedAt,
  normaliseOpened
} = require('../../server/utils/hubTabOpened')

const MANAGER = 'manager@example.com'

describe('the key an opened tab is stored at', () => {
  test('carries the manager, so two managers in one firm never share a row', () => {
    const mine = tabOpenedKey(MANAGER, 'taxRates')
    const theirs = tabOpenedKey('other@example.com', 'taxRates')

    expect(mine).toContain(MANAGER)
    expect(mine).not.toEqual(theirs)
  })

  test('carries the tab, so two tabs of one manager never share a row', () => {
    expect(tabOpenedKey(MANAGER, 'taxRates'))
      .not.toEqual(tabOpenedKey(MANAGER, 'depreciationRates'))
  })

  test('every key one manager holds shares that manager\'s prefix, and no other manager\'s', () => {
    const prefix = managerKeyPrefix(MANAGER)

    expect(tabOpenedKey(MANAGER, 'quizzes').indexOf(prefix)).toBe(0)
    expect(tabOpenedKey('other@example.com', 'quizzes').indexOf(prefix)).toBe(-1)
  })

  test('one manager\'s prefix cannot match another\'s by being a leading part of it', () => {
    // `manager@example.com` is a leading substring of `manager@example.com.au`. Without the
    // separator on the end of the prefix, the shorter manager's read would sweep up the
    // longer manager's rows — a silent cross-person read that no screen could show.
    const shorter = managerKeyPrefix('manager@example.com')
    const longerKey = tabOpenedKey('manager@example.com.au', 'quizzes')

    expect(longerKey.indexOf(shorter)).toBe(-1)
  })

  test('fits the config_key column with both parts at their longest', () => {
    const key = tabOpenedKey('x'.repeat(200), 'a'.repeat(MAX_TAB_KEY_LENGTH))

    // VARCHAR(128) in config/db-schema.sql. A key over it is truncated by MySQL, and two
    // truncated keys can collide — two different tabs quietly becoming one row.
    expect(key.length).toBeLessThanOrEqual(128)
  })

  test('truncates an over-long manager id rather than refusing the manager', () => {
    const key = tabOpenedKey('y'.repeat(MAX_MANAGER_ID_LENGTH + 40), 'quizzes')

    expect(key).not.toBeNull()
    expect(key).toContain('y'.repeat(MAX_MANAGER_ID_LENGTH))
  })

  test('refuses to build a key with nobody to key on', () => {
    expect(tabOpenedKey(null, 'quizzes')).toBeNull()
    expect(tabOpenedKey('', 'quizzes')).toBeNull()
    expect(tabOpenedKey('   ', 'quizzes')).toBeNull()
    expect(managerKeyPrefix(undefined)).toBeNull()
  })
})

describe('which tab keys are storable', () => {
  test('accepts the camelCase identifiers the menu actually uses', () => {
    ['compliance', 'taxRates', 'depreciationRates', 'templateLibraryFirm', 'aiPrompts']
      .forEach(tab => expect(isValidTabKey(tab)).toBe(true))
  })

  test('refuses a value carrying the key separator', () => {
    // The one that matters: a `:` would add a part to the address, so the row would no longer
    // mean "this manager, this tab".
    expect(isValidTabKey('taxRates:extra')).toBe(false)
    expect(isValidTabKey('other@example.com:taxRates')).toBe(false)
  })

  test('refuses LIKE wildcards, which the prefix read escapes but should never receive', () => {
    expect(isValidTabKey('%')).toBe(false)
    expect(isValidTabKey('tax_Rates')).toBe(false)
  })

  test('refuses an empty, over-long or non-string tab', () => {
    expect(isValidTabKey('')).toBe(false)
    expect(isValidTabKey('a'.repeat(MAX_TAB_KEY_LENGTH + 1))).toBe(false)
    expect(isValidTabKey(null)).toBe(false)
    expect(isValidTabKey(42)).toBe(false)
    expect(isValidTabKey({ tab: 'quizzes' })).toBe(false)
  })

  test('refuses a value that does not begin with a letter', () => {
    expect(isValidTabKey('1tab')).toBe(false)
    expect(isValidTabKey('-tab')).toBe(false)
  })

  test('a tab key it refuses never reaches a key', () => {
    expect(tabOpenedKey(MANAGER, 'taxRates:extra')).toBeNull()
  })
})

describe('reading a stored row', () => {
  test('returns the timestamp it holds', () => {
    expect(readOpenedAt({ at: '2026-09-10T09:00:00.000Z' })).toBe('2026-09-10T09:00:00.000Z')
  })

  test('reads an unusable row as never opened, which is the safe direction', () => {
    // Blue says "go and look at this". The worst a bad row can do is invite somebody to
    // re-read a tab they have already seen.
    expect(readOpenedAt(null)).toBeNull()
    expect(readOpenedAt({})).toBeNull()
    expect(readOpenedAt({ at: '' })).toBeNull()
    expect(readOpenedAt({ at: 'the day before yesterday' })).toBeNull()
    expect(readOpenedAt({ at: 1757500000000 })).toBeNull()
    expect(readOpenedAt(['2026-09-10T09:00:00.000Z'])).toBeNull()
    expect(readOpenedAt('2026-09-10T09:00:00.000Z')).toBeNull()
  })
})

describe('the whole set of rows one manager holds', () => {
  test('one malformed row costs its own dot and no other', () => {
    const opened = normaliseOpened({
      taxRates: { at: '2026-09-01T00:00:00.000Z' },
      quizzes: { at: 'not a date' },
      compliance: { at: '2026-09-09T00:00:00.000Z' }
    })

    expect(Object.keys(opened).sort()).toEqual(['compliance', 'taxRates'])
  })

  test('drops a row whose key is not a tab key we would ever have written', () => {
    const opened = normaliseOpened({
      'taxRates:extra': { at: '2026-09-01T00:00:00.000Z' },
      taxRates: { at: '2026-09-01T00:00:00.000Z' }
    })

    expect(Object.keys(opened)).toEqual(['taxRates'])
  })

  test('survives being handed nothing at all', () => {
    expect(normaliseOpened(null)).toEqual({})
    expect(normaliseOpened(undefined)).toEqual({})
    expect(normaliseOpened('rows')).toEqual({})
  })
})

describe('the orange threshold', () => {
  test('is 21 days — Mike\'s "3 weeks", and the Handbook\'s own number', () => {
    // Load-bearing: the words beside the orange dot say "3 weeks" out loud, so this number
    // and that sentence have to agree. `scripts/handbook-shell.html` uses the same 21.
    expect(STALE_DAYS).toBe(21)
  })
})
