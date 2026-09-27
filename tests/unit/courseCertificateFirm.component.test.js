/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The completion certificate is headed with the advisor's firm (Mike, 2026-09-25), read from
 * the verified pass through /api/report/firm/brand. A brand is decoration: the certificate
 * opens whatever the read does, and falls back to "Advisor-e".
 */

const { mountWithBuefy, englishMocks } = require('../helpers/mountComponent')
const CourseBuilder = require('~/components/CourseBuilder.vue').default

function mountComplete () {
  const wrapper = mountWithBuefy(CourseBuilder, {
    propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: 'token' },
    mocks: englishMocks()
  })
  return wrapper.setData({
    phase: 'complete',
    activeCourse: {
      id: 'c1',
      outline: { title: 'A course', sessions: [{ id: 1, title: 'S1', focus: 'f' }] },
      progress: [{ status: 'complete', quizScore: 80, completedAt: '2026-09-25T00:00:00Z' }]
    }
  }).then(() => wrapper)
}

beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => {
  delete global.fetch
  jest.restoreAllMocks()
})

function answering (body) {
  // Course loading also uses fetch on mount; only the brand route answers with a body.
  global.fetch = jest.fn(url => (String(url) === '/api/report/firm/brand'
    ? Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    : Promise.reject(new Error('not in this test'))))
}

test('heads the certificate with the firm the pass belongs to', async () => {
  answering({ name: 'Harbour Accounting Ltd', logo: null, colour: null, isDefault: false })
  const wrapper = await mountComplete()

  await wrapper.vm.openCertificate()
  await wrapper.vm.$nextTick()

  expect(wrapper.vm.showCertificate).toBe(true)
  expect(wrapper.find('.cert-logo').text()).toBe('Harbour Accounting Ltd')
  const [url, opts] = global.fetch.mock.calls.find(c => c[0] === '/api/report/firm/brand')
  expect(url).toBe('/api/report/firm/brand')
  expect(opts.headers.Authorization).toBe('Bearer token')
})

test.each([
  ['no name on file', () => answering({ name: null, logo: null, colour: null, isDefault: true })],
  ['the read failing', () => { global.fetch = jest.fn(() => Promise.reject(new Error('down'))) }]
])('%s still opens the certificate, headed Advisor-e', async (_label, arrange) => {
  arrange()
  const wrapper = await mountComplete()

  await wrapper.vm.openCertificate()
  await wrapper.vm.$nextTick()

  expect(wrapper.vm.showCertificate).toBe(true)
  expect(wrapper.find('.cert-logo').text()).toBe('Advisor-e')
})
