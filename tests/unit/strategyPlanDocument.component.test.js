/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The document a client is handed — item 15.1, and the ruling of 2026-09-20.
 *
 * 🔴 WHY THESE EARN THEIR PLACE. Everything asserted here is a page that either
 * prints or does not print in a document that leaves the firm. A tester in UAT
 * sees the pages that ARE there; nobody can see a page that should not have been
 * printed until a client reads a sentence about their own session that is not
 * true. That is the same failure as the scope screen of 2026-09-20, which told
 * advisors their work would be lost.
 *
 * Mike's ruling admitted a new kind of concept: one with an approved drawing and
 * no fill-in table at all. It teaches and there is nothing to work, so the
 * document must print its teaching page and NOT a capture page reading "not
 * worked through yet", and must not announce Action points that never arrive.
 *
 * Not asserted: wording, styling, or the order of anything on a page.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyPlanDocument = require('~/components/strategy/StrategyPlanDocument.vue').default

/** A concept with a real fill-in table behind it. */
const WITH_TABLE = {
  key: 'fw-profit-levers',
  conceptId: 'the-8-profit-levers',
  hasTable: true,
  name: 'The 8 Profit Levers',
  summary: 'This concept explains the accumulative effect of incremental changes.',
  instruction: 'Identify one task per lever.',
  prompts: [{ key: 'p1', label: 'Number of Foot-traffic', prompt: 'Gain their attention.' }],
  lines: [{ key: 'the-8-profit-levers::f1', label: 'Lever 1', value: '' }]
}

/** A concept admitted on its drawing alone — no workbook anywhere. */
const DRAWING_ONLY = {
  key: 'vertical-integration#1',
  conceptId: 'vertical-integration',
  hasTable: false,
  name: 'Vertical Integration',
  summary: 'This concept explores the supply and distribution chain.',
  instruction: '',
  prompts: [],
  lines: []
}

function mountPlan (items) {
  return mountWithBuefy(StrategyPlanDocument, {
    propsData: {
      clientName: 'Harbour Joinery Limited',
      steps: [{ name: 'Where we are', items, teaches: true, works: items.some(i => i.hasTable !== false) }]
    }
  })
}

describe('a concept with nothing to fill in still teaches', () => {
  test('its teaching page prints', () => {
    const wrapper = mountPlan([DRAWING_ONLY])

    expect(wrapper.findAll('.is-teach').length).toBe(1)
  })

  test('no capture page is printed for it', () => {
    const wrapper = mountPlan([DRAWING_ONLY])

    // A capture page here would tell the client their session was "not worked
    // through yet" when there was never anything to work through.
    expect(wrapper.findAll('.is-capture').length).toBe(0)
  })

  test('a step of nothing but these does not announce Action points', () => {
    const wrapper = mountPlan([DRAWING_ONLY])

    // One divider to open the step, never a second announcing pages that never come.
    expect(wrapper.findAll('.is-divider').length).toBe(1)
  })
})

describe('a concept with a table is unchanged by the ruling', () => {
  test('it prints both a teaching page and a capture page', () => {
    const wrapper = mountPlan([WITH_TABLE])

    expect(wrapper.findAll('.is-teach').length).toBe(1)
    expect(wrapper.findAll('.is-capture').length).toBe(1)
  })

  test('a step holding both kinds still announces Action points', () => {
    const wrapper = mountPlan([DRAWING_ONLY, WITH_TABLE])

    expect(wrapper.findAll('.is-divider').length).toBe(2)
    expect(wrapper.findAll('.is-capture').length).toBe(1)
  })
})

describe('the drawing reaches the client, not only the advisor', () => {
  test('a teaching page carries the concept\'s approved drawing', () => {
    const wrapper = mountPlan([WITH_TABLE])

    expect(wrapper.find('.is-teach svg').exists()).toBe(true)
  })

  test('the firm on it is the firm passed in', () => {
    const wrapper = mountWithBuefy(StrategyPlanDocument, {
      propsData: {
        clientName: 'Harbour Joinery Limited',
        firmName: 'Ashgrove Advisory',
        firmColour: '#7a4b8f',
        steps: [{ name: 'Where we are', items: [WITH_TABLE], teaches: true, works: true }]
      }
    })
    const html = wrapper.html()

    expect(html).toContain('Ashgrove Advisory')
    expect(html).not.toContain('Hartley')
  })
})

describe('a step with nothing in it survives', () => {
  test('it still prints its divider, because it is on the agenda', () => {
    const wrapper = mountWithBuefy(StrategyPlanDocument, {
      propsData: {
        clientName: 'Harbour Joinery Limited',
        steps: [{ name: 'Do it and review it', items: [], teaches: false, works: false }]
      }
    })

    // Pivot's step 5 has no slides and is still a step. Deleting it here would
    // quietly remove the page the step builder exists to make possible.
    expect(wrapper.findAll('.is-divider').length).toBe(1)
  })
})

