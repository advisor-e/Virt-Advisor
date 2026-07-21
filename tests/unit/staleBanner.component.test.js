/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const StaleBanner = require('~/components/base/StaleBanner.vue').default

/**
 * The banner's own contract.
 *
 * This component exists because of a real defect: on 2026-07-22 the Eight Levers copy
 * of this banner was found rendering the literal word "true" at the advisor — the
 * Phase 1b mixin conversion swapped that screen's error *string* for a boolean flag and
 * its binding was never updated, while the other two copies were fine. The tests below
 * pin the contract that made that possible: the banner renders what it is GIVEN, and
 * the caller is responsible for handing it a resolved message.
 */

function mount (props) {
  return mountWithBuefy(StaleBanner, {
    propsData: Object.assign({
      title: 'These figures are out of date',
      message: 'We could not reach the calculation service.',
      retryLabel: 'Try again'
    }, props)
  })
}

describe('StaleBanner', () => {
  it('renders the title, message and retry label it is given', () => {
    const wrapper = mount()
    expect(wrapper.find('.stalehead').text()).toBe('These figures are out of date')
    expect(wrapper.find('.stalebody').text()).toBe('We could not reach the calculation service.')
    expect(wrapper.find('button').text()).toBe('Try again')
  })

  it('emits retry when the button is clicked, with no payload', async () => {
    // The parent decides what recomputing means for its own screen.
    const wrapper = mount()
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.emitted('retry')[0]).toEqual([])
  })

  it('requires a message rather than defaulting to something — the "true" defect guard', () => {
    // A required String prop is what stops a caller handing over the mixin's boolean
    // `error` flag and getting a plausible-looking banner that explains nothing.
    expect(StaleBanner.props.message.required).toBe(true)
    expect(StaleBanner.props.message.type).toBe(String)
    expect(StaleBanner.props.title.required).toBe(true)
    expect(StaleBanner.props.retryLabel.required).toBe(true)
  })

  it('updates when the message changes', async () => {
    const wrapper = mount()
    await wrapper.setProps({ message: 'Still unreachable.' })
    expect(wrapper.find('.stalebody').text()).toBe('Still unreachable.')
  })
})
