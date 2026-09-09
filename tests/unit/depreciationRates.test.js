'use strict'

/**
 * Depreciation Rates per country — the approved-table store (item 4.78, slice 1).
 *
 * WHAT THESE TESTS ARE FOR. A firm manager approving a rate table sees rows go green and a
 * success message come back. What they cannot see, and what UAT cannot see either, is that
 * a rate was stored as 5000% because it was typed as `50`, that a table nobody approved is
 * driving a forecast, that a New Zealand rate is depreciating an Australian client's
 * assets, or that a row was silently dropped as unrecognised. Every one of those produces a
 * forecast that balances perfectly and is wrong — which is the risk the item was filed
 * against. Those are the assertions here.
 */

const { DEFAULTS, ASSET_KEYS } = require('../../server/report/threeWayForecastModel')
const { setFirmMembership } = require('../../server/utils/tierChain')
const {
  BASE_DEPRECIATION_RATES,
  CATEGORY_KEYS,
  CONFIG_KEY,
  MAX_SUPERSEDED,
  normaliseCountry,
  publishedKey,
  validateDepreciationRates,
  pickNewer,
  loadResolvedDepreciationRates,
  ruleAppliesOn,
  splitQualifyingPurchase
} = require('../../server/utils/depreciationRates')

/** A valid first-year rule — New Zealand's Investment Boost, as Inland Revenue states it. */
function boost (over) {
  return Object.assign({
    name: 'Investment Boost',
    rate: 0.2,
    startsOn: '2025-05-22',
    endsOn: null,
    qualifies: 'New assets; new commercial and industrial buildings; capital improvements',
    excludes: 'Land, residential buildings, trading stock, fixed-life intangible property',
    source: { document: 'Inland Revenue — New assets: Investment Boost', page: null, published: '2025-05' },
    approvedAt: '2026-09-09T09:00:00.000Z',
    approvedBy: 'mike@advisor-e.com'
  }, over || {})
}

/** A loader over a `{scopeId: storedValue}` map, standing in for the overlay store. */
function loaderFor (map) {
  return (scopeId, key) => {
    expect(key).toBe(CONFIG_KEY)
    return Promise.resolve(Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null)
  }
}

/** A valid rate entry — the shape everything else varies from. */
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

/** An approved country table holding one category. */
function table (categories, over) {
  return Object.assign({
    approvedAt: '2026-09-08T14:20:00.000Z',
    approvedBy: 'mike@advisor-e.com',
    categories
  }, over || {})
}

afterEach(() => { setFirmMembership({}) })

describe('the app’s own six rates, as shipped', () => {
  // 🔴 THE LOAD-BEARING PIN IN THIS FILE. The same six numbers are declared in three
  // places — this store, the engine's DEFAULTS, and ASSET_SPECS on the intake screen —
  // and only the engine's actually compute a forecast. If this file drifts from it, a
  // firm that has approved nothing gets a different depreciation charge from the one the
  // golden set proves, and nothing on any screen would look wrong.
  test('every default matches the engine’s own rate for that category', () => {
    DEFAULTS.assets.forEach((asset) => {
      const own = BASE_DEPRECIATION_RATES[asset.key]
      expect(own).toBeDefined()
      expect(own.dvRate).toBe(asset.depreciationRate)
    })
  })

  test('the six categories are exactly the engine’s, in its order', () => {
    expect(CATEGORY_KEYS).toEqual(ASSET_KEYS)
  })

  // Rates are decimals here because the engine multiplies by them directly. A file edited
  // to percentages would depreciate every asset by 2000% a year.
  test('every shipped rate is a decimal, not a percentage', () => {
    CATEGORY_KEYS.forEach((key) => {
      expect(BASE_DEPRECIATION_RATES[key].dvRate).toBeGreaterThan(0)
      expect(BASE_DEPRECIATION_RATES[key].dvRate).toBeLessThanOrEqual(1)
    })
  })

  // An app default is told apart from an approved rate by exactly one thing.
  test('no shipped rate carries a source document', () => {
    CATEGORY_KEYS.forEach((key) => { expect(BASE_DEPRECIATION_RATES[key].source).toBeNull() })
  })

  test('the data file’s own documentation never reaches a caller', () => {
    expect(Object.keys(BASE_DEPRECIATION_RATES).sort()).toEqual(ASSET_KEYS.slice().sort())
  })
})

