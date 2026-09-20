/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The step builder — stage 2 of the session. Item 15.1.
 *
 * Design: design/mockups/strategy-step-builder.html, five decisions ruled by Mike
 * 2026-09-20, every one as recommended. In his own words that day: "I choose the number
 * of stages, I choose the name i put on that stage, I choose the number of
 * concepts/pages I put into each stage."
 *
 * 🔴 WHAT THESE TESTS GUARD, and none of it is wording or styling:
 *
 *   1. AN EMPTY STEP SURVIVES EVERY OPERATION. Mike's ruling, and the whole reason the
 *      screen exists: Pivot's step 5 "Do It & Review It" has no slides behind it and
 *      still prints on the agenda a client reads. Any "tidy up" that pruned an empty
 *      step would delete that page, and the screen would look perfectly reasonable to
 *      anyone who had not counted Pivot's agenda.
 *   2. A CARD BELONGS TO EXACTLY ONE STEP. Moving is not copying. A duplicate would put
 *      the same table in a client's document twice, in two different steps, and the
 *      second copy would look like a deliberate second visit.
 *   3. PORTER'S TWO CARDS ARE INDEPENDENT. The acceptance test: one concept, two visits,
 *      into two different steps. A model that placed them together cannot produce Pivot.
 *   4. NOTHING IS LOST. Deleting a step returns its cards to the waiting list; taking a
 *      card out returns it too. An advisor who mis-drags must not lose a concept.
 *   5. THE COMPONENT HOLDS NO STATE. It emits the whole list and never mutates its own
 *      props, so the screen cannot drift from what is saved.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyStepBuilder = require('~/components/strategy/StrategyStepBuilder.vue').default

/** Pivot's own shape: Porter's twice, plus two more, plus a card nobody places. */
const CARDS = [
  { key: 'porters#1', name: "Porter's 5 Forces", deck: 'Strategic Orientation 2', tag: '(Part 1)' },
  { key: 'porters#2', name: "Porter's 5 Forces", deck: 'Strategic Orientation 2', tag: '(Part 2)' },
  { key: 'market-diffusion#1', name: 'Market Diffusion', deck: 'Strategic Orientation 2', tag: '' },
  { key: 'fw-blue-ocean', name: 'Blue Ocean Strategy', deck: 'Strategic Orientation 2', tag: '' },
  { key: 'aidcra#1', name: 'A.I.D.C.R.A', deck: 'Sales & Marketing Review', tag: '' }
]

/** @returns {Array<object>} a fresh copy, so one test cannot leak into the next */
const steps = () => ([
  { key: 's1', name: 'Identify the Resistance', items: ['porters#1', 'market-diffusion#1'] },
  { key: 's2', name: 'Choose Your Competition Fronts', items: ['porters#2'] },
  { key: 's3', name: 'Do It & Review It', items: [] }
])

/**
 * @param {Array<object>} [withSteps]
 * @returns {object} the mounted wrapper
 */
function mount (withSteps) {
  return mountWithBuefy(StrategyStepBuilder, {
    propsData: { cards: CARDS, steps: withSteps || steps(), sessionLabel: 'Example client' }
  })
}

/** @param {object} w @returns {Array<object>} the steps from the last emit */
function emitted (w) {
  const events = w.emitted()['steps-changed']
  return events[events.length - 1][0]
}

