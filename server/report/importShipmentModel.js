'use strict'

/**
 * @file The Import & Retail shipment calculator — turns real orders into the months the
 *   Three-Way Forecast works in.
 * @module server/report/importShipmentModel
 *
 * Item 4.64 slice 2 (which absorbed item 4.63 on Mike's instruction of 2026-09-04). Ported
 * from `design/report-source-models/Import & Retail.xlsx`, his own workbook.
 * Drawing: `design/mockups/three-way-forecast-international.html`, the slice 2 panel.
 *
 * 🔴 IT IS AN UPSTREAM CALCULATOR, NOT A SECTION OF THE FORECAST. It produces the series the
 * overseas section already takes, so `threeWayForecastModel.js` needs no new arithmetic —
 * only a seam that lets a resolved shipment carry its own deposit and balance months.
 *
 * 🔴 DATES, NOT BANDS — Mike's ruling of 2026-09-04, and the whole reason this module dates
 * every event rather than shifting it by a number of months. His R9 failure was 31-day
 * stepping running three weeks adrift; band-mapping is the same error in the other
 * direction, because it knows only the month an order was placed in. Two containers ordered
 * in the same May, eighteen days apart, land in September and October:
 *
 *     2 May  + 120 manufacture + 25 sea = 24 September   (sellable 3 October)
 *     20 May + 120 manufacture + 25 sea = 12 October     (sellable 21 October)
 *
 * Band-mapping cannot express that. Both sample rows on the drawing are exactly this case,
 * and `importShipmentModel.test.js` pins both dates.
 *
 * 🔴 IT WRITES ALL THREE SERIES — deposits, balances and landings — each from its own real
 * date (Mike's ruling, 2026-09-04). Writing only the landings would compute two balance
 * dates eighteen days apart and then hand the engine one average lead to replace them,
 * which is the averaging the ruling above exists to stop, moved off the landing and onto
 * the deposit.
 *
 * ⚠ WHAT IT DELIBERATELY DOES NOT DO. It does not apply the exchange allowance, freight,
 * duty or border GST, and it does not price anything. Those are the forecast engine's, they
 * are built, tested and approved, and computing them twice is how two models start
 * disagreeing. This module answers one question: what is owed, and when.
 *
 * ⚠ THE WORKBOOK PRICES FREIGHT PER CONTAINER; THIS DOES NOT, AND THAT IS APPROVED. The
 * approved screen charges freight as a percentage of landed value, so container sizes,
 * shipping-speed costs and the refrigerated surcharge never come across — only the shipping
 * DAYS do, because those are what turn an order date into a landing date. Reading the
 * surcharge did turn up a fault in the workbook (4 of its 12 months disagree with their own
 * shipment terms, identically on both supplier sheets); Mike ruled 2026-09-04 that the
 * stated rule wins over those four figures. Nothing here depends on it. See the drawing.
 */

/** The forecast is twelve months, and this model exists to feed it. */
const MONTHS = 12

/**
 * The shipping days each speed costs, from `Supplier 1 Inputs` rows 5-6 of the workbook.
 * They are defaults: a supplier's own terms override them.
 */
const SHIPPING_DAYS = { Sea: 25, Air: 20, Express: 15 }

/**
 * The supplier terms as the workbook holds them — manufacture 120, balance due 91, prep 9.
 * Mike's own figures. Entered once rather than per shipment, which is how his sheet has it.
 */
const DEFAULT_TERMS = {
  manufactureDays: 120,
  balanceDueDays: 91,
  prepDays: 9,
  shippingDays: SHIPPING_DAYS,
  // What the supplier charges for waiting to be paid. `Supplier 1 Inputs` F8.
  interestCoverPct: 0.06
}

/**
 * The workbook's own day-count convention for both charges it puts on the deferred balance.
 *
 * 🔴 360, NOT 365, AND IT IS NOT A ROUNDING CHOICE. It is what reproduces his figures: the
 * currency charge on January's balance is 43,057.20 x 10% x 91/360 = 1,088.39 exactly, and
 * the interest is 0.6 of that. A 365-day year gives 1,073.49 and his sheet stops agreeing.
 */
const DAYS_IN_YEAR = 360

/** A finite number, or the fallback. @param {*} v @param {number} d @returns {number} */
function num (v, d) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return isFinite(n) ? n : d
}