describe('country codes', () => {
  test('a code is normalised to upper case', () => {
    expect(normaliseCountry('nz')).toBe('NZ')
    expect(normaliseCountry(' au ')).toBe('AU')
  })

  // Three spellings of one country would be three tables where a firm approved one.
  test('a country NAME or three-letter code is refused, never guessed at', () => {
    expect(normaliseCountry('New Zealand')).toBeNull()
    expect(normaliseCountry('NZL')).toBeNull()
    expect(normaliseCountry('')).toBeNull()
    expect(normaliseCountry(null)).toBeNull()
  })
})

describe('validating a tier’s own approved tables', () => {
  test('a table with one category is fine — the rest come from above', () => {
    const r = validateDepreciationRates({ NZ: table({ vehicles: entry() }) })
    expect(r.ok).toBe(true)
    expect(r.value.NZ.categories.vehicles.dvRate).toBe(0.5)
    expect(r.value.NZ.categories.plantEquipment).toBeUndefined()
  })

  // 🔴 THE UNIT GUARD. `50` is not a bad 50%, it is a rate typed in the wrong unit, and
  // accepting it as 5000% puts a wrong figure into a forecast that still balances.
  test('a rate above 1 is REFUSED, not clamped', () => {
    const r = validateDepreciationRates({ NZ: table({ vehicles: entry({ dvRate: 50 }) }) })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/50% is 0\.5, not 50/)
    expect(r.value.NZ).toBeUndefined()
  })

  test('a negative rate is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ dvRate: -0.1 }) }) }).ok).toBe(false)
  })

  // 🔴 THE APPROVAL GATE. CLAUDE.md requires isApproved before AI output reaches a
  // financial operation; here that is structural — a table that cannot say who approved
  // it and when is not a table this store can hold.
  test('a table with no approver is refused', () => {
    const t = table({ vehicles: entry() })
    delete t.approvedBy
    expect(validateDepreciationRates({ NZ: t }).ok).toBe(false)
  })

  test('a table with no approval date is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry() }, { approvedAt: 'whenever' }) }).ok).toBe(false)
  })

  // A rate stored under a name the engine has never heard of is a rate a manager believes
  // they approved and which can never reach a single forecast.
  test('an unknown asset category is refused rather than silently dropped', () => {
    const r = validateDepreciationRates({ NZ: table({ tractors: entry() }) })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/tractors/)
  })

  test('a country that is not a two-letter code is refused', () => {
    expect(validateDepreciationRates({ 'New Zealand': table({ vehicles: entry() }) }).ok).toBe(false)
  })

  // The entry would say how to apply a number it does not have; the resolver would fall
  // through to the app default while the screen showed an approved row.
  test('a method with no matching rate is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ method: 'sl', slRate: null }) }) }).ok).toBe(false)
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ method: 'dv', dvRate: null }) }) }).ok).toBe(false)
  })

  test('a method that is neither dv nor sl is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ method: 'pooled' }) }) }).ok).toBe(false)
  })

  // 🔴 An unsourced number in an approved table is indistinguishable from a sourced one on
  // the page a lender reads.
  test('a rate with no source document is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ source: null }) }) }).ok).toBe(false)
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ source: { published: '2023-10' } }) }) }).ok).toBe(false)
  })

  test('a source with no usable publication date is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ source: { document: 'IR265', published: 'October 2023' } }) }) }).ok).toBe(false)
  })

  test('an approved country holding no rates at all is refused', () => {
    expect(validateDepreciationRates({ NZ: table({}) }).ok).toBe(false)
  })

  test('superseded figures are kept, and cannot nest without limit', () => {
    const older = entry({ dvRate: 0.4, source: { document: 'IR265', page: '61', published: '2019-05' } })
    const r = validateDepreciationRates({ NZ: table({ vehicles: entry({ superseded: [older] }) }) })
    expect(r.ok).toBe(true)
    expect(r.value.NZ.categories.vehicles.superseded[0].dvRate).toBe(0.4)
    expect(r.value.NZ.categories.vehicles.superseded[0].superseded).toBeUndefined()

    const tooMany = new Array(MAX_SUPERSEDED + 1).fill(older)
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry({ superseded: tooMany }) }) }).ok).toBe(false)
  })

  test('a non-object is refused', () => {
    expect(validateDepreciationRates(null).ok).toBe(false)
    expect(validateDepreciationRates([]).ok).toBe(false)
  })
})

