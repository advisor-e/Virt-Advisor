/**
 * @jest-environment jsdom
 */
'use strict'

// The Tax Rates tab as a manager actually meets it — item 4.81, slice 3.
//
// 🔴 WHAT THIS FILE IS FOR. A manager typing figures into this screen sees them go green
// and a success message come back. What they cannot see, and what UAT cannot see either,
// is what was actually sent. Three things here are invisible on screen and change what a
// client's forecast computes:
//
//   1. A RATE IS TYPED AS A PERCENTAGE AND STORED AS A DECIMAL. Typing 30 must send 0.3.
//      Sending 30 would tax a company at 3000% in a forecast that still balances — the
//      exact failure item 4.81 was filed against — and the screen would look identical.
//
//   2. A FIGURE WITH NO DOCUMENT IS NEVER SENT. The source doubles as the include flag,
//      so there is no path to an approved figure nobody can trace. A value typed with no
//      document is REPORTED, never silently dropped, because silently dropping it means a
//      manager believes they approved something they did not.
//
//   3. THE EDITOR NEVER SEEDS A SOURCE FROM AN INHERITED FIGURE. Carrying the tier above's
//      document down would let this level approve a figure citing a document it never read.
//
// Assertions are on the payload and on component state, never on wording or CSS — the
// `$t` stand-in returns the key, so wording is not this file's business.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmTaxRates = require('../../components/firm/FirmTaxRates.vue').default

const AU_SOURCE = { document: 'ATO — Company tax rates', page: '1', published: '2025-07' }

/** A resolved payload as the real route builds it. */
function resolvedPayload (over) {
  return Object.assign({
    country: 'AU',
    countries: ['AU'],
    hasOwn: true,
    resolved: {
      country: 'AU',
      isDefault: false,
      figures: {
        companyTax: {
          rate: 0.3,
          appliesTo: 'Base rate entities',
          source: AU_SOURCE,
          originTier: 'firm_manager',
          originScopeId: 'firm-a'
        },
        gst: { rate: 0.1, source: AU_SOURCE, originTier: 'firm_manager', originScopeId: 'firm-a' },
        filing: { months: 3, label: 'Quarterly (BAS)', source: AU_SOURCE, originTier: 'firm_manager', originScopeId: 'firm-a' },
        basis: { basis: 'invoice', label: 'Accruals', source: AU_SOURCE, originTier: 'firm_manager', originScopeId: 'firm-a' }
      }
    }
  }, over || {})
}

/** Every call the component made, as `[method, path, body]`. */
function calls () {
  return global.fetch.mock.calls.map(([path, opts]) => [
    opts.method,
    path,
    opts.body ? JSON.parse(opts.body) : null
  ])
}

/** The body of the last POST the component made, or null. */
function lastPost () {
  const posts = calls().filter(c => c[0] === 'POST')
  return posts.length ? posts[posts.length - 1][2] : null
}

async function mountTab (payload) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(payload === undefined ? resolvedPayload() : payload)
  }))
  const wrapper = mountWithBuefy(FirmTaxRates, { propsData: { apiToken: 'test-token' } })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('what a manager opens', () => {
  it('asks the backend for this level’s countries before any country is named', async () => {
    await mountTab({ country: null, countries: ['AU', 'NZ'], hasOwn: false, resolved: { figures: {}, isDefault: true } })
    expect(calls()[0][0]).toBe('GET')
    expect(calls()[0][1]).not.toContain('country=')
  })

  it('sends the bearer token on every call', async () => {
    await mountTab()
    global.fetch.mock.calls.forEach(([, opts]) => {
      expect(opts.headers.Authorization).toBe('Bearer test-token')
    })
  })

  it('shows the four figures in the order a manager reads them', async () => {
    const wrapper = await mountTab()
    expect(wrapper.vm.rows.map(r => r.key)).toEqual(['companyTax', 'gst', 'filing', 'basis'])
  })

  // A decimal comes back from the backend and a percentage goes on the screen. The two are
  // different units and only one of them is ever stored.
  it('renders a stored decimal as a percentage', async () => {
    const wrapper = await mountTab()
    expect(wrapper.vm.rows[0].value).toBe('30%')
    expect(wrapper.vm.rows[1].value).toBe('10%')
  })

  // The country's own word for the cycle and the basis, not ours. "Every 3 months" is not
  // what any document says, and the people reading this file the returns.
  it('shows the country’s own name for the cycle and the basis', async () => {
    const wrapper = await mountTab()
    expect(wrapper.vm.rows[2].value).toBe('Quarterly (BAS)')
    expect(wrapper.vm.rows[3].value).toBe('Accruals')
  })

  it('shows the manager’s own words about which entities the rate reaches', async () => {
    const wrapper = await mountTab()
    expect(wrapper.vm.rows[0].appliesTo).toBe('Base rate entities')
  })

  it('gives every figure the document, date and page it came from', async () => {
    const wrapper = await mountTab()
    expect(wrapper.vm.rows[0].source).toContain('ATO')
    expect(wrapper.vm.rows[0].source).toContain('2025-07')
    expect(wrapper.vm.rows[0].source).toContain('1')
  })

  // An app default carries no document, and that is the only thing telling it apart from a
  // figure somebody approved.
  it('an app default shows no source at all', async () => {
    const wrapper = await mountTab({
      country: 'ZZ',
      countries: [],
      hasOwn: false,
      resolved: {
        country: 'ZZ',
        isDefault: true,
        figures: { companyTax: { rate: 0.28, source: null, originTier: null, originScopeId: null } }
      }
    })
    expect(wrapper.vm.rows[0].source).toBe('')
  })
})

