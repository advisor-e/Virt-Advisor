/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ThreeWayForecastIntake = require('~/components/ThreeWayForecastIntake.vue').default
const { DEFAULTS } = require('~/server/report/threeWayForecastModel')

/**
 * Three-Way Forecast — the intake screens (steps 1 to 3).
 *
 * 🔴 THE FIRST BLOCK IS THE REASON THIS FILE EXISTS. `resolveInputs` merges whatever the
 * screen sends over the source workbook's own sample, so any input the screen forgets to
 * send keeps Big Bird Grass Seed's figure — a 10% sales commission, 7% overdraft interest,
 * fifteen thousand a year of somebody else's overheads. The result is a forecast that
 * looks completely normal and is wrong, which is exactly what a person in UAT cannot
 * catch. These tests compare what the screen sends against the model's own key list, so
 * an input added to the engine later fails here rather than leaking in silence.
 *
 * The rest guard the same class of thing: provenance that says a typed figure came from a
 * file, a collection profile that does not total 100 (a fifth of the sales never
 * collected, and the cash flow plausible all the way down), and the sample's own loan and
 * shareholder names reaching a real client's forecast.
 *
 * `$t()` returns the KEY, so nothing here pins Mike's wording.
 */

/** Mount the intake at a given step with no file activity. */
function mountIntake (propsData) {
  return mountWithBuefy(ThreeWayForecastIntake, { propsData: propsData || {} })
}

/** Twelve zeroes — the shape every monthly series on this form takes. */
function zeroes () { return new Array(12).fill(0) }

/** A backend intake response, as the route sends it. */
function intakeResponse (over) {
  return Object.assign({
    files: [{ kind: 'forecastBalanceSheet', companyName: 'Acme Ltd', reportDate: 'as at 31 March 2026', warnings: [] }],
    proposal: {},
    provenance: {},
    candidates: {},
    blocked: null,
    warnings: []
  }, over || {})
}

describe('the two-year trend read on step 3 (item 4.61b)', () => {
  /** A banded trend, as the backend sends it. */
  function trend (over) {
    return Object.assign({
      available: true,
      blocked: null,
      needsBalanceSheet: false,
      periodsCertain: true,
      measures: [
        { key: 'salesGrowth', basis: 'movement', unit: 'percent', worseWhen: 'down', prior: 824000, current: 890000, movement: 8.0097, band: 'good', computable: true },
        { key: 'debtorDays', basis: 'level', unit: 'days', worseWhen: 'up', prior: 44.96, current: 58.24, movement: 13.28, band: 'crit', computable: true },
        { key: 'creditorDays', basis: 'level', unit: 'days', worseWhen: 'up', prior: 42.0, current: 47.2, movement: 5.2, band: null, computable: true }
      ],
      counts: { good: 1, warn: 0, crit: 1, unbanded: 1 }
    }, over || {})
  }

  test('the backend’s banding is taken as given, never recomputed in the browser', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({ trend: trend() }))
    expect(w.vm.trend.measures).toHaveLength(3)
    expect(w.vm.trendWorst.key).toBe('debtorDays')
    expect(w.vm.trendWarned).toEqual([])
    w.destroy()
  })

  // 🔴 THE READ MUST NEVER REACH THE FORECAST. Every one of these figures is last year's,
  // and a forecast that quietly opened from them would be plausible and a year stale.
  // The control is the SAME intake without a trend, not the untouched form: applying an
  // intake legitimately seeds the start date from the balance sheet's own "as at" line,
  // and comparing against a blank form would credit that to this block.
  test('nothing from the trend read reaches the inputs the engine is given', () => {
    const withTrend = mountIntake()
    withTrend.vm.applyIntake(intakeResponse({ trend: trend() }))

    const without = mountIntake()
    without.vm.applyIntake(intakeResponse())

    expect(JSON.stringify(withTrend.vm.buildInputs())).toBe(JSON.stringify(without.vm.buildInputs()))
    withTrend.destroy()
    without.destroy()
  })

  test('a value is shown in the unit its measure is actually read in', () => {
    const w = mountIntake()
    const [growth, debtors] = trend().measures
    // Sales is the odd one out on purpose: its YEARS are money, its MOVEMENT is a percentage.
    expect(w.vm.trendValue(growth, growth.current)).toBe(w.vm.money(890000))
    expect(w.vm.trendMovement(growth)).toBe('+8.0%')
    expect(w.vm.trendValue(debtors, debtors.current)).toContain('58')
    expect(w.vm.trendMovement(debtors)).toContain('13')
    w.destroy()
  })

  test('a percentage-point measure reads to one decimal, signed', () => {
    const w = mountIntake()
    const m = { key: 'grossMargin', basis: 'movement', unit: 'points', worseWhen: 'down', prior: 41.99, current: 40.48, movement: -1.5141, band: 'warn' }
    expect(w.vm.trendValue(m, m.current)).toBe('40.5%')
    expect(w.vm.trendMovement(m)).toContain('1.5')
    w.destroy()
  })

  test('an absent figure shows as absent rather than as zero', () => {
    const w = mountIntake()
    const m = { key: 'stockDays', basis: 'level', unit: 'days', worseWhen: 'up', prior: null, current: null, movement: null, band: null }
    expect(w.vm.trendValue(m, m.prior)).toBe('—')
    expect(w.vm.trendMovement(m)).toBe('—')
    w.destroy()
  })

  // The colour of a movement follows the direction the BACKEND says is worse for that
  // measure, so the colour and the band can never disagree about the same number.
  test('a movement is coloured by the direction that is worse for that measure', () => {
    const w = mountIntake()
    const up = { movement: 5, worseWhen: 'up' }
    const down = { movement: -5, worseWhen: 'down' }
    expect(w.vm.trendMoveClass(up).bad).toBe(true)
    expect(w.vm.trendMoveClass(down).bad).toBe(true)
    expect(w.vm.trendMoveClass({ movement: -5, worseWhen: 'up' }).ok).toBe(true)
    expect(w.vm.trendMoveClass({ movement: 0, worseWhen: 'up' }).flat).toBe(true)
    w.destroy()
  })

  test('every amber measure is gathered into one note, not one note each', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      trend: trend({
        measures: [
          { key: 'grossMargin', basis: 'movement', unit: 'points', worseWhen: 'down', prior: 42, current: 40.5, movement: -1.5, band: 'warn' },
          { key: 'overheadRatio', basis: 'movement', unit: 'points', worseWhen: 'up', prior: 32.5, current: 33.9, movement: 1.4, band: 'warn' }
        ]
      })
    }))
    expect(w.vm.trendWarned.map(m => m.key)).toEqual(['grossMargin', 'overheadRatio'])
    expect(w.vm.trendWorst).toBeNull()
    w.destroy()
  })

  // The approved drawing's rule: a row that cannot be worked out is left out AND the
  // reason is given once. A shorter table with nothing accounting for it is the failure.
  test('a row that could not be worked out is named, with the figure it wanted', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      trend: trend({ omitted: [{ key: 'stockDays', missing: 'inventory' }] })
    }))
    expect(w.vm.trendOmittedSentence).toContain('stockDays')
    expect(w.vm.trendOmittedSentence).toContain('inventory')
    w.destroy()
  })

  test('the missing-balance-sheet line wins over the generic one, never both', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      trend: trend({
        needsBalanceSheet: true,
        omitted: [
          { key: 'debtorDays', missing: 'accountsReceivable' },
          { key: 'creditorDays', missing: 'accountsPayable' },
          { key: 'stockDays', missing: 'inventory' }
        ]
      })
    }))
    // Its own line tells the advisor what to DO about it; the generic one only says what
    // is absent, so showing both would be saying the weaker thing twice.
    expect(w.vm.trend.needsBalanceSheet).toBe(true)
    w.destroy()
  })

  test('nothing left out means no sentence at all', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({ trend: trend({ omitted: [] }) }))
    expect(w.vm.trendOmittedSentence).toBe('')
    w.destroy()
  })

  test('an intake with no last-year files leaves the block with nothing to draw', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({ trend: { available: false, blocked: 'NO_PRIOR_YEAR', measures: [] } }))
    expect(w.vm.trend.available).toBe(false)
    expect(w.vm.trendWorst).toBeNull()
    expect(w.vm.trendWarned).toEqual([])
    w.destroy()
  })

  // A forecast saved before this block existed carries no `trend` at all.
  test('an older saved forecast restores without a trend rather than breaking', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: { restore: { sales: [], capital: [] } } })
    expect(w.vm.trend).toBeNull()
    expect(w.vm.trendWarned).toEqual([])
    w.destroy()
  })
})

