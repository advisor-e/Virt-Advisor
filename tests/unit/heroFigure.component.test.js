/**
 * @jest-environment jsdom
 */
'use strict'

const { shallowMount } = require('@vue/test-utils')
const HeroFigure = require('~/components/base/HeroFigure.vue').default

/**
 * Smoke test for the component-test toolchain (TEST-GAP, design/ACTIONS.md).
 *
 * HeroFigure is the right first subject: it is pure presentation, has no Buefy
 * dependency and no backend call, and its template is Pug — so a pass here proves the
 * whole chain end to end (Jest → @vue/vue2-jest → pug → @vue/test-utils → the `~/`
 * alias), which is exactly what could not be proven before the tooling existed.
 */
describe('HeroFigure (component-toolchain smoke test)', () => {
  it('renders its label, value and sub-line from props', () => {
    const wrapper = shallowMount(HeroFigure, {
      propsData: { label: 'Annual revenue', value: '$1,234', sub: 'last 12 months' }
    })
    expect(wrapper.find('.hk').text()).toBe('Annual revenue')
    expect(wrapper.find('.hv').text()).toBe('$1,234')
    expect(wrapper.find('.hs2').text()).toBe('last 12 months')
  })

  it('appends the unit only when one is given', () => {
    const without = shallowMount(HeroFigure, { propsData: { label: 'Cover', value: '∞' } })
    expect(without.find('.hv .u').exists()).toBe(false)

    const with_ = shallowMount(HeroFigure, { propsData: { label: 'Cover', value: '4.2', unit: 'months' } })
    expect(with_.find('.hv .u').text()).toBe('months')
  })

  it('applies the colour tone class, and none for the default', () => {
    const crit = shallowMount(HeroFigure, { propsData: { label: 'Cash', value: '-$500', tone: 'crit' } })
    expect(crit.find('.hv').classes()).toContain('crit')

    const plain = shallowMount(HeroFigure, { propsData: { label: 'Cash', value: '$500' } })
    expect(plain.find('.hv').classes()).toEqual(['hv'])
  })
})
