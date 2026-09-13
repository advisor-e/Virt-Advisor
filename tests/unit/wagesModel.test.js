'use strict'

const {
  DEFAULT_INPUTS,
  seasonKeyOf,
  daysWorked,
  hoursWorked,
  paidHours,
  monthlyRevenueBySeason,
  baseWageBySeason,
  overtimeBySeason,
  toolsAllowance,
  retirementBySeason,
  monthlyWageBySeason,
  seasonComparison,
  computeWages
} = require('../../server/report/wagesModel')

/**
 * GOLDEN TEST — Wages/Salary Review.
 *
 * Every expected number below is the source workbook's OWN cached value, read out of
 * `design/report-source-models/Wages Model.xlsx`, with the cell reference beside it so any
 * figure can be re-checked by hand — EXCEPT the one ruled deviation, which carries the
 * workbook's figure AND ours side by side.
 *
 * 🔴 THE TWO RULED DEVIATIONS — Mike, 2026-09-14: "fix it - always. we want it right in the
 * end", and "if it needs to be fixed - fix it - NEVER allow a mistake to remain."
 *
 * DEVIATION 2 is in the per-season comparison block above: the workbook's cost line there
 * drops the employer retirement contribution that its own monthly cost includes, so the same
 * model costed the same team two ways. Ours uses the monthly measure everywhere.
 *
 * DEVIATION 1 — THE ROW-OFFSET DEFECT. The workbook decides whether a salaried person is
 * costed at full-time or part-time hours by reading a row TEN BELOW the person being costed:
 *
 *     Seasonal Inputs BN7  =if(E17="Full Time",…)   Mary G is row 7,  tested against row 17
 *     Seasonal Inputs BN12 =if(E22="Full Time",…)   Max is row 12,    tested against row 22
 *     Seasonal Inputs BN35 =if(E45="Full Time",…)   Stevie is row 35; E45 is blank entirely
 *
 * It is a SHARED formula (ref BN7:BN10, BN12:BN15, BN35:BN38), so whole blocks inherit it.
 * Four people are affected and it runs in both directions. The block "The ruled deviation"
 * at the foot of this file proves each one against the workbook's own arithmetic.
 *
 * WHAT IS **NOT** DEVIATED FROM, and both are load-bearing:
 *  - The PRODUCTION block reads `$E17` — its own row — so it is untouched.
 *  - The MANAGEMENT block's wet and dry figures also read their own row and are reproduced
 *    exactly. Only its standard-season figure carries the defect. An earlier cut of this
 *    port reclassified the whole block and silently moved four more figures; the test
 *    `reproduces the management block's wet and dry wages exactly` is what pins that shut.
 *
 * The revenue chain is NOT affected by any of this and matches the workbook on all 87
 * person-seasons, which is what makes the wage difference attributable.
 */

// The workbook's money is cached to 10 significant figures. Two decimal places is a cent —
// comfortably tighter than anything a screen shows, and far looser than the ~3e-5 drift that
// reading those cached figures back actually produces.
const P = 2

const S = DEFAULT_INPUTS.settings
const model = computeWages(DEFAULT_INPUTS)
const person = name => DEFAULT_INPUTS.people.find(p => p.name === name)

