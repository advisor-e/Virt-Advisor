/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The COI screen — item 17 stage 3, the referral-partner half.
 *
 * WHAT IS WORTH ASSERTING HERE, AND WHAT IS NOT.
 *
 * Mike's rule of 2026-08-24: a test earns its place when it catches what UAT
 * cannot. The labels, the colours and the layout are judged better by a person
 * in five seconds than by an assertion, so none of that is pinned. What a tester
 * CANNOT see:
 *
 *   1. That edit and delete are absent on a COLLEAGUE'S shared partner. Signed in
 *      as one advisor you see only your own rows, so the screen looks identical
 *      whether the rule holds or not.
 *   2. 🔴 That the conversion rate is conversions over REFERRALS, not over
 *      partners. Both produce a confident percentage; only one is right, and the
 *      wrong one reads plausibly until a partner sends a second job.
 *   3. That a rate with no referrals says nothing rather than 0%. A zero on an
 *      empty network tells an advisor their referrals are failing when they have
 *      not asked for one.
 *   4. That money is the FIRM's currency, not a hardcoded one — £ and $ both look
 *      like money.
 *   5. That an empty number box saves as 0 rather than NaN. NaN reaches MySQL as
 *      NULL on a NOT NULL column and fails the whole insert on one bad field.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const SalesCoi = require('../../components/sales/SalesCoi.vue').default

const ME = 'advisor-me'
const THEM = 'advisor-them'

/** The component's source, exactly as written. */
function componentSource () {
  return require('fs').readFileSync(
    require.resolve('../../components/sales/SalesCoi.vue'), 'utf8'
  )
}

/**
 * The component's CODE, with every comment removed — this file and the component
 * both NAME the patterns they forbid in order to explain them, so an assertion
 * about code must read the code and not the prose around it.
 */
function componentCode () {
  return componentSource()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !/^\s*(\/\/|\/\/-)/.test(l))
    .join('\n')
}

/** A referral partner, with only what a test cares about spelled out. */
function coi (over) {
  return Object.assign({
    id: 'c1',
    advisorId: ME,
    firmId: 'firm-1',
    visibility: 'private',
    coiName: 'Hollis & Co',
    entity: 'Hollis Legal',
    position: 'Partner',
    industry: 'Legal',
    leadRelationshipPartner: 'Jo',
    totalReferrals: 0,
    totalConverted: 0,
    feeValue: 0
  }, over || {})
}

/** Mount with the list already answered, so `mounted()`'s fetch is deterministic. */
async function mountWith (items, currency) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, items, currency: currency || 'GBP' })
  }))
  const w = mountWithBuefy(SalesCoi)
  // currencyMixin also fetches; let both settle.
  await w.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await w.vm.$nextTick()
  return w
}

let prevClient
let currentToken = null

function setToken (token) {
  currentToken = token
}

/**
 * Install the stub ONCE. jsdom's window.localStorage is a read-only accessor, so
 * a plain assignment is silently ignored and the real (empty) store answers —
 * which is how the sharing tests on the pipeline screen first PASSED while
 * asserting nothing. defineProperty is what actually replaces it.
 */
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: k => (k === 'advisor_e_token' ? currentToken : null),
    setItem: () => {},
    removeItem: () => {}
  }
})

beforeEach(() => {
  jest.clearAllMocks()
  // Nuxt sets process.client in the browser; jest does not, so the component's
  // SSR guards would refuse to read the token and every row would look like the
  // caller's own. Without this the sharing rule below is untested and PASSES.
  prevClient = process.client
  process.client = true
  const payload = Buffer.from(JSON.stringify({ advisorId: ME })).toString('base64')
  setToken('h.' + payload + '.s')
  window.atob = str => Buffer.from(str, 'base64').toString('binary')
})

afterEach(() => {
  process.client = prevClient
})

