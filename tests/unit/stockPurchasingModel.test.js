'use strict'

const {
  BANDS,
  CRITERIA,
  MAX_SCORE,
  DEFAULT_INPUTS,
  bandFor,
  scoreOne,
  daysOnHandOf,
  scoreLine,
  rank,
  affordability,
  shelfOf,
  computeStockPurchasing
} = require('../../server/report/stockPurchasingModel')

const WORKBOOK = require('../fixtures/stock-purchasing-workbook-cached.json')

/**
 * GOLDEN TEST — Stock Purchasing (Growth Pro).
 *
 * Every expected number is the source workbook's OWN cached value, read straight out of
 * `design/report-source-models/Growth Pro.1a.Stock Purchasing.xlsx`, EXCEPT where a case is marked
 * as a ruled deviation. `tests/fixtures/stock-purchasing-workbook-cached.json` holds what the
 * `Sales Report` sheet cached for all 969 of its named lines — the derived columns G, H, M, N, O
 * and the points columns R, S, T, U, V, W — so the port is proved against every row rather than
 * against a handful somebody chose.
 *
 * 🔴 THE TWO RULED DEVIATIONS — Mike, 2026-09-13, on `design/mockups/stock-purchasing.html`:
 *
 *   1. Every gap between the scoring rungs is closed (Decision 5).
 *   2. A criterion matching no band scores 0, the same way on both of the workbook's sheets
 *      (Decision 6).
 *
 * Both move figures, and the block "Deviations from the workbook" at the foot of this file pins
 * every line that moves with the workbook's own cached value beside ours. The headline is that
 * **919 of 969 lines are reproduced exactly** and all 50 differences are a workbook zero becoming
 * a real score — which is the whole of what the rulings were for. A difference of any other shape
 * would be a porting error and the aggregate case below fails on it.
 */

// Points are small integers and the derived money columns are pinned at 6dp — comfortably tighter
// than anything the report displays, while tolerating IEEE noise.
const P = 6

const model = computeStockPurchasing(DEFAULT_INPUTS)

/** The fixture and the sample are the same 969 rows in the same order. */
const byCode = {}
model.lines.forEach((line) => { byCode[line.code] = line })

/** Which of our score keys answers which of the workbook's points columns. */
const POINTS_COLUMN = {
  margin: 'pMargin',
  sold: 'pSold',
  unitCostRisk: 'pCost',
  daysOnHand: 'pDays',
  shareOfStock: 'pShare'
}

