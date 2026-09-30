'use strict'

// The guided questions for a client with no saved conversation — item 15.31, approved
// drawing design/mockups/strategy-suggest-intake.html (Mike, 2026-09-30).
//
// 🔴 WHAT UAT CANNOT SEE, WHICH IS WHY THESE ARE HERE:
//   1. THE CEILING. A tester sees "2 rows ticked" and has no way to know whether 2 was
//      Mike's rule for a 60-minute session or the model's whim.
//   2. ONE SOURCE. The planner's questions and the Virtual Advisor's could drift apart and
//      both screens would still look fine.
//   3. WHAT IS MODERATED. Picker answers are the app's own words; moderating them spends an
//      allowance of 20,000 tokens a minute on nothing (rule Z3).

const intake = require('../../server/utils/strategyIntake')
const { QUESTION_TEXT } = require('../../server/utils/intakeQuestions')
const { BASE_STAIRCASE } = require('../../server/utils/staircaseConfig')
const DOMAINS = require('../../data/domains.json')

function completeAnswers (over) {
  return Object.assign({
    strategyPlanExists: 'No plan; new to planning.',
    growthStage: 'Lifestyle',
    advisoryStaircase: 'Step 2: Assimilation',
    clientRaisedIssue: 'They asked.',
    clientPersonality: 'Careful.',
    advisorExperience: 'Three years.',
    advisorConfidence: 'A stretch.',
    advisorSessionLength: '90 mins'
  }, over || {})
}

describe('Mike\'s timing rule — 6 frame, 3 agenda, 20 per concept, rounded down', () => {
  it.each([
    [30, 1], [60, 2], [90, 4], [120, 5], [29, 1], [48, 1], [49, 2]
  ])('%i minutes holds at most %i', (minutes, cap) => {
    expect(intake.conceptCap(minutes)).toBe(cap)
  })

  it('holds nothing when the minutes are not a number', () => {
    expect(intake.conceptCap(null)).toBe(0)
    expect(intake.conceptCap(NaN)).toBe(0)
  })

  it('reads minutes from the picker and from a typed number, and refuses the unusable', () => {
    expect(intake.sessionMinutes('90 mins')).toBe(90)
    expect(intake.sessionMinutes('75')).toBe(75)
    expect(intake.sessionMinutes('Other')).toBeNull()
    expect(intake.sessionMinutes('20 mins')).toBeNull() // too short for one concept
    expect(intake.sessionMinutes('600 mins')).toBeNull()
  })
})

describe('the questions — read from their one home, in the ruled order', () => {
  const asked = intake.questions()

  it('asks Mike\'s plan question first, in the wording stored in domains.json', () => {
    const strategy = (Array.isArray(DOMAINS) ? DOMAINS : DOMAINS.domains).find(d => d.id === 'strategy')
    const stored = strategy.questions.find(q => q.field === 'strategyPlanExists').text
    expect(asked[0]).toEqual({ field: 'strategyPlanExists', kind: 'text', text: stored })
  })

  it('takes every other shared question from the same text the Virtual Advisor asks', () => {
    ['growthStage', 'clientRaisedIssue', 'clientPersonality', 'advisorExperience',
      'advisorConfidence', 'advisorSessionLength'].forEach((field) => {
      expect(asked.find(q => q.field === field).text).toBe(QUESTION_TEXT[field])
    })
  })

  it('asks the Staircase in the firm\'s own words when the firm reworded it', () => {
    expect(intake.questions().find(q => q.field === 'advisoryStaircase').text)
      .toBe(BASE_STAIRCASE.selectorPrompt)
    const firm = intake.questions({ selectorPrompt: 'Where does our work with them sit?' })
    expect(firm.find(q => q.field === 'advisoryStaircase').text).toBe('Where does our work with them sit?')
  })

  it('ends on the session length, which the ceiling depends on', () => {
    expect(asked[asked.length - 1].kind).toBe('sessionLength')
  })
})

describe('the answers', () => {
  it('accepts a complete set and returns the minutes it implies', () => {
    const out = intake.normaliseAnswers(completeAnswers())
    expect(out.minutes).toBe(90)
    expect(Object.keys(out.answers)).toEqual(intake.SEQUENCE.map(q => q.field))
  })

  it.each([
    ['a missing answer', completeAnswers({ clientPersonality: undefined })],
    ['a blank answer', completeAnswers({ advisorConfidence: '   ' })],
    ['a non-string answer', completeAnswers({ growthStage: 4 })],
    ['an unusable session length', completeAnswers({ advisorSessionLength: 'Other' })],
    ['not an object', ['a']],
    ['nothing', null]
  ])('refuses %s', (_, raw) => {
    expect(intake.normaliseAnswers(raw)).toBeNull()
  })

  it('never passes on a field it did not ask', () => {
    const out = intake.normaliseAnswers(completeAnswers({ clientId: 'client-9', firmId: 'firm-b' }))
    expect(out.answers.clientId).toBeUndefined()
    expect(out.answers.firmId).toBeUndefined()
  })

  it('cuts a very long answer rather than sending it whole', () => {
    const out = intake.normaliseAnswers(completeAnswers({ clientRaisedIssue: 'x'.repeat(5000) }))
    expect(out.answers.clientRaisedIssue.length).toBe(500)
  })

  it('moderates only what the advisor typed, never the picker answers', () => {
    const typed = intake.typedAnswers(completeAnswers())
    expect(typed).toContain('They asked.')
    expect(typed).toContain('No plan; new to planning.')
    expect(typed).not.toContain('Lifestyle')
    expect(typed).not.toContain('Step 2: Assimilation')
    expect(typed).not.toContain('90 mins')
  })

  it('puts each question beside its answer, in the order asked', () => {
    const text = intake.situationFromAnswers(completeAnswers(), intake.questions())
    expect(text.indexOf('No plan; new to planning.')).toBeLessThan(text.indexOf('90 mins'))
    expect(text).toContain(QUESTION_TEXT.clientPersonality + '\nCareful.')
  })
})
