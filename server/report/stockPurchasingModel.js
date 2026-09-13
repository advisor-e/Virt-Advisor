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
 * at 36 days on hand** and scores 3 there. Totals therefore span the low teens here rather than the
 * 22s on the Weighted Data Sort tab, which ranks the hand-entered sheet where days on hand varies.
 * That is the sample, not the method — and it moves the moment an owner sets their own ladders.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * 🔴 TWO RULED DEVIATIONS FROM THE SOURCE — Mike, 2026-09-13, on the drawing.
 *
 * **1 · The owner's boundary is a shared edge, so nothing can fall between two rungs.**
 * (Decision 5, and then rebuilt on his correction of the same day.)
 *
 * The workbook keeps a min AND a max for every rung and steps between them — `1–25`, `26–40`,
 * `41–75` — so a continuous measure can land in the step. It fires in the workbook's own third
 * row: **Widget 3**'s average unit cost is **$25.2184**, which is in the `$25–26` step, and
 * `Sales Report` T9 caches **0** — a cheap, low-risk line scored as though the criterion did not
 * exist.
 *
 * This was first built as "close the gaps in our fixed ladder". It is now something better: the
 * owner types ONE boundary and both rungs read it — the rung below ends there, the rung above
 * starts one step past it, and the scoring cut is that same number. **A gap cannot exist rather
 * than being patched after the fact**, and the ladder is theirs. See `LADDERS` below.
 *
 * 🔴 **A value AT a boundary belongs to that rung; anything above it belongs to the next.** So
 * Widget 3 scores **Low (4)**, not Minor. An earlier build scored it Minor by rounding down to
 * the rung below a printed ceiling — defensible while the ladder was ours, untenable once the
 * ceiling became the owner's own number, and on the two INVERTED ladders it handed a line the
 * BEST score for exceeding a limit.
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
 * One rule now: no band, no points. With deviation 1 in force this is reachable only by a blank,
 * a negative or a non-number, where 0 is the honest answer.
 *
 * **WHAT THE TWO MOVE, on the workbook's own sample: 919 of its 969 lines are reproduced
 * EXACTLY**, and every one of the 50 scores that move is a workbook zero becoming a real score.
 * A difference of any other shape is a porting error, and the golden test fails on it.
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

/** The five criteria, in the order they are shown and summed. */
const CRITERIA = ['margin', 'sold', 'unitCostRisk', 'daysOnHand', 'shareOfStock']

/**
 * THE FIVE LADDERS — and they are the OWNER'S to set, not ours.
 *
 * 🔴 **THIS IS THE POINT OF THE MODEL.** Mike, 2026-09-13: *"the whole point of the model is to
 * allow a business owner to quantify their expectations - therefore, all the rankings need to be
 * variables ... if you check original model you will see the ranges were separate columns of
 * editable cells"*. A fixed ladder turns a tool for the owner's judgement into a tool that tells
 * them what to think. What counts as a good margin depends on the trade.
 *
 * The workbook says so in its own formulas. Every criterion on `Product Categories` has two
 * columns — a min and a max — and **one of them is computed from the other**, so typing a
 * boundary moves the neighbouring rung:
 *
 *   Margin achieved      G5:G8   typed      F6:F9   = `G5+1%`   (next rung starts a point higher)
 *   How many sold        G14:G17 typed      F15:F18 = `G14+1`
 *   Unit cost risk       G32:G35 typed      F33:F36 = `G32+1`
 *   Share of stock held  O14:O17 typed      N15:N18 = `O14+1%`
 *   Days on hand         F23:F26 typed      G24:G27 = `F23-1`   (this one runs downward)
 *
 * Expressed once rather than twice, that is **four cut points per criterion** — the printed top of
 * rungs 1 to 4 — plus a floor. `defaultCuts` below are the workbook's own; an owner sends their
 * own in `ladders` and everything on the screen and in the scoring follows.
 *
 * 🔴 **THE STEP IS PER MEASURE (Mike, 2026-09-13).** He asked that typing 25% advance the next rung
 * to 25.1%. That suits a percentage and suits nothing else — there is no such thing as 5.1 units
 * sold or 13.1 days on a shelf. So percentages step by **0.1 of a point**, days and units by **1**,
 * money by **1 cent**. The workbook uses a whole point and a whole dollar, so this is finer than it
 * in two places and identical in the other three.
 *
 * HOW A VALUE IS SCORED, and why that is not the same as what is printed:
 *
 *   - **`cut` is the owner's own number, and it is the scoring boundary.** A value AT a cut belongs
 *     to that rung; anything above it belongs to the next. That is what a threshold means, and it
 *     leaves no gap by construction — ruled deviation 1, now reached through the owner's own
 *     boundaries rather than by patching ours.
 *   - **`printedTo` is that same number, and `from` is the rung below's cut plus one step.** So the
 *     ladder on screen reads the way the workbook reads it, while nothing falls between rungs.
 *
 * The LOWEST rung reaches down to zero, below its printed floor. Decision 6 rules that 0 points is
 * possible only on a blank or a negative, and a 50-cent unit is neither.
 *
 * `points` carries the inversion: unit cost risk and days on hand are best-first, because a cheap
 * unit and a fast sale are good. Every ladder is listed lowest-VALUE-first regardless.
 */
