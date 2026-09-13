'use strict'

/**
 * Stock Purchasing (Growth Pro) — calculation engine.
 *
 * Port of `design/report-source-models/Growth Pro.1a.Stock Purchasing.xlsx`. Drawn first at
 * `design/mockups/stock-purchasing.html`; all eight of its decisions were ruled by Mike on
 * 2026-09-13 and the drawing was approved to build from the same day.
 *
 * WHAT THE MODEL DOES. Each product line is scored 1–5 on five criteria and the five are added,
 * so 25 is a perfect line. The client's buying is then pulled toward the lines that carry the
 * profit — the workbook's own words are that it "reins in" a trader's instinct without replacing
 * it. Steps 2 and 3 ask what is already on the shelf and whether the business can carry the order.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE WORKBOOK HAS FIVE SHEETS AND TWO PARALLEL DATASETS. THIS PORTS THE FIRST.
 *
 *   1. `Process`             — four steps in nine sentences. No cells. It is the method, and it
 *                              is where steps 2–4 of the screen come from.
 *   2. `Product Categories`  — the five scoring ladders: points, rating word, and the range that
 *                              earns them. The single source for every band in this file.
 *   3. `Sales Report`        — THE INTAKE, and what this model ports. Seven columns out of the
 *                              client's own system, everything else derived. 969 named lines.
 *   4. `Product Ratings`     — a second, hand-entered copy of the same idea: no dates and no cost,
 *                              with days-on-hand and margin typed in directly. 970 lines.
 *   5. `Weighted Data Sort`  — the ranked output, which reads `Product Ratings`, NOT `Sales
 *                              Report`.
 *
 * 🔴 **WE PORT `Sales Report` AND RANK IT OURSELVES.** The workbook ranks the other sheet. Sales
 * Report is the better source and the one the approved drawing shows: it takes what a client's
 * system actually exports, and it DERIVES days on hand from two dates rather than asking anyone
 * to type it. `Product Ratings` cannot be an intake — it has no cost column, so unit cost risk
 * there is reverse-engineered out of a typed margin.
 *
 * The consequence is visible and must not be mistaken for a fault: the workbook's own sample has
 * entry and sale dates running one day apart down the whole sheet, so **every line in it comes out
 * at 36 days on hand** and scores 3 there. Totals therefore span **7–17** here (6–17 as the sheet
 * itself caches them, the floor rising because closing the gaps lifts its two 6s) rather than the
 * 22s on the Weighted Data Sort tab, which ranks the hand-entered sheet where days on hand varies.
 * That is the sample, not the method.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * 🔴 TWO RULED DEVIATIONS FROM THE SOURCE — Mike, 2026-09-13, on the drawing.
 *
 * **1 · Every gap between the scoring rungs is closed.** (Decision 5.)
 *
 * The workbook writes each ladder as a list of closed ranges typed edge by edge, and the ranges do
 * not meet. Unit cost risk runs `1–25`, `26–40`, `41–75`, `76–175`, `176+`; share of stock runs
 * `0.01–0.05`, `0.06–0.125`, `0.135–0.33`, `0.34–0.58`, `0.59–1.00`. A value landing between two
 * rungs matches no branch of the `IF` chain.
 *
 * It is not theoretical — it fires in the workbook's own third row. **Widget 3**'s average unit
 * cost is **$25.2184**, which falls in the `$25–26` gap, and `Sales Report` T9 caches **0**: a
 * cheap, low-risk line scored as though the criterion did not exist.
 *
 * Each band now runs up to the start of the one above it (`BANDS` below, `upTo` exclusive), and
 * the lowest band reaches down to zero. Reaching to zero is required by Decision 6's own ruling —
 * that 0 is possible only on a blank or a negative — because otherwise a value beneath the lowest
 * rung, which is neither, would still score 0 and the fault would survive in miniature.
 *
 * **2 · A criterion with no band scores 0, and it scores 0 the same way on both sheets.**
 * (Decision 6.)
 *
 * The two sheets disagree about what a gap means, and both are wrong, in opposite directions:
 *
 *   - `Sales Report` ends every chain `IF(x>=lastBandMin, points)` with no else, yielding Excel
 *     `FALSE`. `SUM` reads that as 0 and the criterion silently vanishes — Widget 3, above.
 *   - `Product Ratings` ends its chains `IF(x="",0,x)`, returning **the measurement itself**. It
 *     is a points column, so a ratio is added to a points total: **Widget 9** caches
 *     **9.13 out of 25**, the `.13` being its share of stock. It is also why a score can arrive
 *     with decimal places where every rung is a whole number.
 *
 * One rule now: no band, no points. With deviation 1 in force this can only be reached by a blank,
 * a negative or a non-number, where 0 is the honest answer.
 *
 * 🔴 **HOW THE TWO INTERACT, because they were ruled separately and land on the same cell.**
 * Deviation 1 fires first and mostly disarms deviation 2. Widget 9's share of 0.13 is no longer in
 * a gap — it sits inside Trickle, whose top edge moved from 0.125 to 0.135 — so it scores **2**
 * and its total goes **9.13 → 11**, not to 9. Deviation 2 is the net beneath deviation 1, not the
 * thing that moves that line. Both are pinned in the golden test against the workbook's own cached
 * values.
 *
 * **A third fault of the same family is fixed and needed no ruling**: the "how many sold" chain on
 * `Sales Report` (S7) tests `I7`, the entry date, in its middle branch where its four siblings all
 * test `D7`, the quantity. It is harmless while a date is present and scores a 11–15 unit line 0
 * without one. Here the quantity is tested, as the other four branches do.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * FIDELITY NOTES — reproduced as the source has them, NOT "corrected":
 *
 *   - **The rating words are the workbook's own and are kept in full** — `Hot Cakes!`, `Dead
 *     Wood`, `Come n Go`, `Drip`, `Torrent`, `Fruitful`, `Awesome!` (Mike, Decision 4). Two
 *     spellings were corrected on his ruling: `Occassional` → `Occasional`, `Waking Nites` →
 *     `Waking Nights`. These ids are provenance; screen wording lives in `locales/`.
 *   - **Unit cost risk is inverted and that is deliberate.** A cheap unit scores 5 and an
 *     expensive one 1, because the question is how much cash a single unit locks up. It is the
 *     only one of the five where a large number is bad.
 *   - **Nothing is normalised or rescaled.** Share of stock is taken as given, as the sheet takes
 *     it; a client whose shares do not sum to 1 gets what they entered.
 *   - **The five criteria are added, not weighted.** The sheet's heading says "Total Weighted
 *     Average Points" and its formula is `SUM(O:S)`. The weighting is the ladders themselves.
 *   - **Margin is gross profit over sales**, the sheet's `G/E`, and is NOT guarded there: 33 cells
 *     cache `#DIV/0!` where sales are zero. A real client can have a zero-sales line, so here that
 *     yields a null margin and 0 points rather than an error.
 *
 * Class: **Report** (see `design/MODEL-CLASSIFICATION.md`) — a client's real product list and real
 * sales. Never badged "Illustrative".
 *
 * Pure, side-effect free, backend-only per the Stack Constitution. Node 14.15 / CommonJS.
 */

