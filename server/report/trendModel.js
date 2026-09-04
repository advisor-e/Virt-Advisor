'use strict'

/**
 * @file The Three-Way Forecast's two-year trend read — six measures computed from last
 *   year's and this year's annual accounts, each banded against the firm's thresholds.
 * @module server/report/trendModel
 *
 * Item 4.61 phase (b). Drawn as `design/mockups/three-way-forecast-trend.html` and
 * approved by Mike 2026-09-03 with eight rulings; the ones this module implements are
 * numbered below where they bite.
 *
 * 🔴 NOTHING HERE CHANGES A FORECAST FIGURE. This is a READ, and it must stay one. The
 * forecast's own inputs are the advisor's; these six measures describe the ground the
 * forecast starts from and feed nothing. In particular the day-counts must NEVER be used
 * to fill in a collection profile — a Xero export records no money-received dates
 * (owner-verified 2026-07-16), so a debtor-day average is a description of a year, not a
 * record of when money moved.
 *
 * TWO BASES, RULED 2026-09-03 (rulings 4, 6 and 7):
 *   - the three DAY-COUNTS band on this year's LEVEL, each with its own thresholds;
 *   - the three PERCENTAGE measures band on the MOVEMENT between the two years.
 * Ruling 4 originally said everything banded on movement and was superseded the same hour
 * by Mike's own numbers — "0-35 = green, 36-45 = orange, 46+ = red" runs continuously from
 * zero and is therefore a level. Read as a movement, 46 would have required debtor days to
 * worsen by forty-six days in one year to turn red: a band that could never fire.
 *
 * NEVER FABRICATE, AND NEVER DIVIDE BY A FIGURE THE FILE DID NOT CARRY. A measure whose
 * inputs are absent — or whose denominator is zero or negative — is returned with
 * `computable: false` and is left off the screen entirely, with the reason stated once.
 * A zero would read as "nothing owed" and a dash would leave the advisor to guess.
 */

/** Days in the year the day-counts are measured over. The workbook's own convention. */
const DAYS_IN_YEAR = 365

/**
 * The six measures, in the order they appear on screen.
 *
 * `compare` says how a movement threshold is read, and the three shapes are Mike's own
 * wording on the approved drawing — "growth falls below", "falls by more than", "rises by
 * more than". They are not interchangeable: sales is banded on the growth figure itself,
 * the other two on the size of the move.
 */
// `needs` names the raw figures a measure cannot be worked out without, in the order they
// are worth reporting. It is what lets an absent row SAY WHY it is absent rather than
// leaving a short table the advisor has to account for — the approved drawing's own rule:
// never a zero, and never a dash to interpret.
const MEASURES = [
  { key: 'salesGrowth', basis: 'movement', compare: 'below', unit: 'percent', worseWhen: 'down', needs: ['sales'] },
  { key: 'grossMargin', basis: 'movement', compare: 'fallBy', unit: 'points', worseWhen: 'down', needs: ['sales', 'costOfSales'] },
  { key: 'overheadRatio', basis: 'movement', compare: 'riseBy', unit: 'points', worseWhen: 'up', needs: ['sales', 'operatingExpenses'] },
  { key: 'debtorDays', basis: 'level', unit: 'days', worseWhen: 'up', needs: ['sales', 'accountsReceivable'] },
  // 🔴 RULING 8, MIKE, 2026-09-03: HIGH creditor days is the bad direction — a business
  // stretching its suppliers, which is the signal a lender is hunting for. It was the one
  // genuinely ambiguous measure (rising can equally mean better negotiated terms) and was
  // settled BY his level scale rather than answered separately: on a scale whose high end
  // is red, stretching suppliers is what the red end means. A firm that reads it
  // differently clears the two thresholds, which reports the row and bands it never.
  { key: 'creditorDays', basis: 'level', unit: 'days', worseWhen: 'up', needs: ['costOfSales', 'accountsPayable'] },
  { key: 'stockDays', basis: 'level', unit: 'days', worseWhen: 'up', needs: ['costOfSales', 'inventory'] }
]

/** The measures a Balance Sheet is needed for — the half that goes missing on its own. */
const BALANCE_SHEET_MEASURES = ['debtorDays', 'creditorDays', 'stockDays']

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

