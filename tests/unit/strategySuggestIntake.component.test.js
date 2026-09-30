/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The guided questions — item 15.31, approved drawing design/mockups/strategy-suggest-intake.html.
 *
 * 🔴 WHAT THESE GUARD, and none of it is wording or styling:
 *   1. ONE QUESTION AT A TIME, EARLIER ONES KEPT (Mike, 2026-09-30: "guided assistance - not
 *      a survey"). A refactor to a plain form would still work, so only a test notices.
 *   2. NOTHING IS OFFERED UNTIL EVERY QUESTION IS ANSWERED — the backend refuses a partial
 *      set, so an early button would be a button that fails.
 *   3. A TYPED SESSION LENGTH OUTSIDE WHAT THE BACKEND ACCEPTS CANNOT BE CONFIRMED.
 *   4. REOPENED, THE ANSWERS ARE ALL THERE — changing one does not mean retyping eight.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategySuggestIntake = require('~/components/strategy/StrategySuggestIntake.vue').default
const intake = require('~/server/utils/strategyIntake')

const QUESTIONS = intake.questions()

function mountIt (propsData) {
  return mountWithBuefy(StrategySuggestIntake, {
    propsData: Object.assign({ questions: QUESTIONS, minutes: { min: 29, max: 480 } }, propsData || {})
  })
}

/** Answer whatever is being asked now, the way the advisor would. */
async function answerCurrent (wrapper, value) {
  const vm = wrapper.vm
  const q = vm.currentQuestion
  if (q.kind === 'text') { vm.draft = value || 'An answer.' } else { vm.choice = value }
  await vm.$nextTick()
  vm.confirm()
  await vm.$nextTick()
}

async function answerAll (wrapper) {
  await answerCurrent(wrapper, 'No plan yet.')
  await answerCurrent(wrapper, 'Lifestyle')
  await answerCurrent(wrapper, wrapper.vm.staircaseSteps[1].name)
  await answerCurrent(wrapper)
  await answerCurrent(wrapper)
  await answerCurrent(wrapper)
  await answerCurrent(wrapper)
  await answerCurrent(wrapper, '90 mins')
}

describe('one question at a time', () => {
  it('opens on the first question alone', () => {
    const wrapper = mountIt()
    expect(wrapper.findAll('.ssi-now')).toHaveLength(1)
    expect(wrapper.findAll('.ssi-done')).toHaveLength(0)
    expect(wrapper.vm.currentQuestion.field).toBe('strategyPlanExists')
  })

  it('keeps each answered question on screen above the next', async () => {
    const wrapper = mountIt()
    await answerCurrent(wrapper, 'No plan yet.')
    await answerCurrent(wrapper, 'Lifestyle')

    expect(wrapper.findAll('.ssi-done')).toHaveLength(2)
    expect(wrapper.vm.currentQuestion.field).toBe('advisoryStaircase')
  })

  it('does not record an empty answer', async () => {
    const wrapper = mountIt()
    await answerCurrent(wrapper, '   ')
    expect(wrapper.vm.currentQuestion.field).toBe('strategyPlanExists')
  })
})

describe('the suggestion is offered only when every question is answered', () => {
  it('emits every answer, keyed by the backend\'s fields', async () => {
    const wrapper = mountIt()
    expect(wrapper.vm.complete).toBe(false)
    await answerAll(wrapper)

    expect(wrapper.vm.complete).toBe(true)
    wrapper.vm.submit()
    const sent = wrapper.emitted('submit')[0][0]
    expect(Object.keys(sent).sort()).toEqual(QUESTIONS.map(q => q.field).sort())
    expect(sent.advisorSessionLength).toBe('90 mins')
  })

  it('emits nothing if asked to submit early', () => {
    const wrapper = mountIt()
    wrapper.vm.submit()
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})

describe('a typed session length', () => {
  async function toSessionLength (wrapper) {
    for (let i = 0; i < QUESTIONS.length - 1; i++) {
      const q = wrapper.vm.currentQuestion
      const value = q.kind === 'growthStage'
        ? 'Lifestyle'
        : q.kind === 'staircase' ? wrapper.vm.staircaseSteps[0].name : undefined
      await answerCurrent(wrapper, value)
    }
    expect(wrapper.vm.currentQuestion.kind).toBe('sessionLength')
  }

  it('cannot be confirmed outside what the backend accepts', async () => {
    const wrapper = mountIt()
    await toSessionLength(wrapper)
    wrapper.vm.choice = 'Other'
    wrapper.vm.otherMinutes = '20'
    expect(wrapper.vm.pendingAnswer).toBe('')
    wrapper.vm.otherMinutes = '75'
    expect(wrapper.vm.pendingAnswer).toBe('75 mins')
  })
})

describe('reopened after a suggestion', () => {
  it('starts with every answer in place and changes one without retyping the rest', async () => {
    const first = mountIt()
    await answerAll(first)
    first.vm.submit()
    const given = first.emitted('submit')[0][0]

    const wrapper = mountIt({ initialAnswers: given })
    expect(wrapper.vm.complete).toBe(true)
    expect(wrapper.findAll('.ssi-done')).toHaveLength(QUESTIONS.length)

    wrapper.vm.edit(1) // the Growth Curve
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.choice).toBe('Lifestyle')
    await answerCurrent(wrapper, 'Leverage')

    wrapper.vm.submit()
    const again = wrapper.emitted('submit')[0][0]
    expect(again.growthStage).toBe('Leverage')
    expect(again.strategyPlanExists).toBe(given.strategyPlanExists)
  })
})
