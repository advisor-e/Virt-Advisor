'use strict'

/**
 * Advisory Staircase — the advisor-readable view.
 *
 * A firm manager edits the staircase on the Firm Manager Hub tab
 * (`/api/firm-manager/staircase`, manager-only). This route is the other half of
 * that: it lets an ORDINARY ADVISOR's selector show the wording their firm wrote.
 * Access is deliberately asymmetric, exactly like the firm currency setting:
 *   - READ  (here)          — any signed-in firm user (`firmAuth`). The staircase
 *     question is asked of every advisor in a client session, so a read must never
 *     require the manager role, and must never break the session: on any failure it
 *     degrades to the platform default wording.
 *   - WRITE (firmManager.js) — managers only.
 *
 * The blend itself lives in `utils/staircaseConfig.js`, shared with the engine, so
 * the wording an advisor reads and the complexity ceiling the engine applies can
 * never come from different merges of the same saved config.
 */

const overlay = require('../utils/firmOverlay')
const { loadBlendedStaircase, BASE_STAIRCASE } = require('../utils/staircaseConfig')

/**
 * Reduce a staircase config to what the on-screen selector needs.
 *
 * Display fields only: the firm's complexityCeiling and defaultCeiling are decision
 * config and stay on the backend, where the ceiling is applied. Rows the selector
 * could not use are dropped rather than rendered blank — a step with no number
 * could not be resolved back to a ceiling, and a step with no name would show the
 * advisor an empty radio button.
 *
 * @param {Object} staircase - a blended (or base) staircase config.
 * @returns {Array<{step: number, name: string, selectorDescription: string}>}
 */
function toSelectorSteps (staircase) {
  const steps = (staircase && Array.isArray(staircase.steps)) ? staircase.steps : []
  return steps
    .filter(s => s && Number.isInteger(s.step) && typeof s.name === 'string' && s.name.trim())
    .map(s => ({
      step: s.step,
      name: s.name,
      selectorDescription: typeof s.selectorDescription === 'string' ? s.selectorDescription : ''
    }))
}

/**
 * GET /api/advisor/staircase  (firmAuth)
 *
 * @route GET /api/advisor/staircase
 * @returns {{ steps: Array<{step: number, name: string, selectorDescription: string}> }}
 *   the firm's steps, or the platform's when the firm has saved no override. Always
 *   200 with a usable list — never an error, and never an empty list.
 */
async function get (req, res) {
  try {
    const staircase = await loadBlendedStaircase(req.firmId, overlay.loadFirmConfig)
    const steps = toSelectorSteps(staircase)
    // A selector with no options is a dead end for the advisor. The save route's
    // validator should make this shape unstorable; this is the second lock.
    res.send(200, { steps: steps.length ? steps : toSelectorSteps(BASE_STAIRCASE) })
  } catch (err) {
    // loadBlendedStaircase already degrades rather than throwing, so this is the
    // outer belt required of every async route — log server-side, serve the base.
    console.error('[staircase] read failed:', err.message)
    res.send(200, { steps: toSelectorSteps(BASE_STAIRCASE) })
  }
}

module.exports = { get }