/** A finite number, or null. Guards every figure arriving from a parsed file. */
function num (v) {
  return (typeof v === 'number' && isFinite(v)) ? v : null
}

/**
 * The period END a report's own date line names, as `{ year, month }`.
 *
 * Both are read from the LAST occurrence in the line, because every shape the packages
 * produce puts the end last: "As at 31 March 2026", "For the year ended 31 March 2026",
 * "1 April 2025 to 31 March 2026", "January - December 2026".
 *
 * `month` is 1-12, or null when the line names no month. It is what makes the
 * comparability check real: two reports a year apart end in the same month, and two that
 * do not are either different lengths or not consecutive — and a nine-month period
 * compared against a twelve-month one produces a growth figure that is completely
 * believable and completely wrong.
 *
 * @param {string|null} reportDate - the report's own date line, as the parser read it.
 * @returns {{year: number|null, month: number|null}}
 */
function periodEndOf (reportDate) {
  const out = { year: null, month: null }
  if (!reportDate) { return out }
  const text = String(reportDate)

  const years = text.match(/\b(?:19|20)\d{2}\b/g)
  if (years) { out.year = parseInt(years[years.length - 1], 10) }

  let bestAt = -1
  for (let m = 0; m < MONTH_NAMES.length; m++) {
    // Three letters is enough to be unambiguous and covers "Sept" as well as "Sep".
    const re = new RegExp('\\b' + MONTH_NAMES[m].slice(0, 3) + '[a-z]*\\b', 'gi')
    let match = re.exec(text)
    while (match !== null) {
      if (match.index > bestAt) { bestAt = match.index; out.month = m + 1 }
      match = re.exec(text)
    }
  }
  return out
}

/**
 * Are the two reports a like-for-like year apart?
 *
 * @param {{year: number|null, month: number|null}} current
 * @param {{year: number|null, month: number|null}} prior
 * @returns {{comparable: boolean, certain: boolean}} `certain` is false when a date line
 *   carried too little to judge — the comparison still runs, and the caller warns.
 */
function periodsComparable (current, prior) {
  if (current.year === null || prior.year === null) { return { comparable: true, certain: false } }
  if (prior.year !== current.year - 1) { return { comparable: false, certain: true } }
  if (current.month === null || prior.month === null) { return { comparable: true, certain: false } }
  if (current.month !== prior.month) { return { comparable: false, certain: true } }
  return { comparable: true, certain: true }
}

/**
 * The six raw values for ONE year.
 *
 * Each is null unless every figure it needs is present AND its denominator is usable.
 * A denominator of zero or less is treated as absent rather than guarded with a fudge:
 * a business with no sales has no debtor days, and inventing one would be worse than
 * saying nothing.
 *
 * @param {object} y - `{sales, costOfSales, operatingExpenses, accountsReceivable,
 *   inventory, accountsPayable}`, each a number or absent.
 * @returns {object} keyed by measure, each a number or null. `salesGrowth` is absent
 *   here — it is the only measure that cannot be computed from one year.
 */
function valuesFor (y) {
  const src = y || {}
  const sales = num(src.sales)
  const costOfSales = num(src.costOfSales)
  const opex = num(src.operatingExpenses)
  const debtors = num(src.accountsReceivable)
  const stock = num(src.inventory)
  const creditors = num(src.accountsPayable)

  const salesOk = sales !== null && sales > 0
  const cosOk = costOfSales !== null && costOfSales > 0

  return {
    sales,
    grossMargin: (salesOk && costOfSales !== null) ? ((sales - costOfSales) / sales) * 100 : null,
    overheadRatio: (salesOk && opex !== null) ? (opex / sales) * 100 : null,
    debtorDays: (salesOk && debtors !== null) ? (debtors / sales) * DAYS_IN_YEAR : null,
    creditorDays: (cosOk && creditors !== null) ? (creditors / costOfSales) * DAYS_IN_YEAR : null,
    stockDays: (cosOk && stock !== null) ? (stock / costOfSales) * DAYS_IN_YEAR : null
  }
}

