'use strict'

// Governance framework §11.2: AI response validation functions must have 100% branch coverage.
// Every branch tested: valid response, malformed, missing fields, wrong types, null/undefined.

const { validateQuizGenerate, validateQuizGrade, validateCourseOutline } = require('../../server/utils/validateAIResponse')

describe('validateQuizGenerate', () => {
  const validItem = { id: 1, question: 'Explain the cash conversion cycle.', objective: 'Working capital' }

  describe('malformed top-level types', () => {
    test('rejects null', () => {
      expect(validateQuizGenerate(null).valid).toBe(false)
    })
    test('rejects a number', () => {
      expect(validateQuizGenerate(42).valid).toBe(false)
    })
    test('rejects an array', () => {
      const result = validateQuizGenerate([validItem])
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })
  })

  describe('questions key variations', () => {
    test('accepts the canonical questions key', () => {
      const result = validateQuizGenerate({ questions: [validItem] })
      expect(result.valid).toBe(true)
      expect(result.data.questions).toHaveLength(1)
    })
    test('accepts the quiz_questions fallback key', () => {
      expect(validateQuizGenerate({ quiz_questions: [validItem] }).valid).toBe(true)
    })
    test('accepts the quiz fallback key', () => {
      expect(validateQuizGenerate({ quiz: [validItem] }).valid).toBe(true)
    })
    test('accepts the items fallback key', () => {
      expect(validateQuizGenerate({ items: [validItem] }).valid).toBe(true)
    })
  })

  describe('missing or empty questions', () => {
    test('rejects when no recognised key is present', () => {
      const result = validateQuizGenerate({ other: [validItem] })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('questions'))).toBe(true)
    })
    test('rejects an empty questions array', () => {
      expect(validateQuizGenerate({ questions: [] }).valid).toBe(false)
    })
    test('rejects when questions is not an array', () => {
      expect(validateQuizGenerate({ questions: 'not an array' }).valid).toBe(false)
    })
  })

  describe('malformed question items', () => {
    test('rejects a null item', () => {
      expect(validateQuizGenerate({ questions: [null] }).valid).toBe(false)
    })
    test('rejects a non-object item (number)', () => {
      expect(validateQuizGenerate({ questions: [5] }).valid).toBe(false)
    })
    test('rejects an array item', () => {
      expect(validateQuizGenerate({ questions: [['q']] }).valid).toBe(false)
    })
    test('rejects an item missing the question field', () => {
      expect(validateQuizGenerate({ questions: [{ id: 1 }] }).valid).toBe(false)
    })
    test('rejects an item whose question is not a string', () => {
      expect(validateQuizGenerate({ questions: [{ question: 99 }] }).valid).toBe(false)
    })
    test('rejects an item whose question is only whitespace', () => {
      expect(validateQuizGenerate({ questions: [{ question: '   ' }] }).valid).toBe(false)
    })
  })

  describe('valid responses', () => {
    test('accepts a well-formed multi-question batch', () => {
      const result = validateQuizGenerate({ questions: [validItem, { question: 'Second question?' }] })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data.questions).toHaveLength(2)
    })
  })
})