describe('the intake sends every figure the engine takes', () => {
  test('🔴 every top-level input the model defaults is sent explicitly', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs()
    const missing = Object.keys(DEFAULTS).filter(k => !(k in sent))
    expect(missing).toEqual([])
    w.destroy()
  })

  test('🔴 every opening balance-sheet line is sent, not just the ones a file filled', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs().openingBalanceSheet
    const missing = Object.keys(DEFAULTS.openingBalanceSheet).filter(k => !(k in sent))
    expect(missing).toEqual([])
    w.destroy()
  })

  test('🔴 every one of the 23 overheads is sent, not the 14 the drawing showed', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs().overheads
    const missing = Object.keys(DEFAULTS.overheads).filter(k => !(k in sent))
    expect(missing).toEqual([])
    expect(Object.keys(sent)).toHaveLength(23)
    w.destroy()
  })

  test('🔴 all four direct-cost rates are sent — the commission alone is 10% of sales in the sample', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs().directCostRates
    const missing = Object.keys(DEFAULTS.directCostRates).filter(k => !(k in sent))
    expect(missing).toEqual([])
    w.destroy()
  })

  test('🔴 nothing the advisor has not entered carries a sample value', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs()
    // Money is absent until somebody supplies it: zero, never the workbook's figure.
    expect(sent.openingBalanceSheet.gstRefund).toBe(0)
    expect(DEFAULTS.openingBalanceSheet.gstRefund).not.toBe(0)
    expect(sent.openingBalanceSheet.accruedExpenses).toBe(0)
    expect(DEFAULTS.openingBalanceSheet.accruedExpenses).not.toBe(0)
    expect(sent.overheads.occupancy).toBe(0)
    expect(DEFAULTS.overheads.occupancy).not.toBe(0)
    expect(sent.directCostRates.commissions).toBe(0)
    expect(DEFAULTS.directCostRates.commissions).not.toBe(0)
    w.destroy()
  })

  test('an asset carries both its opening value and its rate, and the six are all sent', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs().assets
    expect(sent).toHaveLength(DEFAULTS.assets.length)
    sent.forEach((a) => {
      expect(typeof a.opening).toBe('number')
      expect(typeof a.depreciationRate).toBe('number')
      expect(Array.isArray(a.additions)).toBe(true)
    })
    // A depreciation rate is never in a balance sheet, so it starts on the platform value.
    expect(sent[0].depreciationRate).toBeCloseTo(DEFAULTS.assets[0].depreciationRate, 10)
    w.destroy()
  })
})

describe('percentages leave the screen as fractions', () => {
  test('a whole-number percentage on screen is a fraction in the payload', () => {
    const w = mountIntake()
    w.vm.form.markup = 45
    w.vm.form.taxRate = 33
    w.vm.form.gstRate = 20
    w.vm.form.overdraftRate = 11
    const sent = w.vm.buildInputs()
    expect(sent.markup).toBeCloseTo(0.45, 10)
    expect(sent.taxRate).toBeCloseTo(0.33, 10)
    expect(sent.gstRate).toBeCloseTo(0.2, 10)
    expect(sent.overdraftInterestRate).toBeCloseTo(0.11, 10)
    w.destroy()
  })

  test('both collection profiles keep their five buckets', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs()
    expect(sent.debtorCollection).toHaveLength(5)
    expect(sent.creditorPayment).toHaveLength(5)
    expect(sent.debtorCollection.reduce((a, v) => a + v, 0)).toBeCloseTo(1, 10)
    w.destroy()
  })

  test('the start date becomes the Excel serial the model dates from', () => {
    const w = mountIntake()
    // 2024-04-01 is serial 45383 — the model's own documented default.
    expect(w.vm.serialOf('2024-04-01')).toBe(DEFAULTS.startDateSerial)
    w.destroy()
  })
})

describe('the sample’s own names never reach a client', () => {
  test('🔴 loans and shareholders are named by position, never "ABC Bank" or "Mary"', () => {
    const w = mountIntake()
    const sent = w.vm.buildInputs()
    const sampleLoanNames = DEFAULTS.loans.map(l => l.name)
    const sampleShareholderNames = DEFAULTS.shareholders.map(s => s.name)
    sent.loans.forEach((l) => {
      expect(typeof l.name).toBe('string')
      expect(l.name.length).toBeGreaterThan(0)
      expect(sampleLoanNames).not.toContain(l.name)
    })
    sent.shareholders.forEach((s) => {
      expect(sampleShareholderNames).not.toContain(s.name)
    })
    w.destroy()
  })

  test('an advisor’s own loan name is kept', () => {
    const w = mountIntake()
    w.vm.form.loans[0].name = 'Northern Bank'
    expect(w.vm.buildInputs().loans[0].name).toBe('Northern Bank')
    w.destroy()
  })
})

describe('provenance says where a figure actually came from', () => {
  test('a figure from the file is tagged from the file, and one the file lacks is not', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      proposal: { openingBalanceSheet: { cashAtBank: 71000 } },
      provenance: { 'openingBalanceSheet.cashAtBank': 'file' }
    }))
    expect(w.vm.form.opening.cashAtBank.value).toBe(71000)
    expect(w.vm.form.opening.cashAtBank.source).toBe('file')
    expect(w.vm.form.opening.prepayments.source).toBe('entered')
    w.destroy()
  })

  test('a zero read from the file is still a fact from the file', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      proposal: { openingBalanceSheet: { accountsPayable: 0 } },
      provenance: { 'openingBalanceSheet.accountsPayable': 'file' }
    }))
    expect(w.vm.form.opening.accountsPayable.source).toBe('file')
    w.destroy()
  })

  test('editing a figure makes it the advisor’s own', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      proposal: { openingBalanceSheet: { cashAtBank: 71000 } },
      provenance: { 'openingBalanceSheet.cashAtBank': 'file' }
    }))
    w.vm.markEntered('opening.cashAtBank')
    expect(w.vm.form.opening.cashAtBank.source).toBe('entered')
    w.destroy()
  })

  test('🔴 last year’s months are a starting point, which is not the same as a fact', () => {
    const w = mountIntake()
    const lastYear = [85000, 70000, 75000, 80000, 60000, 65000, 70000, 70000, 80000, 95000, 70000, 70000]
    w.vm.applyIntake(intakeResponse({
      proposal: { sales: lastYear },
      provenance: { sales: 'seeded' }
    }))
    expect(w.vm.form.sales).toEqual(lastYear)
    expect(w.vm.form.salesSource).toBe('seeded')
    // 'seeded' is its own state — never folded into 'file'.
    expect(w.vm.form.salesSource).not.toBe('file')
    w.destroy()
  })
})

