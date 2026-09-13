'use strict'

/**
 * Sales Dashboard — calculation engine.
 *
 * Port of `design/report-source-models/Sales Dashboard.xlsx`. Drawn first at
 * `design/mockups/sales-dashboard.html`; all nine of its decisions were ruled by Mike on
 * 2026-09-13, each put to him alone and each as recommended, and he approved the build the
 * same day.
 *
 * WHAT THE MODEL DOES. It answers one question in five cuts: where the sales and the margin
 * actually come from. Every sale is sorted into a value band the owner sets, and the same 140
 * rows are then totalled by brand, product, product category, region and salesperson.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * THE WORKBOOK HAS SIX SHEETS AND ONLY TWO HOLD ANYTHING.
 *
 *   1. `Report`             — the Sales Ranges Breakdown table, and the four headline figures.
 *                             Every cell on it reads `Sheet1`.
 *   2. `Sales Data Input`   — THE INTAKE. A 140-row transaction list: brand, product, category,
 *                             revenue, cost, margin, region, salesperson. 🔴 NO DATE COLUMN.
 *   3. `Pie Graph Options`  — NO DATA AT ALL. A canvas carrying charts.
 *   4. `Other Chart Options`— NO DATA AT ALL. A canvas carrying charts.
 *   5. `Sort & Filter`      — a filtered view of the input list.
 *   6. `Sheet1`             — the hidden calculation sheet every chart and the Report read.
 *
 * The two canvases carry **25 charts, which are 20 unique views drawn twice over**: five
 * dimensions × three measures as doughnuts, plus one bar chart per dimension. A spreadsheet has
 * no other way to offer a choice. Decision 5 turns that wall into one card with five dimension
 * tabs and three measures.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * 🔴 THREE RULED DEVIATIONS FROM THE SOURCE — Mike, 2026-09-13, on the drawing. NONE OF THE
 * THREE IS VISIBLE IN THE WORKBOOK'S OWN SAMPLE DATA, which is exactly why they were settled at
 * drawing time rather than discovered at build time. Each is pinned in
 * `tests/unit/salesDashboardModel.test.js` with the workbook's own cached figure beside ours.
 *
 * **1 · A sale counted in no band at all.** (Decision 3.)
 *
 * The band money and the band counts do not use the same test. On `Sheet1`, row 16 sums every
 * band with `">="&floor` and `"<="&ceiling`, but row 17 counts two of them differently:
 *
 *     L17  COUNTIFS(… ">="&1501, … "<"&2500)    ← money is "<="&2500
 *     N17  COUNTIFS(… ">"&2501,  … "<"&5000)    ← money is ">="&2501 and "<="&5000
 *
 * So a sale of exactly **$2,500**, **$2,501** or **$5,000** adds its value and its margin to a
 * band and is counted in none. The transactions column then disagrees with the money beside it
 * and the Total line disagrees with the sum of the rows, with nothing on screen to say why. The
 * sample happens to contain no sale on any of those three figures — and round numbers like
 * $2,500 are exactly what real invoices land on.
 *
 * Here: **one boundary decides both.** `bandOf` walks upward and returns the first band whose
 * ceiling the value does not exceed, so a sale falls in exactly one band and the columns always
 * reconcile. This is the same shared-edge rule already ruled and shipped on Stock Purchasing.
 *
 * **2 · One list, read once.** (Decision 4.)
 *
 * The workbook reads its single 140-row list to **five different end points**:
 *
 *     `Sales Data Input` E14   COUNTIF(E18:E508,">=1")            the headline sales count
 *     `Sales Data Input` E13   SUM(E18:E518)                      the revenue total
 *     `Sheet1` rows 3–13       'Sales Data Input'!$18:$529        every dimension total
 *     `Sheet1` row 16          'Sales Data Input'!$18:$535        the band money
 *     `Sheet1` row 17          'Sales Data Input'!18:537          the band counts
 *
 * Nothing shows at 140 rows. At roughly 491 sales the count quietly stops rising while the money
 * keeps going, so the average sale value — the money divided by that count — starts climbing for
 * no reason. A wrong number that looks entirely plausible is the kind UAT cannot catch.
 *
 * Here every figure is computed from `rows`, once. There is no second end point to disagree with.
 *
 * **3 · Each name counted from its own column.** (Decision 7.)
 *
 * `Sheet1` S35 — Shaun's transaction count — reads `=Z9`, which is **Sue's** count; it should
 * read `=AA9`. Its two neighbours (`=AA8`, `=AA7`) are right, and so are the other nineteen cells
 * in that block. Invisible in the sample, whose lockstep data gives all ten salespeople exactly
 * 14 sales each. On real data the last name in the list would show someone else's count beside
 * its own money — and still add to the right total, because the total is computed separately.
 *
 * Here a dimension is grouped by its own key in one pass, so the count, the value and the margin
 * on a row are always the same rows. It is not a fault that can be reintroduced.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 ONE THING GOES BEYOND THE WORKBOOK, AND IT IS MIKE'S OWN. (Decision 9.) Told the workbook
 * holds no date anywhere and therefore no trends, he asked for them: *"yes but good idea, can we
 * add dates"*. `trend` is that card. It is computed **only from dates that are really in the
 * data** — the workbook's sample has none, so the sample returns `trend: null` and the card does
 * not appear. A month is never inferred, and a missing date never becomes one.
 *
 * 🔴 THE SALESPERSON CUT CARRIES THREE STATED LIMITS. (Decision 6, and it is scoped to this one
 * cut on this one screen — not precedent.) It is **never sent to the model**: this file is pure
 * arithmetic and the route beside it calls no LLM and stores nothing, so nothing here can reach
 * one. It **never leaves the firm**: nothing computed here is pooled or shared upward. And its
 * **column is optional** — a firm that does not supply it simply has no salesperson dimension in
 * `available`, and the screen shows no tab.
 *
 * FIDELITY NOTES — reproduced as the source has them, NOT "corrected":
 *
 *   - **Margin is revenue − cost**, the sheet's own `G = E − F`, and the margin percentage is
 *     `margin / revenue`, its `H`. A zero-revenue row yields a null percentage rather than an
 *     error; the sheet guards this one itself (`if(E18=0,0,…)`).
 *   - **Per-band margin % is ours, not the workbook's.** The sheet shows a margin percentage for
 *     the page as a whole (48.3%, `Report!K21`) and not per band. Recorded as an addition on the
 *     drawing rather than slipped in, because the per-band figure is the one that answers which
 *     size of sale is worth having.
 *   - **Per-dimension margin % is ours too.** The workbook charts value and margin separately and
 *     never divides one by the other.
 *   - **The nine band ceilings are the OWNER'S**, exactly as they are typed cells in the workbook
 *     (`Report!H6:H14`) rather than constants buried in a formula. A jeweller and a dairy do not
 *     share a set of sales bands. (Decision 2.)
 *   - **Products and Salesperson return identical figures on the sample and that is not a fault**:
 *     the sample walks the ten products and the ten salespeople in lockstep down all 140 rows. The
 *     groupings are independent and correct; real data separates them.
 *
 * Class: **Report** (see `design/MODEL-CLASSIFICATION.md`) — a client's real sales list. Never
 * badged "Illustrative".
 *
 * Pure, side-effect free, backend-only per the Stack Constitution. Node 14.15 / CommonJS.
 */

