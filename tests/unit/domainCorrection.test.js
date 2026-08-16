'use strict'

/**
 * When the engine says "I'm reading this as a **staff, productivity and leadership**
 * situation — have I got that right?", the advisor's reply is the one lever that
 * re-routes the whole recommendation. Until 2026-08-14 it only moved if the reply
 * contained the ENTIRE label as a substring.
 *
 * Measured against real phrasings, that meant:
 *
 *   "No, it's really about staff"                        -> no switch
 *   "No — it's a staff problem"                          -> no switch
 *   "Not quite, it's more about profit"                  -> no switch
 *   "it's really about staff, productivity and leadership" -> switch
 *
 * The only phrasing that worked was one no advisor would type. An emphatic rejection
 * ("you've got it wrong") was caught by the separate contradiction check and reset the
 * read — so the engine responded to annoyance but not to a clear, calm correction.
 *
 * `resolveDomainCorrection` is the fix, and it is deliberately CONSERVATIVE. A wrong
 * switch is worse than no switch: it silently re-routes the advice while the advisor
 * believes they were understood. So it moves only when the answer points at exactly
 * one other area and does NOT also point at the current one — which is what keeps
 * "yes, that's right, staff costs are squeezing margins" from being read as a
 * correction to staff.
 */

jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({ chat: { completions: { create: jest.fn() } } })
}))

const { resolveDomainCorrection } = require('../../server/advisorEngine')

describe('resolveDomainCorrection — the advisor corrects the area in their own words', () => {
  test.each([
    ["No, it's really about staff", 'profit', 'staff'],
    ['No — it\'s a staff problem', 'profit', 'staff'],
    ["Not quite, it's more about profit", 'staff', 'profit'],
    ["No, it's a marketing issue", 'profit', 'sales-marketing'],
    ['it\'s really about staff, productivity and leadership', 'profit', 'staff']
  ])('%j (currently %s) -> %s', (answer, current, expected) => {
    expect(resolveDomainCorrection(answer, current)).toBe(expected)
  })

  test('the full label still wins, and still works', () => {
    expect(resolveDomainCorrection('it is about sales and marketing', 'profit')).toBe('sales-marketing')
  })
})

describe('resolveDomainCorrection — it refuses to switch when it is not sure', () => {
  test('a plain confirmation moves nothing', () => {
    expect(resolveDomainCorrection('Yes, that is right', 'profit')).toBeNull()
    expect(resolveDomainCorrection('Yep, spot on', 'staff')).toBeNull()
  })

  test('an answer that ALSO points at the current area is a confirmation, not a correction', () => {
    // The trap: "margins" is a profit signal and "staff" is a staff signal. The advisor
    // is agreeing and adding detail, not re-routing. Switching here would be silent harm.
    expect(resolveDomainCorrection('Yes — staff costs are squeezing their margins', 'profit')).toBeNull()
  })

  test('an answer pointing at two other areas at once is ambiguous, so it holds', () => {
    // Better to leave the read alone and let the contradiction check re-open the
    // question than to guess between two.
    expect(resolveDomainCorrection('it is about sales and their team', 'profit')).toBeNull()
  })

  test('an answer naming no area at all moves nothing', () => {
    expect(resolveDomainCorrection('not sure really', 'profit')).toBeNull()
    expect(resolveDomainCorrection('', 'profit')).toBeNull()
    expect(resolveDomainCorrection(null, 'profit')).toBeNull()
  })

  test('naming the area it is ALREADY on is not a correction', () => {
    expect(resolveDomainCorrection("yes it's a staff thing", 'staff')).toBeNull()
  })
})
