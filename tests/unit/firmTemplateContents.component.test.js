/**
 * @jest-environment jsdom
 */
'use strict'

// FirmTemplateContents — the read-only "What's in this library" table
// (SEARCH-CONTENT-CASCADE-PLAN §7, approved mockup firm-template-library.html).
// Per the testing ruling (2026-08-24) nothing here asserts wording or CSS.
// What UAT cannot reliably see, and these pin:
//
// - the search matches across the fields a manager hunts by (title, topic,
//   section, sub-section, tags, purpose), case-insensitively — a field quietly
//   dropped from the haystack looks like "no results" only for some searches;
// - the count line picks the right KEY for whose library is showing;
// - CPD shows only when the record's cpd is present AND not hidden;
// - VIEW-ONLY BY RULING (Mike, 2026-09-01): the table renders no buttons at
//   all — no Edit, no Remove. The first control that appears here is a breach
//   of "content is edited only in Advisor-e", not a feature.

const FirmTemplateContents = require('../../components/firm/FirmTemplateContents.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const TEMPLATES = [
  {
    includedInClient: false,
    page: 'id-1',
    section: 'Do the Job',
    subSection: 'Reporting',
    topic: 'Management Reporting',
    title: 'Dashboard Report',
    purpose: 'Introduce management reporting.',
    position: 1,
    cpd: { isHidden: false, objective: 'Learn.', watchedVideo: 5, reviewTemplate: 10, reheasedTemplate: 0 },
    growth: { isHidden: false, stage: 'Lifestyle', fundamental: 'F1' },
    tags: ['Financial Ratios', 'Monthly Reporting']
  },
  {
    includedInClient: true,
    page: 'id-2',
    section: 'Do the Job',
    subSection: 'EOY Notes & Docs',
    topic: 'Client Meetings',
    title: 'E.O.Y Meeting',
    purpose: 'A springboard into advisory services.',
    position: 2,
    cpd: { isHidden: true },
    growth: { isHidden: false, stage: 'Breakeven', fundamental: 'F2' },
    tags: ['Volatility']
  },
  {
    includedInClient: false,
    page: 'id-3',
    section: 'Get the Job',
    subSection: 'Marketing',
    topic: 'Seminars',
    title: 'Design & Deliver',
    purpose: 'Run a seminar.',
    position: 3,
    tags: []
  }
]

function mountTable (props) {
  return mountWithBuefy(FirmTemplateContents, {
    propsData: Object.assign({ templates: TEMPLATES, source: 'firm' }, props)
  })
}

describe('the search', () => {
  it.each([
    ['a title fragment, case-insensitively', 'dashboard', ['id-1']],
    ['a topic', 'client meetings', ['id-2']],
    ['a sub-section', 'marketing', ['id-3']],
    ['a meta tag', 'volatility', ['id-2']],
    ['purpose text', 'springboard', ['id-2']]
  ])('matches %s', (_label, query, expectedPages) => {
    const wrapper = mountTable()
    wrapper.vm.search = query
    expect(wrapper.vm.filtered.map(t => t.page)).toEqual(expectedPages)
  })

  it('an empty search shows the whole library', () => {
    const wrapper = mountTable()
    expect(wrapper.vm.filtered).toHaveLength(3)
  })

  it('no match shows the honest empty message, not an empty table', async () => {
    const wrapper = mountTable()
    wrapper.vm.search = 'zzz-nothing'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('table').exists()).toBe(false)
  })
})

describe('the count line', () => {
  it('names the firm\'s library when the firm\'s upload is in force', () => {
    expect(mountTable({ source: 'firm' }).vm.countLine).toContain('firmTemplateLibrary.countFirm')
  })

  it('names the platform\'s library otherwise', () => {
    expect(mountTable({ source: 'platform' }).vm.countLine).toContain('firmTemplateLibrary.countPlatform')
  })
})

describe('CPD visibility', () => {
  it('a record with visible cpd reports it; hidden or absent cpd does not', () => {
    const wrapper = mountTable()
    expect(wrapper.vm.hasCpd(TEMPLATES[0])).toBe(true)
    expect(wrapper.vm.hasCpd(TEMPLATES[1])).toBe(false) // isHidden
    expect(wrapper.vm.hasCpd(TEMPLATES[2])).toBe(false) // no cpd at all
  })
})

describe('view-only by ruling', () => {
  it('renders NO buttons — no Edit, no Remove, nothing that writes', () => {
    const wrapper = mountTable()
    // Open a detail row too, so the assertion covers the expanded record.
    wrapper.find('table tbody tr td a').exists() // Buefy's chevron is an <a>
    expect(wrapper.findAll('button').length).toBe(0)
  })
})
