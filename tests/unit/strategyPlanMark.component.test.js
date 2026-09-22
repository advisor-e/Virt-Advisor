/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * THE ADVISOR FIRM'S MARK on a client's plan — item 16.2.
 *
 * 🔴 WHY THESE EARN THEIR PLACE. A tester in UAT sees a logo on a page and judges it
 * instantly. What they cannot see is the branch that decides WHICH mark is drawn, and
 * getting it wrong puts the wrong firm's identity on a document a client keeps:
 *   - a firm with a logo on file must never fall back to the initials disc, which is
 *     the fallback and never the design (Mike's ruling, 2026-09-22);
 *   - a firm with NO name must not be given a made-up initial — a made-up initial is a
 *     made-up firm, and it would print as somebody else's mark;
 *   - the disc must carry the firm's own colour, because that colour is the only thing
 *     distinguishing one firm's document from another's until the logo arrives.
 *
 * Not asserted: wording, styling, or where the mark sits — those are the approved
 * drawing's job (`design/mockups/strategy-plan-firm-mark.html`) and a tester's.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyPlanMark = require('~/components/strategy/StrategyPlanMark.vue').default

const mount = props => mountWithBuefy(StrategyPlanMark, { propsData: props })

describe('which mark is drawn', () => {
  test('a firm with a logo on file gets the logo, and no disc', () => {
    const w = mount({ name: 'Ashgrove Advisory', logo: 'https://cdn.example/ash.png', colour: '#7a4b8f' })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn.example/ash.png')
    expect(w.find('.spm-disc').exists()).toBe(false)
  })

  test('🔴 a firm with NO logo falls back to the disc — never a blank space', () => {
    const w = mount({ name: 'Ashgrove Advisory', logo: '', colour: '#7a4b8f' })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('.spm-disc').exists()).toBe(true)
    expect(w.find('.spm-disc').text()).toBe('A')
  })

  test('the disc carries the FIRM\'s colour, not the platform\'s', () => {
    const w = mount({ name: 'Ashgrove Advisory', logo: '', colour: '#7a4b8f' })
    // jsdom normalises a hex to rgb(), so the firm's #7a4b8f reads back as its
    // channels. Asserting the normalised form is asserting what the browser paints.
    expect(w.find('.spm-disc').attributes('style')).toContain('rgb(122, 75, 143)')
  })

  test('🔴 no firm name means NO initial — a made-up initial is a made-up firm', () => {
    const w = mount({ name: '', logo: '', colour: '#7a4b8f' })
    expect(w.find('.spm-disc').text()).toBe('')
  })

  test('a name of only spaces is treated as no name', () => {
    const w = mount({ name: '   ', logo: '', colour: '#7a4b8f' })
    expect(w.find('.spm-disc').text()).toBe('')
  })

  test('the initial is the first letter, upper-cased', () => {
    const w = mount({ name: 'harbour joinery advisory', logo: '', colour: '#7a4b8f' })
    expect(w.find('.spm-disc').text()).toBe('H')
  })

  test('the logo is given the firm name as its alt text, so a printed-to-PDF plan is readable', () => {
    const w = mount({ name: 'Ashgrove Advisory', logo: 'https://cdn.example/ash.png' })
    expect(w.find('img').attributes('alt')).toBe('Ashgrove Advisory')
  })
})