describe('Stock Purchasing — the sample, against the workbook', () => {
  it('reads all 969 named lines of `Sales Report` C7:P975', () => {
    expect(model.lines).toHaveLength(969)
    expect(WORKBOOK).toHaveLength(969)
    expect(model.lines[0].code).toBe('Widget 1')
  })

  it('derives Widget 1 exactly as `Sales Report` row 7 caches it', () => {
    const line = byCode['Widget 1']
    expect(line.grossProfit).toBeCloseTo(6.6, P) // G7  = E7 − F7
    expect(line.margin).toBeCloseTo(0.11, P) // H7  = G7 / E7
    expect(line.avgUnitSale).toBeCloseTo(60, P) // M7  = E7 / D7
    expect(line.daysOnHand).toBe(36) // N7  = datedif(I7, J7, "D")
    expect(line.avgUnitCost).toBeCloseTo(53.4, P) // O7  = F7 / D7
    expect(line.total).toBe(9) // W7  = SUM(R7:V7)
  })

  it('derives Widget 12 exactly — the sample\'s largest line, `Sales Report` row 18', () => {
    const line = byCode['Widget 12']
    expect(line.sales).toBeCloseTo(6423.91, P) // E18
    expect(line.grossProfit).toBeCloseTo(963.5865, P) // G18
    expect(line.margin).toBeCloseTo(0.15, P) // H18
    expect(line.avgUnitSale).toBeCloseTo(1070.651667, 5) // M18
    expect(line.avgUnitCost).toBeCloseTo(910.0539167, 5) // O18
  })

  it('reproduces every derived column the workbook cached, on all 969 lines', () => {
    const wrong = []
    model.lines.forEach((line, i) => {
      const cached = WORKBOOK[i]
      const near = (ours, theirs) =>
        ours === null ? theirs === null : Math.abs(ours - theirs) < 1e-6
      if (!near(line.grossProfit, cached.grossProfit)) { wrong.push(cached.code + ' grossProfit') }
      if (!near(line.margin, cached.margin)) { wrong.push(cached.code + ' margin') }
      if (!near(line.avgUnitSale, cached.avgUnitSale)) { wrong.push(cached.code + ' avgUnitSale') }
      if (!near(line.avgUnitCost, cached.avgUnitCost)) { wrong.push(cached.code + ' avgUnitCost') }
      if (line.daysOnHand !== cached.daysOnHand) { wrong.push(cached.code + ' daysOnHand') }
    })
    expect(wrong).toEqual([])
  })

  it('totals the sample as the named lines actually add up', () => {
    // NOT the sheet's own E3/G3, which are SUM(E7:E2402) and take in 1,335 further rows that carry
    // figures and NO product code. Those are excluded — a line with no name cannot go on a buy
    // list. The sheet caches 776,359.60 across all 2,304 populated rows; the named ones are these.
    expect(model.totals.salesReviewed).toBeCloseTo(274953.59, 2)
    expect(model.totals.grossProfit).toBeCloseTo(94108.8592, 2)
    expect(model.totals.averageMargin).toBeCloseTo(0.342271796, 6)
    expect(model.totals.linesReviewed).toBe(969)
    expect(model.totals.quantity).toBe(3387)
  })

  it('every line in the sample comes out at 36 days on hand — the SAMPLE, not the method', () => {
    // The workbook's entry and sale dates run one day apart down the whole sheet, so the
    // difference is constant. It is why totals here span 6–17 while the `Weighted Data Sort` tab
    // shows 22s: that tab ranks `Product Ratings`, where days on hand is typed in by hand and
    // varies. Pinned so nobody later reads the flat column as a bug in the subtraction.
    const distinct = new Set(model.lines.map(l => l.daysOnHand))
    expect(Array.from(distinct)).toEqual([36])
    expect(model.lines.every(l => l.scores.daysOnHand.points === 3)).toBe(true)
  })
})