const LADDERS = {
  /** `Product Categories` B4:G9 — margin achieved, as a ratio of sales. Printed as percentages. */
  margin: {
    kind: 'percent',
    step: 0.001,
    floor: 0,
    defaultCuts: [0.25, 0.4, 0.8, 1],
    rungs: [
      { id: 'Minor', points: 1 },
      { id: 'Moderate', points: 2 },
      { id: 'Major', points: 3 },
      { id: 'Fruitful', points: 4 },
      { id: 'Awesome!', points: 5 }
    ]
  },
  /** `Product Categories` B13:G18 — units shifted in the period. */
  sold: {
    kind: 'count',
    step: 1,
    floor: 1,
    defaultCuts: [5, 10, 15, 25],
    rungs: [
      { id: 'Rare', points: 1 },
      { id: 'Occasional', points: 2 },
      { id: 'Regular', points: 3 },
      { id: 'Frequent', points: 4 },
      { id: 'Often', points: 5 }
    ]
  },
  /**
   * `Product Categories` B31:G36 — average unit cost, in the firm's currency.
   * INVERTED: cheap is 5 and expensive is 1, because the question is how much cash one unit locks
   * up. It is the only measure of the five where a big number is bad.
   */
  unitCostRisk: {
    kind: 'money',
    step: 0.01,
    floor: 1,
    defaultCuts: [25, 40, 75, 175],
    rungs: [
      { id: 'Minor', points: 5 },
      { id: 'Low', points: 4 },
      { id: 'Acceptable', points: 3 },
      { id: 'Stressful', points: 2 },
      { id: 'Waking Nights', points: 1 }
    ]
  },
  /** `Product Categories` B22:G27 — days between arriving and selling. INVERTED: fast is 5. */
  daysOnHand: {
    kind: 'count',
    step: 1,
    floor: 1,
    defaultCuts: [13, 27, 44, 74],
    rungs: [
      { id: 'Hot Cakes!', points: 5 },
      { id: 'Quick Shifter', points: 4 },
      { id: 'Come n Go', points: 3 },
      { id: 'Sleepy', points: 2 },
      { id: 'Dead Wood', points: 1 }
    ]
  },
  /**
   * `Product Categories` K13:O18 — the line's share of stock units held.
   * `topPrinted` is the one printed ceiling that is NOT an owner's choice: a share cannot exceed
   * the whole shelf, so the top rung reads "… – 100%" where the other four read "and up".
   */
  shareOfStock: {
    kind: 'percent',
    step: 0.001,
    floor: 0.01,
    topPrinted: 1,
    defaultCuts: [0.05, 0.125, 0.33, 0.58],
    rungs: [
      { id: 'Drip', points: 1 },
      { id: 'Trickle', points: 2 },
      { id: 'Flowing', points: 3 },
      { id: 'Flood', points: 4 },
      { id: 'Torrent', points: 5 }
    ]
  }
}

