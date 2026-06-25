'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// AI TOPIC-DETECTION BACKSTOP (2026-06-25) — validator contract.
//
// Keyword matching stays the PRIMARY domain driver; the AI runs only as a safety
// net so meaning-consistent phrasing the literal keywords miss still routes (and
// the sober tone still fires). The AI's replies are parsed by two PURE functions —
// this pins their contract across the full matrix the governance rule requires:
// valid, hallucinated/unknown, malformed, missing, wrong types. The AI must never
// be able to push an off-list domain or wrongly impose a crisis tone.
// ─────────────────────────────────────────────────────────────────────────────

const { parseDomainClassification, parseDistressRead } = require('../../server/advisorEngine')

const VALID = ['profit', 'staff', 'data-systems', 'conflict', 'succession']

describe('parseDomainClassification — boxed to the 14 ids', () => {
  test('returns a valid on-list domain id', () => {
    expect(parseDomainClassification('{"domain":"profit"}', VALID)).toBe('profit')
  })

  test('tolerates surrounding prose/whitespace around the JSON', () => {
    expect(parseDomainClassification('Sure!\n{"domain":"data-systems"}\nthanks', VALID)).toBe('data-systems')
    expect(parseDomainClassification('{"domain":" conflict "}', VALID)).toBe('conflict')
  })

  test('"none" → null (falls back to keyword/confirm path)', () => {
    expect(parseDomainClassification('{"domain":"none"}', VALID)).toBeNull()
  })

  test('a hallucinated / unknown id → null (cannot inject an off-list domain)', () => {
    expect(parseDomainClassification('{"domain":"world-domination"}', VALID)).toBeNull()
    expect(parseDomainClassification('{"domain":"PROFIT"}', VALID)).toBeNull() // case-exact
  })

  test('malformed JSON → null', () => {
    expect(parseDomainClassification('{domain: profit', VALID)).toBeNull()
    expect(parseDomainClassification('not json at all', VALID)).toBeNull()
  })

  test('missing / wrong-typed field → null', () => {
    expect(parseDomainClassification('{"foo":"bar"}', VALID)).toBeNull()
    expect(parseDomainClassification('{"domain":123}', VALID)).toBeNull()
  })

  test('empty / non-string input → null', () => {
    expect(parseDomainClassification('', VALID)).toBeNull()
    expect(parseDomainClassification(null, VALID)).toBeNull()
    expect(parseDomainClassification(undefined, VALID)).toBeNull()
  })

  test('missing/empty validIds list → null (nothing is on-list)', () => {
    expect(parseDomainClassification('{"domain":"profit"}', [])).toBeNull()
    expect(parseDomainClassification('{"domain":"profit"}', undefined)).toBeNull()
  })
})

describe('parseDistressRead — defaults to false on any uncertainty', () => {
  test('explicit true → true', () => {
    expect(parseDistressRead('{"distress":true}')).toBe(true)
    expect(parseDistressRead('here you go {"distress":true}')).toBe(true)
  })

  test('explicit false → false', () => {
    expect(parseDistressRead('{"distress":false}')).toBe(false)
  })

  test('string "true" is NOT treated as true (strict boolean only)', () => {
    expect(parseDistressRead('{"distress":"true"}')).toBe(false)
    expect(parseDistressRead('{"distress":1}')).toBe(false)
  })

  test('malformed / missing / non-string → false (never wrongly impose a grim tone)', () => {
    expect(parseDistressRead('{distress true}')).toBe(false)
    expect(parseDistressRead('{"foo":"bar"}')).toBe(false)
    expect(parseDistressRead('')).toBe(false)
    expect(parseDistressRead(null)).toBe(false)
    expect(parseDistressRead(undefined)).toBe(false)
  })
})
