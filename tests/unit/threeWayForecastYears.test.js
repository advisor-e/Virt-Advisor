'use strict'

const {
  computeThreeWayForecast, computeThreeYearForecast, carryForward, DEFAULTS
} = require('../../server/report/threeWayForecastModel')
const golden1 = require('../fixtures/threeWayForecastYear1.golden.json')
const golden23 = require('../fixtures/threeWayForecastYears23.golden.json')
const { SOURCE_ROWS } = require('./threeWayForecastRows')

/**
 * Three-Way Forecast — all three years, chained.
 *
 * Year 1 is proven in `threeWayForecastModel.test.js`. This suite proves the two things
 * years 2 and 3 add: that each year's own 3,385 cells reproduce the workbook, and that
 * the HANDOVER between years is right — which is the only genuinely new machinery, and
 * the place the workbook itself goes wrong.
 *
 * Every input is per-year in the source workbook (columns E/G, M/O and U/W of its Data
 * Input sheet), so the fixture carries the year-2 and year-3 input sets alongside their
 * expected output. Rows up to 104 sit on the same row in every sheet; from 106 up, years
 * 2 and 3 are ONE ROW HIGHER, because year 1 carries a blank row the later sheets drop.
 */

const COLUMNS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']
const TOLERANCE = 5e-7

function read (root, dotted) {
  return dotted.split('.').reduce(function (node, p) {
    if (node === undefined || node === null) { return undefined }
    return /^\d+$/.test(p) ? node[Number(p)] : node[p]
  }, root)
}

/** The workbook's own three-year run: year 1 from the year-1 fixture's defaults. */
function workbookRun (options) {
  return computeThreeYearForecast({ years: [{}, golden23.inputs['2'], golden23.inputs['3']] }, options)
}

describe('Years 2 and 3 reproduce the workbook exactly', () => {
  const run = workbookRun({ sourceFidelity: true })

  test('all 6,770 golden cells across years 2 and 3 match', () => {
    let compared = 0
    const failures = []
    for (const yearKey of ['2', '3']) {
      const yr = run.years[Number(yearKey) - 1]
      const rows = golden23.years[yearKey]
      Object.keys(rows).forEach((row) => {
        const series = read(yr, SOURCE_ROWS[row])
        if (!Array.isArray(series)) { failures.push('year ' + yearKey + ' row ' + row + ': no series'); return }
        rows[row].months.forEach((want, m) => {
          if (want === null) { return }
          compared++
          const got = series[m]
          const ok = typeof got === 'number' && isFinite(got) &&
            Math.abs(got - want) / Math.max(1, Math.abs(want)) < TOLERANCE
          if (!ok) {
            failures.push('year ' + yearKey + ' ' + COLUMNS[m] + rows[row].sheetRow +
              ' (' + rows[row].label + '): workbook ' + want + ', ours ' + got)
          }
        })
      })
    }
    expect(failures).toEqual([])
    expect(compared).toBe(golden23._source.cellCount)
    expect(compared).toBe(6770)
  })

  test('with year 1, the whole workbook reproduces — 10,155 cells', () => {
    // 3,385 per year across three years. The largest golden set in this repository by a
    // wide margin: Quick Position's was 32 and EBITDA's 96.
    const y1 = Object.keys(golden1.rows).reduce((a, r) => a + golden1.rows[r].months.filter(v => v !== null).length, 0)
    expect(y1 + golden23._source.cellCount).toBe(10155)
  })
})

describe('🔴 The workbook is not consistent between its own years', () => {
  const written = workbookRun({ sourceFidelity: true })
  const fixed = workbookRun()

  test('years 2 and 3 already total all six asset categories; year 1 stops at four', () => {
    // This is the evidence that R1 is the author's own intent rather than our judgement:
    // `SUM(D99:D104)` in years 2 and 3, `SUM(D99:D102)` in year 1.
    const y1 = written.years[0].balanceSheet.months.totalNonCurrentAssets[11]
    const sixOf = (yr, m) => Object.keys(yr.balanceSheet.months.nonCurrentAssets)
      .reduce((a, k) => a + yr.balanceSheet.months.nonCurrentAssets[k][m], 0)
    // Year 1 as written excludes two categories …
    expect(y1).toBeLessThan(sixOf(written.years[0], 11))
    // … while years 2 and 3 as written already include all six.
    expect(written.years[1].balanceSheet.months.totalNonCurrentAssets[11])
      .toBeCloseTo(sixOf(written.years[1], 11), 6)
    expect(written.years[2].balanceSheet.months.totalNonCurrentAssets[11])
      .toBeCloseTo(sixOf(written.years[2], 11), 6)
  })

  test('that inconsistency is what makes the workbook\'s year-2 check jump', () => {
    // Year 1 hands a four-of-six total to a sheet that totals six, so the check leaps at
    // the boundary. Correcting year 1 removes the jump entirely.
    const openY2 = written.years[1].balanceSheet.opening.balanceCheck
    const closeY1 = written.years[0].balanceSheet.months.balanceCheck[11]
    expect(Math.abs(openY2 - closeY1)).toBeGreaterThan(50000)
    // Corrected: the boundary is seamless.
    expect(fixed.years[1].balanceSheet.opening.balanceCheck)
      .toBe(fixed.years[0].balanceSheet.months.balanceCheck[11])
  })

  test('depreciation charges three of six in ALL three years, not just year 1', () => {
    written.years.forEach((yr) => {
      const allSix = Object.keys(yr.schedules.assets).reduce(
        (a, k) => a + yr.schedules.assets[k].depreciation[0], 0)
      expect(yr.profitAndLoss.depreciation[0]).toBeLessThan(allSix)
    })
    fixed.years.forEach((yr) => {
      const allSix = yr.schedules.assets.reduce((a, s) => a + s.depreciation[0], 0)
      expect(yr.profitAndLoss.depreciation[0]).toBeCloseTo(allSix, 6)
    })
  })
})