describe('publication dates', () => {
  test('a month-only date ranks as the first of that month', () => {
    expect(publishedKey('2024-04')).toBe(publishedKey('2024-04-01'))
    expect(publishedKey('2024-04')).toBeLessThan(publishedKey('2024-05'))
  })

  test('an unrankable date is null rather than a guess', () => {
    expect(publishedKey('October 2023')).toBeNull()
    expect(publishedKey('2023-13')).toBeNull()
    expect(publishedKey('1066-10')).toBeNull()
  })
})

describe('two documents disagreeing about one rate', () => {
  const older = entry({ dvRate: 0.4, source: { document: 'IR267', page: '3', published: '2019-05' } })
  const newer = entry({ dvRate: 0.5, source: { document: 'IR265', page: '61', published: '2023-10' } })

  // Mike's ruling 1, 2026-09-08: the newer publication wins and the older is SHOWN beside
  // it. Silent selection is how a wrong rate becomes invisible.
  test('the newer publication wins and the older is kept beside it', () => {
    const out = pickNewer(older, newer)
    expect(out.dvRate).toBe(0.5)
    expect(out.superseded).toHaveLength(1)
    expect(out.superseded[0].dvRate).toBe(0.4)
  })

  test('it wins whichever order the two arrive in', () => {
    const out = pickNewer(newer, older)
    expect(out.dvRate).toBe(0.5)
    expect(out.superseded[0].dvRate).toBe(0.4)
  })

  // Two documents published the same month do not rank, and inventing an order between
  // them would be the silent selection the ruling forbids.
  test('equal dates keep the incumbent, and still record the disagreement', () => {
    const sameMonth = entry({ dvRate: 0.33, source: { document: 'Other', published: '2023-10' } })
    const out = pickNewer(newer, sameMonth)
    expect(out.dvRate).toBe(0.5)
    expect(out.superseded[0].dvRate).toBe(0.33)
  })

  test('the first figure of all has nothing to supersede', () => {
    expect(pickNewer(null, newer).superseded).toBeUndefined()
  })

  test('a figure superseded twice keeps both predecessors, newest first', () => {
    const once = pickNewer(older, newer)
    const newest = entry({ dvRate: 0.55, source: { document: 'IR265', published: '2026-04' } })
    const twice = pickNewer(once, newest)
    expect(twice.dvRate).toBe(0.55)
    expect(twice.superseded.map(s => s.dvRate)).toEqual([0.5, 0.4])
  })

  test('the same figure loaded twice is not recorded twice', () => {
    const out = pickNewer(pickNewer(older, newer), newer)
    expect(out.superseded).toHaveLength(1)
  })
})

