/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const CostOfCapital = require('~/components/CostOfCapital.vue').default
const { computeCostOfCapital, WARN } = require('~/server/report/costOfCapitalModel')
const en = require('~/locales/en.json')

/**
 * Component test — CostOfCapital screen.
 *
 * The maths is golden-tested (costOfCapitalModel.test.js, 41 tests), the route at the
 * HTTP boundary (costOfCapitalRoute.test.js, 6) and the headline/frame/badge shape by the
 * four consistency guards. This suite covers only what the SCREEN can get wrong:
 *
 *   1. the display→decimal rate conversion (a missed ÷100 sends 390% and wrecks every
 *      figure while still rendering a confident-looking answer);
 *   2. the growth-rate override — the owner-ruled behaviour of 2026-07-28: it follows
 *      the Beta helper until typed over, and the link hands it back;
 *   3. blank-vs-zero in the helper series, which is the source defect the whole port
 *      exists to correct — a cleared cell must reach the backend as `null`, never 0;
 *   4. that beta is NOT adopted automatically from the helper's suggestions;
 *   5. a SENTINEL: the screen must never render the defective 1.62%.
 */

// mounted() fires a recompute, so every mount needs a fetch to exist. Individual
// tests override it (mountWithResult) to control the response.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: null }) }))
})
afterEach(() => { delete global.fetch })