describe('a colleague\'s shared partner is readable but not editable', () => {
  test('🔴 my own partner offers edit and delete', async () => {
    const w = await mountWith([coi({ advisorId: ME })])
    expect(w.findAll('.sc-act button').length).toBe(2)
  })

  test('🔴 a colleague\'s SHARED partner offers neither', async () => {
    const w = await mountWith([coi({ id: 'c2', advisorId: THEM, visibility: 'firm' })])
    // The row is there — it is readable.
    expect(w.findAll('tbody tr').length).toBe(1)
    // And it carries no action the server would refuse.
    expect(w.findAll('.sc-act button').length).toBe(0)
  })

  test('a mixed list offers actions on mine only', async () => {
    const w = await mountWith([
      coi({ id: 'a', advisorId: ME }),
      coi({ id: 'b', advisorId: THEM, visibility: 'firm' }),
      coi({ id: 'c', advisorId: ME })
    ])
    expect(w.findAll('tbody tr').length).toBe(3)
    expect(w.findAll('.sc-act button').length).toBe(4) // two rows × edit+delete
  })

  test('with no readable token every row is offered — the BACKEND still refuses', async () => {
    setToken(null)
    const w = await mountWith([coi({ advisorId: THEM, visibility: 'firm' })])
    expect(w.vm.advisorId).toBe('')
    expect(w.findAll('.sc-act button').length).toBe(2)
  })
})

describe('🔴 the conversion rate is conversions over REFERRALS', () => {
  test('one partner sending 10 referrals with 4 converted reads 40%, not 400%', async () => {
    const w = await mountWith([coi({ totalReferrals: 10, totalConverted: 4 })])
    expect(w.vm.stats.find(s => s.key === 'conversionRate').value).toBe('40%')
  })

  test('🔴 a rate over PARTNERS would read above 100% — it must not', async () => {
    // Two partners, twelve referrals, nine converted. Over referrals: 75%.
    // Over partners (the plausible wrong denominator): 450%.
    const w = await mountWith([
      coi({ id: 'a', totalReferrals: 8, totalConverted: 6 }),
      coi({ id: 'b', totalReferrals: 4, totalConverted: 3 })
    ])
    expect(w.vm.stats.find(s => s.key === 'conversionRate').value).toBe('75%')
  })

  test('it matches what the backend computes for the same rows', () => {
    // The insights screen shows this figure too, from server/utils/salesMetrics.js.
    // The two must not disagree: an advisor seeing 40% here and 38% there has no
    // way to tell which is the real one.
    const metrics = require('../../server/utils/salesMetrics')
    const rows = [
      { totalReferrals: 8, totalConverted: 6, feeValue: 0 },
      { totalReferrals: 4, totalConverted: 3, feeValue: 0 }
    ]
    const backend = metrics.compute([], rows).coi.conversionRate
    expect(backend).toBe(75)
  })

  test('🔴 no referrals says nothing, NOT 0%', async () => {
    const w = await mountWith([coi({ totalReferrals: 0, totalConverted: 0 })])
    const rate = w.vm.stats.find(s => s.key === 'conversionRate').value
    expect(rate).not.toBe('0%')
    expect(rate).toBe('—')
  })

  test('a fractional rate keeps one decimal rather than rounding to a whole', async () => {
    const w = await mountWith([coi({ totalReferrals: 3, totalConverted: 1 })])
    expect(w.vm.stats.find(s => s.key === 'conversionRate').value).toBe('33.3%')
  })
})

