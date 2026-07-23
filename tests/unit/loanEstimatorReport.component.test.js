/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const LoanEstimatorReport = require('~/components/LoanEstimatorReport.vue').default
const StaleBanner = require('~/components/base/StaleBanner.vue').default
const {
  DEFAULT_INPUTS,
  DEFAULT_SERVICEABILITY_INPUTS,
  computeLoanEstimatorReport
} = require('~/server/report/loanEstimatorModel')
const en = require('~/locales/en.json')

/**
 * Step 3 of the Loan Estimator — the result screen.
 *
 * The fetch mock runs the REAL backend assembler on the screen's actual
 * request body, so every rendered figure comes from genuine model output —
 * the same principle as the headline-consistency guard.
 */
describe('LoanEstimatorReport', () => {
  /** The two confirmed step payloads — the model's own sample blocks are model-shaped. */
  function stepPayloads () {
    return {
      security: JSON.parse(JSON.stringify(DEFAULT_INPUTS)),
      serviceability: JSON.parse(JSON.stringify(DEFAULT_SERVICEABILITY_INPUTS))
    }
  }

  let lastBody

  beforeEach(() => {
    lastBody = null
    global.fetch = jest.fn((url, opts) => {
      if (url === '/api/report/loan-estimator') {
        lastBody = JSON.parse(opts.body)
        const data = computeLoanEstimatorReport(lastBody)
        return Promise.resolve({ json: () => Promise.resolve({ success: true, data }) })
      }
      // currencyMixin's firm-currency read — a failure silently keeps the default.
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })
  })

  afterEach(() => { delete global.fetch })

  async function mountScreen (props) {
    const wrapper = mountWithBuefy(LoanEstimatorReport, { propsData: props || stepPayloads() })
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('shows the RULED fail verdict + qualifier on the sample (surplus −154.83…)', async () => {
    const wrapper = await mountScreen()
    const text = wrapper.text()
    expect(text).toContain('report.loanEstimator.result.verdictFail')
    expect(text).toContain('report.loanEstimator.result.verdictQualifier')
    expect(text).not.toContain('report.loanEstimator.result.verdictPass')
    expect(wrapper.find('.ler-verdict.is-fail').exists()).toBe(true)

    // The §3.3 ruling, pinned word-for-word — the workbook's own wording is retired.
    const strings = en.report.loanEstimator.result
    expect(strings.verdictPass).toBe('Meets the affordability test')
    expect(strings.verdictFail).toBe('Falls short of the affordability test')
    expect(strings.verdictQualifier).toBe('An indication of affordability only — not a lending decision.')
  })

  it('renders the three hero figures and both summary cards from real model output', async () => {
    const wrapper = await mountScreen()
    const text = wrapper.text()
    ;['hero.surplus', 'hero.availableSecurity', 'hero.repayment',
      'security.title', 'security.rows.combined', 'svc.title', 'svc.income',
      'calc.title'].forEach((key) => {
      expect(text).toContain('report.loanEstimator.result.' + key)
    })
    // Table basis: 10 schedule years + the totals row.
    expect(wrapper.findAll('.ler-result tbody tr').length).toBe(11)
  })

  it('passes both confirmed step payloads through untouched — nothing falls back to defaults', async () => {
    const props = stepPayloads()
    await mountScreen(props)
    expect(lastBody.securityPosition).toEqual(props.security)
    expect(lastBody.serviceability).toEqual(props.serviceability)

    const out = computeLoanEstimatorReport(lastBody)
    expect(out.securityPosition.defaultedInputs).toEqual([])
    expect(out.serviceability.defaultedInputs).toEqual([])
    expect(out.repayment.defaultedInputs).toEqual([])
  })

  it('Interest Only has no schedule table, exactly as the sheet has none', async () => {
    const wrapper = await mountScreen()
    wrapper.vm.calc.basis = 'Interest Only'
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.data.repayment.years).toBe(null)
    expect(wrapper.find('.ler-result table').exists()).toBe(false)
    expect(wrapper.find('.ler-repay').exists()).toBe(true)
  })

  it('a failed recompute raises the stale banner over greyed figures, never silence', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.findComponent(StaleBanner).exists()).toBe(false)

    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await wrapper.vm.recompute()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.error).toBe(true)
    expect(wrapper.findComponent(StaleBanner).exists()).toBe(true)
    // The last good figures stay visible (greyed by HeroStrip's stale state).
    expect(wrapper.find('.ler-verdict').exists()).toBe(true)
  })

  it('Years ↔ Months keeps the same duration', async () => {
    const wrapper = await mountScreen()
    wrapper.vm.calc.termUnit = 'Months'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.calc.term).toBe(432)
    wrapper.vm.calc.termUnit = 'Years'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.calc.term).toBe(36)
  })
})
