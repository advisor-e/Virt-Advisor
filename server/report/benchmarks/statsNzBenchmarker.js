'use strict'

/**
 * @file The Stats NZ Business Performance Benchmarker, read from its two published CSV
 *   files into one dataset, and the comparison of a client's ratios against it (item 4.70,
 *   stage 3; Brief P9).
 * @module server/report/benchmarks/statsNzBenchmarker
 *
 * THE SOURCE. Stats NZ publishes the benchmarker as two CSVs a year (DataInfo+ carries only
 * the metadata; the tables come from the interactive tool):
 *   - `benchmark_ratios_all_industries-<year>-anzsic-class.csv` — one row per industry,
 *     ratio and size band: the 25th percentile, the median, the 75th percentile, and the
 *     band's turnover range. "n/a" where a ratio is not published for that industry.
 *   - `financial_all_industries-<year>.csv` — one row per industry and variable (business
 *     count, employee count, income, expenditure, profit, assets), three years across, with
 *     Stats NZ's accuracy category and its S / C suppression marks.
 * Both are read BY COLUMN NAME and refused, naming the column, when a name is missing — a
 * file whose columns moved must never be read into the wrong figures (the 4.60 rule).
 *
 * THE EIGHT RATIOS, ON STATS NZ'S OWN DEFINITIONS (their Definitions note, read 2026-09-08),
 * so the comparison is like for like (P9). Six match the report's own figures; two do not
 * and are computed here on the Stats NZ definition rather than the workbook's:
 *   - quick ratio is current assets LESS STOCK over current liabilities (the workbook's
 *     "current ratio" quirk is bank + debtors only);
 *   - stock turnover is cost of sales over AVERAGE stock, which needs both years' stock.
 *
 * SIZE BANDS are Stats NZ's turnover quartiles PER INDUSTRY — "four even quarters of the
 * industry population" — so the range that makes a business "small" differs by industry
 * and is carried with each band. A client outside every band (under $60,000 or over
 * $10 million of turnover) has no band and the page says so.
 *
 * NEVER A ZERO FOR A FIGURE STATS NZ DID NOT PUBLISH. An "n/a" ratio is `null` and prints
 * as unpublished; a suppressed count is `null` and prints as suppressed (P3, P9).
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/** Stats NZ's ratio names → this module's keys. */
const RATIO_KEYS = {
  'Current ratio': 'currentRatio',
  'Quick ratio': 'quickRatio',
  'Return on equity': 'returnOnEquity',
  'Return on total assets': 'returnOnTotalAssets',
  'Gross profit ratio': 'grossProfitRatio',
  'Liability structure': 'liabilityStructure',
  'Salaries and wages / turnover ratio': 'wagesToTurnover',
  'Stock turnover per annum': 'stockTurnover'
}
/** The eight, in the order the report's page lists them (the approved drawing, page 9). */
const RATIO_ORDER = ['returnOnEquity', 'grossProfitRatio', 'returnOnTotalAssets', 'liabilityStructure', 'wagesToTurnover', 'quickRatio', 'currentRatio', 'stockTurnover']
/** Stats NZ's four bands, smallest first. */
const BANDS = ['micro', 'small', 'medium', 'large']
const RATIOS_COLUMNS = ['Industry_Division', 'Industry_ANZSIC_class_name', 'Ratio', 'Industry_ANZSIC_class_code', 'Value_min_range', 'Value_max_range', 'Value_median', 'Sizeband_name', 'Sizeband_min', 'Sizeband_max']
const FINANCIAL_COLUMNS = ['Industry_Division', 'Industry_Class', 'Industry_ANZSIC_class_code', 'Variable', 'Accuracy_category']
/** Stats NZ's own note on the 2025 release: 2023 final, 2024 and 2025 provisional. */
const PROVISIONAL_FROM = 2024
const SOURCE = 'Stats NZ Business Performance Benchmarker'

/**
 * A small CSV reader: quoted cells, doubled quotes, CRLF or LF. Returns rows keyed by the
 * header. Written here rather than pulled in as a dependency: the files are simple and a
 * new package on Node 14.15 is its own decision.
 * @param {string} text
 * @returns {{header: string[], rows: Array<Object<string,string>>}}
 */
