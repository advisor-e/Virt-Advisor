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
const StrategyConceptCapture = require('~/components/strategy/StrategyConceptCapture.vue').default
const StrategyScopeMenu = require('~/components/strategy/StrategyScopeMenu.vue').default
const frameworksModule = require('~/server/utils/strategyFrameworks')

// The real authored frameworks, so the tests move when the data does.
const SWOT = frameworksModule.getFramework('swot-pest')
const PORTERS = frameworksModule.getFramework('porters-five-forces')
const LEVERS = frameworksModule.getFramework('profit-levers')
const DECKS = frameworksModule.listDecks()

/**
 * Pivot's eleven concepts — the acceptance test, and the reason the menu is one list.
 * Nine are in Strategic Orientation 2 and two in Sales & Marketing.
 */
const PIVOT_CONCEPTS = [
  'porters-5-forces',
  'progression-of-economic-value',
  'vertical-integration',
  'horizontal-integration',
  'market-diffusion-theory',
  'product-life-cycle',
  'technology-points',
  'sigmoid-curve',
  'the-8-profit-levers',
  '6-marketing-questions',
  'a-i-d-c-r-a-advertisement-framework'
]

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

// 🔴 MIKE'S RULING, 2026-09-21, asked as its own question: his worked Farm Wagon column
// arrives in the boxes for the advisor to type over, and is SCREEN-ONLY until they do.
// An untouched column prints blank on the client's plan rather than printing his example,
// because the alternative hands Farmer Joe and his farm wagon to a real client as though
// they were that client's own customer.
//
// UAT cannot catch this: the advisor's screen looks identical either way, and the fault
// only appears in a document the client takes away. The obvious "improvement" — seeding
// the prefilled values into the session on load, so the screen and the plan agree — is
// exactly what must not happen, which is why this is pinned rather than left to a comment.
describe('a prefilled example is shown, and is not the client\'s answer', () => {
  const CAPTURE = {
    supplied: true,
    template: 'Customer Types',
    form: 'attribute-rows-entity-columns',
    fields: [
      {
        key: 't0r2c2',
        row: 2,
        column: 2,
        columnLabel: 'Farm Wagon',
        rowLabel: 'Customer Profile Name',
        example: '',
        prefilled: 'Farmer Joe'
      },
      {
        key: 't0r2c3',
        row: 2,
        column: 3,
        columnLabel: 'Other 1',
        rowLabel: 'Customer Profile Name',
        example: '',
        prefilled: ''
      }
    ]
  }

  const mountCapture = entries => mountWithBuefy(StrategyConceptCapture, {
    propsData: { name: 'Customer (Persona) Type Table', capture: CAPTURE, entries: entries || {} }
  })

  it('shows his answer in the box', () => {
    const w = mountCapture()
    expect(w.vm.valueOf(CAPTURE.fields[0])).toBe('Farmer Joe')
  })

  it('🔴 saves nothing on its own — an untouched column reaches the plan as blank', () => {
    const w = mountCapture()
    expect(w.emitted('field-changed')).toBeFalsy()
  })

  it('what the advisor types wins, and clearing a prefilled box stays cleared', () => {
    expect(mountCapture({ t0r2c2: 'Builder Bev' }).vm.valueOf(CAPTURE.fields[0])).toBe('Builder Bev')
    expect(mountCapture({ t0r2c2: '' }).vm.valueOf(CAPTURE.fields[0])).toBe('')
  })
})

