'use strict'

/**
 * @file What each report model serves, as the AI is told it.
 * @module server/utils/reportModels
 *
 * To-do item 4.29. Asked for by Mike, 2026-08-21: *"ensure that each of the performance
 * models have a 'key calculation output' page or section, so that the AI can read what the
 * model serves"*, and *"place it wherever you want, it's for AI - not the advisor or
 * manager"*. Plan item T22, feeding T23.
 *
 * 🔴 THE FAULT THIS CLOSES. `utils/reportModelCatalogue.js` was read by exactly one file —
 * `components/ModelLibrary.vue`. Nothing in `server/` read it, and the only mention of a
 * model's name on the backend was a JSDoc comment inside the model itself. So an advisor
 * describing a client's cash problem could not be pointed at Debtor Drag: **ten built
 * models that answer real client questions were invisible to the one part of the app an
 * advisor actually asks for help.**
 *
 * 🔴 IT CAN ONLY EVER NAME A MODEL WITH A LIVE PAGE. `data/report-model-summaries.json`
 * holds the ten `STATUS_READY` models, keyed by route. The eight `STATUS_SOON` models have
 * no route and are deliberately absent — a summary for one of those would send an advisor
 * to a screen that does not exist, which is to-do item 4.15 happening again somewhere new.
 * `tests/unit/reportModelSummaries.test.js` holds the file to the catalogue BOTH ways, so
 * the day a SOON model goes live the build says it needs an entry.
 *
 * ⚠ THIS FILE READS A JSON FILE AND NEVER THE CATALOGUE, and that is not laziness.
 * `utils/reportModelCatalogue.js` is an ES module (`export const`) compiled by Nuxt; the
 * backend is CommonJS on Node 14 and cannot require it. The guard test runs under Babel
 * and can see both, so the tie between them is enforced where it CAN be enforced rather
 * than faked here.
 *
 * Node 14, CommonJS.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

let _data = null

/**
 * The summaries, loaded once.
 *
 * A read failure degrades to nothing rather than throwing: the models block is an
 * enrichment, and an advisor mid-conversation must not lose their answer because a data
 * file is unreadable. It is logged so the silence is not total.
 *
 * @returns {{instruction: string[], models: object[]}}
 */
function loadReportModels () {
  if (_data) { return _data }
  try {
    _data = JSON.parse(readFileSync(resolve(process.cwd(), 'data/report-model-summaries.json'), 'utf8'))
  } catch (err) {
    console.error('[report-models] Failed to load report-model-summaries.json:', err.message)
    _data = { instruction: [], models: [] }
  }
  return _data
}

/**
 * Every model the AI may name, in catalogue order.
 * @returns {object[]}
 */
function listReportModels () {
  return loadReportModels().models || []
}

/**
 * The block that goes in front of the model.
 *
 * ⚠ IT IS NOT FENCED, and that is correct rather than an omission. `fenceUntrusted` marks
 * content as *data to weigh, never instructions to follow* — right for a firm's promoted
 * case notes or an advisor's own words, all of which are user-authored. This block is
 * platform content in a file no user can reach from any screen, and it CONTAINS
 * instructions the model is meant to follow ("never name a model that is not in this
 * list"). Fencing it would tell the model to ignore the one rule that keeps it honest.
 *
 * 🔴 The instruction comes FIRST. Anything after it is read as operating within it — the
 * same ordering, for the same reason, as `PROTOCOL_BLOCK` in `aiPrompts.js`.
 *
 * @returns {string} the markdown block, or '' when there is nothing to say
 */
function formatReportModelsForPrompt () {
  const models = listReportModels()
  if (!models.length) { return '' }

  const instruction = (loadReportModels().instruction || []).join('\n')

  const lines = []
  lines.push('## Calculation Models Available In This App')
  lines.push('')
  if (instruction) {
    lines.push(instruction)
    lines.push('')
  }

  models.forEach((m) => {
    lines.push(`### ${m.name}`)
    lines.push(`- **Page:** ${m.route}`)
    lines.push(`- **Category:** ${m.category}`)
    lines.push(`- **Answers:** ${m.answers}`)
    lines.push(`- **Key calculation output:** ${(m.keyOutputs || []).join(' · ')}`)
    lines.push(`- **The advisor must be able to supply:** ${m.inputsNeeded}`)
    lines.push(`- **Reach for it when:** ${m.useWhen}`)
    // 🔴 Never optional. A model recommended without its limits is how an advisor
    // promises a client something the screen does not do.
    lines.push(`- **What it does NOT cover:** ${m.limits}`)
    lines.push('')
  })

  return lines.join('\n').trim()
}

module.exports = { loadReportModels, listReportModels, formatReportModelsForPrompt }