describe('Wages/Salary Review — the sample, against the workbook', () => {
  it('reads the workbook\'s own team: 29 rows across four divisions, 26 of them filled', () => {
    expect(DEFAULT_INPUTS.people).toHaveLength(29)
    expect(model.headcount).toBe(26)
    const divisions = DEFAULT_INPUTS.people.map(p => p.division)
    expect(divisions.filter(d => d === 'Admin')).toHaveLength(4)
    expect(divisions.filter(d => d === 'Sales')).toHaveLength(4)
    expect(divisions.filter(d => d === 'Production')).toHaveLength(17)
    expect(divisions.filter(d => d === 'Management')).toHaveLength(4)
  })

  it('carries the workbook\'s twelve months and its season settings', () => {
    expect(DEFAULT_INPUTS.months).toHaveLength(12)
    expect(DEFAULT_INPUTS.months[0].name).toBe('Apr') // Cash Report E9 — the year starts in April
    expect(DEFAULT_INPUTS.months[3].season).toBe('Wet n Dark') // Cash Report H7
    // Seasonal Inputs row 41/43/45. The settings columns are NOT in season order: H is
    // "Dry n Light", J "Std Season", L "Wet n Dark". Wet is the SHORT season.
    expect(S.production.wet).toEqual({ hoursPerDay: 7, daysPerWeek: 5, daysLost: 4 })
    expect(S.production.std).toEqual({ hoursPerDay: 7.5, daysPerWeek: 5, daysLost: 0 })
    expect(S.production.dry).toEqual({ hoursPerDay: 10, daysPerWeek: 6, daysLost: 1 })
    expect(S.hoursPerDayFullTime).toBe(8) // T45
    expect(S.hoursPerDayPartTime).toBe(4.5) // T41
    expect(S.statDays).toBe(12) // T43
  })
})

describe('what one person works and bills — the revenue chain', () => {
  const billy = () => person('Billy Ray')

  it('works the days each season leaves, after leave and stat days', () => {
    // Seasonal Inputs AY17 / BC17 / BA17 — days per week × 4.33 − (30 + 12)/12 − days lost
    expect(daysWorked(billy(), S, 'wet')).toBeCloseTo(14.15, 4)
    expect(daysWorked(billy(), S, 'std')).toBeCloseTo(18.15, 4)
    expect(daysWorked(billy(), S, 'dry')).toBeCloseTo(21.48, 4)
  })

  it('turns those days into productive hours at his own efficiency', () => {
    // Seasonal Inputs AZ17 / BD17 / BB17 — days × the season's hours per day × 92%
    expect(hoursWorked(billy(), S, 'wet')).toBeCloseTo(91.126, 4)
    expect(hoursWorked(billy(), S, 'std')).toBeCloseTo(125.235, 4)
    expect(hoursWorked(billy(), S, 'dry')).toBeCloseTo(197.616, 4)
  })

  it('bills those hours at his charge-out rate', () => {
    const rev = monthlyRevenueBySeason(billy(), S)
    expect(rev.wet).toBeCloseTo(5011.93, P) // Seasonal Inputs AB17
    expect(rev.std).toBeCloseTo(6887.925, P) // Seasonal Inputs AC17
    expect(rev.dry).toBeCloseTo(10868.88, P) // Seasonal Inputs AD17
  })

  it('pays him the contracted month whatever the weather does', () => {
    // Seasonal Inputs BJ17 = BM17 = BP17 — 7.5 × 5 × 4.33, the standard season's week.
    // A firm does not cut someone's pay because it rained; that is the whole point of the
    // model, and it is why a Wet n Dark month loses money.
    expect(paidHours(billy(), S, 'wet')).toBeCloseTo(162.375, 4)
    expect(paidHours(billy(), S, 'std')).toBeCloseTo(162.375, 4)
    expect(paidHours(billy(), S, 'dry')).toBeCloseTo(162.375, 4)
    const base = baseWageBySeason(billy(), S)
    expect(base.wet).toBeCloseTo(5683.125, P) // Seasonal Inputs BH17
    expect(base.std).toBeCloseTo(5683.125, P) // Seasonal Inputs BN17
    expect(base.dry).toBeCloseTo(5683.125, P) // Seasonal Inputs BK17
  })

  it('adds tools, retirement and overtime to reach what he costs', () => {
    expect(toolsAllowance(billy())).toBeCloseTo(65, P) // Seasonal Inputs CH17 — $15/wk
    expect(retirementBySeason(billy(), S).dry).toBeCloseTo(170.49375, 4) // CC17 — 3%
    expect(monthlyWageBySeason(billy(), S).std).toBeCloseTo(5918.61875, P) // CM17 for a Std month
  })

  it('pays no overtime anywhere in this sample, because the workbook\'s flag is blank', () => {
    // Seasonal Inputs J4 is empty, so BW is forced to 0 and BU/BY find no excess hours.
    // Reproduced rather than tidied — see overtimeBySeason.
    DEFAULT_INPUTS.people.forEach((p) => {
      const ot = overtimeBySeason(p, S)
      expect(ot.wet + ot.std + ot.dry).toBe(0)
    })
  })

  it('gives an overhead role no billable days at all', () => {
    // Seasonal Inputs BC7 — zero where there is no charge-out rate. Admin and Sales bill
    // nothing in this workbook; they are cost, and the margin is what is left after them.
    const mary = person('Mary G')
    expect(mary.chargeRate).toBe(0)
    expect(daysWorked(mary, S, 'std')).toBe(0)
    expect(monthlyRevenueBySeason(mary, S).std).toBe(0)
  })
})