describe('the session scope menu — item 15.1 Stage 1', () => {
  function mountMenu (chosen) {
    return mountWithBuefy(StrategyScopeMenu, {
      propsData: { decks: DECKS, chosen: chosen || [] }
    })
  }

  it('draws one panel per document, in Mike\'s order', () => {
    // Five documents, four Planning Domains: Strategic Orientation is one domain in two
    // decks. Sorting them would move the two agenda-only decks out of the front, which
    // the drawing puts there deliberately.
    const w = mountMenu()
    expect(w.findAll('.ssm-deck')).toHaveLength(5)
    expect(w.findAll('.ssm-deckname').wrappers.map(x => x.text()))
      .toEqual(DECKS.map(d => d.name))
  })

  it('🔴 offers every one of the 52 concepts, not a subset', () => {
    // The screen this replaced offered 5 of the 52, because it read a framework list
    // rather than Mike's concept index.
    expect(mountMenu().findAll('tbody tr')).toHaveLength(52)
  })

  it('🔴 PRODUCES PIVOT — the acceptance test, across two decks', () => {
    // `Pivot.pdf` is a deck Mike assembled by hand: nine concepts from Strategic
    // Orientation 2 and two from Sales & Marketing. A menu that made an advisor open one
    // panel at a time could not produce it, which is what the superseded screen did.
    const w = mountMenu(PIVOT_CONCEPTS)

    expect(w.findAll('input[type="checkbox"]:checked')).toHaveLength(11)
    const decksTicked = DECKS
      .filter(d => d.concepts.some(c => PIVOT_CONCEPTS.includes(c.id)))
      .map(d => d.id)
    expect(decksTicked).toEqual(['strategic-orientation-2', 'sales-marketing'])
  })

  it('🔴 ticks nothing by itself', () => {
    // The AI pre-tick is Stage 6 and is not built. A default tick would take the scoping
    // conversation away from the advisor, and a tester could not tell it was not theirs.
    const w = mountMenu()
    expect(w.findAll('input[type="checkbox"]:checked')).toHaveLength(0)
  })

  it('emits the WHOLE chosen list when one concept is ticked', async () => {
    // The parent holds one source of truth; this component stays presentational.
    const w = mountMenu(['porters-5-forces'])
    await w.findAll('input[type="checkbox"]').at(1).setChecked(true)

    const emitted = w.emitted('scope-changed')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toContain('porters-5-forces')
    expect(emitted[0][0].length).toBe(2)
  })

  it('unticks without disturbing the rest of the list', async () => {
    const w = mountMenu(PIVOT_CONCEPTS)
    const first = w.findAll('input[type="checkbox"]:checked').at(0)
    await first.setChecked(false)

    expect(w.emitted('scope-changed')[0][0]).toHaveLength(10)
  })

  it('🔴 renders an agenda row name-only, with no empty description columns', () => {
    // Decision B: three of the five documents are agendas. Mike has not written their
    // Concept Summary or Helps Your Client To… lines and nothing else may, so the name
    // takes the three columns rather than leaving cells that read as missing data.
    const w = mountMenu()
    const agendaDeck = w.findAll('.ssm-deck').at(0)
    expect(agendaDeck.find('.ssm-nodesc').exists()).toBe(true)
    expect(agendaDeck.findAll('td[colspan="3"]').length).toBe(5)
  })

  it('🔴 marks the three rows whose text is one shared cell — Decision E', () => {
    // Editing one of these rewrites its neighbour. An editing screen that did not say so
    // would silently change a row nobody was looking at.
    const w = mountMenu()
    expect(w.findAll('.ssm-shared')).toHaveLength(3)
  })

  it('counts what is ticked, per panel and overall', () => {
    // The counts, not the sentence around them — `$t` is stubbed in these mounts, so
    // reading the rendered string would assert the stub's format rather than the maths.
    const w = mountMenu(PIVOT_CONCEPTS)
    expect(w.vm.totalConcepts).toBe(52)
    // Strategic Orientation 2 is the third panel and holds nine of Pivot's eleven; Sales
    // & Marketing is the fourth and holds the other two.
    expect(w.vm.chosenInDeck(DECKS[2])).toBe(9)
    expect(w.vm.chosenInDeck(DECKS[3])).toBe(2)
    expect(w.vm.chosenInDeck(DECKS[0])).toBe(0)
  })

  it('🔴 tells the advisor on screen what happens to what he ticks', () => {
    // The line itself is not asserted — its WORDING is not this test's business. What is
    // held here is that the screen says SOMETHING about what comes next, because without
    // it the menu reads as the whole feature.
    //
    // ⚠ It used to say "nothing typed is kept yet", written while stages 2 to 5 were
    // unbuilt and left standing after they shipped — so an advisor was told his work
    // would be lost when it would not. Corrected 2026-09-20. This test passed throughout,
    // correctly: a sentence going out of date is not something an assertion can catch,
    // and the wording is Mike's to rule on.
    expect(mountMenu().find('.ssm-stage').exists()).toBe(true)
  })

  it('🔴 PINS MIKE\'S OWN WORDS ON A ROW — Decision A', () => {
    // LOAD-BEARING STRING, and the only wording assertion here. Decision A: the menu is
    // his Session Scope table and its text is never rewritten, summarised or improved.
    // The failure has already happened once — the built `porters-five-forces` framework
    // carries a third-person rewrite of this very sentence, taken from ADV.0. A rewrite
    // reads perfectly well in UAT; only a comparison with the deck catches it.
    const w = mountMenu()
    expect(w.text()).toContain(
      'To look out for changes in the market and anticipate how everyone will react; ' +
      'so you can be ready to take advantage of the situation.'
    )
  })
})
