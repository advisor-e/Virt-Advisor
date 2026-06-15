'use strict'

// parseMeetingCount — folds in spoken/voice forms so a speech-to-text slip doesn't
// silently halve the template budget (the live café bug: "too" parsed as nothing →
// budget 1 → only one template instead of two). Bare "to" is excluded so normal
// answers ("happy to commit to three") are not mis-parsed. The backend OpenAI REST
// client is mocked only so requiring advisor.js loads under Jest.

jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: jest.fn() } }
  })
}))

const { parseMeetingCount } = require('../../server/advisorEngine')

describe('parseMeetingCount — voice-input-safe', () => {
  test.each([
    ['two meetings', 2],
    ['I would say too should be enough', 2], // the live café bug: "too" → two
    ['a couple should be enough', 2],
    ['just a few', 3],
    ['3 meetings', 3],
    ['one', 1],
    ['two to three', 3] // range → upper bound
  ])('parses "%s" → %i', (input, expected) => {
    expect(parseMeetingCount(input)).toBe(expected)
  })

  test('bare "to" is not a number — "happy to commit to three" → 3, not 2', () => {
    expect(parseMeetingCount('happy to commit to three meetings')).toBe(3)
  })

  test('an answer with no count word → null (no false "to"/"for" match)', () => {
    expect(parseMeetingCount('whatever works for them')).toBeNull()
    expect(parseMeetingCount('happy to do what it takes')).toBeNull()
  })

  test('null / pending / non-string → null', () => {
    expect(parseMeetingCount(null)).toBeNull()
    expect(parseMeetingCount('pending')).toBeNull()
    expect(parseMeetingCount(42)).toBeNull()
  })
})
