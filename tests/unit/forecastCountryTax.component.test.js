/**
 * @jest-environment jsdom
 */
'use strict'

// The advisor's half of Tax Rates per country — item 4.81, slice 5.
//
// 🔴 WHAT THIS FILE IS FOR. Before this slice the forecast applied 28% company tax, 15% GST
// and a New Zealand two-monthly filing cycle to every client in every country. An advisor
// could type over the two rates, but nothing told them the numbers in front of them were
// New Zealand's. Four things here are invisible on screen and change what a client's
// forecast computes:
//
//   1. NAMING A COUNTRY MOVES NO FIGURE ON ITS OWN. Mike's ruling, 2026-09-09: figures
//      moving underneath someone part-way through a report is how a wrong number reaches a
//      document nobody meant to send. The advisor is told what would change, and chooses.
//
//   2. THE PAYLOAD CARRIES THE CYCLE AS A NUMBER. Without it the engine reads `gstPeriod`,
//      which only knows New Zealand's three words, so an Australian client on a quarterly
//      BAS would silently file two-monthly — money leaving the bank in the wrong months, in
//      a forecast that balances perfectly.
//
//   3. APPLYING MOVES ONLY WHAT THE TABLE ACTUALLY HOLDS. A firm that approved the company
//      tax rate and nothing else must not have three other figures changed on its behalf.
//
//   4. A FAILED READ NEVER BLOCKS THE ADVISOR. His words, 2026-09-08.
//
// `$t()` returns the KEY, so nothing here pins his wording.

const { mountWithBuefy } = require('../helpers/mountComponent')
const ThreeWayForecastIntake = require('~/components/ThreeWayForecastIntake.vue').default

const SOURCE = { document: 'ATO — Company tax rates', page: '1', published: '2025-07' }

/** An approved Australian table, as the route resolves it. */
function auTax (over) {
  return Object.assign({
    country: 'AU',
    isDefault: false,
    figures: {
      companyTax: { rate: 0.3, appliesTo: 'Base rate entities', source: SOURCE, originTier: 'firm_manager' },
      gst: { rate: 0.1, source: SOURCE, originTier: 'firm_manager' },
      filing: { months: 3, label: 'Quarterly (BAS)', source: SOURCE, originTier: 'firm_manager' },
      basis: { basis: 'invoice', label: 'Accruals', source: SOURCE, originTier: 'firm_manager' }
    }
  }, over || {})
}

/** The app's own four, which is what the route answers for a country nobody has approved. */
function defaultTax () {
  return {
    country: 'ZZ',
    isDefault: true,
    figures: {
      companyTax: { rate: 0.28, appliesTo: null, source: null, originTier: null },
      gst: { rate: 0.15, source: null, originTier: null },
      filing: { months: 2, label: 'Two-monthly', source: null, originTier: null },
      basis: { basis: 'invoice', label: 'Invoice', source: null, originTier: null }
    }
  }
}

/** Mount the intake and name a country, letting the debounced read resolve. */
async function withCountry (code, payload) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: payload !== null,
    json: () => Promise.resolve(payload)
  }))
  const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
  wrapper.vm.form.country = code
  await wrapper.vm.$nextTick()
  jest.advanceTimersByTime(300)
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

/**
 * The tax-rates reads alone. Mounting the intake also asks for the sell-down ladder, so a
 * bare call count would be measuring the wrong thing.
 */
function taxCalls () {
  return global.fetch.mock.calls
    .map(([url]) => String(url))
    .filter(url => url.indexOf('/api/report/tax-rates') === 0)
}

beforeEach(() => { jest.useFakeTimers() })

afterEach(() => {
  jest.useRealTimers()
  delete global.fetch
})

describe('naming a country', () => {
  it('asks the backend for that country’s approved figures', async () => {
    await withCountry('AU', auTax())
    expect(taxCalls()).toHaveLength(1)
    expect(taxCalls()[0]).toContain('country=AU')
  })

  it('is not asked for until two letters have been typed', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    wrapper.vm.form.country = 'A'
    await wrapper.vm.$nextTick()
    jest.advanceTimersByTime(300)
    expect(taxCalls()).toHaveLength(0)
  })

  it('reads a lower-case code as the country it is', async () => {
    await withCountry('au', auTax())
    expect(taxCalls()[0]).toContain('country=AU')
  })

  // An answer that arrives after the advisor has typed a different country would put one
  // country's tax figures against another country's client.
  it('ignores an answer for a country the advisor has typed away from', async () => {
    const wrapper = await withCountry('AU', { country: 'NZ', isDefault: false, figures: {} })
    expect(wrapper.vm.resolvedTax).toBeNull()
  })

  it('clearing the country forgets what was resolved', async () => {
    const wrapper = await withCountry('AU', auTax())
    expect(wrapper.vm.resolvedTax).not.toBeNull()
    wrapper.vm.form.country = ''
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.resolvedTax).toBeNull()
  })
})