/**
 * The workbook's own sample — `Sales Data Input` B18:J157, the 140 transactions.
 *
 * 🔴 IT CARRIES NO DATE, because the workbook carries none. Adding one would invent the very
 * thing Decision 9 refuses to invent.
 */
const SAMPLE_SALES = require('../../data/sales-dashboard-sample.json')

/**
 * The nine band ceilings the workbook types into `Report!H6:H14`.
 *
 * Nine ceilings make ten bands: the tenth is everything above the last one, which the sheet
 * prints as "Greater than 15,000". The floors are not typed — `Report!F7` is `=H6+1` — so a
 * ceiling is a shared edge and a floor follows from it.
 */
const DEFAULT_CEILINGS = [250, 500, 1000, 1500, 2500, 5000, 7500, 10000, 15000]

/** How many ceilings an owner sets. The tenth band is open-ended and has none. */
const CEILING_COUNT = DEFAULT_CEILINGS.length

/** The smallest gap between two ceilings. Whole dollars, as the workbook's own `=H6+1` implies. */
const CEILING_STEP = 1

/** The lowest band's printed floor — `Report!F6`, typed as 1. */
const FLOOR = 1

/**
 * The five cuts, in the order the screen shows them. `key` is the field on a row; the tab
 * wording lives in `locales/`, never here.
 */
const DIMENSIONS = ['brand', 'product', 'category', 'region', 'salesperson']

/** @param {*} v @returns {number|null} a finite number, or null for anything else. */
function numberOrNull (v) {
  return typeof v === 'number' && isFinite(v) ? v : null
}