describe('a figure summed from several accounts can be corrected', () => {
  test('unticking one account re-totals the figure', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      proposal: { openingBalanceSheet: { inventory: 65000 } },
      provenance: { 'openingBalanceSheet.inventory': 'file' },
      candidates: { inventory: [{ label: 'Inventory', value: 40000 }, { label: 'Raw Materials', value: 25000 }] }
    }))
    expect(w.vm.hasCandidates('inventory')).toBe(true)
    w.vm.form.opening.inventory.candidates[1].selected = false
    w.vm.applyCandidates('inventory')
    expect(w.vm.form.opening.inventory.value).toBe(40000)
    w.destroy()
  })

  test('a figure from a single account has no tick rows', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      proposal: { openingBalanceSheet: { inventory: 65000 } },
      provenance: { 'openingBalanceSheet.inventory': 'file' }
    }))
    expect(w.vm.hasCandidates('inventory')).toBe(false)
    w.destroy()
  })
})

describe('the forecast is not built on a broken assumption', () => {
  test('🔴 a collection profile that does not total 100% blocks the build', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.debtor = [10, 40, 30, 0, 0] // 80%
    w.vm.buildForecast()
    expect(w.emitted().confirmed).toBeUndefined()
    expect(w.vm.buildError).toBeTruthy()
    w.destroy()
  })

  test('a supplier profile that does not total 100% blocks it too', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.creditor = [0, 50, 10, 0, 0] // 60%
    w.vm.buildForecast()
    expect(w.emitted().confirmed).toBeUndefined()
    w.destroy()
  })

  test('a complete set of assumptions hands over the inputs and the working state', () => {
    const w = mountIntake({ step: 3 })
    w.vm.buildForecast()
    const payload = w.emitted().confirmed[0][0]
    expect(payload.inputs.markup).toBeCloseTo(0.68, 10)
    // The state comes back as `restore`, so a step back keeps every badge.
    expect(payload.state.opening.cashAtBank).toBeDefined()
    w.destroy()
  })

  test('🔴 the client’s name is handed to the page, never folded into the compute payload', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.companyName = 'Acme Ltd'
    w.vm.buildForecast()
    const payload = w.emitted().confirmed[0][0]
    expect(payload.companyName).toBe('Acme Ltd')
    expect(JSON.stringify(payload.inputs)).not.toContain('Acme')
    w.destroy()
  })
})

describe('the manual path claims nothing from a file', () => {
  test('entering everything by hand leaves no figure tagged from a file', () => {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      proposal: { openingBalanceSheet: { cashAtBank: 71000 } },
      provenance: { 'openingBalanceSheet.cashAtBank': 'file' }
    }))
    w.vm.skipManual()
    const sources = Object.keys(w.vm.form.opening).map(k => w.vm.form.opening[k].source)
    expect(sources).not.toContain('file')
    expect(w.vm.form.salesSource).toBe('entered')
    w.destroy()
  })
})

describe('buying and selling capital assets', () => {
  /**
   * The block Mike approved on 2026-09-03. Its whole job is to reach `additions`,
   * `disposals` and `proceeds` — three series the engine has always taken and the screen
   * sent as hardcoded zeroes, so R3, R4 and R10 were built and unreachable.
   *
   * What is tested here is the FOLD from a row list into the engine's 6 x 12 grid, which
   * is the part a person in UAT cannot check: a row landing in the wrong month or the
   * wrong category still produces a forecast that looks entirely normal.
   */
  const rowsOf = (w, list) => { w.vm.form.capital = list; return w.vm.buildInputs().assets }

  test('a purchase lands on its own category and month, as an addition', () => {
    const w = mountIntake({ step: 3 })
    const assets = rowsOf(w, [{ what: 'Delivery van', category: 0, month: 2, direction: 'buy', price: 45000, bookValue: 0 }])
    expect(assets[0].additions[2]).toBe(45000)
    expect(assets[0].additions.filter(v => v !== 0)).toHaveLength(1)
    expect(assets[0].disposals.every(v => v === 0)).toBe(true)
    // No other category is touched.
    expect(assets.slice(1).every(a => a.additions.every(v => v === 0))).toBe(true)
    w.destroy()
  })

  test('🔴 a sale sends the book value as the disposal and the price as the proceeds', () => {
    // The split is the whole of R10. Sending the price as the disposal — which is what
    // the screen would do if these two were ever crossed — writes the sale price off the
    // asset register and loses the gain, silently.
    const w = mountIntake({ step: 3 })
    const assets = rowsOf(w, [{ what: 'Old van', category: 0, month: 5, direction: 'sell', price: 12000, bookValue: 8000 }])
    expect(assets[0].disposals[5]).toBe(8000)
    expect(assets[0].proceeds[5]).toBe(12000)
    expect(assets[0].additions.every(v => v === 0)).toBe(true)
    w.destroy()
  })

  test('two rows in the same category and month add together', () => {
    const w = mountIntake({ step: 3 })
    const assets = rowsOf(w, [
      { what: 'Racking', category: 2, month: 8, direction: 'buy', price: 18000, bookValue: 0 },
      { what: 'Forklift', category: 2, month: 8, direction: 'buy', price: 22000, bookValue: 0 }
    ])
    expect(assets[2].additions[8]).toBe(40000)
    w.destroy()
  })

  test('no rows sends twelve zeroes, exactly as before the block existed', () => {
    const w = mountIntake({ step: 3 })
    const assets = w.vm.buildInputs().assets
    assets.forEach((a) => {
      expect(a.additions).toEqual(new Array(12).fill(0))
      expect(a.disposals).toEqual(new Array(12).fill(0))
      expect(a.proceeds).toEqual(new Array(12).fill(0))
    })
    w.destroy()
  })

  test('a negative figure is refused rather than guessed at', () => {
    // The drawing's own rule: the Buy/Sell tick carries the direction, so a minus sign
    // means something the screen cannot know. It must not silently become a purchase.
    const w = mountIntake({ step: 3 })
    w.vm.form.capital = [{ what: 'Old van', category: 0, month: 1, direction: 'sell', price: -12000, bookValue: 8000 }]
    w.vm.buildForecast()
    expect(w.vm.capitalNegativeRows).toEqual([1])
    expect(w.emitted().confirmed).toBeUndefined()
    w.destroy()
  })

  test('the category list carries the rate in force, not the platform default', () => {
    // Mike's ruling: step 2 lets an advisor change all six, so a list hardcoded to 20%
    // would contradict the rate they had just set two groups above.
    const w = mountIntake({ step: 3 })
    w.vm.form.assets[0].rate = 33
    expect(w.vm.capitalCategories[0].label).toContain('33')
    expect(w.vm.capitalCategories[0].label).not.toContain('20')
    w.destroy()
  })

  test('the rows survive a step back and forward', () => {
    // They live in `form`, which the page hands back as `restore` — a row list wiped by
    // checking something on the previous screen is a re-typing job, not a bug report.
    const w = mountIntake({ step: 3 })
    w.vm.form.capital = [{ what: 'Delivery van', category: 0, month: 2, direction: 'buy', price: 45000, bookValue: 0 }]
    w.vm.buildForecast()
    const state = w.emitted().confirmed[0][0].state
    const back = mountIntake({ step: 3, restore: state })
    expect(back.vm.form.capital).toHaveLength(1)
    expect(back.vm.form.capital[0].price).toBe(45000)
    back.destroy()
    w.destroy()
  })

  test('a form restored from before the block existed opens with an empty list', () => {
    const w = mountIntake({ step: 3 })
    const old = JSON.parse(JSON.stringify(w.vm.form))
    delete old.capital
    const back = mountIntake({ step: 3, restore: old })
    expect(back.vm.form.capital).toEqual([])
    back.destroy()
    w.destroy()
  })

  test('the two totals count each direction, and only its own', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.capital = [
      { what: 'Delivery van', category: 0, month: 2, direction: 'buy', price: 45000, bookValue: 0 },
      { what: 'Racking', category: 2, month: 5, direction: 'buy', price: 18000, bookValue: 0 },
      { what: 'Old van', category: 0, month: 2, direction: 'sell', price: 12000, bookValue: 8000 }
    ]
    expect(w.vm.capitalBuyTotal).toBe(63000)
    expect(w.vm.capitalSellTotal).toBe(12000)
    w.destroy()
  })
})

