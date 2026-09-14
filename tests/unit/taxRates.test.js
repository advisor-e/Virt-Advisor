'use strict'

/**
 * Tax Rates per country — the approved-table store (item 4.81, slice 1).
 *
 * WHAT THESE TESTS ARE FOR. A manager approving a tax table sees rows go green and a success
 * message come back. What they cannot see, and what UAT cannot see either, is that a company
 * tax rate was stored as 3000% because it was typed as `30`, that a table nobody approved is
 * driving a forecast, that a New Zealand rate is taxing an Australian client, that a figure
 * was silently dropped as unrecognised, or that a filing cycle was stored which leaves a GST
 * return falling due outside the twelve months of the forecast. Every one of those produces a
 * forecast that balances perfectly and is wrong — which is the risk the item was filed
 * against. Those are the assertions here.
 */

const { DEFAULTS } = require('../../server/report/threeWayForecastModel')
const { setFirmMembership, parentScopeOf } = require('../../server/utils/tierChain')
const {
  BASE_TAX_FIGURES,
  FIGURE_KEYS,
  CONFIG_KEY,
  FILING_MONTHS,
  BASIS_VALUES,
  MAX_SUPERSEDED,
  MAX_APPLIES_TO,
  MAX_BANDS,
  incomeTaxOn,
  validateTaxRates,
  pickNewer,
  loadResolvedTaxRates
} = require('../../server/utils/taxRates')

/** A source document, the shape everything else varies from. */
function source (over) {
  return Object.assign({ document: 'ATO — Company tax rates', page: '1', published: '2025-07' }, over || {})
}

/** The five figures, each valid, as one approved Australian table would hold them. */
function figures (over) {
  return Object.assign({
    companyTax: { rate: 0.3, appliesTo: 'Base rate entities — turnover under $50m', source: source() },
    gst: { rate: 0.1, source: source({ page: '2' }) },
    filing: { months: 3, label: 'Quarterly (BAS)', source: source({ page: '4' }) },
    // Australia's own word for the invoice basis — the canonical value with the country's
    // word beside it, which is the whole point of the pair.
    basis: { basis: 'invoice', label: 'Accruals', source: source({ page: '4' }) },
    // Australia's resident bands, and the tax-free threshold is written as an EXPLICIT 0%
    // band rather than left as a hole below the first one — which is what the validator
    // requires and why a gap cannot exist in a stored table.
    incomeTax: {
      bands: [
        { from: 0, to: 18200, rate: 0 },
        { from: 18201, to: 45000, rate: 0.16 },
        { from: 45001, to: 135000, rate: 0.30 },
        { from: 135001, to: 190000, rate: 0.37 },
        { from: 190001, to: null, rate: 0.45 }
      ],
      source: source({ page: '5' })
    }
  }, over || {})
}

/** An approved country table. */
function table (over) {
  return Object.assign({
    approvedAt: '2026-09-09T14:20:00.000Z',
    approvedBy: 'ruth@harbourco.example',
    figures: figures()
  }, over || {})
}

/** A loader over a `{scopeId: storedValue}` map, standing in for the overlay store. */
function loaderFor (map) {
  return (scopeId, key) => {
    expect(key).toBe(CONFIG_KEY)
    return Promise.resolve(Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null)
  }
}

/** The mentor scope, reached the way every cascading block reaches it. */
const MENTOR = parentScopeOf('firm-a')

afterEach(() => { setFirmMembership({}) })

