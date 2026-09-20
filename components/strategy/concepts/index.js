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
  )
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where an approved drawing exists
 */
export function hasConceptGraphic (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_GRAPHICS, conceptId)
}