describe('the per-season comparison — the model\'s real headline', () => {
  const seasons = seasonComparison(DEFAULT_INPUTS)

  it('bills what the workbook bills in each kind of month', () => {
    expect(seasons[0].revenue).toBeCloseTo(100795.035, P) // Seasonal Inputs AB40
    expect(seasons[1].revenue).toBeCloseTo(123349.6688, P) // Seasonal Inputs AC40
    expect(seasons[2].revenue).toBeCloseTo(168252.21, P) // Seasonal Inputs AD40
  })

  it('works the hours the workbook works in each kind of month', () => {
    expect(seasons[0].hours).toBeCloseTo(1401.42075, 4) // Seasonal Inputs AB45
    expect(seasons[1].hours).toBeCloseTo(1862.19, 4) // Seasonal Inputs AC45
    expect(seasons[2].hours).toBeCloseTo(2780.775, 4) // Seasonal Inputs AD45
  })

  it('shows the same team losing money in the wet and making it in the dry', () => {
    // The finding an advisor opens the conversation with: one team, one pay run, and a
    // swing of more than $66,000 a month on the weather alone.
    expect(seasons[0].margin).toBeLessThan(0)
    expect(seasons[2].margin).toBeGreaterThan(0)
    expect(seasons[2].margin - seasons[0].margin).toBeGreaterThan(66000)
  })

  it('🔴 counts the WHOLE cost of employing the team, where the workbook left part of it out', () => {
    // CORRECTION 2 — Mike, 2026-09-14: "if it needs to be fixed - fix it - NEVER allow a
    // mistake to remain." The workbook's row 41 ("Wages", against row 42's "Gross Profit")
    // counts base + overtime + tools and drops the employer retirement contribution, while
    // the monthly cost in the very same model includes it. One model, two answers to "what
    // does this team cost" — and the narrower one flatters every season.
    //
    // Ours is the monthly measure, so the card and the months now agree.
    const totalRetirement = DEFAULT_INPUTS.people
      .reduce((sum, p) => sum + retirementBySeason(p, S).std, 0)
    expect(totalRetirement).toBeGreaterThan(3000) // it is not a rounding-sized omission
    expect(seasons[1].cost).toBeCloseTo(
      DEFAULT_INPUTS.people.reduce((sum, p) => sum + monthlyWageBySeason(p, S).std, 0), P)

    // The workbook's own narrow figures, kept so the difference can be seen rather than
    // taken on trust. Ours are higher in every season by exactly the retirement it dropped.
    const narrow = k => DEFAULT_INPUTS.people.reduce((sum, p) =>
      sum + baseWageBySeason(p, S)[k] + overtimeBySeason(p, S)[k] + toolsAllowance(p), 0)
    expect(seasons[0].cost - narrow('wet')).toBeCloseTo(
      DEFAULT_INPUTS.people.reduce((sum, p) => sum + retirementBySeason(p, S).wet, 0), P)
  })

  it('🔴 leaves every season worse than the workbook drew it, and says by how much', () => {
    // Seasonal Inputs AB42 / AC42 / AD42 cache −10,356.27 / +18,089.81 / +55,920.98. Those
    // are built on BOTH defects — the row-offset wages AND the missing retirement — so the
    // whole difference is the two corrections together. Pinned because these three figures
    // are the model's headline and they moved.
    expect(seasons[0].margin).toBeCloseTo(-13972.05, P) // workbook AB42  −10,356.27
    expect(seasons[1].margin).toBeCloseTo(6136.97, P) //   workbook AC42  +18,089.81
    expect(seasons[2].margin).toBeCloseTo(52269.81, P) //  workbook AD42  +55,920.98
    // A Wet n Dark month loses half as much again as the workbook showed.
    expect(seasons[0].margin).toBeLessThan(-10356.27333)
  })
})

