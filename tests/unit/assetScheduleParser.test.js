'use strict'

/**
 * The FIXED ASSET SCHEDULE reader — item 4.65 slice 1, built 2026-09-08 from
 * design/mockups/three-way-forecast-asset-schedule.html, approved by Mike the same day with
 * all six of its questions ruled.
 *
 * 🔴 WHAT THESE CATCH THAT UAT CANNOT. Every fault below produces a forecast that BALANCES.
 * A book value read from the wrong column, a totals line read as a twelfth asset, or a rate
 * quietly applied from the wrong package all move the gain on sale — which moves the tax,
 * retained earnings and closing cash together. Nothing on any screen looks wrong.
 *
 * The grids are the two real exports Mike supplied on 2026-09-07, transcribed cell for cell:
 * MYOB_Financial_Exports.xlsx (Asset Register) and QuickBooks_Online_Financial_Exports.xlsx
 * (Fixed Asset Detail Report). They are written out here rather than read from disk because
 * those files live outside the repository and no test may depend on a developer's own machine.
 */

const {
  extractAssetSchedule,
  compareToBalanceSheet
} = require('../../server/report/intake/assetScheduleParser')

/** MYOB's Asset Register, exactly as the reader receives it. */
const MYOB = [
  ['Apex Auto & Engineering Ltd'],
  ['Asset Register Report'],
  ['Financial Year Ending December 31, 2025'],
  [],
  ['Asset Code', 'Asset Description', 'Asset Group', 'Purchase Date', 'Cost ($)', "Dep'n Rate", "Dep'n Method", 'Opening Accum Dep', "YTD Dep'n", 'Closing Carrying Value'],
  ['FA-001', '2-Post Vehicle Hoist 4T', 'Plant & Machinery', '15/03/2021', 18500, '10.00%', 'Diminishing Value', 7400, 1110, 9990],
  ['FA-002', 'Rotary Screw Air Compressor', 'Plant & Machinery', '20/06/2021', 12000, '10.00%', 'Straight Line', 4800, 1200, 6000],
  ['FA-003', 'Diagnostic Scan Tool Pro', 'Plant & Machinery', '10/01/2022', 9500, '15.00%', 'Diminishing Value', 2850, 997.5, 5652.5],
  ['FA-004', '3D Wheel Aligner System', 'Plant & Machinery', '05/08/2022', 32000, '12.50%', 'Straight Line', 8000, 4000, 20000],
  ['FA-005', 'MIG/TIG Welder Station', 'Plant & Machinery', '14/02/2023', 8000, '10.00%', 'Straight Line', 1200, 800, 6000],
  ['FA-006', 'Hydraulic Shop Press 30T', 'Plant & Machinery', '30/11/2023', 5000, '10.00%', 'Straight Line', 250, 500, 4250],
  ['FA-007', 'Heavy Tool Chest & Master Sets', 'Plant & Machinery', '12/05/2020', 40000, '15.00%', 'Diminishing Value', 24000, 2400, 13600],
  ['FA-008', '2021 Toyota HiAce Service Van', 'Motor Vehicles', '10/04/2021', 48000, '10.00%', 'Straight Line', 19200, 4800, 24000],
  ['FA-009', '2018 Ford Ranger Utility', 'Motor Vehicles', '18/09/2022', 37000, '10.00%', 'Diminishing Value', 2000, 3500, 31500],
  ['FA-010', 'High-Spec Dev Workstation', 'Office Equipment', '15/01/2023', 6500, '20.00%', 'Straight Line', 2166.67, 1300, 3033.33],
  ['FA-011', 'Reception Furniture & Displays', 'Office Equipment', '01/11/2021', 8000, '10.00%', 'Straight Line', 2450, 800, 4750],
  [null, 'TOTALS', null, null, 224500, null, null, 74316.67, 21407.5, 128775.83]
]