describe('the app’s own four figures, as shipped', () => {
  // 🔴 THE LOAD-BEARING PIN IN THIS FILE. The same four figures are declared in three places
  // — this store, the engine's DEFAULTS, and the intake screen's own form defaults — and only
  // the engine's actually compute a forecast. If this file drifts from it, a firm that has
  // approved nothing gets a different tax charge from the one the golden set proves, and
  // nothing on any screen would look wrong.
  test('the company tax and GST rates match the engine’s own defaults', () => {
    expect(BASE_TAX_FIGURES.companyTax.rate).toBe(DEFAULTS.taxRate)
    expect(BASE_TAX_FIGURES.gst.rate).toBe(DEFAULTS.gstRate)
  })

  // The engine names its cycle in words and this store holds a month count; they are the same
  // cycle, and this is the only place that says so.
  test('the shipped filing cycle is the engine’s own, as a month count', () => {
    const asWords = { 1: 'One Monthly', 2: 'Two Monthly', 6: 'Six Monthly' }
    expect(asWords[BASE_TAX_FIGURES.filing.months]).toBe(DEFAULTS.gstPeriod)
  })

  test('the shipped basis is the engine’s own', () => {
    expect(BASE_TAX_FIGURES.basis.basis).toBe(DEFAULTS.gstBasis.toLowerCase())
  })

  // Rates are decimals here because the engine multiplies by them directly. A file edited to
  // percentages would tax a company at 2800%.
  test('every shipped rate is a decimal, not a percentage', () => {
    expect(BASE_TAX_FIGURES.companyTax.rate).toBeGreaterThan(0)
    expect(BASE_TAX_FIGURES.companyTax.rate).toBeLessThanOrEqual(1)
    expect(BASE_TAX_FIGURES.gst.rate).toBeGreaterThan(0)
    expect(BASE_TAX_FIGURES.gst.rate).toBeLessThanOrEqual(1)
  })

  // An app default is told apart from an approved figure by exactly one thing.
  test('no shipped figure carries a source document', () => {
    FIGURE_KEYS.forEach((key) => { expect(BASE_TAX_FIGURES[key].source).toBeNull() })
  })

  test('the data file’s own documentation never reaches a caller', () => {
    expect(Object.keys(BASE_TAX_FIGURES).sort()).toEqual(FIGURE_KEYS.slice().sort())
  })
})

