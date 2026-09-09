/**
 * @jest-environment jsdom
 */
'use strict'

// The manager's review of one loaded schedule — item 4.78, slice 3b.
//
// WHAT THIS FILE IS FOR. Everything asserted here is wrong in a way UAT cannot see, because
// a wrong depreciation rate produces a forecast that balances perfectly:
//
//   1. A RATE IS TYPED AS A PERCENTAGE AND STORED AS A DECIMAL. A slip either way is a
//      hundredfold error in a figure a lender reads, and both 0.5% and 5000% look like
//      ordinary numbers on a screen.
//   2. APPROVE IS GATED ON CONFIRMING EVERY MATCH (P10, Mike 2026-09-09). A category matched
//      to the wrong published class yields a wrong rate carrying a real document, a real page
//      and a real date — the most convincing kind of wrong.
//   3. WHAT IS SENT IS THE MANAGER'S TABLE, NOT THE MODEL'S. `CLAUDE.md` requires an explicit
//      approval before AI output is committed; sending back the untouched proposal would make
//      the corrections a person typed decorative.
//
// Deliberately NOT asserted: wording, headings and CSS classes (Mike's ruling, 2026-08-24).

const { mountWithBuefy } = require('../helpers/mountComponent')
const Review = require('../../components/firm/DepreciationDocumentReview.vue').default

function entry (over) {
  return Object.assign({
    label: 'Motor vehicles (transporting people, up to 12 seats)',
    method: 'dv',
    dvRate: 0.5,
    slRate: 0.4,
    lifeYears: 4,
    source: { document: 'IR265', page: '61', published: '2023-10' }
  }, over || {})
}

/** The published class the picker offers as an alternative to the model's own match. */
const ENGINEERING = 'Engineering (heavy) — plant and machinery'

function doc (over) {
  return Object.assign({
    id: 'doc-1',
    documentName: 'IR265 — General depreciation rates',
    filename: 'ir265.pdf',
    country: 'NZ',
    published: '2023-10',
    loadedBy: 'mike@advisor-e.com',
    loadedAt: '2026-09-09T09:00:00.000Z',
    status: 'pending',
    firstYearRuleFound: false,
    categories: { vehicles: entry() },
    unmatched: ['leaseholdImprovements', 'plantEquipment', 'officeEquipment', 'computerHardware', 'other'],
    classes: [
      entry(),
      entry({
        label: ENGINEERING,
        dvRate: 0.13,
        slRate: 0.085,
        lifeYears: 15.5,
        source: { document: 'IR265', page: '9', published: '2023-10' }
      })
    ],
    refusedRows: 0
  }, over || {})
}

/**
 * The confirmation dialog is mocked rather than rendered: both decisions are guarded by one,
 * and a test that could not reach past it could not check what the decision actually sends.
 */
function mountReview (document, resolved) {
  return mountWithBuefy(Review, {
    propsData: {
      document: document || doc(),
      resolved: resolved || { categories: {} }
    },
    mocks: { $buefy: { dialog: { confirm: jest.fn() } } }
  })
}

/** Presses the confirm button of the dialog the component just opened. */
function pressConfirm (w) {
  w.vm.$buefy.dialog.confirm.mock.calls[0][0].onConfirm()
}

