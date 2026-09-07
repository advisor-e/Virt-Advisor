/**
 * The Business Performance Report's saved row — the flat shape the saved-report store
 * admits (numbers, booleans, strings up to 200 characters, and homogeneous arrays of
 * either), and the two functions between it and the page's own state (item 4.70,
 * `business-performance-report.md` P8; the store is `server/utils/savedReports.js`).
 *
 * Flat by the store's rule, so every confirmed line becomes two keys — its value and where
 * it came from — because a figure saved without its provenance would come back as nobody's.
 *
 * CommonJS so the page and its test share one copy. No DOM, no I/O.
 */

'use strict'

const { LINES } = require('../server/report/intake/dashboardReportsAssembler')

/** How many characters one line of the advisor's words may hold — the store's own limit. */
const MAX_TEXT = 200

/** The five ageing bands, in table order. */
const AGEING_BANDS = ['d0_30', 'd31_60', 'd61_90', 'd91_180', 'd180plus']

/**
 * The optional pages the add-a-page dropdown lists, in its order — the drawing's
 * (`design/mockups/business-performance-report-optional-pages.html`, Mike 2026-09-08). A
 * saved row naming a page no longer offered (the three model-reuse pages that came off the
 * list that day) is filtered on the way in and out, so it can neither print nor persist.
 */
const OPTIONAL_PAGES = ['profitBridge', 'cashBridge', 'profitSensitivity', 'stockVsAccounts', 'outlook', 'salesVolatility', 'loanServicing', 'taxProvision']

/** The sources a confirmed line may carry. */
const SOURCES = ['file', 'entered']

/** A blank year of lines: every value null, every source the advisor's. */
function emptyYear () {
  const figures = {}
  LINES.forEach((k) => { figures[k] = { value: null, source: 'entered' } })
  return { balanceSheetDate: null, profitLossDate: null, figures }
}

/**
 * The page's state before anything is dropped or typed.
 * @returns {object}
 */
function emptyState () {
  return {
    setup: { financialYear: '', dateIssued: '', preparedBy: '' },
    current: emptyYear(),
    prior: emptyYear(),
    hasPrior: false,
    inventory: { slowObsolete: null, ageing: [null, null, null, null, null] },
    words: {
      summary: '',
      wentWell: ['', ''],
      watch: ['', ''],
      profitInsight: '',
      cashWatch: '',
      steps: [{ title: '', body: '' }, { title: '', body: '' }, { title: '', body: '' }],
      nextReview: ''
    },
    pages: { added: [] }
  }
}

