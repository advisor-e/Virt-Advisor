'use strict'

// CB-12 (design/COURSE-BUILDER-PLAN.md): hand-written quiz overrides must
// actually fire. Matching: session title first (legacy documented behaviour),
// then each session resource — resources are exact template-library titles
// (guaranteed by CB-02 grounding), the stable key. Case/whitespace-insensitive;
// "_"-prefixed keys are documentation and never match.

const { findQuizOverride, findQuizBank } = require('../../server/utils/quizOverrides')

const QUESTIONS = [{ id: 1, question: 'Q?', objective: 'O' }]

describe('findQuizOverride (CB-12)', () => {
  test('fires by resource name regardless of the AI-written session title', () => {
    const overrides = { 'Quick & Worst': QUESTIONS }
    const session = { title: 'Whatever The AI Called It', resources: ['Quick & Worst'] }
    expect(findQuizOverride(overrides, session)).toBe(QUESTIONS)
  })

  test('an exact session-title key still works and wins over a resource key', () => {
    const titleQuestions = [{ id: 1, question: 'By title', objective: 'O' }]
    const overrides = { 'My Session': titleQuestions, 'Quick & Worst': QUESTIONS }
    const session = { title: 'My Session', resources: ['Quick & Worst'] }
    expect(findQuizOverride(overrides, session)).toBe(titleQuestions)
  })

  test('matching is case- and whitespace-insensitive', () => {
    const overrides = { 'Quick & Worst': QUESTIONS }
    const session = { title: 'S', resources: ['  quick &   WORST '] }
    expect(findQuizOverride(overrides, session)).toBe(QUESTIONS)
  })

  test('underscore-prefixed documentation keys never match', () => {
    const overrides = { _example: { 'Some Title': QUESTIONS }, _comment: 'doc' }
    expect(findQuizOverride(overrides, { title: '_example', resources: ['_comment'] })).toBeNull()
  })

  test('no match falls through to AI generation (null)', () => {
    const overrides = { 'Quick & Worst': QUESTIONS }
    expect(findQuizOverride(overrides, { title: 'Other', resources: ['Cafe'] })).toBeNull()
  })

  test('junk inputs return null instead of crashing', () => {
    expect(findQuizOverride(null, { title: 'S' })).toBeNull()
    expect(findQuizOverride('nope', { title: 'S' })).toBeNull()
    expect(findQuizOverride({ 'Quick & Worst': QUESTIONS }, null)).toBeNull()
    expect(findQuizOverride({ Bad: 'not an array', Empty: [] }, { title: 'Bad', resources: ['Empty'] })).toBeNull()
    expect(findQuizOverride({ 'Quick & Worst': QUESTIONS }, { title: null, resources: 'not an array' })).toBeNull()
  })
})

// CB-30: firm-authored question banks are keyed by exact template-library
// title and matched by the same rules as overrides. A bank is source
// material, not a verbatim replacement — the lookup returns the whole bank
// object so the caller can feed entries to quiz-generate and model answers
// to the grader.

const BANK = {
  source: 'Course Builder Quiz/Working Capital Cycle quiz.pdf',
  entries: [{ id: 1, question: 'Q?', answer: 'A.', keyPoint: 'K.' }]
}

describe('findQuizBank (CB-30)', () => {
  test('fires by resource name regardless of the AI-written session title', () => {
    const banks = { 'Working Capital Cycle': BANK }
    const session = { title: 'Whatever The AI Called It', resources: ['Working Capital Cycle'] }
    expect(findQuizBank(banks, session)).toBe(BANK)
  })

  test('matching is case- and whitespace-insensitive', () => {
    const banks = { 'Working Capital Cycle': BANK }
    const session = { title: 'S', resources: ['  working   CAPITAL cycle '] }
    expect(findQuizBank(banks, session)).toBe(BANK)
  })

  test('underscore-prefixed documentation keys never match', () => {
    const banks = { _comment: 'doc', _example: BANK }
    expect(findQuizBank(banks, { title: '_example', resources: ['_comment'] })).toBeNull()
  })

  test('no match falls through to plain AI generation (null)', () => {
    const banks = { 'Working Capital Cycle': BANK }
    expect(findQuizBank(banks, { title: 'Other', resources: ['Cafe'] })).toBeNull()
  })

  test('malformed bank values never match', () => {
    const banks = {
      'An Array': [{ id: 1 }],
      'No Entries': { source: 'x.pdf' },
      'Empty Entries': { source: 'x.pdf', entries: [] },
      'A String': 'nope'
    }
    const session = { title: 'An Array', resources: ['No Entries', 'Empty Entries', 'A String'] }
    expect(findQuizBank(banks, session)).toBeNull()
  })

  test('junk inputs return null instead of crashing', () => {
    expect(findQuizBank(null, { title: 'S' })).toBeNull()
    expect(findQuizBank('nope', { title: 'S' })).toBeNull()
    expect(findQuizBank({ 'Working Capital Cycle': BANK }, null)).toBeNull()
    expect(findQuizBank({ 'Working Capital Cycle': BANK }, { title: null, resources: 'not an array' })).toBeNull()
  })
})