/** QuickBooks Online's Fixed Asset Detail Report, exactly as the reader receives it. */
const QUICKBOOKS = [
  ['Apex Auto & Engineering Ltd'],
  ['Fixed Asset Detail Report'],
  ['As of December 31, 2025'],
  [],
  ['Asset Name', 'Asset Account', 'Purchase Date', 'Cost Basis', 'Prior Depreciation', 'Current Depreciation', 'Accumulated Depreciation', 'Net Book Value'],
  ['2-Post Vehicle Hoist 4T', '1500 Workshop Machinery & Tools', '2021-03-15', 18500, 7400, 1850, 9250, 9250],
  ['Rotary Screw Air Compressor', '1500 Workshop Machinery & Tools', '2021-06-20', 12000, 4800, 1200, 6000, 6000],
  ['Diagnostic Scan Tool Pro', '1500 Workshop Machinery & Tools', '2022-01-10', 9500, 2850, 1425, 4275, 5225],
  ['3D Wheel Aligner System', '1500 Workshop Machinery & Tools', '2022-08-05', 32000, 8000, 4000, 12000, 20000],
  ['MIG/TIG Welder Station', '1500 Workshop Machinery & Tools', '2023-02-14', 8000, 1200, 800, 2000, 6000],
  ['Hydraulic Shop Press 30T', '1500 Workshop Machinery & Tools', '2023-11-30', 5000, 250, 500, 750, 4250],
  ['Heavy Tool Chest & Master Sets', '1500 Workshop Machinery & Tools', '2020-05-12', 40000, 24000, 6725, 30725, 9275],
  ['2021 Toyota HiAce Service Van', '1520 Motor Vehicles', '2021-04-10', 48000, 19200, 4800, 24000, 24000],
  ['2018 Ford Ranger Utility', '1520 Motor Vehicles', '2022-09-18', 37000, 2000, 2000, 4000, 33000],
  ['High-Spec Dev Workstation', '1540 Office Equipment', '2023-01-15', 6500, 2166.67, 1083.33, 3250, 3250],
  ['Reception Furniture & Displays', '1540 Office Equipment', '2021-11-01', 8000, 2450, 500, 2950, 5050],
  ['Total', null, null, 224500, 74316.67, 24358.33, 98675, 125825]
]

describe('a MYOB Asset Register', () => {
  const out = extractAssetSchedule(MYOB)

  test('is recognised, and reads all eleven assets', () => {
    expect(out.recognised).toBe(true)
    expect(out.kind).toBe('assetSchedule')
    expect(out.assets).toHaveLength(11)
  })

  test('🔴 does not read the TOTALS line as a twelfth asset', () => {
    // MYOB writes "TOTALS", which /^total\b/i does NOT match — the word boundary falls
    // between L and S. A totals row read as an asset would offer the whole register for sale
    // at 128,775.83 and the forecast would balance while disposing of it.
    expect(out.assets.map(a => a.name)).not.toContain('TOTALS')
    expect(out.assets.every(a => !/^totals?$/i.test(a.name))).toBe(true)
  })

  test('🔴 takes the book value from the CLOSING carrying value, not the cost', () => {
    // The whole feature is this one number. Reading cost instead would value the Ford Ranger
    // at 37,000 rather than 31,500 and turn a loss on sale into a much larger one.
    const ranger = out.assets.filter(a => /Ford Ranger/.test(a.name))[0]
    expect(ranger.bookValue).toBe(31500)
    expect(ranger.cost).toBe(37000)
  })

  test('the totals it reports match the file\'s own totals line exactly', () => {
    expect(out.totalCost).toBe(224500)
    expect(out.totalBookValue).toBe(128775.83)
    expect(out.statedTotalBookValue).toBe(128775.83)
    expect(out.warnings).toHaveLength(0)
  })

  test('🔴 derives accumulated depreciation rather than reading a column', () => {
    // MYOB gives "Opening Accum Dep" and a separate "YTD Dep'n"; QuickBooks gives one closing
    // figure. Reading MYOB's column would report the OPENING accumulated as the closing one —
    // understating it by a year, on a field of the same name in both packages.
    const hoist = out.assets.filter(a => /Vehicle Hoist/.test(a.name))[0]
    expect(hoist.accumulatedDepreciation).toBe(8510) // 18,500 cost − 9,990 book value
    expect(hoist.accumulatedDepreciation).not.toBe(7400) // the file's OPENING accumulated
  })

  test('reads the per-asset rate and method, which nothing uses', () => {
    // Question 4, ruled by Mike 2026-09-08: read them, store them, use neither. They are kept
    // so the decision can be revisited with the data already in hand, not so it can be applied.
    const ranger = out.assets.filter(a => /Ford Ranger/.test(a.name))[0]
    expect(ranger.depreciationRate).toBe(10)
    expect(ranger.depreciationMethod).toBe('Diminishing Value')
  })

  test('keeps the asset code and group', () => {
    const van = out.assets.filter(a => /HiAce/.test(a.name))[0]
    expect(van.code).toBe('FA-008')
    expect(van.group).toBe('Motor Vehicles')
  })

  test('reads the company and the financial-year date line', () => {
    expect(out.companyName).toBe('Apex Auto & Engineering Ltd')
    expect(out.reportDate).toBe('Financial Year Ending December 31, 2025')
  })
})

