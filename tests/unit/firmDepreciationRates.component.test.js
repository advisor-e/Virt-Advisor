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