/**
 * The volatility read on step 3.
 *
 * Approved artefact: design/mockups/three-way-forecast-volatility.html (approved by Mike
 * 2026-09-03, all nine of its questions ruled first).
 *
 * The arithmetic is volatilityModel.test.js's and is not repeated here. What is tested is
 * the wiring only this screen has, and only where it could be wrong invisibly: which
 * months are sent, that the forecast is sent alongside them, that a failed recompute never
 * leaves a live-looking comparison on screen, and that too few months produce a stated
 * reason rather than a missing block.
 */
describe('the volatility read', () => {
  /** Twelve months with the shape the approved drawing uses. */
  function history (n) {
    const out = []
    // Deliberately nowhere near the forecast figure used below, so "the forecast is not in
    // the measured series" is a real assertion rather than a coincidence of values.
    for (let i = 0; i < n; i++) { out.push({ label: 'M' + i, ordinal: 24000 + i, value: 70000 + (i % 3) * 1000 }) }
    return out
  }

  afterEach(() => { delete global.fetch; jest.clearAllMocks() })

  test('🔴 sends the WHOLE run and the forecast beside it, so the bands are the history’s', () => {
    // The bands must be measured from the actual months alone. If the forecast were sent
    // as part of `sales`, an optimistic year would widen its own normal range and then sit
    // inside it — a block that agrees with whatever it is shown.
    global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: false }) }))
    const w = mountIntake({ step: 3 })
    w.vm.form.history = history(24)
    w.vm.form.sales = new Array(12).fill(450000)
    w.vm.refreshVolatility()

    // Found BY URL, not by position. The screen also reads the mentor's sell-down ladder on
    // mount (item 4.64), so the volatility POST is no longer the first call — and a screen
    // that grows another read must not be able to break an assertion about this one.
    const call = global.fetch.mock.calls.filter(c => c[0] === '/api/report/volatility')[0]
    const body = JSON.parse(call[1].body)
    expect(body.sales).toHaveLength(24)
    expect(body.forecast).toHaveLength(12)
    expect(body.sales).not.toContain(450000)
    w.destroy()
  })

  test('measures the largest window the months support, never more', () => {
    // The engine offers 12, 18 and 24. Twenty months in hand is measured over eighteen —
    // asking for twenty would silently fall back to twelve.
    const w = mountIntake({ step: 3 })
    w.vm.form.history = history(20)
    expect(w.vm.volatilityWindow).toBe(18)
    w.vm.form.history = history(24)
    expect(w.vm.volatilityWindow).toBe(24)
    w.vm.form.history = history(12)
    expect(w.vm.volatilityWindow).toBe(12)
    w.destroy()
  })

  test('🔴 stops inviting a second export once there is nothing left to gain', () => {
    // Found by opening the built screen, not by a test: with both exports already dropped
    // the block still said "drop last year's export as well and this reads up to 24" while
    // it was already reading 24. 24 is the engine's longest window, so the invitation has
    // to go at that point.
    const w = mountIntake({ step: 3 })
    w.vm.form.history = history(12)
    expect(w.vm.canReadMoreMonths).toBe(true)
    w.vm.form.history = history(18)
    expect(w.vm.canReadMoreMonths).toBe(true)
    w.vm.form.history = history(24)
    expect(w.vm.canReadMoreMonths).toBe(false)
    w.destroy()
  })

  test('eleven complete months measure nothing rather than measuring something shorter', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.history = history(11)
    expect(w.vm.volatilityWindow).toBe(0)
    w.destroy()
  })

  test('a failed recompute is declared, never left looking live', () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const w = mountIntake({ step: 3 })
    w.vm.form.history = history(12)
    return w.vm.refreshVolatility().then(() => {
      expect(w.vm.volatilityStale).toBe(true)
      w.destroy()
    })
  })

  test('the run survives stepping back and forward, and an old form opens without it', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.history = history(24)
    const saved = JSON.parse(JSON.stringify(w.vm.form))
    expect(mountIntake({ step: 3, restore: saved }).vm.form.history).toHaveLength(24)

    delete saved.history
    expect(mountIntake({ step: 3, restore: saved }).vm.form.history).toEqual([])
    w.destroy()
  })
})

describe('the volatility read renders', () => {
  const { computeVolatility } = require('~/server/report/volatilityModel')

  /**
   * The drawing's own example: eleven seeded months with January raised to 140,000. A
   * template or binding fault here would break the WHOLE of step 3, not just this block,
   * so one render of the real engine's output is worth its place — it is the failure a
   * unit test catches and a person only meets by opening the screen.
   */
  test('builds the chart from the engine’s own output without falling over', async () => {
    const HISTORY = [85000, 70000, 75000, 80000, 60000, 65000, 70000, 70000, 80000, 95000, 70000, 70000]
    const forecast = HISTORY.slice()
    forecast[9] = 140000
    const data = computeVolatility({ sales: HISTORY, window: 12, forecast })

    global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data }) }))
    const w = mountIntake({ step: 3 })
    w.vm.phase = 'assume'
    w.vm.form.history = HISTORY.map((value, i) => ({ label: 'M' + i, ordinal: 24290 + i, value }))
    w.vm.form.sales = forecast.slice()
    await w.vm.refreshVolatility()
    await w.vm.$nextTick()

    // One dot per month across both halves, and the two lines joining them.
    const chart = w.vm.volatilityChart
    expect(chart.points).toHaveLength(24)
    expect(chart.actualLine.split(' ')).toHaveLength(12)
    expect(chart.forecastLine.split(' ')).toHaveLength(12)
    // January is the red one; nothing else is.
    expect(chart.points.filter(p => p.fill === '#ff0000')).toHaveLength(1)
    // The red band fires and the amber one does not, and the seasonality sentence exists.
    expect(w.vm.redBand).not.toBeNull()
    expect(w.vm.amberBand).toBeNull()
    expect(w.vm.seasonalSentence).toBeTruthy()
    // …and it actually paints: 24 month dots plus the dial's own two hub circles. A
    // binding fault would leave the SVG empty while every computed above still passed.
    expect(w.findAll('circle').length).toBeGreaterThanOrEqual(24)
    delete global.fetch
    w.destroy()
  })
})

/**
 * The shipment calculator panel (item 4.64 slice 2).
 *
 * The dates themselves are the backend's and are pinned in importShipmentModel.test.js.
 * What is tested here is the wiring only this screen has, and only where it could be wrong
 * invisibly: that the resolved landings actually reach the payload, that the tick governs
 * them, and that a forecast saved before the panel existed still opens.
 */