/**
 * Band a LEVEL against a `{green, amber}` pair — green is the top of green, amber the top
 * of amber, and red is anything above amber (Mike's own scale, 2026-09-03).
 *
 * BOTH boundaries are required. One alone is ambiguous — an amber with no green cannot
 * say where good ends — and guessing the missing one would be inventing the half of his
 * judgement he had not given. Missing either returns null, which the screen draws as
 * "no threshold set": shown in full, banded not at all.
 *
 * @param {number} value - this year's level.
 * @param {object|null} t - `{green, amber}`.
 * @returns {'good'|'warn'|'crit'|null}
 */
function bandLevel (value, t) {
  const green = t ? num(t.green) : null
  const amber = t ? num(t.amber) : null
  if (green === null || amber === null) { return null }
  if (value <= green) { return 'good' }
  if (value <= amber) { return 'warn' }
  return 'crit'
}

/**
 * Band a MOVEMENT against a `{warn, crit}` pair, in the direction `compare` names.
 *
 * Unlike a level, one threshold alone is meaningful here — a firm may want a red line and
 * no amber — so each level is applied independently and an absent one simply never fires.
 * With neither set the result is null and the measure is shown unbanded.
 *
 * @param {number} movement - signed: growth % for sales, percentage points for the others.
 * @param {'below'|'fallBy'|'riseBy'} compare
 * @param {object|null} t - `{warn, crit}`.
 * @returns {'good'|'warn'|'crit'|null}
 */
function bandMovement (movement, compare, t) {
  const warn = t ? num(t.warn) : null
  const crit = t ? num(t.crit) : null
  if (warn === null && crit === null) { return null }
  if (crit !== null && breaches(movement, compare, crit)) { return 'crit' }
  if (warn !== null && breaches(movement, compare, warn)) { return 'warn' }
  return 'good'
}

/**
 * Has a movement broken one threshold, in the direction its shape names?
 *
 * Written out one shape per line rather than folded into a single signed comparison. The
 * folded version worked and was unreadable, and this is arithmetic that decides what an
 * advisor is told about a client — the next person to change it has to be able to see it
 * is right without doing algebra.
 *
 * @param {number} movement - growth % for `below`, percentage points for the other two.
 * @param {'below'|'fallBy'|'riseBy'} compare
 * @param {number} limit
 * @returns {boolean}
 */
function breaches (movement, compare, limit) {
  // growth fell below the line
  if (compare === 'below') { return movement < limit }
  // dropped by more than the line
  if (compare === 'fallBy') { return -movement > limit }
  // rose by more than the line
  return movement > limit
}

/**
 * The first raw figure a measure needed and did not get, so an absent row can say why.
 *
 * A figure missing from EITHER year is enough — this is a two-year read, and "we have this
 * year's stock but not last year's" leaves exactly the same hole as having neither.
 *
 * @param {object} m - the measure definition, carrying `needs`.
 * @param {object} current @param {object} prior
 * @returns {string|null} the input's own name, or null if every one was present (which
 *   means the measure failed for a reason of its own, such as a zero denominator).
 */
function firstMissing (m, current, prior) {
  for (let i = 0; i < m.needs.length; i++) {
    const need = m.needs[i]
    if (num(current[need]) === null || num(prior[need]) === null) { return need }
  }
  return null
}

/**
 * The two-year trend read.
 *
 * @param {object} input
 * @param {object} input.current - this year's figures (see `valuesFor`), plus `reportDate`.
 * @param {object|null} input.prior - last year's, or null when nothing was dropped.
 * @param {object} [input.thresholds] - `{levels, movements}` as resolved for the scope.
 * @returns {object} {
 *   available: boolean,          // is there anything to draw at all?
 *   blocked: string|null,        // why not, in the advisor's words
 *   needsBalanceSheet: boolean,  // last year's P&L came without its Balance Sheet
 *   periodsCertain: boolean,     // could the two date lines be checked?
 *   measures: Array<object>,     // only the computable ones, in screen order
 *   counts: {good, warn, crit, unbanded}
 * }
 *
 * Each measure carries `{key, basis, unit, prior, current, movement, band, computable}`.
 * `movement` is growth % for sales and percentage points for the other two percentage
 * measures; for the day-counts it is the plain difference in days, which is REPORTED even
 * though the band ignores it — the movement is what the reader is actually curious about
 * once they have seen the level.
 */
