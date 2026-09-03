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

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
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
