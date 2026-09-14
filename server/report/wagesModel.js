'use strict'

/**
 * Wages/Salary Review — the labour-margin engine.
 *
 * Ported from `design/report-source-models/Wages Model.xlsx` (six sheets, 10,456 filled
 * cells — the largest source model in the library). Drawn and ruled by Mike on 2026-09-14:
 * `design/mockups/wages-model.html` carries all nine decisions with his rulings on them.
 *
 * WHAT THIS ANSWERS. Not "what is the payroll?" but "does the team bill more than it
 * costs?" — month by month, against what actually happened. The workbook's own sample
 * produces a planned labour margin for the year and twelve typed actuals to judge it by.
 *
 * THE TWO OPERATING BASES (decision 3, ruled as recommended: one model, a two-button
 * switch — never two models). A firm runs EITHER a seasonal basis, where weather decides
 * how many productive days a month holds, OR a shutdown basis, where the year is planned
 * around production days and overtime. Both revenue and cost swap sides together, which is
 * why this is an either/or rather than a blend.
 *
 * 🔴 THREE CORRECTIONS TO THE WORKBOOK, ON MIKE'S RULINGS OF 2026-09-14 — "fix it - always. we
 * want it right in the end", and "if it needs to be fixed - fix it - NEVER allow a mistake to
 * remain". All three are pinned in `tests/unit/wagesModel.test.js` with the workbook's own
 * cached figure beside ours, so none is a silent departure.
 *
 * CORRECTION 1 — THE ROW-OFFSET DEFECT. The workbook decides whether a salaried person is
 * costed at full-time or part-time hours by reading a row TEN BELOW the person being costed:
 *
 *     Seasonal Inputs BN7  =if(E17="Full Time",…)   ← Mary G, row 7, tested against row 17
 *     Seasonal Inputs BN12 =if(E22="Full Time",…)   ← Max, row 12, tested against row 22
 *     Seasonal Inputs BN35 =if(E45="Full Time",…)   ← Stevie, row 35; E45 is blank
 *
 * It is a shared formula (ref BN7:BN10, BN12:BN15, BN35:BN38), so whole blocks inherit it,
 * and it runs in BOTH directions — one person costed too dear, three too cheap. Net, the
 * sample team is costed about $8,570/month too cheap. `baseWageBySeason` below tests each
 * person against THEIR OWN employment type. `tests/unit/wagesModel.test.js` pins the
 * workbook's cached figure beside ours for each affected person.
 *
 * The Production block is NOT affected: its formulas read `$E17` — their own row.
 *
 * CORRECTION 2 — TWO ANSWERS TO ONE QUESTION. The per-season comparison card left the
 * employer retirement contribution out of its cost line where the monthly figure put it in,
 * so the same model costed the same team two different ways and the card flattered every
 * season. `seasonComparison` now uses the monthly cost. See that function for the detail.
 *
 * CORRECTION 3 — THE OVERNIGHT ALLOWANCE, COUNTED TWICE ON THE SHUTDOWN BASIS. The two
 * sheets build a person's monthly wage differently, and only one of them leaves the
 * allowance out:
 *
 *     Seasonal Inputs CM7 = BK7+BW7+CH7+CC7                    ← CF7 (the allowance) absent
 *     Shutdown Inputs CL7 = (CA7+CB7+CE7)*4.33+CG7+CI7/12      ← CE7 (the allowance) INSIDE
 *
 * `Cash Report` row 20 then adds an allowance to BOTH — 1,400 on the seasonal basis
 * (`AG7` = `Seasonal Inputs` CF40), which is the only place seasonal counts it, and 2,600 on
 * the shutdown basis (`AH7` = `Shutdown Inputs` CE40), which is the SECOND place shutdown
 * counts it. The two shutdown additions are not even the same quantity: inside the wage it
 * is each employed person's `Y*AA*4.33`; on the Cash Report it is the raw WEEKLY column
 * total across the whole 28-row roster, employed or not, added as though it were monthly.
 *
 * Over the sample year that charges 15,600 of allowance the team never received — six
 * ticked months at 2,600 — and drops the shutdown margin from −81,557 to the workbook's
 * −97,157. `computeWages` below therefore adds the allowance on the SEASONAL basis only.
 * The shutdown figure is not a smaller number; it is not a separate line at all, which is
 * why `allowances` now carries one key rather than two, and why step 1 emits only
 * `allowances.seasonal` (`components/WagesTeam.vue`).
 *
 * ⚠ A related claim in `design/WAGES-SHUTDOWN-PORT.md` §3.2 — that five of the `CE` cells
 * have their formula "overtyped with stray label text" — is FALSE, and nothing was corrected
 * for it. `CE` is a clean shared formula `Y*AA` on every row 7–38; rows 18–21 and 36 are
 * shared-formula FOLLOWERS (`<f t="shared" si="144"/>`), which carry no formula text of
 * their own and read as blank to anything that takes each cell's own `<f>`.
 *
 * Backend-only and pure — no I/O, no database, no model call anywhere in this file, so
 * "personal data never reaches the AI" holds by construction. CommonJS, Node 14.15.
 */