/**
 * A date at UTC midnight, or null. Accepts an ISO `YYYY-MM-DD` string or a Date.
 *
 * ⚠ UTC THROUGHOUT, DELIBERATELY. A local-midnight Date shifts by a day either side of a
 * daylight-saving boundary, and a shipment landing on the 1st would then land in the
 * previous month for half the year — the exact class of error this module exists to remove.
 *
 * @param {*} v
 * @returns {Date|null}
 */
function toUtcDate (v) {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) { return null }
    return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()))
  }
  if (typeof v !== 'string') { return null }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim())
  if (!m) { return null }
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) { return null }
  const out = new Date(Date.UTC(y, mo - 1, d))
  // Rejects 31 February rather than silently accepting it as 3 March.
  if (out.getUTCFullYear() !== y || out.getUTCMonth() !== mo - 1 || out.getUTCDate() !== d) {
    return null
  }
  return out
}

/** @param {Date} date @param {number} days @returns {Date} a new date, `days` later. */
function addDays (date, days) {
  return new Date(date.getTime() + Math.round(days) * 86400000)
}

/**
 * Which forecast month a date falls in, counted from the month the forecast starts.
 *
 * 🔴 CALENDAR MONTHS, NOT 30-DAY BLOCKS. A date in the same calendar month as the start is
 * month 0 whatever the day of the month, because that is what a cash flow column means. The
 * result may be negative (before the forecast began) or 12 and over (past its end); both
 * are real answers this model reports rather than clamps.
 *
 * @param {Date} date @param {Date} start @returns {number}
 */
