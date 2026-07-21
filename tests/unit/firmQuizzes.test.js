'use strict'

// CB-31 Phase 2 — the firm quiz overlay. A firm may edit the platform's own
// questions (Mike's ruling 2026-07-21); the edit is stored as an overlay and
// the base is never touched. These tests pin the two things that make that
// safe: nothing unvalidated reaches storage, and a merged bank always says
// where it came from so firm-typed text can be fenced before it reaches the AI.

const { validateQuizOverride, mergeQuizBanks, LIMITS, CONFIG_KEY } = require('../../server/utils/firmQuizzes')

const TEMPLATES = [
  { page: 'id-1', title: 'Working Capital Cycle' },
  { page: 'id-2', title: 'E.O.Y Meeting' },
  { page: 'id-3', title: 'Growth Framework' }
]

const entry = (id = 1) => ({ id, question: 'Q?', answer: 'A.', keyPoint: 'K.' })
const bank = (...ids) => ({ entries: ids.length ? ids.map(entry) : [entry(1)] })

describe('validateQuizOverride — accepts good input', () => {
  test('a well-formed overlay is accepted and canonicalised', () => {
    const result = validateQuizOverride({ 'Working Capital Cycle': bank(1, 2) }, TEMPLATES)
    expect(result.ok).toBe(true)
    expect(Object.keys(result.value)).toEqual(['Working Capital Cycle'])
    expect(result.value['Working Capital Cycle'].entries).toHaveLength(2)
  })

  test('the stored key is the real page title, not what was typed', () => {
    const result = validateQuizOverride({ 'working capital cycle quiz': bank(1) }, TEMPLATES)
    expect(result.ok).toBe(true)
    expect(Object.keys(result.value)).toEqual(['Working Capital Cycle'])
  })

  test('an optional source line is kept', () => {
    const result = validateQuizOverride(
      { 'E.O.Y Meeting': { source: 'our own notes', entries: [entry(1)] } }, TEMPLATES)
    expect(result.value['E.O.Y Meeting'].source).toBe('our own notes')
  })
})

describe('validateQuizOverride — nothing unvalidated reaches storage', () => {
  test('unknown fields are dropped, not stored', () => {
    const result = validateQuizOverride({
      'E.O.Y Meeting': {
        entries: [{ ...entry(1), isApproved: true, sneaky: 'x' }],
        somethingElse: 'x'
      }
    }, TEMPLATES)
    expect(result.ok).toBe(true)
    expect(Object.keys(result.value['E.O.Y Meeting'])).toEqual(['entries'])
    expect(Object.keys(result.value['E.O.Y Meeting'].entries[0])).toEqual(['id', 'question', 'answer', 'keyPoint'])
  })

  test('a prototype-polluting key is refused', () => {
    const raw = JSON.parse('{"__proto__": {"entries": [{"id":1,"question":"q","answer":"a","keyPoint":"k"}]}}')
    const result = validateQuizOverride(raw, TEMPLATES)
    // Either the key never enumerates (JSON.parse assigns it as a real own key
    // only in some engines) or it is refused outright — never stored.
    if (result.ok) { expect(Object.keys(result.value)).not.toContain('__proto__') } else { expect(result.error).toBeTruthy() }
    expect({}.entries).toBeUndefined()
  })

  test('a page that does not exist is refused, with the closest names offered', () => {
    const result = validateQuizOverride({ 'Wurking Capitol Cyckle': bank(1) }, TEMPLATES)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('does not match a page')
    expect(Array.isArray(result.candidates)).toBe(true)
  })

  test('non-object, empty and array payloads are refused', () => {
    expect(validateQuizOverride(null, TEMPLATES).ok).toBe(false)
    expect(validateQuizOverride([], TEMPLATES).ok).toBe(false)
    expect(validateQuizOverride('nope', TEMPLATES).ok).toBe(false)
    expect(validateQuizOverride({}, TEMPLATES).ok).toBe(false)
  })

  test('a bank with no questions is refused', () => {
    expect(validateQuizOverride({ 'E.O.Y Meeting': { entries: [] } }, TEMPLATES).ok).toBe(false)
    expect(validateQuizOverride({ 'E.O.Y Meeting': { entries: 'nope' } }, TEMPLATES).ok).toBe(false)
    expect(validateQuizOverride({ 'E.O.Y Meeting': 'nope' }, TEMPLATES).ok).toBe(false)
  })

  test('a missing or blank field is refused, naming the page', () => {
    for (const field of ['question', 'answer', 'keyPoint']) {
      const e = entry(1)
      e[field] = '   '
      const result = validateQuizOverride({ 'E.O.Y Meeting': { entries: [e] } }, TEMPLATES)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('E.O.Y Meeting')
    }
  })

  test('a non-string field is refused rather than coerced', () => {
    const e = { id: 1, question: 42, answer: 'a', keyPoint: 'k' }
    expect(validateQuizOverride({ 'E.O.Y Meeting': { entries: [e] } }, TEMPLATES).ok).toBe(false)
  })

  test('missing, non-integer and duplicate question numbers are refused', () => {
    const noId = { question: 'q', answer: 'a', keyPoint: 'k' }
    expect(validateQuizOverride({ 'E.O.Y Meeting': { entries: [noId] } }, TEMPLATES).ok).toBe(false)
    expect(validateQuizOverride({ 'E.O.Y Meeting': { entries: [{ ...noId, id: 1.5 }] } }, TEMPLATES).ok).toBe(false)
    const dup = validateQuizOverride({ 'E.O.Y Meeting': { entries: [entry(1), entry(1)] } }, TEMPLATES)
    expect(dup.ok).toBe(false)
    expect(dup.error).toContain('share the number 1')
  })

  test('oversized text and oversized banks are refused', () => {
    const long = { id: 1, question: 'x'.repeat(LIMITS.textChars + 1), answer: 'a', keyPoint: 'k' }
    expect(validateQuizOverride({ 'E.O.Y Meeting': { entries: [long] } }, TEMPLATES).ok).toBe(false)

    const many = { entries: Array.from({ length: LIMITS.entriesPerBank + 1 }, (_, i) => entry(i + 1)) }
    const result = validateQuizOverride({ 'E.O.Y Meeting': many }, TEMPLATES)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('too many questions')
  })

  test('an unreadable page library is reported, never silently accepted', () => {
    // A non-array templates argument sends the resolver to the real file; an
    // empty list stands in for a library with nothing in it.
    const result = validateQuizOverride({ 'E.O.Y Meeting': bank(1) }, [])
    expect(result.ok).toBe(false)
  })
})

