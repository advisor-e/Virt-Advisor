/**
 * The engine's score-reason codes, and which locale key says each one in English.
 *
 * WHY THIS FILE EXISTS. `templateResolver.js` records WHY each template scored what
 * it did, as short codes — `industry:title_match`, `penalty:reports_already_in_use`,
 * `semantic:4.2`. The decision-trace panel's "Why" column turns those into plain
 * English for a reader. Until 2026-08-04 that translation lived inside
 * VirtualAdvisor and covered 7 of the engine's 26 codes; FirmManagerHub had no
 * translation at all and printed the raw codes to a firm manager. Two copies, one of
 * them empty, is what a mapping duplicated across components turns into.
 *
 * So the mapping lives here, once, and both screens reach it through
 * `mixins/traceReasonMixin.js`.
 *
 * ⚠ THE WORDING IS NOT MINE TO CHANGE. Every phrase was ruled on by Mike, 2026-08-04
 * — see design/WORDING-TRACE-REASONS.md, which records the five decisions behind it
 * (show all 26; points only on the firm's own levers; keep the second person; two live
 * phrases reworded; "held back" as the standard penalty word). Change the file and the
 * ruling together, or neither.
 *
 * An unrecognised code passes through UNTRANSLATED rather than vanishing. The engine
 * gains codes as it grows, and a new one showing up ugly is a prompt to add it here; a
 * new one silently disappearing takes a reason for a recommendation with it.
 */

/**
 * Ordered rules. First match wins, so the two group-distinction forms are tested
 * before the plain one — `distinction:@rf-industry+5` would otherwise fall through to
 * the pass-through and reach a reader as a code.
 *
 * `points` is captured as the engine wrote it (a string) — it is displayed, never
 * summed here.
 */
export const REASON_RULES = [
  // The firm's own levers — the two that carry their point value on screen.
  { test: /^distinction:@rf-industry\+(\d+(?:\.\d+)?)$/, key: 'reasonDistinctionIndustry', param: 'points' },
  { test: /^distinction:@rf-general\+(\d+(?:\.\d+)?)$/, key: 'reasonDistinctionGeneral', param: 'points' },
  { test: /^distinction:\+(\d+(?:\.\d+)?)$/, key: 'reasonDistinction', param: 'points' },
  { test: /^tree_hint:\+(\d+(?:\.\d+)?)$/, key: 'reasonTreeHint', param: 'points' },

  // Where the template sits.
  { test: /^domain:primary_subsection$/, key: 'reasonPrimary' },
  { test: /^domain:secondary_subsection$/, key: 'reasonSecondary' },
  { test: /^engagement:primary$/, key: 'reasonEngagementPrimary' },
  { test: /^engagement:secondary$/, key: 'reasonEngagementSecondary' },
  { test: /^growth:exact$/, key: 'reasonGrowth' },

  // The client's industry.
  { test: /^industry:title_match$/, key: 'reasonIndustryTitle' },
  { test: /^industry:tag_match$/, key: 'reasonIndustryTag' },
  { test: /^industry:mismatch_specific_model$/, key: 'reasonIndustryMismatch' },
  { test: /^industry:wrong_domain_model$/, key: 'reasonIndustryWrongDomain' },

  // What the advisor described.
  { test: /^primary_issue:strong_match$/, key: 'reasonIssueStrong' },
  { test: /^primary_issue:partial_match$/, key: 'reasonIssuePartial' },
  // The score rides along in the code (`semantic:4.2`) and is deliberately NOT shown:
  // ruling 2 keeps numbers on the firm's own levers only.
  { test: /^semantic:/, key: 'reasonSemantic' },
  { test: /^purpose_fallback:/, key: 'reasonPurposeFallback' },
  // Tested AFTER purpose_fallback, though the two prefixes cannot collide — the order
  // states the intent rather than relying on a reader spotting the underscore.
  { test: /^tag:(.+)$/, key: 'reasonTag', param: 'category' },
  { test: /^purpose:(.+)$/, key: 'reasonPurpose', param: 'category' },

  // Held back.
  { test: /^history:already_delivered$/, key: 'reasonDelivered' },
  { test: /^history:went_less_well$/, key: 'reasonWentLess' },
  { test: /^penalty:modeling_declined$/, key: 'reasonPenaltyModeling' },
  { test: /^penalty:reports_already_in_use$/, key: 'reasonPenaltyReports' },
  { test: /^advisor:confidence_mismatch$/, key: 'reasonConfidenceMismatch' },

  // The advisor's own confidence.
  { test: /^advisor:confidence_match$/, key: 'reasonConfidenceMatch' },
  { test: /^advisor:confidence_boost$/, key: 'reasonConfidenceBoost' }
]

/**
 * Find the locale key for one reason code.
 *
 * @param {string} code one entry from a template's `matchReasons`
 * @returns {{key: string, params: Object}|null} the key under `decisionTrace.` and any
 *   interpolation values, or null when nothing matches (the caller shows the code as-is)
 */
export function matchReason (code) {
  if (typeof code !== 'string') { return null }
  for (const rule of REASON_RULES) {
    const hit = rule.test.exec(code)
    if (!hit) { continue }
    return {
      key: 'decisionTrace.' + rule.key,
      params: rule.param ? { [rule.param]: hit[1] } : {}
    }
  }
  return null
}