// CB-34 pt 2 — a bank authored by a firm manager is saved at runtime, with no
// locking test to hold its key to the exact template title. A near-miss key
// used to match nothing and hand the session back to AI-invented questions in
// silence. These tests pin the two halves of the fix: the near miss now binds,
// and a key that binds to nothing is reported by name.

const TEMPLATES = [
  { page: 'id-1', title: 'Working Capital Cycle' },
  { page: 'id-2', title: 'E.O.Y Meeting' },
  { page: 'id-3', title: '8 Profit Levers' }
]

describe('findQuizBank near-miss binding (CB-34 pt 2)', () => {
  test('a bank key with one extra word still binds to its template', () => {
    const banks = { 'Working Capital Cycle Quiz': BANK }
    const session = { title: 'S', resources: ['Working Capital Cycle'] }
    expect(findQuizBank(banks, session, TEMPLATES)).toBe(BANK)
  })

  test('punctuation and case differences in the key still bind', () => {
    const banks = { 'e.o.y. meeting': BANK }
    const session = { title: 'S', resources: ['E.O.Y Meeting'] }
    expect(findQuizBank(banks, session, TEMPLATES)).toBe(BANK)
  })

  test('a genuinely different key does NOT bind — never guesses', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const banks = { 'Debtor Drag': BANK }
      const session = { title: 'S', resources: ['Working Capital Cycle'] }
      expect(findQuizBank(banks, session, TEMPLATES)).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })

  test('the AI-written session title alone can never trigger a tolerant bind', () => {
    const banks = { 'Working Capital Cycle': BANK }
    const session = { title: 'Mastering The Working Capital Cycle', resources: [] }
    expect(findQuizBank(banks, session, TEMPLATES)).toBeNull()
  })

  test('exact matching still wins first and is unchanged', () => {
    const OTHER = { source: 'x.pdf', entries: [{ id: 1, question: 'Q', answer: 'A', keyPoint: 'K' }] }
    const banks = { 'E.O.Y Meeting': BANK, 'E.O.Y Meeting Quiz': OTHER }
    const session = { title: 'S', resources: ['E.O.Y Meeting'] }
    expect(findQuizBank(banks, session, TEMPLATES)).toBe(BANK)
  })

  test('an orphan bank is reported by name instead of vanishing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const banks = { 'Wurking Capitol Cyckle': BANK }
      const session = { title: 'S', resources: ['Working Capital Cycle'] }
      expect(findQuizBank(banks, session, TEMPLATES)).toBeNull()
      const logged = spy.mock.calls.map(c => String(c[0])).join('\n')
      expect(logged).toContain('ORPHAN BANK')
      expect(logged).toContain('Wurking Capitol Cyckle')
    } finally {
      spy.mockRestore()
    }
  })

  test('an orphan is reported once per key, not on every quiz request', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const banks = { 'Zzz Not A Template At All': BANK }
      const session = { title: 'S', resources: ['Working Capital Cycle'] }
      findQuizBank(banks, session, TEMPLATES)
      const afterFirst = spy.mock.calls.length
      findQuizBank(banks, session, TEMPLATES)
      expect(spy.mock.calls.length).toBe(afterFirst)
      expect(afterFirst).toBeGreaterThan(0)
    } finally {
      spy.mockRestore()
    }
  })

  test('an empty template library degrades to exact matching, never crashes', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const banks = { 'Working Capital Cycle': BANK }
      expect(findQuizBank(banks, { title: 'S', resources: ['Working Capital Cycle'] }, [])).toBe(BANK)
      expect(findQuizBank(banks, { title: 'S', resources: ['Something Else'] }, [])).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })
})
