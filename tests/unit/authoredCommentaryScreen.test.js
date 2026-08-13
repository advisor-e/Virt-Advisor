/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmDomainSupport = require('~/components/firm/FirmDomainSupport.vue').default

/**
 * The marking control on the Domain Support screen — the approved artefact is
 * design/mockups/domain-support-authored-commentary.html §§2–3.
 *
 * Four claims that the mechanism rests on:
 *
 *   1. A note shows under a step only while its exact words are still there.
 *      Rewrite the sentence and the attribution retires itself.
 *   2. Marking never retypes the words. They come from the live highlight, so
 *      a mark that does not match its sentence cannot be created.
 *   3. Marks survive an edit to a DIFFERENT step. Dropping them on load or save
 *      would silently lose the record — the failure this feature exists to end.
 *   4. Who may mark is gated by naming the tier POSITIVELY. Tier Cascade P5:
 *      a gate written as a negative answers yes for a tier that does not exist
 *      yet and switches itself on the day one is added.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

function defaultList () {
  return {
    doTheJob: [{ id: 'eoy', label: 'End of Year', supportTools: 1, origin: 'platform' }],
    getTheJob: [],
    getOrganised: []
  }
}

/** One material whose step 2 carries a clause we authored. */
function markedDetail () {
  return {
    domain: 'eoy',
    label: 'end of year meetings',
    materials: [
      {
        name: 'EOY Meeting Agenda',
        summary: 'The standard End of Year meeting structure.',
        who_when: 'General commercial business clients.',
        steps: [
          'Set the agenda.',
          'Conduct the accounts review, so the owner sees the year before judging it.'
        ],
        authored_commentary: [
          {
            text: 'so the owner sees the year before judging it',
            checked: '2026-08-14',
            searched: 'all 115 firm documents — zero matches'
          }
        ]
      }
    ]
  }
}

function stubFetch (details) {
  global.fetch = jest.fn((url) => {
    const u = String(url)
    let data = {}
    if (/\/domain-support\/[^/]+\/history/.test(u)) {
      data = { history: [] }
    } else if (/\/domain-support\/([^/?]+)$/.test(u)) {
      data = details
    } else if (/\/domain-support$/.test(u)) {
      data = defaultList()
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
  })
}

async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function openScreen (scope) {
  stubFetch(markedDetail())
  const wrapper = mountWithBuefy(FirmDomainSupport, {
    propsData: { apiToken: 'test-token', scope: scope || 'firm' }
  })
  await settle(wrapper)
  await wrapper.vm.select({ id: 'eoy', label: 'End of Year', origin: 'platform' })
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the note under a step', () => {
  test('shows the marked words, labelled', async () => {
    const wrapper = await openScreen()

    expect(wrapper.text()).toContain('firmDomainSupport.markedLabel')
    expect(wrapper.text()).toContain('so the owner sees the year before judging it')
  })

  test('retires itself when the sentence is rewritten', async () => {
    const wrapper = await openScreen()
    const material = wrapper.vm.form.materials[0]

    // $set is what `v-model="material.steps[sIndex]"` itself compiles to in
    // Vue 2 — a plain `steps[1] = ...` is not reactive and would test nothing.
    wrapper.vm.$set(material.steps, 1, 'Conduct the accounts review.')
    await wrapper.vm.$nextTick()

    // The words are gone, so the claim about who wrote them goes with them —
    // no stale label pointing at text nobody wrote.
    expect(wrapper.vm.marksIn(material, material.steps[1])).toEqual([])
    expect(wrapper.text()).not.toContain('firmDomainSupport.markedLabel')
  })

  test('is not attached to a step number, so reordering cannot move it', async () => {
    const wrapper = await openScreen()
    const material = wrapper.vm.form.materials[0]

    wrapper.vm.moveStep(material, 1, -1)
    await wrapper.vm.$nextTick()

    expect(material.steps[0]).toContain('so the owner sees the year before judging it')
    expect(wrapper.vm.marksIn(material, material.steps[0])).toHaveLength(1)
    expect(wrapper.vm.marksIn(material, material.steps[1])).toEqual([])
  })
})