describe('a QuickBooks Online Fixed Asset Detail Report', () => {
  const out = extractAssetSchedule(QUICKBOOKS)

  test('is recognised, and reads all eleven assets', () => {
    expect(out.recognised).toBe(true)
    expect(out.assets).toHaveLength(11)
  })

  test('🔴 takes Net Book Value, never Cost Basis, though both match /cost/', () => {
    const ranger = out.assets.filter(a => /Ford Ranger/.test(a.name))[0]
    expect(ranger.bookValue).toBe(33000)
    expect(ranger.cost).toBe(37000)
  })

  test('🔴 warns that this real file does not tie to ITSELF, and uses the rows', () => {
    // Found on the reader's first real run, 2026-09-08. Every row is internally consistent
    // (cost − accumulated = net book value on all eleven) and the cost total is right, but the
    // totals line understates accumulated depreciation by 525 — so the book value it prints is
    // 525 more than its own rows add up to. The rows are what can be offered for sale, so the
    // rows win; a silent choice either way would move a gain on sale by 525.
    expect(out.totalBookValue).toBe(125300)
    expect(out.statedTotalBookValue).toBe(125825)
    expect(out.warnings).toHaveLength(1)
    expect(out.warnings[0]).toMatch(/125300\.00|125,300/)
  })

  test('every row ties internally, which is what proves the 525 is the file\'s', () => {
    out.assets.forEach((a) => {
      expect(a.cost - a.accumulatedDepreciation).toBeCloseTo(a.bookValue, 2)
    })
    expect(out.totalCost).toBe(224500)
    expect(out.statedTotalCost).toBe(224500)
  })

  test('carries no per-asset rate, because QuickBooks supplies none', () => {
    // The reason question 4 was ruled as it was: taking MYOB's rate and not this one would
    // make the same business forecast differently depending on its software.
    expect(out.assets.every(a => a.depreciationRate === null)).toBe(true)
    expect(out.assets.every(a => a.depreciationMethod === null)).toBe(true)
  })

  test('keeps the account as the group, number and all', () => {
    const van = out.assets.filter(a => /HiAce/.test(a.name))[0]
    expect(van.group).toBe('1520 Motor Vehicles')
    expect(van.code).toBeNull()
  })
})