describe('Stock Purchasing — the five ladders', () => {
  it('scores 1 to 5 on each of five criteria, so 25 is a perfect line', () => {
    expect(CRITERIA).toHaveLength(5)
    expect(MAX_SCORE).toBe(25)
    CRITERIA.forEach((c) => {
      expect(BANDS[c].map(b => b.points).sort()).toEqual([1, 2, 3, 4, 5])
    })
  })

  it('keeps the workbook\'s own rating words, with the two spellings Mike corrected', () => {
    // Mike, Decision 4, 2026-09-13: every word kept; `Occassional` and `Waking Nites` corrected.
    // These strings are the model's ids and its provenance — screen wording lives in `locales/`.
    // Pinned because they are the workbook's voice and a silent rewrite would lose it.
    expect(BANDS.daysOnHand.map(b => b.id))
      .toEqual(['Hot Cakes!', 'Quick Shifter', 'Come n Go', 'Sleepy', 'Dead Wood'])
    expect(BANDS.shareOfStock.map(b => b.id))
      .toEqual(['Drip', 'Trickle', 'Flowing', 'Flood', 'Torrent'])
    expect(BANDS.margin.map(b => b.id))
      .toEqual(['Minor', 'Moderate', 'Major', 'Fruitful', 'Awesome!'])
    expect(BANDS.sold.map(b => b.id))
      .toEqual(['Rare', 'Occasional', 'Regular', 'Frequent', 'Often'])
    expect(BANDS.unitCostRisk.map(b => b.id))
      .toEqual(['Minor', 'Low', 'Acceptable', 'Stressful', 'Waking Nights'])
  })

  it('inverts unit cost risk — a cheap unit is worth 5 and an expensive one 1', () => {
    expect(scoreOne(10, 'unitCostRisk').points).toBe(5)
    expect(scoreOne(500, 'unitCostRisk').points).toBe(1)
    expect(scoreOne(500, 'unitCostRisk').rating).toBe('Waking Nights')
  })

  it('inverts days on hand — a fast line is worth 5 and a slow one 1', () => {
    expect(scoreOne(3, 'daysOnHand').rating).toBe('Hot Cakes!')
    expect(scoreOne(400, 'daysOnHand').rating).toBe('Dead Wood')
  })

  it('scores each of the workbook\'s printed band edges as the workbook prints them', () => {
    // The lower edge of every rung, from `Product Categories`. These are the values the workbook
    // itself gets right; closing the gaps must not disturb any of them.
    expect(scoreOne(0, 'margin').points).toBe(1)
    expect(scoreOne(0.25, 'margin').points).toBe(1)
    expect(scoreOne(0.26, 'margin').points).toBe(2)
    expect(scoreOne(0.4, 'margin').points).toBe(2)
    expect(scoreOne(0.41, 'margin').points).toBe(3)
    expect(scoreOne(0.8, 'margin').points).toBe(3)
    expect(scoreOne(0.81, 'margin').points).toBe(4)
    expect(scoreOne(1, 'margin').points).toBe(4)
    expect(scoreOne(1.01, 'margin').points).toBe(5)

    expect(scoreOne(1, 'sold').points).toBe(1)
    expect(scoreOne(5, 'sold').points).toBe(1)
    expect(scoreOne(6, 'sold').points).toBe(2)
    expect(scoreOne(10, 'sold').points).toBe(2)
    expect(scoreOne(11, 'sold').points).toBe(3)
    expect(scoreOne(15, 'sold').points).toBe(3)
    expect(scoreOne(16, 'sold').points).toBe(4)
    expect(scoreOne(25, 'sold').points).toBe(4)
    expect(scoreOne(26, 'sold').points).toBe(5)

    expect(scoreOne(1, 'unitCostRisk').points).toBe(5)
    expect(scoreOne(25, 'unitCostRisk').points).toBe(5)
    expect(scoreOne(26, 'unitCostRisk').points).toBe(4)
    expect(scoreOne(40, 'unitCostRisk').points).toBe(4)
    expect(scoreOne(41, 'unitCostRisk').points).toBe(3)
    expect(scoreOne(75, 'unitCostRisk').points).toBe(3)
    expect(scoreOne(76, 'unitCostRisk').points).toBe(2)
    expect(scoreOne(175, 'unitCostRisk').points).toBe(2)
    expect(scoreOne(176, 'unitCostRisk').points).toBe(1)

    expect(scoreOne(1, 'daysOnHand').points).toBe(5)
    expect(scoreOne(13, 'daysOnHand').points).toBe(5)
    expect(scoreOne(14, 'daysOnHand').points).toBe(4)
    expect(scoreOne(27, 'daysOnHand').points).toBe(4)
    expect(scoreOne(28, 'daysOnHand').points).toBe(3)
    expect(scoreOne(44, 'daysOnHand').points).toBe(3)
    expect(scoreOne(45, 'daysOnHand').points).toBe(2)
    expect(scoreOne(74, 'daysOnHand').points).toBe(2)
    expect(scoreOne(75, 'daysOnHand').points).toBe(1)

    expect(scoreOne(0.01, 'shareOfStock').points).toBe(1)
    expect(scoreOne(0.05, 'shareOfStock').points).toBe(1)
    expect(scoreOne(0.06, 'shareOfStock').points).toBe(2)
    expect(scoreOne(0.125, 'shareOfStock').points).toBe(2)
    expect(scoreOne(0.135, 'shareOfStock').points).toBe(3)
    expect(scoreOne(0.33, 'shareOfStock').points).toBe(3)
    expect(scoreOne(0.34, 'shareOfStock').points).toBe(4)
    expect(scoreOne(0.58, 'shareOfStock').points).toBe(4)
    expect(scoreOne(0.59, 'shareOfStock').points).toBe(5)
    expect(scoreOne(1, 'shareOfStock').points).toBe(5)
  })
})