/** The three season keys. The workbook's own names for them are an input, not a constant —
 *  a firm renames "Wet n Dark" to whatever its own people call it (Mike, 2026-09-14). */
const SEASON_KEYS = ['wet', 'std', 'dry']

/** Weeks in an average month. The workbook's own constant, used throughout. */
const WEEKS_PER_MONTH = 4.33

/** Monthly hours beyond which the workbook treats time as overtime (40h × 4.33). */
const OVERTIME_THRESHOLD_HOURS = 173.2

/** @param {*} v @returns {number} v when it is a usable number, else 0. */
function num (v) {
  return (typeof v === 'number' && isFinite(v)) ? v : 0
}

/**
 * Map a month's season NAME onto its key, using the firm's own names.
 * An unrecognised name falls back to the standard season rather than throwing — a renamed
 * season must never blank a month's figures.
 * @param {Object} seasonNames { wet, std, dry }
 * @param {string} name
 * @returns {string} 'wet' | 'std' | 'dry'
 */
function seasonKeyOf (seasonNames, name) {
  const names = seasonNames || {}
  for (let i = 0; i < SEASON_KEYS.length; i++) {
    const k = SEASON_KEYS[i]
    if (names[k] && String(names[k]) === String(name)) { return k }
  }
  return 'std'
}

/** @param {Object} person @returns {boolean} true when the person is costed at full-time hours. */
function isFullTime (person) {
  return String(person && person.employment) === 'Full Time'
}

/**
 * Days a person works in a month, for one season.
 *
 * Salary block  — `Seasonal Inputs` BC7:  daysPerWeek × 4.33 − (leave + stat days)/12.
 *                 The same in every season: a salaried person's diary does not move with
 *                 the weather. Zero where there is no charge-out rate (an overhead role).
 * Production    — `Seasonal Inputs` AY17 / BA17 / BC17: the season's own days per week,
 *                 less that season's days lost to weather.
 *
 * @param {Object} person
 * @param {Object} settings
 * @param {string} seasonKey
 * @returns {number}
 */
function daysWorked (person, settings, seasonKey) {
  if (num(person.chargeRate) === 0) { return 0 }
  const leaveShare = (num(person.leaveDays) + num(settings.statDays)) / 12
  if (person.wageBasis === 'production') {
    const s = (settings.production && settings.production[seasonKey]) || {}
    return (num(s.daysPerWeek) * WEEKS_PER_MONTH) - leaveShare - num(s.daysLost)
  }
  return (num(settings.daysPerWeek) * WEEKS_PER_MONTH) - leaveShare
}

/**
 * Productive hours a person works in a month, for one season — days × hours per day ×
 * their daily production efficiency.
 *
 * `Seasonal Inputs` AZ17 / BB17 / BD17 (production) and BD7 (salary). A part-timer takes
 * the part-time hours in every season, which is why the season's own hours-per-day only
 * applies to a full-timer.
 *
 * @param {Object} person @param {Object} settings @param {string} seasonKey @returns {number}
 */
function hoursWorked (person, settings, seasonKey) {
  const days = daysWorked(person, settings, seasonKey)
  const efficiency = num(person.dailyEfficiency)
  if (person.wageBasis === 'production') {
    const s = (settings.production && settings.production[seasonKey]) || {}
    const hoursPerDay = isFullTime(person) ? num(s.hoursPerDay) : num(settings.hoursPerDayPartTime)
    return days * hoursPerDay * efficiency
  }
  const hoursPerDay = isFullTime(person) ? num(settings.hoursPerDayFullTime) : num(settings.hoursPerDayPartTime)
  return days * hoursPerDay * efficiency
}

/**
 * What a person BILLS in a month, per season — productive hours × charge-out rate.
 * `Seasonal Inputs` AB7 / AC7 / AD7.
 * @param {Object} person @param {Object} settings @returns {Object} { wet, std, dry }
 */
function monthlyRevenueBySeason (person, settings) {
  const out = {}
  for (let i = 0; i < SEASON_KEYS.length; i++) {
    const k = SEASON_KEYS[i]
    out[k] = hoursWorked(person, settings, k) * num(person.chargeRate)
  }
  return out
}

/**
 * Hours a person is PAID for in a month, per season — which is not the same as the hours
 * they work. `Seasonal Inputs` BI/BJ, BL/BM, BO/BP.
 *
 * The contracted week is the STANDARD season's in every season: a firm does not cut
 * someone's pay because it rained. Where `daysLostApply` is off, the season's lost days
 * come out of the paid hours instead.
 *
 * @param {Object} person @param {Object} settings @param {string} seasonKey @returns {number}
 */