/**
 * The workbook's sample intake — `Sales Report` C7:P975, the 969 lines that carry a product code.
 *
 * Rows 976–2310 hold quantities, sales and costs with NO product code at all, and the sheet's own
 * grand totals include them: E3 caches 776,359.60 across all 2,304 populated rows, of which the
 * named lines are 274,953.59. They are excluded here because a line with no name cannot appear on
 * a buy list — an advisor cannot tell a client to order row 1,183 — so carrying them would inflate
 * every total on the screen with stock nobody could act on.
 */
const SAMPLE_LINES = require('../../data/stock-purchasing-sample.json')

/**
 * The five ladders, read off `Product Categories`.
 *
 * 🔴 EACH BAND CARRIES TWO UPPER EDGES, AND CONFUSING THEM PUTS A WRONG LADDER ON SCREEN.
 *
 *   - `upTo` is the SCORING edge, EXCLUSIVE, and is the lower edge of the band above it. This is
 *     ruled deviation 1, closing the gaps the workbook typed between its rungs. The last band in
 *     each list carries none and is open-ended.
 *   - `printedTo` is what the WORKBOOK PRINTS, and is for the screen and for provenance. It is
 *     never used to match — matching on the printed edges is what created the gaps.
 *
 * They differ by design: days on hand scores `< 14` and prints `1 – 13`. Rendering `upTo` as the
 * caption put every one of the 25 rungs one unit too high and made adjacent rungs overlap —
 * *Hot Cakes! 1–14* sitting directly above *Quick Shifter 14–28* — found on 2026-09-13 by opening
 * the screen with the suite green. A band whose workbook cell reads "(Greater Than)" has no
 * `printedTo` and the screen says "and up".
 *
 * `from` is likewise the workbook's own printed lower edge. `id` is its rating word, `points` what
 * the rung is worth.
 */