describe('the twelve months, and the switch between the two bases', () => {
  it('bills exactly what the Cash Report bills, month by month', () => {
    // Cash Report row 15. The revenue chain carries no deviation, so these are exact.
    const wb = [80422.65, 111013.38, 82736.775, 81166.155, 105068.0813, 154010.97,
      107436.6563, 143142.09, 107436.6563, 157383.33, 116461.7438, 116461.7438]
    model.months.forEach((m, i) => expect(m.seasonalRevenue).toBeCloseTo(wb[i], P))
    expect(model.totals.seasonalRevenue).toBeCloseTo(1362740.231, P) // Cash Report R15
  })

  it('carries the shutdown basis\'s own billings alongside', () => {
    expect(model.totals.shutdownRevenue).toBeCloseTo(973328.4208, P) // Cash Report R17
  })

  it('adds the overnight allowance only in the months that claim it', () => {
    // Cash Report E13 — $1,400 on the seasonal basis, and only where row 11 reads "Yes".
    expect(model.months[0].allowance).toBe(1400) // Apr, "Yes"
    expect(model.months[2].allowance).toBe(0) // Jun, "No"
    expect(model.totals.allowance).toBe(8400) // Cash Report R13 — six months at 1,400
  })

  it('switches both revenue AND cost sides together when the basis changes', () => {
    // Decision 3: a complete either/or, never a blend. The shutdown basis also swaps the
    // allowance to $2,600 (Cash Report AH7).
    const shutdown = computeWages(Object.assign({}, DEFAULT_INPUTS, { basis: 'shutdown' }))
    expect(shutdown.totals.revenue).toBeCloseTo(973328.4208, P)
    expect(shutdown.totals.allowance).toBe(15600) // six months at 2,600
    expect(shutdown.totals.revenue).not.toBeCloseTo(model.totals.revenue, P)
    expect(shutdown.totals.wageCost).not.toBeCloseTo(model.totals.wageCost, P)
  })

  it('judges the plan against the twelve typed actuals', () => {
    // Cash Report row 24 — hand-entered, month by month. Nothing imports them.
    expect(model.totals.actual).toBe(97946) // Cash Report R24
    expect(model.months[3].actual).toBe(-5000) // July actually lost money
    expect(model.totals.variance).toBeCloseTo(model.totals.actual - model.totals.margin, 6)
  })

  it('lifts wages with a pay rise but never billings', () => {
    // Annual Hiring Plan Y49 applies the rise; BE49 does not. A rise costs money; it does
    // not make the client pay more.
    const raised = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    raised.people.forEach((p) => { p.payRise = p.payRise.map(() => 0.10) })
    const after = computeWages(raised)
    expect(after.totals.seasonalRevenue).toBeCloseTo(model.totals.seasonalRevenue, P)
    expect(after.totals.wageCost).toBeGreaterThan(model.totals.wageCost)
  })

  it('counts nobody who is off the payroll that month', () => {
    const none = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    none.people.forEach((p) => { p.onPayroll = p.onPayroll.map(() => false) })
    const after = computeWages(none)
    expect(after.totals.seasonalRevenue).toBe(0)
    // The allowance is a property of the MONTH, not of the team, so it survives an empty
    // payroll — exactly as Cash Report E13 does.
    expect(after.totals.wageCost).toBe(8400)
  })
})

