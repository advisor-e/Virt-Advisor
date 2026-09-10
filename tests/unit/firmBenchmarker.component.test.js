/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The mentor's Industry Benchmarks tab (item 4.70 stage 3). What UAT cannot see: the two
 * files posted under the wrong field names, a single file posted at all, or a restore
 * sent without the version it names — each of which the backend would refuse in a way that
 * reads as "the upload is broken" rather than as the screen's own fault.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmBenchmarker = require('~/components/firm/FirmBenchmarker.vue').default

const SUMMARY = { dataset: { source: 'Stats NZ Business Performance Benchmarker', year: 2025, provisional: true, counts: { industries: 483, withBenchmarks: 228, ratioRows: 6111 } }, uploaded: false }

function fetchMock (answers) {
  return jest.fn((url, opts) => {
    const key = ((opts && opts.method) || 'GET') + ' ' + String(url)
    const body = answers[key] || { history: [] }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
}

afterEach(() => { delete global.fetch })

describe('the Industry Benchmarks tab', () => {
  test('shows the release in force, and its history, from the two mentor routes', async () => {
    global.fetch = fetchMock({ 'GET /api/firm-manager/benchmarker': SUMMARY, 'GET /api/firm-manager/benchmarker/history': { history: [{ id: 7, version: 2, created_by: 'mentor@x', created_at: '2026-09-08' }] } })
    const wrapper = mountWithBuefy(FirmBenchmarker, { propsData: { apiToken: 'tok-1' } })
    await settle(wrapper)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-1')
    expect(wrapper.vm.summary.year).toBe(2025)
    expect(wrapper.vm.history.length).toBe(1)
    expect(wrapper.text()).toContain('483')
    expect(wrapper.text()).toContain('6,111')
  })

  test('🔴 THE UPLOAD POSTS BOTH FILES UNDER THE FIELD NAMES THE ROUTE READS, and never one alone', async () => {
    global.fetch = fetchMock({ 'GET /api/firm-manager/benchmarker': SUMMARY, 'POST /api/firm-manager/benchmarker': { saved: true, dataset: SUMMARY.dataset } })
    const wrapper = mountWithBuefy(FirmBenchmarker, { propsData: { apiToken: 'tok-1' } })
    wrapper.vm.$buefy = { toast: { open: jest.fn() } }
    await settle(wrapper)
    wrapper.vm.ratiosFile = new File(['a,b'], 'benchmark_ratios.csv')
    await wrapper.vm.upload()
    expect(global.fetch.mock.calls.some(c => c[1] && c[1].method === 'POST')).toBe(false)
    wrapper.vm.financialFile = new File(['c,d'], 'financial.csv')
    await wrapper.vm.upload()
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(post[0]).toBe('/api/firm-manager/benchmarker')
    expect(post[1].headers.Authorization).toBe('Bearer tok-1')
    expect(post[1].body).toBeInstanceOf(FormData)
    expect(post[1].body.get('ratios').name).toBe('benchmark_ratios.csv')
    expect(post[1].body.get('financial').name).toBe('financial.csv')
    expect(wrapper.vm.ratiosFile).toBeNull()
  })

  test('a refusal from the backend is shown, and nothing is cleared', async () => {
    global.fetch = jest.fn((url, opts) => {
      if (opts && opts.method === 'POST') { return Promise.resolve({ ok: false, statusText: 'Bad Request', json: () => Promise.resolve({ error: { code: 'BENCHMARKER_REJECTED', message: 'The benchmark ratios file has no "Value_median" column' } }) }) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).endsWith('/history') ? { history: [] } : SUMMARY) })
    })
    const wrapper = mountWithBuefy(FirmBenchmarker, { propsData: { apiToken: 'tok-1' } })
    await settle(wrapper)
    wrapper.vm.ratiosFile = new File(['a'], 'r.csv')
    wrapper.vm.financialFile = new File(['b'], 'f.csv')
    await wrapper.vm.upload()
    expect(wrapper.vm.saveError).toMatch(/Value_median/)
    expect(wrapper.vm.ratiosFile).not.toBeNull()
  })

  test('restore names the version it puts back', async () => {
    global.fetch = fetchMock({ 'GET /api/firm-manager/benchmarker': SUMMARY, 'POST /api/firm-manager/benchmarker/restore': { restored: true } })
    const wrapper = mountWithBuefy(FirmBenchmarker, { propsData: { apiToken: 'tok-1' } })
    wrapper.vm.$buefy = { toast: { open: jest.fn() } }
    await settle(wrapper)
    await wrapper.vm.restore(7)
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(post[0]).toBe('/api/firm-manager/benchmarker/restore')
    expect(JSON.parse(post[1].body)).toEqual({ versionId: 7 })
  })
})
