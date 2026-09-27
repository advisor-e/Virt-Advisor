/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * THE ADVISOR FIRM'S BRAND REACHES THE BUSINESS PERFORMANCE REPORT — the cover and the
 * footer of every page (item 16).
 *
 * 🔴 WHY THIS EARNS ITS PLACE: UAT IS BLIND TO IT. `firmBrand()` returns no logo or colour
 * until the master team names those columns (seam Q-FIRM-BRAND), so a wired report and an
 * unwired one can look alike to a tester. Until 2026-09-27 this report printed "Firm logo"
 * on every page while item 16 was recorded as "our half is built".
 *
 * Not asserted: what the mark looks like, or any wording. Only that the three values
 * travel from the brand route to every mark the document draws, that a client's own
 * sign-in is the one used, and that a mark falls back in the ruled order.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const DashboardReportsWorkbench = require('~/components/DashboardReportsWorkbench.vue').default
const DashboardReportMark = require('~/components/DashboardReportMark.vue').default
const DashboardReportPage = require('~/components/DashboardReportPage.vue').default
const { computeReportPages } = require('~/server/report/dashboardReportPagesModel')
const { emptyState } = require('~/utils/dashboardReportsSavedShape')

/** A real firm's brand, as `GET /api/report/firm/brand` serves one. */
const BRAND = { name: 'Ashgrove Advisory', logo: 'https://cdn.example.com/ashgrove.png', colour: '#7a4b8f', isDefault: false }

const THRESHOLDS = {
  levels: { debtorDays: { green: 35, amber: 45 }, creditorDays: { green: 35, amber: 45 }, stockDays: { green: 30, amber: 60 } },
  movements: { salesGrowth: { warn: 0, crit: -5 }, grossMargin: { warn: 1, crit: 3 }, overheadRatio: { warn: 1, crit: 3 } }
}
const line = value => ({ value, source: 'file' })
const CURRENT = { bank: line(224000), accountsReceivable: line(365000), stock: line(200000), otherCurrentAssets: line(11000), fixedAssets: line(505000), currentLiabilities: line(410000), accountsPayable: line(200000), nonCurrentLiabilities: line(205000), tradingIncome: line(3650000), otherIncome: line(10000), costOfSales: line(2000000), wages: line(596000), operatingExpenses: line(102000), depreciation: line(38000), interestPaid: line(32000) }

/** The workbench on the document step, the network answering per route. */
async function mountDocument (token) {
  const state = emptyState()
  state.setup = { financialYear: 'FY2026', dateIssued: '2026-09-08', preparedBy: 'Jordan Reid' }
  state.current = { balanceSheetDate: 'As at 30 June 2026', profitLossDate: 'For the year ended 30 June 2026', figures: CURRENT }
  const figures = computeReportPages({ current: CURRENT, prior: null, inventory: state.inventory, thresholds: THRESHOLDS })
  global.fetch = jest.fn(url => Promise.resolve(url === '/api/report/firm/brand'
    ? { ok: true, json: () => Promise.resolve(BRAND) }
    : { ok: true, json: () => Promise.resolve({ success: true, data: figures }) }))
  const wrapper = mountWithBuefy(DashboardReportsWorkbench, {
    propsData: { step: 6, restore: state, token, apiToken: token, clientName: 'Harbourside Kitchen Supplies Ltd' }
  })
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the firm brand reaches every mark on the report', () => {
  test('the cover and every page footer carry the firm\'s name, logo and colour', async () => {
    const wrapper = await mountDocument('tok-client')
    const marks = wrapper.findAllComponents(DashboardReportMark)
    const pages = wrapper.findAllComponents(DashboardReportPage)

    // One on the cover, one in each page's footer — none left behind.
    expect(pages.length).toBeGreaterThan(5)
    expect(marks.length).toBe(pages.length + 1)
    marks.wrappers.forEach((m) => {
      expect(m.props()).toMatchObject({ name: BRAND.name, logo: BRAND.logo, colour: BRAND.colour })
    })
    expect(marks.at(0).props('big')).toBe(true)
  })

  test('🔴 the brand is read with the sign-in\'s own token — a client sees their advisor\'s firm', async () => {
    await mountDocument('tok-client')
    const call = global.fetch.mock.calls.find(([url]) => url === '/api/report/firm/brand')
    expect(call[1].headers).toEqual({ Authorization: 'Bearer tok-client' })
  })

  test('the brand is read again when the real token arrives after mount', async () => {
    const wrapper = await mountDocument('dev-local-bypass')
    await wrapper.setProps({ token: 'tok-real' })
    await Promise.resolve()
    const brandCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/report/firm/brand')
    expect(brandCalls[brandCalls.length - 1][1].headers).toEqual({ Authorization: 'Bearer tok-real' })
  })
})

describe('a mark falls back in the ruled order: logo, then disc and name, then the placeholder', () => {
  test('a logo is shown as the image, with no disc', () => {
    const w = mountWithBuefy(DashboardReportMark, { propsData: { name: 'Ashgrove Advisory', logo: BRAND.logo } })
    expect(w.find('img').attributes('src')).toBe(BRAND.logo)
    expect(w.find('.drm-disc').exists()).toBe(false)
  })

  test('no logo: the disc carries the firm\'s initial, in the firm\'s colour', () => {
    const w = mountWithBuefy(DashboardReportMark, { propsData: { name: 'ashgrove Advisory', colour: '#7a4b8f' } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('.drm-disc').text()).toBe('A')
    expect(w.find('.drm-disc').attributes('style')).toMatch(/background/)
  })

  test('nothing known: no disc and no invented initial — the placeholder', () => {
    const w = mountWithBuefy(DashboardReportMark, { propsData: {} })
    expect(w.find('.drm-disc').exists()).toBe(false)
    expect(w.text()).toBe('report.dashboardReports.doc.firmLogo')
  })
})
