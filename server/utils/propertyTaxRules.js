'use strict'

/**
 * @file The property model's tax rules a scope actually works to — the platform's New
 *   Zealand defaults, with each tier's own changes merged over them.
 * @module server/utils/propertyTaxRules
 *
 * RULED BY MIKE, 2026-08-17 (`design/MULTIPLE-PROPERTY-ASSESSMENT.md` §8 Q6): **the
 * GROUP sets these, and both the firm and the advisor may override.** A group is normally
 * a COUNTRY (`tier-cascade.md` P2) and tax rules are per-country, so a firm — a branch
 * inside one — is the wrong place for them to originate, even though it is often the
 * right place for them to be corrected.
 *
 * 🔴 THE ADVISOR'S OVERRIDE IS NOT STORED, AND THAT IS DELIBERATE. Confirmed by Mike
 * 2026-08-17 — *"type over per client if desired"*. The advisor's override IS the Tax
 * rules card on the report screen: the screen populates from whatever this file resolves,
 * and the advisor may type over any of it for the client in front of them. Nothing is
 * saved at advisor level, which is why this module knows nothing about advisors and why
 * `tier-cascade.md` §3 — *"the advisor is a pass-through … neither gets override
 * storage"* — is not contradicted by Q6. The two say the same thing in different words.
 *
 * Modelled on `coachingConfig.loadResolvedCoaching`: the same recursion up the tier chain,
 * the same "a scope that has decided nothing gets the layer above untouched", the same
 * refusal to let a storage fault stop a session. Copying the proven shape is deliberate —
 * a second way of doing inheritance is how the two drift apart.
 *
 * ⚠ THE MECHANISM IS `deepMerge`, NOT `resolveInheritedRows`, and the choice is not
 * arbitrary (`tier-cascade.md` §3). These are map-shaped SETTINGS, not rows carrying a
 * decision each: a group that sets only `lossTreatment` must keep receiving the platform's
 * value for everything else. There is nothing here to switch off, and nothing to add.
 *
 * ⚠ `phasingTable` IS AN ARRAY AND REPLACES WHOLESALE. That is `deepMerge`'s rule and it
 * is the right one here — a phasing schedule half from one country and half from another
 * would be a schedule no tax authority has ever written.
 *
 * 🔴 THE GROUP TIER CANNOT BE EXERCISED BY A REAL LOGIN TODAY. No role value produces
 * `group_manager` and the `firms` table has no country column, so `parentScopeOf` returns
 * the platform scope for every firm and the chain runs mentor → firm exactly as it did
 * before. It fails toward the New Zealand defaults — today's behaviour — never toward a
 * guess. That data is Advisor-e's to supply (`MASTER-TEAM-INTEGRATION-EMAIL.md` q5), and
 * this module is evidenced by tests against a seeded membership map, which is a weaker
 * claim than a live screen and is stated as one.
 */

const BASE_FILE = require('../../data/property-tax-rules.json')
const { deepMerge } = require('./deepMerge')
const { parentScopeOf } = require('./tierChain')

/**
 * The shipped New Zealand defaults.
 *
 * `_`-prefixed keys are the data file's own documentation and are stripped here rather
 * than in the file, so the note explaining WHY these are New Zealand's stays beside the
 * values it explains — and never reaches an API response, a merge, or the model.
 */
const BASE_PROPERTY_TAX_RULES = Object.keys(BASE_FILE)
  .filter(k => k.charAt(0) !== '_')
  .reduce((out, k) => { out[k] = BASE_FILE[k]; return out }, {})

/** The overlay address these settings are stored under, at every tier. */
const CONFIG_KEY = 'property-tax-rules'

/**
 * The allowed value sets, keyed by field. Read by both the validator and the screen's
 * tests, so a new setting cannot be accepted by one and refused by the other.
 *
 * These mirror the constants in `server/report/multiplePropertyModel.js`, which is the
 * only thing that acts on them — a value this validator lets through but the model does
 * not recognise would fall back to the model's own default and be reported in
 * `defaultedInputs`, so a mismatch is loud rather than silent.
 */
const ALLOWED = {
  yearOneAddBack: ['setup', 'setupAndPurchase', 'none'],
  depreciableAssets: ['chattels', 'chattelsAndBuilding'],
  depreciationMethod: ['dv', 'sl'],
  lossTreatment: ['ringFenced', 'offset'],
  interestDeductibility: ['Yes', 'No', 'Phasing']
}

/**
 * The fields carrying a rate, all of them decimals in 0..1 (15% is 0.15, never 15).
 *
 * ⚠ `maxLvr` is a LENDING rule, not a tax rule, and it shares this block deliberately:
 * it cascades the same way, a firm corrects it the same way, and an advisor types over
 * it the same way, so a second mechanism and a second Hub tab would buy nothing but a
 * tab (Mike, 2026-08-20 — "it needs to be an editable input"). It is a rate like the
 * others and this validator's 0..1 rule is exactly right for it: a `70` typed where
 * `0.7` was meant is refused rather than read as 7000%.
 *
 * 🔴 IT IS ABSENT FROM `data/property-tax-rules.json` ON PURPOSE. The source workbook
 * has no ceiling anywhere — it computes an LVR at `R5` that no formula ever reads — so
 * a shipped figure would be a lending policy nobody chose. Absent means no ceiling is
 * set, the model computes and shows both LVRs and judges neither, and the first real
 * figure is the one a mentor types in.
 */
