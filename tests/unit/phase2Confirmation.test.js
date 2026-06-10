'use strict'

// Phase 2 — the cause-first check-in (a) anchors its read to the signal the engine
// actually extracted, and (b) digs in ONLY when the advisor sounded unsure (never
// re-asking after a confident answer). `openai` is mocked so requiring advisor.js
// loads cleanly and the AI path is controllable.

let mockCreate
jest.mock('openai', () => jest.fn().mockImplementation(() => ({
  chat: { completions: { create: (...a) => mockCreate(...a) } }
})))

const advisor = require('../../server-middleware/advisor')
const { detectUncertainty, buildDomainConfirmationMessage } = advisor

beforeEach(() => { mockCreate = jest.fn() })

describe('detectUncertainty — clear uncertainty only, mild hedges excluded', () => {
  const unsure = [
    "I'm not sure what's causing it",
    "honestly I don't know",
    'it is hard to say really',
    'no idea what is driving it',
    'could be either cashflow or sales',
    "I'm unsure",
    "I can't really tell",
    "it's a bit unclear to me"
  ]
  test.each(unsure)('flags as unsure: %s', (t) => expect(detectUncertainty(t)).toBe(true))

  const confident = [
    'I think the issue is foot traffic',        // mild hedge — NOT uncertainty
    "they're probably struggling with sales",   // mild hedge — NOT uncertainty
    'the main driver is rising costs',
    "they've lost customers and cash is tight",
    // Mike's EXACT live café answer — confident, despite "I think" / "probably":
    "I just think they've struggled with foot traffic and they're probably upsold clients as much as they could have so they're gonna run out of cash going forward"
  ]
  test.each(confident)('does NOT flag as unsure: %s', (t) => expect(detectUncertainty(t)).toBe(false))

  test('null / non-string → false', () => {
    expect(detectUncertainty(null)).toBe(false)
    expect(detectUncertainty(42)).toBe(false)
  })
})

describe('buildDomainConfirmationMessage — Phase 2 branches', () => {
  test('unsure cause → deterministic dig-in, no AI call (does not repeat the cause question)', async () => {
    const msg = await buildDomainConfirmationMessage(
      { detectedDomain: 'profit', situationDiagnostic: "I'm not sure, hard to say what's driving it" },
      [{ role: 'user', content: 'café, profit flat' }], 'FALLBACK')
    expect(msg).toMatch(/what would you say is really causing it/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('confident + a real signal → anchored AI confirmation returned', async () => {
    const GOOD = 'It sounds like the core driver is insufficient sales and customer volume, which is leaving profit flat. That reads as a profitability and feasibility situation — have I got the driver right, or is it something else?'
    mockCreate.mockResolvedValue({ choices: [{ message: { content: GOOD } }], usage: {} })
    const msg = await buildDomainConfirmationMessage(
      { detectedDomain: 'profit', situationDiagnostic: 'they have lost a lot of foot traffic lately' },
      [{ role: 'user', content: 'café' }], 'FALLBACK')
    expect(msg).toBe(GOOD)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  test('confident + no signal → still confirms (AI path), does not dig in', async () => {
    const GOOD = 'It sounds like the business is under pressure and the owner is feeling it. That reads as a profitability and feasibility situation — have I got the driver right, or is it something else?'
    mockCreate.mockResolvedValue({ choices: [{ message: { content: GOOD } }], usage: {} })
    const msg = await buildDomainConfirmationMessage(
      { detectedDomain: 'profit', situationDiagnostic: 'things have just been tough lately for them' },
      [{ role: 'user', content: 'café' }], 'FALLBACK')
    expect(msg).toBe(GOOD)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})
