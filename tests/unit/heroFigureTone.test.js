/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const HeroFigure = require('~/components/base/HeroFigure.vue').default
const { computeVolatility } = require('~/server/report/volatilityModel')

/**
 * The headline figure's tone must accept every band the models can produce.
 *
 * 'warn' was missing until 2026-08-31. The Volatility model has always returned
 * good / warn / crit — the workbook's own three gauge bands — but the validator knew only
 * two, so a business scoring between 50 and 75 logged a Vue warning nobody reads and
 * rendered its headline figure plain white. Every sample series in the repo scores in the
 * red band, so no test and no screenshot could show it; it took a real client export
 * (67.96) landing in the middle band to expose it.
 */
describe('HeroFigure — tone', () => {
  const bands = ['default', 'crit', 'warn', 'good', 'muted']

  it('accepts every tone without a Vue warning', () => {
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {})
    for (const tone of bands) {
      mountWithBuefy(HeroFigure, { propsData: { label: 'L', value: '1', tone } })
    }
    const validatorWarnings = warn.mock.calls.map(c => String(c[0])).filter(m => /custom validator/.test(m))
    expect(validatorWarnings).toEqual([])
    warn.mockRestore()
  })

  it('colours the figure for each toned band', () => {
    for (const tone of ['crit', 'warn', 'good', 'muted']) {
      const w = mountWithBuefy(HeroFigure, { propsData: { label: 'L', value: '1', tone } })
      expect(w.find('.hv').classes()).toContain(tone)
    }
  })

  it('every band the Volatility model can return is a valid tone', () => {
    // The real guard: if the model gains a band, this fails rather than the screen
    // silently losing its colour.
    const produced = new Set()
    for (const level of [1, 12, 30, 60, 90]) {
      const sales = new Array(12).fill(10000).map((v, i) => v + (i % 2 ? level * 100 : -level * 100))
      produced.add(computeVolatility({ sales, window: 12 }).scoreBand)
    }
    for (const band of produced) { expect(bands).toContain(band) }
    expect(produced.size).toBeGreaterThan(1)
  })
})
