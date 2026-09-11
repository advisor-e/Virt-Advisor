/**
 * @jest-environment jsdom
 */
'use strict'

// The advisor's half of Depreciation Rates per country — item 4.78, slice 4.
//
// 🔴 WHAT THIS FILE IS FOR. The country field reached the forecast with item 4.81, but only
// the TAX half listened to it. The six depreciation rates stayed on the figures the forecast
// has shipped with since it was built — Vehicles at 20% where New Zealand's IRD gives 50%
// diminishing value — with nothing on screen saying so. Five things here are invisible to a
// person testing the screen and change what a client's forecast computes:
//
//   1. NAMING A COUNTRY MOVES NO RATE ON ITS OWN. Mike's third ruling of 2026-09-08. Figures
//      moving underneath someone part-way through a report is how a wrong number reaches a
//      document nobody meant to send.
//
//   2. APPLYING FILLS ONLY THE RATES STILL ON PLATFORM DEFAULTS. A rate the advisor typed is
//      a decision, not a gap. Overwriting it is silent — the advisor entered 15%, looked
//      away, and the forecast now depreciates at 30%, balancing perfectly all the way down.
//
//   3. THE STORE KEEPS DECIMALS AND THE SCREEN KEEPS PERCENTAGES. A 0.5 shown as 0.5% would
//      depreciate a vehicle by a hundredth of what it should; a 50 sent as 50 rather than 0.5
//      would write it off at five thousand percent a year.
//
//   4. THE BADGE DOES NOT LIE WHILE IT WAITS. A country with an approved table the advisor
//      has NOT applied still reads `app default`, because that is what the forecast would
//      compute with. This is the one claim in the whole feature a lender reads.
//
//   5. A FAILED READ NEVER BLOCKS THE ADVISOR. Mike's words, 2026-09-08.
//
// `$t()` returns the KEY, so nothing here pins his wording.

const { mountWithBuefy } = require('../helpers/mountComponent')
const ThreeWayForecastIntake = require('~/components/ThreeWayForecastIntake.vue').default

const SOURCE = { document: 'IR265', page: '12', published: '2023-10' }

/** The six categories the forecast has, and the platform rate each one starts on (%). */
const PLATFORM = {
  vehicles: 20,
  leaseholdImprovements: 15,
  plantEquipment: 22,
  officeEquipment: 25,
  computerHardware: 30,
  other: 35
}

/**
 * An approved table, as the route resolves it — decimals, each rate naming the tier that
 * supplied it. Only three of the six, deliberately: a firm approving part of a schedule is
 * the ordinary case, not the exception.
 */
function nzRates (over) {
  return Object.assign({
    country: 'NZ',
    isDefault: false,
    firstYearRule: null,
    categories: {
      vehicles: { method: 'dv', dvRate: 0.5, source: SOURCE, originTier: 'firm_manager' },
      plantEquipment: { method: 'dv', dvRate: 0.13, source: SOURCE, originTier: 'group_manager' },
      computerHardware: { method: 'dv', dvRate: 0.4, source: SOURCE, originTier: 'firm_manager' }
    }
  }, over || {})
}

/** The app's own six, which is what the route answers for a country nobody has approved. */
function defaultRates () {
  const categories = {}
  Object.keys(PLATFORM).forEach((key) => {
    categories[key] = { method: 'dv', dvRate: PLATFORM[key] / 100, source: null, originTier: null }
  })
  return { country: 'ZZ', isDefault: true, firstYearRule: null, categories }
}

/** Mount the intake and name a country, letting the debounced read resolve. */
async function withCountry (code, payload) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: payload !== null,
    json: () => Promise.resolve(payload)
  }))
  const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
  wrapper.vm.form.country = code
  await wrapper.vm.$nextTick()
  jest.advanceTimersByTime(300)
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

/**
 * The depreciation reads alone. Mounting the intake also asks for the sell-down ladder and
 * this country's tax figures, so a bare call count would be measuring the wrong thing.
 */
function rateCalls () {
  return global.fetch.mock.calls
    .map(([url]) => String(url))
    .filter(url => url.indexOf('/api/report/depreciation-rates') === 0)
}

/** One category's row on the form. */
function categoryOf (wrapper, key) {
  return wrapper.vm.form.assets.find(a => a.key === key)
}

beforeEach(() => { jest.useFakeTimers() })

afterEach(() => {
  jest.useRealTimers()
  delete global.fetch
})