describe('validateQuizGrade', () => {
  const validGrade = { passed: true, score: 80, feedback: 'Clear grasp of the concept.' }

  describe('malformed top-level types', () => {
    test('rejects null', () => {
      expect(validateQuizGrade(null).valid).toBe(false)
    })
    test('rejects a number', () => {
      expect(validateQuizGrade(42).valid).toBe(false)
    })
    test('rejects an array', () => {
      const result = validateQuizGrade([validGrade])
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })
  })

  describe('passed field', () => {
    test('rejects a non-boolean passed (string "true")', () => {
      const result = validateQuizGrade({ passed: 'true', score: 80, feedback: 'ok' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('passed'))).toBe(true)
    })
  })

  describe('score field', () => {
    test('rejects a non-numeric score', () => {
      expect(validateQuizGrade({ passed: true, score: '80', feedback: 'ok' }).valid).toBe(false)
    })
    test('rejects NaN score', () => {
      expect(validateQuizGrade({ passed: true, score: NaN, feedback: 'ok' }).valid).toBe(false)
    })
    test('rejects a negative score', () => {
      expect(validateQuizGrade({ passed: true, score: -1, feedback: 'ok' }).valid).toBe(false)
    })
    test('rejects a score above 100', () => {
      expect(validateQuizGrade({ passed: true, score: 101, feedback: 'ok' }).valid).toBe(false)
    })
    test('accepts the boundary scores 0 and 100', () => {
      expect(validateQuizGrade({ passed: false, score: 0, feedback: 'Revisit the basics.' }).valid).toBe(true)
      expect(validateQuizGrade({ passed: true, score: 100, feedback: 'Excellent.' }).valid).toBe(true)
    })
  })

  describe('feedback field', () => {
    test('rejects non-string feedback', () => {
      expect(validateQuizGrade({ passed: true, score: 80, feedback: 42 }).valid).toBe(false)
    })
    test('rejects whitespace-only feedback', () => {
      expect(validateQuizGrade({ passed: true, score: 80, feedback: '   ' }).valid).toBe(false)
    })
  })

  describe('multiple simultaneous failures', () => {
    test('accumulates an error per invalid field', () => {
      const result = validateQuizGrade({ passed: 'no', score: 999, feedback: '' })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(3)
    })
  })

  describe('valid responses', () => {
    test('accepts a well-formed grade and returns only the validated fields', () => {
      const result = validateQuizGrade({ ...validGrade, extra: 'ignored-by-caller' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toEqual(validGrade)
    })
  })
})

describe('validateCourseOutline', () => {
  const validSession = { id: 1, title: 'Session one', focus: 'x', resources: ['T'], objectives: ['o'], estimatedMinutes: 30 }
  const validOutline = { title: 'Coffee & A Curve', topic: 'Growth basics', intensity: 'consistent', totalSessions: 1, sessions: [validSession] }

  describe('malformed top-level types', () => {
    test('rejects null', () => {
      const result = validateCourseOutline(null)
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })
    test('rejects a number', () => {
      expect(validateCourseOutline(42).valid).toBe(false)
    })
    test('rejects an array', () => {
      const result = validateCourseOutline([validSession])
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })
  })

  describe('title field', () => {
    test('rejects a missing title', () => {
      const result = validateCourseOutline({ sessions: [validSession] })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('title'))).toBe(true)
    })
    test('rejects a non-string title', () => {
      expect(validateCourseOutline({ title: 99, sessions: [validSession] }).valid).toBe(false)
    })
    test('rejects a whitespace-only title', () => {
      expect(validateCourseOutline({ title: '   ', sessions: [validSession] }).valid).toBe(false)
    })
  })

  describe('sessions field', () => {
    test('rejects a missing sessions array', () => {
      const result = validateCourseOutline({ title: 'A course' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('sessions'))).toBe(true)
    })
    test('rejects an empty sessions array', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [] }).valid).toBe(false)
    })
    test('rejects sessions that is not an array', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: 'two' }).valid).toBe(false)
    })
  })

  describe('malformed session items', () => {
    test('rejects a null session', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [null] }).valid).toBe(false)
    })
    test('rejects a non-object session (number)', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [5] }).valid).toBe(false)
    })
    test('rejects an array session', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [['s']] }).valid).toBe(false)
    })
    test('rejects a session missing its title', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [{ id: 1 }] }).valid).toBe(false)
    })
    test('rejects a session whose title is not a string', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [{ title: 7 }] }).valid).toBe(false)
    })
    test('rejects a session whose title is only whitespace', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [{ title: '  ' }] }).valid).toBe(false)
    })
    test('rejects a session missing its focus (CB-08 — the advisor reads it to judge the course)', () => {
      const result = validateCourseOutline({ title: 'A course', sessions: [{ title: 'S1' }] })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('focus'))).toBe(true)
    })
    test('rejects a session whose focus is not a string', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [{ title: 'S1', focus: 9 }] }).valid).toBe(false)
    })
    test('rejects a session whose focus is only whitespace', () => {
      expect(validateCourseOutline({ title: 'A course', sessions: [{ title: 'S1', focus: '  ' }] }).valid).toBe(false)
    })
  })

  describe('normalisation of derivable fields (CB-08)', () => {
    const bareSession = title => ({ title, focus: 'Focus for ' + title })

    test('rewrites session ids to true positions regardless of the AI numbering', () => {
      const result = validateCourseOutline({
        title: 'A course',
        sessions: [{ ...bareSession('A'), id: 3 }, { ...bareSession('B'), id: 1 }]
      })
      expect(result.data.sessions.map(s => s.id)).toEqual([1, 2])
    })

    test('sets totalSessions to the real count, never the AI claim', () => {
      const result = validateCourseOutline({
        title: 'A course',
        totalSessions: 5,
        sessions: [bareSession('A'), bareSession('B')]
      })
      expect(result.data.totalSessions).toBe(2)
    })

    test('snaps intensity to its two legal values', () => {
      const outlineWithIntensity = intensity => ({ title: 'A course', intensity, sessions: [bareSession('A')] })
      expect(validateCourseOutline(outlineWithIntensity('progressive')).data.intensity).toBe('progressive')
      expect(validateCourseOutline(outlineWithIntensity('Progressive')).data.intensity).toBe('progressive')
      expect(validateCourseOutline(outlineWithIntensity('ramping up')).data.intensity).toBe('consistent')
      expect(validateCourseOutline(outlineWithIntensity(undefined)).data.intensity).toBe('consistent')
    })

    test('normalises resources and objectives to clean string arrays', () => {
      const result = validateCourseOutline({
        title: 'A course',
        sessions: [
          { ...bareSession('A'), resources: 'not an array', objectives: ['keep', 7, null] },
          bareSession('B')
        ]
      })
      expect(result.data.sessions[0].resources).toEqual([])
      expect(result.data.sessions[0].objectives).toEqual(['keep'])
      expect(result.data.sessions[1].resources).toEqual([])
      expect(result.data.sessions[1].objectives).toEqual([])
    })

    test('defaults estimatedMinutes to 30 on junk, keeps a genuine number', () => {
      const withMinutes = m => validateCourseOutline({
        title: 'A course',
        sessions: [{ ...bareSession('A'), estimatedMinutes: m }]
      }).data.sessions[0].estimatedMinutes
      expect(withMinutes(45)).toBe(45)
      expect(withMinutes('45')).toBe(30)
      expect(withMinutes(0)).toBe(30)
      expect(withMinutes(-10)).toBe(30)
      expect(withMinutes(NaN)).toBe(30)
      expect(withMinutes(undefined)).toBe(30)
    })

    test('normalises a non-string topic to an empty string', () => {
      const result = validateCourseOutline({ title: 'A course', topic: 42, sessions: [bareSession('A')] })
      expect(result.data.topic).toBe('')
    })
  })

  describe('multiple simultaneous failures', () => {
    test('accumulates an error for both title and sessions', () => {
      const result = validateCourseOutline({ title: 42, sessions: 'nope' })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(2)
    })
  })

  describe('valid responses', () => {
    test('accepts a well-formed outline and returns it as data', () => {
      const result = validateCourseOutline(validOutline)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toEqual(validOutline)
    })
    test('accepts a multi-session outline', () => {
      // CB-08 spec change: focus is now required on every session.
      const result = validateCourseOutline({ title: 'A course', sessions: [validSession, { title: 'Session two', focus: 'Applying it' }] })
      expect(result.valid).toBe(true)
      expect(result.data.sessions).toHaveLength(2)
    })
  })
})