describe('a rate typed as a percentage, stored as a decimal', () => {
  test('the operative rate is offered as the percentage it means', () => {
    const rows = mountReview().vm.rows
    const vehicles = rows.filter(r => r.key === 'vehicles')[0]
    expect(vehicles.percentValue).toBe('50')
    expect(vehicles.rateText).toBe('50%')
  })

  test('a typed percentage is stored as a decimal', () => {
    const w = mountReview()
    w.vm.setPercent('vehicles', '30')
    expect(w.vm.edits.vehicles.dvRate).toBe(0.3)
  })

  test('a fraction of a percent survives the round trip', () => {
    const w = mountReview()
    w.vm.setPercent('vehicles', '13.5')
    expect(w.vm.edits.vehicles.dvRate).toBe(0.135)
  })

  test('only the rate the method names is written; the other stays as published', () => {
    // Half-document, half-typed is the state a reader could never untangle.
    const w = mountReview()
    w.vm.setPercent('vehicles', '30')
    expect(w.vm.edits.vehicles.slRate).toBe(0.4)
  })

  test('a straight-line document has its straight-line rate edited', () => {
    const w = mountReview(doc({ categories: { vehicles: entry({ method: 'sl' }) } }))
    w.vm.setPercent('vehicles', '30')
    expect(w.vm.edits.vehicles.slRate).toBe(0.3)
    expect(w.vm.edits.vehicles.dvRate).toBe(0.5)
  })

  test('a rate above 100 is refused rather than stored or clamped', () => {
    // The wrong-unit case: someone typing the decimal 0.5 as 50 is right; typing 500 is not
    // a rate at all, and clamping it to 100% would be a number nobody chose.
    const w = mountReview()
    w.vm.setPercent('vehicles', '500')
    expect(w.vm.edits.vehicles.dvRate).toBe(0.5)
    expect(w.vm.errors.vehicles).toBeTruthy()
  })

  test('zero, a negative and a word are all refused', () => {
    const w = mountReview()
    w.vm.setPercent('vehicles', '0')
    expect(w.vm.errors.vehicles).toBeTruthy()
    w.vm.setPercent('vehicles', '-5')
    expect(w.vm.errors.vehicles).toBeTruthy()
    w.vm.setPercent('vehicles', 'fifty')
    expect(w.vm.errors.vehicles).toBeTruthy()
    expect(w.vm.edits.vehicles.dvRate).toBe(0.5)
  })

  test('a refused rate blocks approval until it is fixed', () => {
    const w = mountReview()
    w.vm.confirmAllMatched()
    expect(w.vm.canApprove).toBe(true)
    w.vm.setPercent('vehicles', '500')
    expect(w.vm.canApprove).toBe(false)
    w.vm.setPercent('vehicles', '45')
    expect(w.vm.canApprove).toBe(true)
  })

  test('a rate for a category the document never proposed cannot be typed in', () => {
    const w = mountReview()
    w.vm.setPercent('plantEquipment', '30')
    expect(w.vm.edits.plantEquipment).toBeUndefined()
  })
})

describe('the manager confirms every match before anything is approved', () => {
  test('nothing is confirmed when the screen opens', () => {
    const w = mountReview()
    expect(w.vm.unconfirmedCount).toBe(1)
    expect(w.vm.canApprove).toBe(false)
  })

  test('confirming the matches opens approval', () => {
    const w = mountReview()
    w.vm.confirmMatch('vehicles')
    expect(w.vm.canApprove).toBe(true)
  })

  test('confirm-all reaches every matched row and no unmatched one', () => {
    const w = mountReview(doc({
      categories: { vehicles: entry(), other: entry({ label: 'Other assets' }) },
      unmatched: ['leaseholdImprovements', 'plantEquipment', 'officeEquipment', 'computerHardware']
    }))
    w.vm.confirmAllMatched()
    expect(w.vm.unconfirmedCount).toBe(0)
    expect(w.vm.confirmed.plantEquipment).toBeUndefined()
  })

  test('a document that proposed nothing cannot be approved at all', () => {
    // There would be no figures to store, and an empty table would erase the country's rates.
    const w = mountReview(doc({ categories: {}, unmatched: ['vehicles'] }))
    w.vm.confirmAllMatched()
    expect(w.vm.canApprove).toBe(false)
  })
})

describe('changing a match', () => {
  test('picking a class replaces the wording, the rate and the source together', () => {
    // Taking only the rate would leave a figure sitting under another class's citation.
    const w = mountReview()
    w.vm.openPicker('vehicles')
    w.vm.chosenLabel = ENGINEERING
    w.vm.useChosenClass('vehicles')
    expect(w.vm.edits.vehicles.label).toBe(ENGINEERING)
    expect(w.vm.edits.vehicles.dvRate).toBe(0.13)
    expect(w.vm.edits.vehicles.source.page).toBe('9')
  })

  test('a manager choosing a class themselves has confirmed that match', () => {
    const w = mountReview()
    w.vm.openPicker('vehicles')
    w.vm.chosenLabel = ENGINEERING
    w.vm.useChosenClass('vehicles')
    expect(w.vm.confirmed.vehicles).toBe(true)
  })

  test('a category the document proposed nothing for can still be given a class', () => {
    const w = mountReview()
    w.vm.openPicker('plantEquipment')
    w.vm.chosenLabel = ENGINEERING
    w.vm.useChosenClass('plantEquipment')
    expect(w.vm.edits.plantEquipment.dvRate).toBe(0.13)
    expect(w.vm.matchedCount).toBe(2)
  })

  test('the picked class is a copy, so editing it cannot alter the document record', () => {
    const document = doc()
    const w = mountReview(document)
    w.vm.openPicker('vehicles')
    w.vm.chosenLabel = ENGINEERING
    w.vm.useChosenClass('vehicles')
    w.vm.setPercent('vehicles', '20')
    expect(document.classes[1].dvRate).toBe(0.13)
  })

  test('a label that is in no class list changes nothing', () => {
    const w = mountReview()
    w.vm.openPicker('vehicles')
    w.vm.chosenLabel = 'Something the document never published'
    w.vm.useChosenClass('vehicles')
    expect(w.vm.edits.vehicles.dvRate).toBe(0.5)
  })

  test('the search narrows to what the document actually publishes', () => {
    const w = mountReview()
    w.vm.search = 'engineering'
    expect(w.vm.filteredClasses).toHaveLength(1)
    w.vm.search = 'helicopters'
    expect(w.vm.filteredClasses).toHaveLength(0)
  })
})