/** @param {*} v @returns {number|null} */
function numOrNull (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** @param {*} v @returns {string} a string cut to the store's limit */
function text (v) {
  return String(v === null || v === undefined ? '' : v).slice(0, MAX_TEXT)
}

/**
 * The page's state as the flat row the store admits.
 * @param {object} state - as `emptyState()` shapes it
 * @returns {object}
 */
function flattenDashboardReport (state) {
  const s = state && typeof state === 'object' ? state : emptyState()
  const row = {}
  const setup = s.setup || {}
  row.setup_financialYear = text(setup.financialYear)
  row.setup_dateIssued = text(setup.dateIssued)
  row.setup_preparedBy = text(setup.preparedBy)
  row.hasPrior = Boolean(s.hasPrior)
  ;[['cur', s.current], ['pri', s.prior]].forEach(([prefix, year]) => {
    const y = year || emptyYear()
    row[prefix + '_bsDate'] = text(y.balanceSheetDate)
    row[prefix + '_plDate'] = text(y.profitLossDate)
    LINES.forEach((k) => {
      const l = (y.figures && y.figures[k]) || {}
      row[prefix + '_' + k] = numOrNull(l.value)
      row[prefix + '_' + k + '_src'] = SOURCES.includes(l.source) ? l.source : 'entered'
    })
  })
  const inv = s.inventory || {}
  row.inv_slowObsolete = numOrNull(inv.slowObsolete)
  row.inv_ageing = AGEING_BANDS.map((b, i) => numOrNull(Array.isArray(inv.ageing) ? inv.ageing[i] : null))
  const w = s.words || {}
  row.words_summary = text(w.summary)
  row.words_wentWell = [0, 1].map(i => text(Array.isArray(w.wentWell) ? w.wentWell[i] : ''))
  row.words_watch = [0, 1].map(i => text(Array.isArray(w.watch) ? w.watch[i] : ''))
  row.words_profitInsight = text(w.profitInsight)
  row.words_cashWatch = text(w.cashWatch)
  const steps = Array.isArray(w.steps) ? w.steps : []
  row.steps_title = [0, 1, 2].map(i => text(steps[i] && steps[i].title))
  row.steps_body = [0, 1, 2].map(i => text(steps[i] && steps[i].body))
  row.words_nextReview = text(w.nextReview)
  row.pages_added = (Array.isArray(s.pages && s.pages.added) ? s.pages.added : []).filter(p => OPTIONAL_PAGES.includes(p))
  return row
}

/**
 * A saved row loaded back over the page's state. Only the keys this shape knows are read,
 * each in its own type; anything else in the row is ignored, so a row from a later or
 * earlier version loads what it can.
 * @param {object} state - the state to load over (usually `emptyState()`)
 * @param {object} row - the saved inputs
 * @returns {object} a new state
 */
function applySavedDashboardReport (state, row) {
  const base = state && typeof state === 'object' ? state : emptyState()
  const r = row && typeof row === 'object' ? row : {}
  const next = JSON.parse(JSON.stringify(Object.assign(emptyState(), base)))
  const str = (k, fallback) => (typeof r[k] === 'string' ? r[k] : fallback)
  const strs = (k, n, fallback) => [...Array(n).keys()].map(i => (Array.isArray(r[k]) && typeof r[k][i] === 'string' ? r[k][i] : fallback[i]))

  next.setup.financialYear = str('setup_financialYear', next.setup.financialYear)
  next.setup.dateIssued = str('setup_dateIssued', next.setup.dateIssued)
  next.setup.preparedBy = str('setup_preparedBy', next.setup.preparedBy)
  if (typeof r.hasPrior === 'boolean') { next.hasPrior = r.hasPrior }
  ;[['cur', 'current'], ['pri', 'prior']].forEach(([prefix, key]) => {
    const y = next[key]
    y.balanceSheetDate = str(prefix + '_bsDate', y.balanceSheetDate) || null
    y.profitLossDate = str(prefix + '_plDate', y.profitLossDate) || null
    LINES.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(r, prefix + '_' + k)) {
        y.figures[k].value = numOrNull(r[prefix + '_' + k])
      }
      const src = r[prefix + '_' + k + '_src']
      if (SOURCES.includes(src)) { y.figures[k].source = src }
    })
  })
  if (Object.prototype.hasOwnProperty.call(r, 'inv_slowObsolete')) { next.inventory.slowObsolete = numOrNull(r.inv_slowObsolete) }
  if (Array.isArray(r.inv_ageing)) { next.inventory.ageing = AGEING_BANDS.map((b, i) => numOrNull(r.inv_ageing[i])) }
  next.words.summary = str('words_summary', next.words.summary)
  next.words.wentWell = strs('words_wentWell', 2, next.words.wentWell)
  next.words.watch = strs('words_watch', 2, next.words.watch)
  next.words.profitInsight = str('words_profitInsight', next.words.profitInsight)
  next.words.cashWatch = str('words_cashWatch', next.words.cashWatch)
  const titles = strs('steps_title', 3, next.words.steps.map(s => s.title))
  const bodies = strs('steps_body', 3, next.words.steps.map(s => s.body))
  next.words.steps = [0, 1, 2].map(i => ({ title: titles[i], body: bodies[i] }))
  next.words.nextReview = str('words_nextReview', next.words.nextReview)
  if (Array.isArray(r.pages_added)) { next.pages.added = r.pages_added.filter(p => OPTIONAL_PAGES.includes(p)) }
  return next
}

/**
 * The body the pages route takes, from the page's state.
 * @param {object} state
 * @returns {object}
 */
function pagesRequestFrom (state) {
  const s = state && typeof state === 'object' ? state : emptyState()
  const lines = (year) => {
    const out = {}
    LINES.forEach((k) => {
      const l = year && year.figures && year.figures[k]
      if (l && numOrNull(l.value) !== null) { out[k] = { value: numOrNull(l.value), source: l.source } }
    })
    return out
  }
  return {
    current: lines(s.current),
    prior: s.hasPrior ? lines(s.prior) : null,
    currentDates: { balanceSheet: s.current && s.current.balanceSheetDate, profitLoss: s.current && s.current.profitLossDate },
    priorDates: { balanceSheet: s.prior && s.prior.balanceSheetDate, profitLoss: s.prior && s.prior.profitLossDate },
    inventory: {
      slowObsolete: numOrNull(s.inventory && s.inventory.slowObsolete),
      ageing: AGEING_BANDS.map((b, i) => numOrNull(s.inventory && Array.isArray(s.inventory.ageing) ? s.inventory.ageing[i] : null))
    }
  }
}

module.exports = {
  MAX_TEXT,
  AGEING_BANDS,
  OPTIONAL_PAGES,
  SOURCES,
  emptyYear,
  emptyState,
  flattenDashboardReport,
  applySavedDashboardReport,
  pagesRequestFrom
}
