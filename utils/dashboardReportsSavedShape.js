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

/**
 * How many categories or locations of a read stock export the row keeps — the store's own
 * array cap is 120, and the reader sorts largest first, so what is dropped is the tail.
 */
const MAX_STOCK_GROUPS = 60

/** The per-group figures a saved stock export keeps, each as one array under the store's rule. */
const STOCK_GROUP_FIELDS = ['value', 'lines', 'onHand', 'allocated', 'available']

/**
 * How many months of the by-month series a row keeps (stage 5): two files give at most
 * twenty-four, and the store's array cap is 120. The newest months are kept.
 */
const MAX_MONTHS = 36

/** The per-month figures of the by-month Profit and Loss, each one array in the row. */
const PL_MONTH_FIELDS = ['sales', 'costOfSales', 'otherIncome', 'operatingExpenses']

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
    setup: { financialYear: '', dateIssued: '', preparedBy: '', industryCode: '', industryName: '', sizeBand: '' },
    current: emptyYear(),
    prior: emptyYear(),
    hasPrior: false,
    // Stage 5: the year before last (trend table only) and the by-month series.
    earlier: emptyYear(),
    hasEarlier: false,
    monthly: { plDate: null, bsDate: null, months: [], bank: [] },
    inventory: { slowObsolete: null, ageing: [null, null, null, null, null], stockFile: null },
    words: {
      summary: '',
      wentWell: ['', ''],
      watch: ['', ''],
      profitInsight: '',
      cashWatch: '',
      steps: [{ title: '', body: '' }, { title: '', body: '' }, { title: '', body: '' }],
      nextReview: '',
      /**
       * Stage 6: the AI draft the three steps started from, as it arrived — `null` when
       * the advisor typed them. Kept on the row so the "edited" marks survive a reload;
       * the approval itself is the server's record, never a flag here.
       */
      draft: null
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
  // Stage 3: the ANZSIC06 class and the size band. '' for the band means "from the revenue".
  row.setup_industryCode = text(setup.industryCode).toUpperCase().slice(0, 12)
  row.setup_industryName = text(setup.industryName)
  row.setup_sizeBand = ['micro', 'small', 'medium', 'large'].includes(setup.sizeBand) ? setup.sizeBand : ''
  row.hasPrior = Boolean(s.hasPrior)
  row.hasEarlier = Boolean(s.hasEarlier)
  ;[['cur', s.current], ['pri', s.prior], ['ear', s.earlier]].forEach(([prefix, year]) => {
    const y = year || emptyYear()
    row[prefix + '_bsDate'] = text(y.balanceSheetDate)
    row[prefix + '_plDate'] = text(y.profitLossDate)
    LINES.forEach((k) => {
      const l = (y.figures && y.figures[k]) || {}
      row[prefix + '_' + k] = numOrNull(l.value)
      row[prefix + '_' + k + '_src'] = SOURCES.includes(l.source) ? l.source : 'entered'
    })
  })
  // Stage 5: the by-month series, newest months kept, completeness as 1/0 (the store takes
  // numbers, blanks and short names in a list, not booleans). Written only when read.
  const mo = s.monthly && typeof s.monthly === 'object' ? s.monthly : {}
  const plMonths = (Array.isArray(mo.months) ? mo.months : []).filter(m => m && Number.isFinite(m.ordinal)).slice(-MAX_MONTHS)
  if (plMonths.length) {
    row.m_plDate = text(mo.plDate)
    row.m_labels = plMonths.map(m => text(m.label))
    row.m_ordinals = plMonths.map(m => m.ordinal)
    PL_MONTH_FIELDS.forEach((f) => { row['m_' + f] = plMonths.map(m => numOrNull(m[f])) })
    row.m_complete = plMonths.map(m => (m.complete === false ? 0 : 1))
  }
  const bankMonths = (Array.isArray(mo.bank) ? mo.bank : []).filter(m => m && Number.isFinite(m.ordinal)).slice(-MAX_MONTHS)
  if (bankMonths.length) {
    row.mb_bsDate = text(mo.bsDate)
    row.mb_labels = bankMonths.map(m => text(m.label))
    row.mb_ordinals = bankMonths.map(m => m.ordinal)
    row.mb_bank = bankMonths.map(m => numOrNull(m.bank))
    row.mb_complete = bankMonths.map(m => (m.complete === false ? 0 : 1))
  }
  const inv = s.inventory || {}
  row.inv_slowObsolete = numOrNull(inv.slowObsolete)
  row.inv_ageing = AGEING_BANDS.map((b, i) => numOrNull(Array.isArray(inv.ageing) ? inv.ageing[i] : null))
  // Stage 4: the read stock export, flat. Written only when a file was read, so a row saved
  // before the reader existed has no stock keys and loads exactly as it was. Shares are not
  // saved — they are rebuilt from the totals on the way back, so the two cannot disagree.
  const sf = inv.stockFile && typeof inv.stockFile === 'object' && numOrNull(inv.stockFile.totalValue) !== null ? inv.stockFile : null
  if (sf) {
    row.stock_package = text(sf.package)
    row.stock_costBasis = text(sf.costBasis)
    row.stock_currency = text(sf.currency).toUpperCase().slice(0, 3)
    row.stock_currencyAssumed = sf.currencyAssumed === true
    row.stock_lineCount = numOrNull(sf.lineCount)
    row.stock_linesWithoutValue = numOrNull(sf.linesWithoutValue)
    row.stock_totalValue = numOrNull(sf.totalValue)
    row.stock_allocatedValue = numOrNull(sf.allocatedValue)
    row.stock_availableValue = numOrNull(sf.availableValue)
    row.stock_onOrderValue = numOrNull(sf.onOrderValue)
    const u = sf.units && typeof sf.units === 'object' ? sf.units : {}
    row.stock_onHand = numOrNull(u.onHand)
    row.stock_allocated = numOrNull(u.allocated)
    row.stock_available = numOrNull(u.available)
    row.stock_onOrder = numOrNull(u.onOrder)
    ;[['cat', sf.categories], ['loc', sf.locations]].forEach(([prefix, list]) => {
      const groups = (Array.isArray(list) ? list : []).filter(g => g && typeof g === 'object').slice(0, MAX_STOCK_GROUPS)
      row['stock_' + prefix + 'Names'] = groups.map(g => text(g.name))
      STOCK_GROUP_FIELDS.forEach((f) => { row['stock_' + prefix + '_' + f] = groups.map(g => numOrNull(g[f])) })
    })
  }
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
  // Stage 6: the draft as it arrived, written only when there was one.
  if (w.draft && typeof w.draft === 'object' && Array.isArray(w.draft.steps)) {
    row.draft_number = numOrNull(w.draft.number) || 0
    row.draft_runId = text(w.draft.runId)
    row.draft_title = [0, 1, 2].map(i => text(w.draft.steps[i] && w.draft.steps[i].title))
    row.draft_body = [0, 1, 2].map(i => text(w.draft.steps[i] && w.draft.steps[i].body))
  }
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
  // Stage 3's three fields are set only when the row carries them, so a row saved before
  // the finder existed loads exactly as it was.
  if (typeof r.setup_industryCode === 'string' && r.setup_industryCode) {
    next.setup.industryCode = r.setup_industryCode.toUpperCase().slice(0, 12)
    next.setup.industryName = str('setup_industryName', '')
    next.setup.sizeBand = ['micro', 'small', 'medium', 'large'].includes(r.setup_sizeBand) ? r.setup_sizeBand : ''
  }
  if (typeof r.hasPrior === 'boolean') { next.hasPrior = r.hasPrior }
  if (typeof r.hasEarlier === 'boolean') { next.hasEarlier = r.hasEarlier }
  ;[['cur', 'current'], ['pri', 'prior'], ['ear', 'earlier']].forEach(([prefix, key]) => {
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
  // Stage 5: the by-month series, set only when the row carries one.
  if (Array.isArray(r.m_ordinals) && r.m_ordinals.length) {
    next.monthly.plDate = str('m_plDate', '') || null
    next.monthly.months = r.m_ordinals.map((o, i) => {
      const m = { label: text(Array.isArray(r.m_labels) ? r.m_labels[i] : ''), ordinal: numOrNull(o), complete: !(Array.isArray(r.m_complete) && r.m_complete[i] === 0), reason: null }
      PL_MONTH_FIELDS.forEach((f) => { m[f] = numOrNull(Array.isArray(r['m_' + f]) ? r['m_' + f][i] : null) })
      return m
    }).filter(m => m.ordinal !== null)
  }
  if (Array.isArray(r.mb_ordinals) && r.mb_ordinals.length) {
    next.monthly.bsDate = str('mb_bsDate', '') || null
    next.monthly.bank = r.mb_ordinals.map((o, i) => ({
      label: text(Array.isArray(r.mb_labels) ? r.mb_labels[i] : ''),
      ordinal: numOrNull(o),
      bank: numOrNull(Array.isArray(r.mb_bank) ? r.mb_bank[i] : null),
      complete: !(Array.isArray(r.mb_complete) && r.mb_complete[i] === 0),
      reason: null
    })).filter(m => m.ordinal !== null)
  }
  if (Object.prototype.hasOwnProperty.call(r, 'inv_slowObsolete')) { next.inventory.slowObsolete = numOrNull(r.inv_slowObsolete) }
  if (Array.isArray(r.inv_ageing)) { next.inventory.ageing = AGEING_BANDS.map((b, i) => numOrNull(r.inv_ageing[i])) }
  // Set only when the row carries a read export, so a row saved before the reader existed
  // leaves the state exactly as it was.
  const stockFile = stockFileFrom(r)
  if (stockFile) { next.inventory.stockFile = stockFile }
  next.words.summary = str('words_summary', next.words.summary)
  next.words.wentWell = strs('words_wentWell', 2, next.words.wentWell)
  next.words.watch = strs('words_watch', 2, next.words.watch)
  next.words.profitInsight = str('words_profitInsight', next.words.profitInsight)
  next.words.cashWatch = str('words_cashWatch', next.words.cashWatch)
  const titles = strs('steps_title', 3, next.words.steps.map(s => s.title))
  const bodies = strs('steps_body', 3, next.words.steps.map(s => s.body))
  next.words.steps = [0, 1, 2].map(i => ({ title: titles[i], body: bodies[i] }))
  next.words.nextReview = str('words_nextReview', next.words.nextReview)
  if (Array.isArray(r.draft_title) && Array.isArray(r.draft_body)) {
    const dTitles = strs('draft_title', 3, ['', '', ''])
    const dBodies = strs('draft_body', 3, ['', '', ''])
    next.words.draft = {
      number: numOrNull(r.draft_number) || 0,
      runId: str('draft_runId', ''),
      steps: [0, 1, 2].map(i => ({ title: dTitles[i], body: dBodies[i] }))
    }
  }
  if (Array.isArray(r.pages_added)) { next.pages.added = r.pages_added.filter(p => OPTIONAL_PAGES.includes(p)) }
  return next
}

/**
 * The read stock export rebuilt from a saved row, or null when the row holds none.
 * Shares are recomputed from the totals; the store never held them.
 * @param {object} r - the saved inputs
 * @returns {object|null}
 */
function stockFileFrom (r) {
  const total = numOrNull(r.stock_totalValue)
  if (typeof r.stock_package !== 'string' || !r.stock_package || total === null) { return null }
  const groups = (prefix) => {
    const names = Array.isArray(r['stock_' + prefix + 'Names']) ? r['stock_' + prefix + 'Names'] : []
    return names.slice(0, MAX_STOCK_GROUPS).map((name, i) => {
      const g = { name: text(name) }
      STOCK_GROUP_FIELDS.forEach((f) => {
        const arr = r['stock_' + prefix + '_' + f]
        g[f] = numOrNull(Array.isArray(arr) ? arr[i] : null)
      })
      g.share = total === 0 || g.value === null ? null : g.value / total
      return g
    })
  }
  const onHand = numOrNull(r.stock_onHand)
  const allocated = numOrNull(r.stock_allocated)
  return {
    package: text(r.stock_package),
    costBasis: text(r.stock_costBasis),
    currency: text(r.stock_currency),
    currencyAssumed: r.stock_currencyAssumed === true,
    lineCount: numOrNull(r.stock_lineCount),
    linesWithoutValue: numOrNull(r.stock_linesWithoutValue),
    totalValue: total,
    allocatedValue: numOrNull(r.stock_allocatedValue),
    availableValue: numOrNull(r.stock_availableValue),
    onOrderValue: numOrNull(r.stock_onOrderValue),
    units: { onHand, allocated, available: numOrNull(r.stock_available), onOrder: numOrNull(r.stock_onOrder) },
    allocatedShare: onHand === null || onHand === 0 || allocated === null ? null : allocated / onHand,
    categories: groups('cat'),
    locations: groups('loc')
  }
}

/**
 * The body the pages route takes, from the page's state.
 * @param {object} state
 * @param {string} [clientRef] - whose saved report this is, for the ready check (stage 6)
 * @returns {object}
 */
function pagesRequestFrom (state, clientRef) {
  const s = state && typeof state === 'object' ? state : emptyState()
  const lines = (year) => {
    const out = {}
    LINES.forEach((k) => {
      const l = year && year.figures && year.figures[k]
      if (l && numOrNull(l.value) !== null) { out[k] = { value: numOrNull(l.value), source: l.source } }
    })
    return out
  }
  const mo = s.monthly && typeof s.monthly === 'object' ? s.monthly : {}
  const plMonths = Array.isArray(mo.months) ? mo.months : []
  const bankMonths = Array.isArray(mo.bank) ? mo.bank : []
  return {
    current: lines(s.current),
    prior: s.hasPrior ? lines(s.prior) : null,
    earlier: s.hasEarlier ? lines(s.earlier) : null,
    currentDates: { balanceSheet: s.current && s.current.balanceSheetDate, profitLoss: s.current && s.current.profitLossDate },
    priorDates: { balanceSheet: s.prior && s.prior.balanceSheetDate, profitLoss: s.prior && s.prior.profitLossDate },
    monthly: plMonths.length || bankMonths.length
      ? { profitLoss: plMonths.length ? { months: plMonths } : null, bank: bankMonths.length ? { months: bankMonths } : null }
      : null,
    industry: s.setup && s.setup.industryCode ? { code: s.setup.industryCode, band: s.setup.sizeBand || null } : null,
    // Stage 6: the three lines as they stand, so the route can say whether they are ticked
    // ready. The clientRef names whose record to read; it is never sent to a model.
    nextSteps: {
      clientRef: typeof clientRef === 'string' && clientRef ? clientRef : null,
      steps: [0, 1, 2].map(i => ({ title: text(s.words && s.words.steps && s.words.steps[i] && s.words.steps[i].title), body: text(s.words && s.words.steps && s.words.steps[i] && s.words.steps[i].body) }))
    },
    inventory: {
      slowObsolete: numOrNull(s.inventory && s.inventory.slowObsolete),
      ageing: AGEING_BANDS.map((b, i) => numOrNull(s.inventory && Array.isArray(s.inventory.ageing) ? s.inventory.ageing[i] : null)),
      stockFile: s.inventory && s.inventory.stockFile && typeof s.inventory.stockFile === 'object' ? s.inventory.stockFile : null
    }
  }
}

module.exports = {
  MAX_TEXT,
  MAX_STOCK_GROUPS,
  MAX_MONTHS,
  PL_MONTH_FIELDS,
  AGEING_BANDS,
  OPTIONAL_PAGES,
  SOURCES,
  emptyYear,
  emptyState,
  flattenDashboardReport,
  applySavedDashboardReport,
  pagesRequestFrom
}