describe('what a scope actually works to', () => {
  test('a scope that has approved nothing gets the app’s six defaults', async () => {
    const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor({}))
    expect(r.isDefault).toBe(true)
    expect(r.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
    expect(r.categories.vehicles.originTier).toBeNull()
    expect(Object.keys(r.categories)).toHaveLength(CATEGORY_KEYS.length)
  })

  // Ruling 3, in Mike's words: "Never block the advisor." A client in a country nobody has
  // loaded a document for gets today's figures, badged as defaults.
  test('an unknown or absent country falls back to the defaults rather than failing', async () => {
    const stored = { 'firm-1': { NZ: table({ vehicles: entry() }) } }
    const r = await loadResolvedDepreciationRates('firm-1', null, loaderFor(stored))
    expect(r.isDefault).toBe(true)
    expect(r.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
  })

  // 🔴 RULING 4. A New Zealand rate would otherwise quietly depreciate an Australian
  // client's assets, and the forecast would balance.
  test('an approved NZ table does not touch an Australian client', async () => {
    const stored = { 'firm-1': { NZ: table({ vehicles: entry() }) } }
    const au = await loadResolvedDepreciationRates('firm-1', 'AU', loaderFor(stored))
    expect(au.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
    expect(au.isDefault).toBe(true)

    const nz = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor(stored))
    expect(nz.categories.vehicles.dvRate).toBe(0.5)
    expect(nz.isDefault).toBe(false)
  })

  test('a category the table does not name keeps the app default', async () => {
    const stored = { 'firm-1': { NZ: table({ vehicles: entry() }) } }
    const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor(stored))
    expect(r.categories.vehicles.dvRate).toBe(0.5)
    expect(r.categories.plantEquipment.dvRate).toBe(BASE_DEPRECIATION_RATES.plantEquipment.dvRate)
    expect(r.categories.plantEquipment.originTier).toBeNull()
  })

  // 🔴 THE STRUCTURAL GATE. A stored table that fails validation — including one nobody
  // approved — is ignored entirely, so there is no state in which an unapproved rate can
  // reach a forecast.
  test('a stored table nobody approved never reaches a forecast', async () => {
    const unapproved = { categories: { vehicles: entry() } }
    const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor({ 'firm-1': { NZ: unapproved } }))
    expect(r.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
    expect(r.isDefault).toBe(true)
  })

  describe('through the four tiers', () => {
    const PLATFORM = '__platform__'
    const GLOBAL = '__global__:Advisor-e'
    const GROUP = '__group__:Advisor-e:NZ'

    beforeEach(() => {
      setFirmMembership({ 'firm-1': { globalGroup: 'Advisor-e', country: 'NZ' } })
    })

    // The advisor's approved drawing badges each row with where its rate came from —
    // "your firm · IR265", "group manager · NZ", "app default" — three origins in one
    // table. This is that table.
    test('each rate says which tier supplied it', async () => {
      const stored = {
        [GROUP]: {
          NZ: table({
            vehicles: entry({ dvRate: 0.45 }),
            officeEquipment: entry({ dvRate: 0.25, label: 'Office equipment' })
          })
        },
        'firm-1': { NZ: table({ vehicles: entry({ dvRate: 0.5 }) }) }
      }
      const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor(stored))

      expect(r.categories.vehicles.dvRate).toBe(0.5)
      expect(r.categories.vehicles.originTier).toBe('firm_manager')

      expect(r.categories.officeEquipment.dvRate).toBe(0.25)
      expect(r.categories.officeEquipment.originTier).toBe('group_manager')

      expect(r.categories.other.originTier).toBeNull()
    })

    test('the nearest tier wins, and the mentor is furthest', async () => {
      const stored = {
        [PLATFORM]: { NZ: table({ vehicles: entry({ dvRate: 0.1 }) }) },
        [GLOBAL]: { NZ: table({ vehicles: entry({ dvRate: 0.2 }) }) },
        [GROUP]: { NZ: table({ vehicles: entry({ dvRate: 0.3 }) }) }
      }
      const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor(stored))
      expect(r.categories.vehicles.dvRate).toBe(0.3)
      expect(r.categories.vehicles.originTier).toBe('group_manager')
    })

    test('a firm that has approved nothing inherits the tier above it', async () => {
      const stored = { [GLOBAL]: { NZ: table({ vehicles: entry({ dvRate: 0.2 }) }) } }
      const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor(stored))
      expect(r.categories.vehicles.dvRate).toBe(0.2)
      expect(r.categories.vehicles.originTier).toBe('global_group_manager')
    })

    test('an approved rate carries who approved it and when', async () => {
      const stored = { 'firm-1': { NZ: table({ vehicles: entry() }) } }
      const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor(stored))
      expect(r.categories.vehicles.approvedBy).toBe('mike@advisor-e.com')
      expect(r.categories.vehicles.approvedAt).toBe('2026-09-08T14:20:00.000Z')
    })

    // A tax-table read must never stop an advisor building a forecast, and one unreachable
    // tier must not lose the tiers already applied.
    test('a storage failure at one tier loses only that tier', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const loader = (scopeId) => {
        if (scopeId === GROUP) { return Promise.reject(new Error('MySQL is down')) }
        if (scopeId === GLOBAL) { return Promise.resolve({ NZ: table({ vehicles: entry({ dvRate: 0.2 }) }) }) }
        return Promise.resolve(null)
      }
      const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loader)
      expect(r.categories.vehicles.dvRate).toBe(0.2)
      spy.mockRestore()
    })

    test('a total storage failure still returns the defaults rather than rejecting', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const r = await loadResolvedDepreciationRates('firm-1', 'NZ', () => Promise.reject(new Error('MySQL is down')))
      expect(r.isDefault).toBe(true)
      expect(r.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
      spy.mockRestore()
    })
  })

  test('no scope id at all gets the defaults', async () => {
    const r = await loadResolvedDepreciationRates(null, 'NZ', loaderFor({}))
    expect(r.isDefault).toBe(true)
  })
})