/** How many boundaries an owner sets per criterion: the printed top of rungs 1 to 4. */
const CUTS_PER_LADDER = 4

/**
 * Round to the ladder's own precision.
 *
 * In binary floating point `0.25 + 0.001` is 0.25100000000000006, and an owner who typed 25%
 * should be shown 25.1%, not 25.1000000000000006%. The step decides the precision: 0.001 → 3dp.
 *
 * @param {number} v @param {number} step @returns {number}
 */
function toStep (v, step) {
  const places = Math.max(0, Math.round(-Math.log10(step)))
  return Number(v.toFixed(places))
}

/**
 * The owner's four boundaries for one criterion, validated.
 *
 * Anything that is not four ascending finite numbers falls back to the workbook's own, because a
 * half-typed ladder must never silently rescore a client's whole range. A boundary that is not
 * above the one below it is the case worth refusing outright: it makes a rung no value can ever
 * reach, and the screen would show a ladder with an unreachable middle.
 *
 * @param {string} criterion @param {*} cuts
 * @returns {Array<number>} four ascending numbers
 */
function cutsFor (criterion, cuts) {
  const ladder = LADDERS[criterion]
  if (!Array.isArray(cuts) || cuts.length !== CUTS_PER_LADDER) { return ladder.defaultCuts.slice() }
  const clean = cuts.map(numberOrNull)
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === null) { return ladder.defaultCuts.slice() }
    if (i > 0 && clean[i] <= clean[i - 1]) { return ladder.defaultCuts.slice() }
  }
  return clean
}

/**
 * Build one criterion's five bands from four boundaries.
 *
 * @param {string} criterion @param {Array<number>} [cuts] the owner's own, or the workbook's
 * @returns {Array<{id: string, points: number, from: number, cut: (number|undefined),
 *   printedTo: (number|undefined)}>}
 */
function bandsFor (criterion, cuts) {
  const ladder = LADDERS[criterion]
  const edges = cutsFor(criterion, cuts)
  return ladder.rungs.map(function (rung, i) {
    const isTop = i === ladder.rungs.length - 1
    return {
      id: rung.id,
      points: rung.points,
      // The rung above starts one step past the owner's boundary — the workbook's own `G5+1%`.
      from: i === 0 ? ladder.floor : toStep(edges[i - 1] + ladder.step, ladder.step),
      // The scoring boundary IS the owner's number. The top rung has none and is open-ended.
      cut: isTop ? undefined : edges[i],
      printedTo: isTop ? ladder.topPrinted : edges[i]
    }
  })
}

/**
 * Every ladder, from one set of the owner's boundaries.
 * @param {Object} [ladders] criterion → four boundaries
 * @returns {Object<string, Array<Object>>}
 */
function bandsFrom (ladders) {
  const src = ladders && typeof ladders === 'object' ? ladders : {}
  const out = {}
  for (let i = 0; i < CRITERIA.length; i++) {
    out[CRITERIA[i]] = bandsFor(CRITERIA[i], src[CRITERIA[i]])
  }
  return out
}

/** The workbook's own ladders, which is what an owner who sets nothing is scored against. */
const BANDS = bandsFrom(null)

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
 * Bands are ordered lowest-value-first and `cut` is the owner's own boundary, INCLUSIVE: a value
 * AT a cut belongs to that rung, and anything above it to the next. So this is a walk rather than
 * a search, the last band catches everything above the highest cut, and **there is no gap by
 * construction** — the boundaries are shared edges, not two numbers that have to be kept in step.
 *
 * A negative or a null matches nothing, which is the only way to reach null.
 *
 * @param {number|null} value
 * @param {Array<{id: string, points: number, from: number, cut: (number|undefined)}>} bands
 * @returns {{id: string, points: number, from: number, cut: (number|undefined)}|null}
 */