describe('🔴 the ruled deviation — the row-offset defect, corrected', () => {
  /**
   * Each case carries THE WORKBOOK'S OWN FIGURE and ours, with the arithmetic that produces
   * both, so the difference can be checked by hand rather than taken on trust.
   *
   * Full time  = payRate × 8   × 5 × 52/12 = payRate × 173.333…
   * Part time  = payRate × 4.5 × 5 × 52/12 = payRate × 97.5
   */
  const FULL = (8 * 5 * 52) / 12
  const PART = (4.5 * 5 * 52) / 12

  it('costs Mary G as the part-timer she is, not as the full-timer ten rows below her', () => {
    const mary = person('Mary G')
    expect(mary.employment).toBe('Part Time')
    expect(baseWageBySeason(mary, S).std).toBeCloseTo(19 * PART, P) // ours   1,852.50
    expect(19 * FULL).toBeCloseTo(3293.333333, 4) //           Seasonal Inputs BN7  3,293.33
    // The workbook charges her 1,440.83 a month too much, because E17 is "Full Time".
    expect(19 * FULL - 19 * PART).toBeCloseTo(1440.8333, 3)
  })

  it('costs Max as the full-timer he is, not as the part-timer ten rows below him', () => {
    const max = person('Max')
    expect(max.employment).toBe('Full Time')
    expect(baseWageBySeason(max, S).std).toBeCloseTo(23 * FULL, P) // ours   3,986.67
    expect(23 * PART).toBeCloseTo(2242.5, 4) //                Seasonal Inputs BN12  2,242.50
    // And 1,744.17 a month too little, because E22 is "Part Time". The defect runs BOTH
    // ways, which is why it cannot be characterised as simple under- or over-statement.
    expect(23 * FULL - 23 * PART).toBeCloseTo(1744.1667, 3)
  })

  it('costs Stevie and Natalie against their own rows, where the workbook reads a blank one', () => {
    // BN35 tests E45, which is past the end of the block and holds nothing at all, so the
    // workbook silently takes the part-time branch for every manager.
    expect(baseWageBySeason(person('Stevie'), S).std).toBeCloseTo(74 * FULL, P) // ours 12,826.67
    expect(74 * PART).toBeCloseTo(7215, 4) //                    Seasonal Inputs BN35  7,215.00
    expect(baseWageBySeason(person('Natalie'), S).std).toBeCloseTo(35 * FULL, P) // ours 6,066.67
    expect(35 * PART).toBeCloseTo(3412.5, 4) //                  Seasonal Inputs BN36  3,412.50
  })

  it('reproduces the management block\'s wet and dry wages exactly — they are NOT defective', () => {
    // BH35 and BK35 read $E35, their own row. Only the standard-season column is wrong.
    // This guards against the correction being widened into a reclassification of the whole
    // block, which would move four more figures nobody has ruled on.
    const stevie = baseWageBySeason(person('Stevie'), S)
    expect(stevie.wet).toBeCloseTo(11214.7, P) // Seasonal Inputs BH35 — unchanged
    expect(stevie.dry).toBeCloseTo(12015.75, P) // Seasonal Inputs BK35 — unchanged
    const natalie = baseWageBySeason(person('Natalie'), S)
    expect(natalie.wet).toBeCloseTo(5304.25, P) // Seasonal Inputs BH36 — unchanged
    expect(natalie.dry).toBeCloseTo(5683.125, P) // Seasonal Inputs BK36 — unchanged
  })

  it('leaves the production block completely alone — it reads its own row already', () => {
    expect(baseWageBySeason(person('Butch'), S).std).toBeCloseTo(97.425 * 26, P) // part time
    expect(baseWageBySeason(person('Barry'), S).std).toBeCloseTo(162.375 * 35, P) // full time
  })

  it('costs the year $61,185 more than the workbook, and the margin falls by the same', () => {
    // Cash Report R20 says 1,012,619.59 and R22 says 350,120.64. Both are built on the
    // defective base wages. Revenue is untouched, so the whole difference is wage cost —
    // which is what makes the correction attributable to this defect and nothing else.
    expect(model.totals.wageCost).toBeCloseTo(1073804.97, P)
    expect(model.totals.margin).toBeCloseTo(288935.26, P)
    expect(model.totals.wageCost - 1012619.591).toBeCloseTo(61185.38, 1)
    expect(350120.6402 - model.totals.margin).toBeCloseTo(61185.38, 1)
    expect(model.totals.seasonalRevenue).toBeCloseTo(1362740.231, P) // unchanged
  })

  it('turns the tightest month of the plan from a small profit into a loss', () => {
    // Cash Report H22 caches July's planned margin at 180.61 — a field team paid through
    // the Wet n Dark season, a hair above break-even. Corrected, the plan does not in fact
    // break even that month, which is the single most consequential figure on the screen.
    const july = model.months[3]
    expect(july.name).toBe('Jul')
    expect(july.season).toBe('Wet n Dark')
    expect(july.margin).toBeCloseTo(-131.83, P)
    expect(july.margin).toBeLessThan(0)
    expect(model.headline.tightestMonth.name).toBe('Jul')
  })
})

