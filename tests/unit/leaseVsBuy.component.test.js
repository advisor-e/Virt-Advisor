/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const LeaseVsBuy = require('~/components/LeaseVsBuy.vue').default
const { computeLeaseVsBuy } = require('~/server/report/leaseVsBuyModel')

/**
 * Component test — LeaseVsBuy screen.
 *
 * The maths is golden-tested (leaseVsBuyModel.test.js) and the headline/badge shape is
 * held by the two consistency guards. This suite covers the two things only the screen
 * can get wrong: the display→decimal rate conversion in the payload (a missed ÷100 sends
 * 950% and silently wrecks every figure) and the verdict actually rendering.
 */

// mounted() fires a recompute, so every mount needs a fetch to exist. Individual
// tests override it (mountWithResult) to control the response.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: null }) }))
})
afterEach(() => { delete global.fetch })

/** Mount with the backend answering, and let the first result land. */
async function mountWithResult (data) {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data }) }))
  const wrapper = mountWithBuefy(LeaseVsBuy, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('LeaseVsBuy screen', () => {
  it('converts display percentages to decimals in the backend payload', () => {
    const wrapper = mountWithBuefy(LeaseVsBuy, { propsData: {} })
    const body = wrapper.vm.recomputeRequest().body

    expect(wrapper.vm.recomputeRequest().url).toBe('/api/report/lease-vs-buy')
    // Rates: display form ÷ 100 (9.5 → 0.095, 23 → 0.23, 28 → 0.28, 15 → 0.15, 1.5 → 0.015)
    expect(body.interestRate).toBeCloseTo(0.095, 6)
    expect(body.depreciationRate).toBeCloseTo(0.23, 6)
    expect(body.companyTaxRate).toBeCloseTo(0.28, 6)
    expect(body.gstRate).toBeCloseTo(0.15, 6)
    expect(body.inflationRate).toBeCloseTo(0.015, 6)
    // Non-rate fields and enums pass through untouched
    expect(body.loanType).toBe('T')
    expect(body.depreciationMethod).toBe('dv')
    expect(body.includesServicing).toBe('yes')
    expect(body.purchasePrice).toBe(55000)
    // The workbook's fixed per-year repairs are sent, so nothing defaults on the backend
    expect(body.buyRepairs).toEqual([250, 250, 1500, 250, 250, 500, 3500, 2000, 1500, 1000])
  })

  it('the seeded screen sends a payload the backend accepts with no defaulting', () => {
    const wrapper = mountWithBuefy(LeaseVsBuy, { propsData: {} })
    const result = computeLeaseVsBuy(wrapper.vm.recomputeRequest().body)
    expect(result.defaultedInputs).toEqual([])
    expect(result.verdict.recommended).toBe('lease')
    expect(result.lease.totalNet).toBeCloseTo(28725.45, 2)
  })

  it('renders the lease verdict branch and the corrected totals', async () => {
    // The test harness's $t() returns the key, so assert on the verdict KEY chosen —
    // the lease branch (not buy). The wording itself is pinned in the model/locale.
    const wrapper = await mountWithResult(computeLeaseVsBuy({}))
    const text = wrapper.text()
    expect(text).toContain('report.leaseVsBuy.verdict.lease')
    expect(text).not.toContain('report.leaseVsBuy.verdict.buy')
    // Both headline totals reach the screen (money() rounds to whole dollars)
    expect(text).toMatch(/28,725/) //  corrected Total Lease Cost
    expect(text).toMatch(/33,265/) //  Total Buy Cost (33,264.59 → 33,265)
  })
})
