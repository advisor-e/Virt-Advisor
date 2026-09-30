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
const { computeThreeWayForecast, computeThreeYearForecast, DEFAULTS } = require('../../server/report/threeWayForecastModel')
const { flattenForecast, applySavedForecast } = require('../../utils/threeWayForecastSavedShape')
const en = require('../../locales/en.json')
const ThreeWayForecastNotes = require('~/components/ThreeWayForecastNotes.vue').default

/** Year 2 at quick-fire's "Sales growth" 5% and "Overheads increase" 3%; year 3 left alone. */
function grownYears () {
  const overheads = {}
  Object.keys(DEFAULTS.overheads).forEach((k) => { overheads[k] = DEFAULTS.overheads[k] * 1.03 })
  return { yearCount: 3, years: [{}, { sales: DEFAULTS.sales.map(v => v * 1.05), overheads }, {}] }
}

/** Year 1's notes with the forecast's later years beside them, as the report hands them over. */
function notesOf (result) { return Object.assign({}, result.years[0].notes, { laterYears: result.laterYears }) }

function mountWith (notes, props) {
  return mountWithBuefy(ThreeWayForecastNotes, {
    propsData: Object.assign({ notes, currency: 'NZD' }, props),
    mocks: englishMocks()
  })
}

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

  // The workbook's notes as reworded — liability wording issued in the firm's name — pinned
  // to the revised drawing Mike approved (1814a520), filled in as the drawing fills them.
  const drawing = fs.readFileSync(path.join(__dirname, '../../design/mockups/three-way-forecast-notes.html'), 'utf8')
    .replace(/<span class="(was|new)">[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
  const fill = {
    client: 'Big Bird Grass Seed',
    firm: '[Your firm\'s name]',
    purpose: notes.fields.purposeDefault,
    basis: 'last year\'s monthly sales, increased by 5%',
    sales: '+5%',
    overheads: '+3%',
    prev: '1',
    markup: '68%'
  }
  const NOT_DRAWN = ['general.theBusiness', 'compilation.signature', 'fields.purposeDefault', 'laterYears.year', 'laterYears.same']
  ;['fields', 'workbook', 'general', 'laterYears', 'compilation'].forEach((block) => {
    Object.keys(notes[block]).filter(k => !NOT_DRAWN.includes(block + '.' + k)).forEach((k) => {
      it(`"${block}.${k}" is word for word the approved drawing`, () => {
        const text = notes[block][k].replace(/\{(\w+)\}/g, (m, name) => fill[name])
        expect(drawing).toContain(text)
      })
    })
  })
})

describe('Note 3 and "Later years" read the forecast\'s own years', () => {
  it('a year that grows is measured; a year left alone repeats the one before', () => {
    expect(computeThreeYearForecast(grownYears()).laterYears).toEqual([
      { year: 2, salesChange: 0.05, overheadsChange: 0.03, markup: 0.68, same: false },
      { year: 3, salesChange: 0, overheadsChange: 0, markup: 0.68, same: true }
    ])
    expect(computeThreeYearForecast({ yearCount: 1 }).laterYears).toEqual([])
  })

  it('one year: no inflation, and nothing about later years', () => {
    const text = mountWith(notesOf(computeThreeYearForecast({ yearCount: 1 }))).text()
    expect(text).toContain('No inflation is applied')
    expect(text).not.toContain('Later years')
    expect(text).not.toContain('Each later year repeats')
  })

  it('three years with growth: Note 2 shows it, and Note 3 says it is the only change', () => {
    const text = mountWith(notesOf(computeThreeYearForecast(grownYears())), { yearCount: 3 }).text()
    expect(text).toContain('Sales +5% and overheads +3% on year 1')
    expect(text).toContain('Sales and overheads as year 2')
    expect(text).toContain('Later years change sales and overheads only as shown in Note 2.')
  })

  it('three flat years: every later year repeats the year before', () => {
    const text = mountWith(notesOf(computeThreeYearForecast({ yearCount: 3 })), { yearCount: 3 }).text()
    expect(text).toContain('Each later year repeats the year before.')
    expect(text).not.toContain('Later years change')
  })
})

describe('the advisor\'s three fields', () => {
  const notes = computeThreeWayForecast({}).notes

  it('left empty: no purpose, no sales basis, no compilation report, and "the business"', () => {
    const text = mountWith(notes, { fields: {} }).text()
    expect(text).not.toContain('PURPOSE OF THE FORECAST')
    expect(text).not.toContain('Sales have been projected')
    expect(text).not.toContain('Compilation report')
    expect(text).toContain('the economic environment in which the business operates')
  })

  it('filled in: each lands where the drawing puts it, naming the client and the firm', () => {
    const text = mountWith(notes, {
      clientName: 'Acme Ltd',
      fields: { purpose: 'to support a loan application', salesBasis: 'signed contracts', preparedBy: 'Smith & Co' }
    }).text()
    expect(text).toContain('This forecast has been prepared to support a loan application.')
    expect(text).toContain('Sales have been projected on the basis of signed contracts.')
    expect(text).toContain('the directors of Acme Ltd. Smith & Co disclaims liability')
    expect(text).toContain('in which Acme Ltd operates')
  })

  it('survive a save and a reload; a row saved before they existed loads none', () => {
    const fields = { purpose: 'p', salesBasis: 's', preparedBy: 'f' }
    expect(applySavedForecast({}, {}, flattenForecast({}, null, 'summary', fields)).notesFields).toEqual(fields)
    expect(applySavedForecast({}, {}, flattenForecast({}, null, 'summary')).notesFields).toBeNull()
    // Hostile: one field too long refuses all three, like every other block.
    const row = flattenForecast({}, null, 'summary', fields)
    row['notes.preparedBy'] = 'x'.repeat(201)
    expect(applySavedForecast({}, {}, row).notesFields).toBeNull()
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