describe('Stock Purchasing — deviation 1, the gaps are closed (Mike, Decision 5)', () => {
  it('scores every value the workbook dropped between two rungs', () => {
    // Each of these matches NO branch of the workbook's IF chain and caches FALSE or the raw
    // value. Each now lands in the rung below, which is the conservative direction.
    expect(scoreOne(0.255, 'margin').points).toBe(1) // wb: 0.25–0.26 gap
    expect(scoreOne(0.405, 'margin').points).toBe(2) // wb: 0.40–0.41 gap
    expect(scoreOne(0.805, 'margin').points).toBe(3) // wb: 0.80–0.81 gap
    expect(scoreOne(1.005, 'margin').points).toBe(4) // wb: 1.00–1.01 gap
    expect(scoreOne(25.5, 'unitCostRisk').points).toBe(5) // wb: $25–26 gap
    expect(scoreOne(40.5, 'unitCostRisk').points).toBe(4) // wb: $40–41 gap
    expect(scoreOne(75.5, 'unitCostRisk').points).toBe(3) // wb: $75–76 gap
    expect(scoreOne(175.5, 'unitCostRisk').points).toBe(2) // wb: $175–176 gap
    expect(scoreOne(0.055, 'shareOfStock').points).toBe(1) // wb: 0.05–0.06 gap
    expect(scoreOne(0.13, 'shareOfStock').points).toBe(2) // wb: 0.125–0.135 gap
    expect(scoreOne(0.335, 'shareOfStock').points).toBe(3) // wb: 0.33–0.34 gap
    expect(scoreOne(0.585, 'shareOfStock').points).toBe(4) // wb: 0.58–0.59 gap
  })

  it('reaches down to zero, below the workbook\'s own lowest rung', () => {
    // Required by Decision 6's ruling that 0 is possible only on a blank or a negative. Without
    // this a 50-cent unit, or a line that is a rounding error of the shelf, would still score 0
    // and the fault would survive in miniature.
    expect(scoreOne(0.5, 'unitCostRisk').points).toBe(5)
    expect(scoreOne(0.001, 'shareOfStock').points).toBe(1)
    expect(scoreOne(0, 'sold').points).toBe(1)
    expect(scoreOne(0, 'daysOnHand').points).toBe(5)
  })

  it('leaves the two integer-counted ladders untouched, because they never had a live gap', () => {
    // Days and units are whole numbers, so 13→14 and 5→6 have nothing between them. Named so the
    // deviation is not over-claimed: three of the five ladders were broken, not five.
    const differing = []
    model.lines.forEach((line, i) => {
      if (line.scores.daysOnHand.points !== WORKBOOK[i].pDays) { differing.push(WORKBOOK[i].code) }
      if (line.scores.sold.points !== WORKBOOK[i].pSold) { differing.push(WORKBOOK[i].code) }
      if (line.scores.margin.points !== WORKBOOK[i].pMargin) { differing.push(WORKBOOK[i].code) }
    })
    expect(differing).toEqual([])
  })
})