describe('validating an approved table', () => {
  test('a complete, sourced table is accepted whole', () => {
    const { ok, errors, value } = validateTaxRates({ AU: table() })
    expect(errors).toEqual([])
    expect(ok).toBe(true)
    expect(Object.keys(value.AU.figures).sort()).toEqual(FIGURE_KEYS.slice().sort())
    expect(value.AU.figures.companyTax.rate).toBe(0.3)
  })

  // The common case: a document publishes one figure and the other three keep coming from the
  // layer above. A validator demanding all four would refuse most real documents.
  test('a table holding one figure is legitimate', () => {
    const { ok, value } = validateTaxRates({
      NZ: table({ figures: { companyTax: figures().companyTax } })
    })
    expect(ok).toBe(true)
    expect(Object.keys(value.NZ.figures)).toEqual(['companyTax'])
  })

  test('a country code is normalised to upper case', () => {
    const { ok, value } = validateTaxRates({ nz: table() })
    expect(ok).toBe(true)
    expect(value.NZ).toBeDefined()
  })

  test('a country name is refused rather than guessed at', () => {
    const { ok, errors } = validateTaxRates({ 'New Zealand': table() })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toContain('two-letter')
  })

  test.each([
    ['not an object at all', 'nope'],
    ['an array', [table()]],
    ['null', null]
  ])('a stored value that is %s is refused', (_label, value) => {
    expect(validateTaxRates(value).ok).toBe(false)
  })

  test('a country whose table is an array is refused', () => {
    expect(validateTaxRates({ AU: [] }).ok).toBe(false)
  })

  // The model is asked for an object per figure. Every other shape it could answer with is
  // refused rather than read through — CLAUDE.md requires LLM output be validated for shape
  // before it reaches state, and this is that check for the four figures.
  test.each([
    ['a bare number', 0.3],
    ['a string', '30%'],
    ['an array', [0.3]],
    ['null', null],
    ['missing', undefined]
  ])('a figure given as %s is refused', (_label, value) => {
    const { ok, errors } = validateTaxRates({ AU: table({ figures: { gst: value } }) })
    expect(ok).toBe(false)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('the approval gate', () => {
  // The store holds approved tables only. This is the whole guarantee: there is no flag to
  // forget to check, because a table that cannot name its approver is not a table.
  test('a table with no approver is refused', () => {
    const t = table()
    delete t.approvedBy
    expect(validateTaxRates({ AU: t }).ok).toBe(false)
  })

  test('a table with no approval date is refused', () => {
    expect(validateTaxRates({ AU: table({ approvedAt: '' }) }).ok).toBe(false)
  })

  test('a table whose approval date is not a date is refused', () => {
    expect(validateTaxRates({ AU: table({ approvedAt: 'last Tuesday' }) }).ok).toBe(false)
  })

  test('a table with no figures in it is refused', () => {
    expect(validateTaxRates({ AU: table({ figures: {} }) }).ok).toBe(false)
  })

  test('a table whose figures are not an object is refused', () => {
    expect(validateTaxRates({ AU: table({ figures: [] }) }).ok).toBe(false)
  })
})

describe('a figure must name the document it came from', () => {
  test.each(FIGURE_KEYS)('%s with no source is refused', (key) => {
    const f = figures()
    delete f[key].source
    const { ok, errors } = validateTaxRates({ AU: table({ figures: { [key]: f[key] } }) })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toContain('source')
  })

  test('a source with no document name is refused', () => {
    const f = figures()
    f.gst.source = source({ document: '   ' })
    expect(validateTaxRates({ AU: table({ figures: { gst: f.gst } }) }).ok).toBe(false)
  })

  test.each([
    ['no date', undefined],
    ['a year alone', '2025'],
    ['prose', 'July 2025'],
    ['month 13', '2025-13'],
    ['a year before records', '1900-01']
  ])('a publication date that is %s is refused', (_label, published) => {
    const f = figures()
    f.gst.source = source({ published })
    expect(validateTaxRates({ AU: table({ figures: { gst: f.gst } }) }).ok).toBe(false)
  })

  test('a month-only date is accepted, because that is how a guide is dated', () => {
    const f = figures()
    f.gst.source = source({ published: '2025-07' })
    expect(validateTaxRates({ AU: table({ figures: { gst: f.gst } }) }).ok).toBe(true)
  })

  test('a page number is optional and survives as given', () => {
    const f = figures()
    f.gst.source = source({ page: null })
    const { ok, value } = validateTaxRates({ AU: table({ figures: { gst: f.gst } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.gst.source.page).toBeNull()
  })
})

describe('rates are refused in the wrong unit, never clamped', () => {
  // 30 is not a bad 30%. It is a number typed in the wrong unit, and reading it charitably
  // taxes a company at 3000% in a forecast that still balances.
  test.each([
    ['companyTax', 30],
    ['gst', 10]
  ])('%s given as a percentage is refused', (key, rate) => {
    const f = figures()
    f[key].rate = rate
    const { ok, errors } = validateTaxRates({ AU: table({ figures: { [key]: f[key] } }) })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toContain('0.3')
  })

  test('a negative rate is refused', () => {
    const f = figures()
    f.companyTax.rate = -0.1
    expect(validateTaxRates({ AU: table({ figures: { companyTax: f.companyTax } }) }).ok).toBe(false)
  })

  test.each([
    ['missing', undefined],
    ['blank', ''],
    ['prose', 'twenty-eight percent']
  ])('a rate that is %s is refused', (_label, rate) => {
    const f = figures()
    f.companyTax.rate = rate
    expect(validateTaxRates({ AU: table({ figures: { companyTax: f.companyTax } }) }).ok).toBe(false)
  })

  // A country with no GST at all has a GST rate of zero. Refusing it would force a firm to
  // leave the figure unsourced instead, which is the one thing this store exists to prevent.
  test('a GST rate of zero is legitimate', () => {
    const f = figures()
    f.gst.rate = 0
    const { ok, value } = validateTaxRates({ AU: table({ figures: { gst: f.gst } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.gst.rate).toBe(0)
  })

  test('a rate given as a numeric string is read as a number', () => {
    const f = figures()
    f.companyTax.rate = '0.25'
    const { ok, value } = validateTaxRates({ AU: table({ figures: { companyTax: f.companyTax } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.companyTax.rate).toBe(0.25)
  })
})

describe('the company tax rate’s “which entities” line', () => {
  test('it is optional — a country with one flat rate needs none', () => {
    const f = figures()
    delete f.companyTax.appliesTo
    const { ok, value } = validateTaxRates({ AU: table({ figures: { companyTax: f.companyTax } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.companyTax.appliesTo).toBeNull()
  })

  test('it survives as the manager wrote it', () => {
    const { value } = validateTaxRates({ AU: table() })
    expect(value.AU.figures.companyTax.appliesTo).toBe('Base rate entities — turnover under $50m')
  })

  // It reaches an advisor's screen, so it is capped rather than unbounded.
  test('it is capped rather than refused, because it is prose', () => {
    const f = figures()
    f.companyTax.appliesTo = 'x'.repeat(MAX_APPLIES_TO + 50)
    const { ok, value } = validateTaxRates({ AU: table({ figures: { companyTax: f.companyTax } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.companyTax.appliesTo.length).toBe(MAX_APPLIES_TO)
  })
})

describe('the filing cycle', () => {
  test.each(FILING_MONTHS)('a %s-month cycle is accepted', (months) => {
    const f = figures()
    f.filing.months = months
    expect(validateTaxRates({ AU: table({ figures: { filing: f.filing } }) }).ok).toBe(true)
  })

  // 🔴 A cycle that does not divide into twelve leaves a return falling due outside the
  // forecast, so the last filing is either dropped or paid early — both wrong, both balancing.
  test.each([5, 7, 9, 11, 13, 0, -3, 2.5])('a %s-month cycle is refused', (months) => {
    const f = figures()
    f.filing.months = months
    expect(validateTaxRates({ AU: table({ figures: { filing: f.filing } }) }).ok).toBe(false)
  })

  test('a cycle with no name is refused', () => {
    const f = figures()
    delete f.filing.label
    const { ok, errors } = validateTaxRates({ AU: table({ figures: { filing: f.filing } }) })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toContain('label')
  })

  // The name is the country's own word, kept verbatim. "Every 3 months" is not what any
  // document says, and this screen is read by people who file the returns.
  test('the country’s own name for the cycle survives', () => {
    const { value } = validateTaxRates({ AU: table() })
    expect(value.AU.figures.filing.label).toBe('Quarterly (BAS)')
    expect(value.AU.figures.filing.months).toBe(3)
  })
})

describe('the accounting basis', () => {
  test.each(BASIS_VALUES)('%s is accepted', (basis) => {
    const f = figures()
    f.basis.basis = basis
    expect(validateTaxRates({ AU: table({ figures: { basis: f.basis } }) }).ok).toBe(true)
  })

  // Australia's own word for the invoice basis. Storing it as the canonical value with the
  // country's word beside it is what stops the engine meeting two spellings of one rule.
  test('the country’s word is kept beside the canonical value, not instead of it', () => {
    const { value } = validateTaxRates({ AU: table() })
    expect(value.AU.figures.basis.basis).toBe('invoice')
    expect(value.AU.figures.basis.label).toBe('Accruals')
  })

  test('a basis the engine has never heard of is refused', () => {
    const f = figures()
    f.basis.basis = 'accruals'
    expect(validateTaxRates({ AU: table({ figures: { basis: f.basis } }) }).ok).toBe(false)
  })

  test('a basis with no name is refused', () => {
    const f = figures()
    delete f.basis.label
    expect(validateTaxRates({ AU: table({ figures: { basis: f.basis } }) }).ok).toBe(false)
  })

  test('a basis is matched case-insensitively', () => {
    const f = figures()
    f.basis.basis = 'Cash'
    const { ok, value } = validateTaxRates({ AU: table({ figures: { basis: f.basis } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.basis.basis).toBe('cash')
  })
})

describe('a figure the engine does not read', () => {
  // An error rather than a silent drop: a figure stored under a name nothing reads is a figure
  // a manager believes they approved and which can never reach a single forecast.
  test('an unknown figure key fails the whole table', () => {
    const { ok, errors, value } = validateTaxRates({
      AU: table({ figures: { provisionalTax: { rate: 0.1, source: source() } } })
    })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toContain('provisionalTax')
    expect(value.AU).toBeUndefined()
  })

  test('one bad figure takes its own country down and leaves the others standing', () => {
    const { value } = validateTaxRates({
      AU: table(),
      NZ: table({ figures: { gst: { rate: 15, source: source() } } })
    })
    expect(value.AU).toBeDefined()
    expect(value.NZ).toBeUndefined()
  })
})

describe('superseded figures', () => {
  test('the figures an approved one replaced are kept beside it', () => {
    const f = figures()
    f.gst.superseded = [{ rate: 0.125, source: source({ published: '2010-07' }) }]
    const { ok, value } = validateTaxRates({ AU: table({ figures: { gst: f.gst } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.gst.superseded).toHaveLength(1)
    expect(value.AU.figures.gst.superseded[0].rate).toBe(0.125)
  })

  test('an older figure must itself be sourced', () => {
    const f = figures()
    f.gst.superseded = [{ rate: 0.125 }]
    expect(validateTaxRates({ AU: table({ figures: { gst: f.gst } }) }).ok).toBe(false)
  })

  test('older figures cannot themselves carry older figures', () => {
    const f = figures()
    f.gst.superseded = [{
      rate: 0.125,
      source: source({ published: '2010-07' }),
      superseded: [{ rate: 0.1, source: source({ published: '1989-10' }) }]
    }]
    const { ok, value } = validateTaxRates({ AU: table({ figures: { gst: f.gst } }) })
    expect(ok).toBe(true)
    expect(value.AU.figures.gst.superseded[0].superseded).toBeUndefined()
  })

  test('a chain longer than the cap is refused', () => {
    const f = figures()
    f.gst.superseded = new Array(MAX_SUPERSEDED + 1).fill(null)
      .map((_, i) => ({ rate: 0.1, source: source({ published: `20${10 + i}-07` }) }))
    expect(validateTaxRates({ AU: table({ figures: { gst: f.gst } }) }).ok).toBe(false)
  })

  test('a superseded list that is not a list is refused', () => {
    const f = figures()
    f.gst.superseded = 'the old one'
    expect(validateTaxRates({ AU: table({ figures: { gst: f.gst } }) }).ok).toBe(false)
  })
})

describe('two documents disagreeing about one figure', () => {
  const older = { rate: 0.125, source: source({ document: 'ATO 2010', published: '2010-07' }) }
  const newer = { rate: 0.1, source: source({ document: 'ATO 2025', published: '2025-07' }) }

  test('the newer publication date wins', () => {
    expect(pickNewer(older, newer).rate).toBe(0.1)
    expect(pickNewer(newer, older).rate).toBe(0.1)
  })

  // Silent selection is how a wrong figure becomes invisible, so the loser is shown.
  test('the older figure is kept beside it rather than dropped', () => {
    const out = pickNewer(older, newer)
    expect(out.superseded).toHaveLength(1)
    expect(out.superseded[0].rate).toBe(0.125)
  })

  test('nothing in hand means the incoming figure stands alone', () => {
    expect(pickNewer(null, newer)).toEqual(newer)
  })

  // Two documents published the same month do not rank, and inventing an order between them
  // would be the silent selection the ruling forbids.
  test('equal dates keep the incumbent and record the newcomer', () => {
    const rival = { rate: 0.11, source: source({ document: 'ATO other', published: '2025-07' }) }
    const out = pickNewer(newer, rival)
    expect(out.rate).toBe(0.1)
    expect(out.superseded[0].rate).toBe(0.11)
  })

  // Reloading the same document would otherwise read on screen as a document disagreeing
  // with itself.
  test('the same document read twice does not supersede itself', () => {
    const out = pickNewer(newer, { ...newer })
    expect(out.superseded).toBeUndefined()
  })

  test('a document with no usable date loses to one that has a date', () => {
    const undated = { rate: 0.2, source: { document: 'ATO', page: null, published: 'sometime' } }
    expect(pickNewer(undated, newer).rate).toBe(0.1)
  })

  test('the loser’s own history is carried through, oldest dropped past the cap', () => {
    const withHistory = {
      ...older,
      superseded: new Array(MAX_SUPERSEDED).fill(null)
        .map((_, i) => ({ rate: 0.1, source: source({ document: `old ${i}`, published: '1989-10' }) }))
    }
    const out = pickNewer(withHistory, newer)
    expect(out.superseded).toHaveLength(MAX_SUPERSEDED)
  })
})

describe('resolving what one scope works to', () => {
  test('a scope with nothing approved anywhere gets the app’s own four', async () => {
    const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({}))
    expect(out.isDefault).toBe(true)
    expect(out.figures.companyTax.rate).toBe(BASE_TAX_FIGURES.companyTax.rate)
    expect(out.figures.companyTax.originTier).toBeNull()
  })

  // Ruling of 2026-09-08, in Mike's words: "Never block the advisor." An unknown country is
  // not an error — it is the defaults, badged as defaults.
  test.each([
    ['absent', undefined],
    ['not a country code', 'Australia'],
    ['null', null]
  ])('a client country that is %s falls back to the defaults', async (_label, country) => {
    const out = await loadResolvedTaxRates('firm-a', country, loaderFor({ 'firm-a': { AU: table() } }))
    expect(out.isDefault).toBe(true)
    expect(out.country).toBeNull()
    expect(out.figures.gst.rate).toBe(BASE_TAX_FIGURES.gst.rate)
  })

  test('a scope with no id at all gets the defaults rather than throwing', async () => {
    const out = await loadResolvedTaxRates(null, 'AU', loaderFor({}))
    expect(out.isDefault).toBe(true)
  })

  test('a firm’s own approved figures are used, and say so', async () => {
    const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({ 'firm-a': { AU: table() } }))
    expect(out.isDefault).toBe(false)
    expect(out.figures.companyTax.rate).toBe(0.3)
    expect(out.figures.filing.months).toBe(3)
    expect(out.figures.companyTax.originTier).toBe('firm_manager')
    expect(out.figures.companyTax.originScopeId).toBe('firm-a')
    expect(out.figures.companyTax.approvedBy).toBe('ruth@harbourco.example')
  })

  test('a table for another country is not used for this one', async () => {
    const out = await loadResolvedTaxRates('firm-a', 'NZ', loaderFor({ 'firm-a': { AU: table() } }))
    expect(out.isDefault).toBe(true)
    expect(out.figures.companyTax.rate).toBe(BASE_TAX_FIGURES.companyTax.rate)
  })

  test('the mentor’s figures reach a firm that has approved nothing', async () => {
    const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({ [MENTOR]: { AU: table() } }))
    expect(out.figures.gst.rate).toBe(0.1)
    expect(out.figures.gst.originTier).toBe('mentor')
  })

  test('the firm overrides the mentor, figure by figure', async () => {
    const own = table({
      approvedBy: 'ruth@harbourco.example',
      figures: { gst: { rate: 0.12, source: source({ document: 'Firm ruling', published: '2026-01' }) } }
    })
    const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({
      [MENTOR]: { AU: table() },
      'firm-a': { AU: own }
    }))
    // The one the firm approved is the firm's...
    expect(out.figures.gst.rate).toBe(0.12)
    expect(out.figures.gst.originTier).toBe('firm_manager')
    // ...and the three it did not still come from the mentor, each saying so.
    expect(out.figures.companyTax.rate).toBe(0.3)
    expect(out.figures.companyTax.originTier).toBe('mentor')
  })

  // A tier that cannot be read must not lose the tiers already applied, and must not stop the
  // ones below it being asked. The worst case stays "the layer above".
  test('one unreachable tier does not lose the tiers around it', async () => {
    const loader = scopeId => scopeId === MENTOR
      ? Promise.reject(new Error('store down'))
      : Promise.resolve({ AU: table() })
    const out = await loadResolvedTaxRates('firm-a', 'AU', loader)
    expect(out.figures.companyTax.rate).toBe(0.3)
    expect(out.figures.companyTax.originTier).toBe('firm_manager')
  })

  // The store cannot hold an unapproved table, so one that has got in some other way is
  // dropped by the resolver like any other malformed value — it never reaches a forecast.
  test('a stored table nobody approved is ignored, not used', async () => {
    const unapproved = { AU: { figures: figures() } }
    const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({ 'firm-a': unapproved }))
    expect(out.isDefault).toBe(true)
    expect(out.figures.companyTax.rate).toBe(BASE_TAX_FIGURES.companyTax.rate)
  })

  test('a stored value that is nonsense is ignored, not thrown', async () => {
    const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({ 'firm-a': 'rubbish' }))
    expect(out.isDefault).toBe(true)
  })
})

describe('🔴 the income tax bands — the fifth figure, and the only one that is a table', () => {
  /**
   * A band table goes wrong QUIETLY, which is the whole reason this block exists. A gap
   * between two bands leaves a slice of income untaxed; an overlap taxes it twice; and both
   * produce a total that looks entirely plausible on screen. Nobody re-adds a tax table by
   * hand, so nobody catches it. UAT cannot see any of this — it is the definition of what a
   * test has to earn its place by catching.
   *
   * Added 2026-09-14 with the figure itself (decision 5 of the Wages/Salary Review).
   */
  const nzBands = BASE_TAX_FIGURES.incomeTax.bands

  /** One country table holding just the bands, valid but for whatever the case changes. */
  function withBands (bands) {
    return { AU: table({ figures: figures({ incomeTax: { bands, source: source({ page: '5' }) } }) }) }
  }

  describe('what it computes', () => {
    // THE WORKBOOK'S OWN ANSWERS, from `Hrly Rate & Tax Calculator` AH8 and AH12. These are
    // the figures the Rates tab will show, so they are pinned against the source model.
    test('reproduces the workbook on the sample income', () => {
      expect(incomeTaxOn(145000, nzBands)).toBeCloseTo(38770, 6)
    })

    test('reproduces the workbook on the spouse’s own or allocated income', () => {
      expect(incomeTaxOn(25000, nzBands)).toBeCloseTo(3395, 6)
      // Each is taxed on their own — Mike's ruling of 2026-09-14, "own or allocated income".
      // There is nothing to subtract, so the household total is simply the two added.
      expect(incomeTaxOn(145000, nzBands) + incomeTaxOn(25000, nzBands)).toBeCloseTo(42165, 6)
    })

    test('charges the band exactly at its ceiling, and nothing below the first dollar', () => {
      expect(incomeTaxOn(14000, nzBands)).toBeCloseTo(1470, 6) // the whole of band 1
      expect(incomeTaxOn(0, nzBands)).toBe(0)
      expect(incomeTaxOn(-5000, nzBands)).toBe(0)
    })

    test('taxes income above every ceiling at the open-ended top band', () => {
      // 145,000 owes 38,770; the next 55,000 is all band 5 at 39%.
      expect(incomeTaxOn(200000, nzBands) - incomeTaxOn(180000, nzBands)).toBeCloseTo(20000 * 0.39, 6)
    })

    test('is progressive across the whole table, never a single rate on the lot', () => {
      // The fault this guards: applying the top rate to all of it. On 145,000 that would be
      // 47,850 rather than 38,770 — plausible, and 9,080 wrong.
      expect(incomeTaxOn(145000, nzBands)).toBeLessThan(145000 * 0.33)
      expect(incomeTaxOn(145000, nzBands)).not.toBeCloseTo(145000 * 0.33, 0)
    })

    test('returns nothing rather than throwing when the bands are missing', () => {
      expect(incomeTaxOn(50000, null)).toBe(0)
      expect(incomeTaxOn(50000, undefined)).toBe(0)
    })
  })

  describe('what it refuses, because the wrong answer would look right', () => {
    test('A GAP between two bands — income that would be silently untaxed', () => {
      const { ok, errors } = validateTaxRates(withBands([
        { from: 0, to: 14000, rate: 0.105 },
        { from: 20000, to: null, rate: 0.30 } // 14,001–19,999 taxed at nothing
      ]))
      expect(ok).toBe(false)
      expect(errors.join(' ')).toContain('14001')
    })

    test('AN OVERLAP between two bands — income that would be taxed twice', () => {
      const { ok } = validateTaxRates(withBands([
        { from: 0, to: 14000, rate: 0.105 },
        { from: 12000, to: null, rate: 0.30 }
      ]))
      expect(ok).toBe(false)
    })

    test('A HOLE BELOW THE FIRST BAND — a tax-free threshold left implicit', () => {
      // Australia's 18,200 must be written as an explicit 0% band, never as a missing floor.
      const { ok, errors } = validateTaxRates(withBands([
        { from: 18201, to: null, rate: 0.16 }
      ]))
      expect(ok).toBe(false)
      expect(errors.join(' ')).toContain('0% band')
    })

    test('A CLOSED TOP BAND — income above the last ceiling taxed at nothing', () => {
      const { ok, errors } = validateTaxRates(withBands([
        { from: 0, to: 14000, rate: 0.105 },
        { from: 14001, to: 180000, rate: 0.33 }
      ]))
      expect(ok).toBe(false)
      expect(errors.join(' ')).toContain('taxed at nothing')
    })

    test('AN OPEN BAND IN THE MIDDLE, which would swallow every band after it', () => {
      const { ok } = validateTaxRates(withBands([
        { from: 0, to: null, rate: 0.105 },
        { from: 14001, to: null, rate: 0.33 }
      ]))
      expect(ok).toBe(false)
    })

    test('A PERCENTAGE where the store’s convention is a decimal', () => {
      // 39 instead of 0.39 would tax someone at 3,900%.
      const { ok } = validateTaxRates(withBands([{ from: 0, to: null, rate: 39 }]))
      expect(ok).toBe(false)
    })

    test('an empty table, and one longer than any real country’s', () => {
      expect(validateTaxRates(withBands([])).ok).toBe(false)
      const many = []
      for (let i = 0; i < MAX_BANDS + 1; i++) {
        many.push({ from: i === 0 ? 0 : i * 1000 + 1, to: i === MAX_BANDS ? null : (i + 1) * 1000, rate: 0.1 })
      }
      expect(validateTaxRates(withBands(many)).ok).toBe(false)
    })

    test('a band table with no source document, like every other approved figure', () => {
      const { ok } = validateTaxRates({
        AU: table({ figures: figures({ incomeTax: { bands: nzBands, source: null } }) })
      })
      expect(ok).toBe(false)
    })
  })

  describe('what it deliberately ALLOWS, because it is not this app’s policy to decide', () => {
    test('a flat or falling rate — legal somewhere, and not ours to refuse', () => {
      // Contiguity is arithmetic; the direction of the rates is the country's business.
      const { ok } = validateTaxRates(withBands([
        { from: 0, to: 50000, rate: 0.30 },
        { from: 50001, to: null, rate: 0.20 }
      ]))
      expect(ok).toBe(true)
    })

    test('a single band covering everything', () => {
      expect(validateTaxRates(withBands([{ from: 0, to: null, rate: 0.2 }])).ok).toBe(true)
    })
  })

  describe('it cascades and falls back like the other four', () => {
    test('a country nobody has loaded gets the app’s own bands, badged as default', async () => {
      const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({}))
      expect(out.isDefault).toBe(true)
      expect(out.figures.incomeTax.bands).toEqual(nzBands)
      // Mike, 2026-09-08: "Never block the advisor." A missing table gives a badged answer.
      expect(out.figures.incomeTax.source).toBeNull()
    })

    test('an approved table overrides the app’s own, and says where it came from', async () => {
      const out = await loadResolvedTaxRates('firm-a', 'AU', loaderFor({
 'firm-a': withBands([
        { from: 0, to: 18200, rate: 0 },
        { from: 18201, to: null, rate: 0.16 }
      ])
}))
      expect(out.figures.incomeTax.bands[0].rate).toBe(0)
      expect(out.figures.incomeTax.originTier).toBe('firm_manager')
      expect(incomeTaxOn(50000, out.figures.incomeTax.bands)).toBeCloseTo((50000 - 18200) * 0.16, 6)
    })
  })
})