describe('the shipment calculator panel', () => {
  afterEach(() => { delete global.fetch; jest.clearAllMocks() })

  /** What the backend answers with, shaped as the route sends it. */
  const RESOLVED = {
    rows: [{ description: 'C1', cost: 90000, orderDate: '2026-05-02', landsOn: '2026-09-24', balanceDueOn: '2026-08-01', sellableOn: '2026-10-03', landsInMonth: 5, depositMonth: 1, balanceMonth: 4, deposit: 54000, balance: 36000, interest: 546, depositPct: 0.6, speed: 'Sea', sellableInMonth: 6 }],
    importedPurchases: [0, 0, 0, 0, 0, 90000, 0, 0, 0, 0, 0, 0],
    deposits: [0, 54000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    balances: [0, 0, 0, 0, 36000, 0, 0, 0, 0, 0, 0, 0],
    interest: [0, 0, 0, 0, 546, 0, 0, 0, 0, 0, 0, 0],
    landings: [{ value: 90000, landsInMonth: 5, depositPct: 0.6, depositMonth: 1, balanceMonth: 4, interest: 546 }],
    beyondYear: []
  }

  // 🔴 THE LANDINGS MUST REACH THE ENGINE. Without them the engine falls back to one
  // averaged deposit lead and one balance profile — the screen would show real dates while
  // the forecast used approximated ones, and nothing would look wrong.
  test('the resolved landings are sent with the forecast', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.overseas.enabled = true
    w.vm.shipmentResult = RESOLVED
    const sent = w.vm.overseasInputs()
    expect(sent.landings).toHaveLength(1)
    expect(sent.landings[0].balanceMonth).toBe(4)
    expect(sent.landings[0].interest).toBe(546)
    w.destroy()
  })

  // The same trap `enabled` was fixed for in the engine: an advisor who enters containers
  // and then unticks the section must get today's forecast back, not half of one.
  test('with the tick off no landings are sent, whatever was entered', () => {
    const w = mountIntake({ step: 3 })
    w.vm.form.overseas.enabled = false
    w.vm.shipmentResult = RESOLVED
    expect(w.vm.overseasInputs().landings).toEqual([])
    w.destroy()
  })

  test('a forecast saved before this panel existed still opens', () => {
    const w = mountIntake({ step: 3 })
    const old = JSON.parse(JSON.stringify(w.vm.form))
    delete old.overseas.shipments
    delete old.overseas.shipmentTerms
    const back = mountIntake({ step: 3, restore: old })
    expect(back.vm.form.overseas.shipments).toEqual([])
    expect(back.vm.form.overseas.shipmentTerms.manufactureDays).toBe(120)
    back.destroy()
    w.destroy()
  })

  test('the twelve landing figures are filled once a shipment resolves', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true, data: RESOLVED })
    }))
    const w = mountIntake({ step: 3 })
    w.vm.form.startDate = '2026-04-01'
    w.vm.form.overseas.shipments = [{ description: 'C1', cost: 90000, orderDate: '2026-05-02', depositPct: 60, speed: 'Sea' }]
    await w.vm.refreshShipments()
    expect(w.vm.form.overseas.importedPurchases[5]).toBe(90000)
    expect(w.vm.shipmentsDrive).toBe(true)
    w.destroy()
  })

  // A half-typed row is the normal state of this panel, not an error — it must not post.
  test('a row with no order date is not sent, and clears nothing', () => {
    global.fetch = jest.fn()
    const w = mountIntake({ step: 3 })
    w.vm.form.startDate = '2026-04-01'
    w.vm.form.overseas.shipments = [{ description: '', cost: 0, orderDate: '', depositPct: 60, speed: 'Sea' }]
    w.vm.refreshShipments()
    // Checked BY URL: mounting the screen legitimately reads the mentor's ladder, so
    // "fetch was never called" would be asserting something else entirely.
    const posted = global.fetch.mock.calls.filter(c => c[0] === '/api/report/import-shipments')
    expect(posted).toHaveLength(0)
    expect(w.vm.shipmentsDrive).toBe(false)
    w.destroy()
  })

  test('a backend failure leaves the advisor able to finish by hand', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const w = mountIntake({ step: 3 })
    w.vm.form.startDate = '2026-04-01'
    w.vm.form.overseas.importedPurchases = [0, 0, 0, 0, 0, 12345, 0, 0, 0, 0, 0, 0]
    w.vm.form.overseas.shipments = [{ description: 'C1', cost: 90000, orderDate: '2026-05-02', depositPct: 60, speed: 'Sea' }]
    await w.vm.refreshShipments()
    // Nothing was overwritten and nothing threw.
    expect(w.vm.form.overseas.importedPurchases[5]).toBe(12345)
    expect(w.vm.shipmentsDrive).toBe(false)
    w.destroy()
  })
})

/**
 * 🔴 THE OPENING-BALANCE BAND ON STEP 2 (2026-09-05).
 *
 * The band exists because the engine has always worked this figure out and nothing showed
 * it until step 4. Its own first outing on the running app reported a real client's
 * balance sheet as 2,502,897 out when the engine ties it to nil, because every opening
 * figure on this form is a `{value, source}` pair and the computed read `.opening`
 * directly — NaN, hidden by `|| 0`, so the fixed assets, the loans and the shareholder
 * accounts silently counted as nothing.
 *
 * A NUMBER AN ADVISOR ACTS ON, WITH NOTHING BEHIND IT. That is what earns these tests:
 * the band is either right or it sends someone hunting a hole in accounts that balance.
 */
describe('the opening balance check on step 2', () => {
  /** One opening slot, in the shape the form actually holds. */
  const slot = value => ({ value, source: 'file' })

  /**
   * A form whose opening position ties: assets 585,000 = liabilities 267,500 +
   * equity 317,500 — the same shape as the intake suite's sweep fixture.
   */
  function tieing (w) {
    Object.keys(w.vm.form.opening).forEach((k) => { w.vm.form.opening[k] = slot(0) })
    w.vm.form.opening.cashAtBank = slot(120000)
    w.vm.form.opening.accountsReceivable = slot(80000)
    w.vm.form.opening.inventory = slot(30000)
    w.vm.form.opening.otherCurrentAsset = slot(225000)
    w.vm.form.opening.accountsPayable = slot(40000)
    w.vm.form.opening.otherCurrentLiability = slot(158500)
    w.vm.form.opening.otherNonCurrentLiability = slot(9000)
    w.vm.form.opening.authorisedCapital = slot(100)
    w.vm.form.opening.retainedEarnings = slot(367400)
    w.vm.form.opening.otherEquity = slot(-50000)
    w.vm.form.assets.forEach((a) => { a.opening = slot(0) })
    w.vm.form.assets[0].opening = slot(30000) // vehicles, net of depreciation
    w.vm.form.assets[5].opening = slot(100000) // goodwill, in the Other category
    w.vm.form.loans.forEach((l) => { l.opening = slot(0) })
    w.vm.form.loans[0].opening = slot(60000)
    w.vm.form.shareholders.forEach((s) => { s.opening = slot(0) })
  }

  test('a position that ties reports nil, and the band stays away', () => {
    const w = mountIntake({ step: 2 })
    tieing(w)
    expect(w.vm.openingBalanceCheck).toBe(0)
    expect(w.vm.openingOutOfBalance).toBe(false)
    w.destroy()
  })

  test('🔴 the fixed assets, the loans and the shareholders are COUNTED', () => {
    // The regression itself. Each of the three was read as a bare number, gave NaN, and
    // fell to 0 — so removing any one of them must move the check by its own amount.
    const w = mountIntake({ step: 2 })
    tieing(w)
    w.vm.form.assets[5].opening = { value: 0, source: 'file' }
    expect(w.vm.openingBalanceCheck).toBe(100000) // the goodwill, not silently ignored
    tieing(w)
    w.vm.form.loans[0].opening = { value: 0, source: 'file' }
    expect(w.vm.openingBalanceCheck).toBe(-60000) // the loan, not silently ignored
    tieing(w)
    w.vm.form.shareholders[0].opening = { value: 25000, source: 'file' }
    expect(w.vm.openingBalanceCheck).toBe(25000) // in credit: the company owes it
    w.destroy()
  })

  test('a real gap is reported as the amount it is, on the right side', () => {
    const w = mountIntake({ step: 2 })
    tieing(w)
    w.vm.form.opening.inventory = slot(35000) // 5,000 of stock that is not funded
    expect(w.vm.openingBalanceCheck).toBe(-5000)
    expect(w.vm.openingOutOfBalance).toBe(true)
    w.destroy()
  })

  test('only catch-all lines a FILE filled are offered back for moving', () => {
    const w = mountIntake({ step: 2 })
    tieing(w)
    expect(w.vm.sweptLines.map(s => s.key)).toEqual(
      ['otherCurrentAsset', 'otherCurrentLiability', 'otherNonCurrentLiability', 'otherEquity'])
    // A figure the advisor typed there needs no explaining back to them.
    w.vm.form.opening.otherCurrentAsset = { value: 225000, source: 'entered' }
    expect(w.vm.sweptLines.map(s => s.key)).not.toContain('otherCurrentAsset')
    w.destroy()
  })
})

