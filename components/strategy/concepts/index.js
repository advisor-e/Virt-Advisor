/**
 * ⚠ GENERATED — DO NOT EDIT. `node scripts/build-concept-graphics.js`.
 *
 * Every concept that has an approved teaching drawing, and how to load it.
 * A concept absent from this map has no drawing yet, and the screens fall back
 * to Mike's words — which is what they did for all 52 before item 15.7.
 */

/** @type {Object<string, function(): Promise<object>>} */
export const CONCEPT_GRAPHICS = {
  'risk-reward-matrix': () => import(
    /* webpackChunkName: 'concept-risk-reward-matrix' */
    '~/components/strategy/concepts/RiskRewardMatrix.vue'
  ),
  'boston-model': () => import(
    /* webpackChunkName: 'concept-boston-model' */
    '~/components/strategy/concepts/BostonModel.vue'
  ),
  'the-8-profit-levers': () => import(
    /* webpackChunkName: 'concept-the-8-profit-levers' */
    '~/components/strategy/concepts/The8ProfitLevers.vue'
  ),
  'vertical-integration': () => import(
    /* webpackChunkName: 'concept-vertical-integration' */
    '~/components/strategy/concepts/VerticalIntegration.vue'
  ),
  'market-diffusion-theory': () => import(
    /* webpackChunkName: 'concept-market-diffusion-theory' */
    '~/components/strategy/concepts/MarketDiffusionTheory.vue'
  ),
  'product-life-cycle': () => import(
    /* webpackChunkName: 'concept-product-life-cycle' */
    '~/components/strategy/concepts/ProductLifeCycle.vue'
  ),
  'sigmoid-curve': () => import(
    /* webpackChunkName: 'concept-sigmoid-curve' */
    '~/components/strategy/concepts/SigmoidCurve.vue'
  ),
  'e-demings-volatility-theory': () => import(
    /* webpackChunkName: 'concept-e-demings-volatility-theory' */
    '~/components/strategy/concepts/EDemingsVolatilityTheory.vue'
  ),
  'progression-of-economic-value': () => import(
    /* webpackChunkName: 'concept-progression-of-economic-value' */
    '~/components/strategy/concepts/ProgressionOfEconomicValue.vue'
  ),
  'horizontal-integration': () => import(
    /* webpackChunkName: 'concept-horizontal-integration' */
    '~/components/strategy/concepts/HorizontalIntegration.vue'
  ),
  'blue-ocean-strategy': () => import(
    /* webpackChunkName: 'concept-blue-ocean-strategy' */
    '~/components/strategy/concepts/BlueOceanStrategy.vue'
  ),
  'revenue-streams': () => import(
    /* webpackChunkName: 'concept-revenue-streams' */
    '~/components/strategy/concepts/RevenueStreams.vue'
  ),
  'senges-circles-of-causality': () => import(
    /* webpackChunkName: 'concept-senges-circles-of-causality' */
    '~/components/strategy/concepts/SengesCirclesOfCausality.vue'
  ),
  '10-marketing-messages': () => import(
    /* webpackChunkName: 'concept-10-marketing-messages' */
    '~/components/strategy/concepts/10MarketingMessages.vue'
  ),
  'customer-persona-type-table': () => import(
    /* webpackChunkName: 'concept-customer-persona-type-table' */
    '~/components/strategy/concepts/CustomerPersonaTypeTable.vue'
  ),
  'a-i-d-c-r-a-advertisement-framework': () => import(
    /* webpackChunkName: 'concept-a-i-d-c-r-a-advertisement-framework' */
    '~/components/strategy/concepts/AIDCRAAdvertisementFramework.vue'
  ),
  pricing: () => import(
    /* webpackChunkName: 'concept-pricing' */
    '~/components/strategy/concepts/Pricing.vue'
  ),
  'sales-channel-options': () => import(
    /* webpackChunkName: 'concept-sales-channel-options' */
    '~/components/strategy/concepts/SalesChannelOptions.vue'
  ),
  'price-for-problem-solving': () => import(
    /* webpackChunkName: 'concept-price-for-problem-solving' */
    '~/components/strategy/concepts/PriceForProblemSolving.vue'
  ),
  'price-for-delivery-medium': () => import(
    /* webpackChunkName: 'concept-price-for-problem-solving' */
    '~/components/strategy/concepts/PriceForProblemSolving.vue'
  ),
  'product-fit-review': () => import(
    /* webpackChunkName: 'concept-product-fit-review' */
    '~/components/strategy/concepts/ProductFitReview.vue'
  ),
  '6-marketing-questions': () => import(
    /* webpackChunkName: 'concept-6-marketing-questions' */
    '~/components/strategy/concepts/6MarketingQuestions.vue'
  ),
  'product-fit': () => import(
    /* webpackChunkName: 'concept-product-fit' */
    '~/components/strategy/concepts/ProductFit.vue'
  ),
  'digital-funnel-storyboard': () => import(
    /* webpackChunkName: 'concept-digital-funnel-storyboard' */
    '~/components/strategy/concepts/DigitalFunnelStoryboard.vue'
  ),
  'outbound-messaging-plan': () => import(
    /* webpackChunkName: 'concept-outbound-messaging-plan' */
    '~/components/strategy/concepts/OutboundMessagingPlan.vue'
  ),
  'inbound-landing-page-review': () => import(
    /* webpackChunkName: 'concept-inbound-landing-page-review' */
    '~/components/strategy/concepts/InboundLandingPageReview.vue'
  ),
  'sparketing-friction-review': () => import(
    /* webpackChunkName: 'concept-sparketing-friction-review' */
    '~/components/strategy/concepts/SparketingFrictionReview.vue'
  ),
  'branding-review': () => import(
    /* webpackChunkName: 'concept-branding-review' */
    '~/components/strategy/concepts/BrandingReview.vue'
  ),
  'customer-loyalty-programme': () => import(
    /* webpackChunkName: 'concept-customer-loyalty-programme' */
    '~/components/strategy/concepts/CustomerLoyaltyProgramme.vue'
  ),
  'packaging-bundling': () => import(
    /* webpackChunkName: 'concept-packaging-bundling' */
    '~/components/strategy/concepts/PackagingBundling.vue'
  ),
  'sales-process-review': () => import(
    /* webpackChunkName: 'concept-sales-process-review' */
    '~/components/strategy/concepts/SalesProcessReview.vue'
  ),
  'porters-5-forces': () => import(
    /* webpackChunkName: 'concept-porters-5-forces' */
    '~/components/strategy/concepts/Porters5Forces.vue'
  ),
  'technology-points': () => import(
    /* webpackChunkName: 'concept-technology-points' */
    '~/components/strategy/concepts/TechnologyPoints.vue'
  )
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where an approved drawing exists
 */
export function hasConceptGraphic (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_GRAPHICS, conceptId)
}