const BANDS = {
  /** `Product Categories` B4:G9 — margin achieved, as a ratio of sales. Printed as percentages. */
  margin: [
    { id: 'Minor', points: 1, from: 0, upTo: 0.26, printedTo: 0.25 },
    { id: 'Moderate', points: 2, from: 0.26, upTo: 0.41, printedTo: 0.4 },
    { id: 'Major', points: 3, from: 0.41, upTo: 0.81, printedTo: 0.8 },
    { id: 'Fruitful', points: 4, from: 0.81, upTo: 1.01, printedTo: 1 },
    { id: 'Awesome!', points: 5, from: 1.01 }
  ],
  /** `Product Categories` B13:G18 — units shifted in the period. */
  sold: [
    { id: 'Rare', points: 1, from: 1, upTo: 6, printedTo: 5 },
    { id: 'Occasional', points: 2, from: 6, upTo: 11, printedTo: 10 },
    { id: 'Regular', points: 3, from: 11, upTo: 16, printedTo: 15 },
    { id: 'Frequent', points: 4, from: 16, upTo: 26, printedTo: 25 },
    { id: 'Often', points: 5, from: 26 }
  ],
  /**
   * `Product Categories` B31:G36 — average unit cost, in the firm's currency.
   * INVERTED: cheap is 5, expensive is 1. Listed cheapest-first so every ladder here reads in the
   * same direction; `points` carries the inversion rather than the order.
   */
  unitCostRisk: [
    { id: 'Minor', points: 5, from: 1, upTo: 26, printedTo: 25 },
    { id: 'Low', points: 4, from: 26, upTo: 41, printedTo: 40 },
    { id: 'Acceptable', points: 3, from: 41, upTo: 76, printedTo: 75 },
    { id: 'Stressful', points: 2, from: 76, upTo: 176, printedTo: 175 },
    { id: 'Waking Nights', points: 1, from: 176 }
  ],
  /** `Product Categories` B22:G27 — days between arriving and selling. INVERTED: fast is 5. */
  daysOnHand: [
    { id: 'Hot Cakes!', points: 5, from: 1, upTo: 14, printedTo: 13 },
    { id: 'Quick Shifter', points: 4, from: 14, upTo: 28, printedTo: 27 },
    { id: 'Come n Go', points: 3, from: 28, upTo: 45, printedTo: 44 },
    { id: 'Sleepy', points: 2, from: 45, upTo: 75, printedTo: 74 },
    { id: 'Dead Wood', points: 1, from: 75 }
  ],
  /**
   * `Product Categories` K13:O18 — the line's share of stock units held.
   * Torrent is the one band with a printed ceiling but no scoring one: the workbook stops it at
   * 1.00, a whole shelf, and anything above that is not a share.
   */
  shareOfStock: [
    { id: 'Drip', points: 1, from: 0.01, upTo: 0.06, printedTo: 0.05 },
    { id: 'Trickle', points: 2, from: 0.06, upTo: 0.135, printedTo: 0.125 },
    { id: 'Flowing', points: 3, from: 0.135, upTo: 0.34, printedTo: 0.33 },
    { id: 'Flood', points: 4, from: 0.34, upTo: 0.59, printedTo: 0.58 },
    { id: 'Torrent', points: 5, from: 0.59, printedTo: 1 }
  ]
}

