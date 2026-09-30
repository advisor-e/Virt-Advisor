/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * "Notes to the forecast" (item 44.1; drawing approved by Mike 2026-09-30,
 * design/mockups/three-way-forecast-notes.html).
 *
 * The notes are each forecast's own: a sentence that does not apply is left out, and one that
 * depends on what was entered reads it. What this guards is what UAT cannot see at a glance —
 * that the notes never contradict the forecast they sit in, and that the wording a lender
 * reads is the wording Mike approved.
 */

const fs = require('fs')
const path = require('path')
const { mountWithBuefy, englishMocks } = require('../helpers/mountComponent')
const { computeThreeWayForecast } = require('../../server/report/threeWayForecastModel')
const en = require('../../locales/en.json')
const ThreeWayForecastNotes = require('~/components/ThreeWayForecastNotes.vue').default

const EXPORTER = {
  overseas: { enabled: true, overseasSales: [0, 20000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], overseasCollection: [0, 0.4, 0.4, 0, 0] }
}

function mountNotes (inputs) {
  const f = computeThreeWayForecast(inputs)
  return mountWithBuefy(ThreeWayForecastNotes, { propsData: { notes: f.notes, currency: 'NZD' }, mocks: englishMocks() })
}

describe('the model decides which notes apply', () => {
  it('the sample is a local business with term loans and no overseas trade', () => {
    expect(computeThreeWayForecast({}).notes.facts).toEqual({
      imports: false,
      exports: false,
      inTransit: false,
      fx: false,
      belowCost: false,
      termLoans: true,
      facilities: false,
      sameMonthDebtors: false,
      sameMonthCreditors: false,
      overseasGap: null
    })
  })

  it('an overseas profile that collects 80% leaves a 20% gap', () => {
    expect(computeThreeWayForecast(EXPORTER).notes.facts.overseasGap).toBe(0.2)
  })

  it('a cash business settles its opening balances in month 1', () => {
    const f = computeThreeWayForecast({ debtorCollection: [1, 0, 0, 0, 0], creditorPayment: [1, 0, 0, 0, 0] }).notes.facts
    expect(f.sameMonthDebtors).toBe(true)
    expect(f.sameMonthCreditors).toBe(true)
  })

  it('imported stock priced below its cost is caught, and at the default prices it is not', () => {
    const importer = { overseas: { enabled: true, importedPurchases: [0, 0, 10000, 0, 0, 0, 0, 0, 0, 0, 0, 0] } }
    expect(computeThreeWayForecast(importer).notes.facts.belowCost).toBe(false)
    importer.overseas.sellDown = { runoutMarkup: 0.05 } // freight and duty alone add 17%
    expect(computeThreeWayForecast(importer).notes.facts.belowCost).toBe(true)
  })

  it('a loan with nothing in it is not a loan the notes describe', () => {
    const f = computeThreeWayForecast({ loans: [{ name: 'Empty', type: 'facility', opening: 0 }] }).notes
    expect(f.facts.facilities).toBe(false)
    expect(f.assumptions.loans).toEqual([])
  })
})

describe('the wording a lender reads is the wording Mike approved', () => {
  // ONE deliberate pin, beside the data it protects: this is regulatory text Mike approved
  // (design/CALCULATION-ASSUMPTIONS-FOR-FIRMS.md, 0a913e11), and a paraphrase here would
  // misstate an accounting standard to a lender. Only the sentences the approved drawing
  // left unchanged are compared; its reworded ones are pinned by the drawing itself.
  const md = fs.readFileSync(path.join(__dirname, '../../design/CALCULATION-ASSUMPTIONS-FOR-FIRMS.md'), 'utf8').replace(/\r\n/g, '\n')
  const approved = md.split(/\n---\n/)[2].trim().split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => l.replace(/^- /, '').replace(/^[0-9]+\. /, ''))
  const notes = en.report.threeWayForecast.notes
  const unchanged = Object.assign({}, notes.basis, notes.method, notes.differs)
  const REWORDED = ['intro', 'collection', 'collectedAll', 'collectedOverseasGap', 'openingDebtorsFirstMonth',
    'aboveCost', 'belowCost', 'whatIf', 'rates', 'taxRate', 'shareholderInterest', 'suppliersPaid',
    'suppliersPaidFirstMonth', 'gstNeverRevenue', 'gstImports', 'leadThree', 'leadFour', 'badDebtsOverseasGap']

  Object.keys(unchanged).filter(k => !REWORDED.includes(k)).forEach((key) => {
    it(`"${key}" is word for word the approved line`, () => {
      const text = unchanged[key].replace('{home}', 'NZD')
      const found = approved.includes(text) || approved.includes(text.toUpperCase())
      expect(found).toBe(true)
    })
  })
})

describe('the notes render as this forecast\'s own', () => {
  it('a local business: no foreign currency, three differences, every sale collected', () => {
    const w = mountNotes({})
    const text = w.text()
    expect(text).not.toContain('FOREIGN CURRENCY')
    expect(text).toContain('Three differences remain')
    expect(text).toContain('Every sale is assumed to be collected in full')
    expect(text).not.toContain('Overseas revenue timing')
    // The sections renumber when one leaves: Fixed assets is third, not fourth.
    expect(text).toContain('3. FIXED ASSETS')
    expect(text).toContain('1 April 2024')
    w.destroy()
  })

  it('an exporter collecting 80%: the uncollected 20% is said, in Note 3 and Note 4', () => {
    const text = mountNotes(EXPORTER).text()
    expect(text).toContain('20% of overseas sales is assumed never to be collected')
    expect(text).toContain('the 20% of overseas sales not collected stays in what customers owe')
    expect(text).toContain('Four differences remain')
    expect(text).not.toContain('every sale is assumed to be collected')
  })

  it('a cash business: opening debtors and suppliers settled in the first month', () => {
    const text = mountNotes({ debtorCollection: [1, 0, 0, 0, 0], creditorPayment: [1, 0, 0, 0, 0] }).text()
    expect(text).toContain('Debtors owed at the start are collected in the first month.')
    expect(text).toContain('the balance owed to them at the start is paid in the first month.')
  })
})
