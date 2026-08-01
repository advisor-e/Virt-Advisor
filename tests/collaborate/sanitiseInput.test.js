'use strict'

/**
 * Tests for server/utils/sanitiseInput.js — the untrusted-input sanitiser.
 * Target: 100% coverage (CLAUDE.md §Testing — functions that handle outside data).
 *
 * Control characters are built with String.fromCharCode so no literal control
 * bytes live in this source file.
 */

const { sanitiseText, sanitiseValues, stripControlChars, DEFAULT_MAX_LENGTH } = require('../../server/collaborate/utils/sanitiseInput')

const NUL = String.fromCharCode(0) // C0 control
const BEL = String.fromCharCode(7) // C0 control
const DEL = String.fromCharCode(127) // DEL

describe('stripControlChars', () => {
  test('keeps tab, newline and carriage return', () => {
    expect(stripControlChars('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  test('removes other C0 control chars and DEL (0x7F)', () => {
    expect(stripControlChars('a' + NUL + 'b' + DEL + 'cde')).toBe('abcde')
  })
})

describe('sanitiseText', () => {
  test('returns empty string for null or undefined', () => {
    expect(sanitiseText(null)).toBe('')
    expect(sanitiseText(undefined)).toBe('')
  })

  test('coerces non-strings to string', () => {
    expect(sanitiseText(42)).toBe('42')
    expect(sanitiseText(true)).toBe('true')
  })

  test('trims surrounding whitespace', () => {
    expect(sanitiseText('  hello  ')).toBe('hello')
  })

  test('strips control characters from the value', () => {
    expect(sanitiseText('he' + NUL + 'llo')).toBe('hello')
  })

  test('caps length at the default maximum', () => {
    const long = 'x'.repeat(DEFAULT_MAX_LENGTH + 100)
    expect(sanitiseText(long)).toHaveLength(DEFAULT_MAX_LENGTH)
  })

  test('caps length at a custom maximum', () => {
    expect(sanitiseText('abcdef', { maxLength: 3 })).toBe('abc')
  })

  test('ignores a non-numeric maxLength option and uses the default', () => {
    expect(sanitiseText('abc', { maxLength: 'nope' })).toBe('abc')
  })
})

describe('sanitiseValues', () => {
  test('sanitises every value of a flat object', () => {
    expect(sanitiseValues({ a: '  hi ', b: 'x' + BEL + 'y' })).toEqual({ a: 'hi', b: 'xy' })
  })

  test('skips prototype-polluting keys', () => {
    const input = { ok: 'v' }
    input.constructor = 'y'
    input.prototype = 'z'
    const out = sanitiseValues(input)
    expect(out).toEqual({ ok: 'v' })
  })

  test('passes options through to sanitiseText', () => {
    expect(sanitiseValues({ a: 'abcdef' }, { maxLength: 2 })).toEqual({ a: 'ab' })
  })

  test('returns an empty object for null, array or primitive input', () => {
    expect(sanitiseValues(null)).toEqual({})
    expect(sanitiseValues(['a', 'b'])).toEqual({})
    expect(sanitiseValues('string')).toEqual({})
  })
})