/** The five criteria, in the order they are shown and summed. */
const CRITERIA = ['margin', 'sold', 'unitCostRisk', 'daysOnHand', 'shareOfStock']

/** The best a line can score: five criteria, five points each. */
const MAX_SCORE = CRITERIA.length * 5

/** Milliseconds in a day, for the days-on-hand subtraction. */
const MS_PER_DAY = 86400000

/**
 * A finite number, or null.
 *
 * Everything downstream treats null as "not given", which scores 0 — ruled deviation 2. Strings
 * are NOT coerced: an intake that hands us "1,024" has a problem the scorer must not paper over.
 *
 * @param {*} v
 * @returns {number|null}
 */
function numberOrNull (v) {
  return typeof v === 'number' && isFinite(v) ? v : null
}

/**
 * The band a value falls in, or null if it falls outside every one of them.
 *
 * Bands are ordered and `upTo` is exclusive, so this is a walk rather than a search: the first
 * band whose ceiling the value is under wins, and the last band catches everything above. A
 * negative or a null matches nothing — which, with the gaps closed, is the only way to reach null.
 *
 * @param {number|null} value
 * @param {Array<{id: string, points: number, from: number, upTo: (number|undefined)}>} bands
 * @returns {{id: string, points: number, from: number, upTo: (number|undefined)}|null}
 */
function bandFor (value, bands) {
  if (value === null || value < 0) { return null }
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]
    if (band.upTo === undefined || value < band.upTo) { return band }
  }
  return null
}

/**
 * Score one value against one ladder.
 *
 * @param {number|null} value
 * @param {string} criterion  one of CRITERIA
 * @returns {{value: (number|null), points: number, rating: (string|null), scored: boolean}}
 */
function scoreOne (value, criterion) {
  const band = bandFor(value, BANDS[criterion])
  return {
    value,
    points: band ? band.points : 0,
    rating: band ? band.id : null,
    // Ruled deviation 2: an unscored criterion is worth 0 and SAYS it was not scored, so a screen
    // can tell "no band" from a genuine 1 without inspecting the value itself.
    scored: Boolean(band)
  }
}

/**
 * Whole days between two ISO dates — the sheet's `datedif(entry, sale, "D")`.
 *
 * Returns null if either date is missing or unparseable, or if the sale precedes the entry, which
 * is not a shorter time on the shelf but a data fault, and scoring it 5 would reward it.
 *
 * @param {string|null} entryDate  ISO yyyy-mm-dd
 * @param {string|null} saleDate   ISO yyyy-mm-dd
 * @returns {number|null}
 */
function daysOnHandOf (entryDate, saleDate) {
  if (!entryDate || !saleDate) { return null }
  const entry = Date.parse(entryDate + 'T00:00:00Z')
  const sale = Date.parse(saleDate + 'T00:00:00Z')
  if (isNaN(entry) || isNaN(sale)) { return null }
  const days = Math.round((sale - entry) / MS_PER_DAY)
  return days < 0 ? null : days
}