describe('a country’s first-year rule', () => {
  test('a well-formed rule is accepted whole', () => {
    const r = validateDepreciationRates({ NZ: table({ vehicles: entry() }, { firstYearRule: boost() }) })
    expect(r.ok).toBe(true)
    expect(r.value.NZ.firstYearRule.rate).toBe(0.2)
    expect(r.value.NZ.firstYearRule.startsOn).toBe('2025-05-22')
  })

  // The same unit guard as a depreciation rate, and it bites harder: 20 would expense
  // twenty times the asset's cost in the month it was bought.
  test('a share above 1 is refused, not clamped', () => {
    const r = validateDepreciationRates({ NZ: table({ vehicles: entry() }, { firstYearRule: boost({ rate: 20 }) }) })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/20% is 0\.2, not 20/)
  })

  // 🔴 Mike's own point, 2026-09-09. Investment Boost starts mid-month, so a month cannot
  // decide eligibility at the boundary — the rule has to carry a full date or the purchase
  // date it is compared against is pointless.
  test('a month is refused where a full start date is required', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry() }, { firstYearRule: boost({ startsOn: '2025-05' }) }) }).ok).toBe(false)
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry() }, { firstYearRule: boost({ startsOn: '22 May 2025' }) }) }).ok).toBe(false)
  })

  test('an end date before the start date is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry() }, { firstYearRule: boost({ endsOn: '2024-01-01' }) }) }).ok).toBe(false)
  })

  // 🔴 THE SEPARATE APPROVAL, ruled 2026-09-09. A rule that cannot name who adopted it and
  // when is dropped exactly as an unapproved rate table is — the table's own approval does
  // not carry it, which is the whole point of the second button.
  test('a rule the table approved but nobody adopted is refused', () => {
    const noApprover = boost()
    delete noApprover.approvedBy
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry() }, { firstYearRule: noApprover }) }).ok).toBe(false)
  })

  test('a rule with no source document is refused', () => {
    expect(validateDepreciationRates({ NZ: table({ vehicles: entry() }, { firstYearRule: boost({ source: null }) }) }).ok).toBe(false)
  })

  // Two decisions, two buttons: a firm may take the group's rates unchanged and still adopt
  // its country's scheme itself.
  test('a country holding only a rule, with no rates of its own, is accepted', () => {
    const r = validateDepreciationRates({ NZ: table({}, { firstYearRule: boost() }) })
    expect(r.ok).toBe(true)
    expect(r.value.NZ.firstYearRule.name).toBe('Investment Boost')
  })

  test('a country holding neither rates nor a rule is refused', () => {
    expect(validateDepreciationRates({ NZ: table({}) }).ok).toBe(false)
  })

  test('a resolved rule says which tier adopted it, and the nearest wins', async () => {
    setFirmMembership({ 'firm-1': { globalGroup: 'Advisor-e', country: 'NZ' } })
    const stored = {
      __platform__: { NZ: table({ vehicles: entry() }, { firstYearRule: boost({ rate: 0.1 }) }) },
      'firm-1': { NZ: table({ vehicles: entry() }, { firstYearRule: boost({ rate: 0.2 }) }) }
    }
    const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor(stored))
    expect(r.firstYearRule.rate).toBe(0.2)
    expect(r.firstYearRule.originTier).toBe('firm_manager')
  })

  // The app ships no first-year rule and never will — inventing a country's tax scheme is
  // the fabrication this feature exists to end. Absent means the advisor's field is absent.
  test('no scope having adopted one leaves it null', async () => {
    const r = await loadResolvedDepreciationRates('firm-1', 'NZ', loaderFor({ 'firm-1': { NZ: table({ vehicles: entry() }) } }))
    expect(r.firstYearRule).toBeNull()
  })
})