describe('Stock Purchasing — deviation 2, no band scores 0 (Mike, Decision 6)', () => {
  it('scores 0 and says so when a value is missing, negative or not a number', () => {
    expect(scoreOne(null, 'margin')).toEqual({ value: null, points: 0, rating: null, scored: false })
    expect(scoreOne(-1, 'unitCostRisk').points).toBe(0)
    expect(scoreOne(-0.5, 'shareOfStock').scored).toBe(false)
    expect(bandFor(null, BANDS.margin)).toBeNull()
  })

  it('NEVER adds the measurement itself to the total, which is what `Product Ratings` does', () => {
    // The fault this ruling exists for: that sheet ends its chains `IF(x="",0,x)`, so a ratio is
    // added to a points column. Widget 9 caches 9.13 out of 25 there — four criteria gave 9 and
    // the fifth gave 0.13. A total is now always a whole number.
    const line = scoreLine({
      code: 'gap on every criterion',
quantity: -1,
sales: 100,
cost: 50,
      entryDate: null,
saleDate: null,
shareOfStock: -0.5
    })
    expect(line.total).toBe(Number.isInteger(line.total) ? line.total : NaN)
    expect(model.lines.every(l => Number.isInteger(l.total))).toBe(true)
  })

  it('scores a zero-sales line 0 for margin rather than erroring', () => {
    // `Sales Report` H is `G/E` with no guard and caches #DIV/0! in 33 cells. A real client can
    // have a line that sold nothing.
    const line = scoreLine({ code: 'sold nothing', quantity: 0, sales: 0, cost: 0, shareOfStock: 0.5 })
    expect(line.margin).toBeNull()
    expect(line.scores.margin.points).toBe(0)
    expect(line.scores.margin.scored).toBe(false)
    expect(Number.isInteger(line.total)).toBe(true)
  })

  it('tests the QUANTITY for how many sold, which the workbook\'s middle branch does not', () => {
    // `Sales Report` S7 reads `AND(D7<=15, I7>=11)` — I7 is the entry date, where the four
    // sibling branches all read D7. A 11–15 unit line with no entry date scores 0 there.
    const line = scoreLine({
      code: 'twelve units, no dates', quantity: 12, sales: 500, cost: 300, shareOfStock: 0.2
    })
    expect(line.scores.sold.points).toBe(3)
    expect(line.scores.sold.rating).toBe('Regular')
  })
})

describe('Stock Purchasing — deviations from the workbook, line by line', () => {
  /**
   * The whole of what the two rulings change on the workbook's own sample, with its cached value
   * beside ours. Anything outside this shape is a porting error, not a ruling.
   */
  const moved = []
  model.lines.forEach((line, i) => {
    const cached = WORKBOOK[i]
    CRITERIA.forEach((c) => {
      const ours = line.scores[c].points
      const theirs = cached[POINTS_COLUMN[c]]
      if (ours !== theirs) { moved.push({ code: cached.code, criterion: c, workbook: theirs, ours }) }
    })
  })

  it('reproduces 919 of the 969 lines EXACTLY, points and total', () => {
    const exact = model.lines.filter((line, i) =>
      CRITERIA.every(c => line.scores[c].points === WORKBOOK[i][POINTS_COLUMN[c]]) &&
      line.total === WORKBOOK[i].total
    )
    expect(exact).toHaveLength(919)
  })

  it('moves exactly 50 scores, and every one of them is a workbook zero becoming a real score', () => {
    expect(moved).toHaveLength(50)
    moved.forEach((m) => {
      expect(m.workbook).toBe(0)
      expect(m.ours).toBeGreaterThan(0)
    })
  })

  it('moves them on unit cost risk (37) and share of stock (13) and nowhere else', () => {
    const byCriterion = {}
    moved.forEach((m) => { byCriterion[m.criterion] = (byCriterion[m.criterion] || 0) + 1 })
    expect(byCriterion).toEqual({ unitCostRisk: 37, shareOfStock: 13 })
  })

  it('pins Widget 3 — the case named in the ruling', () => {
    // `Sales Report` row 9. Average unit cost $25.2184 falls in the $25–26 gap, so T9 caches 0 and
    // W9 caches 6. Ours scores the rung below, Minor.
    const line = byCode['Widget 3']
    expect(line.avgUnitCost).toBeCloseTo(25.2184, P)
    expect(WORKBOOK[2].pCost).toBe(0) // the workbook
    expect(WORKBOOK[2].total).toBe(6) // the workbook
    expect(line.scores.unitCostRisk.points).toBe(5)
    expect(line.scores.unitCostRisk.rating).toBe('Minor')
    expect(line.total).toBe(11)
  })

  it('pins Widget 9 — the other case named in the ruling', () => {
    // `Sales Report` row 15 caches V15 = 0 and W15 = 6: its 0.13 share falls in the 0.125–0.135
    // gap. 🔴 The 9.13 quoted in the ruling is the SAME PRODUCT ON `Product Ratings` row 23, the
    // sheet this model does not port — that sheet returns the raw 0.13 where this one returns 0.
    // Both are the same fault; only this one is in the port, and here the line moves 6 → 8.
    const line = byCode['Widget 9']
    expect(line.shareOfStock).toBeCloseTo(0.13, P)
    expect(WORKBOOK[8].pShare).toBe(0) // the workbook
    expect(WORKBOOK[8].total).toBe(6) // the workbook
    expect(line.scores.shareOfStock.points).toBe(2)
    expect(line.scores.shareOfStock.rating).toBe('Trickle')
    expect(line.total).toBe(8)
  })
})