describe('holding up when the inputs are not the sample', () => {
  it('returns a whole empty model rather than throwing on nothing at all', () => {
    const empty = computeWages({})
    expect(empty.months).toEqual([])
    expect(empty.totals.margin).toBe(0)
    expect(empty.headline.tightestMonth).toBeNull()
    expect(empty.headline.marginPctOfRevenue).toBe(0)
  })

  it('survives junk where a model would otherwise divide or read through nothing', () => {
    expect(() => computeWages(null)).not.toThrow()
    expect(() => computeWages({ people: null, months: null })).not.toThrow()
    const odd = computeWages({
      basis: 'seasonal',
      seasonNames: DEFAULT_INPUTS.seasonNames,
      settings: S,
      allowances: { seasonal: 0, shutdown: 0 },
      months: [{ name: 'Apr', season: 'Std Season', allowanceApplies: false, actualMargin: null }],
      people: [{ name: 'X', division: 'Admin', wageBasis: 'salary', employment: 'Full Time' }]
    })
    expect(odd.months[0].margin).toBe(0)
    expect(odd.totals.actual).toBe(0)
  })

  it('falls back to the standard season when a firm has renamed one', () => {
    // A firm renames "Wet n Dark" to its own words (Mike, 2026-09-14). A month naming a
    // season we cannot match must never blank that month's figures.
    expect(seasonKeyOf(DEFAULT_INPUTS.seasonNames, 'Wet n Dark')).toBe('wet')
    expect(seasonKeyOf(DEFAULT_INPUTS.seasonNames, 'Monsoon')).toBe('std')
    expect(seasonKeyOf(null, 'anything')).toBe('std')
  })

  it('costs a renamed season correctly rather than by its position', () => {
    const renamed = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    renamed.seasonNames = { wet: 'Monsoon', std: 'Normal', dry: 'Peak' }
    renamed.months = renamed.months.map(m => Object.assign({}, m, {
      season: m.season === 'Wet n Dark' ? 'Monsoon' : m.season === 'Dry n Light' ? 'Peak' : 'Normal'
    }))
    const after = computeWages(renamed)
    expect(after.totals.margin).toBeCloseTo(model.totals.margin, P)
  })

  it('adds a new person to a role with no ceiling on how many there may be', () => {
    // Mike's standing requirement, 2026-09-14: people can be added per role with no fixed
    // ceiling. The workbook has fixed blocks with a few spare rows; this must not.
    const bigger = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    const barry = bigger.people.find(p => p.name === 'Barry')
    const oneMore = monthlyWageBySeason(barry, S)
    for (let i = 0; i < 40; i++) {
      bigger.people.push(Object.assign({}, barry, { name: 'Extra ' + i }))
    }
    const after = computeWages(bigger)
    expect(after.headcount).toBe(model.headcount + 40)
    // Forty more of the same person cost forty times one of him — no block, no ceiling, and
    // nothing silently dropped once the workbook's spare rows would have run out.
    const aprilRise = 1 + barry.payRise[0]
    expect(after.months[0].wageCost - model.months[0].wageCost)
      .toBeCloseTo(40 * oneMore[after.months[0].seasonKey] * aprilRise, P)
  })
})