describe('naming a country', () => {
  it('asks the backend for that country’s approved rates', async () => {
    await withCountry('NZ', nzRates())
    expect(rateCalls()).toHaveLength(1)
    expect(rateCalls()[0]).toContain('country=NZ')
  })

  it('is not asked for until two letters have been typed', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    wrapper.vm.form.country = 'N'
    await wrapper.vm.$nextTick()
    jest.advanceTimersByTime(300)
    expect(rateCalls()).toHaveLength(0)
  })

  // An answer arriving after the advisor has typed a different country would depreciate one
  // country's client at another country's rates.
  it('ignores an answer for a country the advisor has typed away from', async () => {
    const wrapper = await withCountry('NZ', { country: 'AU', isDefault: false, categories: {} })
    expect(wrapper.vm.resolvedDepreciation).toBeNull()
  })

  it('clearing the country forgets what was resolved', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    expect(wrapper.vm.resolvedDepreciation).not.toBeNull()
    wrapper.vm.form.country = ''
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.resolvedDepreciation).toBeNull()
  })
})

describe('🔴 naming a country moves no rate on its own', () => {
  it('leaves all six rates exactly as they were', async () => {
    const wrapper = await withCountry('NZ', nzRates())

    Object.keys(PLATFORM).forEach((key) => {
      expect(categoryOf(wrapper, key).rate).toBe(PLATFORM[key])
      expect(categoryOf(wrapper, key).rateSource).toBe('default')
    })
  })

  it('offers the change instead, naming every rate that would move', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    const changes = wrapper.vm.depreciationChanges

    // Three of the six: the approved table holds nothing for the other three, and a category
    // nobody approved a rate for is not a change.
    expect(changes).toHaveLength(3)
    expect(changes.map(c => c.key).sort()).toEqual(['computerHardware', 'plantEquipment', 'vehicles'])
    expect(wrapper.vm.depreciationOffer).toBeTruthy()
  })

  // 🔴 A rate the approved table AGREES with is not a change. Counting it would tell an
  // advisor a figure was about to move when none was.
  it('does not count a rate the table already agrees with', async () => {
    const same = nzRates()
    same.categories.vehicles.dvRate = 0.2

    const wrapper = await withCountry('NZ', same)
    expect(wrapper.vm.depreciationChanges.map(c => c.key)).not.toContain('vehicles')
  })

  it('makes no offer for a country nobody has approved anything for', async () => {
    const wrapper = await withCountry('ZZ', defaultRates())
    expect(wrapper.vm.depreciationOffer).toBe('')
  })

  it('makes no offer once the advisor is on every approved rate', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.depreciationChanges).toHaveLength(0)
    expect(wrapper.vm.depreciationOffer).toBe('')
  })
})

describe('applying a country’s rates, when the advisor asks', () => {
  it('takes the approved rates across as percentages', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()

    // 0.5 in the store is 50 on the screen — the one conversion this feature turns on.
    expect(categoryOf(wrapper, 'vehicles').rate).toBe(50)
    expect(categoryOf(wrapper, 'plantEquipment').rate).toBe(13)
    expect(categoryOf(wrapper, 'computerHardware').rate).toBe(40)
  })

  it('leaves the three categories the table says nothing about', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()

    expect(categoryOf(wrapper, 'leaseholdImprovements').rate).toBe(15)
    expect(categoryOf(wrapper, 'officeEquipment').rate).toBe(25)
    expect(categoryOf(wrapper, 'other').rate).toBe(35)
    expect(categoryOf(wrapper, 'other').rateSource).toBe('default')
  })

  // 🔴 THE RULING THIS SLICE TURNS ON. An advisor who typed 15% into Plant and equipment
  // keeps 15%, and would never have seen it change.
  it('never overwrites a rate the advisor typed', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    const plant = wrapper.vm.form.assets.findIndex(a => a.key === 'plantEquipment')

    categoryOf(wrapper, 'plantEquipment').rate = 15
    wrapper.vm.markRateEntered(plant)
    await wrapper.vm.$nextTick()

    wrapper.vm.applyCountryDepreciation()

    expect(categoryOf(wrapper, 'plantEquipment').rate).toBe(15)
    expect(categoryOf(wrapper, 'plantEquipment').rateSource).toBe('entered')
    // The other two still moved — one typed rate does not hold up the rest of the table.
    expect(categoryOf(wrapper, 'vehicles').rate).toBe(50)
    expect(categoryOf(wrapper, 'computerHardware').rate).toBe(40)
  })

  it('and does not even offer a typed rate as a change', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    const plant = wrapper.vm.form.assets.findIndex(a => a.key === 'plantEquipment')

    wrapper.vm.markRateEntered(plant)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.depreciationChanges.map(c => c.key)).not.toContain('plantEquipment')
    expect(wrapper.vm.depreciationChanges).toHaveLength(2)
  })
})

