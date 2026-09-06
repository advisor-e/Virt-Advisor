/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ThreeWayForecastIntake = require('~/components/ThreeWayForecastIntake.vue').default
const { validateInputs } = require('~/server/utils/savedReports')
const {
  flattenForecast, applySavedForecast, changedFigures
} = require('~/utils/threeWayForecastSavedShape')

/**
 * The Three-Way Forecast's saved-report shape (item 4.62, Brief §5) — the twelfth and last
 * model to open at business-entity level, on Mike's ruling of 2026-09-05: *"anything an
 * advisor can edit, the client can edit."*
 *
 * 🔴 THE FIRST TWO BLOCKS ARE THE REASON THIS FILE EXISTS, and they are the two things UAT
 * cannot see. A saved forecast that loses one figure on the way back reopens looking
 * entirely normal on the wrong opening balance — the same failure family as the leaked
 * sample defaults the intake's own test guards. And a row the store refuses fails at the
 * moment an advisor presses Save in front of a client, not here.
 *
 * THE FORM COMES FROM THE REAL COMPONENT, never a fixture. A hand-written copy of the
 * intake's state would agree with it on the day it was written and drift from it silently
 * afterwards, which is precisely the bug this shape exists to prevent.
 */

/** The four levers the report screen holds. */
const LEVERS = { salesShift: 12, markup: 71, debtorMonthAfter: 48, overheadShift: -6 }

/** A fresh intake's state — the real thing, not a copy of it. */
function freshForm () {
  const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
  const form = JSON.parse(JSON.stringify(w.vm.form))
  w.destroy()
  return form
}

/** A run of distinct numbers, so a figure landing in the wrong slot cannot pass. */
function ramp (n, from) {
  const out = []
  for (let i = 0; i < n; i++) { out.push((from || 1) + i * 7) }
  return out
}

/**
 * A forecast with every block filled and no two figures alike — the state an advisor
 * would confirm after a real intake.
 * @returns {object}
 */
function filledForm () {
  const f = freshForm()
  f.companyName = 'Acme Importers Ltd'
  f.reportDate = 'as at 31 March 2026'
  f.startDate = '2026-04-01'

  const openingKeys = Object.keys(f.opening)
  openingKeys.forEach((k, i) => {
    f.opening[k].value = 1000 + i * 13
    f.opening[k].source = i % 3 === 0 ? 'file' : 'entered'
    f.opening[k].candidates = []
  })
  const overheadKeys = Object.keys(f.overheads)
  overheadKeys.forEach((k, i) => {
    f.overheads[k].value = 500 + i * 11
    f.overheads[k].source = i % 2 === 0 ? 'file' : 'entered'
    f.overheads[k].candidates = []
  })
  f.assets.forEach((a, i) => {
    a.opening.value = 20000 + i * 1000
    a.opening.source = 'file'
    a.opening.candidates = []
    a.rate = 10 + i
  })

  f.loans = [
    { name: 'ANZ term loan', type: 'term', opening: { value: 420000, source: 'file', candidates: [] }, repayment: 6800, rate: 7.9 },
    { name: 'Trade facility', type: 'facility', opening: { value: 150000, source: 'entered', candidates: [] }, repayment: 0, rate: 9.25 },
    { name: 'Vehicle lease', type: 'term', opening: { value: 38000, source: 'file', candidates: [] }, repayment: 1100, rate: 6.5 }
  ]
  f.shareholders = [1, 2, 3, 4].map(n => ({ opening: { value: n * -2500, source: 'entered', candidates: [] } }))

  f.markup = 64
  f.taxRate = 28
  f.gstRate = 15
  f.gstPeriod = 'Six Monthly'
  f.gstBasis = 'Cash'
  f.overdraftRate = 8.5
  f.inFundsRate = 1.25
  f.shareholderRate = 6
  f.debtor = [5, 60, 25, 10, 0]
  f.creditor = [10, 80, 10, 0, 0]
  f.direct = { freight: 3, otherDirectExempt: 1.5, otherTwo: 2, commissions: 9 }

  f.sales = ramp(12, 80000)
  f.salesSource = 'seeded'
  f.purchases = ramp(12, 40000)
  f.stockInTransit = { balanceOwing: 84000, landing: ramp(12, 100) }

  f.overseas.enabled = true
  f.overseas.importedPurchases = ramp(12, 30000)
  f.overseas.depositPct = 55
  f.overseas.depositLeadMonths = 3
  f.overseas.balancePayment = [10, 80, 10, 0, 0]
  f.overseas.freightPct = 13
  f.overseas.dutyPct = 4
  f.overseas.fxAllowancePct = 8
  f.overseas.readyAfterMonths = 2
  f.overseas.importedRevenueOverride = [null, 5000, null, null, 9000, null, null, null, null, null, null, null]
  f.overseas.overseasSales = ramp(12, 12000)
  f.overseas.deliveryLagMonths = 3
  f.overseas.overseasCollection = [0, 40, 60, 0, 0]
  f.overseas.zeroRated = false
  f.overseas.salesFxAllowancePct = 12
  f.overseas.overseasMarkup = 74
  f.overseas.shipments = [
    { description: 'Container 1', cost: 120000, orderDate: '2026-05-01', depositPct: 60, speed: 'Sea' },
    { description: 'Air freight top-up', cost: 18000, orderDate: '2026-07-15', depositPct: 50, speed: 'Air' }
  ]

  f.capital = [
    { what: 'Delivery van', category: 0, month: 3, direction: 'buy', price: 65000, bookValue: 0 },
    { what: 'Old forklift', category: 2, month: 8, direction: 'sell', price: 12000, bookValue: 7500 }
  ]

  f.history = ramp(24, 60000)
  return f
}

