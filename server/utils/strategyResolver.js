'use strict'

const ENGAGEMENT_TYPES = require('../../data/engagement-types.json')
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
  const domainNatural = DOMAIN_NATURAL_ENGAGEMENT[caseState.domain] || ENGAGEMENT_TYPES.defaultEngagement
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
  // Engagement type decides it by default. The education gate (item 2.9) overrides that
  // when — and only when — the advisor actually answered it.
  //
  // 🔴 THE GATE SETS SEQUENCING DIRECTLY, NOT VIA ENGAGEMENT TYPE. `advisory-staircase.json`'s
  // own ruleGuard forbids coupling here: "the education decision lives in the acumen lens".
  // Routing the answer through engagementType would also change the complexity ceiling and
  // the template budget as a side effect, which nobody asked for — the advisor answered a
  // question about how to PITCH the advice, not about what the engagement IS.
  //
  // A gate answer of 'technical' is a real decision and beats an engagement type that would
  // otherwise have sequenced education first: the advisor was shown the choice and declined.
  const engagementSequencing = engagementType === 'education' ? 'education_first' : 'standard'
  const gateChoice = caseState.educationChoice || null
  const sequencingRule = gateChoice
    ? (gateChoice === 'education_first' ? 'education_first' : 'standard')
    : engagementSequencing

  // ── Intervention urgency ─────────────────────────────────────────────────
  // Passed through from the client's derived urgency (deriveUrgency in caseState).
  // NOT firm-overridable: urgency reflects the client's real situation (cash
  // crisis / partner dispute / live deal / covenant breach), not a firm tuning
  // knob — a firm must never be able to dial down a genuine crisis. Consumed by
  // the Phase 3 recommendation prompt (advisorEngine) to lead with the critical
  // move and flag the time-pressure; it does NOT change the template count.
  const urgency = (caseState.client && caseState.client.urgency) || 'low'

  // ── Base decision ────────────────────────────────────────────────────────
  const base = {
    engagementType,
    complexityCeiling,
    templateBudget,
    sequencingRule,
    urgency,
    advisorConstraintApplied: advisorConstrained,
    firmOverrides
  }

  // ── Firm overrides applied on top ────────────────────────────────────────
  return {
    engagementType: firmOverrides.engagementType || base.engagementType,
    complexityCeiling: firmOverrides.complexityCeiling || base.complexityCeiling,
    templateBudget: firmOverrides.templateBudget || base.templateBudget,
    sequencingRule: firmOverrides.sequencingRule || base.sequencingRule,
    // urgency is intentionally NOT overridable by firmOverrides (see above)
    urgency: base.urgency,
    advisorConstraintApplied: base.advisorConstraintApplied,
    firmOverrides
  }
}

module.exports = { resolveStrategy }
