/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The drawing actually renders — item 15.7.
 *
 * 🔴 WHY THIS EARNS ITS PLACE. The SVG sits in a Pug raw-text block so that it
 * reaches the compiler unchanged, and NOTHING IN THIS REPOSITORY BUILDS THE APP
 * — `nuxt build` is the master team's gate, twice, after we have told them a
 * version is ready. A template that does not compile would therefore leave here
 * green and fail at their gate. Mounting one generated component closes that with
 * no new tooling.
 *
 * It also pins the seam the whole item exists for: the firm's mark is a PROP, so
 * a client's plan carries the advisor's firm and never Advisor-e's. That is
 * Mike's ruling of 2026-09-18 and it is the reason these are drawn rather than
 * photographed.
 *
 * Not asserted: anything about how the drawing looks. A person sees that.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyConceptGraphic = require('~/components/strategy/StrategyConceptGraphic.vue').default
const RiskRewardMatrix = require('~/components/strategy/concepts/RiskRewardMatrix.vue').default

describe('a generated drawing compiles and renders', () => {
  test('the SVG survives the Pug raw block', () => {
    const wrapper = mountWithBuefy(RiskRewardMatrix, {
      propsData: { firmName: 'Ashgrove Advisory', firmInitial: 'A', firmColour: '#7a4b8f' }
    })

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('viewBox')).toBe('0 0 1500 844')
  })

  test('the firm mark is the firm passed in, not the one on the mockup', () => {
    const wrapper = mountWithBuefy(RiskRewardMatrix, {
      propsData: { firmName: 'Ashgrove Advisory', firmInitial: 'A', firmColour: '#7a4b8f' }
    })
    const html = wrapper.html()

    expect(html).toContain('Ashgrove Advisory')
    expect(html).toContain('#7a4b8f')
    expect(html).not.toContain('Hartley')
  })
})

describe('the resolver shows a drawing only where one was approved', () => {
  test('a concept with no drawing renders nothing at all', () => {
    const wrapper = mountWithBuefy(StrategyConceptGraphic, {
      propsData: { conceptId: 'drafting-tender-proposals' }
    })

    // Deliberately not drawn — Mike's own summary calls it general reading. The
    // screen falls back to his words, which is what all 52 did before 15.7.
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  test('an empty concept id renders nothing rather than guessing', () => {
    const wrapper = mountWithBuefy(StrategyConceptGraphic, {
      propsData: { conceptId: '' }
    })

    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