describe('mergeQuizBanks', () => {
  const BASE = {
    _comment: 'docs',
    'E.O.Y Meeting': { entries: [entry(1), entry(2), entry(3)] },
    'Growth Framework': { entries: [entry(1)] }
  }

  test('platform banks come through tagged as platform', () => {
    const merged = mergeQuizBanks(BASE, null)
    expect(merged['E.O.Y Meeting'].origin).toBe('platform')
    expect(merged._comment).toBeUndefined()
  })

  test("a firm's edit replaces the platform bank WHOLESALE, never entry-by-entry", () => {
    const merged = mergeQuizBanks(BASE, { 'E.O.Y Meeting': { entries: [entry(1)] } })
    // 3 platform questions must not leak into a 1-question firm edit.
    expect(merged['E.O.Y Meeting'].entries).toHaveLength(1)
    expect(merged['E.O.Y Meeting'].origin).toBe('firm')
  })

  test('an untouched platform bank keeps its platform tag alongside an edited one', () => {
    const merged = mergeQuizBanks(BASE, { 'E.O.Y Meeting': { entries: [entry(1)] } })
    expect(merged['Growth Framework'].origin).toBe('platform')
  })

  test('a firm can add a bank the platform has never had', () => {
    const merged = mergeQuizBanks(BASE, { 'Working Capital Cycle': { entries: [entry(1)] } })
    expect(merged['Working Capital Cycle'].origin).toBe('firm')
    expect(Object.keys(merged)).toHaveLength(3)
  })

  test('the base is never mutated', () => {
    const before = JSON.stringify(BASE)
    mergeQuizBanks(BASE, { 'E.O.Y Meeting': { entries: [entry(9)] } })
    expect(JSON.stringify(BASE)).toBe(before)
  })

  test('junk inputs never throw', () => {
    expect(mergeQuizBanks(null, null)).toEqual({})
    expect(mergeQuizBanks(BASE, 'nope')['E.O.Y Meeting'].origin).toBe('platform')
  })
})

test('the config key is the one the generic history/restore routes use', () => {
  expect(CONFIG_KEY).toBe('quiz-banks')
})
