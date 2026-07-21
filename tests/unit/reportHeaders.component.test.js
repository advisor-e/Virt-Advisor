/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const DebtorDragReport = require('~/components/DebtorDragReport.vue').default
const MarginBreakevenReport = require('~/components/MarginBreakevenReport.vue').default
const BusinessPerformanceReport = require('~/components/BusinessPerformanceReport.vue').default
const EightLeversReport = require('~/components/EightLeversReport.vue').default

/**
 * Header coverage for the four report screens that carry one.
 *
 * Written BEFORE the ReportShell extraction (Phase 3, step 3) deliberately: these three
 * screens had no component tests at all, so converting them first would have meant
 * converting blind — and the header is the first thing an advisor sees.
 *
 * What is asserted here is what must survive the extraction: every report can get back
 * to the library, and each one still says which report it is. The header's static
 * chrome (eyebrow, "prepared for" line, Illustrative badge) is asserted in detail in
 * `staleBanner`-style isolation by `reportShell.component.test.js`, since after the
 * extraction it comes from one component and is identical by construction.
 *
 * The screens are mounted with a failing backend on purpose: the header sits outside
 * the results section, so it must render whether or not a calculation ever succeeds —
 * which is also the state an advisor sees if the backend is down.
 */

const SCREENS = [
  { name: 'Debtor Business Drag', component: DebtorDragReport, title: 'Debtor Business Drag' },
  { name: 'Margin, Mark-up & Break-even', component: MarginBreakevenReport, title: 'Margin, Mark-up & Break-even' },
  { name: 'Working Capital Cycle', component: BusinessPerformanceReport, title: 'Working Capital Cycle' },
  // Eight Levers resolves its title through i18n; the stub returns the key.
  { name: 'Eight Levers', component: EightLeversReport, title: 'report.eightLevers.title' }
]

/** Mount a report screen with the backend unreachable, and let the failure settle. */
async function mountScreen (component) {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
  const wrapper = mountWithBuefy(component, { propsData: {} })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe.each(SCREENS)('$name — report header', ({ component, title }) => {
  it('renders a header even when the calculation never succeeds', async () => {
    const wrapper = await mountScreen(component)
    expect(wrapper.find('header').exists()).toBe(true)
  })

  it('says which report it is', async () => {
    const wrapper = await mountScreen(component)
    expect(wrapper.find('header h1').text()).toBe(title)
  })

  it('offers a way back to the model library', async () => {
    // Without this the advisor is stranded on the report — there is no other nav.
    const wrapper = await mountScreen(component)
    const link = wrapper.find('header a')

    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/model-library')
    expect(link.text()).toBe('modelLibrary.backToLibrary')
  })
})

/**
 * The other two reports keep their header in the PAGE, because it sits above a step
 * chip row the report component knows nothing about. Pages need Nuxt context to mount,
 * so these import them instead: that still runs the Pug template through the compiler,
 * which is what would catch a broken header — and nothing else covers these two files.
 */
describe.each([
  ['quick-position', '~/pages/quick-position.vue'],
  ['ebitda-dcf', '~/pages/ebitda-dcf.vue']
])('%s page', (name, path) => {
  it('compiles, and registers the shared header', () => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const page = require(path).default
    expect(page.components.ReportHeader).toBeTruthy()
  })

  it('passes no "Illustrative" badge — these run on the client’s real accounts', () => {
    // Asserted against the source: the badge is a claim about the figures, and these
    // two are built from the client's own Xero exports.
    const fs = require('fs')
    const src = fs.readFileSync(path.replace('~/', ''), 'utf8')
    const header = src.slice(src.indexOf('report-header('), src.indexOf(')', src.indexOf('report-header(')))
    expect(header).not.toContain('badge')
  })
})