describe('R8 — the shareholder current accounts carry forward (Mike, 2026-09-02)', () => {
  const written = workbookRun({ sourceFidelity: true })
  const fixed = workbookRun()

  test('the workbook resets them to the year-1 opening in every later year', () => {
    // 'Data Input'!E68…E71 — the year-1 column — in year 2 AND year 3, so a year's
    // interest, advances and drawings vanish at each boundary.
    for (let n = 0; n < 4; n++) {
      const yearOneOpening = DEFAULTS.shareholders[n].opening
      expect(written.years[1].schedules.shareholders[n].openingBalance[0]).toBe(yearOneOpening)
      expect(written.years[2].schedules.shareholders[n].openingBalance[0]).toBe(yearOneOpening)
    }
  })

  test('corrected, each account opens where it closed', () => {
    for (let n = 0; n < 4; n++) {
      expect(fixed.years[1].schedules.shareholders[n].openingBalance[0])
        .toBe(fixed.years[0].schedules.shareholders[n].closingBalance[11])
      expect(fixed.years[2].schedules.shareholders[n].openingBalance[0])
        .toBe(fixed.years[1].schedules.shareholders[n].closingBalance[11])
    }
  })

  test('the loans always carried forward — which is why this was an omission', () => {
    // The author wired the loans up ('Data Input'!M347 = 'Yr 1. Projections'!O109) and
    // did not do the same for the current accounts.
    for (let n = 0; n < 3; n++) {
      expect(written.years[1].schedules.loans[n].openingBalance[0])
        .toBeCloseTo(written.years[0].schedules.loans[n].closingBalance[11], 6)
    }
  })
})

describe('The handover between years is complete', () => {
  const fixed = workbookRun()

  test('🔴 the balance check is flat across all 36 months and both year boundaries', () => {
    // The whole point of chaining: if ANY closing figure fails to reach the next year's
    // opening, the check moves. It does not move once.
    const opening = fixed.years[0].balanceSheet.opening.balanceCheck
    fixed.years.forEach((yr) => {
      expect(yr.balanceSheet.opening.balanceCheck).toBe(opening)
      yr.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(opening))
    })
  })

  test('an opening position that balances stays balanced for three years', () => {
    const tied = computeThreeYearForecast({
      years: [
        { openingBalanceSheet: Object.assign({}, DEFAULTS.openingBalanceSheet, { retainedEarnings: 7000 - 164000 }) },
        golden23.inputs['2'], golden23.inputs['3']
      ]
    })
    tied.years.forEach((yr) => {
      expect(yr.balanceSheet.opening.balanceCheck).toBe(0)
      yr.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(0))
    })
  })

  test('every closing position reaches the next year unchanged', () => {
    for (let y = 1; y < 3; y++) {
      const prev = fixed.years[y - 1]
      const now = fixed.years[y]
      const last = 11
      expect(now.balanceSheet.opening.cashAtBank).toBe(prev.balanceSheet.months.cashAtBank[last])
      expect(now.balanceSheet.opening.bankOverdraft).toBe(prev.balanceSheet.months.bankOverdraft[last])
      expect(now.balanceSheet.opening.accountsReceivable).toBe(prev.balanceSheet.months.accountsReceivable[last])
      expect(now.balanceSheet.opening.inventory).toBe(prev.balanceSheet.months.inventory[last])
      expect(now.balanceSheet.opening.accountsPayable).toBe(prev.balanceSheet.months.accountsPayable[last])
      expect(now.balanceSheet.opening.retainedEarnings).toBe(prev.balanceSheet.months.retainedEarnings[last])
      now.schedules.assets.forEach((a, n) => {
        expect(a.bookValue[0]).toBe(prev.schedules.assets[n].closingValue[last])
      })
      now.schedules.loans.forEach((l, n) => {
        expect(l.openingBalance[0]).toBe(prev.schedules.loans[n].closingBalance[last])
      })
    }
  })

  test('a net tax, GST or accrual balance lands on the correct side of the next year', () => {
    // Each is held as a pair of one-sided figures, so a net must be split back correctly
    // — putting a refund on the payable side would be invisible and wrong.
    for (let y = 1; y < 3; y++) {
      const prev = fixed.years[y - 1]
      const now = fixed.years[y]
      const taxNet = prev.schedules.tax.closingBalance[11]
      expect(now.schedules.tax.openingBalance[0]).toBeCloseTo(taxNet, 6)
      const gstNet = prev.schedules.gst.balanceClosing[11]
      expect(now.schedules.gst.balanceOpening[0]).toBeCloseTo(gstNet, 6)
      const accrualNet = prev.schedules.accruals.closingBalance[11]
      expect(now.schedules.accruals.openingBalance[0]).toBeCloseTo(accrualNet, 6)
    }
  })

  test('year 2 starts where year 1 finished', () => {
    for (let y = 1; y < 3; y++) {
      expect(fixed.years[y].months.serials[0]).toBe(fixed.years[y - 1].months.serials[11] + 31)
    }
  })
})

