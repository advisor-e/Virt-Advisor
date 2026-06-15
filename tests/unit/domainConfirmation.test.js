'use strict'

// Cause-first domain confirmation (Scope 1). The AI writes the confirmation line;
// this suite covers the LLM-output validation (must name the detected area and end
// on a confirm question), the success path, and the deterministic fallback branches
// — per the governance rule that any function processing/validating LLM output is
// tested for valid / malformed / missing cases.
//
// The backend OpenAI REST client is mocked so no network/key is needed and the
// AI call is fully controllable.

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

const advisor = require('../../server/advisorEngine')
const { _isValidConfirmation, buildDomainConfirmationMessage } = advisor

const AREA = 'profitability and feasibility' // the live label for domain id 'profit'
const GOOD = 'It sounds like rising costs and discounting have eroded their margins, so profit is flat even though sales are up. That reads as a profitability and feasibility situation — have I got the right area, or is it about something else?'

beforeEach(() => { mockCreate = jest.fn() })

describe('_isValidConfirmation (LLM-output validation)', () => {
  test('accepts a well-formed cause-first line that names the area and ends on a question', () => {
    expect(_isValidConfirmation(GOOD, AREA)).toBe(true)
  })
  test('rejects null / undefined / non-string', () => {
    expect(_isValidConfirmation(null, AREA)).toBe(false)
    expect(_isValidConfirmation(undefined, AREA)).toBe(false)
    expect(_isValidConfirmation(42, AREA)).toBe(false)
  })
  test('rejects empty / whitespace-only', () => {
    expect(_isValidConfirmation('', AREA)).toBe(false)
    expect(_isValidConfirmation('   ', AREA)).toBe(false)
  })
  test('rejects output that does not name the detected area', () => {
    expect(_isValidConfirmation('That sounds like a tricky one — right area, or different?', AREA)).toBe(false)
  })
  test('rejects output that does not end on a question (no confirm)', () => {
    expect(_isValidConfirmation('This is a profitability and feasibility situation.', AREA)).toBe(false)
  })
  test('rejects an over-long response (>600 chars)', () => {
    const longText = 'profitability and feasibility ' + 'x'.repeat(620) + '?'
    expect(_isValidConfirmation(longText, AREA)).toBe(false)
  })
  test('rejects when no area label is provided', () => {
    expect(_isValidConfirmation(GOOD, '')).toBe(false)
  })
})

describe('buildDomainConfirmationMessage', () => {
  const FALLBACK = 'FALLBACK_LINE'

  test('no detected domain → fallback (no AI call)', async () => {
    const msg = await buildDomainConfirmationMessage({ detectedDomain: null, situationDiagnostic: 'x' }, [{ role: 'user', content: 'opening' }], FALLBACK)
    expect(msg).toBe(FALLBACK)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('detected domain but no cause text → fallback (no AI call)', async () => {
    const msg = await buildDomainConfirmationMessage({ detectedDomain: 'profit', situationDiagnostic: '' }, [], FALLBACK)
    expect(msg).toBe(FALLBACK)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('situationDiagnostic of "pending" with no opening → fallback', async () => {
    const msg = await buildDomainConfirmationMessage({ detectedDomain: 'profit', situationDiagnostic: 'pending' }, [], FALLBACK)
    expect(msg).toBe(FALLBACK)
  })

  test('valid AI line → returns the AI line', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: GOOD } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })
    const msg = await buildDomainConfirmationMessage({ detectedDomain: 'profit', situationDiagnostic: 'margins eroded' }, [{ role: 'user', content: 'café profit flat' }], FALLBACK)
    expect(msg).toBe(GOOD)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  test('AI line that does not name the detected area → fallback', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'That sounds tricky — right area or different?' } }], usage: {} })
    const msg = await buildDomainConfirmationMessage({ detectedDomain: 'profit', situationDiagnostic: 'margins eroded' }, [{ role: 'user', content: 'café' }], FALLBACK)
    expect(msg).toBe(FALLBACK)
  })

  test('AI call rejects → graceful fallback', async () => {
    mockCreate.mockRejectedValue(new Error('network'))
    const msg = await buildDomainConfirmationMessage({ detectedDomain: 'profit', situationDiagnostic: 'margins eroded' }, [{ role: 'user', content: 'café' }], FALLBACK)
    expect(msg).toBe(FALLBACK)
  })
})
