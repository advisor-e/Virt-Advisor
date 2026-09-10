'use strict'

/**
 * The Stats NZ benchmarker reader and the comparison it feeds (item 4.70, stage 3).
 *
 * THE FIXTURES ARE REAL ROWS, cut unchanged from the two files Stats NZ publishes
 * (2025 release, downloaded 2026-09-08): Cafes and restaurants, which publishes every
 * ratio; Accommodation, which publishes no stock or gross-profit ratio; and Kitchen and
 * diningware wholesaling, which has counts and no benchmarks at all. Every figure
 * asserted below can be checked against those files. What a person in UAT cannot see is
 * a percentile read into the wrong column, a band matched on the wrong range, or a
 * client ratio worked on the workbook's definition instead of Stats NZ's — and those are
 * the assertions.
 */

const fs = require('fs')
const path = require('path')
const {
  readBenchmarker, parseCsv, findIndustries, bandForRevenue, clientBenchmarkRatios, compareToIndustry, isBenchmarkerDataset, RATIO_ORDER
} = require('../../server/report/benchmarks/statsNzBenchmarker')
const { loadBenchmarker, BASE_BENCHMARKER, CONFIG_KEY, PLATFORM_SCOPE } = require('../../server/utils/benchmarkerStore')

const fixture = name => fs.readFileSync(path.join(__dirname, '../fixtures/statsnz', name), 'utf8')
const ratiosCsv = fixture('benchmark_ratios-excerpt.csv')
const financialCsv = fixture('financial-excerpt.csv')

const CURRENT = {
  bank: 224000,
  accountsReceivable: 365000,
  stock: 200000,
  otherCurrentAssets: 11000,
  fixedAssets: 505000,
  currentLiabilities: 410000,
  accountsPayable: 200000,
  nonCurrentLiabilities: 205000,
  tradingIncome: 3650000,
  otherIncome: 10000,
  costOfSales: 2000000,
  wages: 596000,
  operatingExpenses: 102000,
  depreciation: 38000,
  interestPaid: 32000
}
const PRIOR = { stock: 150000 }

describe('reading the two Stats NZ files', () => {
  const r = readBenchmarker({ ratiosCsv, financialCsv })
  const cafes = r.dataset.industries.H451100

  test('reads by column name, and counts what it read', () => {
    expect(r.ok).toBe(true)
    expect(r.dataset.year).toBe(2025)
    expect(r.dataset.provisional).toBe(true)
    expect(r.dataset.counts).toEqual({ industries: 3, withBenchmarks: 2, ratioRows: 32 + 24 })
  })

  test('🔴 THE PERCENTILES LAND IN THE RIGHT COLUMNS — cafes, small band, Stats NZ\'s own rows', () => {
    expect(cafes.name).toBe('Cafes and restaurants')
    expect(cafes.bands.small).toEqual({ min: 249001, max: 506000 })
    expect(cafes.ratios.currentRatio.small).toEqual({ p25: 0.11, median: 0.35, p75: 1.06 })
    expect(cafes.ratios.stockTurnover.small).toEqual({ p25: 14, median: 26, p75: 45 })
    // a negative 25th percentile is Stats NZ's figure and is kept, never floored
    expect(cafes.ratios.liabilityStructure.small.p25).toBe(-0.36)
  })

  test('an unpublished ratio is null, never zero — Accommodation has no stock ratio', () => {
    const acc = r.dataset.industries.H440000
    expect(acc.benchmarks).toBe(true)
    expect(acc.ratios.stockTurnover.large).toBeNull()
    expect(acc.ratios.currentRatio.large).toEqual({ p25: 0.24, median: 0.82, p75: 2.25 })
  })

  test('an industry with counts and no benchmarks is listed and says so', () => {
    const kitchen = r.dataset.industries.F373300
    expect(kitchen.benchmarks).toBe(false)
    expect(kitchen.bands).toBeNull()
    expect(kitchen.counts.businesses).toBe(87)
    expect(kitchen.accuracy).toBe('caution')
  })

  test('accuracy is Stats NZ\'s category for the industry\'s income, in one word', () => {
    expect(cafes.accuracy).toBe('caution')
    expect(cafes.counts).toEqual({ businesses: 9252, employees: 75700 })
  })

  test('🔴 A FILE WITH A COLUMN MISSING IS REFUSED BY NAME, not read into the wrong figures', () => {
    const broken = ratiosCsv.replace('Value_median', 'Median')
    const bad = readBenchmarker({ ratiosCsv: broken, financialCsv })
    expect(bad.ok).toBe(false)
    expect(bad.errors[0]).toMatch(/Value_median/)
    expect(bad.dataset).toBeNull()
    expect(readBenchmarker({ ratiosCsv, financialCsv: 'a,b\n1,2\n' }).errors[0]).toMatch(/financial file/)
  })

  test('a suppressed count reads as null, and quoted cells with commas survive the parser', () => {
    const { rows } = parseCsv('A,B\n"x, y","he said ""hi"""\n')
    expect(rows[0]).toEqual({ A: 'x, y', B: 'he said "hi"' })
    const sup = readBenchmarker({ ratiosCsv, financialCsv: financialCsv.replace(/H451100,Business count,\d+,\d+,\d+/, 'H451100,Business count,S,S,S') })
    expect(sup.dataset.industries.H451100.counts.businesses).toBeNull()
  })
})