describe('🔴 An omitted later year repeats the year before it, never the sample', () => {
  test('a real client\'s year 1 is what years 2 and 3 inherit', () => {
    // Falling back to DEFAULTS would drop the source workbook's own trading figures
    // (890,000 of sales, "Big Bird Grass Seed") into a real client's later years,
    // silently, because the advisor filled in year 1 and left the rest alone.
    const client = { sales: new Array(12).fill(50000), markup: 0.4 }
    const r = computeThreeYearForecast({ years: [client, {}, {}] })
    const yearRevenue = yr => yr.profitAndLoss.revenue.reduce((a, v) => a + v, 0)
    expect(yearRevenue(r.years[0])).toBe(600000)
    expect(yearRevenue(r.years[1])).toBe(600000)
    expect(yearRevenue(r.years[2])).toBe(600000)
    expect(yearRevenue(r.years[1])).not.toBe(890000) // the sample workbook's own figure
    r.years.forEach(yr => expect(yr.schedules.inventory.costRatio).toBeCloseTo(1 / 1.4, 12))
  })

  test('a partial later year overrides only what it supplies', () => {
    const r = computeThreeYearForecast({
      years: [{ sales: new Array(12).fill(50000), markup: 0.4 }, { sales: new Array(12).fill(60000) }, {}]
    })
    const yearRevenue = yr => yr.profitAndLoss.revenue.reduce((a, v) => a + v, 0)
    expect(yearRevenue(r.years[1])).toBe(720000)
    // Year 2 changed its sales and kept year 1's mark-up; year 3 then inherits year 2.
    expect(r.years[1].schedules.inventory.costRatio).toBeCloseTo(1 / 1.4, 12)
    expect(yearRevenue(r.years[2])).toBe(720000)
  })
})

describe('The three-year summary', () => {
  const r = workbookRun()

  test('it totals the three years and reports the closing position', () => {
    const sum = k => r.years.reduce((a, yr) => a + yr.profitAndLoss[k].reduce((x, v) => x + v, 0), 0)
    expect(r.summary.revenue).toBeCloseTo(sum('revenue'), 6)
    expect(r.summary.netSurplusAfterTax).toBeCloseTo(sum('netSurplusAfterTax'), 6)
    expect(r.summary.closingCash).toBe(r.years[2].cashFlow.closingBalance[11])
    expect(r.summary.balanceCheck).toBe(r.years[2].balanceSheet.months.balanceCheck[11])
  })

  test('the lowest cash point is found across all 36 months, and dated', () => {
    let lowest = Infinity
    r.years.forEach(yr => yr.cashFlow.closingBalance.forEach((v) => { if (v < lowest) { lowest = v } }))
    expect(r.summary.lowestCash.value).toBe(lowest)
    expect(r.summary.lowestCash.year).toBeGreaterThanOrEqual(1)
    expect(r.summary.lowestCash.year).toBeLessThanOrEqual(3)
    expect(r.summary.lowestCash.month).toBeGreaterThanOrEqual(1)
    expect(r.summary.lowestCash.month).toBeLessThanOrEqual(12)
    expect(typeof r.summary.lowestCash.date).toBe('string')
  })
})

describe('Robustness of the chain', () => {
  test('junk in a later year cannot produce a non-finite forecast', () => {
    const r = computeThreeYearForecast({
      years: [{}, { sales: 'nonsense', assets: 'not an array', loans: null }, { markup: NaN }]
    })
    r.years.forEach((yr) => {
      yr.cashFlow.closingBalance.forEach(v => expect(isFinite(v)).toBe(true))
      yr.balanceSheet.months.balanceCheck.forEach(v => expect(isFinite(v)).toBe(true))
    })
  })

  test('a bare single-year object is accepted and drives all three years', () => {
    const r = computeThreeYearForecast({ sales: new Array(12).fill(30000) })
    expect(r.years).toHaveLength(3)
    r.years.forEach(yr => expect(yr.profitAndLoss.revenue.reduce((a, v) => a + v, 0)).toBe(360000))
  })

  test('carryForward leaves the year it is given untouched', () => {
    // It must not mutate the caller's inputs — a shared object edited in place is how a
    // second run silently differs from the first.
    const y1 = computeThreeWayForecast({})
    const nextInputs = { sales: new Array(12).fill(1000) }
    const frozen = JSON.stringify(nextInputs)
    carryForward(y1, nextInputs, null)
    expect(JSON.stringify(nextInputs)).toBe(frozen)
  })
})