function parseCsv (text) {
  const src = String(text || '').replace(/^\uFEFF/, '')
  const lines = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else { quoted = false }
      } else { cell += c }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(cell); cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') { i++ }
      row.push(cell); cell = ''
      if (row.some(v => v !== '')) { lines.push(row) }
      row = []
    } else { cell += c }
  }
  row.push(cell)
  if (row.some(v => v !== '')) { lines.push(row) }
  const header = (lines[0] || []).map(h => h.trim())
  const rows = lines.slice(1).map((r) => {
    const o = {}
    header.forEach((h, i) => { o[h] = (r[i] === undefined ? '' : r[i]).trim() })
    return o
  })
  return { header, rows }
}

/** A finite number from a Stats NZ cell, or null for "n/a", "S", "C" and blanks. */
function cellNumber (v) {
  if (v === null || v === undefined) { return null }
  const s = String(v).trim()
  if (s === '' || /^n\/?a$/i.test(s) || /^[SC]$/.test(s)) { return null }
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Stats NZ's accuracy sentence → one word. */
function accuracyOf (text) {
  const s = String(text || '').toLowerCase()
  if (s.startsWith('good')) { return 'good' }
  if (s.startsWith('caution')) { return 'caution' }
  if (s.startsWith('suppressed')) { return 'suppressed' }
  return null
}

/** The columns a file must carry, or the first it lacks. */
function missingColumn (header, required) {
  for (let i = 0; i < required.length; i++) { if (!header.includes(required[i])) { return required[i] } }
  return null
}

/**
 * Read the two files into one dataset.
 *
 * @param {object} input
 * @param {string} input.ratiosCsv - the benchmark_ratios file's text.
 * @param {string} input.financialCsv - the financial file's text.
 * @returns {{ok: boolean, errors: string[], dataset: object|null}} the dataset:
 *   `{ source, year, provisional, counts: {industries, withBenchmarks, ratioRows},
 *      industries: { [code]: { code, name, division, benchmarks, accuracy, counts,
 *                              bands: {micro:{min,max},…}|null, ratios: {[key]: {[band]: {p25,median,p75}|null}} } } }`
 */
function readBenchmarker (input) {
  const errors = []
  const src = input || {}
  const ratios = parseCsv(src.ratiosCsv)
  const financial = parseCsv(src.financialCsv)
  const m1 = missingColumn(ratios.header, RATIOS_COLUMNS)
  if (m1) { errors.push('The benchmark ratios file has no "' + m1 + '" column') }
  const m2 = missingColumn(financial.header, FINANCIAL_COLUMNS)
  if (m2) { errors.push('The financial file has no "' + m2 + '" column') }
  const yearColumns = financial.header.filter(h => /^Total_(19|20)\d{2}$/.test(h)).map(h => parseInt(h.slice(6), 10)).sort((a, b) => a - b)
  if (!m2 && yearColumns.length === 0) { errors.push('The financial file has no "Total_<year>" column') }
  if (errors.length) { return { ok: false, errors, dataset: null } }

  const year = yearColumns[yearColumns.length - 1]
  const latest = 'Total_' + year
  const industries = {}
  const industry = (code, name, division) => {
    if (!industries[code]) {
      industries[code] = { code, name: name || code, division: division || '', benchmarks: false, accuracy: null, counts: { businesses: null, employees: null }, bands: null, ratios: {} }
    }
    return industries[code]
  }

  financial.rows.forEach((r) => {
    const code = r.Industry_ANZSIC_class_code
    if (!code) { return }
    const ind = industry(code, r.Industry_Class, r.Industry_Division)
    if (r.Variable === 'Business count') { ind.counts.businesses = cellNumber(r[latest]) }
    if (r.Variable === 'Employee count') { ind.counts.employees = cellNumber(r[latest]) }
    // Income carries the category the whole industry's figures are judged by.
    if (r.Variable === 'Income($m)') { ind.accuracy = accuracyOf(r.Accuracy_category) }
  })

  let ratioRows = 0
  const unknownRatios = new Set()
  ratios.rows.forEach((r) => {
    const code = r.Industry_ANZSIC_class_code
    const key = RATIO_KEYS[r.Ratio]
    const band = String(r.Sizeband_name || '').toLowerCase()
    if (!code || !BANDS.includes(band)) { return }
    if (!key) { unknownRatios.add(r.Ratio); return }
    const ind = industry(code, r.Industry_ANZSIC_class_name, r.Industry_Division)
    if (!ind.bands) { ind.bands = {} }
    if (!ind.bands[band]) { ind.bands[band] = { min: cellNumber(r.Sizeband_min), max: cellNumber(r.Sizeband_max) } }
    if (!ind.ratios[key]) { ind.ratios[key] = {} }
    const median = cellNumber(r.Value_median)
    ind.ratios[key][band] = median === null ? null : { p25: cellNumber(r.Value_min_range), median, p75: cellNumber(r.Value_max_range) }
    if (median !== null) { ind.benchmarks = true; ratioRows++ }
  })
  if (unknownRatios.size) { errors.push('The benchmark ratios file names a ratio this reader does not know: ' + Array.from(unknownRatios).join(', ')) }
  if (ratioRows === 0) { errors.push('The benchmark ratios file holds no published ratio') }
  if (errors.length) { return { ok: false, errors, dataset: null } }

  const codes = Object.keys(industries)
  return {
    ok: true,
    errors: [],
    dataset: {
      source: SOURCE,
      year,
      provisional: year >= PROVISIONAL_FROM,
      counts: { industries: codes.length, withBenchmarks: codes.filter(c => industries[c].benchmarks).length, ratioRows },
      industries
    }
  }
}

/**
 * Is a stored value a dataset this module wrote? Shape only — a stored row that no longer
 * validates is ignored rather than half-applied.
 * @param {*} value
 * @returns {boolean}
 */
function isBenchmarkerDataset (value) {
  return Boolean(value && typeof value === 'object' && value.source === SOURCE &&
    Number.isInteger(value.year) && value.industries && typeof value.industries === 'object' && !Array.isArray(value.industries) &&
    value.counts && Number.isInteger(value.counts.industries))
}

/**
 * The industry finder: name or code, best matches first.
 * @param {object} dataset
 * @param {string} query
 * @param {number} [limit=12]
 * @returns {Array<{code, name, division, benchmarks, accuracy}>}
 */
function findIndustries (dataset, query, limit) {
  const q = String(query || '').trim().toLowerCase()
  if (!dataset || !dataset.industries || q.length < 2) { return [] }
  const max = Number.isInteger(limit) && limit > 0 ? limit : 12
  const scored = []
  Object.keys(dataset.industries).forEach((code) => {
    const ind = dataset.industries[code]
    const name = String(ind.name).toLowerCase()
    let score = null
    if (name.startsWith(q)) { score = 0 } else if (code.toLowerCase().startsWith(q)) { score = 1 } else if (name.includes(q)) { score = 2 } else if (String(ind.division).toLowerCase().includes(q)) { score = 3 }
    if (score !== null) { scored.push({ score, code, name: ind.name, division: ind.division, benchmarks: ind.benchmarks, accuracy: ind.accuracy }) }
  })
  scored.sort((a, b) => a.score - b.score || (b.benchmarks - a.benchmarks) || a.name.localeCompare(b.name))
  return scored.slice(0, max).map((s) => { const { score, ...rest } = s; return rest })
}

/**
 * The band a turnover falls in for one industry, or null outside every band.
 * @param {object} industry - a dataset industry.
 * @param {number|null} revenue
 * @returns {string|null}
 */
function bandForRevenue (industry, revenue) {
  if (!industry || !industry.bands || !Number.isFinite(revenue)) { return null }
  for (let i = 0; i < BANDS.length; i++) {
    const b = industry.bands[BANDS[i]]
    if (b && Number.isFinite(b.min) && Number.isFinite(b.max) && revenue >= b.min && revenue <= b.max) { return BANDS[i] }
  }
  return null
}

/** A safe division: null on a non-positive denominator. */
function ratio (a, b) { return (Number.isFinite(a) && Number.isFinite(b) && b > 0) ? a / b : null }

/**
 * The client's eight ratios on STATS NZ'S definitions, from the report's confirmed lines.
 * Equity is assets less liabilities, as the balance-sheet page has it; profit is the
 * pre-tax net profit the profit-and-loss page prints (Stats NZ uses taxable profit, the
 * nearest figure an annual export carries).
 * @param {object} input - `{ current, prior }` as plain numbers per line; prior may be null.
 * @returns {Object<string, number|null>}
 */
function clientBenchmarkRatios (input) {
  const cur = (input && input.current) || {}
  const pri = input && input.prior
  const n = k => (Number.isFinite(cur[k]) ? cur[k] : (cur[k] === undefined || cur[k] === null ? null : Number(cur[k])))
  const z = k => n(k) || 0
  const currentAssets = z('bank') + z('accountsReceivable') + z('stock') + z('otherCurrentAssets')
  const totalAssets = currentAssets + z('fixedAssets')
  const totalLiabilities = z('currentLiabilities') + z('nonCurrentLiabilities')
  const equity = totalAssets - totalLiabilities
  const revenue = n('tradingIncome')
  const grossProfit = revenue === null ? null : revenue - z('costOfSales')
  const netProfit = grossProfit === null ? null : grossProfit + z('otherIncome') - z('wages') - z('operatingExpenses') - z('depreciation') - z('interestPaid')
  const stockPrior = pri && Number.isFinite(Number(pri.stock)) && pri.stock !== null ? Number(pri.stock) : null
  const avgStock = (stockPrior !== null && n('stock') !== null) ? (stockPrior + n('stock')) / 2 : null
  return {
    currentRatio: ratio(currentAssets, z('currentLiabilities')),
    quickRatio: ratio(currentAssets - z('stock'), z('currentLiabilities')),
    returnOnEquity: ratio(netProfit, equity),
    returnOnTotalAssets: ratio(netProfit, totalAssets),
    grossProfitRatio: revenue === null ? null : ratio(grossProfit, revenue),
    liabilityStructure: ratio(equity, equity + totalLiabilities),
    wagesToTurnover: revenue === null ? null : ratio(z('wages'), revenue + z('otherIncome')),
    stockTurnover: avgStock === null ? null : ratio(z('costOfSales'), avgStock)
  }
}

/**
 * The comparison the Trends page prints.
 *
 * @param {object} dataset
 * @param {object} input
 * @param {string} input.code - the ANZSIC06 class code the advisor chose.
 * @param {string|null} [input.band] - the advisor's band, or null to take it from revenue.
 * @param {object} input.current @param {object|null} [input.prior] - the plain lines.
 * @returns {object} {
 *   available, blocked,            // NO_INDUSTRY | NO_BENCHMARKS | NO_BAND
 *   industry: {code, name, division, accuracy, counts}|null,
 *   band: {key, min, max, chosenBy: 'advisor'|'revenue'}|null,
 *   year, provisional, source,
 *   rows: Array<{key, you, p25, median, p75, published, position}>  // position: below|within|above|null
 * }
 */
function compareToIndustry (dataset, input) {
  const opts = input || {}
  const base = { available: false, blocked: null, industry: null, band: null, year: dataset ? dataset.year : null, provisional: dataset ? dataset.provisional : null, source: SOURCE, rows: [] }
  const ind = dataset && dataset.industries && opts.code ? dataset.industries[opts.code] : null
  if (!ind) { return Object.assign(base, { blocked: 'NO_INDUSTRY' }) }
  base.industry = { code: ind.code, name: ind.name, division: ind.division, accuracy: ind.accuracy, counts: ind.counts }
  if (!ind.benchmarks || !ind.bands) { return Object.assign(base, { blocked: 'NO_BENCHMARKS' }) }
  const revenue = opts.current && Number.isFinite(Number(opts.current.tradingIncome)) ? Number(opts.current.tradingIncome) : null
  const bandKey = BANDS.includes(opts.band) ? opts.band : bandForRevenue(ind, revenue)
  if (!bandKey || !ind.bands[bandKey]) { return Object.assign(base, { blocked: 'NO_BAND' }) }
  base.band = { key: bandKey, min: ind.bands[bandKey].min, max: ind.bands[bandKey].max, chosenBy: BANDS.includes(opts.band) ? 'advisor' : 'revenue' }
  const you = clientBenchmarkRatios({ current: opts.current, prior: opts.prior })
  base.rows = RATIO_ORDER.map((key) => {
    const b = ind.ratios[key] ? ind.ratios[key][bandKey] : null
    const v = you[key]
    let position = null
    if (b && v !== null) { position = v < b.p25 ? 'below' : (v > b.p75 ? 'above' : 'within') }
    return { key, you: v, p25: b ? b.p25 : null, median: b ? b.median : null, p75: b ? b.p75 : null, published: Boolean(b), position }
  })
  base.available = base.rows.some(r => r.published)
  if (!base.available) { base.blocked = 'NO_BENCHMARKS' }
  return base
}

module.exports = {
  SOURCE,
  RATIO_KEYS,
  RATIO_ORDER,
  BANDS,
  RATIOS_COLUMNS,
  FINANCIAL_COLUMNS,
  PROVISIONAL_FROM,
  parseCsv,
  readBenchmarker,
  isBenchmarkerDataset,
  findIndustries,
  bandForRevenue,
  clientBenchmarkRatios,
  compareToIndustry
}
