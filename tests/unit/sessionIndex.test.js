'use strict'

/**
 * sessionIndex — the guard that decides whether a course session index can be stored.
 *
 * WHY THIS FILE EXISTS. The value it checks reaches a permanent record: an advisor's CPD
 * history, which a firm manager reads and which the advisor may rely on. Before this guard,
 * the route accepted anything that was not `undefined` and coerced it with `Number()`, and
 * that fails in two OPPOSITE directions:
 *
 *   - `Number(null)` / `Number([])` / `Number('')` are all **0**, a legitimate index, so a
 *     missing value FABRICATED a session-one record.
 *   - `Number('abc')` is `NaN`, which the `TINYINT UNSIGNED NOT NULL` column refuses — and
 *     because the write path catches its own errors, the session was LOST in silence.
 *
 * Because the two failures are opposite, no coercion can be correct: the only safe answer
 * is to refuse. These cases are written against the exact values that produced each one.
 *
 * Same family as quizRecord.safeInt (a missing quiz score stored as a real zero, fixed
 * 2026-07-29) — one column across.
 */

const { isStorableSessionIndex, MAX_SESSION_INDEX } = require('../../server/utils/sessionIndex')

describe('values that must be REFUSED', () => {
  describe('the ones Number() turns into a real, legitimate index', () => {
    // These are the dangerous half: they do not look like failures downstream, because
    // 0 and 1 are indexes a genuine session would have.
    test.each([
      ['null', null],
      ['an empty string', ''],
      ['a whitespace string', '   '],
      ['an empty array', []],
      ['false', false]
    ])('%s (Number() gives 0)', (_label, value) => {
      expect(Number(value)).toBe(0) // the trap, stated out loud
      expect(isStorableSessionIndex(value)).toBe(false)
    })

    test('true (Number() gives 1 — session two)', () => {
      expect(Number(true)).toBe(1)
      expect(isStorableSessionIndex(true)).toBe(false)
    })
  })

  describe('the ones Number() turns into NaN, which MySQL discards', () => {
    test.each([
      ['undefined', undefined],
      ['a word', 'abc'],
      ['an object', {}],
      ['a populated array', [1, 2]],
      ['a mixed string', '3 sessions'],
      ['NaN itself', NaN],
      ['Infinity', Infinity]
    ])('%s', (_label, value) => {
      expect(isStorableSessionIndex(value)).toBe(false)
    })
  })

  describe('numbers the column itself cannot hold', () => {
    test.each([
      ['a negative index', -1],
      ['a fraction', 1.5],
      ['a numeric string fraction', '1.5'],
      ['one past the TINYINT UNSIGNED ceiling', MAX_SESSION_INDEX + 1],
      ['far past it', 100000]
    ])('%s', (_label, value) => {
      expect(isStorableSessionIndex(value)).toBe(false)
    })
  })
})

describe('values that must be ACCEPTED', () => {
  test.each([
    ['zero — a real first session, never to be confused with "missing"', 0],
    ['a mid-course index', 4],
    ['the column ceiling', MAX_SESSION_INDEX],
    ['a numeric string, as the wire may deliver it', '2'],
    ['a numeric string of zero', '0'],
    ['a padded numeric string', ' 3 ']
  ])('%s', (_label, value) => {
    expect(isStorableSessionIndex(value)).toBe(true)
  })
})

describe('the ceiling matches the column it exists for', () => {
  // If db-schema.sql ever widens session_index, this is the line that should be read
  // first — the guard is only as honest as the number it is pinned to.
  test('MAX_SESSION_INDEX is the TINYINT UNSIGNED maximum', () => {
    expect(MAX_SESSION_INDEX).toBe(255)
  })
})
