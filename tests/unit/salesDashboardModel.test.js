'use strict'

const {
  DEFAULT_CEILINGS,
  DIMENSIONS,
  DEFAULT_INPUTS,
  ceilingsFrom,
  bandsFrom,
  bandOf,
  readRow,
  totalsOf,
  dimensionOf,
  trendOf,
  availableDimensions,
  computeSalesDashboard
} = require('../../server/report/salesDashboardModel')

/**
 * GOLDEN TEST — Sales Dashboard.
 *
 * Every expected number below is the source workbook's OWN cached value, read straight out of
 * `design/report-source-models/Sales Dashboard.xlsx`, with the cell reference beside it so any
 * figure can be re-checked by hand — EXCEPT where a case is marked as one of the three ruled
 * deviations, which carry the workbook's figure AND ours side by side.
 *
 * 🔴 THE THREE RULED DEVIATIONS — Mike, 2026-09-13, on `design/mockups/sales-dashboard.html`:
 *
 *   3. A sale of exactly $2,500, $2,501 or $5,000 banks its money in a band and is counted in
 *      none, because row 17 of `Sheet1` counts with strict inequalities where row 16 sums with
 *      inclusive ones.
 *   4. The headline sales count reads a list 21 rows shorter than the one the money reads —
 *      five different end points for one list.
 *   7. `Sheet1` S35, Shaun's transaction count, reads `=Z9`, which is Sue's.
 *
 * 🔴 NONE OF THE THREE IS VISIBLE IN THE SAMPLE, which is why they were settled at drawing time.
 * The block "Deviations from the workbook" at the foot of this file proves each one on data that
 * DOES show it, with the workbook's own arithmetic reproduced beside ours.
 *
 * The sample carries NO DATE, because the workbook carries none. Decision 9's trend is therefore
 * proved on dated rows of our own — never on invented dates smuggled into the sample.
 */

// Money in this workbook is whole dollars and the ratios are cached to 10 significant figures.
// 6dp is comfortably tighter than anything the screen displays while tolerating IEEE noise.
const P = 6

const model = computeSalesDashboard(DEFAULT_INPUTS)

describe('Sales Dashboard — the sample, against the workbook', () => {
  it('reads all 140 transactions of `Sales Data Input` B18:J157', () => {
    expect(model.transactionsRead).toBe(140)
    expect(DEFAULT_INPUTS.sales).toHaveLength(140)
  })

  it('totals the four headline figures exactly as the Report sheet caches them', () => {
    expect(model.totals.salesValue).toBeCloseTo(269683, P) // Report K17 · Sheet1 W17
    expect(model.totals.salesMargin).toBeCloseTo(130289, P) // Report L17 · Sheet1 X16
    expect(model.totals.transactions).toBe(140) // Report J17 = SUM(J6:J15)
    expect(model.totals.averageSaleValue).toBeCloseTo(1926.307143, P) // Report J22 = K17/J17
    expect(model.totals.averageSaleMargin).toBeCloseTo(930.6357143, P) // Report J21 = L17/J17
    expect(model.totals.marginPct).toBeCloseTo(0.4831190694, P) // Report K21 = L17/K17
  })

  it('reproduces the cost total the input sheet caches', () => {
    // `Sales Data Input` F13. Not shown on the screen, but it is what makes the margin the
    // workbook's rather than one of our own devising.
    const cost = DEFAULT_INPUTS.sales.reduce((t, r) => t + r.cost, 0)
    expect(cost).toBeCloseTo(139394, P)
    expect(model.totals.salesValue - cost).toBeCloseTo(model.totals.salesMargin, P)
  })

  it('derives the first transaction exactly as `Sales Data Input` row 18 caches it', () => {
    const row = readRow(DEFAULT_INPUTS.sales[0])
    expect(row.revenue).toBe(15250) // E18
    expect(row.cost).toBe(6850) // F18
    expect(row.margin).toBeCloseTo(8400, P) // G18 = E18 − F18
    expect(row.marginPct).toBeCloseTo(0.5508196721, P) // H18 = if(E18=0,0,(E18−F18)/E18)
    expect(row.date).toBeNull() // 🔴 the sheet has no date column at all
  })
})

