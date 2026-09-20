/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The document a client is handed — item 15.1, and the ruling of 2026-09-20.
 *
 * 🔴 WHY THESE EARN THEIR PLACE. Everything asserted here is a page that either
 * prints or does not print in a document that leaves the firm. A tester in UAT
 * sees the pages that ARE there; nobody can see a page that should not have been
 * printed until a client reads a sentence about their own session that is not
 * true. That is the same failure as the scope screen of 2026-09-20, which told
 * advisors their work would be lost.
 *
 * Mike's ruling admitted a new kind of concept: one with an approved drawing and
 * no fill-in table at all. It teaches and there is nothing to work, so the
 * document must print its teaching page and NOT a capture page reading "not
 * worked through yet", and must not announce Action points that never arrive.
 *
 * Not asserted: wording, styling, or the order of anything on a page.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyPlanDocument = require('~/components/strategy/StrategyPlanDocument.vue').default

/** A concept with a real fill-in table behind it. */
const WITH_TABLE = {
  key: 'fw-profit-levers',
  conceptId: 'the-8-profit-levers',
  hasTable: true,
  name: 'The 8 Profit Levers',
  summary: 'This concept explains the accumulative effect of incremental changes.',
  instruction: 'Identify one task per lever.',
  prompts: [{ key: 'p1', label: 'Number of Foot-traffic', prompt: 'Gain their attention.' }],
  lines: [{ key: 'the-8-profit-levers::f1', label: 'Lever 1', value: '' }]
}

/** A concept admitted on its drawing alone — no workbook anywhere. */
const DRAWING_ONLY = {
  key: 'vertical-integration#1',
  conceptId: 'vertical-integration',
  hasTable: false,
  name: 'Vertical Integration',
  summary: 'This concept explores the supply and distribution chain.',
  instruction: '',
  prompts: [],
  lines: []
}

function mountPlan (items) {
  return mountWithBuefy(StrategyPlanDocument, {
    propsData: {
      clientName: 'Harbour Joinery Limited',
      steps: [{ name: 'Where we are', items, teaches: true, works: items.some(i => i.hasTable !== false) }]
    }
  })
}

describe('a concept with nothing to fill in still teaches', () => {
  test('its teaching page prints', () => {
    const wrapper = mountPlan([DRAWING_ONLY])

    expect(wrapper.findAll('.is-teach').length).toBe(1)
  })

  test('no capture page is printed for it', () => {
    const wrapper = mountPlan([DRAWING_ONLY])

    // A capture page here would tell the client their session was "not worked
    // through yet" when there was never anything to work through.
    expect(wrapper.findAll('.is-capture').length).toBe(0)
  })

  test('a step of nothing but these does not announce Action points', () => {
    const wrapper = mountPlan([DRAWING_ONLY])

    // One divider to open the step, never a second announcing pages that never come.
    expect(wrapper.findAll('.is-divider').length).toBe(1)
  })
})

describe('a concept with a table is unchanged by the ruling', () => {
  test('it prints both a teaching page and a capture page', () => {
    const wrapper = mountPlan([WITH_TABLE])

    expect(wrapper.findAll('.is-teach').length).toBe(1)
    expect(wrapper.findAll('.is-capture').length).toBe(1)
  })

  test('a step holding both kinds still announces Action points', () => {
    const wrapper = mountPlan([DRAWING_ONLY, WITH_TABLE])

    expect(wrapper.findAll('.is-divider').length).toBe(2)
    expect(wrapper.findAll('.is-capture').length).toBe(1)
  })
})

describe('the drawing reaches the client, not only the advisor', () => {
  test('a teaching page carries the concept\'s approved drawing', () => {
    const wrapper = mountPlan([WITH_TABLE])

    expect(wrapper.find('.is-teach svg').exists()).toBe(true)
  })

  test('the firm on it is the firm passed in', () => {
    const wrapper = mountWithBuefy(StrategyPlanDocument, {
      propsData: {
        clientName: 'Harbour Joinery Limited',
        firmName: 'Ashgrove Advisory',
        firmColour: '#7a4b8f',
        steps: [{ name: 'Where we are', items: [WITH_TABLE], teaches: true, works: true }]
      }
    })
    const html = wrapper.html()

    expect(html).toContain('Ashgrove Advisory')
    expect(html).not.toContain('Hartley')
  })
})

describe('a step with nothing in it survives', () => {
  test('it still prints its divider, because it is on the agenda', () => {
    const wrapper = mountWithBuefy(StrategyPlanDocument, {
      propsData: {
        clientName: 'Harbour Joinery Limited',
        steps: [{ name: 'Do it and review it', items: [], teaches: false, works: false }]
      }
    })

    // Pivot's step 5 has no slides and is still a step. Deleting it here would
    // quietly remove the page the step builder exists to make possible.
    expect(wrapper.findAll('.is-divider').length).toBe(1)
  })
})