/**
 * 🔴 DECISION E, RULED BY MIKE 2026-09-21: *"the client's plan carries the drawn chart,
 * with the list of roles beneath it."* Approved artefact:
 * `design/mockups/strategy-capture-parent-child-list.html`.
 *
 * The condition attached to that ruling is the reason two of these exist: at seven levels
 * his own example is 1628px wide, so the plan page has to SCALE the chart rather than crop
 * it. A cropped chart loses roles off the right-hand edge of a printed page and nothing on
 * screen says so.
 */
describe('the Org Chart prints as a chart, with the list beneath it', () => {
  const ORG_CHART = {
    key: 'design-the-organisational-hierarchy-chart',
    conceptId: 'design-the-organisational-hierarchy-chart',
    hasTable: true,
    name: 'Design the Organisational Hierarchy Chart',
    summary: 'Who reports to who?',
    instruction: '',
    prompts: [],
    orgChartHead: 'Reporting Head',
    orgChart: [
      { id: 1, name: 'Board', reportsTo: 'Shareholders' },
      { id: 2, name: 'CEO', reportsTo: 'Board' },
      { id: 3, name: 'CFO', reportsTo: 'CEO' }
    ],
    lines: [
      { key: 'x::orgrole-1', label: 'Board', value: 'Shareholders' },
      { key: 'x::orgrole-2', label: 'CEO', value: 'Board' },
      { key: 'x::orgrole-3', label: 'CFO', value: 'CEO' }
    ]
  }

  test('the chart is drawn, and the list is under it', () => {
    const wrapper = mountPlan([ORG_CHART])

    expect(wrapper.find('.is-capture svg').exists()).toBe(true)
    // Three roles, and the outside parent above them.
    expect(wrapper.findAll('.is-capture svg rect').length).toBe(4)
    expect(wrapper.findAll('.spd-org tbody tr').length).toBe(3)
  })

  test('it is scaled to the page, never cropped', () => {
    const wrapper = mountPlan([ORG_CHART])
    const svg = wrapper.find('.is-capture svg')

    // The condition Mike's ruling carried. A fixed pixel width here would run off the page.
    expect(svg.attributes('width')).toBe('100%')
    expect(svg.attributes('viewBox')).toBeTruthy()
  })

  test('the heading over the list is Mike\'s own word, carried with the data', () => {
    const wrapper = mountPlan([ORG_CHART])

    // "Reporting Head" is read off Org Chart.xlsx. It is load-bearing: it is the only
    // column name on this screen that is his, and the one beside it is ours by his ruling.
    expect(wrapper.find('.spd-org').text()).toContain('Reporting Head')
  })

  test('a chart of one role does not print "not worked through yet"', () => {
    // 🔴 THE TOPMOST ROLE REPORTS TO NOBODY, so a chart of one has no line with a value in
    // it. Read the old way the client would have been told their session was not worked
    // through, with their own chart printed directly above the sentence.
    const wrapper = mountPlan([Object.assign({}, ORG_CHART, {
      orgChart: [{ id: 1, name: 'Owner', reportsTo: '' }],
      lines: [{ key: 'x::orgrole-1', label: 'Owner', value: '' }]
    })])

    expect(wrapper.find('.spd-untouched').exists()).toBe(false)
    expect(wrapper.findAll('.spd-org tbody tr').length).toBe(1)
  })

  test('a concept nobody touched still says so', () => {
    const wrapper = mountPlan([Object.assign({}, ORG_CHART, { orgChart: [], lines: [] })])

    expect(wrapper.find('.spd-untouched').exists()).toBe(true)
    expect(wrapper.find('.spd-org').exists()).toBe(false)
  })
})

describe('the advisor\'s selection blurb stays off the client\'s plan', () => {
  // 🔴 `conceptSummary` is the CONCEPT SUMMARY column of the scope menu — what an
  // advisor reads to decide whether to tick a concept. It was printed under every
  // teaching page, so a client's own plan carried "This checklist guides you through
  // a review of how your packaging supports your 'big promise'…" beneath Mike's own
  // page, which had already said it properly. He found it by reading the PDF,
  // 2026-09-22. It is not in the approved drawing either.
  //
  // Kept where there is no drawing, because for those 11 concepts it is the only
  // content on the page and the document refuses to print a title-only one.

  test('a concept WITH one of his drawings prints no summary line', () => {
    // vertical-integration is a registered drawing, so his page says it all.
    const wrapper = mountPlan([DRAWING_ONLY])

    expect(wrapper.findAll('.spd-lead').length).toBe(0)
  })

  test('a concept with NO drawing keeps it, or the client loses the page', () => {
    const wrapper = mountPlan([{ ...DRAWING_ONLY, conceptId: 'not-a-drawn-concept' }])

    expect(wrapper.findAll('.spd-lead').length).toBe(1)
    expect(wrapper.findAll('.is-teach').length).toBe(1)
  })
})
