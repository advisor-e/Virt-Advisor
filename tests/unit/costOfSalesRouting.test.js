'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// "COST OF SALES" IS A PROFIT TERM, NOT A SALES-AND-MARKETING ONE (item 4.100).
//
// The domain keywords decide which advisory area a conversation lands in, and the
// area decides which templates are even considered. `sales-marketing` hunts for the
// word "sales" — and found the one sitting inside "cost of sales", the accounting
// term for the direct cost of what you sell. A margin problem was scored as a
// selling problem.
//
// Two shapes, and the second is the one that bites:
//   • "margins are down, the cost of sales has gone up" — profit 1, sales 1. A TIE,
//     so the advisor is asked. Nothing silently wrong, but the question was never
//     genuine; the only "sales" in the sentence is an accounting word.
//   • "our cost of sales keeps climbing" — profit 0, sales 1. NO tie, so it routes
//     OUTRIGHT to sales and marketing and the advisor is never told there was a
//     choice. Every layer downstream inherits it: the templates, the primary issue,
//     and the pooled row the platform learns from.
//
// 🔴 THIS PINS BEHAVIOUR A PERSON IN UAT CANNOT SEE. A tester meeting marketing
// advice for a margin problem has no way to know the area was chosen by a word
// inside a phrase — the screen looks entirely correct either way.
//
// Both directions are pinned deliberately. A guard that only proved the fix would
// pass just as happily if the whole pattern were deleted, which would take the six
// genuine sales sentences with it.
// ─────────────────────────────────────────────────────────────────────────────

const domainsData = require('../../data/domains.json')

const domains = domainsData.domains || domainsData
const byId = (id) => {
  const d = domains.find(x => x.id === id)
  if (!d) {
    throw new Error(`domain "${id}" not found in data/domains.json`)
  }
  return d
}

// Scored exactly as server/advisorEngine.js scores it: count the matches.
const score = (domainId, text) =>
  (text.match(new RegExp(byId(domainId).keywords, 'gi')) || []).length

describe('"cost of sales" does not pull a conversation into sales and marketing', () => {
  const COST_SENTENCES = [
    'margins are down, the cost of sales has gone up because suppliers put their prices up',
    'our cost of sales keeps climbing',
    'cost of sales is eating the margin',
    'direct costs of sales rose again'
  ]

  test.each(COST_SENTENCES)('scores 0 for sales-marketing: "%s"', (sentence) => {
    expect(score('sales-marketing', sentence)).toBe(0)
  })

  test('the reported sentence is no longer a tie — profit wins outright', () => {
    const sentence = COST_SENTENCES[0]
    expect(score('profit', sentence)).toBeGreaterThan(score('sales-marketing', sentence))
  })
})

describe('genuine sales and marketing wording still routes there', () => {
  // If this block fails, the guard above was bought by breaking the domain.
  const SALES_SENTENCES = [
    'sales are down this quarter',
    'we need a better sales process',
    'the sales team is not converting',
    'sales revenue has dropped',
    'low sales and no brand awareness',
    'our marketing messaging is weak'
  ]

  test.each(SALES_SENTENCES)('still scores for sales-marketing: "%s"', (sentence) => {
    expect(score('sales-marketing', sentence)).toBeGreaterThan(0)
  })

  test('none of them is dragged into profit instead', () => {
    for (const sentence of SALES_SENTENCES) {
      expect(score('profit', sentence)).toBe(0)
    }
  })
})

describe('the lookbehind guard runs on the locked runtime', () => {
  // Node 14.15 is the locked target (Stack Constitution req 9). Lookbehind landed
  // in V8 6.2, well before it, and this was confirmed against the real 14.15.0
  // binary before the pattern was changed. Pinned so a future edit that reaches
  // for a newer regex feature fails here rather than at run time on the backend.
  test('the pattern compiles and discriminates', () => {
    const re = new RegExp(byId('sales-marketing').keywords, 'gi')
    expect('cost of sales'.match(re)).toBeNull()
    expect('sales'.match(re)).toHaveLength(1)
  })
})
