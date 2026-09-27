/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy, englishMocks } = require('../helpers/mountComponent')
const CourseBuilder = require('~/components/CourseBuilder.vue').default

/**
 * The advisor-facing half of quiz provenance: the Quiz Review screen names the
 * bank each question came from, so a query about a question has an address.
 *
 * Three states must be distinguishable, because conflating them would mislead:
 *   • a banked question   → names the bank, the entry number and the source PDF
 *   • an unbanked question → says the AI wrote it from the session content
 *   • a result saved BEFORE provenance existed → says nothing at all, rather
 *     than guessing a source it cannot know.
 *
 * These assertions read the real English from locales/en.json (englishMocks):
 * the provenance values inside the sentences are what they guard.
 */

function reviewResult (extra) {
  return Object.assign({
    question: 'What does a common size balance sheet standardise?',
    answer: 'Every item as a share of total assets.',
    feedback: 'Correct — that is the standardisation step.',
    passed: true,
    score: 80,
    ungraded: false,
    modelAnswer: 'Divide each item in the balance sheet by Total Assets.',
    modelKeyPoint: 'This allows direct comparison across years.'
  }, extra)
}

/** Mount straight into the quiz-review phase with the given saved results. */
async function mountReview (results) {
  const wrapper = mountWithBuefy(CourseBuilder, {
    propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: 'token' }, mocks: englishMocks()
  })
  await wrapper.setData({
    phase: 'quiz-review',
    reviewSessionIndex: 0,
    activeCourse: {
      id: 'course-1',
      outline: { title: 'A course', sessions: [{ id: 1, title: 'Session 1', focus: 'focus' }] },
      progress: [{ status: 'complete', quizScore: 80, quizResults: results, notes: null }]
    }
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('Quiz Review names the bank behind each question', () => {
  test('a banked question shows the bank, the entry number and the source', async () => {
    const wrapper = await mountReview([reviewResult({
      bankKey: 'Ratio Analysis',
      bankRef: 5,
      bankSource: 'Course Builder Quiz/Specialist Tools Quiz.pdf'
    })])

    const source = wrapper.find('.review-q-source')
    expect(source.exists()).toBe(true)
    expect(source.text()).toContain('Ratio Analysis')
    expect(source.text()).toContain('question 5')
    expect(source.text()).toContain('Specialist Tools Quiz.pdf')
  })

  test('an unbanked question says the AI wrote it from the session', async () => {
    const wrapper = await mountReview([reviewResult({ bankKey: null, bankRef: null, bankSource: null })])

    const source = wrapper.find('.review-q-source')
    expect(source.exists()).toBe(true)
    expect(source.text()).toContain('AI-written from the session content')
  })

  test('a result saved before provenance existed claims no source at all', async () => {
    const wrapper = await mountReview([reviewResult()])

    expect(wrapper.find('.review-q-source').exists()).toBe(false)
  })

  test('the advisor still sees their answer and the model answer alongside it', async () => {
    const wrapper = await mountReview([reviewResult({
      bankKey: 'Ratio Analysis', bankRef: 5, bankSource: 'a.pdf'
    })])

    expect(wrapper.text()).toContain('Every item as a share of total assets.')
    expect(wrapper.text()).toContain('Divide each item in the balance sheet by Total Assets.')
  })
})

describe("the approved 'couldn't assess' sentence follows the reader's language", () => {
  const { UNGRADED_FEEDBACK } = require('~/utils/quizScoring')

  function mountReading (translation) {
    return mountWithBuefy(CourseBuilder, {
      propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: 'token' },
      mocks: Object.assign(englishMocks(), {
        $t: key => (key === 'courseBuilder.quiz.ungradedFeedback' ? translation : key)
      })
    })
  }

  test('a saved ungraded result — old or new — shows the reader\'s-language sentence', () => {
    const wrapper = mountReading('Wir konnten diese Antwort nicht bewerten.')

    expect(wrapper.vm.feedbackText({ ungraded: true, feedback: UNGRADED_FEEDBACK }))
      .toBe('Wir konnten diese Antwort nicht bewerten.')
  })

  test('a moderation block and the marker\'s own feedback are shown exactly as saved', () => {
    const wrapper = mountReading('translated')
    const blocked = 'This answer was stopped by a content check: "…".'

    expect(wrapper.vm.feedbackText({ ungraded: true, feedback: blocked })).toBe(blocked)
    expect(wrapper.vm.feedbackText({ feedback: 'Correct.' })).toBe('Correct.')
    expect(wrapper.vm.feedbackText({})).toBe('')
  })
})

describe('provenance is recorded on the result, not just the question', () => {
  test('_questionProvenance carries the bank identity and the entry number', () => {
    const wrapper = mountWithBuefy(CourseBuilder, {
      propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: 'token' }, mocks: englishMocks()
    })
    wrapper.setData({
      quizBank: { key: 'Phone Techniques', source: 'a.pdf', origin: 'platform' },
      quizQuestions: [{ id: 1, question: 'q', objective: 'o', bankRef: 3 }],
      quizCurrentIndex: 0
    })

    expect(wrapper.vm._questionProvenance()).toEqual({
      bankKey: 'Phone Techniques',
      bankSource: 'a.pdf',
      bankRef: 3
    })
  })

  test('with no bank it records nulls — never a guessed source', () => {
    const wrapper = mountWithBuefy(CourseBuilder, {
      propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: 'token' }, mocks: englishMocks()
    })
    wrapper.setData({
      quizBank: null,
      quizQuestions: [{ id: 1, question: 'q', objective: 'o' }],
      quizCurrentIndex: 0
    })

    expect(wrapper.vm._questionProvenance()).toEqual({
      bankKey: null,
      bankSource: null,
      bankRef: null
    })
  })
})
