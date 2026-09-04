'use strict'

/**
 * @file The EBITDA & DCF valuation's saved-report shape (item 4.62, Brief §5).
 * @module utils/ebitdaDcfSavedShape
 *
 * The page holds the intake's confirmed figures — up to five years of Profit and Loss,
 * twenty-four rows, each cell with its provenance — and the report holds the dials the
 * advisor turns over them (growth, discount, exit multiple, and the listed-company lens).
 * A saved report is one flat row of both.
 *
 * FLATTEN: `years` as a list; each row as two lists of the same length, `fig.<row>` (the
 * values) and `src.<row>` (file or entered per year); the dials under `dcf.*` and
 * `listed.*`. Nothing a file alone knows (the company name) is in the row.
 *
 * REBUILD: a saved row is hostile. The figures are taken as ONE BLOCK, whole or not at
 * all — the years and all twenty-four rows, each the right length and shape — because the
 * engine reads every row and a partial set would put saved years beside sample ones with
 * nothing on screen to say so. A block that fails leaves what the page held. The dials are
 * taken one at a time, each only in its own shape.
 *
 * On this screen no file figure is editable after the intake, so the rule of 2026-09-04 (a
 * file figure the client changed shows `client` in place of `from file`) has no site here;
 * the sources are carried faithfully so Restore and the intake's own badges stay true.
 */

/** The intake's rows, oldest-first arrays each — pinned against the intake's defaults by the test. */
const ROW_KEYS = [
  'sales', 'costOfSales', 'operatingExpenses',
  'otherIncome', 'interestReceived', 'dividendsReceived', 'badDebtsRecovered',
  'managementFees', 'loanInterestPaid', 'consentCosts', 'extraordinaryItems', 'establishmentCosts',
  'shareholderSalaries', 'insuranceRetirement', 'ownersVehicles', 'leaseholdImprovements', 'assetUpgrades',
  'other3', 'other4', 'other5',
  'fmSalaries', 'fmInsuranceRetirement', 'fmVehicles', 'fmFringeBenefits'
]
const SOURCES = ['file', 'entered']
const MAX_YEARS = 5
const PROJECTION_YEARS = 5

const isNumber = v => typeof v === 'number' && Number.isFinite(v)
const isYear = v => Number.isInteger(v) && v > 1900 && v < 3000
const numberList = (v, n) => Array.isArray(v) && v.length === n && v.every(isNumber)

/**
 * The report's dials as the sample sets them, sized to the seed's year count.
 * @param {number} yearCount
 * @returns {{dcf: object, listed: object}}
 */
function initialDials (yearCount) {
  const n = Number.isInteger(yearCount) && yearCount > 0 ? yearCount : MAX_YEARS
  return {
    dcf: {
      growthPct: [4, 6, 5, 3, 4],
      discountPct: [6, 7, 5, 5, 6],
      exitMultiple: 2
    },
    listed: {
      sharesIssued: 3234978616,
      sharePrice: 0.59,
      // R23 residual: exactly one cell per year, or invisible sample slots reach the calc.
      ebitdaHistory: [-37.3, -307.6, 861.7, 548.9, 0].slice(0, n),
      exitMultiple: 0.25
    }
  }
}

/** A fresh copy of the dials, so neither side shares an array with the other. */
function copyDials (d) {
  return {
    dcf: {
      growthPct: d.dcf.growthPct.slice(),
      discountPct: d.dcf.discountPct.slice(),
      exitMultiple: d.dcf.exitMultiple
    },
    listed: {
      sharesIssued: d.listed.sharesIssued,
      sharePrice: d.listed.sharePrice,
      ebitdaHistory: d.listed.ebitdaHistory.slice(),
      exitMultiple: d.listed.exitMultiple
    }
  }
}

/**
 * The flat saved row.
 * @param {object|null} seed - { years, figures: {row: [{value, source}]}, companyName }
 * @param {{dcf: object, listed: object}} dials
 * @returns {object}
 */