describe('a saved forecast comes back exactly as it was saved', () => {
  test('🔴 every block round-trips, figure for figure', () => {
    const saved = filledForm()
    const row = flattenForecast(saved, LEVERS, 'every')
    const { form, levers, detail } = applySavedForecast(freshForm(), { salesShift: 0, markup: 0, debtorMonthAfter: 0, overheadShift: 0 }, row)

    // Not carried, and deliberately: the company name is a thing only the dropped file
    // knows (the Quick Position rule), and the trend read is derived and read-only.
    const expected = JSON.parse(JSON.stringify(saved))
    delete expected.companyName
    delete expected.trend
    const actual = JSON.parse(JSON.stringify(form))
    delete actual.companyName
    delete actual.trend

    expect(actual).toEqual(expected)
    expect(levers).toEqual(LEVERS)
    expect(detail).toBe('every')
  })

  test('🔴 the store accepts the row — checked against the real validateInputs', () => {
    const row = flattenForecast(filledForm(), LEVERS, 'summary')
    expect(() => validateInputs(row)).not.toThrow()
    // The cap is 200 and this is the largest of the twelve shapes, so the headroom is
    // worth stating rather than discovering when a block is added.
    expect(Object.keys(row).length).toBeLessThanOrEqual(200)
  })

  test('an untouched forecast round-trips too — the empty lists are still a valid row', () => {
    const blank = freshForm()
    const row = flattenForecast(blank, LEVERS, 'summary')
    expect(() => validateInputs(row)).not.toThrow()
    const { form } = applySavedForecast(freshForm(), LEVERS, row)
    expect(form.capital).toEqual([])
    expect(form.overseas.shipments).toEqual([])
    expect(form.loans.length).toBe(blank.loans.length)
  })
})