describe('approving figures — what actually gets sent', () => {
  /** Open the editor on a level that has approved nothing, and fill one figure in. */
  async function editingBlank () {
    const wrapper = await mountTab({
      country: 'AU',
      countries: [],
      hasOwn: false,
      resolved: { country: 'AU', isDefault: true, figures: {} }
    })
    wrapper.vm.startEdit()
    await wrapper.vm.$nextTick()
    return wrapper
  }

  // 🔴 THE LOAD-BEARING ASSERTION IN THIS FILE. 30 typed must leave as 0.3.
  it('a rate typed as a percentage is sent as a decimal', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.companyTax, {
      percent: 30, document: 'ATO', published: '2025-07', page: '1'
    })
    await wrapper.vm.approve()

    expect(lastPost().figures.companyTax.rate).toBe(0.3)
  })

  it('a fractional rate survives the conversion', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.gst, { percent: 12.5, document: 'ATO', published: '2025-07' })
    await wrapper.vm.approve()

    expect(lastPost().figures.gst.rate).toBe(0.125)
  })

  // 🔴 The source doubles as the include flag: there is no path to an approved figure that
  // names no document.
  it('a figure with no document is not sent at all', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.companyTax, { percent: 30, document: 'ATO', published: '2025-07' })
    // gst left entirely blank
    await wrapper.vm.approve()

    const sent = lastPost().figures
    expect(Object.keys(sent)).toEqual(['companyTax'])
    expect(sent.gst).toBeUndefined()
  })

  // 🔴 Silently dropping it would mean a manager believes they approved something they did
  // not. It is reported and nothing is sent.
  it('a value typed with no document is refused, and nothing is sent', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.companyTax, { percent: 30 })
    await wrapper.vm.approve()

    expect(wrapper.vm.formError).toBeTruthy()
    expect(lastPost()).toBeNull()
  })

  it('a document with no publication date does not count as sourced', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.gst, { percent: 10, document: 'ATO' })
    await wrapper.vm.approve()

    expect(wrapper.vm.formError).toBeTruthy()
    expect(lastPost()).toBeNull()
  })

  it('approving with nothing filled in is refused, not sent as an empty table', async () => {
    const wrapper = await editingBlank()
    await wrapper.vm.approve()

    expect(wrapper.vm.formError).toBeTruthy()
    expect(lastPost()).toBeNull()
  })

  it('the filing cycle is sent as a month count with the country’s own name beside it', async () => {
    const wrapper = await editingBlank()
    wrapper.vm.form.filing.months = 3
    Object.assign(wrapper.vm.form.filing, {
      label: 'Quarterly (BAS)', document: 'ATO BAS', published: '2025-07'
    })
    await wrapper.vm.approve()

    expect(lastPost().figures.filing).toMatchObject({ months: 3, label: 'Quarterly (BAS)' })
  })

  it('the basis is sent canonically with the country’s own word beside it', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.basis, {
      basis: 'invoice', label: 'Accruals', document: 'ATO BAS', published: '2025-07'
    })
    await wrapper.vm.approve()

    expect(lastPost().figures.basis).toMatchObject({ basis: 'invoice', label: 'Accruals' })
  })

  it('an empty “which entities” line is sent as absent rather than as blank text', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.companyTax, {
      percent: 28, appliesTo: '   ', document: 'IRD', published: '2025-04'
    })
    await wrapper.vm.approve()

    expect(lastPost().figures.companyTax.appliesTo).toBeNull()
  })

  it('an absent page number is sent as absent rather than as an empty string', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.gst, { percent: 10, document: 'ATO', published: '2025-07' })
    await wrapper.vm.approve()

    expect(lastPost().figures.gst.source.page).toBeNull()
  })

  // The country comes from what the backend resolved, never from the free-text box, which
  // may hold something the manager typed and never asked for.
  it('the country sent is the one on screen, not whatever is in the box', async () => {
    const wrapper = await editingBlank()
    wrapper.vm.countryInput = 'ZZ'
    Object.assign(wrapper.vm.form.gst, { percent: 10, document: 'ATO', published: '2025-07' })
    await wrapper.vm.approve()

    expect(lastPost().country).toBe('AU')
  })

  // The backend refuses a rate in the wrong unit and a cycle the forecast cannot carry. The
  // manager has to see why rather than watch the screen do nothing.
  it('a backend refusal is shown to the manager rather than swallowed', async () => {
    const wrapper = await editingBlank()
    Object.assign(wrapper.vm.form.companyTax, { percent: 3000, document: 'ATO', published: '2025-07' })

    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: { code: 'INVALID_FIGURES', message: 'rate between 0 and 1' } })
    }))
    await wrapper.vm.approve()

    expect(wrapper.vm.formError).toContain('rate between 0 and 1')
    expect(wrapper.vm.saving).toBe(false)
  })
})