function paidHours (person, settings, seasonKey) {
  const prodAll = settings.production || {}
  const stdSeason = prodAll.std || {}

  // The management block is costed per season on its own hours — the workbook's
  // `Seasonal Inputs` BH35 (the wet season's hours per day) and BK35 (the standard
  // season's), both over the standard season's working week. Its STANDARD-season figure
  // alone is salary-shaped, which is the one the row-offset defect landed in.
  if (person.wageBasis === 'management') {
    const partTime = num(settings.hoursPerDayPartTime)
    if (seasonKey === 'std') {
      const perDay = isFullTime(person) ? num(settings.hoursPerDayFullTime) : partTime
      return (perDay * num(settings.daysPerWeek) * 52) / 12
    }
    const source = seasonKey === 'wet' ? (prodAll.wet || {}) : stdSeason
    const perDay = isFullTime(person) ? num(source.hoursPerDay) : partTime
    return perDay * num(stdSeason.daysPerWeek) * WEEKS_PER_MONTH
  }

  if (person.wageBasis !== 'production') {
    const hoursPerDay = isFullTime(person) ? num(settings.hoursPerDayFullTime) : num(settings.hoursPerDayPartTime)
    return hoursPerDay * num(settings.daysPerWeek) * WEEKS_PER_MONTH
  }
  const prod = settings.production || {}
  const std = prod.std || {}
  const hoursPerDay = isFullTime(person) ? num(std.hoursPerDay) : num(settings.hoursPerDayPartTime)
  const contracted = hoursPerDay * num(std.daysPerWeek) * WEEKS_PER_MONTH
  if (prod.daysLostApply) { return contracted }
  const season = prod[seasonKey] || {}
  const lostHourRate = isFullTime(person) ? num(season.hoursPerDay) : num(settings.hoursPerDayPartTime)
  return contracted - (num(season.daysLost) * lostHourRate)
}

/**
 * A person's base monthly wage, per season — paid hours × pay rate.
 *
 * 🔴 THIS IS THE CORRECTED FORMULA. The workbook's `Seasonal Inputs` BN7/BN12/BN35 test a
 * row ten below the person they cost; `paidHours` above tests the person's own employment
 * type. See the header. For the salary block the figure is the same in all three seasons —
 * the workbook chains BH7 = BK7 = BN7 — while the production and management blocks each
 * carry their own per-season hours.
 *
 * @param {Object} person @param {Object} settings @returns {Object} { wet, std, dry }
 */
function baseWageBySeason (person, settings) {
  const out = {}
  if (person.wageBasis === 'production' || person.wageBasis === 'management') {
    for (let i = 0; i < SEASON_KEYS.length; i++) {
      const k = SEASON_KEYS[i]
      out[k] = paidHours(person, settings, k) * num(person.payRate)
    }
    return out
  }
  const hoursPerDay = isFullTime(person) ? num(settings.hoursPerDayFullTime) : num(settings.hoursPerDayPartTime)
  const monthly = (num(person.payRate) * hoursPerDay * num(settings.daysPerWeek) * 52) / 12
  for (let i = 0; i < SEASON_KEYS.length; i++) { out[SEASON_KEYS[i]] = monthly }
  return out
}

/**
 * Overtime pay per season — hours worked beyond the contracted month, at the overtime
 * uplift. `Seasonal Inputs` BU/BW/BY, gated on BV/BX/BZ.
 *
 * ⚠ THE WORKBOOK'S OWN GATE IS ASYMMETRIC and is reproduced exactly rather than tidied:
 * the wet and standard columns are suppressed when the global overtime flag reads "Yes",
 * while the dry column is only paid when it reads "No". With the flag blank — as it is in
 * the sample — every season returns nothing, which is why the sample carries no overtime
 * at all. Changing this alters a figure nobody has asked us to change.
 *
 * @param {Object} person @param {Object} settings @returns {Object} { wet, std, dry }
 */
