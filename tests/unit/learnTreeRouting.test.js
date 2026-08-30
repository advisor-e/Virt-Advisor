'use strict'

// P1 stuck-routing fix (2026-07-16): the Learn topic picker's input was the
// user messages joined OLDEST-first then sliced to 1000 chars — a long
// thread's newest messages (the pivot) were truncated out entirely, so the
// picker could never re-route (live case: sales → EOY pivot ignored).
// newestFirstUserText guarantees the newest words are always inside the cap.

const { newestFirstUserText, offeredGuideFromLastAnswer } = require('../../server/advisorEngine')

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

// Item 4.46 (2026-08-25): the scope-honesty refusal offers a switch and names the
// guide in the ASSISTANT's message. The pickers read only the advisor's own words,
// so "yes" reached them with the guide name structurally absent and nothing loaded.
describe('offeredGuideFromLastAnswer (Learn switch offer, item 4.46)', () => {
  const OFFER = "I don't have the Advisor-e coaching content for that in this guide — that sits in the Dashboard Discussions guide. Would you like me to switch to it?"

  test('the offered guide is recovered from the answer that made the offer', () => {
    const history = [msg('user', 'what should I ask about a falling gross margin?'), msg('assistant', OFFER)]
    expect(offeredGuideFromLastAnswer(history)).toBe('Dashboard Discussions')
  })

  test('no offer, no change: ordinary Learn answers route exactly as before', () => {
    expect(offeredGuideFromLastAnswer([msg('assistant', 'Here is how the Ratio Analysis guide approaches it.')])).toBe(null)
    expect(offeredGuideFromLastAnswer([msg('user', 'yes')])).toBe(null)
    expect(offeredGuideFromLastAnswer([])).toBe(null)
    expect(offeredGuideFromLastAnswer(null)).toBe(null)
  })

  test('an echoed scope block names many guides and is not guessed at', () => {
    const many = 'Would you like me to switch to it? Ratio Analysis · Dashboard Discussions · The Heald Matrix'
    expect(offeredGuideFromLastAnswer([msg('assistant', many)])).toBe(null)
  })

  test('only the NEWEST answer is read — a stale offer cannot re-route a later turn', () => {
    const history = [
      msg('assistant', OFFER),
      msg('user', 'no, something else'),
      msg('assistant', 'Understood — here is the Ratio Analysis view.')
    ]
    expect(offeredGuideFromLastAnswer(history)).toBe(null)
  })
})