describe('Stock Purchasing — days on hand', () => {
  it('is the sale date less the entry date, in whole days', () => {
    expect(daysOnHandOf('2021-06-08', '2021-07-14')).toBe(36)
    expect(daysOnHandOf('2021-06-08', '2021-06-08')).toBe(0)
  })

  it('is null when either date is missing or unreadable', () => {
    expect(daysOnHandOf(null, '2021-07-14')).toBeNull()
    expect(daysOnHandOf('2021-06-08', null)).toBeNull()
    expect(daysOnHandOf('the eighth of June', '2021-07-14')).toBeNull()
  })

  it('is null when the sale precedes the entry, rather than a negative that scores 5', () => {
    // A negative is a data fault, not a faster sale, and the ladder's fastest rung is the one it
    // would otherwise land in.
    expect(daysOnHandOf('2021-07-14', '2021-06-08')).toBeNull()
    const line = scoreLine({
      code: 'sold before it arrived',
quantity: 5,
sales: 100,
cost: 50,
      entryDate: '2021-07-14',
saleDate: '2021-06-08',
shareOfStock: 0.2
    })
    expect(line.scores.daysOnHand.points).toBe(0)
    expect(line.scores.daysOnHand.scored).toBe(false)
  })

  it('counts across a month and a leap day without drifting', () => {
    expect(daysOnHandOf('2024-02-27', '2024-03-01')).toBe(3)
    expect(daysOnHandOf('2023-02-27', '2023-03-01')).toBe(2)
  })
})

describe('Stock Purchasing — the ranking', () => {
  it('puts the best line first and the worst last', () => {
    const totals = model.ranked.map(l => l.total)
    // The workbook's own range on these lines is 6–17; ours is 7–17, and the reason is exact.
    // Only TWO lines were at 6 — Widget 3 and Widget 9 — and both are gap victims, moving to 11
    // and 8. Widget 2, which the workbook also scores 7, becomes the floor. The ceiling does not
    // move at all: closing a gap lifts a line off zero, it never adds a rung to one already
    // scored.
    expect(totals[0]).toBe(17)
    expect(totals[totals.length - 1]).toBe(7)
    for (let i = 1; i < totals.length; i++) { expect(totals[i]).toBeLessThanOrEqual(totals[i - 1]) }
  })

  it('breaks ties on gross profit, then on code, so the same input always gives the same screen', () => {
    // The workbook leaves ties in sheet order, which makes its ranking depend on where a row sits.
    const lines = [
      { code: 'B', quantity: 5, sales: 100, cost: 50, shareOfStock: 0.2 },
      { code: 'A', quantity: 5, sales: 100, cost: 50, shareOfStock: 0.2 },
      { code: 'C', quantity: 5, sales: 200, cost: 50, shareOfStock: 0.2 }
    ].map(scoreLine)
    expect(rank(lines).map(l => l.code)).toEqual(['C', 'A', 'B'])
    expect(rank(lines.slice().reverse()).map(l => l.code)).toEqual(['C', 'A', 'B'])
  })

  it('does not mutate what it is given', () => {
    const lines = [{ code: 'A', quantity: 1 }, { code: 'Z', quantity: 40 }].map(scoreLine)
    const before = lines.map(l => l.code)
    rank(lines)
    expect(lines.map(l => l.code)).toEqual(before)
  })
})

