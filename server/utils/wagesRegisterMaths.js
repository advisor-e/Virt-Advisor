'use strict'

/**
 * wagesRegisterMaths — what a client's staff register adds up to.
 *
 * @module server/utils/wagesRegisterMaths
 *
 * Design: `design/mockups/wages-register.html`, approved by Mike 2026-09-15 with all four
 * of its questions ruled the same day. Source: `design/report-source-models/Wages Model.xlsx`,
 * sheet 6, *DD Considerations*.
 *
 * 🔴 THIS FILE DELIBERATELY DOES NOT REPRODUCE THE WORKBOOK, and that is the whole point of
 * it. Reading the sheet's stored XML on 2026-09-15 found three faults in column `H`, "Annual
 * Leave Liability" — the column the workbook's own 63,154 headline is summed from
 * (`L54:L56`, three `sumif`s over `H8:H39`):
 *
 *   1. Its ONE surviving formula, `H8` = `(E8*$D$5)*G8`, points at a BLANK `D5`. The 8 it
 *      means is one cell away in `E4`. As written it evaluates to 0; the 1,915.20 showing
 *      on the sheet is a stale cached value from before the reference broke.
 *   2. `H9:H39` are hand-typed constants, not formulas. Change a pay rate or a leave balance
 *      and the liability does not move.
 *   3. 🔴 24 of the 29 people are priced from *Sick Leave Consumed* (`F`) rather than
 *      *Accrued Annual Leave (outstanding)* (`G`). Only five rows carry an accrued figure at
 *      all — `G9`, `G10`, `G21`, `G32`, `G38`. Mary G is the clearest: no accrued figure, 12
 *      days of sick leave, and a typed liability of 1,915.20, which is 19.95 × 8 × **12**.
 *      Where a row carries BOTH, the accrued column wins (Agatha: 14 sick, 13 accrued,
 *      1,976 = 19 × 8 × **13**) — so the intent is not in doubt, only the execution.
 *
 * Sick leave consumed is a cost already spent; accrued annual leave is money the business
 * still owes. They are not the same quantity and one is not an estimate of the other. So:
 * **this prices from accrued leave only, and reports `null` where there is none** rather
 * than reaching for the number that happens to be to hand. On the workbook's own sample that
 * is 10,115.84 across five people, not 63,154 across twenty-nine — pinned, with its
 * derivation, in `tests/unit/wagesRegisterMaths.test.js`.
 *
 * Node 14, CommonJS. No I/O, no clock, no database — every branch is reachable from a test.
 */

/**
 * The three bands, in the order they appear on screen.
 *
 * These are Mike's words from Decision 7 (2026-09-14), not the workbook's. The sheet's own
 * `M` column reads *Vital / Beneficial / Dispensable*, and the ruling replaced them because
 * every one of the workbook's OWN definitions measures financial loss to the business rather
 * than the worth of a person — *"'No material loss' is a financial assessment of a role;
 * 'Dispensable' is a character judgement of a person. Same restructure decision, very
 * different document."* The measurement did not move; only the words did.
 *
 * @type {string[]}
 */
const BANDS = ['direct-loss', 'indirect-loss', 'no-material-loss']

/**
 * The workbook's band names, for reading its sample in and nothing else.
 *
 * ⚠ NOT a translation table the product uses in either direction at runtime. It exists so a
 * test can load the sheet's own rows, and so the payroll reader (item 4.103) has one place to
 * look if an export ever carries the old words.
 *
 * @type {Object<string, string>}
 */
const WORKBOOK_BANDS = {
  Vital: 'direct-loss',
  Beneficial: 'indirect-loss',
  Dispensable: 'no-material-loss'
}

/**
 * A finite number, or null. Guards every figure that reaches the arithmetic.
 *
 * Strings are accepted and converted because these values arrive from a JSON body typed into
 * number inputs, where an untouched field is `''` and a touched-then-cleared one may be
 * `null`. An empty string is NOT zero — it is "not answered", which is the distinction this
 * whole module turns on.
 *
 * @param {*} value
 * @returns {number|null}
 */