function overtimeBySeason (person, settings) {
  const flag = settings.overtimeSuppressed
  const rate = num(person.payRate) * (1 + num(person.overtimePct))
  const contracted = paidHours(person, settings, 'std')
  const prod = settings.production || {}

  /** Hours beyond the contracted month, for one season. */
  const excessFor = function (k) {
    // ONLY THE PRODUCTION BLOCK CAN EVER EARN OVERTIME. The workbook measures the excess
    // against its paid-hours cells (`Seasonal Inputs` BJ / BM / BP), and on every salary and
    // management row those cells are EMPTY — so its own test, `if(BJ35 > 173.2, …)`, cannot
    // be true and a salaried person is never paid by the hour. Reproduced rather than
    // reasoned about: an earlier cut applied the salaried month of 173.33 hours against the
    // 173.2 threshold and quietly invented overtime for two managers.
    if (person.wageBasis !== 'production') { return 0 }
    if (k === 'std') {
      return contracted > OVERTIME_THRESHOLD_HOURS ? contracted - OVERTIME_THRESHOLD_HOURS : 0
    }
    if (!isFullTime(person)) { return 0 }
    const s = prod[k] || {}
    return (num(s.hoursPerDay) * num(s.daysPerWeek) * WEEKS_PER_MONTH) - contracted
  }

  const out = {}
  for (let i = 0; i < SEASON_KEYS.length; i++) {
    const k = SEASON_KEYS[i]
    const excess = excessFor(k)
    if (k === 'dry') {
      out[k] = (flag === 'No') ? excess * rate : 0
    } else {
      out[k] = (flag === 'Yes' || excess <= 0) ? 0 : excess * rate
    }
  }
  return out
}

/** A person's monthly tools allowance. `Seasonal Inputs` CH7 — a weekly figure annualised. */
function toolsAllowance (person) {
  return (num(person.toolsWeekly) * 52) / 12
}

/**
 * Employer retirement contribution per season — a percentage of base wage plus overtime.
 * `Seasonal Inputs` CB7 / CC7 / CD7.
 * @param {Object} person @param {Object} settings @returns {Object} { wet, std, dry }
 */
function retirementBySeason (person, settings) {
  const base = baseWageBySeason(person, settings)
  const ot = overtimeBySeason(person, settings)
  const out = {}
  for (let i = 0; i < SEASON_KEYS.length; i++) {
    const k = SEASON_KEYS[i]
    out[k] = (base[k] + ot[k]) * num(person.retirementPct)
  }
  return out
}

/**
 * What a person COSTS in a month, per season — base + overtime + tools + retirement.
 * `Seasonal Inputs` CM7, which picks its season per month.
 * @param {Object} person @param {Object} settings @returns {Object} { wet, std, dry }
 */
function monthlyWageBySeason (person, settings) {
  const base = baseWageBySeason(person, settings)
  const ot = overtimeBySeason(person, settings)
  const ret = retirementBySeason(person, settings)
  const tools = toolsAllowance(person)
  const out = {}
  for (let i = 0; i < SEASON_KEYS.length; i++) {
    const k = SEASON_KEYS[i]
    out[k] = base[k] + ot[k] + tools + ret[k]
  }
  return out
}

/**
 * The per-season comparison — `Seasonal Inputs` AB40:AD45, and the model's real headline.
 * The same team on the same pay, costed against what each kind of month bills.
 *
 * 🔴 THE SECOND CORRECTION TO THE WORKBOOK (Mike, 2026-09-14: "if it needs to be fixed - fix
 * it - NEVER allow a mistake to remain"). The workbook's own cost line here — row 41, headed
 * "Wages", against row 42's "Gross Profit" — counts base wage + overtime + tools and leaves
 * the EMPLOYER RETIREMENT CONTRIBUTION out, while the monthly cost this same model reports
 * puts it in. One model cannot hold two answers to "what does this team cost", and the
 * narrower one flatters every season by understating the cost of employing anybody.
 *
 * `cost` below is therefore the SAME measure as `monthlyWageBySeason` — retirement included —
 * so this card's margin and the monthly margin answer the same question. The workbook's own
 * figures are pinned beside ours in the golden test.
 *
 * @param {Object} inputs
 * @returns {Array<Object>} one row per season, in wet/std/dry order
 */
function seasonComparison (inputs) {
  const settings = inputs.settings || {}
  const people = inputs.people || []
  const names = inputs.seasonNames || {}
  return SEASON_KEYS.map(function (k) {
    let revenue = 0
    let cost = 0
    let hours = 0
    people.forEach(function (p) {
      revenue += monthlyRevenueBySeason(p, settings)[k]
      cost += monthlyWageBySeason(p, settings)[k]
      hours += hoursWorked(p, settings, k)
    })
    return { season: k, name: names[k] || k, revenue, cost, margin: revenue - cost, hours }
  })
}

/**
 * The whole model: twelve months of projected labour margin against the twelve typed
 * actuals, on whichever basis the firm runs.
 *
 * `Cash Report` rows 15, 17, 20, 22 and 24, and their totals in column R. The basis switch
 * is that sheet's own logic; the allowance is NOT — see CORRECTION 3 in the file header:
 *   E20 = if(seasonal and allowance, seasonalWages + 1400, … shutdownWages + 2600 …)
 *                                                           ↑ already inside shutdownWages
 *   E22 = if(seasonal, seasonalRevenue − wageCost, shutdownRevenue − wageCost)
 *
 * A pay rise lifts WAGES only, never billings — `Annual Hiring Plan` Y49 applies the rise,
 * BE49 does not. A person off the payroll that month contributes neither.
 *
 * @param {Object} inputs see DEFAULT_INPUTS for the shape
 * @returns {Object} { basis, months, totals, seasons, people, headline }
 */