/** @param {*} v @returns {string} a trimmed label, or '' for anything empty. */
function label (v) {
  return v === null || v === undefined ? '' : String(v).trim()
}

/**
 * The owner's nine ceilings, made usable.
 *
 * Two different problems deserve different answers, and these are the same two Stock Purchasing
 * settles — deliberately, so an owner who has used one screen already knows how the other behaves:
 *
 *   - **The wrong shape** — not nine values, or one of them not a number — is a half-typed ladder,
 *     and the workbook's own is used instead. Silently rebanding a client's whole sales history
 *     against a ladder nobody finished would be worse than ignoring it.
 *   - **Ceilings that cross** get PUSHED APART rather than refused (Mike, Decision 2). Each is
 *     raised to at least one step above the one below it, left to right. Refusing them produces
 *     the worst outcome available: the screen goes on showing the number the owner typed while
 *     the model quietly bands against the defaults.
 *
 * This is the SAFETY NET, not the mechanism — the screen pushes outward from the box being typed
 * in, so the owner sees it happen. It is here because the route is a boundary and no caller
 * should be able to make a band unreachable.
 *
 * @param {*} ceilings
 * @returns {Array<number>} nine ascending numbers
 */
function ceilingsFrom (ceilings) {
  if (!Array.isArray(ceilings) || ceilings.length !== CEILING_COUNT) { return DEFAULT_CEILINGS.slice() }
  const clean = ceilings.map(numberOrNull)
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === null) { return DEFAULT_CEILINGS.slice() }
  }
  const out = [clean[0]]
  for (let i = 1; i < clean.length; i++) {
    const floor = out[i - 1] + CEILING_STEP
    out.push(clean[i] < floor ? floor : clean[i])
  }
  return out
}

/**
 * The ten bands, from nine ceilings.
 *
 * `to` is the scoring boundary AND the printed ceiling — they are the same number, which is the
 * whole of ruled deviation 1. `from` is the band below's ceiling plus one step, so the ladder
 * reads on screen exactly as the workbook prints it while nothing can fall between two rungs.
 *
 * @param {Array<number>} ceilings nine ascending numbers
 * @returns {Array<{from: number, to: (number|null)}>} ten bands, lowest first
 */
function bandsFrom (ceilings) {
  const out = []
  for (let i = 0; i < ceilings.length; i++) {
    out.push({ from: i === 0 ? FLOOR : ceilings[i - 1] + CEILING_STEP, to: ceilings[i] })
  }
  out.push({ from: ceilings[ceilings.length - 1] + CEILING_STEP, to: null })
  return out
}

/**
 * Which band a sale falls in, or -1.
 *
 * 🔴 RULED DEVIATION 1. A walk upward returning the first band whose ceiling the value does not
 * exceed: one boundary decides the count and the money alike, so a sale is in exactly one band
 * and the columns always reconcile. The last band has no ceiling and catches everything above.
 *
 * A negative value — a refund or a credit note, which a real sales export carries — belongs to no
 * band, because a −$500 refund is not a sale in the "1 – 250" range. It is reported separately
 * rather than dropped, so the total still equals the sum of what is shown.
 *
 * @param {number|null} value
 * @param {Array<{to: (number|null)}>} bands
 * @returns {number} the band's index, or -1
 */
function bandOf (value, bands) {
  if (value === null || value < 0) { return -1 }
  for (let i = 0; i < bands.length; i++) {
    if (bands[i].to === null || value <= bands[i].to) { return i }
  }
  return -1
}

/**
 * One transaction, with its margin derived the sheet's way.
 *
 * @param {Object} row { brand, product, category, region, salesperson, revenue, cost, date }
 * @returns {Object|null} null for a row carrying no revenue figure at all
 */
function readRow (row) {
  const src = row || {}
  const revenue = numberOrNull(src.revenue)
  const cost = numberOrNull(src.cost)
  if (revenue === null) { return null }
  const margin = cost === null ? null : revenue - cost
  return {
    brand: label(src.brand),
    product: label(src.product),
    category: label(src.category),
    region: label(src.region),
    salesperson: label(src.salesperson),
    revenue,
    cost,
    margin,
    // `Sales Data Input` H: if(E=0,0,(E-F)/E). A null margin has no percentage to give.
    marginPct: margin === null || revenue === 0 ? null : margin / revenue,
    // ISO yyyy-mm-dd or null. Never inferred — see Decision 9.
    date: /^\d{4}-\d{2}-\d{2}/.test(label(src.date)) ? label(src.date).slice(0, 10) : null
  }
}