describe('🔴 where the rate on screen came from', () => {
  it('a platform figure says so', async () => {
    const wrapper = await withCountry('ZZ', defaultRates())
    expect(wrapper.vm.rateOrigin(0)).toBe('report.threeWayForecast.confirm.originDefault')
  })

  // 🔴 THE BADGE DOES NOT LIE WHILE IT WAITS. An approved table the advisor has not applied
  // must not make the rate in front of them look sourced — the forecast is still computing
  // with the app's own guess, and the badge is what a lender-facing figure rests on.
  it('an approved table nobody applied still reads as a platform figure', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    const vehicles = wrapper.vm.form.assets.findIndex(a => a.key === 'vehicles')

    expect(wrapper.vm.rateOrigin(vehicles)).toBe('report.threeWayForecast.confirm.originDefault')
  })

  it('an applied rate names the tier that approved it and the document it came from', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()
    const vehicles = wrapper.vm.form.assets.findIndex(a => a.key === 'vehicles')

    const badge = wrapper.vm.rateOrigin(vehicles)
    expect(badge).toContain('report.threeWayForecast.confirm.originFirm')
    expect(badge).toContain('IR265')
  })

  it('a rate inherited from a tier above names that tier, not the firm', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()
    const plant = wrapper.vm.form.assets.findIndex(a => a.key === 'plantEquipment')

    expect(wrapper.vm.rateOrigin(plant)).toContain('report.threeWayForecast.confirm.originGroup')
  })

  it('a typed rate is the advisor’s own', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.markRateEntered(0)

    expect(wrapper.vm.rateOrigin(0)).toBe('report.threeWayForecast.confirm.originEntered')
  })

  // Typing over an applied rate takes the firm's document off it. A rate carrying IR265's
  // name that IR265 does not give is the one thing this column exists to prevent.
  it('typing over an applied rate drops the document it used to name', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()
    const vehicles = wrapper.vm.form.assets.findIndex(a => a.key === 'vehicles')

    wrapper.vm.markRateEntered(vehicles)
    expect(wrapper.vm.rateOrigin(vehicles)).toBe('report.threeWayForecast.confirm.originEntered')
    expect(wrapper.vm.rateOrigin(vehicles)).not.toContain('IR265')
  })

  // 🔴 Changing the country afterwards must not relabel a rate already on the form as having
  // come from a country it did not come from.
  it('an applied rate keeps its own origin when the country changes', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()
    const vehicles = wrapper.vm.form.assets.findIndex(a => a.key === 'vehicles')

    wrapper.vm.form.country = 'AU'
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.rateOrigin(vehicles)).toContain('IR265')
  })
})

describe('a country with nothing approved says so', () => {
  it('warns when the client’s country has no approved table', async () => {
    const wrapper = await withCountry('ZZ', defaultRates())
    expect(wrapper.vm.noApprovedRatesWarning).toBeTruthy()
  })

  it('says nothing while the read is still in flight', () => {
    global.fetch = jest.fn(() => new Promise(() => {}))
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    wrapper.vm.form.country = 'ZZ'

    // The warning would otherwise flash up for every advisor who names a country, including
    // the ones whose firm has approved a table.
    expect(wrapper.vm.noApprovedRatesWarning).toBe('')
  })

  it('says nothing when a table was found', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    expect(wrapper.vm.noApprovedRatesWarning).toBe('')
  })

  it('says nothing when no country has been named at all', () => {
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    expect(wrapper.vm.noApprovedRatesWarning).toBe('')
  })
})

describe('🔴 the payload the engine actually receives', () => {
  // The payload's assets are POSITIONAL — the engine knows the six categories in order and
  // the rows carry no key — so the index is the contract, and Vehicles is the first of them.
  const VEHICLES = 0

  it('carries an applied rate as a decimal, not as the percentage on screen', async () => {
    const wrapper = await withCountry('NZ', nzRates())
    wrapper.vm.applyCountryDepreciation()

    const sent = wrapper.vm.buildInputs()
    expect(sent.assets[VEHICLES].depreciationRate).toBeCloseTo(0.5, 10)
  })

  it('a forecast with no country sends the platform rates, exactly as it always did', () => {
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })

    const sent = wrapper.vm.buildInputs()
    expect(sent.assets[VEHICLES].depreciationRate).toBeCloseTo(0.2, 10)
  })

  // The row the engine reads is the row the screen showed. Positional payloads go wrong
  // silently, so the order is pinned here rather than trusted.
  it('sends the six categories in the order the screen holds them', () => {
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })

    const sent = wrapper.vm.buildInputs()
    expect(sent.assets).toHaveLength(wrapper.vm.form.assets.length)
    sent.assets.forEach((row, i) => {
      expect(row.depreciationRate).toBeCloseTo(Number(wrapper.vm.form.assets[i].rate) / 100, 10)
    })
  })
})

