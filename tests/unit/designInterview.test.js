'use strict'

// CB-06 (design/COURSE-BUILDER-PLAN.md Phase 4): the interview must recognise
// a question about the question (re-ask, don't store) and must not re-ask
// what the opening message already answered. Patterns are conservative by
// design — a real answer must NEVER be classified as a clarification request.

const { isClarificationRequest, prefillDesignState } = require('../../server/utils/designInterview')

describe('isClarificationRequest (CB-06)', () => {
  test.each([
    'What do you mean?',
    'what does that mean',
    'Sorry, I don\'t understand',
    'can you explain that',
    'Could you rephrase the question?',
    'please clarify',
    'I\'m not sure what you mean',
    'not sure what you mean by intensity',
    '?',
    'huh?',
    'Pardon?',
    'what are you asking'
  ])('catches the clarification request: %s', (reply) => {
    expect(isClarificationRequest(reply)).toBe(true)
  })

  test.each([
    'Complete beginner, no training at all',
    'I want each session consistent in depth',
    '30 minutes, 4 sessions please',
    // Real answers that merely CONTAIN question-ish words must still be stored:
    'What I mostly need is help with selling',
    'I understand the basics but nothing formal',
    'Some experience — I explain valuations to clients sometimes',
    'I\'d say sort of intermediate?'
  ])('does NOT flag the real answer: %s', (reply) => {
    expect(isClarificationRequest(reply)).toBe(false)
  })

  test('handles junk input', () => {
    expect(isClarificationRequest(null)).toBe(false)
    expect(isClarificationRequest('')).toBe(false)
  })
})

describe('prefillDesignState (CB-06)', () => {
  const emptyState = () => ({ goalsPrimary: 'x', currentLevel: null, intensity: null, sessionDetails: null })

  test('a fully-specified opening message fills all three fields', () => {
    const state = prefillDesignState(
      emptyState(),
      "I'm a complete beginner at selling advisory services. I'd like 4 sessions of 30 minutes, consistent depth throughout."
    )
    expect(state.currentLevel).toBe('complete beginner')
    expect(state.intensity).toContain('consistent')
    expect(state.sessionDetails).toBe('4 sessions of 30 minutes')
  })

  test('progressive wording fills intensity as progressive', () => {
    const state = prefillDesignState(emptyState(), 'I want it to get progressively harder over 5 sessions of 45 minutes')
    expect(state.intensity).toContain('progressive')
    expect(state.sessionDetails).toBe('5 sessions of 45 minutes')
  })

  test('a session count WITHOUT minutes does not fill the format (conservative)', () => {
    const state = prefillDesignState(emptyState(), 'Maybe 4 sessions on succession planning')
    expect(state.sessionDetails).toBeNull()
  })

  test('an ambiguous intensity (both sides mentioned) is left to be asked', () => {
    const state = prefillDesignState(emptyState(), 'Not sure if I want consistent depth or getting harder as I go')
    expect(state.intensity).toBeNull()
  })

  test('experience is filled from an explicit self-assessment only', () => {
    expect(prefillDesignState(emptyState(), 'I have 10 years experience in advisory').currentLevel).toContain('10 years')
    expect(prefillDesignState(emptyState(), 'I want to learn about profit levers').currentLevel).toBeNull()
  })

  test('a vague opening message fills nothing', () => {
    const state = prefillDesignState(emptyState(), 'Help me get better at strategic planning conversations')
    expect(state.currentLevel).toBeNull()
    expect(state.intensity).toBeNull()
    expect(state.sessionDetails).toBeNull()
  })

  test('already-filled fields are never overwritten', () => {
    const state = { goalsPrimary: 'x', currentLevel: 'expert', intensity: null, sessionDetails: null }
    prefillDesignState(state, 'complete beginner, 4 sessions of 30 minutes')
    expect(state.currentLevel).toBe('expert')
    expect(state.sessionDetails).toBe('4 sessions of 30 minutes')
  })
})
