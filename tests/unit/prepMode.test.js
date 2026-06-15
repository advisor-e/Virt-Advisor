'use strict'

// Prep-mode detection (Option B — notice the signal and offer). The trigger is a
// narrow, factual "I haven't met this client yet" wording check, guarded so
// "I've met them" never trips it. The backend OpenAI REST client is mocked only so
// requiring advisor.js loads cleanly under Jest.

jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: jest.fn() } }
  })
}))

const advisor = require('../../server-middleware/advisor')
const { detectNotMetClient, PREP_SKIP_FIELDS } = advisor

describe('detectNotMetClient — positive ("not met yet") signals', () => {
  const yes = [
    "I haven't met them yet",
    "I haven't met the client",
    'I have yet to meet them',
    'This is our first meeting',
    "It's an initial meeting next week",
    "I'm prepping for the meeting",
    'I am preparing for our meeting',
    'before I meet them I want to be ready',
    "I don't know them yet",
    "haven't sat down with them",
    "haven't spoken to them",
    'They are a new client',
    'a prospective client',
    "haven't worked with them",
    'getting ready for the meeting',
    'I am about to meet them'
  ]
  test.each(yes)('matches: %s', (phrase) => {
    expect(detectNotMetClient(phrase)).toBe(true)
  })

  test('matches with a curly apostrophe', () => {
    expect(detectNotMetClient('I haven’t met them yet')).toBe(true)
  })
})

describe('detectNotMetClient — guard: "already met" must NOT trip it', () => {
  const no = [
    "I've met them several times",
    'we meet regularly',
    'I have met the client before',
    'met them a few times already',
    'they are an existing client I know well',
    'a long-standing client',
    'we meet monthly'
  ]
  test.each(no)('does not match: %s', (phrase) => {
    expect(detectNotMetClient(phrase)).toBe(false)
  })
})

describe('detectNotMetClient — unrelated answers and bad input', () => {
  test('plain situation answers do not match', () => {
    expect(detectNotMetClient('rising costs and discounting eroded their margins')).toBe(false)
    expect(detectNotMetClient('two meetings')).toBe(false)
    expect(detectNotMetClient('60 minutes')).toBe(false)
  })
  test('null / non-string → false', () => {
    expect(detectNotMetClient(null)).toBe(false)
    expect(detectNotMetClient(undefined)).toBe(false)
    expect(detectNotMetClient(42)).toBe(false)
    expect(detectNotMetClient('')).toBe(false)
  })
})

describe('PREP_SKIP_FIELDS — the client-about questions skipped in prep-mode', () => {
  test('skips the six client-about fields', () => {
    for (const f of ['clientRaisedIssue', 'situationDiagnostic', 'clientAlreadyTried', 'industry', 'ownership', 'growthStage']) {
      expect(PREP_SKIP_FIELDS.has(f)).toBe(true)
    }
  })
  test('keeps the advisor / relationship fields', () => {
    for (const f of ['advisoryStaircase', 'advisorConfidence', 'advisorExperience', 'advisorMeetingCount', 'advisorSessionLength', 'domainConfirmed']) {
      expect(PREP_SKIP_FIELDS.has(f)).toBe(false)
    }
  })
})