function monthIndex (date, start) {
  return (date.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (date.getUTCMonth() - start.getUTCMonth())
}

/** `YYYY-MM-DD` for a UTC date, for the resolved rows the screen shows. */
function iso (date) {
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${date.getUTCFullYear()}-${mo}-${d}`
}

/**
 * Resolve one shipment against the supplier's terms.
 *
 * @param {object} s - `{ description, cost, orderDate, depositPct, speed }`
 * @param {object} terms - the resolved supplier terms
 * @param {Date} start - the forecast's first day
 * @returns {object|null} the resolved row, or null when the order date is unusable.
 */
function resolveShipment (s, terms, start) {
  const orderDate = toUtcDate(s && s.orderDate)
  if (!orderDate) { return null }

  const cost = num(s.cost, 0)
  // A deposit percentage is a share of the cost, not a percentage point: 0.6, never 60.
  // Out-of-range values are clamped rather than refused, because a shipment with a wrong
  // deposit is still a shipment that lands, and dropping it would lose the stock entirely.
  const depositPct = Math.min(1, Math.max(0, num(s.depositPct, 0.6)))

  const speed = typeof s.speed === 'string' && terms.shippingDays[s.speed] !== undefined
    ? s.speed
    : 'Sea'
  const shipDays = num(terms.shippingDays[speed], SHIPPING_DAYS.Sea)

  const landsOn = addDays(orderDate, terms.manufactureDays + shipDays)
  const balanceDueOn = addDays(orderDate, terms.balanceDueDays)
  // Prep days are why a container landing late in a month is rarely sellable that month —
  // the ruling behind the forecast's own "ready to sell after it lands" control.
  const sellableOn = addDays(landsOn, terms.prepDays)

  return {
    description: typeof s.description === 'string' ? s.description : '',
    cost,
    depositPct,
    speed,
    orderDate: iso(orderDate),
    landsOn: iso(landsOn),
    balanceDueOn: iso(balanceDueOn),
    sellableOn: iso(sellableOn),
    // The three months the forecast actually works in. Any of them may fall outside it.
    depositMonth: monthIndex(orderDate, start),
    landsInMonth: monthIndex(landsOn, start),
    balanceMonth: monthIndex(balanceDueOn, start),
    sellableInMonth: monthIndex(sellableOn, start),
    deposit: cost * depositPct,
    balance: cost * (1 - depositPct),
    // What the supplier charges for waiting, over the real days it waits. Mike's
    // instruction of 2026-09-04 after the build reported it as a gap. It is paid WITH the
    // balance, as one payment, exactly as his sheet pays it — and it is expensed with the
    // other interest rather than as a direct cost, because it is not a cost of getting the
    // goods here. See the drawing's ruling.
    interest: cost * (1 - depositPct) * terms.interestCoverPct * terms.balanceDueDays / DAYS_IN_YEAR
  }
}

/**
 * Turn a list of shipments into the series the forecast takes.
 *
 * @param {object} input
 * @param {string|Date} input.startDate - the forecast's first day.
 * @param {object} [input.terms] - `{ manufactureDays, balanceDueDays, prepDays, shippingDays }`.
 * @param {Array<object>} [input.shipments] - `{ description, cost, orderDate, depositPct, speed }`.
 * @returns {{
 *   rows: Array<object>,
 *   importedPurchases: Array<number>,
 *   deposits: Array<number>,
 *   balances: Array<number>,
 *   interest: Array<number>,
 *   landings: Array<object>,
 *   beyondYear: Array<object>,
 *   terms: object
 * }} `landings` is what the engine consumes; the three series are for the screen, which
 *   shows the advisor what the calculator filled in. `beyondYear` holds shipments that land
 *   after the twelfth month — reported rather than dropped silently, because a container
 *   ordered in March genuinely does not land inside this forecast.
 */
function computeImportShipments (input) {
  const src = (input && typeof input === 'object') ? input : {}
  const start = toUtcDate(src.startDate)
  const t = (src.terms && typeof src.terms === 'object') ? src.terms : {}
  const sd = (t.shippingDays && typeof t.shippingDays === 'object') ? t.shippingDays : {}
  const terms = {
    manufactureDays: Math.max(0, num(t.manufactureDays, DEFAULT_TERMS.manufactureDays)),
    balanceDueDays: Math.max(0, num(t.balanceDueDays, DEFAULT_TERMS.balanceDueDays)),
    prepDays: Math.max(0, num(t.prepDays, DEFAULT_TERMS.prepDays)),
    // A share, not percentage points: 0.06, never 6. Negative is refused rather than
    // clamped upward — a supplier paying the buyer to defer is not a term, it is a typo,
    // and it would show as a credit nobody can explain.
    interestCoverPct: Math.max(0, num(t.interestCoverPct, DEFAULT_TERMS.interestCoverPct)),
    shippingDays: {
      Sea: Math.max(0, num(sd.Sea, SHIPPING_DAYS.Sea)),
      Air: Math.max(0, num(sd.Air, SHIPPING_DAYS.Air)),
      Express: Math.max(0, num(sd.Express, SHIPPING_DAYS.Express))
    }
  }

  const empty = {
    rows: [],
    importedPurchases: new Array(MONTHS).fill(0),
    deposits: new Array(MONTHS).fill(0),
    balances: new Array(MONTHS).fill(0),
    interest: new Array(MONTHS).fill(0),
    landings: [],
    beyondYear: [],
    terms
  }
  // No start date means no calendar to file anything in. Returning an empty result rather
  // than guessing "today" keeps the forecast exactly as it was — the guard's requirement.
  if (!start) { return empty }

  const list = Array.isArray(src.shipments) ? src.shipments : []
  const rows = []
  for (let i = 0; i < list.length; i++) {
    const row = resolveShipment(list[i], terms, start)
    if (row && row.cost > 0) { rows.push(row) }
  }

  const importedPurchases = new Array(MONTHS).fill(0)
  const deposits = new Array(MONTHS).fill(0)
  const balances = new Array(MONTHS).fill(0)
  const interest = new Array(MONTHS).fill(0)
  const landings = []
  const beyondYear = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    // A container landing outside the twelve months cannot be in this forecast's stock, and
    // neither can its cash: charging the deposit for goods the year never receives would
    // show money leaving for nothing. Reported instead.
    if (r.landsInMonth < 0 || r.landsInMonth >= MONTHS) {
      beyondYear.push(r)
      continue
    }
    importedPurchases[r.landsInMonth] += r.cost
    if (r.depositMonth >= 0 && r.depositMonth < MONTHS) { deposits[r.depositMonth] += r.deposit }
    if (r.balanceMonth >= 0 && r.balanceMonth < MONTHS) {
      balances[r.balanceMonth] += r.balance
      interest[r.balanceMonth] += r.interest
    }
    // What the engine needs, and nothing else: the value, and the three months it moves in.
    // The engine applies the exchange allowance, freight, duty, border GST and the price
    // ladder itself — see this file's own note on what it deliberately does not do.
    landings.push({
      value: r.cost,
      landsInMonth: r.landsInMonth,
      depositPct: r.depositPct,
      depositMonth: r.depositMonth,
      balanceMonth: r.balanceMonth,
      interest: r.interest
    })
  }

  return { rows, importedPurchases, deposits, balances, interest, landings, beyondYear, terms }
}

module.exports = {
  MONTHS,
  SHIPPING_DAYS,
  DEFAULT_TERMS,
  DAYS_IN_YEAR,
  toUtcDate,
  addDays,
  monthIndex,
  resolveShipment,
  computeImportShipments
}
