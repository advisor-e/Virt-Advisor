/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

/**
 * THE THREE SELECTOR CHOICES MUST SURVIVE LONG ENOUGH TO BE SAVED.
 *
 * THE DEFECT. Each selector's submit handler turns the advisor's choice into a message
 * and then clears its own `selected*` property in the same breath — correct, because the
 * panel must not stay filled in. But `saveSession()` runs much later, when the advisor
 * saves the case, and it read those same three cleared properties. So
 * `staircaseStep`, `growthStage` and `finMgtTheme` were written as **null on every case
 * ever saved** — not sometimes, always. The whole path exists behind them (route, store,
 * three columns, both read mappings); only the values never arrived.
 *
 * WHY IT WAS INVISIBLE. No screen displays these fields, and the live "remember this
 * client" feature reads the staircase position out of `decisionTrace.situation` rather
 * than the column, so nothing an advisor sees was wrong. The first person to be misled
 * would have been whoever built the report the columns were plainly meant for: they
 * would read "no advisor has ever chosen a staircase step" as a fact.
 *
 * WHY THESE TESTS MOUNT rather than read the source. The bug is not a missing line —
 * every line was present and each half was individually correct. It is a matter of
 * ORDER: one method clears what another method reads, later. Only running them in
 * sequence can catch that, which is the lesson from the course-slicer session
 * (2026-08-03): where two pieces of code each pass alone, test that the second can
 * actually use what the first produced.
 */

jest.mock('~/utils/cases', () => ({
  createCase: jest.fn(() => Promise.resolve({ id: 'case-1' })),
  findUnrecordedCase: jest.fn(() => Promise.resolve(null)),
  updateCaseReview: jest.fn(() => Promise.resolve({}))
}))

const { createCase } = require('~/utils/cases')

const VirtualAdvisor = require('~/components/VirtualAdvisor.vue').default

beforeEach(() => {
  jest.clearAllMocks()
  // The component fetches on mount; nothing here depends on the answer.
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

/** Mount, and stub the network-bound send so a submit handler can run in isolation. */
function mountAdvisor () {
  const wrapper = mountWithBuefy(VirtualAdvisor)
  wrapper.vm.sendMessage = jest.fn()
  return wrapper
}

// The three selectors, their submit handler, and the field each must reach on the case.
const SELECTORS = [
  {
    label: 'the Advisory Staircase step',
    listProp: 'staircaseSteps',
    selectedProp: 'selectedStaircaseStep',
    sessionProp: 'sessionStaircaseStep',
    submit: 'submitStaircaseStep',
    caseField: 'staircaseStep'
  },
  {
    label: 'the growth stage',
    listProp: 'growthStages',
    selectedProp: 'selectedGrowthStage',
    sessionProp: 'sessionGrowthStage',
    submit: 'submitGrowthStage',
    caseField: 'growthStage'
  },
  {
    label: 'the financial-management theme',
    listProp: 'finMgtThemes',
    selectedProp: 'selectedFinMgtTheme',
    sessionProp: 'sessionFinMgtTheme',
    submit: 'submitFinMgtTheme',
    caseField: 'finMgtTheme'
  }
]

/** The first option the component itself offers for a selector — never an invented name. */
function firstOptionName (vm, listProp) {
  const list = vm[listProp]
  expect(Array.isArray(list)).toBe(true)
  expect(list.length).toBeGreaterThan(0)
  return list[0].name
}

describe.each(SELECTORS)('$label', ({ listProp, selectedProp, sessionProp, submit, caseField }) => {
  test('the choice is kept for the session, and the panel is still cleared', async () => {
    const wrapper = mountAdvisor()
    const vm = wrapper.vm
    const chosen = firstOptionName(vm, listProp)

    await wrapper.setData({ [selectedProp]: chosen })
    vm[submit]()

    // Both halves matter: the panel must empty (the original, correct behaviour) AND
    // the choice must survive somewhere the save can still reach.
    expect(vm[selectedProp]).toBeNull()
    expect(vm[sessionProp]).toBe(chosen)
  })

  test('the choice reaches the saved case — the assertion the defect would fail', async () => {
    const wrapper = mountAdvisor()
    const vm = wrapper.vm
    const chosen = firstOptionName(vm, listProp)

    await wrapper.setData({ [selectedProp]: chosen })
    vm[submit]()
    await wrapper.setData({ saveTitle: 'A client session' })
    await vm.saveSession()

    expect(createCase).toHaveBeenCalledTimes(1)
    expect(createCase.mock.calls[0][0][caseField]).toBe(chosen)
  })
})

describe('a case saved without touching a selector', () => {
  test('records null for all three — an untouched selector is not a choice', async () => {
    const wrapper = mountAdvisor()
    await wrapper.setData({ saveTitle: 'No selectors used' })
    await wrapper.vm.saveSession()

    const saved = createCase.mock.calls[0][0]
    expect(saved.staircaseStep).toBeNull()
    expect(saved.growthStage).toBeNull()
    expect(saved.finMgtTheme).toBeNull()
  })
})

describe('a new session never inherits the last one\'s answers', () => {
  // The risk created by holding the value longer: a session-scoped copy that outlives
  // its session would file one client's answers against the next client's case.
  test.each([
    ['reset()', vm => vm.reset()],
    ['switching mode', vm => vm.selectMode('learn')]
  ])('%s clears all three', async (_label, act) => {
    const wrapper = mountAdvisor()
    const vm = wrapper.vm

    await wrapper.setData({
      sessionStaircaseStep: 'Compliance',
      sessionGrowthStage: 'Start-up',
      sessionFinMgtTheme: 'Cash'
    })

    act(vm)
    await wrapper.vm.$nextTick()

    expect(vm.sessionStaircaseStep).toBeNull()
    expect(vm.sessionGrowthStage).toBeNull()
    expect(vm.sessionFinMgtTheme).toBeNull()
  })
})