/**
 * The four headline figures — `Report!J17`, `K17`, `L17`, `J20`, `J21`, `J22`, `K21`.
 *
 * 🔴 The average sale value and the average sale margin divide by **this same count**, which is
 * ruled deviation 2. The workbook divides by `Report!J20`, read from a list ending 21 rows short
 * of the one every other figure reads.
 *
 * @param {Array<Object>} rows
 * @returns {{salesValue: number, salesMargin: number, transactions: number,
 *   averageSaleValue: (number|null), averageSaleMargin: (number|null), marginPct: (number|null)}}
 */
function totalsOf (rows) {
  let salesValue = 0
  let salesMargin = 0
  for (let i = 0; i < rows.length; i++) {
    salesValue += rows[i].revenue
    salesMargin += rows[i].margin || 0
  }
  const transactions = rows.length
  return {
    salesValue,
    salesMargin,
    transactions,
    averageSaleValue: transactions === 0 ? null : salesValue / transactions,
    averageSaleMargin: transactions === 0 ? null : salesMargin / transactions,
    marginPct: salesValue === 0 ? null : salesMargin / salesValue
  }
}

/**
 * The Sales Ranges Breakdown — `Report!D5:M17`.
 *
 * @param {Array<Object>} rows
 * @param {Array<{from: number, to: (number|null)}>} bands
 * @returns {{rows: Array<Object>, unbanded: Object}}
 */
function bandBreakdown (rows, bands) {
  const out = bands.map(b => ({
    from: b.from,
    to: b.to,
    transactions: 0,
    salesValue: 0,
    salesMargin: 0,
    marginPct: null
  }))
  const unbanded = { transactions: 0, salesValue: 0, salesMargin: 0 }

  for (let i = 0; i < rows.length; i++) {
    const at = bandOf(rows[i].revenue, bands)
    const target = at === -1 ? unbanded : out[at]
    target.transactions += 1
    target.salesValue += rows[i].revenue
    target.salesMargin += rows[i].margin || 0
  }
  for (let i = 0; i < out.length; i++) {
    out[i].marginPct = out[i].salesValue === 0 ? null : out[i].salesMargin / out[i].salesValue
  }
  return { rows: out, unbanded }
}

/**
 * One dimension's totals, largest by sales value first.
 *
 * 🔴 RULED DEVIATION 3. Every figure on a row comes from the same grouped rows in one pass, so a
 * name's count can never belong to its neighbour. Ties break on the label, so the order is stable
 * and the same data always draws the same screen.
 *
 * @param {Array<Object>} rows
 * @param {string} key one of DIMENSIONS
 * @param {number} totalValue the page total, for each row's share
 * @returns {Array<{name: string, transactions: number, salesValue: number, salesMargin: number,
 *   marginPct: (number|null), share: (number|null)}>}
 */
function dimensionOf (rows, key, totalValue) {
  const byName = Object.create(null)
  const order = []
  for (let i = 0; i < rows.length; i++) {
    const name = rows[i][key]
    if (!name) { continue }
    if (!byName[name]) {
      byName[name] = { name, transactions: 0, salesValue: 0, salesMargin: 0, marginPct: null, share: null }
      order.push(name)
    }
    byName[name].transactions += 1
    byName[name].salesValue += rows[i].revenue
    byName[name].salesMargin += rows[i].margin || 0
  }
  return order.map((name) => {
    const g = byName[name]
    g.marginPct = g.salesValue === 0 ? null : g.salesMargin / g.salesValue
    g.share = totalValue === 0 ? null : g.salesValue / totalValue
    return g
  }).sort((a, b) => (b.salesValue - a.salesValue) || a.name.localeCompare(b.name))
}

/**
 * Sales over time — Mike's own Decision 9, and the one part of this model the workbook does not
 * contain in any form.
 *
 * 🔴 A MONTH IS NEVER INVENTED. Rows with no date contribute nothing, and a data set with no date
 * at all returns null so the screen omits the card entirely rather than drawing an empty one. The
 * span is stated because three months of sales and eighteen months of sales draw the same shaped
 * chart and only one of them means anything.
 *
 * @param {Array<Object>} rows already filtered to the focus, if there is one
 * @returns {{months: Array<Object>, from: string, to: string, transactions: number,
 *   salesValue: number, salesMargin: number, undated: number}|null}
 */
