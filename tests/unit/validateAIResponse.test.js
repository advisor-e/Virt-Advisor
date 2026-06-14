'use strict'

// Governance framework §11.2: AI response validation functions must have 100% branch coverage.
// Every branch tested: valid response, malformed, missing fields, wrong types, null/undefined.

const { validateAIResponse, parseSSELine, validateQuizGenerate, validateQuizGrade } = require('../../server/utils/validateAIResponse')

describe('validateAIResponse', () => {
  describe('null and undefined responses (failed API call simulation)', () => {
    test('rejects null — represents an API call that returned nothing', () => {
      const result = validateAIResponse(null)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.data).toBeNull()
    })

    test('rejects undefined — represents a missing or timed-out response', () => {
      const result = validateAIResponse(undefined)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.data).toBeNull()
    })
  })

  describe('malformed responses (wrong top-level type)', () => {
    test('rejects a plain string', () => {
      const result = validateAIResponse('just some text')
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })

    test('rejects a number', () => {
      const result = validateAIResponse(42)
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })

    test('rejects an array', () => {
      const result = validateAIResponse(['content'])
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })

    test('rejects a boolean', () => {
      const result = validateAIResponse(true)
      expect(result.valid).toBe(false)
      expect(result.data).toBeNull()
    })
  })

  describe('missing required fields', () => {
    test('rejects an empty object (missing content)', () => {
      const result = validateAIResponse({})
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('content'))).toBe(true)
    })

    test('rejects an object with unrelated fields but no content', () => {
      const result = validateAIResponse({ type: 'recommendation', score: 0.9 })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('content'))).toBe(true)
    })
  })

  describe('unexpected data types on required fields', () => {
    test('rejects content field as a number', () => {
      const result = validateAIResponse({ content: 42 })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('content'))).toBe(true)
    })

    test('rejects content field as null', () => {
      const result = validateAIResponse({ content: null })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('content'))).toBe(true)
    })

    test('rejects content field as an array', () => {
      const result = validateAIResponse({ content: ['line 1', 'line 2'] })
      expect(result.valid).toBe(false)
    })

    test('rejects content field as an object', () => {
      const result = validateAIResponse({ content: { text: 'hello' } })
      expect(result.valid).toBe(false)
    })
  })

  describe('valid responses', () => {
    test('accepts a minimal valid response with only content', () => {
      const result = validateAIResponse({ content: 'Here is your recommendation.' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toEqual({ content: 'Here is your recommendation.' })
    })

    test('accepts a valid response with additional fields', () => {
      const result = validateAIResponse({
        content: 'Recommendation text.',
        sessionId: 'abc123',
        timestamp: '2026-05-04T10:00:00Z'
      })
      expect(result.valid).toBe(true)
      expect(result.data).not.toBeNull()
    })

    test('accepts an empty string as valid content', () => {
      // Empty string is technically valid — caller decides if empty is meaningful
      const result = validateAIResponse({ content: '' })
      expect(result.valid).toBe(true)
    })
  })
})

describe('parseSSELine', () => {
  describe('valid SSE lines', () => {
    test('parses a token event', () => {
      const result = parseSSELine('data: {"type":"token","content":"hello"}')
      expect(result).not.toBeNull()
      expect(result.type).toBe('token')
      expect(result.content).toBe('hello')
    })

    test('parses a done event with state', () => {
      const result = parseSSELine('data: {"type":"done","state":{"phase":3}}')
      expect(result).not.toBeNull()
      expect(result.type).toBe('done')
      expect(result.state).toEqual({ phase: 3 })
    })

    test('parses an error event', () => {
      const result = parseSSELine('data: {"type":"error","message":"AI service unavailable"}')
      expect(result).not.toBeNull()
      expect(result.type).toBe('error')
      expect(result.message).toBe('AI service unavailable')
    })

    test('handles whitespace around the data line', () => {
      const result = parseSSELine('  data: {"type":"token","content":"hi"}  ')
      expect(result).not.toBeNull()
      expect(result.type).toBe('token')
    })
  })

  describe('malformed SSE lines', () => {
    test('returns null for invalid JSON', () => {
      expect(parseSSELine('data: {not valid json}')).toBeNull()
    })

    test('returns null for a line without the data: prefix', () => {
      expect(parseSSELine('event: message')).toBeNull()
    })

    test('returns null for an empty string', () => {
      expect(parseSSELine('')).toBeNull()
    })

    test('returns null for a blank line', () => {
      expect(parseSSELine('   ')).toBeNull()
    })
  })

  describe('non-string inputs (failed/timed-out call simulation)', () => {
    test('returns null for null', () => {
      expect(parseSSELine(null)).toBeNull()
    })

    test('returns null for undefined', () => {
      expect(parseSSELine(undefined)).toBeNull()
    })

    test('returns null for a number', () => {
      expect(parseSSELine(42)).toBeNull()
    })

    test('returns null for an object', () => {
      expect(parseSSELine({ data: 'hello' })).toBeNull()
    })
  })

  describe('JSON parses to non-object values', () => {
    test('returns null when JSON is a string value', () => {
      expect(parseSSELine('data: "just a string"')).toBeNull()
    })

    test('returns null when JSON is null', () => {
      expect(parseSSELine('data: null')).toBeNull()
    })

    test('returns null when JSON is a number', () => {
      expect(parseSSELine('data: 42')).toBeNull()
    })

    test('returns null when JSON is an array', () => {
      expect(parseSSELine('data: ["token","content"]')).toBeNull()
    })
  })
})

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