/**
 * Derive one line's figures and score it.
 *
 * The derivations are `Sales Report`'s own, by column:
 *   G  gross profit    = sales − cost
 *   H  margin          = gross profit / sales      (null where sales are 0; the sheet caches #DIV/0!)
 *   M  avg unit sale   = sales / quantity
 *   O  avg unit cost   = cost / quantity
 *   N  days on hand    = sale date − entry date
 *
 * 🔴 `avgUnitCost` MAY BE SUPPLIED DIRECTLY, and a stock-on-hand export is why. That file prints a
 * unit cost per line and has no units-sold figure to divide by, so deriving it would be dividing
 * by the wrong quantity. A supplied value wins; otherwise it is derived as above. Crucially
 * `quantity` STILL MEANS UNITS SOLD and a stock import leaves it null — letting stock held stand
 * in for it would score a full warehouse as though it had all walked out of the door.
 *
 * @param {Object} line  { code, quantity, sales, cost, entryDate, saleDate, shareOfStock,
 *   avgUnitCost }
 * @returns {Object} the line, its derived figures, its five scores and its total
 */
function scoreLine (line) {
  const src = line || {}
  const quantity = numberOrNull(src.quantity)
  const sales = numberOrNull(src.sales)
  const cost = numberOrNull(src.cost)
  const shareOfStock = numberOrNull(src.shareOfStock)
  const suppliedUnitCost = numberOrNull(src.avgUnitCost)

  const grossProfit = sales === null || cost === null ? null : sales - cost
  const margin = sales === null || sales === 0 || grossProfit === null ? null : grossProfit / sales
  const avgUnitSale = sales === null || quantity === null || quantity === 0 ? null : sales / quantity
  const derivedUnitCost = cost === null || quantity === null || quantity === 0 ? null : cost / quantity
  const avgUnitCost = suppliedUnitCost === null ? derivedUnitCost : suppliedUnitCost
  const daysOnHand = daysOnHandOf(src.entryDate, src.saleDate)

  const scores = {
    margin: scoreOne(margin, 'margin'),
    // Ruled fix: the quantity is tested here. The sheet's own S7 tests the ENTRY DATE in its
    // middle branch, where its four siblings all test D7.
    sold: scoreOne(quantity, 'sold'),
    unitCostRisk: scoreOne(avgUnitCost, 'unitCostRisk'),
    daysOnHand: scoreOne(daysOnHand, 'daysOnHand'),
    shareOfStock: scoreOne(shareOfStock, 'shareOfStock')
  }

  let total = 0
  for (let i = 0; i < CRITERIA.length; i++) { total += scores[CRITERIA[i]].points }

  return {
    code: src.code || null,
    quantity,
    sales,
    cost,
    entryDate: src.entryDate || null,
    saleDate: src.saleDate || null,
    shareOfStock,
    grossProfit,
    margin,
    avgUnitSale,
    avgUnitCost,
    daysOnHand,
    scores,
    total,
    maxScore: MAX_SCORE
  }
}

/**
 * The four headline figures — step 1's totals (Mike, Decision 2).
 *
 * Average margin is the WEIGHTED margin — total gross profit over total sales — not the mean of
 * the per-line margins. A mean would let a $60 line count as much as a $6,400 one.
 *
 * @param {Array<Object>} scored
 * @returns {{salesReviewed: number, grossProfit: number, averageMargin: (number|null), linesReviewed: number, quantity: number}}
 */
function totalsOf (scored) {
  let sales = 0
  let grossProfit = 0
  let quantity = 0
  for (let i = 0; i < scored.length; i++) {
    sales += scored[i].sales || 0
    grossProfit += scored[i].grossProfit || 0
    quantity += scored[i].quantity || 0
  }
  return {
    salesReviewed: sales,
    grossProfit,
    averageMargin: sales === 0 ? null : grossProfit / sales,
    linesReviewed: scored.length,
    quantity
  }
}

/**
 * Rank scored lines, best first.
 *
 * Ties break on gross profit and then on the product code, so the order is STABLE: the same input
 * always yields the same screen. The workbook's own sort leaves ties in sheet order, which means
 * its ranking depends on where a row happens to sit.
 *
 * @param {Array<Object>} scored
 * @returns {Array<Object>} a new array; the input is not mutated
 */
