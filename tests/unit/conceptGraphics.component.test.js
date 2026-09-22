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

describe('the logo is the mark and the disc is the fallback', () => {
  // Mike's ruling, 2026-09-22. Rendered rather than read off the source,
  // because the thing that can go wrong is a `v-if` that compiles but does not
  // exclude — and then a firm gets its logo with its own initials printed on
  // top of it, on a document a client keeps.
  const FIRM = { firmName: 'Ashgrove Advisory', firmInitial: 'A', firmColour: '#7a4b8f' }
  const LOGO = 'https://cdn.example.com/ashgrove.png'

  test('a firm WITH a logo shows it, and shows no disc, initial or name', () => {
    const wrapper = mountWithBuefy(RiskRewardMatrix, {
      propsData: Object.assign({}, FIRM, { firmLogo: LOGO })
    })
    const html = wrapper.html()

    expect(wrapper.find('image.fm-logo').exists()).toBe(true)
    expect(html).toContain(LOGO)
    expect(wrapper.find('.fm-disc').exists()).toBe(false)
    expect(wrapper.find('.fm-init').exists()).toBe(false)
    expect(wrapper.find('.fm-name').exists()).toBe(false)
    expect(html).not.toContain('Ashgrove Advisory')
  })

  test('a firm WITHOUT a logo falls back to the disc exactly as before', () => {
    const wrapper = mountWithBuefy(RiskRewardMatrix, { propsData: FIRM })

    expect(wrapper.find('image.fm-logo').exists()).toBe(false)
    expect(wrapper.find('.fm-disc').exists()).toBe(true)
    expect(wrapper.find('.fm-name').text()).toBe('Ashgrove Advisory')
  })

  test('THE BORDER IS BRANDED EITHER WAY — a logo does not replace the colour', () => {
    // The fault that produced this ruling: the firm's colour drove ONE element,
    // the disc, so ruling the disc into a fallback left a branded firm's colour
    // with nowhere to appear at all.
    const withLogo = mountWithBuefy(RiskRewardMatrix, {
      propsData: Object.assign({}, FIRM, { firmLogo: LOGO })
    })
    const without = mountWithBuefy(RiskRewardMatrix, { propsData: FIRM })

    expect(withLogo.find('.firm-border').attributes('stroke')).toBe('#7a4b8f')
    expect(without.find('.firm-border').attributes('stroke')).toBe('#7a4b8f')
  })

  test('the wrapper passes the logo down, so a caller sets it in ONE place', () => {
    const wrapper = mountWithBuefy(StrategyConceptGraphic, {
      propsData: {
        conceptId: 'risk-reward-matrix',
        firmName: 'Ashgrove Advisory',
        firmColour: '#7a4b8f',
        firmLogo: LOGO
      },
      stubs: { RiskRewardMatrix: true }
    })

    expect(wrapper.props('firmLogo')).toBe(LOGO)
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