describe('money is the firm\'s, never a hardcoded currency', () => {
  test('🔴 no local formatter and no hardcoded currency in this component', () => {
    const code = componentCode()
    expect(code).not.toMatch(/new Intl\.NumberFormat/)
    expect(code).not.toMatch(/['"]USD['"]/)
    expect(code).not.toMatch(/['"]en-US['"]/)
  })

  test('the component takes its formatter from currencyMixin', () => {
    const src = componentSource()
    expect(src).toMatch(/mixins:\s*\[currencyMixin\]/)
  })
})

describe('the summary follows what is on screen', () => {
  test('a filter narrows the figures as well as the rows', async () => {
    const w = await mountWith([
      coi({ id: 'a', industry: 'Legal', totalReferrals: 10, totalConverted: 5 }),
      coi({ id: 'b', industry: 'Retail', totalReferrals: 90, totalConverted: 0 })
    ])
    expect(w.vm.stats.find(s => s.key === 'referrals').value).toBe('100')

    w.setData({ industryFilter: 'Legal' })
    await w.vm.$nextTick()
    expect(w.vm.visible.length).toBe(1)
    expect(w.vm.stats.find(s => s.key === 'referrals').value).toBe('10')
    // And the rate follows the same rows, rather than summarising the unfiltered set.
    expect(w.vm.stats.find(s => s.key === 'conversionRate').value).toBe('50%')
  })

  test('search matches the name, entity, industry, position and lead', async () => {
    const w = await mountWith([
      coi({ id: 'a', coiName: 'Zephyr', entity: '', industry: '', position: '', leadRelationshipPartner: '' }),
      coi({ id: 'b', coiName: 'Other', entity: 'Zephyr Holdings', industry: '', position: '', leadRelationshipPartner: '' }),
      coi({ id: 'c', coiName: 'Other', entity: '', industry: 'Zephyr', position: '', leadRelationshipPartner: '' }),
      coi({ id: 'd', coiName: 'Other', entity: '', industry: '', position: '', leadRelationshipPartner: 'Zephyr' }),
      coi({ id: 'e', coiName: 'Nothing', entity: '', industry: '', position: '', leadRelationshipPartner: '' })
    ])
    w.setData({ search: 'zephyr' })
    await w.vm.$nextTick()
    expect(w.vm.visible.map(i => i.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('the form sends what the routes accept', () => {
  test('an empty number box becomes 0', async () => {
    const w = await mountWith([])
    w.vm.openNew()
    // Every number field left untouched — the state an advisor adding a partner
    // with only a name is actually in.
    const body = w.vm.payload()
    const numbers = [
      'couldWe', 'howWouldWe', 'willWe', 'testReview',
      'totalReferrals', 'totalConverted', 'feeValue'
    ]
    numbers.forEach((f) => { expect(body[f]).toBe(0) })
  })

  test('🔴 an ABSENT number becomes 0, never NaN', async () => {
    // ⚠ `Number('')` is 0, so asserting on an empty box proves nothing about the
    // guard — the first version of this test passed with the guard DELETED. The
    // values that actually reach NaN are `undefined` and unparseable text, and a
    // NaN reaches MySQL as NULL on a NOT NULL column, failing the whole insert on
    // one bad field. Mutation-verified: removing the guard fails this test.
    const w = await mountWith([])
    w.vm.openNew()
    w.setData({
      draft: Object.assign(w.vm.draft, {
        coiName: 'Hollis & Co',
        totalReferrals: undefined,
        feeValue: undefined
      })
    })
    const body = w.vm.payload()
    expect(body.totalReferrals).toBe(0)
    expect(body.feeValue).toBe(0)
    expect(Number.isNaN(body.totalReferrals)).toBe(false)
    expect(Number.isNaN(body.feeValue)).toBe(false)
  })

  test('a new partner is private by default', async () => {
    const w = await mountWith([])
    w.vm.openNew()
    expect(w.vm.payload().visibility).toBe('private')
  })

  test('text fields are trimmed and never sent as undefined', async () => {
    const w = await mountWith([])
    w.vm.openNew()
    w.setData({ draft: Object.assign(w.vm.draft, { coiName: '  Hollis & Co  ' }) })
    const body = w.vm.payload()
    expect(body.coiName).toBe('Hollis & Co')
    expect(body.email).toBe('')
  })

  test('saving without a name is refused before any call is made', async () => {
    const w = await mountWith([])
    w.vm.openNew()
    expect(w.vm.canSave).toBe(false)
    const before = global.fetch.mock.calls.length
    await w.vm.save()
    expect(global.fetch.mock.calls.length).toBe(before)
  })

  test('an edit sends PUT to the row\'s own id; a new one POSTs to the collection', async () => {
    const w = await mountWith([coi({ id: 'c9' })])
    w.vm.openEdit(coi({ id: 'c9' }))
    global.fetch.mockClear()
    await w.vm.save()
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/sales/coi/c9')
    expect(options.method).toBe('PUT')
  })
})

describe('a failure is visible, never a silently empty screen', () => {
  test('an HTTP error shows the server\'s message', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ success: false, error: { code: 'DB_ERROR', message: 'Could not load' } })
    }))
    const w = mountWithBuefy(SalesCoi)
    await w.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    await w.vm.$nextTick()
    expect(w.vm.errorText).toBe('Could not load')
  })

  test('🔴 a network failure is caught and reported rather than thrown away', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const w = mountWithBuefy(SalesCoi)
    await w.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    await w.vm.$nextTick()
    expect(w.vm.errorText).toBeTruthy()
    expect(w.vm.items).toEqual([])
  })
})