describe('🔴 naming a country moves no figure on its own', () => {
  // The ruling this whole slice turns on. The forecast keeps every figure the advisor had.
  it('leaves all four figures exactly as they were', async () => {
    const wrapper = await withCountry('AU', auTax())

    expect(wrapper.vm.form.taxRate).toBe(28)
    expect(wrapper.vm.form.gstRate).toBe(15)
    expect(wrapper.vm.form.gstPeriod).toBe('Two Monthly')
    expect(wrapper.vm.form.gstFilingMonths).toBe(2)
    expect(wrapper.vm.form.gstBasis).toBe('Invoice')
  })

  it('offers the change instead, naming every figure that would move', async () => {
    const wrapper = await withCountry('AU', auTax())
    const changes = wrapper.vm.countryTaxChanges

    // 🔴 THREE, NOT FOUR, AND THAT IS CORRECT — worth pinning because it is not obvious.
    // Australia's approved basis is the canonical `invoice`, which is what the forecast is
    // already on; only the WORD differs ("Accruals" against "Invoice"). Nothing the engine
    // computes would move, so it is not offered as a change. Counting it would tell an
    // advisor a figure was about to move when none was.
    expect(changes).toHaveLength(3)
    expect(changes.join(' ')).toContain('30%')
    expect(changes.join(' ')).toContain('10%')
    expect(changes.join(' ')).toContain('Quarterly (BAS)')
    expect(wrapper.vm.taxOffer).toBeTruthy()
  })

  it('but a basis whose VALUE differs is offered, because that one does move', async () => {
    const cash = auTax()
    cash.figures.basis = { basis: 'cash', label: 'Cash accounting', source: SOURCE }

    const wrapper = await withCountry('AU', cash)
    expect(wrapper.vm.countryTaxChanges).toHaveLength(4)
    expect(wrapper.vm.countryTaxChanges.join(' ')).toContain('Cash accounting')
  })

  it('makes no offer for a country nobody has approved anything for', async () => {
    const wrapper = await withCountry('ZZ', defaultTax())
    expect(wrapper.vm.taxOffer).toBe('')
  })

  it('makes no offer when the advisor is already on every approved figure', async () => {
    const wrapper = await withCountry('AU', auTax())
    wrapper.vm.applyCountryTax()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.countryTaxChanges).toHaveLength(0)
    expect(wrapper.vm.taxOffer).toBe('')
  })
})

describe('applying a country’s figures, when the advisor asks', () => {
  it('takes all four across', async () => {
    const wrapper = await withCountry('AU', auTax())
    wrapper.vm.applyCountryTax()

    expect(wrapper.vm.form.taxRate).toBe(30)
    expect(wrapper.vm.form.gstRate).toBe(10)
    expect(wrapper.vm.form.gstFilingMonths).toBe(3)
    expect(wrapper.vm.form.gstPeriod).toBe('Quarterly (BAS)')
  })

  // 🔴 A firm that approved one figure must not have three others changed on its behalf.
  it('moves only what the table actually holds', async () => {
    const partial = auTax()
    partial.figures = { companyTax: partial.figures.companyTax }

    const wrapper = await withCountry('AU', partial)
    wrapper.vm.applyCountryTax()

    expect(wrapper.vm.form.taxRate).toBe(30)
    // The three nobody approved for this country are untouched.
    expect(wrapper.vm.form.gstRate).toBe(15)
    expect(wrapper.vm.form.gstFilingMonths).toBe(2)
    expect(wrapper.vm.form.gstBasis).toBe('Invoice')
  })

  it('turns a stored basis into the word the engine takes', async () => {
    const cash = auTax()
    cash.figures.basis = { basis: 'cash', label: 'Cash accounting', source: SOURCE }

    const wrapper = await withCountry('AU', cash)
    wrapper.vm.applyCountryTax()
    expect(wrapper.vm.form.gstBasis).toBe('Cash')
  })
})