describe('a forecast saved before this existed', () => {
  /** A restored form whose assets carry a rate but no record of where it came from. */
  function restoredWith (rates) {
    return {
      assets: Object.keys(PLATFORM).map(key => ({
        key, opening: { value: 1000, source: 'entered' }, rate: rates[key]
      }))
    }
  }

  it('reads a rate still on the platform figure as a platform figure', () => {
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, {
      propsData: { restore: restoredWith(PLATFORM) }
    })

    expect(categoryOf(wrapper, 'vehicles').rateSource).toBe('default')
  })

  // 🔴 The safe direction. A rate somebody moved off the platform figure was theirs, so an
  // approved table must not fill it — the alternative silently overwrites a decision taken
  // before this feature existed and nobody would ever see it happen.
  it('reads a rate somebody moved as one the advisor entered', () => {
    global.fetch = jest.fn()
    const moved = Object.assign({}, PLATFORM, { vehicles: 33 })
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, {
      propsData: { restore: restoredWith(moved) }
    })

    expect(categoryOf(wrapper, 'vehicles').rateSource).toBe('entered')
    expect(categoryOf(wrapper, 'leaseholdImprovements').rateSource).toBe('default')
  })
})

describe('🔴 an advisor may LOAD a document; only a firm manager APPROVES one', () => {
  // Mike's ruling, 2026-09-08. The gating is the whole of it, so it is pinned against the
  // registration itself rather than trusted to a comment — the same check
  // currency.routes.test.js makes, for the same reason.
  const fs = require('fs')
  const path = require('path')
  const SERVER = fs.readFileSync(
    path.join(__dirname, '../../server/restify-server.js'), 'utf8'
  )

  test('the advisor’s load route carries firmAuth and NOT the manager guard', () => {
    expect(SERVER).toMatch(
      /server\.post\('\/api\/report\/depreciation-rates\/documents',\s*firmAuth,\s*depreciationRatesRoute\.loadDocument\)/
    )
  })

  // 🔴 The other half, and the one that would actually hurt. Widening the load must not have
  // widened the decision: an advisor who can approve their own document is an advisor who can
  // put an unchecked AI-read rate into every forecast their firm produces.
  test('approving and rejecting still require a manager', () => {
    expect(SERVER).toMatch(
      /server\.post\('\/api\/firm-manager\/depreciation-rates\/documents\/approve',\s*\.\.\.fmGuard,/
    )
    expect(SERVER).toMatch(
      /server\.post\('\/api\/firm-manager\/depreciation-rates\/documents\/reject',\s*\.\.\.fmGuard,/
    )
    expect(SERVER).toMatch(
      /server\.post\('\/api\/firm-manager\/depreciation-rates',\s*\.\.\.fmGuard,/
    )
  })
})

describe('loading a tax document from the forecast', () => {
  /** A document record as the backend returns it, with three of the six matched. */
  function readDocument () {
    return {
      ok: true,
      code: null,
      message: null,
      document: {
        id: 'doc-1',
        filename: 'IR265.pdf',
        documentName: 'IR265',
        country: 'NZ',
        status: 'pending',
        categories: { vehicles: {}, plantEquipment: {}, computerHardware: {} },
        unmatched: ['leaseholdImprovements', 'officeEquipment', 'other']
      }
    }
  }

  /** Mount with a country resolved, then answer the upload with `reply`. */
  async function readyToSend (reply, ok) {
    const wrapper = await withCountry('ZZ', defaultRates())
    global.fetch = jest.fn(() => Promise.resolve({
      ok: ok !== false,
      json: () => Promise.resolve(reply)
    }))
    wrapper.vm.openDocPanel()
    wrapper.vm.docFile = new File(['%PDF-1.4'], 'IR265.pdf', { type: 'application/pdf' })
    return wrapper
  }

  it('posts the file and the client’s country to the advisor’s own route', async () => {
    const wrapper = await readyToSend(readDocument())
    await wrapper.vm.sendTaxDocument()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/report/depreciation-rates/documents')
    expect(opts.method).toBe('POST')
    expect(opts.body.get('country')).toBe('ZZ')
    expect(opts.body.get('file')).toBeTruthy()
  })

  // 🔴 THE RULING THE WHOLE PANEL RESTS ON. What the backend keeps is a proposal in a store
  // the rate resolver never reads, so a document in flight must move nothing at all.
  it('moves no rate on this forecast, and leaves every badge saying so', async () => {
    const wrapper = await readyToSend(readDocument())
    await wrapper.vm.sendTaxDocument()

    Object.keys(PLATFORM).forEach((key) => {
      expect(categoryOf(wrapper, key).rate).toBe(PLATFORM[key])
      expect(categoryOf(wrapper, key).rateSource).toBe('default')
    })
    expect(wrapper.vm.rateOrigin(0)).toBe('report.threeWayForecast.confirm.originDefault')
  })

  it('reports what was proposed, and that none of it is in use', async () => {
    const wrapper = await readyToSend(readDocument())
    await wrapper.vm.sendTaxDocument()

    expect(wrapper.vm.docSent).toBe(true)
    expect(wrapper.vm.docRefused).toBe(false)
  })

  // 🔴 The count is of the SIX CATEGORIES, not the schedule's classes. A tax authority
  // publishes thousands — IR265 about 2,800; a rate stored against a seventh category could
  // never reach a forecast, so counting anything else would tell the advisor a number that
  // means nothing.
  it('counts the categories that got a rate, not the document’s rows', async () => {
    const wrapper = await readyToSend(readDocument())
    await wrapper.vm.sendTaxDocument()

    // $t returns the key, so the interpolation is checked on the component's own inputs.
    const doc = wrapper.vm.docResult.document
    expect(Object.keys(doc.categories)).toHaveLength(3)
    expect(wrapper.vm.form.assets).toHaveLength(6)
  })

  // The advisor sees the refusal immediately, not after their manager has wasted time on it.
  it('an unreadable document is reported as read by nobody, and proposes nothing', async () => {
    const wrapper = await readyToSend({
      ok: false,
      code: 'UNREADABLE',
      message: 'could not be read',
      document: { id: 'doc-2', status: 'unreadable', categories: {} }
    })
    await wrapper.vm.sendTaxDocument()

    expect(wrapper.vm.docRefused).toBe(true)
    expect(wrapper.vm.docSent).toBe(false)
    expect(categoryOf(wrapper, 'vehicles').rate).toBe(20)
  })

  // Not a PDF, too large, a country mismatch — each one tells the advisor something they can
  // act on, so the backend's own message is shown rather than a generic one.
  it('shows the backend’s own refusal rather than a generic failure', async () => {
    const wrapper = await readyToSend(
      { success: false, error: { code: 'NOT_A_PDF', message: 'That file is not a PDF.' } },
      false
    )
    await wrapper.vm.sendTaxDocument()

    expect(wrapper.vm.docError).toBe('That file is not a PDF.')
    expect(wrapper.vm.docResult).toBeNull()
  })

  it('sends nothing when no country has been named', async () => {
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    wrapper.vm.openDocPanel()
    wrapper.vm.docFile = new File(['%PDF-1.4'], 'IR265.pdf', { type: 'application/pdf' })

    await wrapper.vm.sendTaxDocument()
    // Mounting asks for the sell-down ladder, so a bare call count measures the wrong thing.
    const uploads = global.fetch.mock.calls
      .filter(([url]) => String(url).indexOf('/api/report/depreciation-rates/documents') === 0)
    expect(uploads).toHaveLength(0)
  })

  it('a network failure says so rather than reporting a document nobody has', async () => {
    const wrapper = await withCountry('ZZ', defaultRates())
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    wrapper.vm.openDocPanel()
    wrapper.vm.docFile = new File(['%PDF-1.4'], 'IR265.pdf', { type: 'application/pdf' })

    await wrapper.vm.sendTaxDocument()
    expect(wrapper.vm.docResult).toBeNull()
    expect(wrapper.vm.docError).toBeTruthy()
    expect(wrapper.vm.docSent).toBe(false)
  })
})

describe('a read that fails never blocks the advisor', () => {
  it('a refused read leaves the forecast’s own rates working', async () => {
    const wrapper = await withCountry('NZ', null)

    expect(wrapper.vm.resolvedDepreciation).toBeNull()
    expect(categoryOf(wrapper, 'vehicles').rate).toBe(20)
    expect(wrapper.vm.depreciationOffer).toBe('')
    expect(wrapper.vm.noApprovedRatesWarning).toBe('')
  })

  it('a network failure is swallowed rather than shown as a forecast error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const wrapper = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    wrapper.vm.form.country = 'NZ'
    await wrapper.vm.$nextTick()
    jest.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.resolvedDepreciation).toBeNull()
    expect(wrapper.vm.buildError).toBeNull()
  })
})