function computeWages (inputs) {
  const src = inputs && typeof inputs === 'object' ? inputs : {}
  const settings = src.settings || DEFAULT_INPUTS.settings
  const seasonNames = src.seasonNames || DEFAULT_INPUTS.seasonNames
  const allowances = src.allowances || { seasonal: 0 }
  const people = Array.isArray(src.people) ? src.people : []
  const monthsIn = Array.isArray(src.months) ? src.months : []
  const basis = src.basis === 'shutdown' ? 'shutdown' : 'seasonal'

  // Each person's per-season figures, computed once rather than per month.
  const costed = people.map(function (p) {
    return {
      person: p,
      wage: monthlyWageBySeason(p, settings),
      revenue: monthlyRevenueBySeason(p, settings)
    }
  })

  const months = monthsIn.map(function (m, idx) {
    const key = seasonKeyOf(seasonNames, m.season)
    let seasonalWages = 0
    let seasonalRevenue = 0
    let shutdownWages = 0
    let shutdownRevenue = 0

    costed.forEach(function (c) {
      const on = Array.isArray(c.person.onPayroll) ? c.person.onPayroll[idx] : false
      if (!on) { return }
      const rise = 1 + num(Array.isArray(c.person.payRise) ? c.person.payRise[idx] : 0)
      seasonalWages += c.wage[key] * rise
      seasonalRevenue += c.revenue[key]
      const sw = Array.isArray(c.person.shutdownWage) ? num(c.person.shutdownWage[idx]) : 0
      const sr = Array.isArray(c.person.shutdownRevenue) ? num(c.person.shutdownRevenue[idx]) : 0
      shutdownWages += sw * rise
      shutdownRevenue += sr
    })

    // 🔴 CORRECTION 3 — seasonal only. On the shutdown basis each person's allowance is
    // already inside their monthly wage (`Shutdown Inputs` CE7 sits within CL7), so adding
    // `Cash Report` AH7 on top charges it twice. See the file header.
    const allowance = basis === 'seasonal' && m.allowanceApplies ? num(allowances.seasonal) : 0
    const wageCost = (basis === 'seasonal' ? seasonalWages : shutdownWages) + allowance
    const revenue = basis === 'seasonal' ? seasonalRevenue : shutdownRevenue
    const margin = revenue - wageCost
    const actual = num(m.actualMargin)

    return {
      name: m.name,
      season: m.season,
      seasonKey: key,
      productionDays: num(m.productionDays),
      seasonalRevenue,
      shutdownRevenue,
      allowance,
      revenue,
      wageCost,
      margin,
      actual,
      variance: actual - margin
    }
  })

  /** @param {string} field @returns {number} */
  const total = function (field) {
    return months.reduce(function (sum, m) { return sum + m[field] }, 0)
  }

  const totals = {
    seasonalRevenue: total('seasonalRevenue'),
    shutdownRevenue: total('shutdownRevenue'),
    allowance: total('allowance'),
    revenue: total('revenue'),
    wageCost: total('wageCost'),
    margin: total('margin'),
    actual: total('actual'),
    variance: total('variance')
  }

  // The worst month on the plan — the one the advisor opens the conversation with.
  let tightest = null
  months.forEach(function (m) {
    if (tightest === null || m.margin < tightest.margin) { tightest = m }
  })

  return {
    basis,
    seasonNames,
    months,
    totals,
    seasons: seasonComparison({ settings, people, seasonNames }),
    headcount: people.filter(function (p) { return String(p.name || '').length > 0 }).length,
    headline: {
      margin: totals.margin,
      actual: totals.actual,
      variance: totals.variance,
      marginPctOfRevenue: totals.revenue === 0 ? 0 : totals.margin / totals.revenue,
      tightestMonth: tightest ? { name: tightest.name, margin: tightest.margin, season: tightest.season } : null
    }
  }
}

/**
 * The workbook's OWN sample — 29 rows across four divisions, its twelve months, its
 * season settings and its hiring plan, read straight out of `Wages Model.xlsx` rather
 * than typed. Nothing here is invented to fill a box.
 *
 * `shutdownWage` and `shutdownRevenue` are each person's twelve monthly figures from the
 * `Shutdown Inputs` sheet, carried as supplied. Deriving them from that sheet's own
 * per-person inputs is the next slice of this port — the seasonal basis, which the sample
 * runs on, is derived in full above.
 *
 * `overtimeSuppressed` is the workbook's global overtime flag (`Seasonal Inputs` J4),
 * blank in the sample — see `overtimeBySeason` for what blank means.
 */
