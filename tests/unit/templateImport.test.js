'use strict'

// validateTemplateImport — the ONE shape gate both upload doorways go through
// (the firm's importTemplates and the mentor's importPlatformTemplates). It
// validates untrusted uploaded JSON, so it carries the project's 100% bar:
// valid, malformed, missing fields, wrong types (CLAUDE.md → Testing).

const {
  validateTemplateImport,
  TEMPLATE_REQUIRED_FIELDS,
  TEMPLATE_MAX_COUNT,
  TEMPLATE_IMPORT_MAX_BYTES
} = require('../../server/utils/templateImport')

const goodEntry = () => ({ page: 'abc123', title: 'Cashflow Basics', section: 'Finance' })

describe('validateTemplateImport', () => {
  it('accepts a well-formed array', () => {
    expect(validateTemplateImport([goodEntry(), goodEntry()])).toEqual({ ok: true })
  })

  it('accepts extra fields beyond the required three (the export carries many)', () => {
    expect(validateTemplateImport([{ ...goodEntry(), purpose: 'x', tags: ['a'] }])).toEqual({ ok: true })
  })

  it('accepts exactly the maximum count', () => {
    const arr = Array.from({ length: TEMPLATE_MAX_COUNT }, goodEntry)
    expect(validateTemplateImport(arr)).toEqual({ ok: true })
  })

  it.each([
    ['an object', { page: 'a', title: 'b', section: 'c' }],
    ['a string', '[]'],
    ['a number', 42],
    ['null', null],
    ['undefined', undefined],
    ['an empty array', []]
  ])('rejects %s as INVALID_FORMAT', (_label, input) => {
    const v = validateTemplateImport(input)
    expect(v.ok).toBe(false)
    expect(v.code).toBe('INVALID_FORMAT')
    expect(typeof v.message).toBe('string')
  })

  it('rejects one entry over the maximum count as TOO_MANY_TEMPLATES', () => {
    const arr = Array.from({ length: TEMPLATE_MAX_COUNT + 1 }, goodEntry)
    const v = validateTemplateImport(arr)
    expect(v.ok).toBe(false)
    expect(v.code).toBe('TOO_MANY_TEMPLATES')
  })

  it.each(TEMPLATE_REQUIRED_FIELDS)('rejects an entry missing "%s"', (field) => {
    const entry = goodEntry()
    delete entry[field]
    const v = validateTemplateImport([goodEntry(), entry])
    expect(v.ok).toBe(false)
    expect(v.code).toBe('INVALID_FORMAT')
    expect(v.message).toContain(field)
  })

  it.each(TEMPLATE_REQUIRED_FIELDS)('rejects an entry whose "%s" is empty', (field) => {
    const entry = { ...goodEntry(), [field]: '' }
    expect(validateTemplateImport([entry]).ok).toBe(false)
  })

  it.each([
    ['null', null],
    ['a string', 'not-a-template'],
    ['a number', 7]
  ])('rejects an array containing %s as an entry', (_label, entry) => {
    const v = validateTemplateImport([goodEntry(), entry])
    expect(v.ok).toBe(false)
    expect(v.code).toBe('INVALID_FORMAT')
  })

  it('rejects on the FIRST bad entry — one rotten row fails the whole file', () => {
    const arr = [goodEntry(), { title: 'no page or section' }, goodEntry()]
    expect(validateTemplateImport(arr).ok).toBe(false)
  })
})

describe('the shared limits', () => {
  // One deliberate pin each: both routes import these values, so a change here is
  // a change to what BOTH doorways accept — it should be a conscious edit.
  it('caps the upload at 10 MB and 2000 entries, requiring page/title/section', () => {
    expect(TEMPLATE_IMPORT_MAX_BYTES).toBe(10 * 1024 * 1024)
    expect(TEMPLATE_MAX_COUNT).toBe(2000)
    expect(TEMPLATE_REQUIRED_FIELDS).toEqual(['page', 'title', 'section'])
  })
})
