'use strict'

/**
 * quizRecord — the per-question detail a course session reports.
 *
 * This function processes UNTRUSTED input (it comes from the browser), so it is
 * tested to the standard CLAUDE.md sets for that class of function: valid input,
 * malformed input, missing fields and wrong types.
 *
 * The claim that matters most is a negative one — the advisor's written answer,
 * the question text and the marker's feedback must never survive normalisation,
 * whatever the client sends. That is an owner ruling, not a technical detail:
 * advisors write differently once they believe a manager reads their words.
 */

const { normaliseQuizQuestions, MAX_QUESTIONS } = require('../../server/utils/quizRecord')

const good = over => Object.assign({
  bankKey: 'Ratio Analysis', bankRef: 5, score: 80, passed: true, ungraded: false
}, over)

describe('what a well-formed question records', () => {
  test('keeps the bank, the entry number, the score and the verdict', () => {
    expect(normaliseQuizQuestions([good()])).toEqual([{
      bankKey: 'Ratio Analysis', bankRef: 5, score: 80, passed: true, ungraded: false
    }])
  })

  test('a question with no bank still records its result', () => {
    // AI-written from the session content — no bank to name, but the score is real.
    const out = normaliseQuizQuestions([good({ bankKey: null, bankRef: null })])
    expect(out[0]).toMatchObject({ bankKey: null, bankRef: null, score: 80, passed: true })
  })

  test('an ungraded question carries no score rather than a zero', () => {
    const out = normaliseQuizQuestions([good({ ungraded: true, score: 0, passed: false })])
    expect(out[0]).toMatchObject({ ungraded: true, score: null, passed: false })
  })

  test('a genuine zero score is kept, not mistaken for ungraded', () => {
    // The distinction the `ungraded` flag exists for: 0 is a real mark.
    const out = normaliseQuizQuestions([good({ score: 0, passed: false })])
    expect(out[0]).toMatchObject({ score: 0, ungraded: false, passed: false })
  })
})

describe('the advisor\'s own words never reach storage', () => {
  test('drops the answer, the question text and the feedback, whatever is sent', () => {
    const out = normaliseQuizQuestions([good({
      answer: 'I would begin by checking the debtor days trend...',
      question: 'How would you diagnose a cashflow squeeze?',
      feedback: 'Good, but you missed stock turn.',
      modelAnswer: 'Debtor days, stock turn, creditor days.'
    })])

    expect(Object.keys(out[0]).sort()).toEqual(['bankKey', 'bankRef', 'passed', 'score', 'ungraded'])
    const asText = JSON.stringify(out)
    expect(asText).not.toMatch(/debtor days trend/i)
    expect(asText).not.toMatch(/cashflow squeeze/i)
    expect(asText).not.toMatch(/stock turn/i)
  })
})

describe('malformed input cannot corrupt a row', () => {
  test('a non-array is an empty record, not a crash', () => {
    for (const input of [null, undefined, {}, 'three questions', 42, true]) {
      expect(normaliseQuizQuestions(input)).toEqual([])
    }
  })

  test('non-object entries are skipped rather than stored', () => {
    const out = normaliseQuizQuestions([null, 'x', 7, [], good()])
    expect(out).toHaveLength(1)
    expect(out[0].bankKey).toBe('Ratio Analysis')
  })

  test('wrong types become null rather than being written through', () => {
    const out = normaliseQuizQuestions([{ bankKey: { evil: true }, bankRef: 'five', score: 'lots' }])
    expect(out[0]).toEqual({ bankKey: null, bankRef: null, score: null, passed: false, ungraded: false })
  })

  test('a missing pass flag is not a pass', () => {
    // Fail-safe: absent must never read as success on a manager's screen.
    expect(normaliseQuizQuestions([{ bankKey: 'X' }])[0].passed).toBe(false)
    expect(normaliseQuizQuestions([{ bankKey: 'X', passed: 'yes' }])[0].passed).toBe(false)
    expect(normaliseQuizQuestions([{ bankKey: 'X', passed: 1 }])[0].passed).toBe(false)
  })

  test('out-of-range numbers are refused, not clamped into something plausible', () => {
    // A score of 900 is not a 100 — it is evidence the payload is wrong, so it is
    // recorded as "no score" rather than silently becoming a believable figure.
    expect(normaliseQuizQuestions([good({ score: 900 })])[0].score).toBeNull()
    expect(normaliseQuizQuestions([good({ score: -5 })])[0].score).toBeNull()
    expect(normaliseQuizQuestions([good({ bankRef: 0 })])[0].bankRef).toBeNull()
    expect(normaliseQuizQuestions([good({ bankRef: 100000 })])[0].bankRef).toBeNull()
  })

  test('NaN and Infinity do not become numbers', () => {
    expect(normaliseQuizQuestions([good({ score: NaN })])[0].score).toBeNull()
    expect(normaliseQuizQuestions([good({ score: Infinity })])[0].score).toBeNull()
  })

  test('a MISSING score is no score — never a zero the advisor did not earn', () => {
    // Found by mutation testing 2026-07-29, and it was a live defect: Number(null),
    // Number(''), Number([]) and Number(false) are all 0, and 0 is a real score. So a
    // question that came back with no mark at all was recorded as zero out of 100 —
    // a failure the advisor never had, now visible to their manager against a named
    // topic. Each of these four is the whole reason this test exists.
    expect(normaliseQuizQuestions([good({ score: null })])[0].score).toBeNull()
    expect(normaliseQuizQuestions([good({ score: '' })])[0].score).toBeNull()
    expect(normaliseQuizQuestions([good({ score: '   ' })])[0].score).toBeNull()
    expect(normaliseQuizQuestions([good({ score: [] })])[0].score).toBeNull()
    expect(normaliseQuizQuestions([good({ score: false })])[0].score).toBeNull()
    // The other side of the same claim: a genuine zero still survives untouched.
    expect(normaliseQuizQuestions([good({ score: 0 })])[0].score).toBe(0)
    // And a score that arrives as a numeric string is still a score.
    expect(normaliseQuizQuestions([good({ score: '73' })])[0].score).toBe(73)
  })

  test('a fractional score is rounded, not stored as a decimal', () => {
    expect(normaliseQuizQuestions([good({ score: 72.6 })])[0].score).toBe(73)
  })

  test('an empty or whitespace bank key becomes null, not an empty string', () => {
    expect(normaliseQuizQuestions([good({ bankKey: '   ' })])[0].bankKey).toBeNull()
  })
})

describe('a crafted payload cannot bloat the row', () => {
  test('the number of questions is capped', () => {
    const many = Array.from({ length: 500 }, () => good())
    expect(normaliseQuizQuestions(many)).toHaveLength(MAX_QUESTIONS)
  })

  test('an enormous bank key is truncated', () => {
    const out = normaliseQuizQuestions([good({ bankKey: 'x'.repeat(10000) })])
    expect(out[0].bankKey.length).toBeLessThanOrEqual(160)
  })
})