describe('the Sales Ranges Breakdown — `Report` D5:M17', () => {
  /** The ten bands, in the order the Report sheet prints them. */
  const b = model.bands

  it('splits the sample into the workbook\'s own ten bands', () => {
    expect(b).toHaveLength(10)
    expect(b[0]).toMatchObject({ from: 1, to: 250 }) // Report F6 / H6
    expect(b[1]).toMatchObject({ from: 251, to: 500 }) // Report F7 = H6+1 / H7
    expect(b[4]).toMatchObject({ from: 1501, to: 2500 }) // Report F10 / H10
    expect(b[9]).toMatchObject({ from: 15001, to: null }) // Report H15 = H14+1, "Greater than"
  })

  it('counts each band exactly as `Sheet1` row 17 caches it', () => {
    expect(b[0].transactions).toBe(13) // Sheet1 D17 → Report J6
    expect(b[1].transactions).toBe(7) // Sheet1 F17 → Report J7
    expect(b[2].transactions).toBe(36) // Sheet1 H17 → Report J8
    expect(b[3].transactions).toBe(13) // Sheet1 J17 → Report J9
    expect(b[4].transactions).toBe(40) // Sheet1 L17 → Report J10
    expect(b[5].transactions).toBe(25) // Sheet1 N17 → Report J11
    expect(b[6].transactions).toBe(3) // Sheet1 P17 → Report J12
    expect(b[7].transactions).toBe(2) // Sheet1 R17 → Report J13
    expect(b[8].transactions).toBe(0) // Sheet1 T17 → Report J14
    expect(b[9].transactions).toBe(1) // Sheet1 V17 → Report J15
  })

  it('sums each band\'s sales value exactly as `Sheet1` row 16 caches it', () => {
    expect(b[0].salesValue).toBeCloseTo(2369, P) // Sheet1 E16 → Report K6
    expect(b[1].salesValue).toBeCloseTo(2534, P) // Sheet1 G16 → Report K7
    expect(b[2].salesValue).toBeCloseTo(27630, P) // Sheet1 I16 → Report K8
    expect(b[3].salesValue).toBeCloseTo(17550, P) // Sheet1 K16 → Report K9
    expect(b[4].salesValue).toBeCloseTo(83000, P) // Sheet1 M16 → Report K10
    expect(b[5].salesValue).toBeCloseTo(86700, P) // Sheet1 O16 → Report K11
    expect(b[6].salesValue).toBeCloseTo(18100, P) // Sheet1 Q16 → Report K12
    expect(b[7].salesValue).toBeCloseTo(16550, P) // Sheet1 S16 → Report K13
    expect(b[8].salesValue).toBeCloseTo(0, P) // Sheet1 U16 → Report K14
    expect(b[9].salesValue).toBeCloseTo(15250, P) // Sheet1 W16 → Report K15
  })

  it('sums each band\'s sales margin exactly as `Sheet1` row 16 caches it', () => {
    expect(b[0].salesMargin).toBeCloseTo(1129, P) // Sheet1 D16 → Report L6
    expect(b[1].salesMargin).toBeCloseTo(1309, P) // Sheet1 F16 → Report L7
    expect(b[2].salesMargin).toBeCloseTo(14326, P) // Sheet1 H16 → Report L8
    expect(b[3].salesMargin).toBeCloseTo(8107, P) // Sheet1 J16 → Report L9
    expect(b[4].salesMargin).toBeCloseTo(42305, P) // Sheet1 L16 → Report L10
    expect(b[5].salesMargin).toBeCloseTo(41007, P) // Sheet1 N16 → Report L11
    expect(b[6].salesMargin).toBeCloseTo(7223, P) // Sheet1 P16 → Report L12
    expect(b[7].salesMargin).toBeCloseTo(6483, P) // Sheet1 R16 → Report L13
    expect(b[8].salesMargin).toBeCloseTo(0, P) // Sheet1 T16 → Report L14
    expect(b[9].salesMargin).toBeCloseTo(8400, P) // Sheet1 V16 → Report L15
  })

  it('reconciles: the ten bands add back to the Total line the Report sheet prints', () => {
    // The point of ruled deviation 1, stated as arithmetic. The workbook cannot pass this on
    // data containing a sale at $2,500, $2,501 or $5,000 — see the deviations block below.
    const sum = k => b.reduce((t, x) => t + x[k], 0)
    expect(sum('transactions')).toBe(model.totals.transactions)
    expect(sum('salesValue')).toBeCloseTo(model.totals.salesValue, P)
    expect(sum('salesMargin')).toBeCloseTo(model.totals.salesMargin, P)
    expect(model.unbanded.transactions).toBe(0)
  })

  it('gives each band its own margin %, which the workbook shows only for the page', () => {
    // Recorded on the drawing as an addition rather than slipped in: the sheet caches 48.3% for
    // the whole page (Report K21) and nothing per band.
    expect(b[0].marginPct).toBeCloseTo(1129 / 2369, P)
    expect(b[9].marginPct).toBeCloseTo(8400 / 15250, P)
    expect(b[8].marginPct).toBeNull() // an empty band has no percentage, not a zero
  })
})

