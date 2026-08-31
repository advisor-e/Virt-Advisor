/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { mountWithBuefy } = require('../helpers/mountComponent')
const { MODELS, STATUS_READY, usesRealClientData } = require('~/utils/reportModelCatalogue')

/**
 * CORRECTNESS GUARD — the "Illustrative" badge must match the model's class.
 *
 * The badge is a claim about the FIGURES: it tells the reader these numbers are not
 * their own. `design/MODEL-CLASSIFICATION.md` settles which models may carry it —
 * Education models (illustrative figures, chosen to teach) may; Decision and Report
 * models run on the client's real numbers and must never be badged.
 *
 * Get this wrong and an advisor hands a client a document built from that client's own
 * Xero export with "Illustrative" stamped on it — or, worse the other way, a teaching
 * model with made-up numbers presented as if it were the client's position.
 *
 * Until now the rule was enforced by reading `design/ADDING-A-REPORT.md`. This derives
 * it instead: the expectation comes from the catalogue's own `modelClass` via the
 * catalogue's own `usesRealClientData()` helper, so the rule has ONE definition and a
 * new report that gets it wrong fails the build.
 */

/**
 * Where each shipped report renders its ReportHeader. Four keep it in the component;
 * Quick Position and EBITDA/DCF keep it in the PAGE, because it sits above a step-chip
 * row the report component knows nothing about.
 *
 * An unmapped route is a FAILURE, not a skip — see the coverage test below.
 */
const RENDERED_BY = {
  '/business-performance-report': { component: 'components/BusinessPerformanceReport.vue' },
  '/debtor-drag': { component: 'components/DebtorDragReport.vue' },
  '/margin-breakeven': { component: 'components/MarginBreakevenReport.vue' },
  '/eight-levers': { component: 'components/EightLeversReport.vue' },
  '/lease-vs-buy': { component: 'components/LeaseVsBuy.vue' },
  '/cost-of-capital': { component: 'components/CostOfCapital.vue' },
  '/multiple-property': { component: 'components/MultiplePropertyAssessment.vue' },
  '/volatility': { component: 'components/VolatilityReport.vue' },
  // Pages need Nuxt context to mount, so these are asserted at source.
  '/quick-position': { source: 'pages/quick-position.vue' },
  '/ebitda-dcf': { source: 'pages/ebitda-dcf.vue' },
  '/loan-estimator': { source: 'pages/loan-estimator.vue' }
}

const READY = MODELS.filter(m => m.status === STATUS_READY)

/**
 * The `report-header( ... )` attribute block, with nested parens handled.
 *
 * Scanning to the first `)` does NOT work: the block's own attributes contain
 * `$t('modelLibrary.backToLibrary')`, so a naive slice stops inside the first
 * translation call and never reaches the badge line — which made an earlier version of
 * this check silently vacuous. Depth-count instead.
 *
 * @param {string} src - the file's source
 * @returns {string} the text between the outer parentheses
 */
function headerAttributes (src) {
  const open = src.indexOf('report-header(')
  if (open === -1) { return '' }
  let depth = 0
  for (let i = open + 'report-header'.length; i < src.length; i++) {
    if (src[i] === '(') { depth++ }
    if (src[i] === ')') {
      depth--
      if (depth === 0) { return src.slice(open, i + 1) }
    }
  }
  return ''
}

/** Does this screen actually pass a badge to ReportHeader? */
async function badgeIsRendered (entry) {
  if (entry.component) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const component = require('~/' + entry.component).default
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const wrapper = mountWithBuefy(component, { propsData: {} })
    await wrapper.vm.$nextTick()
    const header = wrapper.findComponent({ name: 'ReportHeader' })
    expect(header.exists()).toBe(true)
    return Boolean(header.props('badge'))
  }
  const src = fs.readFileSync(path.join(__dirname, '../../', entry.source), 'utf8')
  const attrs = headerAttributes(src)
  expect(attrs).not.toBe('') // the header must exist at all
  return /\bbadge\s*=/.test(attrs)
}

afterEach(() => { delete global.fetch })

describe('“Illustrative” badge matches the model class', () => {
  it('covers every shipped report — an unmapped one fails rather than slipping through', () => {
    // Without this, adding a report and forgetting to map it would leave it silently
    // unchecked, which is the failure mode this whole file exists to remove.
    const unmapped = READY.filter(m => !RENDERED_BY[m.route])
    expect(unmapped.map(m => m.name)).toEqual([])
    expect(READY.length).toBeGreaterThanOrEqual(6)
  })

  it.each(READY.map(m => [m.name, m]))('%s', async (name, model) => {
    const rendered = await badgeIsRendered(RENDERED_BY[model.route])
    // Education models may be badged; anything running on real client data may not.
    const allowed = !usesRealClientData(model)

    expect(rendered).toBe(allowed)
  })
})