describe('the finder and the band', () => {
  const { dataset } = readBenchmarker({ ratiosCsv, financialCsv })

  test('finds by the start of a name first, then anywhere in it, and says which have benchmarks', () => {
    const hits = findIndustries(dataset, 'kitchen')
    expect(hits.map(h => h.code)).toEqual(['F373300'])
    expect(hits[0].benchmarks).toBe(false)
    expect(findIndustries(dataset, 'restaurants')[0].code).toBe('H451100')
    expect(findIndustries(dataset, 'H44')[0].code).toBe('H440000')
    expect(findIndustries(dataset, 'k')).toEqual([])
  })

  test('the band is the one whose turnover range holds the revenue; outside every band is null', () => {
    const cafes = dataset.industries.H451100
    expect(bandForRevenue(cafes, 300000)).toBe('small')
    expect(bandForRevenue(cafes, 249001)).toBe('small')
    expect(bandForRevenue(cafes, 20000000)).toBeNull()
    expect(bandForRevenue(dataset.industries.F373300, 300000)).toBeNull()
  })
})

describe('the client\'s ratios on Stats NZ\'s definitions', () => {
  const you = clientBenchmarkRatios({ current: CURRENT, prior: PRIOR })

  test('🔴 QUICK RATIO EXCLUDES STOCK, AND STOCK TURNOVER IS COST OF SALES OVER AVERAGE STOCK', () => {
    // current assets 800,000 (bank + debtors + stock + other) over 410,000
    expect(you.currentRatio).toBeCloseTo(800000 / 410000, 10)
    expect(you.quickRatio).toBeCloseTo(600000 / 410000, 10)
    // cost of sales 2,000,000 over the average of 150,000 and 200,000
    expect(you.stockTurnover).toBeCloseTo(2000000 / 175000, 10)
  })

  test('the profit and equity ratios use the report\'s own profit and equity', () => {
    // net profit 892,000; equity 1,305,000 − 615,000 = 690,000; total assets 1,305,000
    expect(you.returnOnEquity).toBeCloseTo(892000 / 690000, 10)
    expect(you.returnOnTotalAssets).toBeCloseTo(892000 / 1305000, 10)
    expect(you.grossProfitRatio).toBeCloseTo(1650000 / 3650000, 10)
    expect(you.liabilityStructure).toBeCloseTo(690000 / (690000 + 615000), 10)
    // wages over sales plus other income
    expect(you.wagesToTurnover).toBeCloseTo(596000 / 3660000, 10)
  })

  test('with no prior year the stock turnover is null, and an empty year gives nothing but nulls', () => {
    expect(clientBenchmarkRatios({ current: CURRENT, prior: null }).stockTurnover).toBeNull()
    const none = clientBenchmarkRatios({ current: {} })
    RATIO_ORDER.forEach(k => expect(none[k]).toBeNull())
  })
})