const RATE_FIELDS = ['managementFeeGstRate', 'depreciationRateChattels', 'buildingDepreciationRate', 'maxLvr']

/** The longest phasing schedule worth accepting — the model projects ten years. */
const MAX_PHASING_ENTRIES = 10

/**
 * Validate and sanitise a scope's OWN changes — a partial object, never a whole config.
 *
 * A level holds only its changes (`tier-cascade.md` P3), so an absent field is not an
 * error: it means "keep taking this from the level above". An UNKNOWN field IS an error
 * rather than a silent drop — a typo that vanishes quietly is a setting somebody believes
 * they saved.
 *
 * Rates are refused above 1 rather than clamped. `15` is not a bad 15%, it is a rate
 * typed in the wrong unit, and accepting it as 1500% — or silently clamping it to 100% —
 * would put a wrong tax rule into live advice with nothing on screen to notice it by.
 *
 * @param {*} value - the candidate object from the request body.
 * @returns {{ok: boolean, errors: string[], value: object}} `value` holds only the
 *   recognised, in-range fields, and is meaningful only when `ok` is true.
 */
function validatePropertyTaxRules (value) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['rules must be a non-array JSON object'], value: {} }
  }

  const clean = {}
  Object.keys(value).forEach((key) => {
    const v = value[key]

    if (ALLOWED[key]) {
      if (!ALLOWED[key].includes(v)) {
        errors.push(`${key} must be one of: ${ALLOWED[key].join(', ')}`)
        return
      }
      clean[key] = v
      return
    }

    if (RATE_FIELDS.includes(key)) {
      const n = typeof v === 'number' ? v : parseFloat(v)
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        errors.push(`${key} must be a rate between 0 and 1 (15% is 0.15, not 15)`)
        return
      }
      clean[key] = n
      return
    }

    if (key === 'phasingTable') {
      if (!Array.isArray(v) || v.length === 0 || v.length > MAX_PHASING_ENTRIES) {
        errors.push(`phasingTable must be an array of 1 to ${MAX_PHASING_ENTRIES} rates`)
        return
      }
      const entries = v.map(x => (typeof x === 'number' ? x : parseFloat(x)))
      if (entries.some(x => !Number.isFinite(x) || x < 0 || x > 1)) {
        errors.push('every phasingTable entry must be a rate between 0 and 1')
        return
      }
      clean[key] = entries
      return
    }

    errors.push(`${key} is not a property tax rule`)
  })

  return { ok: errors.length === 0, errors, value: clean }
}

/**
 * The tax rules one scope works to, resolved through every tier above it.
 *
 * @param {string|null} scopeId - the scope to resolve for, taken from the verified JWT
 *   and NEVER from a request body — a body-supplied id would let one firm read another's
 *   configuration (`tier-cascade.md` P6; the open IDOR item in `ACTIONS.md`).
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the overlay
 *   reader, injected rather than imported so tests need no database and the engine reuses
 *   the client it already has. Mirrors `loadResolvedCoaching`.
 * @returns {Promise<object>} the effective rules. Falls back to the layer above when this
 *   scope has stored nothing, has no scope id, or the store cannot be reached. NEVER
 *   REJECTS: a storage problem must not stop an advisor assessing a property, and the
 *   worst case is the shipped New Zealand set — which is what every firm gets today.
 */
async function loadResolvedPropertyTaxRules (scopeId, loadFirmConfig) {
  if (!scopeId) { return BASE_PROPERTY_TAX_RULES }

  const parent = parentScopeOf(scopeId)
  const base = parent === null
    ? BASE_PROPERTY_TAX_RULES
    : await loadResolvedPropertyTaxRules(parent, loadFirmConfig)

  let own = null
  try {
    own = await loadFirmConfig(scopeId, CONFIG_KEY)
  } catch (err) {
    console.error('[property-tax-rules] scope read failed:', err.message)
    return base
  }

  // Identity, not merely an optimisation: a scope that has changed nothing gets the
  // object from the layer above itself, so "unchanged" is provable by reference.
  const { ok, value } = validatePropertyTaxRules(own)
  if (!ok || Object.keys(value).length === 0) { return base }

  return deepMerge(base, value)
}

module.exports = {
  BASE_PROPERTY_TAX_RULES,
  CONFIG_KEY,
  ALLOWED,
  RATE_FIELDS,
  MAX_PHASING_ENTRIES,
  validatePropertyTaxRules,
  loadResolvedPropertyTaxRules
}