/** Mount with the backend answering, and let the first result land. */
async function mountWithResult (data) {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data }) }))
  const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('CostOfCapital screen', () => {
  it('converts display percentages to decimals in the backend payload', () => {
    const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
    const body = wrapper.vm.recomputeRequest().body

    expect(wrapper.vm.recomputeRequest().url).toBe('/api/report/cost-of-capital')
    // Rates: display form ÷ 100 (3.9 → 0.039, 8.99 → 0.0899, 6.5 → 0.065, 28 → 0.28, 6 → 0.06)
    expect(body.riskFreeRate).toBeCloseTo(0.039, 8)
    expect(body.marketRate).toBeCloseTo(0.0899, 8)
    expect(body.inflationRate).toBeCloseTo(0.065, 8)
    expect(body.taxRate).toBeCloseTo(0.28, 8)
    expect(body.borrowRate).toBeCloseTo(0.06, 8)
    // Beta and the money amounts are NOT rates — they pass through untouched.
    expect(body.beta).toBe(0.52)
    expect(body.equity).toBe(50000)
    expect(body.debt).toBe(30000)
  })

  it('drives Beta Calcs F10 from the same field as WACC Calcs E7 — they are one figure', () => {
    // The workbook holds the market return twice. The screen shows ONE input, so the two
    // must never be able to disagree; sending it explicitly also keeps it out of R8's
    // defaultedInputs, where it would read as a silent fallback.
    const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
    wrapper.vm.form.marketRatePct = 11.25
    const body = wrapper.vm.recomputeRequest().body
    expect(body.marketRate).toBeCloseTo(0.1125, 8)
    expect(body.marketReturnRate).toBe(body.marketRate)
  })

  it('the seeded screen sends a payload the backend accepts with nothing defaulted (R8)', () => {
    const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
    const result = computeCostOfCapital(wrapper.vm.recomputeRequest().body)
    // Every input the model can fall back on is supplied by the screen, so an R8
    // "this figure was defaulted" declaration here would mean the screen is not sending
    // something it displays.
    expect(result.wacc.defaultedInputs).toEqual([])
    expect(result.beta.defaultedInputs).toEqual([])
    expect(result.wacc.wacc).toBeCloseTo(0.06162727724676392, 10)
  })

  describe('the growth rate (owner ruling 2026-07-28)', () => {
    it('follows the Beta helper until it is typed over — the request omits growthRate', () => {
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      expect(wrapper.vm.growthOverridden).toBe(false)
      // Omitted ENTIRELY, not sent as null/0: the backend then reports growthSource
      // honestly instead of being handed back a figure it derived itself.
      expect('growthRate' in wrapper.vm.recomputeRequest().body).toBe(false)
      expect(computeCostOfCapital(wrapper.vm.recomputeRequest().body).growthSource).toBe('betaHelper')
    })

    it('shows the calculated figure in the field once the backend answers', async () => {
      const wrapper = await mountWithResult(computeCostOfCapital({}))
      // 4.245666… % rounded to 4 dp for display. The field is never SENT while it is
      // following, so this rounding costs no precision.
      expect(wrapper.vm.growthDisplay).toBeCloseTo(4.2457, 4)
    })

    it('a typed figure wins, and is sent as a decimal', () => {
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      wrapper.vm.onGrowthInput('7.5')
      expect(wrapper.vm.growthOverridden).toBe(true)
      expect(wrapper.vm.growthDisplay).toBe(7.5)
      expect(wrapper.vm.recomputeRequest().body.growthRate).toBeCloseTo(0.075, 8)
      expect(computeCostOfCapital(wrapper.vm.recomputeRequest().body).growthSource).toBe('supplied')
    })

    it('"use the calculated figure" hands it back to the helper', () => {
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      wrapper.vm.onGrowthInput('7.5')
      wrapper.vm.useCalculatedGrowth()
      expect(wrapper.vm.growthOverridden).toBe(false)
      expect('growthRate' in wrapper.vm.recomputeRequest().body).toBe(false)
    })

    it('clearing the field also hands it back — a blank is not a growth rate of zero', () => {
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      wrapper.vm.onGrowthInput('7.5')
      wrapper.vm.onGrowthInput('')
      expect(wrapper.vm.growthOverridden).toBe(false)
      expect('growthRate' in wrapper.vm.recomputeRequest().body).toBe(false)
    })
  })

  describe('the Beta helper series', () => {
    it('sends the sample with its deliberate trailing blank intact', () => {
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      const body = wrapper.vm.recomputeRequest().body
      expect(body.equityValues).toHaveLength(12)
      expect(body.equityValues[11]).toBeNull()
      expect(body.equityValues[10]).toBeCloseTo(2678905.127, 3)
      expect(body.indexValues).toHaveLength(12)
      expect(body.sharesIssued.every(v => v === 7650)).toBe(true)
    })

    it('a cleared cell becomes null, NOT zero — this is the source defect the port corrects', () => {
      // Reading a blank period as a share price of nothing is exactly what inflated the
      // workbook's volatility beta to 7.61 and annihilated the equity half of the WACC.
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      wrapper.vm.setSeries('equityValues', 3, '')
      expect(wrapper.vm.form.equityValues[3]).toBeNull()

      const withBlank = computeCostOfCapital(wrapper.vm.recomputeRequest().body)
      expect(withBlank.beta.company.periods).toBe(10) // one fewer filled period

      // And a typed 0 is still real data, kept apart from a blank.
      wrapper.vm.setSeries('equityValues', 3, '0')
      expect(wrapper.vm.form.equityValues[3]).toBe(0)
    })

    it('an edited cell is REACTIVE, so the screen actually recomputes', async () => {
      // A direct index assignment (`arr[i] = v`) is not reactive in Vue 2: the array
      // contents change, so reading the value back still looks right — but the deep
      // watcher never fires and the screen silently stops recomputing. Asserting the
      // value alone therefore proves nothing; the watcher firing is the real subject.
      const wrapper = await mountWithResult(computeCostOfCapital({}))
      const queued = jest.spyOn(wrapper.vm, 'queueRecompute')

      wrapper.vm.setSeries('indexValues', 0, '5000')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.form.indexValues[0]).toBe(5000)
      expect(queued).toHaveBeenCalled()
      queued.mockRestore()
    })

    it('offers two betas but never adopts one — even once they are on screen', async () => {
      // Mounted WITH a result, because that is the only state in which an accidental
      // "adopt the suggestion" could take effect: before the first response there is no
      // suggestion to adopt, so a screen that silently adopts still looks correct.
      const wrapper = await mountWithResult(computeCostOfCapital({}))
      expect(wrapper.vm.data.betaSuggestions.roi).toBeCloseTo(0.4722654152351112, 10)
      expect(wrapper.vm.data.betaSuggestions.volatility).toBeCloseTo(0.3617385786671124, 10)

      // The next request still carries the hand-entered E8, not either suggestion.
      expect(wrapper.vm.recomputeRequest().body.beta).toBe(0.52)
      expect(wrapper.vm.form.beta).toBe(0.52)
      expect(computeCostOfCapital(wrapper.vm.recomputeRequest().body).betaSuggestions.inUse).toBe(0.52)
    })
  })

  it('renders the corrected headline, and never serves 1.62% AS the WACC', async () => {
    const wrapper = await mountWithResult(computeCostOfCapital({}))
    const heroes = wrapper.findAllComponents({ name: 'HeroFigure' })
    expect(heroes.length).toBe(4)

    // SENTINEL, asserted on the headline cell rather than the page text. 1.62% is the
    // workbook's published answer with the equity half of the capital contributing
    // nothing — an advisor quoting it states a hurdle rate out by nearly two thirds.
    // It must be checked HERE and not against wrapper.text(), because "1.6200%" also
    // appears further down as the debt's share of the cost, which is correct and is
    // precisely the coincidence that made the original defect so hard to see.
    const waccCell = heroes.at(0).props('value')
    expect(waccCell).toBe('6.16%')
    expect(waccCell).not.toMatch(/1\.62/)

    expect(heroes.at(1).props('value')).toBe('6.55%') // cost of equity
    expect(heroes.at(2).props('value')).toBe('4.32%') // cost of debt after tax
    expect(heroes.at(3).props('value')).toBe('62.5%') // funded by equity

    const text = wrapper.text()
    expect(text).toMatch(/6\.1627%/) // the build-up's own total, to 4 dp
    // Both suggested betas are shown beside the one in use.
    expect(text).toMatch(/0\.47/)
    expect(text).toMatch(/0\.36/)
  })

  describe('the guard-rails', () => {
    it('puts a raised warning on screen, through $t()', async () => {
      // The engine returns CODES so the screen owns the wording (no English in the
      // engine — Stack Constitution). A flat index never moves, so no volatility beta
      // can be derived from it.
      const result = computeCostOfCapital({ indexValues: [100, 100, 100, 100] })
      expect(result.beta.warnings).toContain('MARKET_VOLATILITY_ZERO')

      const wrapper = await mountWithResult(result)
      // The harness's $t() returns the KEY, so the assertion pins that the screen looked
      // the code up under the warn namespace rather than printing it raw. The English
      // itself is pinned by the coverage test below.
      expect(wrapper.text()).toContain('report.costOfCapital.warn.MARKET_VOLATILITY_ZERO')
    })

    it('has wording for EVERY code the engine can raise', () => {
      // Derived from the engine's own WARN map, not a hand-copied list: a new guard-rail
      // added to the model without wording fails here instead of showing an advisor
      // "ROI_BETA_ATYPICAL" mid-meeting.
      const codes = Object.keys(WARN)
      expect(codes.length).toBeGreaterThanOrEqual(6)
      codes.forEach((code) => {
        expect(WARN[code]).toBe(code) // the map is code→code; a typo here would hide a gap
        const wording = en.report.costOfCapital.warn[code]
        expect(typeof wording).toBe('string')
        expect(wording.length).toBeGreaterThan(0)
      })
    })
  })
})