function trendOf (rows) {
  const dated = rows.filter(r => r.date !== null)
  if (!dated.length) { return null }

  const byMonth = Object.create(null)
  for (let i = 0; i < dated.length; i++) {
    const key = dated[i].date.slice(0, 7)
    if (!byMonth[key]) { byMonth[key] = { key, transactions: 0, salesValue: 0, salesMargin: 0 } }
    byMonth[key].transactions += 1
    byMonth[key].salesValue += dated[i].revenue
    byMonth[key].salesMargin += dated[i].margin || 0
  }
  const months = Object.keys(byMonth).sort().map(k => byMonth[k])
  return {
    months,
    from: months[0].key,
    to: months[months.length - 1].key,
    transactions: dated.length,
    salesValue: months.reduce((t, m) => t + m.salesValue, 0),
    salesMargin: months.reduce((t, m) => t + m.salesMargin, 0),
    // Stated rather than hidden: a part-dated file draws a chart covering only part of its sales.
    undated: rows.length - dated.length
  }
}

/**
 * Which cuts the data genuinely supports — Decision 8.
 *
 * A firm with no region column sees no Region tab, rather than an empty one or a fabricated one.
 * The bands table and the four headline figures need only revenue and cost, so the screen always
 * works even on the barest file.
 *
 * @param {Array<Object>} rows
 * @returns {Array<string>} the dimensions in DIMENSIONS order that at least one row names
 */
function availableDimensions (rows) {
  return DIMENSIONS.filter(key => rows.some(r => r[key] !== ''))
}

/** The workbook's sample, as the route and the screen ask for it when given nothing. */
const DEFAULT_INPUTS = {
  sales: SAMPLE_SALES,
  ceilings: DEFAULT_CEILINGS,
  focus: null
}

/**
 * Run the whole model.
 *
 * @param {Object} inputs
 * @param {Array<Object>} inputs.sales one row per transaction: `{ brand, product, category,
 *   region, salesperson, revenue, cost, date }`. Only `revenue` is required; `date` is ISO
 *   yyyy-mm-dd and drives the trend card alone.
 * @param {Array<number>} [inputs.ceilings] the OWNER'S nine band ceilings. Anything missing or
 *   malformed falls back to the workbook's own.
 * @param {{dimension: string, value: string}} [inputs.focus] narrows the TREND to one brand,
 *   product, category, region or salesperson — the question the spreadsheet cannot answer at
 *   all: not who is biggest, but who is sliding. Everything else on the page stays whole.
 * @returns {Object} { totals, bands, ceilings, dimensions, available, trend, hasDates, focus,
 *   transactionsRead }
 */
function computeSalesDashboard (inputs) {
  const src = inputs || {}
  const raw = Array.isArray(src.sales) ? src.sales : []
  const rows = raw.map(readRow).filter(Boolean)

  const ceilings = ceilingsFrom(src.ceilings)
  const bands = bandsFrom(ceilings)
  const totals = totalsOf(rows)

  const dimensions = {}
  for (let i = 0; i < DIMENSIONS.length; i++) {
    dimensions[DIMENSIONS[i]] = dimensionOf(rows, DIMENSIONS[i], totals.salesValue)
  }

  // The focus narrows the trend and nothing else, so the page a client is looking at does not
  // silently change under them when a row is clicked.
  const focus = src.focus && DIMENSIONS.includes(src.focus.dimension) && label(src.focus.value)
    ? { dimension: src.focus.dimension, value: label(src.focus.value) }
    : null
  const trendRows = focus ? rows.filter(r => r[focus.dimension] === focus.value) : rows

  const breakdown = bandBreakdown(rows, bands)

  return {
    totals,
    bands: breakdown.rows,
    // Non-zero only where a refund or credit note sits outside every band. Shown on screen when
    // it is, so the Total line always equals the sum of what is above it.
    unbanded: breakdown.unbanded,
    // The ceilings actually used, echoed back: the screen fills its boxes from these rather than
    // from what it sent, so a rejected ladder shows the owner the figures really in force.
    ceilings,
    dimensions,
    available: availableDimensions(rows),
    trend: trendOf(trendRows),
    hasDates: rows.some(r => r.date !== null),
    focus,
    transactionsRead: rows.length
  }
}

module.exports = {
  SAMPLE_SALES,
  DEFAULT_CEILINGS,
  CEILING_COUNT,
  CEILING_STEP,
  FLOOR,
  DIMENSIONS,
  DEFAULT_INPUTS,
  numberOrNull,
  ceilingsFrom,
  bandsFrom,
  bandOf,
  readRow,
  totalsOf,
  bandBreakdown,
  dimensionOf,
  trendOf,
  availableDimensions,
  computeSalesDashboard
}
