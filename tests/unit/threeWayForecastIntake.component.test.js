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