describe('the five cuts — `Sheet1` rows 3 to 14', () => {
  it('totals every brand exactly as the Brand block caches it', () => {
    const byName = {}
    model.dimensions.brand.forEach((r) => { byName[r.name] = r })
    // Sheet1 D11:M13 — margin, value, count — read against `Sales Data Input` column B.
    expect(byName.Smith).toMatchObject({ transactions: 8, salesValue: 59500, salesMargin: 26570 })
    expect(byName.Jones).toMatchObject({ transactions: 5, salesValue: 21900, salesMargin: 8673 })
    expect(byName.Wessen).toMatchObject({ transactions: 6, salesValue: 20300, salesMargin: 9509 })
    expect(byName.Apple).toMatchObject({ transactions: 8, salesValue: 23500, salesMargin: 11369 })
    expect(byName.Honda).toMatchObject({ transactions: 8, salesValue: 21000, salesMargin: 12437 })
    expect(byName.Seiko).toMatchObject({ transactions: 9, salesValue: 21600, salesMargin: 10800 })
    expect(byName.Shimano).toMatchObject({ transactions: 6, salesValue: 13850, salesMargin: 6863 })
    expect(byName.Samsung).toMatchObject({ transactions: 4, salesValue: 7400, salesMargin: 3452 })
    expect(byName.Dulux).toMatchObject({ transactions: 14, salesValue: 25450, salesMargin: 12619 })
    expect(byName.Toyota).toMatchObject({ transactions: 72, salesValue: 55183, salesMargin: 27997 })
  })

  it('totals every product exactly as the Product block caches it', () => {
    const byName = {}
    model.dimensions.product.forEach((r) => { byName[r.name] = r })
    // Sheet1 D7:M9, read against `Sales Data Input` column C.
    expect(byName.Coco).toMatchObject({ transactions: 14, salesValue: 38185, salesMargin: 20337 })
    expect(byName.Zoco).toMatchObject({ transactions: 14, salesValue: 29485, salesMargin: 13363 })
    expect(byName.Mofo).toMatchObject({ transactions: 14, salesValue: 28535, salesMargin: 12882 })
    expect(byName.Bojo).toMatchObject({ transactions: 14, salesValue: 27130, salesMargin: 12634 })
    expect(byName.Lodo).toMatchObject({ transactions: 14, salesValue: 26060, salesMargin: 11165 })
    expect(byName.Rodo).toMatchObject({ transactions: 14, salesValue: 25267, salesMargin: 12134 })
    expect(byName.Podo).toMatchObject({ transactions: 14, salesValue: 24192, salesMargin: 12512 })
    expect(byName.Hodo).toMatchObject({ transactions: 14, salesValue: 23793, salesMargin: 11880 })
    expect(byName.Dodo).toMatchObject({ transactions: 14, salesValue: 23793, salesMargin: 12551 })
    expect(byName.Sodo).toMatchObject({ transactions: 14, salesValue: 23243, salesMargin: 10831 })
  })

  it('totals every product category exactly as the Category block caches it', () => {
    const byName = {}
    model.dimensions.category.forEach((r) => { byName[r.name] = r })
    // Sheet1 D3:M5, read against `Sales Data Input` column D.
    expect(byName['Full Auto']).toMatchObject({ transactions: 20, salesValue: 37470, salesMargin: 20080 })
    expect(byName['Semi Auto']).toMatchObject({ transactions: 25, salesValue: 43301, salesMargin: 18778 })
    expect(byName['Double Barrel']).toMatchObject({ transactions: 19, salesValue: 43900, salesMargin: 21919 })
    expect(byName['Single Barrel']).toMatchObject({ transactions: 17, salesValue: 23697, salesMargin: 11205 })
    expect(byName['Extra Shiny']).toMatchObject({ transactions: 6, salesValue: 20050, salesMargin: 8480 })
    expect(byName['Low Sheen']).toMatchObject({ transactions: 1, salesValue: 5800, salesMargin: 2744 })
    expect(byName.Wet).toMatchObject({ transactions: 6, salesValue: 18150, salesMargin: 10636 })
    expect(byName.Dry).toMatchObject({ transactions: 17, salesValue: 24550, salesMargin: 12883 })
    expect(byName.Hard).toMatchObject({ transactions: 10, salesValue: 15470, salesMargin: 6992 })
    expect(byName.Soft).toMatchObject({ transactions: 19, salesValue: 37295, salesMargin: 16572 })
  })

  it('totals every region exactly as the Region block caches it', () => {
    const byName = {}
    model.dimensions.region.forEach((r) => { byName[r.name] = r })
    // Sheet1 R11:AA13, read against `Sales Data Input` column I.
    expect(byName.Auckland).toMatchObject({ transactions: 15, salesValue: 64275, salesMargin: 29390 })
    expect(byName.Christchurch).toMatchObject({ transactions: 6, salesValue: 25650, salesMargin: 10278 })
    expect(byName.Wellington).toMatchObject({ transactions: 17, salesValue: 28715, salesMargin: 14178 })
    expect(byName.Hamilton).toMatchObject({ transactions: 20, salesValue: 21160, salesMargin: 10672 })
    expect(byName.Tauranga).toMatchObject({ transactions: 10, salesValue: 25800, salesMargin: 14837 })
    expect(byName.Rotorua).toMatchObject({ transactions: 20, salesValue: 32270, salesMargin: 16132 })
    expect(byName.Nelson).toMatchObject({ transactions: 7, salesValue: 14050, salesMargin: 6715 })
    expect(byName.Dunedin).toMatchObject({ transactions: 23, salesValue: 31393, salesMargin: 16083 })
    expect(byName.Invercargill).toMatchObject({ transactions: 10, salesValue: 13500, salesMargin: 6412 })
    expect(byName.Kaitaia).toMatchObject({ transactions: 12, salesValue: 12870, salesMargin: 5592 })
  })

  it('totals every salesperson exactly as the Salesperson block caches it', () => {
    const byName = {}
    model.dimensions.salesperson.forEach((r) => { byName[r.name] = r })
    // Sheet1 R7:AA9, read against `Sales Data Input` column J. The lockstep sample gives all ten
    // exactly 14 sales, which is what hides the Decision 7 fault — see the deviations block.
    expect(byName.Billy).toMatchObject({ transactions: 14, salesValue: 38185, salesMargin: 20337 })
    expect(byName.Bobby).toMatchObject({ transactions: 14, salesValue: 29485, salesMargin: 13363 })
    expect(byName.Betty).toMatchObject({ transactions: 14, salesValue: 28535, salesMargin: 12882 })
    expect(byName.Barry).toMatchObject({ transactions: 14, salesValue: 27130, salesMargin: 12634 })
    expect(byName.Mary).toMatchObject({ transactions: 14, salesValue: 26060, salesMargin: 11165 })
    expect(byName.Marg).toMatchObject({ transactions: 14, salesValue: 25267, salesMargin: 12134 })
    expect(byName.Mavis).toMatchObject({ transactions: 14, salesValue: 24192, salesMargin: 12512 })
    expect(byName.Steve).toMatchObject({ transactions: 14, salesValue: 23793, salesMargin: 11880 })
    expect(byName.Sue).toMatchObject({ transactions: 14, salesValue: 23793, salesMargin: 12551 })
    expect(byName.Shaun).toMatchObject({ transactions: 14, salesValue: 23243, salesMargin: 10831 })
  })

  it('reconciles every cut back to the same page total — `Sheet1` N and AB columns', () => {
    // Sheet1 N3/N7/N11 and AB7/AB11 all cache 130289; N4/N8/N12 and AB8/AB12 cache 269683;
    // N5/N9/N13 and AB9/AB13 cache 140.
    DIMENSIONS.forEach((key) => {
      const rows = model.dimensions[key]
      expect(rows.reduce((t, r) => t + r.transactions, 0)).toBe(140)
      expect(rows.reduce((t, r) => t + r.salesValue, 0)).toBeCloseTo(269683, P)
      expect(rows.reduce((t, r) => t + r.salesMargin, 0)).toBeCloseTo(130289, P)
    })
  })

  it('ranks each cut largest first, so the ring and the table beside it agree', () => {
    const value = model.dimensions.brand.map(r => r.salesValue)
    expect(value).toEqual([...value].sort((a, x) => x - a))
    expect(model.dimensions.brand[0].name).toBe('Smith') // 59500, the largest
    expect(model.dimensions.brand[0].share).toBeCloseTo(59500 / 269683, P)
  })

  it('offers all five cuts on the sample, because the sample names all five', () => {
    expect(model.available).toEqual(['brand', 'product', 'category', 'region', 'salesperson'])
  })
})

