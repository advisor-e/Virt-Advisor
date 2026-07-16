'use strict'

// P1 stuck-routing fix (2026-07-16): the Learn topic picker's input was the
// user messages joined OLDEST-first then sliced to 1000 chars — a long
// thread's newest messages (the pivot) were truncated out entirely, so the
// picker could never re-route (live case: sales → EOY pivot ignored).
// newestFirstUserText guarantees the newest words are always inside the cap.

const { newestFirstUserText } = require('../../server/advisorEngine')

function msg (role, content) { return { role, content } }

describe('newestFirstUserText (Learn routing, P1 2026-07-16)', () => {
  test('the current query always leads, followed by user messages newest-first', () => {
    const history = [
      msg('user', 'I want to learn about selling'),
      msg('assistant', 'great, tell me more'),
      msg('user', 'mostly to compliance clients')
    ]
    const out = newestFirstUserText(history, 'what about EOY meetings?')
    expect(out.startsWith('what about EOY meetings?')).toBe(true)
    expect(out.indexOf('mostly to compliance clients')).toBeLessThan(out.indexOf('I want to learn about selling'))
  })

  test('the live defect case: a long sales history can no longer crowd the pivot out of the cap', () => {
    const longSales = 'I want to get better at selling advisory services to my clients. '.repeat(30) // ~2000 chars
    const history = [msg('user', longSales)]
    const out = newestFirstUserText(history, 'now walk me through an end of year meeting script')
    expect(out.length).toBeLessThanOrEqual(1000)
    expect(out.startsWith('now walk me through an end of year meeting script')).toBe(true)
  })

  test('the cap is respected and configurable', () => {
    const history = [msg('user', 'a'.repeat(5000))]
    expect(newestFirstUserText(history, 'newest', 100).length).toBeLessThanOrEqual(100)
    expect(newestFirstUserText(history, 'newest', 100).startsWith('newest')).toBe(true)
  })

  test('assistant messages are excluded; empty inputs are safe', () => {
    const history = [msg('assistant', 'SHOULD NOT APPEAR'), msg('user', 'older words')]
    const out = newestFirstUserText(history, 'newest words')
    expect(out).not.toContain('SHOULD NOT APPEAR')
    expect(newestFirstUserText([], '')).toBe('')
    expect(newestFirstUserText(null, 'only query')).toBe('only query')
  })
})