function rank (scored) {
  return scored.slice().sort(function (a, b) {
    if (b.total !== a.total) { return b.total - a.total }
    const ap = a.grossProfit === null ? -Infinity : a.grossProfit
    const bp = b.grossProfit === null ? -Infinity : b.grossProfit
    if (bp !== ap) { return bp - ap }
    return String(a.code).localeCompare(String(b.code))
  })
}

/**
 * Step 3 — whether the business can carry the order.
 *
 * The `Process` sheet describes this in two sentences and provides no cells; the shape below is
 * the drawing's, approved by Mike on 2026-09-13 (Decision 7). Quick ratio is the standard one,
 * deliberately EXCLUDING stock: the question is what could be turned to cash without selling the
 * very thing being bought.
 *
 * The workbook's own instruction, quoted on the drawing: "do not approve purchases that compromise
 * short-term liquidity." `carries` is that sentence as a boolean — false when committing the cash
 * would take the ratio under 1, the point at which current liabilities stop being covered.
 *
 * @param {Object} exposure  { currentAssetsExStock, currentLiabilities, cashCommitted }
 * @returns {{quickRatio: (number|null), quickRatioAfter: (number|null), cashCommitted: number, carries: (boolean|null)}}
 */
function affordability (exposure) {
  const src = exposure || {}
  const assets = numberOrNull(src.currentAssetsExStock)
  const liabilities = numberOrNull(src.currentLiabilities)
  const committed = numberOrNull(src.cashCommitted) || 0

  // A business with no current liabilities has no ratio rather than an infinite one. Reporting
  // Infinity to a screen is how "£Infinity" reaches an advisor in front of a client.
  const ratio = assets === null || liabilities === null || liabilities === 0
    ? null
    : assets / liabilities
  const after = assets === null || liabilities === null || liabilities === 0
    ? null
    : (assets - committed) / liabilities

  return {
    quickRatio: ratio,
    quickRatioAfter: after,
    cashCommitted: committed,
    carries: after === null ? null : after >= 1
  }
}

/**
 * Step 2 — what is already on the shelf.
 *
 * `onHand` plus `inTransit`, because in transit is the half that causes the double-order and the
 * workbook calls it out by name.
 *
 * @param {Object} shelf  { onHand, inTransit }
 * @returns {{onHand: number, inTransit: number, alreadyCommitted: number}}
 */
function shelfOf (shelf) {
  const src = shelf || {}
  const onHand = numberOrNull(src.onHand) || 0
  const inTransit = numberOrNull(src.inTransit) || 0
  return { onHand, inTransit, alreadyCommitted: onHand + inTransit }
}

/** The workbook's sample, as the route and the screen ask for it when given nothing. */
const DEFAULT_INPUTS = {
  lines: SAMPLE_LINES,
  shelf: { onHand: null, inTransit: null },
  exposure: { currentAssetsExStock: null, currentLiabilities: null, cashCommitted: null }
}

/**
 * Run the whole model.
 *
 * @param {Object} inputs  { lines, shelf, exposure }
 * @returns {Object} { totals, lines, ranked, shelf, affordability, bands, maxScore }
 */
function computeStockPurchasing (inputs) {
  const src = inputs || {}
  const lines = Array.isArray(src.lines) ? src.lines : []
  const scored = lines.map(scoreLine)

  return {
    totals: totalsOf(scored),
    lines: scored,
    ranked: rank(scored),
    shelf: shelfOf(src.shelf),
    affordability: affordability(src.exposure),
    // The ladders travel with the answer so the screen renders the rating words and their ranges
    // from the single source rather than keeping a second copy in a component.
    bands: BANDS,
    criteria: CRITERIA,
    maxScore: MAX_SCORE
  }
}

module.exports = {
  BANDS,
  CRITERIA,
  MAX_SCORE,
  SAMPLE_LINES,
  DEFAULT_INPUTS,
  numberOrNull,
  bandFor,
  scoreOne,
  daysOnHandOf,
  scoreLine,
  totalsOf,
  rank,
  affordability,
  shelfOf,
  computeStockPurchasing
}