describe('the comparison the page prints', () => {
  const { dataset } = readBenchmarker({ ratiosCsv, financialCsv })
  const small = {
    tradingIncome: 300000,
    costOfSales: 100000,
    bank: 20000,
    accountsReceivable: 10000,
    stock: 5000,
    otherCurrentAssets: 0,
    fixedAssets: 80000,
    currentLiabilities: 30000,
    nonCurrentLiabilities: 40000,
    wages: 90000,
    operatingExpenses: 60000,
    depreciation: 5000,
    interestPaid: 3000,
    otherIncome: 0
  }

  test('positions each ratio against the middle half, in the page\'s order', () => {
    const r = compareToIndustry(dataset, { code: 'H451100', current: small, prior: { stock: 5000 } })
    expect(r.available).toBe(true)
    expect(r.band).toEqual({ key: 'small', min: 249001, max: 506000, chosenBy: 'revenue' })
    expect(r.rows.map(x => x.key)).toEqual(RATIO_ORDER)
    const cr = r.rows.find(x => x.key === 'currentRatio')
    // 35,000 over 30,000 = 1.17, above the 75th percentile of 1.06
    expect(cr.you).toBeCloseTo(35000 / 30000, 10)
    expect(cr.position).toBe('above')
    const st = r.rows.find(x => x.key === 'stockTurnover')
    // 100,000 over an average stock of 5,000 = 20, within 14–45
    expect(st.position).toBe('within')
    expect(r.industry.accuracy).toBe('caution')
    expect(r.year).toBe(2025)
  })

  test('the advisor\'s band wins over the revenue\'s, and says so', () => {
    const r = compareToIndustry(dataset, { code: 'H451100', band: 'large', current: small })
    expect(r.band.key).toBe('large')
    expect(r.band.chosenBy).toBe('advisor')
  })

  test('🔴 NO BENCHMARKS, NO TABLE — an unpublished row is marked, an unknown industry and an out-of-band revenue are refused', () => {
    const acc = compareToIndustry(dataset, { code: 'H440000', current: small, prior: { stock: 5000 } })
    expect(acc.available).toBe(true)
    expect(acc.rows.find(x => x.key === 'stockTurnover')).toMatchObject({ published: false, position: null, median: null })
    expect(compareToIndustry(dataset, { code: 'F373300', current: small })).toMatchObject({ available: false, blocked: 'NO_BENCHMARKS' })
    expect(compareToIndustry(dataset, { code: 'ZZZ', current: small })).toMatchObject({ available: false, blocked: 'NO_INDUSTRY' })
    expect(compareToIndustry(dataset, { code: 'H451100', current: Object.assign({}, small, { tradingIncome: 50000000 }) })).toMatchObject({ available: false, blocked: 'NO_BAND' })
  })
})

describe('the dataset in force', () => {
  test('the shipped file is the 2025 release, whole', () => {
    expect(isBenchmarkerDataset(BASE_BENCHMARKER)).toBe(true)
    expect(BASE_BENCHMARKER.year).toBe(2025)
    expect(BASE_BENCHMARKER.counts).toEqual({ industries: 483, withBenchmarks: 228, ratioRows: 6111 })
    expect(BASE_BENCHMARKER._readme).toBeUndefined()
  })

  test('a mentor\'s upload replaces the shipped file; anything else falls back to it', async () => {
    const uploaded = Object.assign({}, BASE_BENCHMARKER, { year: 2026 })
    const loader = jest.fn((scope, key) => { expect(scope).toBe(PLATFORM_SCOPE); expect(key).toBe(CONFIG_KEY); return Promise.resolve(uploaded) })
    expect((await loadBenchmarker(loader)).year).toBe(2026)
    expect(await loadBenchmarker(() => Promise.resolve({ junk: true }))).toBe(BASE_BENCHMARKER)
    expect(await loadBenchmarker(() => Promise.reject(new Error('down')))).toBe(BASE_BENCHMARKER)
  })
})
