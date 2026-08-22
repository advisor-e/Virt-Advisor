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
const { computeCoachFigures } = require('./reportModelFigures')

let _data = null
let _figures = null

/** The platform default, matching `data/currencies.json`. See `renderFigure` below. */
const PROMPT_CURRENCY = 'NZD'
const PROMPT_LOCALE = 'en'

/**
 * The Coach figures, computed once.
 *
 * Degrades to `{}` rather than throwing, on the same reasoning as `loadReportModels`
 * below: a model that will not compute must cost an advisor a NUMBER, never their answer.
 * An unresolved token then renders as "—", the reports' own no-figure convention, and
 * never as a brace on a screen.
 *
 * @returns {Object<string, Object<string, {value: *, format: string}>>}
 */
function loadCoachFigures () {
  if (_figures) { return _figures }
  try {
    _figures = computeCoachFigures()
  } catch (err) {
    console.error('[report-models] Failed to compute coach figures:', err.message)
    _figures = {}
  }
  return _figures
}

/**
 * One figure as text.
 *
 * ⚠ THIS IS THE AI'S COPY, IN THE PLATFORM DEFAULT CURRENCY. The screen formats the same
 * raw values through `mixins/currencyMixin.js` in the FIRM's currency; the AI has no firm
 * context, so it reads the default. `utils/currencyFormat.js` cannot be shared here — it
 * is an ES module and this backend is CommonJS on Node 14 — so
 * `tests/unit/reportModelFigures.test.js` asserts this renders money identically to it.
 *
 * @param {{value: *, format: string}} figure
 * @returns {string} the figure, or '—' where there is no figure to give
 */
function renderFigure (figure) {
  if (!figure) { return '—' }
  const v = figure.value
  if (v === null || v === undefined || v === '') { return '—' }
  if (figure.format === 'text' || figure.format === 'plain') { return String(v) }
  if (typeof v !== 'number' || !Number.isFinite(v)) { return '—' }

  try {
    switch (figure.format) {
      case 'money':
        return new Intl.NumberFormat(PROMPT_LOCALE, {
          style: 'currency',
          currency: PROMPT_CURRENCY,
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(v)
      case 'number1':
        return new Intl.NumberFormat(PROMPT_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)
      case 'percent1':
        return (Math.round(v * 1000) / 10).toFixed(1) + '%'
      case 'percentInt':
        return Math.round(v * 100) + '%'
      default:
        return new Intl.NumberFormat(PROMPT_LOCALE, { maximumFractionDigits: 0 }).format(v)
    }
  } catch (e) {
    // An ICU build that rejects `narrowSymbol` must not cost the line its number.
    return String(v)
  }
}

/**
 * Put the figures back into a Coach sentence.
 *
 * 🔴 THE SENTENCE IS THE SINGLE SOURCE AND IT STAYS ONE. `data/report-model-summaries.json`
 * holds the wording with `{named}` gaps; the screen and the AI each fill the same gaps from
 * the same figures. Neither holds a second copy of the words.
 *
 * A token with no figure resolves to "—" rather than being left alone: a brace on a screen
 * is the very fault item 4.34 was raised for, and it must not be able to come back through
 * a missing value.
 *
 * @param {string} line - a Coach line, possibly containing `{token}` gaps.
 * @param {Object<string, {value: *, format: string}>} figures
 * @returns {string}
 */
function resolveCoachLine (line, figures) {
  if (typeof line !== 'string') { return '' }
  const f = figures || {}
  return line.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, function (whole, token) {
    return renderFigure(f[token])
  })
}

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
 *
 * Each carries `coachFigures` — the real numbers behind the `{gaps}` in its Coach lines,
 * as raw values with a format tag. The Model Guide screen fills the gaps in the firm's own
 * currency; see `server/utils/reportModelFigures.js` for why they are not filled here.
 *
 * A model with no figures gets `{}`, which is normal: several Coach entries describe the
 * pattern of a verdict rather than one reading, and carry no gaps to fill.
 *
 * @returns {object[]}
 */
function listReportModels () {
  const models = loadReportModels().models || []
  const figures = loadCoachFigures()
  return models.map(function (m) {
    return Object.assign({}, m, { coachFigures: figures[m.route] || {} })
  })
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
    // What the screen actually puts in front of the advisor: the figures below the
    // headline four, and the reading the Coach panel gives with them. `keyOutputs` names
    // the numbers; these say what the advisor will be looking at.
    if (m.alsoOnScreen) {
      lines.push(`- **Also on the screen:** ${m.alsoOnScreen}`)
    }
    if ((m.coach || []).length) {
      // 🔴 THE HEADING NAMES THE FIGURES AS SAMPLES, IN THE SAME BREATH AS THE NUMBER.
      // Ruled by Mike, 2026-08-22, on the risk 4.34 introduced: until that day the AI read
      // "[amount]" here and had nothing to quote. It now reads "$4,420,963", and while
      // every one of these models states "illustrative teaching figures" in its limits and
      // the list instruction forbids passing them off as the client's, that protection
      // depended on the model joining two separate sentences. This puts the caveat where
      // the number is. It changes no rule.
      const heading = m.coachIsNotAPanel
        ? 'What the screen tells the advisor, on its own sample figures'
        : "What the Coach panel says, on the screen's own sample figures"
      // 🔴 RESOLVED, NOT RAW. Until 2026-08-22 the AI was handed the sentence with its
      // numbers still missing — "takes [n] days … about [amount] more revenue a year" —
      // so it could repeat a reading with no figures in it to an advisor. Item 4.34.
      const resolved = m.coach.map(line => resolveCoachLine(line, m.coachFigures))
      lines.push(`- **${heading}:** ${resolved.join(' ')}`)
    }
    // 🔴 Never optional. A model recommended without its limits is how an advisor
    // promises a client something the screen does not do.
    lines.push(`- **What it does NOT cover:** ${m.limits}`)
    lines.push('')
  })

  return lines.join('\n').trim()
}

module.exports = {
  loadReportModels,
  listReportModels,
  formatReportModelsForPrompt,
  resolveCoachLine,
  renderFigure
}