const DEFAULT_INPUTS = {
  basis: 'seasonal',
  seasonNames: { wet: 'Wet n Dark', std: 'Std Season', dry: 'Dry n Light' },
  settings: {
    hoursPerDayFullTime: 8,
hoursPerDayPartTime: 4.5,
    daysPerWeek: 5,
statDays: 12,
    overtimeSuppressed: null,
    production: {
      wet: { hoursPerDay: 7, daysPerWeek: 5, daysLost: 4 },
      std: { hoursPerDay: 7.5, daysPerWeek: 5, daysLost: 0 },
      dry: { hoursPerDay: 10, daysPerWeek: 6, daysLost: 1 },
      daysLostApply: true
    }
  },
  // One key, not two. The workbook's shutdown allowance (`Cash Report` AH7 = 2,600) is
  // deliberately absent — CORRECTION 3 in the file header says why.
  allowances: { seasonal: 1400 },
  months: [
    { name: 'Apr', season: 'Std Season', productionDays: 22, allowanceApplies: true, actualMargin: 5000 },
    { name: 'May', season: 'Dry n Light', productionDays: 21, allowanceApplies: true, actualMargin: 27500 },
    { name: 'Jun', season: 'Std Season', productionDays: 23, allowanceApplies: false, actualMargin: 2500 },
    { name: 'Jul', season: 'Wet n Dark', productionDays: 23, allowanceApplies: true, actualMargin: -5000 },
    { name: 'Aug', season: 'Std Season', productionDays: 21, allowanceApplies: false, actualMargin: 11450 },
    { name: 'Sep', season: 'Dry n Light', productionDays: 19, allowanceApplies: false, actualMargin: 16750 },
    { name: 'Oct', season: 'Std Season', productionDays: 20, allowanceApplies: false, actualMargin: 1500 },
    { name: 'Nov', season: 'Dry n Light', productionDays: 21, allowanceApplies: false, actualMargin: 1250 },
    { name: 'Dec', season: 'Std Season', productionDays: 11, allowanceApplies: false, actualMargin: 12568 },
    { name: 'Jan', season: 'Dry n Light', productionDays: 10, allowanceApplies: true, actualMargin: 11450 },
    { name: 'Feb', season: 'Std Season', productionDays: 18, allowanceApplies: true, actualMargin: 2500 },
    { name: 'Mar', season: 'Std Season', productionDays: 22, allowanceApplies: true, actualMargin: 10478 }
  ],
  people: [
    {
      name: 'Mary G',
division: 'Admin',
wageBasis: 'salary',
employment: 'Part Time',
      chargeRate: 0,
payRate: 19,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
      shutdownWage: [2711.68, 2711.68, 2711.68, 2711.68, 2711.68, 2711.68, 2711.68, 2711.68, 2711.68, 2711.68, 2711.68, 2711.68],
      shutdownRevenue: [2336, 2229.818182, 2442.181818, 2442.181818, 2229.818182, 2017.454545, 2123.636364, 2229.818182, 1168, 1061.818182, 1911.272727, 2336]
    },
    {
      name: 'Agatha',
division: 'Admin',
wageBasis: 'salary',
employment: 'Full Time',
      chargeRate: 0,
payRate: 19,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, true, true, true, true, true, true, true, true, false, false],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [3211.2, 3211.2, 3211.2, 3211.2, 3211.2, 3211.2, 3211.2, 3211.2, 3211.2, 3211.2, 3211.2, 3211.2],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Judy',
division: 'Admin',
wageBasis: 'salary',
employment: 'Full Time',
      chargeRate: 0,
payRate: 19,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, false, false, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [2203.24, 2203.24, 2203.24, 2203.24, 2203.24, 2203.24, 2203.24, 2203.24, 2203.24, 2203.24, 2203.24, 2203.24],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Stephen',
division: 'Admin',
wageBasis: 'salary',
employment: 'Full Time',
      chargeRate: 0,
payRate: 19,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, false, false, false, false, false, false, false, false, false, false],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [3568, 3568, 3568, 3568, 3568, 3568, 3568, 3568, 3568, 3568, 3568, 3568],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Max',
division: 'Sales',
wageBasis: 'salary',
employment: 'Full Time',
      chargeRate: 0,
payRate: 23,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
      shutdownWage: [5680.866, 5680.866, 4511.766, 5680.866, 4511.766, 4511.766, 4511.766, 4511.766, 4511.766, 5680.866, 5680.866, 5680.866],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Alex',
division: 'Sales',
wageBasis: 'salary',
employment: 'Full Time',
      chargeRate: 0,
payRate: 23,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5924.303, 5924.303, 4690.253, 5924.303, 4690.253, 4690.253, 4690.253, 4690.253, 4690.253, 5924.303, 5924.303, 5924.303],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Joe',
division: 'Sales',
wageBasis: 'salary',
employment: 'Full Time',
      chargeRate: 0,