describe('a cycle the workbook never had', () => {
  // Before item 4.81 the three buttons were Monthly, Two-monthly and Six-monthly — all New
  // Zealand's — so there was no way to say "quarterly" at all.
  it('joins the three as a fourth choice, under the country’s own name', async () => {
    const wrapper = await withCountry('AU', auTax())
    const options = wrapper.vm.gstPeriodOptions

    expect(options).toHaveLength(4)
    expect(options[3].months).toBe(3)
    expect(options[3].text).toBe('Quarterly (BAS)')
  })

  it('does not duplicate a cycle the workbook already had', async () => {
    const sixMonthly = auTax()
    sixMonthly.figures.filing = { months: 6, label: 'Half-yearly', source: SOURCE }

    const wrapper = await withCountry('AU', sixMonthly)
    expect(wrapper.vm.gstPeriodOptions).toHaveLength(3)
  })

  it('picking one sets the number and the name together', async () => {
    const wrapper = await withCountry('AU', auTax())
    wrapper.vm.chooseGstPeriod(wrapper.vm.gstPeriodOptions[3])

    expect(wrapper.vm.form.gstFilingMonths).toBe(3)
    expect(wrapper.vm.form.gstPeriod).toBe('Quarterly (BAS)')
  })
})

describe('where a figure came from', () => {
  it('an approved figure names its document, date and page', async () => {
    const wrapper = await withCountry('AU', auTax())
    const line = wrapper.vm.taxSource('companyTax')

    expect(line).toContain('ATO')
    expect(line).toContain('2025-07')
  })

  // 🔴 An app default shows NOTHING, and that is the point: the presence of a source line is
  // the only thing telling an advisor somebody looked this up for their client's country.
  it('an app default names nothing', async () => {
    const wrapper = await withCountry('ZZ', defaultTax())
    expect(wrapper.vm.taxSource('companyTax')).toBe('')
    expect(wrapper.vm.taxSource('gst')).toBe('')
  })

  it('the firm’s own words about which entities the rate reaches are shown', async () => {
    const wrapper = await withCountry('AU', auTax())
    expect(wrapper.vm.companyTaxAppliesTo).toBe('Base rate entities')
  })

  it('and nothing is shown when no firm wrote any', async () => {
    const wrapper = await withCountry('ZZ', defaultTax())
    expect(wrapper.vm.companyTaxAppliesTo).toBe('')
  })
})

describe('🔴 the payload the engine actually receives', () => {
  // Without the month count the engine falls back to `gstPeriod`, which knows only New
  // Zealand's three words — so a quarterly client silently files two-monthly, the money
  // leaves the bank in the wrong months, and the forecast balances perfectly.
  it('carries the filing cycle as a number, not only as a name', async () => {
    const wrapper = await withCountry('AU', auTax())
    wrapper.vm.applyCountryTax()

    const sent = wrapper.vm.buildInputs()
    expect(sent.gstFilingMonths).toBe(3)
    expect(sent.gstFilingLabel).toBe('Quarterly (BAS)')
  })

  it('carries the approved rates as decimals, not as the percentages on screen', async () => {
    const wrapper = await withCountry('AU', auTax())
    wrapper.vm.applyCountryTax()

    const sent = wrapper.vm.buildInputs()
    expect(sent.taxRate).toBeCloseTo(0.3, 10)
    expect(sent.gstRate).toBeCloseTo(0.1, 10)
  })

  it('names the country the figures were resolved for', async () => {
    const wrapper = await withCountry('AU', auTax())
    expect(wrapper.vm.buildInputs().country).toBe('AU')
  })

  // An advisor who names no country gets exactly what the forecast does today.
  it('a forecast with no country sends the app’s own cycle, as it always did', () => {
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })

    const sent = wrapper.vm.buildInputs()
    expect(sent.gstFilingMonths).toBe(2)
    expect(sent.gstPeriod).toBe('Two Monthly')
    expect(sent.country).toBe('')
  })
})

describe('a read that fails never blocks the advisor', () => {
  it('a refused read leaves the forecast’s own figures working', async () => {
    const wrapper = await withCountry('AU', null)

    expect(wrapper.vm.resolvedTax).toBeNull()
    expect(wrapper.vm.form.taxRate).toBe(28)
    expect(wrapper.vm.form.gstRate).toBe(15)
    expect(wrapper.vm.taxOffer).toBe('')
  })

  it('a network failure is swallowed rather than shown as a forecast error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    wrapper.vm.form.country = 'AU'
    await wrapper.vm.$nextTick()
    jest.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.resolvedTax).toBeNull()
    expect(wrapper.vm.buildError).toBeNull()
  })
})