function bandFor (value, bands) {
  if (value === null || value < 0) { return null }
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]
    if (band.cut === undefined || value <= band.cut) { return band }
  }
  return null
}

/**
 * Score one value against one ladder.
 *
 * @param {number|null} value
 * @param {string} criterion  one of CRITERIA
 * @param {Object<string, Array<Object>>} [bands] the owner's ladders; the workbook's if omitted
 * @returns {{value: (number|null), points: number, rating: (string|null), scored: boolean}}
 */
function scoreOne (value, criterion, bands) {
  const band = bandFor(value, (bands || BANDS)[criterion])
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
 * @param {Object<string, Array<Object>>} [bands] the owner's ladders; the workbook's if omitted
 * @returns {Object} the line, its derived figures, its five scores and its total
 */
function scoreLine (line, bands) {
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

  // Only an object is taken as a ladder set. `lines.map(scoreLine)` is the natural thing to write
  // and hands this the ARRAY INDEX as its second argument — which would then be indexed for a
  // criterion, yielding undefined, and every line after the first would throw.
  const ladders = bands && typeof bands === 'object' ? bands : BANDS
  const scores = {
    margin: scoreOne(margin, 'margin', ladders),
    // Ruled fix: the quantity is tested here. The sheet's own S7 tests the ENTRY DATE in its
    // middle branch, where its four siblings all test D7.
    sold: scoreOne(quantity, 'sold', ladders),
    unitCostRisk: scoreOne(avgUnitCost, 'unitCostRisk', ladders),
    daysOnHand: scoreOne(daysOnHand, 'daysOnHand', ladders),
    shareOfStock: scoreOne(shareOfStock, 'shareOfStock', ladders)
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
 * @param {Object} inputs  { lines, shelf, exposure, ladders } — `ladders` is the OWNER'S four
 *   boundaries per criterion, and is what makes this a tool for their judgement rather than ours.
 *   Anything missing or malformed falls back to the workbook's own, per criterion.
 * @returns {Object} { totals, lines, ranked, shelf, affordability, bands, ladders, cuts,
 *   criteria, maxScore }
 */
function computeStockPurchasing (inputs) {
  const src = inputs || {}
  const lines = Array.isArray(src.lines) ? src.lines : []
  const bands = bandsFrom(src.ladders)
  const scored = lines.map(line => scoreLine(line, bands))

  // The boundaries actually used, echoed back. The screen fills its boxes from these rather than
  // from what it sent, so a rejected ladder shows the owner the figures they are really scored
  // against instead of the ones they half-typed.
  const cuts = {}
  for (let i = 0; i < CRITERIA.length; i++) {
    cuts[CRITERIA[i]] = cutsFor(CRITERIA[i], src.ladders && src.ladders[CRITERIA[i]])
  }

  return {
    totals: totalsOf(scored),
    lines: scored,
    ranked: rank(scored),
    shelf: shelfOf(src.shelf),
    affordability: affordability(src.exposure),
    // The ladders travel with the answer so the screen renders the rating words and their ranges
    // from the single source rather than keeping a second copy in a component.
    bands,
    cuts,
    // The shape of each ladder — its step, its floor and how to format it — so the screen's entry
    // boxes are driven by the model too, and a criterion's precision lives in one place.
    ladders: LADDERS,
    criteria: CRITERIA,
    maxScore: MAX_SCORE
  }
}

module.exports = {
  BANDS,
  LADDERS,
  CUTS_PER_LADDER,
  CRITERIA,
  MAX_SCORE,
  SAMPLE_LINES,
  DEFAULT_INPUTS,
  numberOrNull,
  toStep,
  cutsFor,
  bandsFor,
  bandsFrom,
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
