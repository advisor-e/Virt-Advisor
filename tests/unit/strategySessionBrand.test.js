/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * THE ADVISOR FIRM'S BRAND REACHES THE SESSION SCREENS, not only the printed plan.
 *
 * 🔴 WHY THIS EARNS ITS PLACE, AND IT IS THE ONE CASE WHERE UAT IS BLIND. An
 * unbranded drawing prints the literal words "Firm logo" against a disc with no
 * initial in it — which is EXACTLY what a correctly wired screen shows in UAT and
 * in development, because `firmBrand()` returns nulls until the master team names
 * the logo and colour columns (seam Q-FIRM-BRAND). A tester therefore cannot tell
 * "falling back properly" from "never wired at all". Both look identical.
 *
 * That is not hypothetical. On 2026-09-22 the plan document was wired and the three
 * SESSION screens were not, and it survived a full session of review: a client would
 * have met the placeholder in the meeting and the real brand on the document
 * afterwards. Mike found it by asking, and it was proved by reading the code.
 *
 * Mike's rule, 2026-09-18: "in client dealings, Advisor-e ALWAYS clones and shows
 * that ADVISORS firm logo - never advisor-e." Item 16.
 *
 * Not asserted: what a drawing LOOKS like, any wording, or any colour value as a
 * style. Only that the three values travel from the page to the component that
 * draws — which is the half no person can see.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyCaptureCard = require('~/components/strategy/StrategyCaptureCard.vue').default
const StrategyTeachingSlide = require('~/components/strategy/StrategyTeachingSlide.vue').default
const StrategyConceptCapture = require('~/components/strategy/StrategyConceptCapture.vue').default
const StrategyConceptGraphic = require('~/components/strategy/StrategyConceptGraphic.vue').default

/** A real firm's brand, as `GET /api/report/firm/brand` serves one. */
const BRAND = {
  firmName: 'Ashgrove Advisory',
  firmColour: '#7a4b8f',
  firmLogo: 'https://cdn.example.com/ashgrove.png'
}

/** A framework that is TAUGHT before it is captured, so the teaching slide renders. */
const TEACHABLE = {
  id: 'the-8-profit-levers',
  conceptId: 'the-8-profit-levers',
  name: 'The 8 Profit Levers',
  shape: 'buckets',
  captureInstruction: 'Identify one task per lever.',
  conceptSummary: 'The accumulative effect of incremental changes.',
  helpsClientTo: 'See where profit actually comes from.',
  fields: [{ key: 'f1', label: 'Lever 1', row: 1, column: 'c1' }]
}

describe('the firm brand reaches every screen that draws a concept', () => {
  test('the capture card hands all three values to the teaching slide', () => {
    const wrapper = mountWithBuefy(StrategyCaptureCard, {
      propsData: Object.assign({ framework: TEACHABLE, teachable: true }, BRAND)
    })

    const slide = wrapper.findComponent(StrategyTeachingSlide)
    expect(slide.exists()).toBe(true)
    expect(slide.props('firmName')).toBe(BRAND.firmName)
    expect(slide.props('firmColour')).toBe(BRAND.firmColour)
    expect(slide.props('firmLogo')).toBe(BRAND.firmLogo)
  })

  test('the teaching slide hands all three on to the drawing', () => {
    const wrapper = mountWithBuefy(StrategyTeachingSlide, {
      propsData: Object.assign({
        name: TEACHABLE.name,
        conceptId: TEACHABLE.conceptId,
        shape: TEACHABLE.shape,
        fields: TEACHABLE.fields
      }, BRAND)
    })

    const drawing = wrapper.findComponent(StrategyConceptGraphic)
    expect(drawing.exists()).toBe(true)
    expect(drawing.props('firmName')).toBe(BRAND.firmName)
    expect(drawing.props('firmColour')).toBe(BRAND.firmColour)
    expect(drawing.props('firmLogo')).toBe(BRAND.firmLogo)
  })

  test('the concept capture hands all three on to the drawing', () => {
    const wrapper = mountWithBuefy(StrategyConceptCapture, {
      propsData: Object.assign({
        name: TEACHABLE.name,
        conceptId: TEACHABLE.conceptId,
        conceptSummary: TEACHABLE.conceptSummary,
        helpsClientTo: TEACHABLE.helpsClientTo,
        // A concept admitted on its drawing alone — no workbook table behind it.
        capture: { supplied: false, rows: [] }
      }, BRAND)
    })

    const drawing = wrapper.findComponent(StrategyConceptGraphic)
    expect(drawing.exists()).toBe(true)
    expect(drawing.props('firmName')).toBe(BRAND.firmName)
    expect(drawing.props('firmColour')).toBe(BRAND.firmColour)
    expect(drawing.props('firmLogo')).toBe(BRAND.firmLogo)
  })

  // 🔴 THE CALL SITES, READ FROM THE PAGE'S OWN SOURCE. Mounting the whole planner
  // to reach the Run and Objectives stages needs a session, a client and four routes;
  // the fault was never in the machinery but in three tags that omitted an attribute,
  // and this is what sees that directly. A new tag rendering a concept without the
  // three props is the defect, whatever else is mounted around it.
  describe('every call site on the planner page passes the three props', () => {
    const { readFileSync } = require('fs')
    const { resolve } = require('path')
    const PAGE = resolve(__dirname, '..', '..', 'pages', 'strategy-planner.vue')
    const source = readFileSync(PAGE, 'utf8')
    const template = source.slice(0, source.indexOf('</template>'))

    /** Components whose rendered output reaches one of the 33 approved drawings. */
    const DRAWS = ['strategy-capture-card', 'strategy-concept-capture', 'strategy-plan-document']

    DRAWS.forEach((tag) => {
      test(tag + ' is never rendered without the firm brand', () => {
        // Each tag opens a Pug call and runs to its closing paren at the same indent.
        const rx = new RegExp('^(\\s*)' + tag + '\\($([\\s\\S]*?)^\\1\\)$', 'gm')
        const calls = []
        let m
        while ((m = rx.exec(template)) !== null) { calls.push(m[2]) }

        expect(calls.length).toBeGreaterThan(0)

        const bare = calls
          .map((body, i) => ({ body, i }))
          .filter(({ body }) => !(
            /:firm-name=/.test(body) && /:firm-colour=/.test(body) && /:firm-logo=/.test(body)
          ))
          .map(({ i }) => tag + ' call ' + (i + 1) + ' omits one of :firm-name, :firm-colour, :firm-logo')

        expect(bare.length ? bare.join('\n') : 'every call carries the brand')
          .toBe('every call carries the brand')
      })
    })
  })
})
