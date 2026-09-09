/**
 * @jest-environment jsdom
 */
'use strict'

// The Depreciation Rates tab as a manager actually meets it — item 4.78, slice 2.
//
// WHAT THIS FILE IS FOR. Three things on this screen are wrong in ways a person in UAT
// cannot see, because a wrong answer looks exactly like a right one:
//
//   1. THE RATE IS STORED AS A DECIMAL AND SHOWN AS A PERCENTAGE. 0.5 must read as 50%.
//      A conversion slip shows 0.5% or 5000% — both perfectly plausible on a screen, and
//      the second is what a wrong unit looks like everywhere else in this feature.
//   2. THE ORIGIN BADGE ATTRIBUTES A RATE TO A TIER. Getting that mapping wrong tells a
//      manager their firm approved a figure it inherited, or the reverse, on the screen
//      whose whole purpose is saying where a number came from.
//   3. A RULE INHERITED FROM ABOVE CANNOT BE WITHDRAWN HERE. Nobody edits a level above
//      their own (Mike, 2026-09-02), and an offered button that would fail is worse than
//      no button.
//
// Deliberately NOT asserted: wording, headings, and CSS classes. A person in UAT sees those
// in five seconds and judges them better than an assertion can (Mike's ruling, 2026-08-24).

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmDepreciationRates = require('../../components/firm/FirmDepreciationRates.vue').default

/** Mount the tab with its network calls stubbed to whatever the test needs. */
async function mountTab (payload) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(Object.assign({
      country: 'NZ',
      countries: ['NZ'],
      hasOwn: false,
      own: null,
      inherited: {},
      resolved: { categories: {}, firstYearRule: null, isDefault: true }
    }, payload || {}))
  }))
  const wrapper = mountWithBuefy(FirmDepreciationRates, {
    propsData: { apiToken: 'test-token' }
  })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

function category (over) {
  return Object.assign({
    label: 'Motor vehicles (up to 12 seats)',
    method: 'dv',
    dvRate: 0.5,
    slRate: 0.4,
    lifeYears: 4,
    source: { document: 'IR265', page: '61', published: '2023-10' },
    originTier: 'firm_manager',
    originScopeId: 'firm-1'
  }, over || {})
}

const RULE = {
  name: 'Investment Boost',
  rate: 0.2,
  startsOn: '2025-05-22',
  endsOn: null,
  source: { document: 'Inland Revenue', page: null, published: '2025-05' },
  approvedAt: '2026-09-09T09:00:00.000Z',
  approvedBy: 'mike@advisor-e.com',
  originTier: 'firm_manager'
}

afterEach(() => { delete global.fetch })

describe('the rate a manager reads', () => {
  it('shows a stored decimal as the percentage it means', async () => {
    const wrapper = await mountTab({
      resolved: { categories: { vehicles: category({ dvRate: 0.5 }) }, firstYearRule: null, isDefault: false }
    })
    expect(wrapper.vm.rows[0].rate).toBe('50%')
  })

  it('does not round a fractional rate away', async () => {
    const wrapper = await mountTab({
      resolved: { categories: { vehicles: category({ dvRate: 0.135 }) }, firstYearRule: null, isDefault: false }
    })
    expect(wrapper.vm.rows[0].rate).toBe('13.5%')
  })

  // The operative rate is the one the METHOD names. Showing the other would put a figure on
  // screen that no forecast uses.
  it('shows the straight-line rate when that is the method in force', async () => {
    const wrapper = await mountTab({
      resolved: {
        categories: { vehicles: category({ method: 'sl', dvRate: 0.5, slRate: 0.4 }) },
        firstYearRule: null,
        isDefault: false
      }
    })
    expect(wrapper.vm.rows[0].rate).toBe('40%')
  })

  it('shows a dash rather than a zero when there is no rate to show', async () => {
    const wrapper = await mountTab({
      resolved: {
        categories: { vehicles: category({ method: 'sl', slRate: null }) },
        firstYearRule: null,
        isDefault: false
      }
    })
    expect(wrapper.vm.rows[0].rate).toBe('—')
  })
})

