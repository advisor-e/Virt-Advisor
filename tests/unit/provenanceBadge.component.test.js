/**
 * @jest-environment jsdom
 */
'use strict'

const { shallowWithBuefy } = require('../helpers/mountComponent')
const ProvenanceBadge = require('~/components/base/ProvenanceBadge.vue').default

/**
 * The badge's own contract. The four screens that use it are covered by their own
 * tests; these cover the component in isolation — in particular that it cannot be
 * asked to render a state that does not exist, since an unrecognised `source` silently
 * falling through to "entered" would understate a figure's provenance rather than
 * failing loudly.
 */

function mount (props) {
  return shallowWithBuefy(ProvenanceBadge, {
    propsData: Object.assign({ fileLabel: 'FROM FILE', enteredLabel: 'ENTERED' }, props)
  })
}

describe('ProvenanceBadge', () => {
  it('shows the file label and the file colour for a file figure', () => {
    const wrapper = mount({ source: 'file' })
    expect(wrapper.text()).toBe('FROM FILE')
    expect(wrapper.classes()).toContain('src-file')
    expect(wrapper.classes()).not.toContain('src-hand')
  })

  it('shows the entered label and the hand colour for a typed figure', () => {
    const wrapper = mount({ source: 'entered' })
    expect(wrapper.text()).toBe('ENTERED')
    expect(wrapper.classes()).toContain('src-hand')
  })

  it('rejects any source other than file or entered', () => {
    // The validator is the guard: a typo'd source must be a loud dev warning, not a
    // badge that quietly claims the advisor typed a figure the export supplied.
    const validator = ProvenanceBadge.props.source.validator
    expect(validator('file')).toBe(true)
    expect(validator('entered')).toBe(true)
    expect(validator('File')).toBe(false)
    expect(validator('')).toBe(false)
    expect(validator('unknown')).toBe(false)
  })

  it('a client edit has its own colour and never borrows the entered wording', () => {
    // business-entity-reports D4: a figure the client changed must not pass as the
    // advisor's. With no client label the badge is blank rather than saying "entered".
    const withLabel = mount({ source: 'client', clientLabel: 'client' })
    expect(withLabel.text()).toBe('client')
    expect(withLabel.classes()).toContain('src-client')
    expect(withLabel.classes()).not.toContain('src-hand')
    expect(mount({ source: 'client' }).text()).toBe('')
  })

  it('defaults to the intake size, and takes the smaller report size on request', () => {
    expect(mount({ source: 'file' }).classes()).toContain('is-md')
    expect(mount({ source: 'file', size: 'sm' }).classes()).toContain('is-sm')
  })

  it('only adds the left gap when asked', () => {
    expect(mount({ source: 'file' }).classes()).not.toContain('is-spaced')
    expect(mount({ source: 'file', spaced: true }).classes()).toContain('is-spaced')
  })

  it('reacts to a figure changing provenance', async () => {
    // The live case: the advisor edits a file-seeded figure, or drags the fixed-costs
    // slider — the badge must follow, not hold its first value.
    const wrapper = mount({ source: 'file' })
    expect(wrapper.text()).toBe('FROM FILE')

    await wrapper.setProps({ source: 'entered' })

    expect(wrapper.text()).toBe('ENTERED')
    expect(wrapper.classes()).toContain('src-hand')
  })
})
