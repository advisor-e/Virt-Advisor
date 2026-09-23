/**
 * ⚠ GENERATED — DO NOT EDIT. `node scripts/build-concept-graphics.js`.
 *
 * Every concept that has an approved teaching drawing, and how to load it.
 * A concept absent from this map has no drawing yet, and the screens fall back
 * to Mike's words — which is what they did for all 52 before item 15.7.
 */

/**
 * 🔴 EVERY VALUE IS AN ARRAY — ONE ENTRY PER TEACHING SHEET, in the order the
 * artefact presents them. All but one concept has exactly one; Collaborative
 * Thinking has two, because his two pages will not fit one sheet at his own type
 * sizes (Mike, 2026-09-23). A caller that renders `list[0]` alone teaches half a
 * concept, so `conceptSheetCount` is how a screen asks how many there are.
 *
 * @type {Object<string, Array<function(): Promise<object>>>}
 */
export const CONCEPT_GRAPHICS = {
  'risk-reward-matrix': [
    () => import(
      /* webpackChunkName: 'concept-risk-reward-matrix' */
      '~/components/strategy/concepts/RiskRewardMatrix.vue'
    )
  ],
  'boston-model': [
    () => import(
      /* webpackChunkName: 'concept-boston-model' */
      '~/components/strategy/concepts/BostonModel.vue'
    )
  ],
  'the-8-profit-levers': [
    () => import(
      /* webpackChunkName: 'concept-the-8-profit-levers' */
      '~/components/strategy/concepts/The8ProfitLevers.vue'
    )
  ],
  'vertical-integration': [
    () => import(
      /* webpackChunkName: 'concept-vertical-integration' */
      '~/components/strategy/concepts/VerticalIntegration.vue'
    )
  ],
  'market-diffusion-theory': [
    () => import(
      /* webpackChunkName: 'concept-market-diffusion-theory' */
      '~/components/strategy/concepts/MarketDiffusionTheory.vue'
    )
  ],
  'product-life-cycle': [
    () => import(
      /* webpackChunkName: 'concept-product-life-cycle' */
      '~/components/strategy/concepts/ProductLifeCycle.vue'
    )
  ],
  'sigmoid-curve': [
    () => import(
      /* webpackChunkName: 'concept-sigmoid-curve' */
      '~/components/strategy/concepts/SigmoidCurve.vue'
    )
  ],
  'e-demings-volatility-theory': [
    () => import(
      /* webpackChunkName: 'concept-e-demings-volatility-theory' */
      '~/components/strategy/concepts/EDemingsVolatilityTheory.vue'
    )
  ],
  'progression-of-economic-value': [
    () => import(
      /* webpackChunkName: 'concept-progression-of-economic-value' */
      '~/components/strategy/concepts/ProgressionOfEconomicValue.vue'
    )
  ],
  'horizontal-integration': [
    () => import(
      /* webpackChunkName: 'concept-horizontal-integration' */
      '~/components/strategy/concepts/HorizontalIntegration.vue'
    )
  ],
  'blue-ocean-strategy': [
    () => import(
      /* webpackChunkName: 'concept-blue-ocean-strategy' */
      '~/components/strategy/concepts/BlueOceanStrategy.vue'
    )
  ],
  'revenue-streams': [
    () => import(
      /* webpackChunkName: 'concept-revenue-streams' */
      '~/components/strategy/concepts/RevenueStreams.vue'
    )
  ],
  'senges-circles-of-causality': [
    () => import(
      /* webpackChunkName: 'concept-senges-circles-of-causality' */
      '~/components/strategy/concepts/SengesCirclesOfCausality.vue'
    )
  ],
  '10-marketing-messages': [
    () => import(
      /* webpackChunkName: 'concept-10-marketing-messages' */
      '~/components/strategy/concepts/10MarketingMessages.vue'
    )
  ],
  'customer-persona-type-table': [
    () => import(
      /* webpackChunkName: 'concept-customer-persona-type-table' */
      '~/components/strategy/concepts/CustomerPersonaTypeTable.vue'
    )
  ],
  'a-i-d-c-r-a-advertisement-framework': [
    () => import(
      /* webpackChunkName: 'concept-a-i-d-c-r-a-advertisement-framework' */
      '~/components/strategy/concepts/AIDCRAAdvertisementFramework.vue'
    )
  ],
  pricing: [
    () => import(
      /* webpackChunkName: 'concept-pricing' */
      '~/components/strategy/concepts/Pricing.vue'
    )
  ],
  'sales-channel-options': [
    () => import(
      /* webpackChunkName: 'concept-sales-channel-options' */
      '~/components/strategy/concepts/SalesChannelOptions.vue'
    )
  ],
  'price-for-problem-solving': [
    () => import(
      /* webpackChunkName: 'concept-price-for-problem-solving' */
      '~/components/strategy/concepts/PriceForProblemSolving.vue'
    )
  ],
  'price-for-delivery-medium': [
    () => import(
      /* webpackChunkName: 'concept-price-for-problem-solving' */
      '~/components/strategy/concepts/PriceForProblemSolving.vue'
    )
  ],
  'product-fit-review': [
    () => import(
      /* webpackChunkName: 'concept-product-fit-review' */
      '~/components/strategy/concepts/ProductFitReview.vue'
    )
  ],
  '6-marketing-questions': [
    () => import(
      /* webpackChunkName: 'concept-6-marketing-questions' */
      '~/components/strategy/concepts/6MarketingQuestions.vue'
    )
  ],
  'product-fit': [
    () => import(
      /* webpackChunkName: 'concept-product-fit' */
      '~/components/strategy/concepts/ProductFit.vue'
    )
  ],
  'digital-funnel-storyboard': [
    () => import(
      /* webpackChunkName: 'concept-digital-funnel-storyboard' */
      '~/components/strategy/concepts/DigitalFunnelStoryboard.vue'
    )
  ],
  'outbound-messaging-plan': [
    () => import(
      /* webpackChunkName: 'concept-outbound-messaging-plan' */
      '~/components/strategy/concepts/OutboundMessagingPlan.vue'
    )
  ],
  'inbound-landing-page-review': [
    () => import(
      /* webpackChunkName: 'concept-inbound-landing-page-review' */
      '~/components/strategy/concepts/InboundLandingPageReview.vue'
    )
  ],
  'sparketing-friction-review': [
    () => import(
      /* webpackChunkName: 'concept-sparketing-friction-review' */
      '~/components/strategy/concepts/SparketingFrictionReview.vue'
    )
  ],
  'branding-review': [
    () => import(
      /* webpackChunkName: 'concept-branding-review' */
      '~/components/strategy/concepts/BrandingReview.vue'
    )
  ],
  'customer-loyalty-programme': [
    () => import(
      /* webpackChunkName: 'concept-customer-loyalty-programme' */
      '~/components/strategy/concepts/CustomerLoyaltyProgramme.vue'
    )
  ],
  'packaging-bundling': [
    () => import(
      /* webpackChunkName: 'concept-packaging-bundling' */
      '~/components/strategy/concepts/PackagingBundling.vue'
    )
  ],
  'sales-process-review': [
    () => import(
      /* webpackChunkName: 'concept-sales-process-review' */
      '~/components/strategy/concepts/SalesProcessReview.vue'
    )
  ],
  'porters-5-forces': [
    () => import(
      /* webpackChunkName: 'concept-porters-5-forces' */
      '~/components/strategy/concepts/Porters5Forces.vue'
    )
  ],
  'technology-points': [
    () => import(
      /* webpackChunkName: 'concept-technology-points' */
      '~/components/strategy/concepts/TechnologyPoints.vue'
    )
  ],
  'our-session-objective': [
    () => import(
      /* webpackChunkName: 'concept-our-session-objective' */
      '~/components/strategy/concepts/OurSessionObjective.vue'
    )
  ],
  'collaborative-thinking': [
    () => import(
      /* webpackChunkName: 'concept-collaborative-thinking' */
      '~/components/strategy/concepts/CollaborativeThinking.vue'
    ),
    () => import(
      /* webpackChunkName: 'concept-collaborative-thinking-sheet2' */
      '~/components/strategy/concepts/CollaborativeThinkingSheet2.vue'
    )
  ]
}