describe('a hostile row is refused a block at a time, never half a block', () => {
  test('🔴 a broken opening list leaves the opening exactly as the screen had it', () => {
    const row = flattenForecast(filledForm(), LEVERS, 'summary')
    row.opening = row.opening.slice(0, 3) // three values against nineteen names
    const before = freshForm()
    const { form, applied } = applySavedForecast(before, LEVERS, row)
    expect(applied).not.toContain('opening')
    expect(form.opening).toEqual(before.opening)
    // The rest of the row still lands — one bad block must not cost the others.
    expect(applied).toContain('overheads')
    expect(form.sales).toEqual(row.sales)
  })

  test('a funding row missing its Type is refused with the whole loans block', () => {
    const row = flattenForecast(filledForm(), LEVERS, 'summary')
    delete row['loans.type']
    const before = freshForm()
    const { form, applied } = applySavedForecast(before, LEVERS, row)
    expect(applied).not.toContain('loans')
    expect(form.loans).toEqual(before.loans)
  })

  test('a word outside its own set is refused, not stored', () => {
    const row = flattenForecast(filledForm(), LEVERS, 'summary')
    row.gstPeriod = 'Whenever'
    row['os.sellDown.pattern'] = 'Not a pattern the mentor holds'
    const before = freshForm()
    const { form } = applySavedForecast(before, LEVERS, row)
    expect(form.gstPeriod).toBe(before.gstPeriod)
    expect(form.overseas.sellDown.pattern).toBe(before.overseas.sellDown.pattern)
  })

  test('a loan row list longer than the engine allows is refused whole', () => {
    const row = flattenForecast(filledForm(), LEVERS, 'summary')
    const fields = ['name', 'type', 'opening', 'src', 'repayment', 'rate']
    fields.forEach((k) => {
      const list = row['loans.' + k]
      while (list.length <= 8) { list.push(list[0]) }
    })
    const { applied } = applySavedForecast(freshForm(), LEVERS, row)
    expect(applied).not.toContain('loans')
  })

  test('the numbers a client cannot have typed are refused', () => {
    const row = flattenForecast(filledForm(), LEVERS, 'summary')
    row.markup = 'sixty four'
    row.sales = [1, 2, 'three', 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const before = freshForm()
    const { form } = applySavedForecast(before, LEVERS, row)
    expect(form.markup).toBe(before.markup)
    expect(form.sales).toEqual(before.sales)
  })
})

describe('the client badge lands on the figure, not on the block holding it', () => {
  test('🔴 one changed opening line names that line alone', () => {
    const advisorForm = filledForm()
    const advisor = flattenForecast(advisorForm, LEVERS, 'summary')
    const clientForm = filledForm()
    const key = Object.keys(clientForm.opening)[4]
    clientForm.opening[key].value = 999999
    const client = flattenForecast(clientForm, LEVERS, 'summary')

    const changed = changedFigures(client, advisor)
    expect(changed).toEqual(['opening.' + key])
  })

  test('a changed overhead, asset rate, loan repayment and lever each name themselves', () => {
    const advisor = flattenForecast(filledForm(), LEVERS, 'summary')
    const f = filledForm()
    const overheadKey = Object.keys(f.overheads)[9]
    f.overheads[overheadKey].value = 12345
    f.assets[2].rate = 99
    f.loans[1].repayment = 4321
    const client = flattenForecast(f, { salesShift: 12, markup: 71, debtorMonthAfter: 48, overheadShift: 40 }, 'summary')

    const changed = changedFigures(client, advisor)
    expect(changed).toContain('overheads.' + overheadKey)
    expect(changed).toContain('assets.plantEquipment.rate')
    expect(changed).toContain('loans.1.repayment')
    expect(changed).toContain('lever.overheadShift')
    // and nothing it did not touch
    expect(changed).not.toContain('lever.markup')
    expect(changed).not.toContain('loans.0.repayment')
  })

  test('one changed month names that month, not the whole series', () => {
    const advisor = flattenForecast(filledForm(), LEVERS, 'summary')
    const f = filledForm()
    f.sales[7] = 1
    const changed = changedFigures(flattenForecast(f, LEVERS, 'summary'), advisor)
    expect(changed).toEqual(['sales.7'])
  })

  test('a row the client ADDED is named as a whole row — there is nothing to compare it to', () => {
    const advisor = flattenForecast(filledForm(), LEVERS, 'summary')
    const f = filledForm()
    f.capital.push({ what: 'New trailer', category: 0, month: 5, direction: 'buy', price: 9000, bookValue: 0 })
    const changed = changedFigures(flattenForecast(f, LEVERS, 'summary'), advisor)
    expect(changed).toEqual(['cap.2'])
  })

  test('🔴 a forecast saved before step 4 was opened carries no levers, so none is reloaded as zero', () => {
    // Two levers are DERIVED from the confirmed intake. A row that wrote zeroes for them
    // would reload as a 0% mark-up: a forecast that recomputes cleanly and is wrong.
    const row = flattenForecast(filledForm(), null, 'summary')
    expect(row['lever.markup']).toBeUndefined()
    expect(() => validateInputs(row)).not.toThrow()
    const live = { salesShift: 0, markup: 68, debtorMonthAfter: 55, overheadShift: 0 }
    const { levers } = applySavedForecast(freshForm(), live, row)
    expect(levers).toEqual(live)
  })

  test('nothing changed names nothing, and a missing advisor version names nothing', () => {
    const row = flattenForecast(filledForm(), LEVERS, 'summary')
    expect(changedFigures(row, flattenForecast(filledForm(), LEVERS, 'summary'))).toEqual([])
    expect(changedFigures(row, null)).toEqual([])
  })
})
