'use strict'

/**
 * Tests for server/utils/validateAIResponse.js — the untrusted-response shape
 * validator. Target: 100% coverage across valid / malformed / missing-field /
 * wrong-type cases (CLAUDE.md §Testing — AI-response validation = 100%).
 */

const { validateAIResponse } = require('../../server/collaborate/utils/validateAIResponse')

const MYMEMORY_SCHEMA = {
  type: 'object',
  fields: {
    responseStatus: { type: 'number', required: true },
    responseData: {
      type: 'object',
      required: true,
      fields: { translatedText: { type: 'string', required: true } }
    }
  }
}

describe('validateAIResponse — valid', () => {
  test('accepts a well-formed nested object', () => {
    const result = validateAIResponse(
      { responseStatus: 200, responseData: { translatedText: 'Hallo' } },
      MYMEMORY_SCHEMA
    )
    expect(result).toEqual({ valid: true, errors: [] })
  })

  test('accepts an object schema with no declared fields', () => {
    expect(validateAIResponse({ anything: 1 }, { type: 'object' }).valid).toBe(true)
  })

  test('accepts an array schema with no declared element type', () => {
    expect(validateAIResponse([1, 'a', true], { type: 'array' }).valid).toBe(true)
  })

  test('accepts an array whose elements all match `of`', () => {
    expect(validateAIResponse(['a', 'b'], { type: 'array', of: { type: 'string' } }).valid).toBe(true)
  })

  test('does not require optional fields', () => {
    const schema = { type: 'object', fields: { note: { type: 'string' } } }
    expect(validateAIResponse({}, schema).valid).toBe(true)
  })

  test('validates boolean values', () => {
    expect(validateAIResponse(true, { type: 'boolean' }).valid).toBe(true)
  })
})

describe('validateAIResponse — malformed / missing / wrong type', () => {
  test('rejects a wrong root type', () => {
    const result = validateAIResponse('not an object', MYMEMORY_SCHEMA)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/expected object/)
  })

  test('reports a missing required field', () => {
    const result = validateAIResponse({ responseData: { translatedText: 'x' } }, MYMEMORY_SCHEMA)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('$.responseStatus: required field missing')
  })

  test('reports a field of the wrong type', () => {
    const result = validateAIResponse(
      { responseStatus: 200, responseData: { translatedText: 42 } },
      MYMEMORY_SCHEMA
    )
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('$.responseData.translatedText: expected string')
  })

  test('rejects NaN as a number', () => {
    expect(validateAIResponse(NaN, { type: 'number' }).valid).toBe(false)
  })

  test('reports an invalid element inside an array', () => {
    const result = validateAIResponse(['a', 2], { type: 'array', of: { type: 'string' } })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('$[1]: expected string')
  })
})

describe('validateAIResponse — bad schema', () => {
  test('flags a null schema', () => {
    expect(validateAIResponse('x', null).errors[0]).toMatch(/invalid schema/)
  })

  test('flags a non-object schema', () => {
    expect(validateAIResponse('x', 'string').errors[0]).toMatch(/invalid schema/)
  })

  test('flags a schema with no type', () => {
    expect(validateAIResponse('x', {}).errors[0]).toMatch(/invalid schema/)
  })

  test('flags an unknown type', () => {
    expect(validateAIResponse('x', { type: 'date' }).errors[0]).toMatch(/unknown type/)
  })
})