/**
 * Fix 1 (a facility) and Fix 2 (stock in transit), built 2026-09-05 from the drawing
 * `design/mockups/three-way-forecast-facilities-and-transit.html`, whose ten questions
 * Mike ruled the same day.
 *
 * What is tested here is what the screen SENDS and what it computes — never a label, a
 * heading or a class. `$t()` returns the key, so nothing below pins his wording, and a
 * person in UAT judges the words better than an assertion can.
 */
describe('the funding table carries a Type, and rows as they are needed', () => {
  test('a facility leaves the screen as a facility, with no monthly repayment', () => {
    const w = mountIntake()
    w.vm.form.loans[0].type = 'facility'
    w.vm.form.loans[0].opening.value = 2450000
    w.vm.form.loans[0].rate = 8
    // A figure left in the box from before the Type was switched must not survive and
    // quietly amortise behind a disabled box that says there is no set repayment.
    w.vm.form.loans[0].repayment = 25000
    const sent = w.vm.buildInputs().loans[0]
    expect(sent.type).toBe('facility')
    expect(sent.monthlyRepayment).toBe(0)
    expect(sent.opening).toBe(2450000)
    expect(sent.interestRate).toBeCloseTo(0.08, 10)
    w.destroy()
  })

  test('an untouched row is a term loan, which is what it always computed as', () => {
    const w = mountIntake()
    expect(w.vm.buildInputs().loans[0].type).toBe('term')
    w.destroy()
  })

  test('Add a funding line stops at the cap', () => {
    const w = mountIntake()
    for (let i = 0; i < 20; i++) { w.vm.addFundingLine() }
    expect(w.vm.form.loans).toHaveLength(w.vm.maxLoanRows)
    expect(w.vm.buildInputs().loans).toHaveLength(w.vm.maxLoanRows)
    w.destroy()
  })

  test('🔴 the file’s own count of loans reaches the screen, not this form’s', () => {
    // Until 2026-09-05 this stopped at whatever rows the blank form held, so a client with
    // six loans lost three of them between the backend and the screen — and the advisor
    // was told only that some had been "combined".
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({
      proposal: { loans: [{ opening: 10 }, { opening: 20 }, { opening: 30 }, { opening: 40 }, { opening: 50 }, { opening: 60 }] },
      provenance: { 'loans.0.opening': 'file' }
    }))
    expect(w.vm.form.loans).toHaveLength(6)
    expect(w.vm.buildInputs().loans.map(l => l.opening)).toEqual([10, 20, 30, 40, 50, 60])
    w.destroy()
  })
})

describe('stock already paid for, not yet arrived', () => {
  /** Put a deposit on the opening position, as a file would. */
  function withDeposit (w, amount) {
    w.vm.form.opening.stockInTransitDeposits.value = amount
    w.vm.form.opening.stockInTransitDeposits.source = 'file'
  }

  test('the block appears only when the opening position carries a deposit', () => {
    const w = mountIntake()
    expect(w.vm.hasStockInTransit).toBe(false)
    withDeposit(w, 825629)
    expect(w.vm.hasStockInTransit).toBe(true)
    w.destroy()
  })

  test('the two figures no balance sheet carries leave the screen with the rest', () => {
    const w = mountIntake()
    withDeposit(w, 825629)
    w.vm.form.stockInTransit.balanceOwing = 550419
    w.vm.form.stockInTransit.landing[1] = 330252
    const sent = w.vm.buildInputs()
    expect(sent.openingBalanceSheet.stockInTransitDeposits).toBe(825629)
    expect(sent.stockInTransit.balanceOwing).toBe(550419)
    expect(sent.stockInTransit.landing[1]).toBe(330252)
    expect(sent.stockInTransit.landing).toHaveLength(12)
    w.destroy()
  })

  test('🔴 the deposit counts as an asset in the step 2 balance check', () => {
    // Naming the deposit moves it out of the Other-current-asset catch-all. If the check
    // did not follow it, step 2 would report a gap of the whole deposit on a file that
    // ties — which is the exact failure the check was added on 2026-09-05 to stop.
    const w = mountIntake()
    const before = w.vm.openingBalanceCheck
    withDeposit(w, 825629)
    expect(w.vm.openingBalanceCheck).toBe(Math.round((before - 825629) * 100) / 100)
    w.destroy()
  })

  test('a shortfall is reported as a remainder and never blocks the build', () => {
    const w = mountIntake()
    withDeposit(w, 825629)
    // `$set`, because that is the path the screen itself takes: Vue compiles v-model on a
    // bracket expression into $set. A raw index assignment is invisible to Vue 2 and would
    // leave the computed stale here while the real screen worked.
    w.vm.$set(w.vm.form.stockInTransit.landing, 1, 644629)
    expect(w.vm.transitLandedTotal).toBe(644629)
    expect(w.vm.transitFullyLanded).toBe(false)
    // What is pinned is that a shortfall does not stop the forecast being built — Mike's
    // ruling of 2026-09-05, and deliberately the opposite of the collection profiles.
    w.vm.$set(w.vm.form.stockInTransit.landing, 3, 181000)
    expect(w.vm.transitFullyLanded).toBe(true)
    w.destroy()
  })

  test('a form saved before either fix existed restores rather than breaking', () => {
    const old = {
      opening: {},
      assets: [],
      shareholders: [],
      overheads: {},
      sales: zeroes(),
      purchases: zeroes()
    }
    const w = mountIntake({ restore: old })
    expect(Array.isArray(w.vm.form.stockInTransit.landing)).toBe(true)
    expect(w.vm.form.stockInTransit.landing).toHaveLength(12)
    expect(w.vm.form.loans.every(l => l.type === 'term')).toBe(true)
    w.destroy()
  })
})

/**
 * 🔴 A PART-SEEDED SALES GRID — Mike's ruling, 2026-09-07.
 *
 * "I want it to bring in the sales and cost figures it DOES have - and notify the user that
 * the remaining months need to be added manually." Before this, a run short of twelve
 * seeded nothing at all, and he met the consequence the same day: eleven complete months
 * discarded, and a forecast showing a $202,781 loss on $0 of sales.
 *
 * What earns a test here is the TAGGING, not the wording. A month the export never reached
 * carrying a green "starting point" badge is the badge saying the opposite of the truth,
 * and an advisor would leave a zero in the forecast believing it came from their client's
 * accounts.
 */
