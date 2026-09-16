/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Strategy Planner's two screens — item 15.1.
 *
 * Design: design/mockups/strategy-planner.html, eleven decisions ruled by Mike 2026-09-16.
 *
 * 🔴 WHAT THESE TESTS GUARD, and none of it is wording or styling:
 *
 *   1. ONE RENDERER CARRIES THREE SHAPES (Decision 3). If a shape ever needs its own
 *      component, the ruling has been broken and 45 frameworks become 45 screens. These
 *      tests mount the SAME component three times and check each shape comes out right.
 *   2. `field-opened` FIRES ON FOCUS (Decision 11). That event is the navigation timeline,
 *      which is how a recording's words reach the right box without a model deciding.
 *      A refactor that drops it leaves AI judgement as the only route — and nothing on
 *      screen would look any different, which is exactly why a test has to hold it.
 *   3. NOTHING IS PRE-TICKED (Decision 1). A future "helpful" default would quietly take
 *      the scoping conversation away from the advisor, and a tester would never know the
 *      ticks were not their own.
 *   4. A DOMAIN WITH NO FRAMEWORKS STAYS VISIBLE. Hiding it would make a half-built
 *      session look complete.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyCaptureCard = require('~/components/strategy/StrategyCaptureCard.vue').default
const StrategySessionScope = require('~/components/strategy/StrategySessionScope.vue').default
const frameworksModule = require('~/server/utils/strategyFrameworks')

// The real authored frameworks, so the tests move when the data does.
const SWOT = frameworksModule.getFramework('swot-pest')
const PORTERS = frameworksModule.getFramework('porters-five-forces')
const LEVERS = frameworksModule.getFramework('profit-levers')
const DOMAINS = frameworksModule.listPlanningDomains()
const ALL = frameworksModule.listFrameworks()

function mountCard (framework, entries) {
  return mountWithBuefy(StrategyCaptureCard, {
    propsData: { framework, entries: entries || {} }
  })
}

/**
 * Focus a textarea the way a browser does.
 *
 * ⚠ `wrapper.trigger('focus')` DOES NOT WORK HERE and looks exactly like a broken
 * component when it fails. vue-test-utils dispatches a plain `Event`, which jsdom does not
 * deliver to a focus listener; a real `FocusEvent` is delivered, and so is a genuine
 * `.focus()` in a browser. Checked against Buefy's own source before changing anything —
 * its textarea binds `focus: onFocus` and re-emits correctly.
 *
 * @param {object} wrapper a textarea wrapper
 * @param {object} vm the component, so the caller can await a tick
 * @returns {Promise<void>}
 */
function focusBox (wrapper, vm) {
  wrapper.element.dispatchEvent(new window.FocusEvent('focus'))
  return vm.$nextTick()
}

describe('one renderer, three shapes — Decision 3', () => {
  it('draws the 8 Profit Levers as eight buckets', () => {
    const w = mountCard(LEVERS)
    expect(w.findAll('.scc-box')).toHaveLength(8)
    expect(w.find('.scc-capture').classes()).toContain('is-buckets')
  })

  it('draws SWOT as four quadrants', () => {
    const w = mountCard(SWOT)
    expect(w.findAll('.scc-box')).toHaveLength(4)
    expect(w.find('.scc-capture').classes()).toContain('is-quadrants')
  })

  it('draws Porter\'s as forces, with the centre marked', () => {
    const w = mountCard(PORTERS)
    expect(w.find('.scc-capture').classes()).toContain('is-forces')
    expect(w.findAll('.scc-box.is-centre')).toHaveLength(1)
  })

  it('is the SAME component in all three cases', () => {
    // The whole of Decision 3 in one assertion: if this ever needs three components,
    // 45 frameworks become 45 screens and the build never ends.
    ;[LEVERS, SWOT, PORTERS].forEach((f) => {
      expect(mountCard(f).vm.$options.name).toBe('StrategyCaptureCard')
    })
  })

  it('shows the authored prompt under each box, which is what facilitates the conversation', () => {
    // Without the prompts a framework is an empty grid. They are the deck's own words and
    // were invisible in both directions until now.
    const w = mountCard(PORTERS)
    expect(w.findAll('.scc-box-prompt').length).toBe(PORTERS.fields.length)
  })

  it('marks a box that already holds something, so an advisor sees what is done', () => {
    const w = mountCard(SWOT, { strengths: 'Own kiln' })
    expect(w.findAll('.scc-box.is-filled')).toHaveLength(1)
  })
})

