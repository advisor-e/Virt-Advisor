'use strict'

// escapeHtml is security-load-bearing: it neutralises firm-/mentor-authored text
// before it is interpolated into a Buefy dialog message (rendered with v-html).
// These tests lock the escaping so an XSS payload in a document name / video title /
// distinction description can never execute.

const { escapeHtml } = require('../../utils/escapeHtml')

describe('escapeHtml', () => {
  test('escapes the three HTML-significant characters', () => {
    expect(escapeHtml('<>&')).toBe('&lt;&gt;&amp;')
  })

  test('neutralises an onerror image XSS payload', () => {
    expect(escapeHtml('<img src=x onerror=alert(document.cookie)>'))
      .toBe('&lt;img src=x onerror=alert(document.cookie)&gt;')
  })

  test('neutralises a script tag payload', () => {
    expect(escapeHtml('<script>steal()</script>'))
      .toBe('&lt;script&gt;steal()&lt;/script&gt;')
  })

  test('escapes & before other entities so it does not double-escape', () => {
    // A literal "<" must become "&lt;", never "&amp;lt;".
    expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;')
  })

  test('leaves plain text untouched', () => {
    expect(escapeHtml('Q4 Cafe Review 2026')).toBe('Q4 Cafe Review 2026')
  })

  test('coerces null and undefined to an empty string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  test('coerces non-string values to their string form and escapes them', () => {
    expect(escapeHtml(42)).toBe('42')
    expect(escapeHtml({ toString: () => '<x>' })).toBe('&lt;x&gt;')
  })
})
