'use strict'

// CB-03 (design/COURSE-BUILDER-PLAN.md): a grading failure must record an
// UNGRADED answer — never an invented pass at 75% — and ungraded answers must
// be excluded from every average that feeds the session record, certificate
// and firm reporting. A fully ungraded quiz yields a null score (the same
// value the skip-quiz path stores).

const {
  UNGRADED_FEEDBACK,
  ungradedResult,
  gradedResults,
  overallQuizScore,
  quizPassed,
  quizFullyUngraded
} = require('../../utils/quizScoring')

const graded = (score, passed = score >= 70) => ({ passed, score, feedback: 'f', question: 'q', answer: 'a' })

describe('quizScoring (CB-03)', () => {
  describe('ungradedResult', () => {
    test('carries no score and no pass flag — only the ungraded marker', () => {
      const r = ungradedResult('What is margin?', 'my answer')
      expect(r).toEqual({
        ungraded: true,
        passed: null,
        score: null,
        feedback: UNGRADED_FEEDBACK,
        question: 'What is margin?',
        answer: 'my answer'
      })
    })
  })

  describe('gradedResults', () => {
    test('excludes ungraded entries, junk entries, and non-numeric scores', () => {
      const results = [
        graded(80),
        ungradedResult('q2', 'a2'),
        null,
        { passed: true, score: '90' }, // wrong type — not a graded result
        graded(60)
      ]
      expect(gradedResults(results)).toEqual([graded(80), graded(60)])
    })

    test('handles undefined input', () => {
      expect(gradedResults(undefined)).toEqual([])
    })
  })

  describe('overallQuizScore', () => {
    test('averages graded answers only — an ungraded answer never moves the score', () => {
      expect(overallQuizScore([graded(80), ungradedResult('q', 'a'), graded(60)])).toBe(70)
    })

    test('rounds the average', () => {
      expect(overallQuizScore([graded(70), graded(75)])).toBe(73) // 72.5 → 73
    })

    test('null when nothing was graded (matches the skip-quiz stored value)', () => {
      expect(overallQuizScore([ungradedResult('q1', 'a1'), ungradedResult('q2', 'a2')])).toBeNull()
      expect(overallQuizScore([])).toBeNull()
    })

    test('a genuine zero score still counts as graded', () => {
      expect(overallQuizScore([graded(0, false)])).toBe(0)
    })
  })

  describe('quizPassed', () => {
    test('70 passes, 69 does not', () => {
      expect(quizPassed([graded(70)])).toBe(true)
      expect(quizPassed([graded(69, false)])).toBe(false)
    })

    test('a fully ungraded quiz is not "passed"', () => {
      expect(quizPassed([ungradedResult('q', 'a')])).toBe(false)
    })

    test('ungraded answers do not drag a passing average down', () => {
      expect(quizPassed([graded(90), ungradedResult('q', 'a'), ungradedResult('q2', 'a2')])).toBe(true)
    })
  })

  describe('quizFullyUngraded', () => {
    test('true only when the quiz has answers and none were graded', () => {
      expect(quizFullyUngraded([ungradedResult('q1', 'a1'), ungradedResult('q2', 'a2')])).toBe(true)
      expect(quizFullyUngraded([ungradedResult('q1', 'a1'), graded(50, false)])).toBe(false)
      expect(quizFullyUngraded([])).toBe(false)
      expect(quizFullyUngraded(undefined)).toBe(false)
    })
  })
})