describe('Deviations from the workbook — proved on data that shows them', () => {
  /**
   * 🔴 RULED DEVIATION 3 (Decision 3) — a sale counted in no band at all.
   *
   * The workbook's own arithmetic, reproduced so the two answers sit side by side. This is the
   * whole of the fault: the money test is inclusive, the count test is not.
   *
   * @param {Array<number>} revenues @returns {{banked: number, counted: number}}
   */
  function workbookBand1501to2500 (revenues) {
    return {
      // Sheet1 M16 = SUMIFS(… ">="&1501, … "<="&2500)
      banked: revenues.filter(v => v >= 1501 && v <= 2500).reduce((t, v) => t + v, 0),
      // Sheet1 L17 = COUNTIFS(… ">="&1501, … "<"&2500)   ← strict at the top
      counted: revenues.filter(v => v >= 1501 && v < 2500).length
    }
  }

  it('Decision 3 · a sale of exactly $2,500 is banked and counted by the workbook differently', () => {
    const revenues = [2000, 2500]
    const workbook = workbookBand1501to2500(revenues)
    expect(workbook.banked).toBe(4500) // both sales' money lands in the band
    expect(workbook.counted).toBe(1) // but only one of them is counted

    const ours = computeSalesDashboard({ sales: revenues.map(revenue => ({ revenue, cost: 0 })) })
    expect(ours.bands[4].salesValue).toBe(4500)
    expect(ours.bands[4].transactions).toBe(2) // ours counts what it banks
  })

  it('Decision 3 · $2,501 and $5,000 are the other two the workbook loses', () => {
    // Sheet1 O16 sums ">="&2501 and "<="&5000; N17 counts ">"&2501 and "<"&5000 — strict at BOTH
    // ends, so the band loses a sale at each edge.
    const revenues = [2501, 3000, 5000]
    const workbookCounted = revenues.filter(v => v > 2501 && v < 5000).length
    expect(workbookCounted).toBe(1)

    const ours = computeSalesDashboard({ sales: revenues.map(revenue => ({ revenue, cost: 0 })) })
    expect(ours.bands[5].transactions).toBe(3)
    expect(ours.bands[5].salesValue).toBe(10501)
  })

  it('Decision 3 · every band still reconciles when sales land on the edges', () => {
    const revenues = [250, 251, 500, 1000, 1500, 2500, 2501, 5000, 7500, 10000, 15000, 15001]
    const ours = computeSalesDashboard({ sales: revenues.map(revenue => ({ revenue, cost: 0 })) })
    const counted = ours.bands.reduce((t, b) => t + b.transactions, 0)
    expect(counted).toBe(revenues.length)
    expect(ours.unbanded.transactions).toBe(0)
  })

  it('Decision 4 · one list, read once — the count never stops rising while the money goes on', () => {
    // The workbook counts E18:E508 (491 rows) and sums E18:E518 (501). At 495 sales its count
    // sticks at 491 while the money keeps climbing, so the average sale value drifts upward for
    // no reason — a plausible-looking wrong number, which is the kind UAT cannot catch.
    const sales = []
    for (let i = 0; i < 495; i++) { sales.push({ revenue: 100, cost: 40 }) }

    const workbookCount = Math.min(sales.length, 491) // COUNTIF(E18:E508,">=1")
    const workbookValue = sales.length * 100 // SUM(E18:E518) reaches all 495
    expect(workbookValue / workbookCount).toBeCloseTo(100.8146639, 6) // not $100

    const ours = computeSalesDashboard({ sales })
    expect(ours.totals.transactions).toBe(495)
    expect(ours.totals.averageSaleValue).toBeCloseTo(100, P)
  })

  it('Decision 7 · each name is counted from its own column', () => {
    // Sheet1 S35 reads =Z9 (Sue's count) where it should read =AA9 (Shaun's). Give the two
    // different numbers of sales and the workbook would print Sue's count on Shaun's row, while
    // the money beside it and the total below it both stay right.
    const sales = [
      { revenue: 100, cost: 0, salesperson: 'Sue' },
      { revenue: 100, cost: 0, salesperson: 'Sue' },
      { revenue: 100, cost: 0, salesperson: 'Sue' },
      { revenue: 500, cost: 0, salesperson: 'Shaun' }
    ]
    const ours = computeSalesDashboard({ sales })
    const byName = {}
    ours.dimensions.salesperson.forEach((r) => { byName[r.name] = r })

    expect(byName.Sue.transactions).toBe(3)
    expect(byName.Shaun.transactions).toBe(1) // the workbook would print 3 here
    expect(byName.Shaun.salesValue).toBe(500) // its money was always right
    expect(ours.totals.transactions).toBe(4) // and so was the total
  })
})

