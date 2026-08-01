/**
 * @jest-environment jsdom
 */
'use strict'

// The Advisory Staircase tab as a manager actually meets it.
//
// WHY THIS FILE EXISTS. On 2026-07-31 Mike clicked Edit on the Quizzes tab and nothing
// appeared to happen: the form rendered at the FOOT of the panel, a screen and a half
// below the button. The suite was green throughout — it could not see a screen. He then
// ruled that every Firm Manager tab must behave the way Quizzes now does, and this tab
// was the worst offender: its panel carries the live steps AND the switched-off list, so
// its form sat below both.
//
// So these tests assert POSITION, not just presence. "A form exists somewhere on the
// page" is exactly what was true on the day the bug was reported.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmStaircase = require('../../components/firm/FirmStaircase.vue').default

const BASE = {
  defaultCeiling: 'moderate',
  steps: [
    { id: 'as-compliance', step: 1, name: 'Compliance', selectorDescription: 'Historic reporting', complexityCeiling: 'simple' },
    { id: 'as-interpretation', step: 2, name: 'Interpretation', selectorDescription: 'The numbers explained', complexityCeiling: 'moderate' },
    { id: 'as-advisory', step: 3, name: 'Advisory', selectorDescription: 'Forward-looking work', complexityCeiling: 'complex' }
  ]
}

function payload (overrides) {
  return Object.assign({
    base: BASE,
    state: { declinedIds: [], overrides: {}, ownRows: [] },
    resolved: BASE.steps.map(s => ({ ...s, source: 'platform' })),
    driftIds: [],
    defaultCeiling: 'moderate',
    history: []
  }, overrides)
}

/** Let load() and loadHistory() settle — several microtask turns, as in the Quizzes suite. */
async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountTab (body) {
  const data = payload(body)
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }))
  const wrapper = mountWithBuefy(FirmStaircase, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('editing a step happens in the step', () => {
  test('clicking Edit opens the form INSIDE that step, not at the foot of the panel', async () => {
    const wrapper = await mountTab()

    const second = wrapper.findAll('.staircase-step').at(1)
    expect(second.text()).toContain('Interpretation')

    await wrapper.vm.openForm({ id: 'as-interpretation', name: 'Interpretation', selectorDescription: 'x', complexityCeiling: 'moderate' })
    await wrapper.vm.$nextTick()

    // The form is in the step the manager clicked…
    const editedStep = wrapper.findAll('.staircase-step').at(1)
    expect(editedStep.classes()).toContain('is-editing')
    expect(editedStep.find('.staircase-step-form').exists()).toBe(true)

    // …and NOT in the add-form box at the bottom. This is the assertion that would
    // have failed before the ruling, when both were the same box.
    expect(wrapper.find('.staircase-form').exists()).toBe(false)
  })

  test('only the step being edited becomes a form', async () => {
    // A form opening on every row is the other way to satisfy "a form is in a row",
    // and it would be just as confusing as one at the bottom.
    const wrapper = await mountTab()
    await wrapper.vm.openForm({ id: 'as-compliance', name: 'Compliance', selectorDescription: 'x', complexityCeiling: 'simple' })
    await wrapper.vm.$nextTick()

    const forms = wrapper.findAll('.staircase-step-form')
    expect(forms.length).toBe(1)
    expect(wrapper.findAll('.staircase-step').at(0).classes()).toContain('is-editing')
    expect(wrapper.findAll('.staircase-step').at(1).classes()).not.toContain('is-editing')
  })

  test('adding a step still opens the form at the END of the list, where the step will go', async () => {
    // The deliberate difference from editing, and the same rule Quizzes holds: a NEW
    // step has no row to open inside, and the end of the list is where it will appear.
    const wrapper = await mountTab()
    await wrapper.vm.openForm(null)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.staircase-form').exists()).toBe(true)
    expect(wrapper.findAll('.staircase-step.is-editing').length).toBe(0)
  })

  test('the Add step button stays on screen while a form is open', async () => {
    // It used to hide itself, which made a button vanishing at the top the only visible
    // response to clicking Edit — the cue that read as a fault on the Quizzes tab.
    const wrapper = await mountTab()
    await wrapper.vm.openForm({ id: 'as-compliance', name: 'Compliance', selectorDescription: 'x', complexityCeiling: 'simple' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('firmStaircase.addStep')
  })

  test('the form edits the step that was clicked, keyed on id and not position', async () => {
    // `step` is a position the backend renumbers when a step above is switched off, so
    // keying on it would open the form against the wrong row.
    const wrapper = await mountTab({
      state: { declinedIds: ['as-compliance'], overrides: {}, ownRows: [] },
      resolved: [
        { ...BASE.steps[1], step: 1, source: 'platform' },
        { ...BASE.steps[2], step: 2, source: 'platform' }
      ]
    })

    await wrapper.vm.openForm({ id: 'as-advisory', name: 'Advisory', selectorDescription: 'y', complexityCeiling: 'complex' })
    await wrapper.vm.$nextTick()

    const editing = wrapper.findAll('.staircase-step').filter(w => w.classes().includes('is-editing'))
    expect(editing.length).toBe(1)
    expect(editing.at(0).text()).toContain('firmStaircase.editStep')
    expect(wrapper.vm.isEditing({ id: 'as-advisory' })).toBe(true)
    expect(wrapper.vm.isEditing({ id: 'as-interpretation' })).toBe(false)
  })
})