describe('whether a rule reaches a particular purchase', () => {
  const rule = { rate: 0.2, startsOn: '2025-05-22', endsOn: null }

  // 🔴 THE BOUNDARY THE PURCHASE DATE EXISTS FOR. Both of these fall in May 2025, so a
  // month-level answer would treat them identically and one of them would be wrong.
  test('the day before the rule starts does not qualify; the day it starts does', () => {
    expect(ruleAppliesOn(rule, '2025-05-21')).toBe(false)
    expect(ruleAppliesOn(rule, '2025-05-22')).toBe(true)
  })

  test('a rule with an end date stops at it', () => {
    const windowed = { rate: 0.2, startsOn: '2025-05-22', endsOn: '2026-03-31' }
    expect(ruleAppliesOn(windowed, '2026-03-31')).toBe(true)
    expect(ruleAppliesOn(windowed, '2026-04-01')).toBe(false)
  })

  test('no rule, or no usable date, never qualifies', () => {
    expect(ruleAppliesOn(null, '2026-06-12')).toBe(false)
    expect(ruleAppliesOn(rule, '')).toBe(false)
    expect(ruleAppliesOn(rule, '12 June 2026')).toBe(false)
    expect(ruleAppliesOn(rule, undefined)).toBe(false)
  })

  // Compared as strings on purpose: parsing to Date would put a purchase into the previous
  // day for anyone east of UTC, which is the fault the Economic Analysis run was caught by.
  test('the comparison carries no timezone', () => {
    expect(ruleAppliesOn(rule, '2025-05-22')).toBe(true)
    expect(ruleAppliesOn(rule, '2025-05-22')).toBe(ruleAppliesOn(rule, '2025-05-22'))
  })
})

describe('splitting a qualifying purchase', () => {
  const rule = { rate: 0.2, startsOn: '2025-05-22', endsOn: null }

  // 🔴 MIKE'S OWN EXAMPLE, and the figures behind item 4.77: an 800,000 tractor unit.
  // 160,000 is expensed now and 640,000 goes on the register — which is what makes his
  // costed year-one deduction of 276,895 reconcile at all.
  test('an 800,000 qualifying purchase splits 160,000 / 640,000', () => {
    expect(splitQualifyingPurchase(rule, 800000, '2026-06-12')).toEqual({ deductedNow: 160000, capitalised: 640000 })
  })

  test('a purchase before the rule starts is capitalised in full', () => {
    expect(splitQualifyingPurchase(rule, 12000, '2025-05-10')).toEqual({ deductedNow: 0, capitalised: 12000 })
  })

  test('no rule at all capitalises in full', () => {
    expect(splitQualifyingPurchase(null, 45000, '2026-08-03')).toEqual({ deductedNow: 0, capitalised: 45000 })
  })

  test('nothing qualifying splits to nothing', () => {
    expect(splitQualifyingPurchase(rule, 0, '2026-06-12')).toEqual({ deductedNow: 0, capitalised: 0 })
    expect(splitQualifyingPurchase(rule, null, '2026-06-12')).toEqual({ deductedNow: 0, capitalised: 0 })
  })

  // The two halves must add back to the cost exactly, or the balance sheet stops
  // articulating by a cent on an odd figure and nothing on screen would show it.
  test('the two halves always add back to the cost', () => {
    const odd = splitQualifyingPurchase(rule, 6433.33, '2026-09-20')
    expect(odd.deductedNow + odd.capitalised).toBeCloseTo(6433.33, 2)
  })
})
