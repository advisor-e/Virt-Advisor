'use strict'

// detectWinWorkIntent gates the permission-based "switch to Learn / how-to-sell"
// offer. It should fire on advisor-as-seller language and on explicit "no specific
// problem" statements, but NOT on a genuine client problem to diagnose. Because the
// offer is permission-based, the cost of a false positive is one "No" — so the bar
// is "catch the clear sell/no-problem cases without firing on plain client problems".

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'
const { detectWinWorkIntent } = require('../../server/advisorEngine')

describe('detectWinWorkIntent — fires (advisor wants to win/sell work)', () => {
  const yes = [
    'I just want to upsell them',
    'I want to try and win advisory work from them',
    "there's no specific situation as such I just want to upsell them",
    'I want to secure them for future advisory services',
    'opening their mind to the extra services I can provide as their advisor',
    'no specific problem right now but I want more work',
    "they don't have a specific problem, I just want to sell them more",
    'I want to cross-sell some consulting work',
    'trying to grow the relationship and win more business'
  ]
  test.each(yes)('fires on: %s', (text) => {
    expect(detectWinWorkIntent(text)).toBe(true)
  })
})

describe('detectWinWorkIntent — does NOT fire (a real client problem)', () => {
  const no = [
    "the client's profit has been flat for two years",
    'their sales are dropping and they have fewer customers',
    'they have a staff retention problem',
    'cash flow is tight and they keep running out of money',
    'I need help diagnosing why their margins are eroding',
    '',
    null,
    undefined
  ]
  test.each(no)('does not fire on: %s', (text) => {
    expect(detectWinWorkIntent(text)).toBe(false)
  })
})

describe('detectWinWorkIntent — robustness', () => {
  test('handles a curly apostrophe', () => {
    expect(detectWinWorkIntent('there’s no specific problem as such')).toBe(true)
  })
  test('is case-insensitive', () => {
    expect(detectWinWorkIntent('I WANT TO UPSELL THEM')).toBe(true)
  })
})
