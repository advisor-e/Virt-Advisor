/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ReportHeader = require('~/components/base/ReportHeader.vue').default

/**
 * The shared report banner's own contract (owner ruling 2026-07-22: one header, solid
 * #002b64, across every model in this section).
 *
 * The badge tests are the ones that matter. "Illustrative" is a statement about the
 * FIGURES, not a decoration: it tells the reader these numbers are not their own. Two
 * of the six reports are built from the client's real Xero exports, so the badge must
 * be genuinely absent there — not merely blank, which would still render an empty pill.
 */

function mount (props) {
  return mountWithBuefy(ReportHeader, {
    propsData: Object.assign({
      title: 'Debtor Business Drag',
      backLabel: 'Back to the model library'
    }, props)
  })
}

describe('ReportHeader', () => {
  it('renders the title and the back link', () => {
    const wrapper = mount()
    expect(wrapper.find('h1').text()).toBe('Debtor Business Drag')

    const link = wrapper.find('a')
    expect(link.text()).toBe('Back to the model library')
    expect(link.attributes('href')).toBe('/model-library')
  })

  it('sends the advisor somewhere else when asked', () => {
    const wrapper = mount({ backTo: '/advisor' })
    expect(wrapper.find('a').attributes('href')).toBe('/advisor')
  })

  it('shows the eyebrow, client line and badge when given them', () => {
    const wrapper = mount({
      eyebrow: 'Business Performance Report',
      client: 'Sample Trading Ltd',
      badge: 'Illustrative'
    })
    expect(wrapper.find('.rs-eyebrow').text()).toBe('Business Performance Report')
    expect(wrapper.find('.rs-client').text()).toBe('Sample Trading Ltd')
    expect(wrapper.find('.rs-badge').text()).toBe('Illustrative')
  })

  it('omits the "Illustrative" badge entirely when none is given', () => {
    // Quick Position and EBITDA/DCF run on the client's real accounts. The badge must
    // not render at all — an empty pill would still look like a marker on the page.
    const wrapper = mount({ client: 'Sample Trading Ltd' })
    expect(wrapper.find('.rs-badge').exists()).toBe(false)
  })

  it('omits the eyebrow and client line when they are not supplied', () => {
    const wrapper = mount()
    expect(wrapper.find('.rs-eyebrow').exists()).toBe(false)
    expect(wrapper.find('.rs-client').exists()).toBe(false)
  })

  describe('saving per client (business-entity-reports §5, item 4.62)', () => {
    const ADVISOR_ROW = { inputs: { a: 1 }, savedBy: { tier: 'advisor', name: 'Pat' }, savedAt: '2026-09-03T10:00:00.000Z', advisorVersion: null }
    const CLIENT_ROW = { inputs: { a: 2 }, savedBy: { tier: 'business_entity', name: 'Big Bird Bakery' }, savedAt: '2026-09-05T09:00:00.000Z', advisorVersion: ADVISOR_ROW }
    const base = { mode: 'advisor', clientId: 'c-1', clientName: 'BB', report: null, clientChanges: [], busy: false, error: '', notice: '' }

    it('shows nothing of it when the screen does not save', () => {
      const wrapper = mount()
      expect(wrapper.find('.rs-save').exists()).toBe(false)
      expect(wrapper.find('.rs-edited').exists()).toBe(false)
    })

    it('the advisor gets a Save only once a client is chosen, and it asks the screen to save', async () => {
      const none = mount({ saved: Object.assign({}, base, { clientId: '' }) })
      expect(none.find('.rs-save').exists()).toBe(false)
      const wrapper = mount({ saved: base })
      await wrapper.find('.rs-savebtn').trigger('click')
      expect(wrapper.emitted('save')).toHaveLength(1)
      expect(wrapper.find('.rs-saved').text()).toBe('clientReports.saved.notSaved')
    })

    it('a client edit is announced with who, when and how many — and Restore asks the screen to restore', async () => {
      const wrapper = mount({ saved: Object.assign({}, base, { report: CLIENT_ROW, clientChanges: ['a'] }) })
      const banner = wrapper.find('.rs-edited')
      expect(banner.exists()).toBe(true)
      // The $t stub echoes the key with its params, so the who and the when are checkable.
      expect(banner.text()).toContain('clientReports.saved.editedBy')
      expect(banner.text()).toContain('"name":"Big Bird Bakery"')
      expect(banner.text()).toContain('"date":"2026-09-05"')
      await wrapper.find('.rs-restore').trigger('click')
      expect(wrapper.emitted('restore')).toHaveLength(1)
    })

    it('no banner, and no Restore, on the advisor\'s own version or for the client\'s own sign-in', () => {
      expect(mount({ saved: Object.assign({}, base, { report: ADVISOR_ROW }) }).find('.rs-edited').exists()).toBe(false)
      const client = mount({ saved: Object.assign({}, base, { mode: 'client', clientId: '', report: CLIENT_ROW, clientChanges: ['a'] }) })
      expect(client.find('.rs-edited').exists()).toBe(false)
      expect(client.find('.rs-restore').exists()).toBe(false)
      expect(client.find('.rs-savebtn').exists()).toBe(true)
    })
  })

  it('requires a title and a back label', () => {
    // Every report must say what it is and offer a way out; neither may default to ''.
    expect(ReportHeader.props.title.required).toBe(true)
    expect(ReportHeader.props.backLabel.required).toBe(true)
    expect(ReportHeader.props.badge.required).toBeUndefined()
    expect(ReportHeader.props.badge.default).toBe('')
  })
})
