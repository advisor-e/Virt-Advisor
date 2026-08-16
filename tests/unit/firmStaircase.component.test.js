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

// ── The advisor's question (item 4.16 E, 2026-08-16) ──────────────────────────
// Wiring this to the AI without a screen would have been half a fix: the content
// would drive advice that nobody could inspect or correct — the exact state the
// 4.16 sweep found at scale. These prove the screen half is real, on the tab both
// the mentor and a firm manager already have.

describe('the question an advisor is asked', () => {
  test('the field is on the tab, below the steps and above the ceiling', async () => {
    // Position is asserted, not just presence: the question is what happens FIRST in
    // the conversation, and its hint tells the reader the steps are above it.
    const wrapper = await mountTab()
    const html = wrapper.html()

    const question = html.indexOf('firmStaircase.selectorPrompt')
    const ceiling = html.indexOf('firmStaircase.defaultCeiling')
    const lastStep = html.lastIndexOf('staircase-step-badge')

    expect(question).toBeGreaterThan(-1)
    expect(question).toBeGreaterThan(lastStep)
    expect(question).toBeLessThan(ceiling)
  })

  test('it is a text area, so a longer question is not hidden past the end of a line', async () => {
    const wrapper = await mountTab()

    expect(wrapper.findAll('textarea').length).toBeGreaterThan(0)
  })

  test('it shows the RESOLVED question — what this firm advisors are actually asked', async () => {
    const wrapper = await mountTab({ selectorPrompt: 'Where are we with this client?' })

    expect(wrapper.vm.selectorPrompt).toBe('Where are we with this client?')
  })

  test('a firm that has written none of its own sees the inherited one, never a blank box', async () => {
    // A blank box reads as "nobody has set this", which would be untrue — the advisor
    // is being asked the mentor's question right now.
    const wrapper = await mountTab({
      selectorPrompt: null,
      base: { ...BASE, selectorPrompt: 'The platform question?' }
    })

    expect(wrapper.vm.selectorPrompt).toBe('The platform question?')
  })

  test('Save sends the question AND the ceiling — one key, one button', async () => {
    // Sending only the edited one would drop the other from the stored object.
    const wrapper = await mountTab({ selectorPrompt: 'Where are we with this client?' })
    wrapper.vm.selectorPrompt = 'How deep is this relationship?'

    global.fetch.mockClear()
    await wrapper.vm.saveCeiling()

    const posted = global.fetch.mock.calls
      .map(c => c[1])
      .filter(o => o && o.method === 'POST')
      .map(o => JSON.parse(o.body))

    expect(posted.length).toBeGreaterThan(0)
    expect(posted[0].staircase).toEqual({
      defaultCeiling: 'moderate',
      selectorPrompt: 'How deep is this relationship?'
    })
  })
})