payRate: 23,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, false, false, false, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [6167.74, 6167.74, 4868.74, 6167.74, 4868.74, 4868.74, 4868.74, 4868.74, 4868.74, 6167.74, 6167.74, 6167.74],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Sean',
division: 'Sales',
wageBasis: 'salary',
employment: 'Full Time',
      chargeRate: 0,
payRate: 23,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, false, false, false, false, false, false, false, false, false, false],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [6411.177, 6411.177, 5047.227, 6411.177, 5047.227, 5047.227, 5047.227, 5047.227, 5047.227, 6411.177, 6411.177, 6411.177],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Billy Ray',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 55,
payRate: 35,
dailyEfficiency: 0.92,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [true, true, true, true, true, true, false, false, false, false, false, false],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5980.1575, 5980.1575, 4486.3075, 5980.1575, 4486.3075, 4486.3075, 4486.3075, 4486.3075, 4486.3075, 5980.1575, 5980.1575, 5980.1575],
      shutdownRevenue: [6882.857143, 6570, 7195.714286, 7195.714286, 6570, 5944.285714, 6257.142857, 6570, 3441.428571, 3128.571429, 5631.428571, 6882.857143]
    },
    {
      name: 'Bob',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 52,
payRate: 32,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [7375.085714, 7039.854545, 7710.316883, 7710.316883, 7039.854545, 6369.392208, 6704.623377, 7039.854545, 3687.542857, 3352.311688, 6034.161039, 7375.085714]
    },
    {
      name: 'Barry',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 65,
payRate: 35,
dailyEfficiency: 0.92,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [8509.714286, 8122.909091, 8896.519481, 8896.519481, 8122.909091, 7349.298701, 7736.103896, 8122.909091, 4254.857143, 3868.051948, 6962.493506, 8509.714286]
    },
    {
      name: 'Bruce',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 60,
payRate: 38,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [8509.714286, 8122.909091, 8896.519481, 8896.519481, 8122.909091, 7349.298701, 7736.103896, 8122.909091, 4254.857143, 3868.051948, 6962.493506, 8509.714286]
    },
    {
      name: 'Brian',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 60,
payRate: 37,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [6285.2585, 6285.2585, 4791.4085, 6285.2585, 4791.4085, 4791.4085, 4791.4085, 4791.4085, 4791.4085, 6285.2585, 6285.2585, 6285.2585],
      shutdownRevenue: [8509.714286, 8122.909091, 8896.519481, 8896.519481, 8122.909091, 7349.298701, 7736.103896, 8122.909091, 4254.857143, 3868.051948, 6962.493506, 8509.714286]
    },
    {
      name: 'Butch',
division: 'Production',
wageBasis: 'production',
employment: 'Part Time',
      chargeRate: 50,
payRate: 26,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [7091.428571, 6769.090909, 7413.766234, 7413.766234, 6769.090909, 6124.415584, 6446.753247, 6769.090909, 3545.714286, 3223.376623, 5802.077922, 7091.428571]
    },
    {
      name: 'Bono',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 50,
payRate: 26,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5679.0585, 5679.0585, 4185.2085, 5679.0585, 4185.2085, 4185.2085, 4185.2085, 4185.2085, 4185.2085, 5679.0585, 5679.0585, 5679.0585],
      shutdownRevenue: [7091.428571, 6769.090909, 7413.766234, 7413.766234, 6769.090909, 6124.415584, 6446.753247, 6769.090909, 3545.714286, 3223.376623, 5802.077922, 7091.428571]
    },
    {
      name: 'Boris',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 40,
payRate: 22,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5679.0585, 5679.0585, 4185.2085, 5679.0585, 4185.2085, 4185.2085, 4185.2085, 4185.2085, 4185.2085, 5679.0585, 5679.0585, 5679.0585],
      shutdownRevenue: [5673.142857, 5415.272727, 5931.012987, 5931.012987, 5415.272727, 4899.532468, 5157.402597, 5415.272727, 2836.571429, 2578.701299, 4641.662338, 5673.142857]
    },
    {
      name: 'Brad',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 38,
payRate: 21,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, false, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [5389.485714, 5144.509091, 5634.462338, 5634.462338, 5144.509091, 4654.555844, 4899.532468, 5144.509091, 2694.742857, 2449.766234, 4409.579221, 5389.485714]
    },
    {
      name: 'Bart',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 35,
payRate: 20,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, false, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [4964, 4738.363636, 5189.636364, 5189.636364, 4738.363636, 4287.090909, 4512.727273, 4738.363636, 2482, 2256.363636, 4061.454545, 4964]
    },
    {
      name: 'Ben',
division: 'Production',
wageBasis: 'production',
employment: 'Part Time',
      chargeRate: 50,
payRate: 26,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, false, false, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [7091.428571, 6769.090909, 7413.766234, 7413.766234, 6769.090909, 6124.415584, 6446.753247, 6769.090909, 3545.714286, 3223.376623, 5802.077922, 7091.428571]
    },
    {
      name: 'Bevis',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 50,
payRate: 26,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, false, false, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5982.1585, 5845.55, 4488.3085, 6344.063208, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 6219.575708, 6219.575708, 6219.575708],
      shutdownRevenue: [7091.428571, 6769.090909, 7413.766234, 7413.766234, 6769.090909, 6124.415584, 6446.753247, 6769.090909, 3545.714286, 3223.376623, 5802.077922, 7091.428571]
    },
    {
      name: 'Butch',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 50,
payRate: 26,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0],
      shutdownWage: [5982.1585, 5982.1585, 4488.3085, 5982.1585, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 4488.3085, 5982.1585, 5982.1585, 5982.1585],
      shutdownRevenue: [7091.428571, 6769.090909, 7413.766234, 7413.766234, 6769.090909, 6124.415584, 6446.753247, 6769.090909, 3545.714286, 3223.376623, 5802.077922, 7091.428571]
    },
    {
      name: 'Bono',
division: 'Production',
wageBasis: 'production',
employment: 'Part Time',
      chargeRate: 50,
payRate: 26,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [true, true, false, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [5923.148, 5923.148, 4364.348, 5923.148, 4364.348, 4364.348, 4364.348, 4364.348, 4364.348, 5923.148, 5923.148, 5923.148],
      shutdownRevenue: [7091.428571, 6769.090909, 7413.766234, 7413.766234, 6769.090909, 6124.415584, 6446.753247, 6769.090909, 3545.714286, 3223.376623, 5802.077922, 7091.428571]
    },
    {
      name: 'Boris',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 40,
payRate: 22,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, false, false, false, false, false, false, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Brad',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 38,
payRate: 21,
dailyEfficiency: 0.85,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 15,
      onPayroll: [false, false, false, false, false, false, false, false, false, true, true, true],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: '',
division: 'Production',
wageBasis: 'production',
employment: 'Full Time',
      chargeRate: 0,
payRate: 0,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, false, false, false, false, false, false, false, false, false, false],
      payRise: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      shutdownWage: [368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1, 368.1],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Stevie',
division: 'Management',
wageBasis: 'management',
employment: 'Full Time',
      chargeRate: 323,
payRate: 74,
dailyEfficiency: 0.5,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04],
      shutdownWage: [6214.908, 6214.908, 5305.608, 6214.908, 5305.608, 5305.608, 5305.608, 5305.608, 5305.608, 6214.908, 6214.908, 6214.908],
      shutdownRevenue: [6358.857143, 6069.818182, 6647.896104, 6647.896104, 6069.818182, 5491.74026, 5780.779221, 6069.818182, 3179.428571, 2890.38961, 5202.701299, 6358.857143]
    },
    {
      name: 'Natalie',
division: 'Management',
wageBasis: 'management',
employment: 'Full Time',
      chargeRate: 260,
payRate: 35,
dailyEfficiency: 0.4,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [true, true, true, true, true, true, true, true, true, true, true, true],
      payRise: [0, 0, 0, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04],
      shutdownWage: [4660.9655, 4660.9655, 3719.1905, 4660.9655, 3719.1905, 3719.1905, 3719.1905, 3719.1905, 3719.1905, 4660.9655, 4660.9655, 4660.9655],
      shutdownRevenue: [4451.2, 4248.872727, 4653.527273, 4653.527273, 4248.872727, 3844.218182, 4046.545455, 4248.872727, 2225.6, 2023.272727, 3641.890909, 4451.2]
    },
    {
      name: '',
division: 'Management',
wageBasis: 'management',
employment: 'Full Time',
      chargeRate: 0,
payRate: 0,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, false, false, false, false, false, false, false, false, false, false],
      payRise: [0, 0, 0, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04],
      shutdownWage: [303.1, 303.1, 303.1, 303.1, 303.1, 303.1, 303.1, 303.1, 303.1, 303.1, 303.1, 303.1],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: '',
division: 'Management',
wageBasis: 'management',
employment: 'Full Time',
      chargeRate: 0,
payRate: 0,
dailyEfficiency: 0,
retirementPct: 0.03,
overtimePct: 0.5,
leaveDays: 30,
toolsWeekly: 0,
      onPayroll: [false, false, false, false, false, false, false, false, false, false, false, false],
      payRise: [0, 0, 0, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04],
      shutdownWage: [606.2, 606.2, 606.2, 606.2, 606.2, 606.2, 606.2, 606.2, 606.2, 606.2, 606.2, 606.2],
      shutdownRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  ]
}

module.exports = {
  SEASON_KEYS,
  WEEKS_PER_MONTH,
  OVERTIME_THRESHOLD_HOURS,
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
}
