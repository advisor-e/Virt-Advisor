'use strict'

const { DOMAIN_NATURAL_ENGAGEMENT } = require('./caseState')

// ── resolveStrategy ────────────────────────────────────────────────────────
// Pure deterministic function. Same inputs always produce same output.
// Takes CaseState + optional firm overrides → StrategyDecision.
//
// Engagement type rules (Lens 2 + Lens 4 — staircase is NOT a factor):
//   - Client did NOT request help → education (they may not know they need it)
//   - Client requested help → domain natural engagement type (facilitation or advice)
//   - Advisor low confidence + no stretch → cap at education
//   - Advisor low confidence + willing to stretch → remove constraint
//
// Complexity ceiling rules (Lens 3 — staircase only):
//   - Steps 1–2 → foundational
//   - Steps 3–4 → analytical
//   - Step 5    → strategic
//   These are INDEPENDENT of engagement type.
function resolveStrategy (caseState, firmOverrides) {
  firmOverrides = firmOverrides || {}

  // ── Engagement type ──────────────────────────────────────────────────────
  // Start from domain natural type, gated by whether client requested help
  const domainNatural = DOMAIN_NATURAL_ENGAGEMENT[caseState.domain] || 'education'
  let engagementType = caseState.client.requestedHelp ? domainNatural : 'education'

  // Lens 4 advisor gate
  const advisorConstrained = (
    caseState.advisor.confidence === 'low' &&
    !caseState.advisor.stretchWillingness
  )
  if (advisorConstrained) {
    engagementType = 'education'
  }

  // ── Complexity ceiling ───────────────────────────────────────────────────
  // Driven entirely by staircase — independent of engagement type
  const complexityCeiling = caseState.complexityCeiling || 'foundational'

  // ── Template budget ──────────────────────────────────────────────────────
  const templateBudget = caseState.constraints.templateBudget || 1

  // ── Sequencing rule ──────────────────────────────────────────────────────
  const sequencingRule = engagementType === 'education' ? 'education_first' : 'standard'

  // ── Base decision ────────────────────────────────────────────────────────
  const base = {
    engagementType,
    complexityCeiling,
    templateBudget,
    sequencingRule,
    advisorConstraintApplied: advisorConstrained,
    firmOverrides
  }

  // ── Firm overrides applied on top ────────────────────────────────────────
  return {
    engagementType: firmOverrides.engagementType || base.engagementType,
    complexityCeiling: firmOverrides.complexityCeiling || base.complexityCeiling,
    templateBudget: firmOverrides.templateBudget || base.templateBudget,
    sequencingRule: firmOverrides.sequencingRule || base.sequencingRule,
    advisorConstraintApplied: base.advisorConstraintApplied,
    firmOverrides
  }
}

module.exports = { resolveStrategy }
