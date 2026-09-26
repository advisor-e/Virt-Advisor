/**
 * @jest-environment jsdom
 */

/**
 * A step's purpose reaches the advisor, and never the client — item 15.27.
 *
 * From the approved drawing, design/mockups/strategy-session-process.html: "Written by the
 * mentor. The advisor sees it as a tooltip; the client never does." Before this item the
 * mentor's screen saved it and every step below dropped it — the seed, both saves and the
 * store — so a purpose a mentor wrote reached no advisor, and nothing said why.
 *
 * ⚠ UAT CANNOT SEE THIS FAIL TODAY. Every shipped purpose is empty (they are Mike's
 * wording), so a broken chain and a working one show the identical screen. The store's
 * half is pinned in strategySessionStore.test.js.
 */

'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const Page = require('../../pages/strategy-planner.vue').default
const StrategyStepBuilder = require('~/components/strategy/StrategyStepBuilder.vue').default

const NOTE = 'Find out what is stopping the business growing before choosing a front.'

describe('the page carries the purpose from the handed-down step to the save', () => {
  const handedDown = {
    steps: [
      { name: 'Identify the Resistance', purpose: NOTE, items: ['porters'] },
      { name: 'Do It & Review It', purpose: '', items: [] }
    ]
  }

  function seeded () {
    const vm = { planStepDefs: [], sessionProcess: handedDown, placeableCards: [{ key: 'porters' }] }
    Page.methods.seedSteps.call(vm)
    return vm
  }

  test('a handed-down step arrives with its purpose', () => {
    expect(seeded().planStepDefs.map(s => s.purpose)).toEqual([NOTE, ''])
  })

  test('🔴 the save sends it — leaving it out is how it was lost, one save after it arrived', () => {
    const sent = Page.methods.stepsToSave(seeded().planStepDefs)
    expect(sent[0]).toEqual({ name: 'Identify the Resistance', items: ['porters'], purpose: NOTE })
  })

  test('🔴 the client\'s plan is built without it', () => {
    const vm = Object.assign(seeded(), { $t: k => k })
    vm.placeableCards = [{ key: 'porters', summary: '', prompts: [] }]
    const plan = Page.computed.planSteps.call(vm)
    expect(JSON.stringify(plan)).not.toContain(NOTE)
  })
})

describe('the advisor reads it as a tooltip beside the step\'s name', () => {
  const mount = (steps, showPurpose) => mountWithBuefy(StrategyStepBuilder, {
    propsData: { cards: [], steps, sessionLabel: 'Example client', showPurpose: !!showPurpose }
  })
  const withNote = () => [
    { key: 's1', name: 'Identify the Resistance', purpose: NOTE, items: [] },
    { key: 's2', name: 'Do It & Review It', purpose: '', items: [] }
  ]

  test('only the step that has one carries the mark, and its text is the mentor\'s', () => {
    const w = mount(withNote())
    const steps = w.findAll('.ssb-step')
    expect(steps.at(0).find('.ssb-purpose-mark').exists()).toBe(true)
    expect(steps.at(0).find('.ssb-purpose-mark').attributes('aria-label')).toContain(NOTE)
    expect(steps.at(1).find('.ssb-purpose-mark').exists()).toBe(false)
  })

  test('the manager writing it gets the box to write in, not a tooltip of their own words', () => {
    expect(mount(withNote(), true).find('.ssb-purpose-mark').exists()).toBe(false)
  })

  test('moving a card on the advisor\'s screen keeps the purpose it cannot see to edit', () => {
    const w = mount(withNote())
    w.vm.place('porters', 's2')
    const events = w.emitted()['steps-changed']
    expect(events[events.length - 1][0][0].purpose).toBe(NOTE)
  })
})