describe('Stock Purchasing — step 3, whether the business can carry the order', () => {
  it('is current assets excluding stock, over current liabilities', () => {
    const a = affordability({ currentAssetsExStock: 184000, currentLiabilities: 152000, cashCommitted: 60000 })
    expect(a.quickRatio).toBeCloseTo(1.210526, P)
    expect(a.quickRatioAfter).toBeCloseTo(0.815789, P)
    expect(a.cashCommitted).toBe(60000)
  })

  it('refuses an order that would take the ratio under 1 — the workbook\'s own instruction', () => {
    // "Do not approve purchases that compromise short-term liquidity." (`Process` C14.)
    expect(affordability({ currentAssetsExStock: 184000, currentLiabilities: 152000, cashCommitted: 60000 }).carries).toBe(false)
    expect(affordability({ currentAssetsExStock: 184000, currentLiabilities: 152000, cashCommitted: 30000 }).carries).toBe(true)
  })

  it('is exactly 1 at the point the liabilities are just covered', () => {
    const a = affordability({ currentAssetsExStock: 200000, currentLiabilities: 100000, cashCommitted: 100000 })
    expect(a.quickRatioAfter).toBe(1)
    expect(a.carries).toBe(true)
  })

  it('has no ratio rather than an infinite one when there are no current liabilities', () => {
    // Infinity on a screen in front of a client is worse than a blank.
    const a = affordability({ currentAssetsExStock: 50000, currentLiabilities: 0, cashCommitted: 1000 })
    expect(a.quickRatio).toBeNull()
    expect(a.quickRatioAfter).toBeNull()
    expect(a.carries).toBeNull()
  })

  it('treats nothing entered as nothing committed, not as a failure', () => {
    expect(affordability({}).cashCommitted).toBe(0)
    expect(affordability(undefined).quickRatio).toBeNull()
  })
})

describe('Stock Purchasing — step 2, what is already on the shelf', () => {
  it('counts units in transit as already committed', () => {
    // The half everyone forgets, and the half that causes the double-order. The workbook names it.
    expect(shelfOf({ onHand: 410, inTransit: 120 })).toEqual({
      onHand: 410, inTransit: 120, alreadyCommitted: 530
    })
  })

  it('treats a missing figure as zero rather than poisoning the sum', () => {
    expect(shelfOf({ onHand: 410 }).alreadyCommitted).toBe(410)
    expect(shelfOf(undefined).alreadyCommitted).toBe(0)
  })
})

describe('Stock Purchasing — asked for nothing', () => {
  it('computes nothing rather than throwing', () => {
    const empty = computeStockPurchasing({ lines: [] })
    expect(empty.lines).toEqual([])
    expect(empty.ranked).toEqual([])
    expect(empty.totals.linesReviewed).toBe(0)
    expect(empty.totals.averageMargin).toBeNull()
  })

  it('survives being called with no argument at all', () => {
    expect(computeStockPurchasing().totals.linesReviewed).toBe(0)
    expect(computeStockPurchasing(undefined).maxScore).toBe(25)
  })

  it('survives a line that is empty, and scores it 0', () => {
    const line = scoreLine({})
    expect(line.total).toBe(0)
    expect(line.code).toBeNull()
    expect(CRITERIA.every(c => line.scores[c].scored === false)).toBe(true)
  })

  it('does not coerce strings, which would hide a broken intake', () => {
    const line = scoreLine({ code: 'X', quantity: '12', sales: '100', cost: '50' })
    expect(line.quantity).toBeNull()
    expect(line.scores.sold.points).toBe(0)
  })

  it('carries the ladders out with the answer, so no component keeps a second copy', () => {
    expect(model.bands).toBe(BANDS)
    expect(model.criteria).toEqual(CRITERIA)
    expect(model.maxScore).toBe(25)
  })
})