describe('what it refuses', () => {
  test('a Balance Sheet is not an asset schedule', () => {
    // Both packages' balance sheets hold a fixed-asset SECTION. If this reader claimed them,
    // the route would attach a schedule built from category totals and the chooser would
    // offer "Total Property, Plant & Equipment" for sale.
    const bs = [
      ['Apex Auto & Engineering Ltd'],
      ['Balance Sheet'],
      ['As of December 31, 2025'],
      [],
      [null, 'TOTAL'],
      ['ASSETS'],
      ['  Current Assets'],
      ['    Bank Accounts'],
      ['      1000 Operating Account', 64500],
      ['  Fixed Assets'],
      ['    1500 Workshop Machinery & Tools', 125000],
      ['  Total Fixed Assets', 145300]
    ]
    expect(extractAssetSchedule(bs).recognised).toBe(false)
  })

  test('a table with the right columns but no schedule title is refused', () => {
    const notASchedule = [
      ['Some Other Report'],
      ['Asset Name', 'Net Book Value'],
      ['A thing', 100]
    ]
    expect(extractAssetSchedule(notASchedule).recognised).toBe(false)
  })

  test('a titled report with no readable rows is refused rather than returned empty', () => {
    // An empty schedule would present as "no assets to sell", which reads identically to a
    // client who owns nothing — the advisor would never know the file failed to parse.
    const empty = [
      ['Apex Auto & Engineering Ltd'],
      ['Asset Register Report'],
      ['Asset Description', 'Closing Carrying Value'],
      [null, null]
    ]
    expect(extractAssetSchedule(empty).recognised).toBe(false)
  })

  test('never throws on rubbish', () => {
    expect(extractAssetSchedule(null).recognised).toBe(false)
    expect(extractAssetSchedule([]).recognised).toBe(false)
    expect(extractAssetSchedule([[]]).recognised).toBe(false)
  })
})

describe('reading awkward cells', () => {
  function withRow (row) {
    return extractAssetSchedule([
      ['Asset Register Report'],
      ['Asset Description', 'Cost ($)', 'Closing Carrying Value'],
      row
    ])
  }

  test('a thousands-separated string is a number', () => {
    expect(withRow(['A thing', '18,500.00', '9,990.00']).assets[0].bookValue).toBe(9990)
  })

  test('an accounting negative in brackets is negative', () => {
    expect(withRow(['A thing', '1,000', '(250.50)']).assets[0].bookValue).toBe(-250.5)
  })

  test('🔴 a fully written-down asset carrying a real zero is kept', () => {
    // Zero is a fact — the asset exists and is worth nothing — and it must still be sellable,
    // because selling it is exactly when the whole proceeds are a gain. A reader treating 0 as
    // "no value" would drop it from the chooser and the advisor would type the figure instead.
    const out = withRow(['A written-down thing', 5000, 0])
    expect(out.assets).toHaveLength(1)
    expect(out.assets[0].bookValue).toBe(0)
    expect(out.assets[0].accumulatedDepreciation).toBe(5000)
  })

  test('a row with no book value at all is skipped, not read as zero', () => {
    expect(extractAssetSchedule([
      ['Asset Register Report'],
      ['Asset Description', 'Closing Carrying Value'],
      ['A thing', null],
      ['A real thing', 100]
    ]).assets.map(a => a.name)).toEqual(['A real thing'])
  })
})

describe('comparing a schedule to the balance sheet', () => {
  // Mike's ruling, question 3: say it, never block. Neither real export ties.
  test('reports the difference without judging it', () => {
    const c = compareToBalanceSheet(128775.83, 145300)
    expect(c.available).toBe(true)
    expect(c.ties).toBe(false)
    expect(c.difference).toBe(16524.17)
  })

  test('the QuickBooks gap is a round twenty thousand against its rows', () => {
    expect(compareToBalanceSheet(125300, 145300).difference).toBe(20000)
  })

  test('a penny of rounding still ties', () => {
    expect(compareToBalanceSheet(145300, 145300.01).ties).toBe(true)
    expect(compareToBalanceSheet(145300, 145300.5).ties).toBe(false)
  })

  test('says so plainly when there is nothing to compare', () => {
    expect(compareToBalanceSheet(null, 145300).available).toBe(false)
    expect(compareToBalanceSheet(125300, null).available).toBe(false)
  })
})