describe('the band ceilings are the owner\'s — Decision 2', () => {
  it('uses the workbook\'s own nine when the owner sets none', () => {
    expect(model.ceilings).toEqual(DEFAULT_CEILINGS)
    expect(ceilingsFrom(undefined)).toEqual(DEFAULT_CEILINGS)
  })

  it('rebands the whole sample when the owner types their own', () => {
    const ours = computeSalesDashboard({
      sales: DEFAULT_INPUTS.sales,
      ceilings: [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000]
    })
    expect(ours.ceilings[0]).toBe(1000)
    expect(ours.bands[0]).toMatchObject({ from: 1, to: 1000 })
    expect(ours.bands[1]).toMatchObject({ from: 1001, to: 2000 })
    // The money is unchanged however it is banded — only where it sits moves.
    expect(ours.bands.reduce((t, b) => t + b.salesValue, 0)).toBeCloseTo(269683, P)
    expect(ours.bands.reduce((t, b) => t + b.transactions, 0)).toBe(140)
  })

  it('pushes a ceiling that crosses its neighbour aside rather than refusing it', () => {
    // Mike's ruling: refusing produced the worst outcome available — the screen went on showing
    // the number the owner typed while the model scored against the defaults.
    expect(ceilingsFrom([250, 100, 1000, 1500, 2500, 5000, 7500, 10000, 15000]))
      .toEqual([250, 251, 1000, 1500, 2500, 5000, 7500, 10000, 15000])
  })

  it('falls back to the workbook\'s own on a half-typed ladder, never on a partial one', () => {
    expect(ceilingsFrom([250, 500])).toEqual(DEFAULT_CEILINGS)
    expect(ceilingsFrom([250, null, 1000, 1500, 2500, 5000, 7500, 10000, 15000])).toEqual(DEFAULT_CEILINGS)
    expect(ceilingsFrom('nine')).toEqual(DEFAULT_CEILINGS)
  })

  it('puts a value at a ceiling in that band, and anything above it in the next', () => {
    const bands = bandsFrom(DEFAULT_CEILINGS)
    expect(bandOf(250, bands)).toBe(0)
    expect(bandOf(250.5, bands)).toBe(1) // the gap the workbook's printed floors leave
    expect(bandOf(251, bands)).toBe(1)
    expect(bandOf(1000000, bands)).toBe(9) // the top band is open-ended
    expect(bandOf(-500, bands)).toBe(-1) // a refund is not a sale in the lowest band
    expect(bandOf(null, bands)).toBe(-1)
  })

  it('reports a refund outside every band rather than dropping it', () => {
    // Otherwise the Total line would disagree with the sum of the rows — the very fault
    // Decision 3 exists to remove.
    const ours = computeSalesDashboard({ sales: [{ revenue: 500, cost: 0 }, { revenue: -200, cost: 0 }] })
    expect(ours.unbanded).toMatchObject({ transactions: 1, salesValue: -200 })
    const shown = ours.bands.reduce((t, b) => t + b.salesValue, 0) + ours.unbanded.salesValue
    expect(shown).toBeCloseTo(ours.totals.salesValue, P)
  })
})