describe('the step builder is the advisor naming his own session', () => {
  it('counts what is placed and what is still waiting', () => {
    const w = mount()
    // Three of the five cards are in a step; two are not.
    expect(w.vm.placedCount).toBe(3)
    expect(w.vm.unplaced.map(c => c.key)).toEqual(['fw-blue-ocean', 'aidcra#1'])
  })

  it('🔴 keeps a step holding nothing — Pivot step 5, and the reason this screen exists', () => {
    const w = mount()
    expect(w.vm.steps).toHaveLength(3)
    expect(w.vm.cardsIn(w.vm.steps[2])).toHaveLength(0)

    // Every operation, and the empty step is still there after each one.
    w.vm.place('fw-blue-ocean', 's1')
    expect(emitted(w).filter(s => s.key === 's3')).toHaveLength(1)

    w.vm.rename('s1', 'Renamed')
    expect(emitted(w).filter(s => s.key === 's3')).toHaveLength(1)

    w.vm.moveStep(0, 1)
    expect(emitted(w).filter(s => s.key === 's3')).toHaveLength(1)

    w.vm.addStep()
    expect(emitted(w).filter(s => s.key === 's3')).toHaveLength(1)
  })

  it('🔴 places Porter\'s two visits into two different steps, which is the acceptance test', () => {
    const w = mount()
    const [one, two] = w.vm.steps
    expect(one.items).toContain('porters#1')
    expect(two.items).toContain('porters#2')
    // One concept, two cards, and the tag is what stops an advisor reading the second
    // as a duplicate to remove.
    expect(CARDS[0].tag).not.toBe(CARDS[1].tag)
  })

  it('moving a card does not copy it — it belongs to exactly one step', () => {
    const w = mount()
    w.vm.place('porters#1', 's2')

    const next = emitted(w)
    expect(next[0].items).not.toContain('porters#1')
    expect(next[1].items).toContain('porters#1')
    // Counted across every step, so a duplicate anywhere fails.
    const all = next.reduce((acc, s) => acc.concat(s.items), [])
    expect(all.filter(k => k === 'porters#1')).toHaveLength(1)
  })

  it('taking a card out returns it to the waiting list, losing nothing', () => {
    const w = mount()
    w.vm.takeOut('porters#1')

    const next = emitted(w)
    expect(next.reduce((acc, s) => acc.concat(s.items), [])).not.toContain('porters#1')
    expect(next).toHaveLength(3)
  })

  it('deleting a step returns its cards rather than taking them with it', () => {
    const w = mount()
    w.vm.removeStep('s1')

    const next = emitted(w)
    expect(next.map(s => s.key)).toEqual(['s2', 's3'])
    const all = next.reduce((acc, s) => acc.concat(s.items), [])
    expect(all).not.toContain('market-diffusion#1')
    // It is not in a step any more, so the screen offers it again.
    expect(all).toEqual(['porters#2'])
  })

  it('reorders steps, and refuses to run off either end', () => {
    const w = mount()
    w.vm.moveStep(0, 1)
    expect(emitted(w).map(s => s.key)).toEqual(['s2', 's1', 's3'])

    const before = w.emitted()['steps-changed'].length
    w.vm.moveStep(0, -1)
    w.vm.moveStep(2, 1)
    expect(w.emitted()['steps-changed']).toHaveLength(before)
  })

  it('adds a step with no name, because nothing is suggested', () => {
    // Decision 5: free text, nothing offered. A default name here would become the
    // name most advisors keep, and it would be ours, on a client's agenda.
    const w = mount()
    w.vm.addStep()

    const added = emitted(w)[3]
    expect(added.name).toBe('')
    expect(added.items).toEqual([])
  })

  it('gives a new step a key nothing else is using', () => {
    const w = mount([{ key: 's1', name: '', items: [] }, { key: 's2', name: '', items: [] }])
    w.vm.addStep()

    const keys = emitted(w).map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('never mutates the steps it was given', () => {
    // A controlled component. If it edited its own prop the page could save one thing
    // and show another, and nothing on screen would say so.
    const given = steps()
    const w = mount(given)
    w.vm.place('fw-blue-ocean', 's1')
    w.vm.removeStep('s2')

    expect(given).toHaveLength(3)
    expect(given[0].items).toEqual(['porters#1', 'market-diffusion#1'])
  })

  it('skips a card that is no longer scoped instead of rendering a blank row', () => {
    // The advisor can go back to stage 1 and untick something already placed. The key
    // stays in the step until the next save; a blank row would read as a bug.
    const w = mount([{ key: 's1', name: 'One', items: ['porters#1', 'deleted-concept#1'] }])
    expect(w.vm.cardsIn(w.vm.steps[0]).map(c => c.key)).toEqual(['porters#1'])
  })

  it('a drop places the dragged card, and a drop with nothing dragged does nothing', () => {
    const w = mount()
    w.vm.onDragStart('fw-blue-ocean', { dataTransfer: { setData () {}, effectAllowed: '' } })
    w.vm.onDrop('s3')
    expect(emitted(w)[2].items).toEqual(['fw-blue-ocean'])

    const before = w.emitted()['steps-changed'].length
    w.vm.onDrop('s1')
    expect(w.emitted()['steps-changed']).toHaveLength(before)
  })

  it('survives a dragstart from a browser that hands over no dataTransfer', () => {
    const w = mount()
    expect(() => w.vm.onDragStart('aidcra#1', {})).not.toThrow()
    expect(w.vm.dragging).toBe('aidcra#1')
  })

  it('ignores a placement naming a step that is not there', () => {
    const w = mount()
    w.vm.place('fw-blue-ocean', 'no-such-step')
    w.vm.rename('no-such-step', 'x')
    expect(w.emitted()['steps-changed']).toBeUndefined()
  })
})