describe('the navigation timeline — Decision 11', () => {
  it('🔴 emits field-opened when the advisor focuses a box', async () => {
    const w = mountCard(SWOT)
    await focusBox(w.findAll('textarea').at(0), w.vm)

    const events = w.emitted('field-opened')
    expect(events).toBeTruthy()
    expect(events[0][0]).toEqual({ frameworkId: 'swot-pest', fieldKey: 'strengths' })
  })

  it('names the box actually focused, not the first one', async () => {
    const w = mountCard(SWOT)
    await focusBox(w.findAll('textarea').at(2), w.vm)

    expect(w.emitted('field-opened')[0][0].fieldKey).toBe('opportunities')
  })
})

describe('saving happens on blur, and only when something changed', () => {
  it('emits field-changed with what was typed', async () => {
    const w = mountCard(SWOT)
    const box = w.findAll('textarea').at(0)
    box.element.value = 'Own kiln — no drying lead time'
    await box.trigger('blur')

    expect(w.emitted('field-changed')[0][0]).toEqual({
      frameworkId: 'swot-pest',
      fieldKey: 'strengths',
      value: 'Own kiln — no drying lead time'
    })
  })

  it('stays silent when the advisor passes through without typing', async () => {
    // An advisor moves through a card while talking. A save per visit would put an
    // unchanged value on the wire repeatedly, and every one is a client's words.
    const w = mountCard(SWOT, { strengths: 'Already there' })
    const box = w.findAll('textarea').at(0)
    box.element.value = 'Already there'
    await box.trigger('blur')

    expect(w.emitted('field-changed')).toBeFalsy()
  })
})

describe('screen 1 — scoping the session', () => {
  function mountScope (chosen) {
    return mountWithBuefy(StrategySessionScope, {
      propsData: { planningDomains: DOMAINS, frameworks: ALL, chosen: chosen || [] }
    })
  }

  it('shows all four Planning Domains', () => {
    expect(mountScope().findAll('.sss-domain')).toHaveLength(4)
  })

  it('🔴 keeps a domain with no frameworks on screen rather than hiding it', () => {
    // Organisational Review and Sales & Marketing Review are authored elsewhere and have
    // not reached the Planner. Hiding them makes half a session look like a whole one.
    const empty = mountScope().findAll('.sss-domain.is-empty')
    expect(empty.length).toBe(2)
  })

  it('🔴 ticks nothing by itself — Decision 1', () => {
    const w = mountScope()
    expect(w.props('chosen')).toEqual([])
    expect(w.findAll('input[type="checkbox"]:checked')).toHaveLength(0)
  })

  it('shows no Session Scope table until a domain is opened', () => {
    expect(mountScope().find('.sss-table').exists()).toBe(false)
  })

  it('opens a domain\'s Session Scope table when it is clicked', async () => {
    const w = mountScope()
    // Strategic Orientation is the second card and holds all three frameworks.
    await w.findAll('.sss-domain').at(1).trigger('click')

    expect(w.find('.sss-table').exists()).toBe(true)
    expect(w.findAll('tbody tr')).toHaveLength(3)
  })

  it('emits the WHOLE chosen list when one framework is ticked', async () => {
    // The parent holds one source of truth; this component stays presentational.
    const w = mountScope(['swot-pest'])
    await w.findAll('.sss-domain').at(1).trigger('click')
    await w.findAll('input[type="checkbox"]').at(0).setChecked(true)

    const emitted = w.emitted('scope-changed')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toContain('swot-pest')
  })

  it('closes the table when the open domain is clicked again', async () => {
    const w = mountScope()
    await w.findAll('.sss-domain').at(1).trigger('click')
    await w.findAll('.sss-domain').at(1).trigger('click')

    expect(w.find('.sss-table').exists()).toBe(false)
  })
})
