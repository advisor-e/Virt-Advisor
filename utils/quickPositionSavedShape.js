'use strict'

/**
 * @file The Quick Position report's state, and its saved-report shape (item 4.62, Brief §5).
 * @module utils/quickPositionSavedShape
 *
 * The report screen holds its figures three ways at once: the numbers (`inputs`), where
 * each balance-sheet figure came from (`sources`, file or entered — the intake contract's
 * promise that an assumption never passes as a fact), and the expense lines a Profit and
 * Loss supplied. A saved report is one flat row, so this file is the translation both
 * ways, and it is also where the screen's opening state is built, so that the sample
 * company lives in one place.
 *
 * A SAVED ROW IS HOSTILE. A client wrote it and it comes back onto an advisor's screen,
 * so each figure is taken only in its own shape — a number where the screen holds a
 * number, one of the two source words, the expense names and amounts only as two lists
 * of the same length. A figure that fails keeps what the screen already held.
 *
 * THE FILE BADGE AND A CLIENT EDIT (ruled by Mike 2026-09-04): a figure the client
 * changed shows the `client` badge IN PLACE of `from file`, never beside it — the number
 * is no longer the file's. The saved row keeps the figure's source, so Restore brings the
 * advisor's version back with its file tags intact. The screen applies that rule; this
 * file only carries the sources faithfully.
 */

/**
 * The source model's sample company — what the report opens on before any of the
 * client's own numbers arrive (contract rule 3).
 */
const SAMPLE_FIGURES = {
  cash: 296155,
  debtors: 154906,
  stock: 25847,
  fixedAssets: 30000,
  creditors: 63000,
  wagesDue: 32000
}

/** The balance-sheet figures the intake confirms, each with a provenance. */
const FIGURE_KEYS = ['cash', 'debtors', 'stock', 'fixedAssets', 'creditors', 'wagesDue']

/** The report's own controls, with the sample's settings. */
const DEFAULT_CONTROLS = {
  cashFactor: 100,
  debtorsFactor: 80,
  stockFactor: 0,
  fixedAssetsFactor: 100,
  monthlyFixedCosts: 20000,
  monthlyDrawings: 0,
  monthlyLoanRepayments: 0,
  personalSavings: 38000,
  quickInvestments: 12000,
  raisedCapital: 0,
  grossMarginPct: 23,
  discountPct: 5
}

const SOURCES = ['file', 'entered']
const SOURCE_PREFIX = 'source.'
const MAX_LINES = 120
const MAX_NAME = 200

const isNumber = v => typeof v === 'number' && Number.isFinite(v)

/**
 * The report's opening state from the intake's confirmed payload — or from nothing, on
 * the sample company with everything tagged entered.
 * @param {object|null} seed - { figures: {k: {value, source}}, serviceBusiness, expenseLines }
 * @returns {{inputs: object, sources: object, serviceBusiness: boolean, expenseLines: Array|null}}
 */
function initialState (seed) {
  const s = seed || {}
  const fig = s.figures || {}
  const inputs = {}
  const sources = {}
  FIGURE_KEYS.forEach((k) => {
    inputs[k] = fig[k] && isNumber(fig[k].value) ? fig[k].value : SAMPLE_FIGURES[k]
    sources[k] = fig[k] && SOURCES.includes(fig[k].source) ? fig[k].source : 'entered'
  })
  Object.assign(inputs, DEFAULT_CONTROLS)
  // R11: tracks the "use this figure" button — a file-derived average keeps its tag.
  sources.monthlyFixedCosts = 'entered'
  return {
    inputs,
    sources,
    serviceBusiness: !!s.serviceBusiness,
    expenseLines: Array.isArray(s.expenseLines) ? s.expenseLines.map(l => ({ name: l.name, amount: l.amount })) : null
  }
}

/**
 * The flat saved row: every input under its own name, every source under `source.<k>`,
 * the service-business switch, and the expense lines as two lists.
 * @param {{inputs: object, sources: object, serviceBusiness: boolean, expenseLines: Array|null}} state
 * @returns {object}
 */
function flattenQuickPosition (state) {
  const out = {}
  const inputs = state.inputs || {}
  Object.keys(inputs).forEach((k) => { out[k] = inputs[k] })
  const sources = state.sources || {}
  Object.keys(sources).forEach((k) => { out[SOURCE_PREFIX + k] = sources[k] })
  out.serviceBusiness = !!state.serviceBusiness
  if (Array.isArray(state.expenseLines)) {
    out.expenseNames = state.expenseLines.map(l => String(l.name))
    out.expenseAmounts = state.expenseLines.map(l => l.amount)
  }
  return out
}

/**
 * A saved row applied over the screen's current state, each figure only in its own
 * shape. Returns a new state; the one passed in is not touched.
 * @param {{inputs: object, sources: object, serviceBusiness: boolean, expenseLines: Array|null}} state
 * @param {object} row - hostile
 * @returns {{inputs: object, sources: object, serviceBusiness: boolean, expenseLines: Array|null}}
 */
function applySavedQuickPosition (state, row) {
  const src = row && typeof row === 'object' && !Array.isArray(row) ? row : {}
  const inputs = Object.assign({}, state.inputs)
  const sources = Object.assign({}, state.sources)
  Object.keys(inputs).forEach((k) => { if (isNumber(src[k])) { inputs[k] = src[k] } })
  Object.keys(sources).forEach((k) => {
    const v = src[SOURCE_PREFIX + k]
    if (SOURCES.includes(v)) { sources[k] = v }
  })
  const serviceBusiness = typeof src.serviceBusiness === 'boolean' ? src.serviceBusiness : !!state.serviceBusiness
  let expenseLines = Array.isArray(state.expenseLines) ? state.expenseLines.map(l => ({ name: l.name, amount: l.amount })) : null
  const names = src.expenseNames
  const amounts = src.expenseAmounts
  if (Array.isArray(names) && Array.isArray(amounts) && names.length === amounts.length && names.length <= MAX_LINES &&
      names.every(n => typeof n === 'string' && n.length <= MAX_NAME) && amounts.every(isNumber)) {
    expenseLines = names.map((name, i) => ({ name, amount: amounts[i] }))
  }
  return { inputs, sources, serviceBusiness, expenseLines }
}

/**
 * The intake's restore payload for a state, so the advisor stepping back from a loaded
 * report finds the confirm table as saved. Nothing a file alone knows (the company
 * name, the income total) is in a saved row, so both are null here.
 * @param {{inputs: object, sources: object, serviceBusiness: boolean, expenseLines: Array|null}} state
 * @returns {object}
 */
function seedFromState (state) {
  const figures = {}
  FIGURE_KEYS.forEach((k) => { figures[k] = { value: state.inputs[k], source: state.sources[k] } })
  return {
    figures,
    serviceBusiness: !!state.serviceBusiness,
    expenseLines: Array.isArray(state.expenseLines) ? state.expenseLines.map(l => ({ name: l.name, amount: l.amount })) : null,
    incomeTotal: null,
    companyName: null
  }
}

module.exports = {
  SAMPLE_FIGURES,
  FIGURE_KEYS,
  initialState,
  flattenQuickPosition,
  applySavedQuickPosition,
  seedFromState
}