describe('the sales grid when only some months came through', () => {
  /** An intake response seeding `n` of the twelve months. */
  function partial (n) {
    const sales = new Array(12).fill(0)
    for (let i = 0; i < n; i++) { sales[i] = 1000 * (i + 1) }
    return intakeResponse({
      proposal: { sales },
      provenance: { sales: 'seeded' },
      salesSeededMonths: n
    })
  }

  test('🔴 only the months that came from the file are tagged as seeded', () => {
    const w = mountIntake()
    w.vm.applyIntake(partial(8))
    expect(w.vm.form.salesSeededMonths).toBe(8)
    expect(w.vm.isSeededMonth(0)).toBe(true)
    expect(w.vm.isSeededMonth(7)).toBe(true)
    expect(w.vm.isSeededMonth(8)).toBe(false)
    expect(w.vm.isSeededMonth(11)).toBe(false)
    w.destroy()
  })

  test('the months still owed are named, so nobody has to count boxes', () => {
    const w = mountIntake()
    w.vm.applyIntake(partial(9))
    expect(w.vm.monthsNeedingYou).toHaveLength(3)
    expect(w.vm.needsAMonth(9)).toBe(true)
    expect(w.vm.needsAMonth(8)).toBe(false)
    w.destroy()
  })

  test('a full twelve names nothing as owed', () => {
    const w = mountIntake()
    w.vm.applyIntake(partial(12))
    expect(w.vm.monthsNeedingYou).toEqual([])
    expect(w.vm.isSeededMonth(11)).toBe(true)
    w.destroy()
  })

  test('with no file at all, no month is marked as owed — every one is the advisor’s', () => {
    // Marking twelve months amber on a form nobody has uploaded to adds nothing.
    const w = mountIntake()
    expect(w.vm.form.salesSource).toBe('entered')
    expect(w.vm.monthsNeedingYou).toEqual([])
    expect(w.vm.needsAMonth(0)).toBe(false)
    w.destroy()
  })

  test('a form saved before this existed reads as whole, not as partial', () => {
    const old = {
      opening: {},
      assets: [],
      shareholders: [],
      overheads: {},
      sales: new Array(12).fill(5000),
      salesSource: 'seeded',
      purchases: zeroes()
    }
    const w = mountIntake({ restore: old })
    expect(w.vm.form.salesSeededMonths).toBe(12)
    expect(w.vm.monthsNeedingYou).toEqual([])
    w.destroy()
  })
})

/**
 * The quick-fire option (item 4.71) — drawing approved by Mike 2026-09-07.
 *
 * 🔴 EVERY FAULT THIS FEATURE CAN HAVE IS A PLAUSIBLE WRONG NUMBER. Growth applied to the
 * base instead of compounding, a margin converted the wrong way, an overhead line grown
 * twice — the forecast still balances and the screen still looks right. That is the class
 * of thing UAT cannot catch, and it is what these tests are for.
 *
 * `utils/quickFireForecast` holds the arithmetic and its own suite pins it against the
 * approved drawing's figures. What is checked HERE is the seam: that the grid reaches the
 * engine, that it reaches ONLY the three fields Mike ruled it may touch, and that
 * unticking leaves the advisor's own figures exactly where they were.
 */
describe('the quick-fire option on step 3 (item 4.71)', () => {
  /** A form with twelve seeded months of real shape, as a by-month export leaves it. */
  function seeded (w) {
    w.vm.form.salesSource = 'seeded'
    w.vm.form.sales = [60000, 62000, 95000, 70000, 71000, 68000, 74000, 80000, 88000, 77000, 73000, 72000]
    w.vm.form.markup = 67.9245283
    w.vm.form.overheads.rent.value = 90000
    w.vm.form.overheads.wages.value = 100000
    w.vm.form.overheads.power.value = 20000
  }

  test('it starts switched off, so a form nobody has touched forecasts what it always did', () => {
    const w = mountIntake()
    seeded(w)
    const before = w.vm.buildInputs()
    expect(w.vm.form.quickFire.enabled).toBe(false)
    expect(before.sales[2]).toBe(95000)
    expect(before.markup).toBeCloseTo(0.679245283, 6)
    w.destroy()
  })

  test('🔴 the tick is UNAVAILABLE with no file, rather than hidden (Mike, question 3)', () => {
    const w = mountIntake()
    expect(w.vm.form.salesSource).toBe('entered')
    expect(w.vm.quickFireAvailable).toBe(false)
    // and switching it on regardless cannot open it — there is nothing to grow from
    w.vm.form.quickFire.enabled = true
    expect(w.vm.quickFireOpen).toBe(false)
    w.destroy()
  })

  test('🔴 ticked, the GROWN figures reach the engine — compounding, not off the base', () => {
    const w = mountIntake()
    seeded(w)
    w.vm.form.quickFire.enabled = true
    w.vm.form.quickFire.years[0] = { salesGrowth: 8, grossMargin: 41, overheadsIncrease: 4 }
    const sent = w.vm.buildInputs()
    // March, the heavy month, grown by 8% — not a flat twelfth of the year
    expect(Math.round(sent.sales[2])).toBe(102600)
    expect(Math.round(sent.sales.reduce((a, v) => a + v, 0))).toBe(961200)
    // margin 41% reaches the engine as a mark-up on cost, in the engine's own units
    expect(sent.markup).toBeCloseTo(0.694915, 5)
    expect(Math.round(sent.overheads.rent)).toBe(93600)
    w.destroy()
  })

  test('🔴 it NEVER writes to the advisor\'s own figures — untick and they are all still there', () => {
    const w = mountIntake()
    seeded(w)
    w.vm.form.quickFire.enabled = true
    w.vm.form.quickFire.years[0] = { salesGrowth: 8, grossMargin: 41, overheadsIncrease: 4 }
    w.vm.buildInputs()
    // the form itself is untouched while quick-fire is driving
    expect(w.vm.form.sales[2]).toBe(95000)
    expect(w.vm.form.overheads.rent.value).toBe(90000)
    expect(w.vm.form.markup).toBe(67.9245283)
    // and unticking restores them to the engine with nothing to undo
    w.vm.form.quickFire.enabled = false
    const after = w.vm.buildInputs()
    expect(after.sales[2]).toBe(95000)
    expect(Math.round(after.overheads.rent)).toBe(90000)
    expect(after.markup).toBeCloseTo(0.679245283, 6)
    w.destroy()
  })

  test('🔴 it touches THREE fields only — everything else on step 3 is unchanged', () => {
    // Mike ruled quick-fire replaces the sales line, the mark-up and the overheads. A
    // growth percentage says nothing about debtor days or a tax rate, and a change that
    // quietly reached one would be invisible on screen.
    const w = mountIntake()
    seeded(w)
    const before = w.vm.buildInputs()
    w.vm.form.quickFire.enabled = true
    w.vm.form.quickFire.years[0] = { salesGrowth: 25, grossMargin: 55, overheadsIncrease: 30 }
    const after = w.vm.buildInputs()
    const moved = Object.keys(after).filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k]))
    expect(moved.sort()).toEqual(['markup', 'overheads', 'sales'])
    w.destroy()
  })

  test('a form saved before quick-fire existed restores with the grid off, not broken', () => {
    const old = {
      opening: {}, assets: [], shareholders: [], overheads: {}, sales: zeroes(), purchases: zeroes()
    }
    const w = mountIntake({ restore: old })
    expect(w.vm.form.quickFire.enabled).toBe(false)
    expect(w.vm.form.quickFire.years).toHaveLength(3)
    w.destroy()
  })
})

