/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const CostOfCapital = require('~/components/CostOfCapital.vue').default
const { computeCostOfCapital, WARN, HURDLE } = require('~/server/report/costOfCapitalModel')
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

  /**
   * The hurdle-rate test (owner-ruled 2026-07-28). The verdict arithmetic is golden-tested
   * in the model; these cover only the screen's own risks — that two MONEY fields do not
   * get the ÷100 every other field on this screen receives, that an empty field reaches
   * the backend as absent rather than zero, and that a verdict code never reaches an
   * advisor's eyes untranslated or wearing the wrong colour.
   */
  describe('the hurdle-rate test', () => {
    /** The worked scenario: $250,000 expected to earn $22,000 a year against a 6.16% WACC. */
    const TESTED = { investmentCost: 250000, annualReturn: 22000 }

    /**
     * The `<input>` belonging to the field with this label. Located by LABEL, not by
     * position, so inserting a card above it does not silently re-point the test at a
     * different box. The harness's `$t()` returns the key, so the key is the label text.
     *
     * @param {object} wrapper - the mounted screen
     * @param {string} labelKey - the i18n key rendered as that field's label
     * @returns {object|null} a test-utils wrapper for the input, or null if not found
     */
    function inputForLabel (wrapper, labelKey) {
      const fields = wrapper.findAll('.coc-field')
      for (let i = 0; i < fields.length; i++) {
        const label = fields.at(i).find('label')
        if (label.exists() && label.text() === labelKey) { return fields.at(i).find('input') }
      }
      return null
    }

    it('the COST box writes the investment cost, and touches nothing else', async () => {
      // Every other test in this file calls the methods directly, which proves the
      // arithmetic and nothing about the wiring: two inputs bound to each other's field
      // would pass all of them, and only show up in front of a client. This goes through
      // the actual box on the page.
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      const box = inputForLabel(wrapper, 'report.costOfCapital.hurdle.investmentCost')
      expect(box).not.toBeNull() // a renamed label must fail here, not silently skip

      box.setValue('250000')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.form.investmentCost).toBe(250000)
      expect(wrapper.vm.form.annualReturn).toBeNull() // the other field stayed put
      expect(wrapper.vm.recomputeRequest().body.investmentCost).toBe(250000)
    })

    it('the EARNINGS box writes the annual return, and touches nothing else', async () => {
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      const box = inputForLabel(wrapper, 'report.costOfCapital.hurdle.annualReturn')
      expect(box).not.toBeNull()

      box.setValue('22000')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.form.annualReturn).toBe(22000)
      expect(wrapper.vm.form.investmentCost).toBeNull()
      expect(wrapper.vm.recomputeRequest().body.annualReturn).toBe(22000)
    })

    it('each box SHOWS its own figure back, not the other one', async () => {
      // Writing and displaying are two separate bindings, and a mutant that pointed the
      // cost box's display at the earnings value passed every other test here: the typed
      // figure still reached the right field, so only the advisor's eyes would have
      // caught it — the box would answer 22,000 to someone who typed 250,000.
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      wrapper.setData({ form: Object.assign({}, wrapper.vm.form, { investmentCost: 250000, annualReturn: 22000 }) })
      await wrapper.vm.$nextTick()

      expect(inputForLabel(wrapper, 'report.costOfCapital.hurdle.investmentCost').element.value).toBe('250000')
      expect(inputForLabel(wrapper, 'report.costOfCapital.hurdle.annualReturn').element.value).toBe('22000')
    })

    it('the two boxes together produce the worked scenario, in the right order', async () => {
      // The pair, end to end through the DOM: 250,000 costing / 22,000 earning is 8.80%,
      // where the reverse would be 1,136% — the two are not confusable by accident, which
      // is exactly what makes this assertion worth having.
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      inputForLabel(wrapper, 'report.costOfCapital.hurdle.investmentCost').setValue('250000')
      inputForLabel(wrapper, 'report.costOfCapital.hurdle.annualReturn').setValue('22000')
      await wrapper.vm.$nextTick()

      const body = wrapper.vm.recomputeRequest().body
      const { computeCostOfCapital: compute } = require('~/server/report/costOfCapitalModel')
      expect(compute(body).hurdle.returnRate).toBeCloseTo(0.088, 12)
    })

    it('sends the two money figures UNSCALED — they are amounts, not rates', () => {
      // Every other field on this screen is a display percentage divided by 100. These
      // two are not, and a ÷100 here would quietly test a $2,500 investment.
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      wrapper.vm.form.investmentCost = 250000
      wrapper.vm.form.annualReturn = 22000

      const body = wrapper.vm.recomputeRequest().body
      expect(body.investmentCost).toBe(250000)
      expect(body.annualReturn).toBe(22000)
    })

    it('omits both fields entirely until they are entered', () => {
      // Not `0`: the backend reads a priced investment expected to earn nothing as a
      // real (failing) investment, so a blank arriving as zero would invent a verdict.
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      const body = wrapper.vm.recomputeRequest().body
      expect('investmentCost' in body).toBe(false)
      expect('annualReturn' in body).toBe(false)
    })

    it('clearing a field hands it back as null, while a typed zero is kept and sent', () => {
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })

      wrapper.vm.onMoneyInput('investmentCost', '250000')
      wrapper.vm.onMoneyInput('annualReturn', '0')
      expect(wrapper.vm.form.annualReturn).toBe(0)
      expect(wrapper.vm.recomputeRequest().body.annualReturn).toBe(0)

      wrapper.vm.onMoneyInput('annualReturn', '')
      expect(wrapper.vm.form.annualReturn).toBeNull()
      expect('annualReturn' in wrapper.vm.recomputeRequest().body).toBe(false)
    })

    it('typing an investment triggers a recompute rather than a stale verdict', async () => {
      // The deep form watcher is the subject: a verdict left over from the previous
      // figures is worse than none, because it looks current.
      const wrapper = mountWithBuefy(CostOfCapital, { propsData: {} })
      const queued = jest.spyOn(wrapper.vm, 'queueRecompute')
      wrapper.vm.onMoneyInput('investmentCost', '250000')
      await wrapper.vm.$nextTick()
      expect(queued).toHaveBeenCalled()
    })

    it('shows nothing at all until both figures are supplied', async () => {
      const wrapper = await mountWithResult(computeCostOfCapital({}))
      expect(wrapper.vm.data.hurdle).toBeNull()
      expect(wrapper.find('.coc-verdict').exists()).toBe(false)
      expect(wrapper.vm.verdictText).toBe('')
      expect(wrapper.vm.marginLabel).toBe('')
    })

    it('renders a clearing verdict in words, with the margin, wearing the good tone', async () => {
      const wrapper = await mountWithResult(computeCostOfCapital(TESTED))
      expect(wrapper.vm.data.hurdle.verdict).toBe(HURDLE.CLEARS)

      const verdict = wrapper.find('.coc-verdict')
      expect(verdict.exists()).toBe(true)
      expect(verdict.classes()).toContain('is-good')
      // 8.80% against 6.1627% = 2.64 percentage points, looked up under the hurdle
      // namespace — the harness's $t() returns the key plus its interpolation params.
      expect(verdict.text()).toContain('report.costOfCapital.hurdle.CLEARS')
      expect(verdict.text()).toContain('2.64')
      expect(wrapper.vm.marginLabel).toBe('report.costOfCapital.hurdle.aheadBy')
    })

    it('renders a shortfall wearing the critical tone, and labels it Short by', async () => {
      const short = computeCostOfCapital({ investmentCost: 250000, annualReturn: 12000 })
      const wrapper = await mountWithResult(short)
      expect(short.hurdle.verdict).toBe(HURDLE.SHORT)

      expect(wrapper.find('.coc-verdict').classes()).toContain('is-crit')
      expect(wrapper.find('.coc-verdict').text()).toContain('report.costOfCapital.hurdle.SHORT')
      expect(wrapper.vm.marginLabel).toBe('report.costOfCapital.hurdle.shortBy')
      // The money margin is shown POSITIVE — its direction is carried by the label, so
      // a minus sign here would read as "short by minus $10,606".
      expect(wrapper.vm.marginAmountText).not.toMatch(/-|−/)
    })

    it('a verdict landing exactly on the hurdle is neutral and hides the margin row', async () => {
      const report = computeCostOfCapital({})
      const exact = computeCostOfCapital({
        investmentCost: 250000,
        annualReturn: 250000 * report.wacc.wacc
      })
      const wrapper = await mountWithResult(exact)
      expect(exact.hurdle.verdict).toBe(HURDLE.MEETS)

      expect(wrapper.find('.coc-verdict').classes()).toContain('is-level')
      expect(wrapper.vm.marginLabel).toBe('') // no "ahead by nothing" row
    })

    it('an unrecognised verdict code is never coloured and never shown raw', async () => {
      // Defensive: a code added to the engine without wording must degrade to silence,
      // not to a green tick beside a decision nobody has validated.
      const rogue = computeCostOfCapital(TESTED)
      rogue.hurdle = Object.assign({}, rogue.hurdle, { verdict: 'PROBABLY_FINE' })
      const wrapper = await mountWithResult(rogue)

      expect(wrapper.vm.verdictTone).toBe('level')
      expect(wrapper.vm.verdictText).toBe('')
      expect(wrapper.find('.coc-verdict').classes()).not.toContain('is-good')
      expect(wrapper.text()).not.toContain('PROBABLY_FINE')
    })

    it('has wording for EVERY verdict the engine can return', () => {
      // Derived from the engine's own HURDLE map, the WARN pattern: a fourth verdict
      // added without wording fails the build instead of rendering blank at an advisor.
      const codes = Object.keys(HURDLE)
      expect(codes.length).toBe(3)
      codes.forEach((code) => {
        expect(HURDLE[code]).toBe(code)
        const wording = en.report.costOfCapital.hurdle[code]
        expect(typeof wording).toBe('string')
        expect(wording.length).toBeGreaterThan(0)
      })
      // The two directional labels and the money-per-year frame are wording too.
      expect(typeof en.report.costOfCapital.hurdle.aheadBy).toBe('string')
      expect(typeof en.report.costOfCapital.hurdle.shortBy).toBe('string')
      expect(en.report.costOfCapital.hurdle.perYear).toContain('{amount}')
    })

    it('formats the money through currencyMixin, in the FIRM\'s currency', async () => {
      // A private money() would re-hardcode $ and en-US, losing the firm's currency and
      // the reader's language — the whole reason the mixin exists.
      //
      // Asserting on the DIGITS alone does not prove this: a hand-rolled
      // "'$' + toLocaleString('en-US')" produces the same "15,407" and survived exactly
      // that test. Changing the firm's currency is what separates the two — a hardcoded
      // formatter cannot follow it.
      const wrapper = await mountWithResult(computeCostOfCapital(TESTED))
      expect(wrapper.vm.requiredAnnualReturnText).toContain('report.costOfCapital.hurdle.perYear')

      wrapper.setData({ firmCurrency: 'GBP' })
      await wrapper.vm.$nextTick()
      const gbp = wrapper.vm.requiredAnnualReturnText
      expect(gbp).toContain('£')
      expect(gbp).not.toContain('$')
      expect(gbp).toMatch(/15[,.]40[67]/) // 250,000 x 6.1627%, still the right figure

      // ...and the margin follows it too, not just the one figure that got a test.
      expect(wrapper.vm.marginAmountText).toContain('£')
    })
  })
})