/**
 * Concepts whose drawing opens with a title of its own.
 *
 * 🔴 A PAGE WHOSE DRAWING TITLES ITSELF MUST NOT ADD A SECOND TITLE — Mike, 2026-09-23.
 * 20 of the 32 printed the concept's name twice, once as our heading and once inside
 * his own drawing below it; ten were identical word for word. Read from the artefact
 * by size and position, never guessed from the name.
 *
 * @type {Object<string, boolean>}
 */
export const CONCEPT_TITLED = {
  'risk-reward-matrix': true,
  'boston-model': true,
  'the-8-profit-levers': true,
  'market-diffusion-theory': true,
  'product-life-cycle': true,
  'sigmoid-curve': true,
  'e-demings-volatility-theory': true,
  'progression-of-economic-value': true,
  'horizontal-integration': true,
  'blue-ocean-strategy': true,
  'revenue-streams': true,
  'senges-circles-of-causality': true,
  '10-marketing-messages': true,
  'customer-persona-type-table': true,
  'a-i-d-c-r-a-advertisement-framework': true,
  pricing: true,
  'sales-channel-options': true,
  'price-for-problem-solving': true,
  'price-for-delivery-medium': true,
  'product-fit-review': true,
  '6-marketing-questions': true,
  'product-fit': true,
  'digital-funnel-storyboard': true,
  'outbound-messaging-plan': true,
  'inbound-landing-page-review': true,
  'sparketing-friction-review': true,
  'branding-review': true,
  'customer-loyalty-programme': true,
  'packaging-bundling': true,
  'sales-process-review': true,
  'porters-5-forces': true,
  'technology-points': true,
  'our-session-objective': true,
  'collaborative-thinking': true
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where an approved drawing exists
 */
export function hasConceptGraphic (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_GRAPHICS, conceptId)
}

/**
 * How many teaching sheets this concept has.
 *
 * A screen loops this rather than assuming one, which is what every surface did
 * until 2026-09-23. Zero means the concept has no drawing and the screens fall
 * back to Mike's words.
 *
 * @param {string} conceptId
 * @returns {number}
 */
export function conceptSheetCount (conceptId) {
  return hasConceptGraphic(conceptId) ? CONCEPT_GRAPHICS[conceptId].length : 0
}

/**
 * Concepts whose prompt bullets merely repeat what the drawing already says.
 *
 * 🔴 ITEM 15.12 — a client read the same five questions twice on one page, once inside
 * Mike's drawing and once as bullets beneath it, and on A4 the page then split mid-list.
 * Measured by word overlap at build time: Porter's 5 Forces 92%, The 8 Profit Levers 74%,
 * everything else far below. A concept whose prompts are genuinely extra keeps them.
 *
 * @type {Object<string, boolean>}
 */
export const CONCEPT_PROMPTS_ECHOED = {
  'the-8-profit-levers': true,
  'porters-5-forces': true
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where the drawing titles itself, so the page must not
 */
export function conceptTitlesItself (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_TITLED, conceptId)
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where the bullets would repeat the drawing, so they must not print
 */
export function promptsEchoDrawing (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_PROMPTS_ECHOED, conceptId)
}