describe('the Fixed Asset Schedule on the Sell row (item 4.65)', () => {
  /** A schedule as the intake route sends it, cut to three assets. */
  function schedule (over) {
    return Object.assign({
      companyName: 'Apex Auto & Engineering Ltd',
      reportDate: 'Financial Year Ending December 31, 2025',
      assets: [
        { name: '2021 Toyota HiAce Service Van', code: 'FA-008', group: 'Motor Vehicles', purchaseDate: '10/04/2021', cost: 48000, bookValue: 24000, accumulatedDepreciation: 24000, depreciationRate: 10, depreciationMethod: 'Straight Line' },
        { name: '2018 Ford Ranger Utility', code: 'FA-009', group: 'Motor Vehicles', purchaseDate: '18/09/2022', cost: 37000, bookValue: 31500, accumulatedDepreciation: 5500, depreciationRate: 10, depreciationMethod: 'Diminishing Value' },
        { name: 'High-Spec Dev Workstation', code: 'FA-010', group: 'Office Equipment', purchaseDate: '15/01/2023', cost: 6500, bookValue: 3033.33, accumulatedDepreciation: 3466.67, depreciationRate: 20, depreciationMethod: 'Straight Line' }
      ],
      totalCost: 91500,
      totalBookValue: 58533.33,
      tie: { available: true, ties: false, scheduleTotal: 58533.33, balanceSheetTotal: 145300, difference: 86766.67 }
    }, over || {})
  }

  /** Mount, apply a schedule, and add one Sell row. */
  function withSellRow (over) {
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({ assetSchedule: schedule(over) }))
    w.vm.addCapitalRow()
    w.vm.form.capital[0].direction = 'sell'
    return w
  }

  test('no schedule dropped leaves the row exactly as it was before', () => {
    // The whole promise of question 5: an advisor who drops nothing sees today's screen.
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse())
    expect(w.vm.assetSchedule).toBeNull()
    expect(w.vm.sellableAssets).toEqual([])
    w.vm.addCapitalRow()
    w.vm.form.capital[0].direction = 'sell'
    expect(w.vm.capitalBookValue(w.vm.form.capital[0])).toBeNull()
    w.destroy()
  })

  test('🔴 choosing an asset depreciates it to the month of sale', () => {
    // Question 1, ruled by Mike 2026-09-08. The Ford Ranger is carried at 31,500 at the last
    // balance date; sold in month 3 it has been written down through months 1 and 2 at the
    // Vehicles rate. Using the schedule's own figure would overstate the loss on sale, and
    // the forecast would balance either way.
    const w = withSellRow()
    w.vm.chooseAsset(0, '1')
    const row = w.vm.form.capital[0]
    row.month = 2 // zero-based on screen: the third month

    expect(row.what).toBe('2018 Ford Ranger Utility')
    // 31,500 - 525 = 30,975; 30,975 - 516 = 30,459
    expect(w.vm.capitalBookValue(row).bookValue).toBe(30459)
    w.destroy()
  })

  test('a sale in the first month uses the schedule figure untouched', () => {
    const w = withSellRow()
    w.vm.chooseAsset(0, '1')
    w.vm.form.capital[0].month = 0
    expect(w.vm.capitalBookValue(w.vm.form.capital[0]).bookValue).toBe(31500)
    w.destroy()
  })

  test('🔴 the computed figure is what reaches the engine, not the typed one', () => {
    // The seam that matters. If the payload kept sending `row.bookValue` the screen would
    // show one number and the forecast would use another - and both would balance.
    const w = withSellRow()
    w.vm.chooseAsset(0, '1')
    const row = w.vm.form.capital[0]
    row.month = 2
    row.bookValue = 999999 // a stale typed value that must be ignored

    const vehicles = w.vm.capitalSeries()[0]
    expect(vehicles.disposals[2]).toBe(30459)
    w.destroy()
  })

  test('🔴 with a schedule loaded there is STILL a way to type a sale that is not on it', () => {
    // Question 5, and the gap the build itself found when it was laid beside the drawing: the
    // first version showed ONLY the chooser once a schedule was read, which made the schedule
    // the only way in. An asset bought and sold inside the same forecast year appears on no
    // schedule, and its advisor would have had to pick the nearest wrong asset.
    const w = withSellRow()
    expect(w.vm.rowAsset(w.vm.form.capital[0])).toBeNull()

    w.vm.chooseAsset(0, 'typed')
    const row = w.vm.form.capital[0]
    expect(row.assetKey).toBe('typed')
    // no schedule asset is attached, so the typed boxes are what the row carries
    expect(w.vm.rowAsset(row)).toBeNull()
    expect(w.vm.capitalBookValue(row)).toBeNull()

    // and it has claimed none of the schedule's assets from the other rows
    expect(w.vm.sellableAssets).toHaveLength(3)
    w.destroy()
  })

  test('a row the advisor typed still sends the typed figure', () => {
    // Question 5 again, from the payload's side: "Something else" behaves as it always did.
    const w = withSellRow()
    w.vm.chooseAsset(0, 'typed')
    const row = w.vm.form.capital[0]
    row.what = 'A digger bought and sold this year'
    row.month = 4
    row.bookValue = 12345

    expect(w.vm.capitalBookValue(row)).toBeNull()
    expect(w.vm.capitalSeries()[0].disposals[4]).toBe(12345)
    w.destroy()
  })

  test('🔴 the category is proposed from the schedule group and marked as a guess', () => {
    // Question 2. The badge is not decoration: the category carries the depreciation rate, so
    // an unchecked wrong guess changes the charge for the whole year.
    const w = withSellRow()
    w.vm.chooseAsset(0, '0') // the HiAce, group "Motor Vehicles"
    expect(w.vm.form.capital[0].category).toBe(0) // vehicles
    expect(w.vm.form.capital[0].categoryGuessed).toBe(true)
    w.destroy()
  })

  test('🔴 the guess follows the schedule even when the asset name suggests otherwise', () => {
    // The case put to Mike when question 2 was asked: MYOB files the "High-Spec Dev
    // Workstation" under Office Equipment, and we have a separate Computer hardware category
    // at a different rate. The app follows the FILE and flags it, rather than second-guessing
    // the client's own bookkeeping from an asset's name.
    const w = withSellRow()
    w.vm.chooseAsset(0, '2')
    expect(w.vm.form.capital[0].category).toBe(3) // office equipment, as the schedule says
    expect(w.vm.form.capital[0].categoryGuessed).toBe(true)
    w.destroy()
  })

  test('anything it cannot place is left alone, never dropped into Other', () => {
    // "Other" is a real category with a 35% rate, not a shrug.
    const w = withSellRow({
      assets: [{ name: 'A mystery', group: 'Sundry Widgets', cost: 100, bookValue: 50, accumulatedDepreciation: 50, depreciationRate: null, depreciationMethod: null }]
    })
    w.vm.form.capital[0].category = 1
    w.vm.chooseAsset(0, '0')
    expect(w.vm.guessCategory('Sundry Widgets')).toBeNull()
    expect(w.vm.form.capital[0].category).toBe(1) // untouched
    expect(w.vm.form.capital[0].categoryGuessed).toBe(false)
    w.destroy()
  })

  test('🔴 an asset already sold on one row leaves the chooser for every other', () => {
    // Question 6. Selling the same van twice removes its book value from the pool twice and
    // records two gains on one asset - and the forecast balances perfectly while doing it.
    const w = withSellRow()
    expect(w.vm.sellableAssets).toHaveLength(3)

    w.vm.chooseAsset(0, '1')
    expect(w.vm.sellableAssets.map(a => a.name)).not.toContain('2018 Ford Ranger Utility')
    expect(w.vm.sellableAssets).toHaveLength(2)

    // and it comes back the moment that row stops being a sale
    w.vm.form.capital[0].direction = 'buy'
    expect(w.vm.sellableAssets).toHaveLength(3)
    w.destroy()
  })

  test('the tie-back line appears when the schedule does not tie, and never when it does', () => {
    // Question 3: say it, never block. `$t()` returns the key here, so this pins that the line
    // is produced - Mike's wording is pinned nowhere in this file.
    const w = mountIntake()
    w.vm.applyIntake(intakeResponse({ assetSchedule: schedule() }))
    expect(w.vm.scheduleTieLine).not.toBeNull()

    w.vm.applyIntake(intakeResponse({
      assetSchedule: schedule({ tie: { available: true, ties: true, scheduleTotal: 145300, balanceSheetTotal: 145300, difference: 0 } })
    }))
    expect(w.vm.scheduleTieLine).toBeNull()
    w.destroy()
  })

  test('🔴 the schedule changes none of the six category openings', () => {
    // The drawing's section 4, from the screen's side: the Balance Sheet remains the opening
    // position. A schedule allowed to seed the categories would have understated fixed assets
    // by 16,524 on Mike's own file and charged too little depreciation all year.
    const withIt = mountIntake()
    withIt.vm.applyIntake(intakeResponse({ assetSchedule: schedule() }))
    const without = mountIntake()
    without.vm.applyIntake(intakeResponse())

    expect(withIt.vm.form.assets).toEqual(without.vm.form.assets)
    withIt.destroy()
    without.destroy()
  })
})