describe('what approval sends', () => {
  test('it carries the manager\'s corrected figures, not the model\'s proposal', () => {
    const w = mountReview()
    w.vm.confirmAllMatched()
    w.vm.setPercent('vehicles', '45')
    w.vm.$emit = jest.fn()
    w.vm.confirmApprove()
    pressConfirm(w)
    const [name, payload] = w.vm.$emit.mock.calls[0]
    expect(name).toBe('approve')
    expect(payload.documentId).toBe('doc-1')
    expect(payload.categories.vehicles.dvRate).toBe(0.45)
  })

  test('a category the document never covered is not sent as an empty one', () => {
    // An entry with no rate would fail the store's own validation and refuse the whole table.
    const w = mountReview()
    w.vm.confirmAllMatched()
    w.vm.$emit = jest.fn()
    w.vm.confirmApprove()
    pressConfirm(w)
    expect(Object.keys(w.vm.$emit.mock.calls[0][1].categories)).toEqual(['vehicles'])
  })

  test('rejecting names the document and sends nothing else', () => {
    const w = mountReview()
    w.vm.$emit = jest.fn()
    w.vm.confirmReject()
    pressConfirm(w)
    expect(w.vm.$emit.mock.calls[0]).toEqual(['reject', { documentId: 'doc-1' }])
  })

  test('neither decision is taken without the confirmation dialog', () => {
    const w = mountReview()
    w.vm.confirmAllMatched()
    w.vm.$emit = jest.fn()
    w.vm.confirmApprove()
    w.vm.confirmReject()
    expect(w.vm.$emit).not.toHaveBeenCalled()
  })
})

describe('the gaps a document leaves', () => {
  test('every category with no match is named', () => {
    const w = mountReview()
    expect(w.vm.unmatchedLabels).toEqual([
      'Leasehold improvements', 'Plant and equipment', 'Office equipment', 'Computer hardware', 'Other'
    ])
  })

  test('a document with no first-year rule counts as a gap', () => {
    // The 2026-09-08 fault: Investment Boost postdated both documents read, so its absence
    // was invisible from inside them and was reported as a negative.
    expect(mountReview(doc({ firstYearRuleFound: false })).vm.gapCount).toBeGreaterThan(0)
  })

  test('a complete document reports no gaps at all', () => {
    const all = {}
    const keys = ['vehicles', 'leaseholdImprovements', 'plantEquipment', 'officeEquipment', 'computerHardware', 'other']
    keys.forEach((k) => { all[k] = entry() })
    const w = mountReview(doc({ categories: all, unmatched: [], firstYearRuleFound: true }))
    expect(w.vm.gapCount).toBe(0)
  })

  test('refused rows are reported rather than passed over', () => {
    const w = mountReview(doc({ refusedRows: 3, firstYearRuleFound: true, categories: { vehicles: entry() } }))
    expect(w.vm.gapCount).toBeGreaterThan(0)
  })
})

describe('what a rate would replace', () => {
  test('the rate in force is shown beside the proposal, with the tier that supplied it', () => {
    const w = mountReview(doc(), {
      categories: { vehicles: Object.assign(entry({ dvRate: 0.2 }), { originTier: 'group_manager' }) }
    })
    const vehicles = w.vm.rows.filter(r => r.key === 'vehicles')[0]
    expect(vehicles.currentText).toBe('20%')
    expect(vehicles.currentIsDefault).toBe(false)
  })

  test('a rate no tier supplied is shown as an app default', () => {
    const w = mountReview(doc(), { categories: { vehicles: entry({ dvRate: 0.2 }) } })
    const vehicles = w.vm.rows.filter(r => r.key === 'vehicles')[0]
    expect(vehicles.currentIsDefault).toBe(true)
  })
})