function num (value) {
  if (value === null || value === undefined || value === '') { return null }
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * What one person's accrued leave is worth, or null when it cannot be known.
 *
 * 🔴 `null` IS A RESULT, NOT A FAILURE — it is Mike's ruling of 2026-09-15 (question 2),
 * rendered as *"not yet priced"*. Returning 0 for an unanswered field would put a confident
 * zero into a balance-sheet total, which is the fault this module exists to avoid one step
 * removed: a figure that looks computed and is not.
 *
 * ⚠ A PAY RATE OF ZERO IS A KNOWN VALUE AND PRICES TO ZERO. The workbook's own sample has
 * three such rows (`E34`, `E38`, `E39`), and row 38 carries six days of accrued leave against
 * it. Zero is what the business owes that person for their leave, and saying so is different
 * from saying we do not know.
 *
 * @param {{payRate: *, accruedLeaveDays: *}} person
 * @param {*} hoursInLeaveDay - the firm's setting; null/empty until it is set
 * @returns {number|null} the liability, or null when it cannot be computed
 */
function priceRow (person, hoursInLeaveDay) {
  const hours = num(hoursInLeaveDay)
  // Question 1, ruled 2026-09-15: the register carries its own "hours in a day's leave",
  // starting EMPTY. Until it is set nothing is priced — never a quiet fallback to the
  // workbook's 8, which is typed there precisely because it varies.
  if (hours === null || hours <= 0) { return null }
  const days = num(person && person.accruedLeaveDays)
  if (days === null || days < 0) { return null }
  const rate = num(person && person.payRate)
  if (rate === null || rate < 0) { return null }
  return rate * hours * days
}

/**
 * Round to whole cents, killing the binary-floating-point tail.
 *
 * 40.28 × 8 × 16 is 5155.839999999999 in IEEE-754, and a liability that renders as
 * 5,155.839999999999 in one place and 5,155.84 in another is the kind of difference a reader
 * has to stop and think about. Applied at the edge of the arithmetic, never inside it.
 *
 * @param {number} n
 * @returns {number}
 */
function toCents (n) {
  return Math.round(n * 100) / 100
}

/**
 * The band totals under the register — the summary an acquirer reads, naming nobody.
 *
 * 🔴 EVERY BAND REPORTS BOTH `people` AND `priced`, and the difference between them is the
 * point (Mike's ruling, question 2, 2026-09-15). A total that quietly covers five of
 * twenty-nine people, presented as *the* leave liability of a twenty-nine-person business, is
 * technically correct and thoroughly misleading. The gap goes on the face of the document.
 *
 * `avgYears` divides by the people in the band who actually carry a length of service, not by
 * the whole band. The workbook divides by the band count (`L58` = `M58/L50`), which is the
 * same answer whenever everyone has a figure — true of all three bands in its own sample —
 * and quietly understates the average the moment one person does not.
 *
 * @param {Array<{band: string, payRate: *, accruedLeaveDays: *, yearsEmployed: *}>} people
 * @param {*} hoursInLeaveDay - the firm's setting
 * @returns {{bands: Array<{band: string, people: number, priced: number, liability: number, avgYears: number|null}>,
 *            total: {people: number, priced: number, liability: number}}}
 */
function summarise (people, hoursInLeaveDay) {
  const rows = Array.isArray(people) ? people : []
  const bands = BANDS.map((band) => {
    const inBand = rows.filter(p => p && p.band === band)
    const priced = inBand.map(p => priceRow(p, hoursInLeaveDay)).filter(v => v !== null)
    const years = inBand.map(p => num(p.yearsEmployed)).filter(v => v !== null)
    return {
      band,
      people: inBand.length,
      priced: priced.length,
      liability: toCents(priced.reduce((sum, v) => sum + v, 0)),
      avgYears: years.length
        ? Math.round((years.reduce((sum, v) => sum + v, 0) / years.length) * 10) / 10
        : null
    }
  })
  // Summed from the bands rather than from `rows`, so the total can never disagree with the
  // three figures printed above it. A person whose band is missing or misspelt is in no band
  // and is in no total — and the `people` count says so.
  return {
    bands,
    total: {
      people: bands.reduce((n, b) => n + b.people, 0),
      priced: bands.reduce((n, b) => n + b.priced, 0),
      liability: toCents(bands.reduce((n, b) => n + b.liability, 0))
    }
  }
}

/**
 * One person, priced, ready for the screen. The row the register renders.
 *
 * @param {object} person
 * @param {*} hoursInLeaveDay
 * @returns {object} the person with `liability` (number|null) added
 */
function priceAll (people, hoursInLeaveDay) {
  const rows = Array.isArray(people) ? people : []
  return rows.map((p) => {
    const liability = priceRow(p, hoursInLeaveDay)
    return Object.assign({}, p, { liability: liability === null ? null : toCents(liability) })
  })
}

module.exports = {
  BANDS,
  WORKBOOK_BANDS,
  priceRow,
  priceAll,
  summarise,
  toCents
}
