'use strict'

/**
 * The Quizzes tab's row-building rules.
 *
 * Tested directly rather than through a mounted screen because these are the
 * decisions, not the drawing: which questions appear, what each is called, and —
 * the one that carries real consequence — what a save actually sends.
 */

const { buildQuizRows, buildQuestionEdit, isLastLiveQuestion } = require('../../utils/quizRows')

const platform = (n, over = {}) => ({
  qid: `qz-${n}`,
  id: n,
  question: `Platform question ${n}`,
  answer: `Platform answer ${n}`,
  keyPoint: `Platform point ${n}`,
  ...over
})

describe('buildQuizRows', () => {
  test('names each question by who wrote it', () => {
    const { live } = buildQuizRows([
      { ...platform(1), source: 'platform' },
      { ...platform(2), source: 'firm-override' },
      { qid: 'fq-1', id: 3, question: 'Ours', source: 'firm-own' }
    ], [], [])

    expect(live.map(r => r.kind)).toEqual(['platform', 'customised', 'firm-own'])
  })

  test('an untagged question is treated as the platform, not the firm', () => {
    // Only reachable if a resolver path ever returned an untagged bank. Reading it
    // as the firm's would badge Advisor-e's own questions as customised and offer
    // Reset to platform on something the firm never touched.
    const { live } = buildQuizRows([platform(1)], [], [])
    expect(live[0].kind).toBe('platform')
  })

  test('switched-off questions come from the platform bank, since they are absent from the resolved one', () => {
    const { live, switchedOff } = buildQuizRows(
      [{ ...platform(2), source: 'platform' }],
      [platform(1), platform(2)],
      ['qz-1']
    )

    expect(live.map(r => r.qid)).toEqual(['qz-2'])
    expect(switchedOff.map(r => r.qid)).toEqual(['qz-1'])
    expect(switchedOff[0].question).toBe('Platform question 1')
  })

  test('a declined id for another page does not pull that question in', () => {
    const { switchedOff } = buildQuizRows([], [platform(1)], ['qz-99'])
    expect(switchedOff).toEqual([])
  })

  test('missing or malformed input produces empty lists rather than throwing', () => {
    expect(buildQuizRows(null, undefined, null)).toEqual({ live: [], switchedOff: [] })
    expect(buildQuizRows([null], [null], [])).toEqual({ live: [], switchedOff: [] })
  })
})

describe('buildQuestionEdit', () => {
  const base = platform(1)

  test('sends only the fields that actually changed', () => {
    // The freshness guarantee: an untouched field must keep tracking Advisor-e's
    // wording rather than being frozen at today's text.
    const { action, body } = buildQuestionEdit({
      question: 'Platform question 1',
      answer: 'Our answer',
      keyPoint: 'Platform point 1'
    }, base, false)

    expect(action).toBe('save')
    expect(body).toEqual({ answer: 'Our answer' })
  })

  test('whitespace either side is not a change', () => {
    const { action } = buildQuestionEdit({
      question: '  Platform question 1  ',
      answer: 'Platform answer 1',
      keyPoint: 'Platform point 1'
    }, base, false)

    expect(action).toBe('none')
  })

  test('an edit put back to the platform wording resets, not saves', () => {
    // Storing a copy that happens to be identical would still shield the question
    // from Advisor-e's next improvement to it.
    const { action, body } = buildQuestionEdit({
      question: 'Platform question 1',
      answer: 'Platform answer 1',
      keyPoint: 'Platform point 1'
    }, base, true)

    expect(action).toBe('reset')
    expect(body).toEqual({})
  })

  test('changing nothing on a question never edited does nothing at all', () => {
    const { action } = buildQuestionEdit({
      question: 'Platform question 1',
      answer: 'Platform answer 1',
      keyPoint: 'Platform point 1'
    }, base, false)

    expect(action).toBe('none')
  })

  test('a question the firm owns sends every field, because there is nothing to track', () => {
    const { action, body } = buildQuestionEdit(
      { question: 'Ours', answer: 'Our answer', keyPoint: 'Our point' }, null, false
    )

    expect(action).toBe('save')
    expect(body).toEqual({ question: 'Ours', answer: 'Our answer', keyPoint: 'Our point' })
  })

  test('a missing field becomes an empty string, never undefined', () => {
    // undefined would drop out of JSON.stringify and the backend would read the
    // save as "this field was not sent", i.e. keep tracking — the opposite of what
    // clearing a box means.
    const { body } = buildQuestionEdit({ question: 'Ours' }, null, false)
    expect(body).toEqual({ question: 'Ours', answer: '', keyPoint: '' })
  })
})

describe('isLastLiveQuestion', () => {
  test('true only when this exact question is the one remaining', () => {
    const rows = [{ qid: 'qz-1' }]
    expect(isLastLiveQuestion(rows, 'qz-1')).toBe(true)
    expect(isLastLiveQuestion(rows, 'qz-2')).toBe(false)
    expect(isLastLiveQuestion([{ qid: 'qz-1' }, { qid: 'qz-2' }], 'qz-1')).toBe(false)
  })

  test('false on an empty or missing list — there is nothing left to warn about', () => {
    expect(isLastLiveQuestion([], 'qz-1')).toBe(false)
    expect(isLastLiveQuestion(null, 'qz-1')).toBe(false)
  })
})
