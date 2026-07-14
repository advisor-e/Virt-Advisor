'use strict'

// parseMeetingCount — folds in spoken/voice forms so a speech-to-text slip doesn't
// silently halve the template budget (the live café bug: "too" parsed as nothing →
// budget 1 → only one template instead of two). Bare "to" is excluded so normal
// answers ("happy to commit to three") are not mis-parsed. The backend OpenAI REST
// client is mocked only so requiring advisor.js loads under Jest.

jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: jest.fn() } }
  })
}))

const { parseMeetingCount } = require('../../server/advisorEngine')

describe('parseMeetingCount — voice-input-safe', () => {
  test.each([
    ['two meetings', 2],
    ['I would say too should be enough', 2], // the live café bug: "too" → two
    ['a couple should be enough', 2],
    ['just a few', 3],
    ['3 meetings', 3],
    ['one', 1],
    ['two to three', 3], // range → upper bound
    ['two or three', 3], // single linking word
    ['two or maybe three meetings', 3], // two linking words ("or maybe") → still the upper bound
    ['I would say two or maybe three', 3],
    ['I would say two possibly three meetings', 3], // the live café bug: "possibly" was not a connector → parsed 2
    ['two perhaps three', 3],
    ['two or ideally three', 3],
    ['two or even three', 3],
    ['two up to three', 3],
    ['two meetings possibly 3 if need be', 3], // live bug: "meetings" between the numbers → was 2
    ['two meetings, possibly 3', 3],
    ['2 or 3 meetings', 3],
    ['up to 4 sessions', 4]
  ])('parses "%s" → %i', (input, expected) => {
    expect(parseMeetingCount(input)).toBe(expected)
  })

  test('bare "to" is not a number — "happy to commit to three" → 3, not 2', () => {
    expect(parseMeetingCount('happy to commit to three meetings')).toBe(3)
  })

  test('an answer with no count word → null (no false "to"/"for" match)', () => {
    expect(parseMeetingCount('whatever works for them')).toBeNull()
    expect(parseMeetingCount('happy to do what it takes')).toBeNull()
  })

  test('null / pending / non-string → null', () => {
    expect(parseMeetingCount(null)).toBeNull()
    expect(parseMeetingCount('pending')).toBeNull()
    expect(parseMeetingCount(42)).toBeNull()
  })
})

// Bug 3 (engine-defects review 2026-07-14): a count above the six-meeting
// ceiling was DISCARDED and read as "no answer" — "12 meetings" yielded ONE
// template, fewer than saying "two". Now clamped, never dropped, and the
// stated figure is preserved for the "You mentioned {N}" message.
const { parseMeetingCountDetailed, MEETING_MAX } = require('../../server/advisorEngine')

describe('parseMeetingCount — clamp, never discard (Bug 3)', () => {
  test('a count above the ceiling is clamped, not discarded', () => {
    expect(parseMeetingCount('12 meetings')).toBe(MEETING_MAX) // was null → 1 template
    expect(parseMeetingCount('10 meetings')).toBe(MEETING_MAX)
    expect(parseMeetingCount('7 meetings')).toBe(MEETING_MAX)
    expect(parseMeetingCount('20 meetings over the year')).toBe(MEETING_MAX)
  })

  test('an in-range count still wins over a stray large figure (the guard is intact)', () => {
    expect(parseMeetingCount('3 to 4 meetings, they have 40 staff')).toBe(4)
  })

  test('spelled-out counts above six are clamped, not lost (voice input)', () => {
    expect(parseMeetingCount('twelve meetings')).toBe(MEETING_MAX) // was null
    expect(parseMeetingCount('ten meetings')).toBe(MEETING_MAX)
    expect(parseMeetingCount('seven or eight meetings')).toBe(MEETING_MAX)
  })

  test('detailed parse preserves the STATED count for the cap message', () => {
    expect(parseMeetingCountDetailed('12 meetings')).toEqual({ count: 6, stated: 12, clamped: true })
    expect(parseMeetingCountDetailed('5 or 6 meetings')).toEqual({ count: 6, stated: 6, clamped: false })
    expect(parseMeetingCountDetailed('two meetings')).toEqual({ count: 2, stated: 2, clamped: false })
    expect(parseMeetingCountDetailed('whatever works for them')).toEqual({ count: null, stated: null, clamped: false })
  })

  test('the live retest gap: a hedged range topping just above the ceiling is honoured as STATED and explained', () => {
    // "6 or 7 meetings" was silently given 6 with no message (retest 2026-07-14).
    expect(parseMeetingCountDetailed('6 or 7 meetings')).toEqual({ count: 6, stated: 7, clamped: true })
    expect(parseMeetingCountDetailed('5 or 8 meetings')).toEqual({ count: 6, stated: 8, clamped: true })
    expect(parseMeetingCountDetailed('six or seven meetings')).toEqual({ count: 6, stated: 7, clamped: true })
  })

  test('the stray-figure guard STILL stands: an implausible large number is never promoted', () => {
    // 40 > 2×MEETING_MAX → a staff count, not a meeting commitment.
    expect(parseMeetingCountDetailed('3 to 4 meetings, they have 40 staff')).toEqual({ count: 4, stated: 4, clamped: false })
  })

  test('a genuine non-answer still returns null — clamping never invents a count', () => {
    expect(parseMeetingCount('whatever works for them')).toBeNull()
    expect(parseMeetingCount('happy to do what it takes')).toBeNull()
  })
})