describe('making a mark', () => {
  test('takes the words from the live highlight, never from typing', async () => {
    const wrapper = await openScreen('mentor')
    const material = wrapper.vm.form.materials[0]

    wrapper.vm.captureSelection(
      { target: { value: material.steps[0], selectionStart: 4, selectionEnd: 14 } }, 0, 0
    )
    wrapper.vm.markSelection(material, 0, 0)

    const added = material.authored_commentary.find(m => m.text === 'the agenda')
    expect(added).toBeTruthy()
    // Whatever was marked came out of the sentence, so it is in the sentence.
    expect(material.steps[0]).toContain(added.text)
  })

  test('records honestly that no corpus search stands behind a screen mark', async () => {
    const wrapper = await openScreen('mentor')
    const material = wrapper.vm.form.materials[0]

    wrapper.vm.captureSelection(
      { target: { value: material.steps[0], selectionStart: 4, selectionEnd: 14 } }, 0, 0
    )
    wrapper.vm.markSelection(material, 0, 0)

    const added = material.authored_commentary.find(m => m.text === 'the agenda')
    expect(added.searched).toMatch(/no corpus search/i)
    expect(added.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('does nothing when nothing is highlighted', async () => {
    const wrapper = await openScreen('mentor')
    const material = wrapper.vm.form.materials[0]
    const before = material.authored_commentary.length

    wrapper.vm.markSelection(material, 0, 0)

    expect(material.authored_commentary).toHaveLength(before)
  })

  test('the same words are never marked twice', async () => {
    const wrapper = await openScreen('mentor')
    const material = wrapper.vm.form.materials[0]

    const select = () => wrapper.vm.captureSelection(
      { target: { value: material.steps[0], selectionStart: 4, selectionEnd: 14 } }, 0, 0
    )
    select(); wrapper.vm.markSelection(material, 0, 0)
    select(); wrapper.vm.markSelection(material, 0, 0)

    expect(material.authored_commentary.filter(m => m.text === 'the agenda')).toHaveLength(1)
  })

  test('unmarking removes the claim and leaves the sentence alone', async () => {
    const wrapper = await openScreen('mentor')
    const material = wrapper.vm.form.materials[0]
    const step = material.steps[1]

    wrapper.vm.unmark(material, material.authored_commentary[0])

    expect(material.authored_commentary).toEqual([])
    expect(material.steps[1]).toBe(step)
  })
})

describe('who may mark', () => {
  test('the platform may', async () => {
    const wrapper = await openScreen('mentor')
    expect(wrapper.vm.canMark).toBe(true)
    expect(wrapper.text()).toContain('firmDomainSupport.markButton')
  })

  test('a firm reads the note but has no control', async () => {
    const wrapper = await openScreen('firm')
    expect(wrapper.vm.canMark).toBe(false)
    expect(wrapper.text()).toContain('firmDomainSupport.markedLabel')
    expect(wrapper.text()).not.toContain('firmDomainSupport.markButton')
  })

  test('a tier nobody has thought about yet does NOT get it by default', async () => {
    // The Tier Cascade P5 trap, pinned. Written as `!== 'firm'` this passes for
    // 'global' and 'group' silently — the exact way three tabs once switched
    // themselves on at tiers they were never designed for.
    for (const scope of ['global', 'group']) {
      const wrapper = await openScreen(scope)
      expect(wrapper.vm.canMark).toBe(false)
    }
  })
})

describe('marks survive the round trip', () => {
  test('an edit to a different step does not strip them', async () => {
    const wrapper = await openScreen('firm')
    const material = wrapper.vm.form.materials[0]

    wrapper.vm.$set(material.steps, 0, 'Set the agenda and circulate it.')
    const saved = wrapper.vm.cleanMaterials(wrapper.vm.form.materials)

    expect(saved[0].authored_commentary).toHaveLength(1)
    expect(saved[0].authored_commentary[0].text).toBe('so the owner sees the year before judging it')
  })

  test('an orphaned mark is dropped rather than stored', async () => {
    const wrapper = await openScreen('firm')
    const material = wrapper.vm.form.materials[0]

    wrapper.vm.$set(material.steps, 1, 'Conduct the accounts review.')
    const saved = wrapper.vm.cleanMaterials(wrapper.vm.form.materials)

    // Storing it would leave a claim in the data that nothing displays and
    // nobody can remove.
    expect(saved[0].authored_commentary).toBeUndefined()
  })

  test('a material with no marks saves the shape it always did', async () => {
    const wrapper = await openScreen('firm')
    wrapper.vm.form.materials[0].authored_commentary = []

    const saved = wrapper.vm.cleanMaterials(wrapper.vm.form.materials)

    expect(Object.keys(saved[0]).sort()).toEqual(['name', 'steps', 'summary', 'who_when'])
  })
})
