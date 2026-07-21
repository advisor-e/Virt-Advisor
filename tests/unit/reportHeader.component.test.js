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

  it('requires a title and a back label', () => {
    // Every report must say what it is and offer a way out; neither may default to ''.
    expect(ReportHeader.props.title.required).toBe(true)
    expect(ReportHeader.props.backLabel.required).toBe(true)
    expect(ReportHeader.props.badge.required).toBeUndefined()
    expect(ReportHeader.props.badge.default).toBe('')
  })
})