describe('sales over time — Mike\'s Decision 9', () => {
  const dated = [
    { revenue: 100, cost: 40, brand: 'Smith', date: '2026-01-14' },
    { revenue: 300, cost: 100, brand: 'Smith', date: '2026-01-28' },
    { revenue: 200, cost: 90, brand: 'Jones', date: '2026-02-03' },
    { revenue: 400, cost: 150, brand: 'Smith', date: '2026-03-19' }
  ]

  it('returns no trend at all on the workbook sample, because it holds no date', () => {
    // 🔴 The card does not appear rather than drawing an empty one, and no month is inferred.
    expect(model.trend).toBeNull()
    expect(model.hasDates).toBe(false)
  })

  it('groups dated sales by month, in order, with the span stated', () => {
    const ours = computeSalesDashboard({ sales: dated })
    expect(ours.hasDates).toBe(true)
    expect(ours.trend.months.map(m => m.key)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(ours.trend.months[0]).toMatchObject({ transactions: 2, salesValue: 400, salesMargin: 260 })
    expect(ours.trend.from).toBe('2026-01')
    expect(ours.trend.to).toBe('2026-03')
    expect(ours.trend.transactions).toBe(4)
  })

  it('reconciles the trend to the page — its months add to the page total', () => {
    const ours = computeSalesDashboard({ sales: dated })
    expect(ours.trend.salesValue).toBeCloseTo(ours.totals.salesValue, P)
    expect(ours.trend.salesMargin).toBeCloseTo(ours.totals.salesMargin, P)
  })

  it('follows one row when it is clicked, and leaves the rest of the page whole', () => {
    const ours = computeSalesDashboard({ sales: dated, focus: { dimension: 'brand', value: 'Smith' } })
    expect(ours.focus).toEqual({ dimension: 'brand', value: 'Smith' })
    expect(ours.trend.transactions).toBe(3)
    expect(ours.trend.salesValue).toBe(800)
    // Everything else still describes all four sales.
    expect(ours.totals.transactions).toBe(4)
    expect(ours.totals.salesValue).toBe(1000)
  })

  it('ignores a focus naming a cut that does not exist', () => {
    const ours = computeSalesDashboard({ sales: dated, focus: { dimension: 'colour', value: 'Red' } })
    expect(ours.focus).toBeNull()
    expect(ours.trend.transactions).toBe(4)
  })

  it('says how many sales carry no date, on a part-dated file', () => {
    const ours = computeSalesDashboard({ sales: dated.concat([{ revenue: 50, cost: 10 }]) })
    expect(ours.trend.undated).toBe(1)
    expect(ours.trend.transactions).toBe(4)
    expect(ours.totals.transactions).toBe(5)
  })

  it('never reads a date it cannot be sure of', () => {
    // The reader already refuses "03/04/2021"; the model refuses anything that is not ISO, so a
    // date can never arrive here by a route that guessed at it.
    expect(readRow({ revenue: 1, date: '03/04/2021' }).date).toBeNull()
    expect(readRow({ revenue: 1, date: 44355 }).date).toBeNull()
    expect(trendOf([{ revenue: 1, margin: 0, date: null }])).toBeNull()
  })
})

describe('a cut appears only if its column is real — Decision 8', () => {
  it('offers only the cuts the file actually names', () => {
    const sales = [
      { revenue: 100, cost: 40, brand: 'Smith', product: 'Coco' },
      { revenue: 200, cost: 80, brand: 'Jones', product: 'Zoco' }
    ]
    expect(availableDimensions(sales.map(readRow))).toEqual(['brand', 'product'])
    expect(computeSalesDashboard({ sales }).available).toEqual(['brand', 'product'])
  })

  it('leaves the salesperson cut out when a firm does not supply the column', () => {
    // Decision 6's third limit: the tab simply never appears, and nothing else on the screen
    // changes. Scoped to this cut on this screen — it is not precedent.
    const sales = [{ revenue: 100, cost: 40, brand: 'Smith', region: 'Auckland' }]
    const ours = computeSalesDashboard({ sales })
    expect(ours.available).not.toContain('salesperson')
    expect(ours.dimensions.salesperson).toEqual([])
    expect(ours.totals.salesValue).toBe(100)
  })

  it('still works on the barest file — revenue and cost alone', () => {
    const ours = computeSalesDashboard({ sales: [{ revenue: 900, cost: 300 }] })
    expect(ours.available).toEqual([])
    expect(ours.totals).toMatchObject({ salesValue: 900, salesMargin: 600, transactions: 1 })
    expect(ours.bands[2].transactions).toBe(1) // 501 – 1,000
    expect(ours.trend).toBeNull()
  })
})

describe('bad input is refused rather than guessed at', () => {
  it('computes nothing rather than failing when called with nothing', () => {
    const empty = computeSalesDashboard()
    expect(empty.transactionsRead).toBe(0)
    expect(empty.totals).toMatchObject({ salesValue: 0, salesMargin: 0, transactions: 0 })
    expect(empty.totals.averageSaleValue).toBeNull()
    expect(empty.totals.marginPct).toBeNull()
    expect(empty.trend).toBeNull()
  })

  it('skips a row with no revenue figure rather than reading it as zero', () => {
    // A zero sale is a real answer; a missing one is not, and averaging over it would drag the
    // average sale value down by a row that never happened.
    expect(readRow({ cost: 40 })).toBeNull()
    expect(readRow({ revenue: '1,024' })).toBeNull() // a string is an intake fault, not a number
    const ours = computeSalesDashboard({ sales: [{ revenue: 100, cost: 40 }, { cost: 9 }] })
    expect(ours.transactionsRead).toBe(1)
    expect(ours.totals.averageSaleValue).toBe(100)
  })

  it('gives a zero-revenue row a null margin % rather than an error', () => {
    // The sheet guards this one itself: `if(E18=0,0,(E18−F18)/E18)`.
    const row = readRow({ revenue: 0, cost: 0 })
    expect(row.margin).toBe(0)
    expect(row.marginPct).toBeNull()
  })

  it('treats a missing cost as unknown margin, never as a full-margin sale', () => {
    const row = readRow({ revenue: 500 })
    expect(row.margin).toBeNull()
    expect(row.marginPct).toBeNull()
    const ours = computeSalesDashboard({ sales: [{ revenue: 500 }] })
    expect(ours.totals.salesMargin).toBe(0)
    expect(ours.totals.salesValue).toBe(500)
  })

  it('trims and ignores blank labels rather than grouping under an empty name', () => {
    const ours = computeSalesDashboard({
      sales: [
        { revenue: 100, cost: 0, brand: '  Smith  ' },
        { revenue: 200, cost: 0, brand: '   ' }
      ]
    })
    expect(ours.dimensions.brand).toHaveLength(1)
    expect(ours.dimensions.brand[0]).toMatchObject({ name: 'Smith', transactions: 1 })
    expect(ours.totals.transactions).toBe(2) // the unnamed sale still counts on the page
  })

  it('does not mutate the caller\'s rows', () => {
    const sales = [{ revenue: 100, cost: 40, brand: 'Smith' }]
    computeSalesDashboard({ sales })
    expect(sales[0]).toEqual({ revenue: 100, cost: 40, brand: 'Smith' })
  })
})

describe('the helpers, directly', () => {
  it('totalsOf divides by the rows it was given', () => {
    const t = totalsOf([{ revenue: 100, margin: 40 }, { revenue: 300, margin: 60 }])
    expect(t).toMatchObject({ salesValue: 400, salesMargin: 100, transactions: 2 })
    expect(t.averageSaleValue).toBe(200)
    expect(t.marginPct).toBeCloseTo(0.25, P)
  })

  it('dimensionOf breaks ties on the label so the order is stable', () => {
    const rows = [
      { brand: 'Zed', revenue: 100, margin: 10 },
      { brand: 'Ann', revenue: 100, margin: 10 }
    ]
    expect(dimensionOf(rows, 'brand', 200).map(r => r.name)).toEqual(['Ann', 'Zed'])
  })

  it('dimensionOf gives no share when the page total is zero', () => {
    expect(dimensionOf([{ brand: 'A', revenue: 0, margin: 0 }], 'brand', 0)[0].share).toBeNull()
  })
})