function computeTrend (input) {
  const opts = input || {}
  const thresholds = opts.thresholds || {}
  const levels = thresholds.levels || {}
  const movements = thresholds.movements || {}

  const empty = {
    available: false,
    blocked: null,
    needsBalanceSheet: false,
    periodsCertain: true,
    measures: [],
    omitted: [],
    counts: { good: 0, warn: 0, crit: 0, unbanded: 0 }
  }

  if (!opts.current || !opts.prior) {
    return Object.assign({}, empty, { blocked: 'NO_PRIOR_YEAR' })
  }

  const periods = periodsComparable(periodEndOf(opts.current.reportDate), periodEndOf(opts.prior.reportDate))
  if (!periods.comparable) {
    return Object.assign({}, empty, { blocked: 'PERIODS_NOT_COMPARABLE' })
  }

  const cur = valuesFor(opts.current)
  const pri = valuesFor(opts.prior)

  const measures = []
  const omitted = []
  const counts = { good: 0, warn: 0, crit: 0, unbanded: 0 }

  for (let i = 0; i < MEASURES.length; i++) {
    const m = MEASURES[i]

    // Sales is the one measure whose value IS the movement, so it is built by hand
    // rather than differenced — there is no such thing as "this year's sales growth".
    let priorValue
    let currentValue
    let movement
    if (m.key === 'salesGrowth') {
      priorValue = pri.sales
      currentValue = cur.sales
      movement = (priorValue !== null && currentValue !== null && priorValue > 0)
        ? ((currentValue - priorValue) / priorValue) * 100
        : null
    } else {
      priorValue = pri[m.key]
      currentValue = cur[m.key]
      movement = (priorValue !== null && currentValue !== null) ? currentValue - priorValue : null
    }

    // 🔴 BOTH YEARS ARE REQUIRED FOR EVERY MEASURE, INCLUDING THE LEVEL ONES. A level band
    // reads only this year, so a day-count COULD be drawn with last year's cell blank —
    // and the approved drawing says it must not be. This is a two-year read: a row that
    // shows one year in a table headed by two invites the reader to take the blank as a
    // zero. Where last year's Balance Sheet is missing, the three day-counts drop out
    // together and `needsBalanceSheet` says so in one line the advisor can act on.
    const computable = priorValue !== null && currentValue !== null &&
      (m.basis === 'level' || movement !== null)
    if (!computable) {
      omitted.push({ key: m.key, missing: firstMissing(m, opts.current, opts.prior) })
      continue
    }

    const band = m.basis === 'level'
      ? bandLevel(currentValue, levels[m.key])
      : bandMovement(movement, m.compare, movements[m.key])

    if (band === null) { counts.unbanded++ } else { counts[band]++ }

    measures.push({
      key: m.key,
      basis: m.basis,
      unit: m.unit,
      // Which direction is worse travels WITH the measure rather than being restated on
      // the screen. The screen colours a movement by it, and a second copy in the browser
      // is how the arithmetic and the colour come to disagree.
      worseWhen: m.worseWhen,
      prior: priorValue,
      current: currentValue,
      movement,
      band,
      computable: true
    })
  }

  if (measures.length === 0) {
    return Object.assign({}, empty, { blocked: 'NOTHING_COMPUTABLE' })
  }

  // Last year's P&L alone gives the three percentage measures and none of the day-counts,
  // which is a state the advisor can fix in one action — so it is named rather than left
  // as three silently absent rows.
  const haveAnyDayCount = measures.some(x => BALANCE_SHEET_MEASURES.includes(x.key))

  return {
    available: true,
    blocked: null,
    needsBalanceSheet: !haveAnyDayCount,
    periodsCertain: periods.certain,
    measures,
    // The rows that are NOT on the table and the figure each one wanted. The screen says
    // this once beneath the table; without it a client with no stock simply has a shorter
    // table than the next one and nothing explains the difference.
    omitted,
    counts
  }
}

module.exports = {
  computeTrend,
  periodEndOf,
  periodsComparable,
  valuesFor,
  bandLevel,
  bandMovement,
  breaches,
  MEASURES,
  BALANCE_SHEET_MEASURES,
  DAYS_IN_YEAR
}
