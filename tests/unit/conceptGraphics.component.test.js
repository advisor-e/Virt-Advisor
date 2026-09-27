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

  test('THE FRAME IS BRANDED EITHER WAY — a logo does not replace the colour', () => {
    // The fault that produced this ruling: the firm's colour drove ONE element,
    // the disc, so ruling the disc into a fallback left a branded firm's colour
    // with nowhere to appear at all.
    //
    // ⚠ FIVE BARS SINCE 2026-09-23, not one stroked rect. Mike's page breaks its
    // foot so the logo stands in the gap, and neither a rounded rect nor a CSS
    // border can break — both were tried. All five take the colour, so a firm
    // whose colour reached only four would show a grey line on one edge.
    const withLogo = mountWithBuefy(RiskRewardMatrix, {
      propsData: Object.assign({}, FIRM, { firmLogo: LOGO })
    })
    const without = mountWithBuefy(RiskRewardMatrix, { propsData: FIRM })

    ;[withLogo, without].forEach((wrapper) => {
      const bars = wrapper.findAll('.firm-bar')
      expect(bars.length).toBe(5)
      for (let i = 0; i < bars.length; i++) {
        expect(bars.at(i).attributes('fill')).toBe('#7a4b8f')
      }
    })
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

// 🔴 THE AGENDA ON OUR SESSION OBJECTIVE IS THE SESSION'S STEP LIST — Mike, 2026-09-23.
// The page shipped with the slot and nothing handed it the steps, so for two days every
// client read Mike's four default lines whatever the advisor had named the steps. On screen
// that looks entirely finished, which is why it went unnoticed; this is the guard.
describe('the framing page\'s agenda is the session\'s own steps', () => {
  const settle = async (wrapper) => {
    for (let i = 0; i < 6; i++) { await new Promise(resolve => setTimeout(resolve, 0)); await wrapper.vm.$nextTick() }
  }
  // Since 2026-09-26 the agenda is SHEET 2, each step with its concepts beneath it (15.26).
  const STEPS = [
    { name: 'Identify the Resistance', children: ['Porter\'s 5 Forces', 'Market Diffusion Theory'] },
    { name: 'Choose Your Competition Fronts', children: [] }
  ]
  const STEP_NAMES = ['Identify the Resistance', 'Choose Your Competition Fronts']
  const agendaSheet = (agendaItems, sheet) => mountWithBuefy(StrategyConceptGraphic, {
    propsData: { conceptId: 'our-session-objective', sheet: sheet === undefined ? 1 : sheet, agendaItems }
  })

  test('the steps the advisor named, and the concepts in them, are the agenda the client reads', async () => {
    const wrapper = agendaSheet(STEPS)
    await settle(wrapper)

    const live = wrapper.find('.agenda-slot.is-live')
    expect(live.exists()).toBe(true)
    STEP_NAMES.forEach(name => expect(live.text()).toContain(name))
    expect(live.text()).toContain('Market Diffusion Theory')
  })

  test('with no steps named, the page shows Mike\'s own agenda as approved', async () => {
    const wrapper = agendaSheet([])
    await settle(wrapper)

    expect(wrapper.find('.agenda-slot.is-live').exists()).toBe(false)
    expect(wrapper.find('.agenda-slot').exists()).toBe(true)
  })

  test('🔴 the framing page carries no agenda at all — Mike: "on its own page"', async () => {
    const wrapper = agendaSheet(STEPS, 0)
    await settle(wrapper)

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('.agenda-slot').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('Identify the Resistance')
  })

  test('an agenda past three columns shows its later steps on the next sheet, not the first', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({
      name: 'Step ' + (i + 1), children: ['Concept A' + i, 'Concept B' + i, 'Concept C' + i, 'Concept D' + i]
    }))
    const first = agendaSheet(many, 1)
    const second = agendaSheet(many, 2)
    await settle(first)
    await settle(second)

    expect(first.find('.agenda-slot.is-live').text()).toContain('Step 1')
    expect(second.find('.agenda-slot.is-live').text()).toContain('Step 14')
    expect(second.find('.agenda-slot.is-live').text()).not.toContain('Concept A0')
  })

  test('a page with no agenda slot is never handed the steps', async () => {
    const wrapper = mountWithBuefy(StrategyConceptGraphic, {
      propsData: { conceptId: 'risk-reward-matrix', agendaItems: STEPS }
    })
    await settle(wrapper)

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('Identify the Resistance')
    expect(wrapper.html()).not.toMatch(/agenda-?items/i)
  })
})