function flattenEbitdaDcf (seed, dials) {
  const out = {}
  if (seed && Array.isArray(seed.years) && seed.figures) {
    out.years = seed.years.slice()
    ROW_KEYS.forEach((row) => {
      const cells = seed.figures[row]
      if (!Array.isArray(cells)) { return }
      out['fig.' + row] = cells.map(c => c.value)
      out['src.' + row] = cells.map(c => c.source)
    })
  }
  out['dcf.growthPct'] = dials.dcf.growthPct.slice()
  out['dcf.discountPct'] = dials.dcf.discountPct.slice()
  out['dcf.exitMultiple'] = dials.dcf.exitMultiple
  out['listed.sharesIssued'] = dials.listed.sharesIssued
  out['listed.sharePrice'] = dials.listed.sharePrice
  out['listed.exitMultiple'] = dials.listed.exitMultiple
  out['listed.ebitdaHistory'] = dials.listed.ebitdaHistory.slice()
  return out
}

/**
 * The figures block from a row: the seed if every part is present and well-shaped, else null.
 * @param {object} src
 * @returns {object|null}
 */
function takeSeed (src) {
  const years = src.years
  if (!Array.isArray(years) || years.length < 1 || years.length > MAX_YEARS || !years.every(isYear)) { return null }
  const n = years.length
  const figures = {}
  for (let i = 0; i < ROW_KEYS.length; i++) {
    const row = ROW_KEYS[i]
    const values = src['fig.' + row]
    const sources = src['src.' + row]
    if (!numberList(values, n)) { return null }
    if (!Array.isArray(sources) || sources.length !== n || !sources.every(s => SOURCES.includes(s))) { return null }
    figures[row] = values.map((value, k) => ({ value, source: sources[k] }))
  }
  return { years: years.slice(), figures, companyName: null }
}

/**
 * Rebuild the page's state from a saved row, over what it holds now.
 * @param {object} row - hostile
 * @param {object|null} currentSeed
 * @param {{dcf: object, listed: object}} currentDials
 * @returns {{seed: object|null, dials: {dcf: object, listed: object}}}
 */
function rebuildEbitdaDcf (row, currentSeed, currentDials) {
  const src = row && typeof row === 'object' && !Array.isArray(row) ? row : {}
  const seed = takeSeed(src) || currentSeed || null
  const yearCount = seed ? seed.years.length : currentDials.listed.ebitdaHistory.length
  const dials = copyDials(currentDials)
  if (numberList(src['dcf.growthPct'], PROJECTION_YEARS)) { dials.dcf.growthPct = src['dcf.growthPct'].slice() }
  if (numberList(src['dcf.discountPct'], PROJECTION_YEARS)) { dials.dcf.discountPct = src['dcf.discountPct'].slice() }
  if (isNumber(src['dcf.exitMultiple'])) { dials.dcf.exitMultiple = src['dcf.exitMultiple'] }
  if (isNumber(src['listed.sharesIssued'])) { dials.listed.sharesIssued = src['listed.sharesIssued'] }
  if (isNumber(src['listed.sharePrice'])) { dials.listed.sharePrice = src['listed.sharePrice'] }
  if (isNumber(src['listed.exitMultiple'])) { dials.listed.exitMultiple = src['listed.exitMultiple'] }
  if (numberList(src['listed.ebitdaHistory'], yearCount)) {
    dials.listed.ebitdaHistory = src['listed.ebitdaHistory'].slice()
  } else if (dials.listed.ebitdaHistory.length !== yearCount) {
    // The year count changed with the seed: one cell per year, from the sample, never a hole.
    dials.listed.ebitdaHistory = initialDials(yearCount).listed.ebitdaHistory
  }
  return { seed, dials }
}

module.exports = { ROW_KEYS, initialDials, copyDials, flattenEbitdaDcf, rebuildEbitdaDcf }