describe('where a rate says it came from', () => {
  const cases = [
    ['firm_manager', 'your firm'],
    ['group_manager', 'your group'],
    ['global_group_manager', 'your global group'],
    ['mentor', 'Advisor-e']
  ]

  it.each(cases)('a rate supplied by %s is attributed to it', async (tier, label) => {
    const wrapper = await mountTab({
      resolved: { categories: { vehicles: category({ originTier: tier }) }, firstYearRule: null, isDefault: false }
    })
    expect(wrapper.vm.rows[0].origin).toBe(label)
  })

  // 🔴 THE ONE THAT MATTERS MOST. An app default is a guess; a sourced rate is not. On a
  // forecast a lender reads, the two look identical unless this says otherwise — which is
  // the risk the whole item was filed against.
  it('a rate no tier supplied is called an app default', async () => {
    const wrapper = await mountTab({
      resolved: {
        categories: { vehicles: category({ originTier: null, originScopeId: null, source: null, label: null }) },
        firstYearRule: null,
        isDefault: true
      }
    })
    expect(wrapper.vm.rows[0].origin).toBe('app default')
    expect(wrapper.vm.rows[0].source).toBe('')
  })

  it('a sourced rate carries its document, page and date', async () => {
    const wrapper = await mountTab({
      resolved: { categories: { vehicles: category() }, firstYearRule: null, isDefault: false }
    })
    expect(wrapper.vm.rows[0].source).toBe('IR265, p.61 · 2023-10')
  })

  it('a source with no page does not invent one', async () => {
    const wrapper = await mountTab({
      resolved: {
        categories: { vehicles: category({ source: { document: 'IR265', page: null, published: '2023-10' } }) },
        firstYearRule: null,
        isDefault: false
      }
    })
    expect(wrapper.vm.rows[0].source).toBe('IR265 · 2023-10')
  })
})

describe('the first-year rule', () => {
  it('reads its share as a percentage, and says what is left', async () => {
    const wrapper = await mountTab({
      resolved: { categories: {}, firstYearRule: RULE, isDefault: false }
    })
    expect(wrapper.vm.rulePercent).toBe('20%')
    expect(wrapper.vm.ruleRemainder).toBe('80%')
  })

  // 🔴 Nobody edits a level above their own. A rule adopted higher up is shown but cannot be
  // withdrawn here, and the screen must know the difference.
  it('cannot be withdrawn here when a level above adopted it', async () => {
    const wrapper = await mountTab({
      hasOwn: true,
      own: { approvedAt: 'x', approvedBy: 'y', categories: { vehicles: category() } },
      resolved: { categories: {}, firstYearRule: Object.assign({}, RULE, { originTier: 'mentor' }), isDefault: false }
    })
    expect(wrapper.vm.rule).not.toBeNull()
    expect(wrapper.vm.ownRule).toBe(false)
  })

  it('can be withdrawn here when this level adopted it', async () => {
    const wrapper = await mountTab({
      hasOwn: true,
      own: { approvedAt: 'x', approvedBy: 'y', categories: {}, firstYearRule: RULE },
      resolved: { categories: {}, firstYearRule: RULE, isDefault: false }
    })
    expect(wrapper.vm.ownRule).toBe(true)
  })

  it('is absent, not empty, where no level has adopted one', async () => {
    const wrapper = await mountTab({
      resolved: { categories: { vehicles: category() }, firstYearRule: null, isDefault: false }
    })
    expect(wrapper.vm.rule).toBeNull()
  })
})