describe('what the editor is seeded with', () => {
  // 🔴 Carrying the tier above's document down would let this level approve a figure citing
  // a document it never read.
  it('an inherited figure seeds no source, so it cannot be re-approved as ours', async () => {
    const inherited = resolvedPayload({ hasOwn: false })
    Object.keys(inherited.resolved.figures).forEach((key) => {
      inherited.resolved.figures[key].originTier = 'mentor'
      inherited.resolved.figures[key].originScopeId = '__platform__'
    })

    const wrapper = await mountTab(inherited)
    wrapper.vm.startEdit()

    expect(wrapper.vm.form.companyTax.document).toBe('')
    expect(wrapper.vm.form.companyTax.published).toBe('')
    expect(wrapper.vm.form.companyTax.percent).toBe('')
  })

  it('this level’s own figures seed the editor, so a correction is not retyped', async () => {
    const wrapper = await mountTab()
    wrapper.vm.startEdit()

    expect(wrapper.vm.form.companyTax.percent).toBe(30)
    expect(wrapper.vm.form.companyTax.document).toBe('ATO — Company tax rates')
    expect(wrapper.vm.form.filing.months).toBe(3)
    expect(wrapper.vm.form.basis.basis).toBe('invoice')
  })

  // The blank form starts on the app's own two pickers, which is what a forecast uses today.
  it('a level with nothing approved opens on the app’s own cycle and basis', async () => {
    const wrapper = await mountTab({
      country: 'AU', countries: [], hasOwn: false, resolved: { country: 'AU', isDefault: true, figures: {} }
    })
    wrapper.vm.startEdit()

    expect(wrapper.vm.form.filing.months).toBe(2)
    expect(wrapper.vm.form.basis.basis).toBe('invoice')
  })

  // Every offered cycle divides into the forecast's twelve months. One that does not would
  // leave a return falling due outside it.
  it('offers only cycles that divide into a twelve-month forecast', async () => {
    const wrapper = await mountTab()
    wrapper.vm.filingMonths.forEach((m) => { expect(12 % m).toBe(0) })
  })
})

describe('failures the manager has to see', () => {
  it('a failed load is reported rather than leaving an empty screen', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: { code: 'DB_ERROR', message: 'Could not read the tax rates' } })
    }))
    const wrapper = mountWithBuefy(FirmTaxRates, { propsData: { apiToken: 'test-token' } })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.error).toContain('Could not read the tax rates')
    expect(wrapper.vm.loading).toBe(false)
  })

  it('a two-letter code is required before a country is asked for', async () => {
    const wrapper = await mountTab()
    const before = global.fetch.mock.calls.length
    await wrapper.vm.show('A')
    await wrapper.vm.show('')
    expect(global.fetch.mock.calls.length).toBe(before)
  })

  it('a country is asked for in upper case however it was typed', async () => {
    const wrapper = await mountTab()
    await wrapper.vm.show('au')
    expect(calls().pop()[1]).toContain('country=AU')
  })
})