describe('asking for a country', () => {
  it('refuses anything that is not a two-letter code', async () => {
    const wrapper = await mountTab()
    wrapper.vm.countryInput = 'New Zealand'
    expect(wrapper.vm.canShow).toBe(false)
    wrapper.vm.countryInput = 'N'
    expect(wrapper.vm.canShow).toBe(false)
    wrapper.vm.countryInput = 'nz'
    expect(wrapper.vm.canShow).toBe(true)
  })

  // Three spellings of one country would ask the backend three different questions.
  it('upper-cases what it asks for', async () => {
    const wrapper = await mountTab()
    global.fetch.mockClear()
    wrapper.vm.show('au')
    await wrapper.vm.$nextTick()
    expect(global.fetch.mock.calls[0][0]).toContain('country=AU')
  })

  it('ignores a request it cannot make', async () => {
    const wrapper = await mountTab()
    global.fetch.mockClear()
    wrapper.vm.show('New Zealand')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ── Slice 3b: loading a document, and deciding on it ────────────────────────────────────
//
// Three more things here are invisible in UAT until they are wrong:
//   4. THE UPLOAD IS MULTIPART AND MUST NOT CARRY A HAND-SET Content-Type. The browser writes
//      that header with the boundary; setting it produces a body the backend cannot parse, and
//      the symptom is a generic "could not be read" that looks like a bad PDF.
//   5. A DOCUMENT THE MODEL COULD NOT READ COMES BACK AS A 200. Treating `ok: false` as
//      success would open a review of a proposal that does not exist.
//   6. A DECISION GOES TO THE ROUTE FOR IT. Approving through the reject route, or either
//      without the document id, changes nothing and says it worked.

/** A document record as `depreciationProposals.js` stores one. */
function document (over) {
  return Object.assign({
    id: 'doc-1',
    documentName: 'IR265',
    filename: 'ir265.pdf',
    country: 'NZ',
    published: '2023-10',
    loadedBy: 'mike@advisor-e.com',
    loadedAt: '2026-09-09T09:00:00.000Z',
    status: 'pending',
    firstYearRuleFound: false,
    categories: { vehicles: category() },
    unmatched: [],
    classes: [],
    refusedRows: 0
  }, over || {})
}

/**
 * Mount the tab with the rates read and the document list answering separately, so a test can
 * say what each call returns rather than sharing one payload between them.
 */
async function mountWithDocuments (documents, payload) {
  global.fetch = jest.fn(path => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(String(path).includes('/documents')
      ? { documents: documents || [] }
      : Object.assign({
        country: 'NZ',
        countries: ['NZ'],
        hasOwn: false,
        own: null,
        inherited: {},
        resolved: { categories: {}, firstYearRule: null, isDefault: true }
      }, payload || {}))
  }))
  const wrapper = mountWithBuefy(FirmDepreciationRates, { propsData: { apiToken: 'test-token' } })
  // The first load resolves a country, re-reads for it, then asks for that country's
  // documents — three round trips deep. Ticks alone do not drain a chain that long.
  for (let i = 0; i < 3; i++) { await new Promise(resolve => setTimeout(resolve, 0)) }
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('the documents a level has loaded', () => {
  it('asks only for the country on screen', async () => {
    // A list spanning countries would show an Australian schedule under New Zealand, and the
    // rates a manager approved from it would be tagged with the wrong country.
    const wrapper = await mountWithDocuments([document()])
    const call = global.fetch.mock.calls.filter(c => String(c[0]).includes('/documents'))[0]
    expect(call[0]).toContain('country=NZ')
    expect(wrapper.vm.documents).toHaveLength(1)
  })

  it('names the newest publication date held, for the gaps panel', async () => {
    // A rule introduced after every document loaded is invisible from inside them, so the
    // panel states the date rather than reporting an absence as a negative.
    const wrapper = await mountWithDocuments([
      document({ id: 'a', published: '2023-10' }),
      document({ id: 'b', published: '2024-04' })
    ])
    expect(wrapper.vm.newestPublished).toBe('2024-04')
  })

  it('only a pending document can be reviewed', async () => {
    const wrapper = await mountWithDocuments([document({ status: 'approved' })])
    wrapper.vm.review('doc-1')
    expect(wrapper.vm.reviewingDocument).toBeNull()
  })
})

describe('loading a document to be read', () => {
  it('sends the file and the country, and sets no content type of its own', async () => {
    const wrapper = await mountWithDocuments([])
    global.fetch.mockClear()
    global.fetch.mockImplementation(path => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(String(path).includes('/documents') && !String(path).includes('?')
        ? { ok: true, code: null, message: null, document: document() }
        : { documents: [document()] })
    }))

    wrapper.vm.file = new File(['%PDF-1.4'], 'ir265.pdf', { type: 'application/pdf' })
    await wrapper.vm.upload()

    const [path, opts] = global.fetch.mock.calls[0]
    expect(path).toBe('/api/firm-manager/depreciation-rates/documents')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBeUndefined()
    expect(opts.body.get('country')).toBe('NZ')
    expect(opts.body.get('file')).toBeTruthy()
  })

  it('opens the review of what came back', async () => {
    const wrapper = await mountWithDocuments([])
    global.fetch.mockImplementation(path => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(!String(path).includes('?')
        ? { ok: true, document: document() }
        : { documents: [document()] })
    }))
    wrapper.vm.file = new File(['%PDF-1.4'], 'ir265.pdf', { type: 'application/pdf' })
    await wrapper.vm.upload()
    expect(wrapper.vm.reviewing).toBe('doc-1')
  })

  it('a document that could not be read proposes nothing and opens no review', async () => {
    // The backend answers 200 with ok:false so its own refusal wording reaches the manager —
    // Mike's sentence, pinned beside the value it protects rather than copied onto the screen.
    const wrapper = await mountWithDocuments([])
    global.fetch.mockImplementation(path => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(!String(path).includes('?')
        ? { ok: false, code: 'UNREADABLE', message: 'This document could not be read reliably', document: document({ status: 'unreadable' }) }
        : { documents: [document({ status: 'unreadable' })] })
    }))
    wrapper.vm.file = new File(['%PDF-1.4'], 'scan.pdf', { type: 'application/pdf' })
    await wrapper.vm.upload()
    expect(wrapper.vm.reviewing).toBe('')
    expect(wrapper.vm.uploadMessage).toBe('This document could not be read reliably')
  })

  it('a refused upload leaves the message and clears the chosen file', async () => {
    const wrapper = await mountWithDocuments([])
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: { code: 'NOT_A_PDF', message: 'That file is not a PDF' } })
    }))
    wrapper.vm.file = new File(['not a pdf'], 'notes.txt', { type: 'application/pdf' })
    await wrapper.vm.upload()
    expect(wrapper.vm.uploadMessage).toBe('That file is not a PDF')
    expect(wrapper.vm.file).toBeNull()
  })

  it('sends nothing when no country has been chosen', async () => {
    const wrapper = await mountWithDocuments([])
    wrapper.vm.country = ''
    global.fetch.mockClear()
    wrapper.vm.file = new File(['%PDF-1.4'], 'ir265.pdf', { type: 'application/pdf' })
    await wrapper.vm.upload()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('deciding on a proposal', () => {
  it('approval goes to the approve route, carrying the manager\'s own figures', async () => {
    const wrapper = await mountWithDocuments([document()])
    global.fetch.mockClear()
    const categories = { vehicles: category({ dvRate: 0.45 }) }
    await wrapper.vm.approveDocument({ documentId: 'doc-1', categories })

    const [path, opts] = global.fetch.mock.calls[0]
    expect(path).toBe('/api/firm-manager/depreciation-rates/documents/approve')
    expect(JSON.parse(opts.body)).toEqual({ documentId: 'doc-1', categories })
  })

  it('rejection goes to the reject route and names only the document', async () => {
    const wrapper = await mountWithDocuments([document()])
    global.fetch.mockClear()
    await wrapper.vm.rejectDocument({ documentId: 'doc-1' })

    const [path, opts] = global.fetch.mock.calls[0]
    expect(path).toBe('/api/firm-manager/depreciation-rates/documents/reject')
    expect(JSON.parse(opts.body)).toEqual({ documentId: 'doc-1' })
  })

  it('a failed approval says so and leaves the review open', async () => {
    // Closing the review on a failure would look exactly like success.
    const wrapper = await mountWithDocuments([document()])
    wrapper.vm.review('doc-1')
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: false,
      statusText: 'Conflict',
      json: () => Promise.resolve({ error: { code: 'NOT_PENDING', message: 'That document has already been decided' } })
    }))
    await wrapper.vm.approveDocument({ documentId: 'doc-1', categories: {} })
    expect(wrapper.vm.reviewError).toBe('That document has already been decided')
    expect(wrapper.vm.reviewing).toBe('doc-1')
  })

  it('a document decided elsewhere closes the review rather than leaving it stale', async () => {
    const wrapper = await mountWithDocuments([document()])
    wrapper.vm.review('doc-1')
    expect(wrapper.vm.reviewingDocument).not.toBeNull()
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ documents: [document({ status: 'approved' })] })
    }))
    await wrapper.vm.loadDocuments()
    expect(wrapper.vm.reviewing).toBe('')
  })
})
