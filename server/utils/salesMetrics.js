'use strict'

/**
 * salesMetrics — the Sales Tracker dashboard's figures.
 *
 * Item 17 stage 3. Pure functions over rows the caller may already see: given the
 * pipeline and COI lists, produce the counts, totals, rates and breakdowns the
 * dashboard draws. No database access and no identity handling — the route fetches
 * through the two stores, so **the access rules are enforced once, in SQL, and
 * this module can never widen them.**
 *
 * That separation is the point. The source app computes its dashboard with its own
 * Prisma aggregates (`server/api/dashboard/metrics.get.js`, 276 lines), which means
 * the access rule is written a second time — and in its case written to say
 * *"shared across the firm - no userId filter"*, which is the very fault we did not
 * port. Aggregating rows the store already filtered makes that mistake impossible
 * rather than merely avoided.
 *
 * 🔴 EVERY RATE GUARDS ITS DENOMINATOR. A conversion rate over zero approaches is
 * not 0% and not 100% — it is **nothing to report**, and these return `null` for it
 * so the screen can say so. A dashboard that shows a confident 0% on an empty
 * pipeline is a wrong number, not an empty state.
 */

/** Sum a numeric field across rows, treating null/undefined/NaN as 0. */
function sum (rows, field) {
  return rows.reduce((t, r) => {
    const n = Number(r[field])
    return t + (Number.isFinite(n) ? n : 0)
  }, 0)
}

/**
 * A percentage, or null when there is nothing to divide by.
 * @param {number} part
 * @param {number} whole
 * @returns {number|null} 0–100 rounded to one decimal, or null
 */
function rate (part, whole) {
  if (!whole) { return null }
  return Math.round((part / whole) * 1000) / 10
}

/**
 * Count rows by a field, largest first, skipping blanks.
 * @param {object[]} rows
 * @param {string} field
 * @returns {{label: string, value: number}[]}
 */
function countBy (rows, field) {
  const map = new Map()
  rows.forEach((r) => {
    const key = String(r[field] || '').trim()
    if (!key) { return }
    map.set(key, (map.get(key) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Sum a money field by a grouping field, largest first.
 * @param {object[]} rows
 * @param {string} field - the grouping field
 * @param {string} valueField - the money field
 * @returns {{label: string, value: number}[]}
 */
function sumBy (rows, field, valueField) {
  const map = new Map()
  rows.forEach((r) => {
    const key = String(r[field] || '').trim()
    if (!key) { return }
    const n = Number(r[valueField])
    map.set(key, (map.get(key) || 0) + (Number.isFinite(n) ? n : 0))
  })
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value)
}

/**
 * Secured value by calendar month, oldest first, from the date a job was secured.
 *
 * ⚠ A ROW WITH NO `dateSecured` IS SKIPPED, NOT DATED TODAY. The source app's
 * trend keys off `approachDate` and silently drops anything unparseable; dating an
 * undated win to the current month would invent a spike in whichever month the
 * screen happened to be opened.
 *
 * @param {object[]} deals
 * @returns {{label: string, value: number, iso: string}[]}
 */
function securedByMonth (deals) {
  const map = new Map()
  deals.forEach((d) => {
    if (!d.jobSecured || !d.dateSecured) { return }
    const t = new Date(d.dateSecured)
    if (isNaN(t.getTime())) { return }
    const iso = t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0')
    const n = Number(d.jobSecuredValue)
    map.set(iso, (map.get(iso) || 0) + (Number.isFinite(n) ? n : 0))
  })
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([iso, value]) => ({ iso, label: iso, value }))
}

/**
 * Every figure the dashboard draws, from rows the caller may already see.
 *
 * @param {object[]} deals - pipeline rows, already access-filtered by the store
 * @param {object[]} cois - COI rows, already access-filtered by the store
 * @returns {object} the metrics payload
 */
function compute (deals, cois) {
  const d = Array.isArray(deals) ? deals : []
  const c = Array.isArray(cois) ? cois : []

  // The funnel, in the order an advisor works it.
  const approached = d.length
  const meetings = d.filter(x => x.secureMeeting).length
  const proposals = d.filter(x => x.proposalSent).length
  const secured = d.filter(x => x.jobSecured).length

  const proposedValue = sum(d, 'proposalValue')
  const securedValue = sum(d, 'jobSecuredValue')
  const additionalValue = sum(d, 'additionalWorkSecured')

  // Days from approach to secured, for the deals that record both. A median
  // rather than a mean: one deal that sat for two years should not move the
  // number an advisor plans against.
  const spans = d
    .filter(x => x.jobSecured && x.approachDate && x.dateSecured)
    .map((x) => {
      const a = new Date(x.approachDate).getTime()
      const b = new Date(x.dateSecured).getTime()
      return (isNaN(a) || isNaN(b)) ? null : Math.round((b - a) / 86400000)
    })
    .filter(n => n !== null && n >= 0)
    .sort((a, b) => a - b)
  const medianDaysToSecure = spans.length
    ? (spans.length % 2
        ? spans[(spans.length - 1) / 2]
        : Math.round((spans[spans.length / 2 - 1] + spans[spans.length / 2]) / 2))
    : null

  return {
    funnel: {
      approached,
      meetings,
      proposals,
      secured,
      // Each rate is against the step before it, so a stage with no traffic
      // reports null rather than a confident zero.
      meetingRate: rate(meetings, approached),
      proposalRate: rate(proposals, meetings),
      winRate: rate(secured, proposals),
      overallRate: rate(secured, approached)
    },
    value: {
      proposed: proposedValue,
      secured: securedValue,
      additional: additionalValue,
      // What the average won deal is worth. Guarded: no wins means no average.
      averageWin: secured ? Math.round(securedValue / secured) : null,
      medianDaysToSecure
    },
    byStatus: countBy(d, 'prospectStatus'),
    bySource: countBy(d, 'prospectSource'),
    byIndustry: countBy(d, 'industry'),
    securedByStaff: sumBy(d, 'leadStaff', 'jobSecuredValue'),
    securedByMonth: securedByMonth(d),
    coi: {
      total: c.length,
      referrals: sum(c, 'totalReferrals'),
      converted: sum(c, 'totalConverted'),
      feeValue: sum(c, 'feeValue'),
      // What proportion of referrals turned into work. Null with no referrals.
      conversionRate: rate(sum(c, 'totalConverted'), sum(c, 'totalReferrals')),
      byIndustry: countBy(c, 'industry'),
      topByValue: sumBy(c, 'coiName', 'feeValue').slice(0, 10)
    }
  }
}

/* ------------------------------------------------------------------------- *
 * THE DASHBOARD AS MIKE BUILT IT
 *
 * Everything below is a faithful port of his own dashboard's figures
 * (`server/api/dashboard/metrics.get.js` in advisor-e/sales-tracker-nuxt),
 * which `compute()` above did not carry across. His screen needs them and the
 * screen is copied exactly, so the maths is copied exactly too.
 *
 * 🔴 THE TWO FUNNELS ARE THE POINT OF HIS DASHBOARD. Deals are split on
 * `salesStyle` — **Campaign** versus **Total Needs** — and every rate is shown
 * for each separately, so the two ways of selling can be compared. `compute()`
 * above collapsed them into a single funnel, losing that distinction entirely.
 * `sales_style` was already in our table; it simply was not being read.
 *
 * ⚠ HIS ROUNDING AND HIS ZEROES ARE KEPT, DELIBERATELY. His rates are whole
 * numbers via `Math.round`, and an empty denominator gives **0**, not null —
 * the opposite of the convention in `compute()` above. That is not an oversight
 * here: his screen draws a progress RING from the percentage, and a ring has to
 * have a number to draw. Changing it would change his screen, which is the one
 * thing this port must not do.
 * ------------------------------------------------------------------------- */

/** His rate: a whole percentage, and 0 when there is nothing to divide by. */
function wholeRate (part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0
}

/**
 * The average fee and average days-to-secure across a set of won deals.
 * A faithful port of his `calculateFunnelStats`.
 *
 * @param {object[]} entries - the WON deals of one sales style
 * @returns {{avgFee: number, avgDaysElapsed: number}}
 */
function funnelStats (entries) {
  if (!entries.length) { return { avgFee: 0, avgDaysElapsed: 0 } }

  const totalFee = sum(entries, 'jobSecuredValue')
  const avgFee = Math.round(totalFee / entries.length)

  const days = entries
    .filter(e => e.approachDate && e.dateSecured)
    .map((e) => {
      const start = new Date(e.approachDate).getTime()
      const end = new Date(e.dateSecured).getTime()
      return (isNaN(start) || isNaN(end)) ? null : Math.round((end - start) / 86400000)
    })
    .filter(d => d !== null && d >= 0)

  const avgDaysElapsed = days.length
    ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
    : 0

  return { avgFee, avgDaysElapsed }
}

/**
 * One sales style's funnel: the four counts, plus its average fee and days.
 *
 * ⚠ THE STAGE COUNTS ARE INDEPENDENT, NOT NESTED — his rule, kept. A deal with
 * `proposalSent` but no `secureMeeting` counts toward proposals and not
 * meetings, so a rate can exceed 100% if the data says so. That is his
 * behaviour and it is honest: it shows the data as entered rather than quietly
 * correcting it.
 *
 * @param {object[]} deals - the deals of ONE sales style
 * @returns {object} the funnel block his screen reads
 */
function styleFunnel (deals) {
  const won = deals.filter(d => d.jobSecured)
  const stats = funnelStats(won)
  return {
    approaches: deals.filter(d => d.approachStyle).length,
    meetings: deals.filter(d => d.secureMeeting).length,
    proposals: deals.filter(d => d.proposalSent).length,
    secured: won.length,
    avgFee: stats.avgFee,
    avgDaysElapsed: stats.avgDaysElapsed
  }
}

/**
 * Secured value by month, keyed on the APPROACH date — his choice, kept.
 * (`securedByMonth` above keys on the date secured, which is a different
 * question; both now exist and neither is changed.)
 *
 * @param {object[]} deals
 * @returns {{month: string, value: number}[]} oldest first
 */
function monthlySecuredTrend (deals) {
  const map = new Map()
  deals.forEach((d) => {
    if (!d.approachDate) { return }
    const t = new Date(d.approachDate)
    if (isNaN(t.getTime())) { return }
    const month = t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0')
    const n = Number(d.jobSecuredValue)
    map.set(month, (map.get(month) || 0) + (Number.isFinite(n) ? n : 0))
  })
  return Array.from(map.entries())
    .map(([month, value]) => ({ month, value }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Every figure Mike's dashboard draws, from rows the caller may already see.
 *
 * @param {object[]} deals - pipeline rows, already access-filtered by the store
 * @param {object[]} cois - COI rows, already access-filtered by the store
 * @returns {object} the dashboard payload, in HIS shape
 */
function dashboard (deals, cois) {
  const d = Array.isArray(deals) ? deals : []
  const c = Array.isArray(cois) ? cois : []

  // His two sales styles. Anything with neither value sits in no funnel at all,
  // exactly as his loop leaves it.
  const campaign = d.filter(x => x.salesStyle === 'Campaign')
  const totalNeeds = d.filter(x => x.salesStyle === 'Total Needs')

  // A referral only counts when the named COI is one this advisor actually
  // holds — his `validCoiNames` check, matched case-insensitively as he does.
  const known = new Set(c.map(x => String(x.coiName || '').trim().toLowerCase()).filter(Boolean))
  let coiReferrals = 0
  let coiConverted = 0
  let coiProposalFee = 0
  let coiSecuredFee = 0
  d.forEach((x) => {
    const name = String(x.coiInvolved || '').trim().toLowerCase()
    if (!name || !known.has(name)) { return }
    coiReferrals++
    const p = Number(x.proposalValue)
    coiProposalFee += Number.isFinite(p) ? p : 0
    if (x.jobSecured) {
      coiConverted++
      const s = Number(x.jobSecuredValue)
      coiSecuredFee += Number.isFinite(s) ? s : 0
    }
  })

  // His status-progression counts: how many COIs have got past each gate.
  const past = f => c.filter(x => Number(x[f]) > 0).length

  return {
    approaches: d.filter(x => x.approachStyle).length,
    meetingsSecured: d.filter(x => x.secureMeeting).length,
    proposalsSent: d.filter(x => x.proposalSent).length,
    totalProspects: d.length,
    activeProspects: d.filter(x => String(x.prospectStatus || '') === 'Active').length,
    securedJobs: d.filter(x => x.jobSecured).length,
    totalProposalValue: sum(d, 'proposalValue'),
    totalSecuredValue: sum(d, 'jobSecuredValue'),
    workSecured: sum(d, 'jobSecuredValue'),
    totalCoi: c.length,
    totalReferrals: sum(c, 'totalReferrals'),
    totalConverted: sum(c, 'totalConverted'),
    statusBreakdown: countBy(d, 'prospectStatus').map(r => ({ status: r.label, count: r.value })),
    sourceBreakdown: countBy(d, 'prospectSource').map(r => ({ source: r.label, count: r.value })),
    staffSecuredBreakdown: sumBy(d, 'leadStaff', 'jobSecuredValue')
      .map(r => ({ leadStaff: r.label, value: r.value })),
    monthlySecuredTrend: monthlySecuredTrend(d),
    coiIndustryBreakdown: countBy(c, 'industry')
      .map(r => ({ industry: r.label, relationships: r.value })),
    campaignFunnel: styleFunnel(campaign),
    totalNeedsFunnel: styleFunnel(totalNeeds),
    coiPerformance: {
      total: c.length,
      couldWe: past('couldWe'),
      howWouldWe: past('howWouldWe'),
      willWe: past('willWe'),
      testReview: past('testReview'),
      totalReferrals: coiReferrals,
      totalConverted: coiConverted,
      totalProposalFeeValue: coiProposalFee,
      totalSecuredFeeValue: coiSecuredFee
    }
  }
}

/** The five prospect statuses the roll-up counts, and the key each becomes. */
const STATUS_COLUMNS = [
  ['Active', 'active'],
  ['Await Research', 'awaitResearch'],
  ['Completed', 'completed'],
  ['Dead', 'dead'],
  ['On Hold', 'onHold']
]

/** A blank or missing lead staff groups under one honest label, never silently dropped. */
const UNASSIGNED = 'Unassigned'

/**
 * The status meaning "found, but the research is not finished yet".
 *
 * 🔴 IT IS THE ONE STATUS EXCLUDED FROM THE APPROACH RATE'S DENOMINATOR, because a
 * prospect still being researched is not yet available to approach. Counting them
 * would penalise an advisor for having a full research queue.
 */
const AWAITING_RESEARCH = 'Await Research'

/**
 * Has this prospect actually been approached?
 *
 * 🔴 AN APPROACH DATE, NOT AN APPROACH STYLE — Mike's ruling, 2026-09-22. The
 * source app counts `approachStyle`, which the pipeline screen fills in on
 * creation, so its rate reads ~100% for everyone and measures nothing. A DATE is
 * only present once somebody actually made contact.
 *
 * @param {object} deal
 * @returns {boolean}
 */
function wasApproached (deal) {
  if (!deal.approachDate) { return false }
  const d = new Date(deal.approachDate)
  return !isNaN(d.getTime())
}

/**
 * Is this prospect available to approach — research done, contact not blocked by
 * still being a research job?
 * @param {object} deal
 * @returns {boolean}
 */
function isApproachable (deal) {
  return String(deal.prospectStatus || '').trim() !== AWAITING_RESEARCH
}

/**
 * The Team roll-up: every deal in a firm, grouped by the staff member leading it.
 *
 * 🔴 THE ROWS MUST ALREADY BE THE WHOLE FIRM'S. This counts what it is given, the
 * same division as `dashboard()` — `salesTeamStore.listForFirm` does the reading
 * and the route gates it on the manager role. Handing this an advisor's own list
 * produces a roll-up of one person, which is exactly the source app's bug.
 *
 * ⚠ RATES RETURN null ON AN EMPTY DENOMINATOR, not 0 — the convention of this
 * module (see the header). The source app returns 0 for both of its averages, so
 * a staff member with no proposals reads as a 0% close rate rather than as having
 * nothing to judge yet. A manager comparing their team on that number would be
 * comparing a real failure against an absence of data.
 *
 * @param {object[]} deals - EVERY pipeline row in the firm, access-filtered by the store
 * @returns {{rows: object[], totals: object}} rows sorted by staff name, plus firm totals
 */
function teamSummary (deals) {
  const list = Array.isArray(deals) ? deals : []
  const byStaff = new Map()

  for (const deal of list) {
    const key = String(deal.leadStaff || '').trim() || UNASSIGNED
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        leadStaff: key,
        prospects: 0,
        approachable: 0,
        approachesMade: 0,
        secureMeetings: 0,
        proposalsSent: 0,
        totalProposalValue: 0,
        engagementsSecured: 0,
        totalSecuredValue: 0,
        active: 0,
        awaitResearch: 0,
        completed: 0,
        dead: 0,
        onHold: 0
      })
    }
    const item = byStaff.get(key)
    item.prospects += 1
    // The approach rate compares what COULD have been approached with what was.
    item.approachable += isApproachable(deal) ? 1 : 0
    item.approachesMade += wasApproached(deal) ? 1 : 0
    item.secureMeetings += deal.secureMeeting ? 1 : 0
    item.proposalsSent += deal.proposalSent ? 1 : 0
    item.engagementsSecured += deal.jobSecured ? 1 : 0

    const proposal = Number(deal.proposalValue)
    item.totalProposalValue += Number.isFinite(proposal) ? proposal : 0
    const secured = Number(deal.jobSecuredValue)
    item.totalSecuredValue += Number.isFinite(secured) ? secured : 0

    const status = String(deal.prospectStatus || '').trim()
    const match = STATUS_COLUMNS.find(([label]) => label === status)
    if (match) { item[match[1]] += 1 }
  }

  const rows = Array.from(byStaff.values())
    .map(item => Object.assign({}, item, {
      // 🔴 Of the prospects this person COULD approach, how many they did.
      // Mike's ruling, 2026-09-22: it exists to find an advisor who spends their
      // time finding opportunities and never starts the sale. Prospects still
      // awaiting research are excluded — they are not yet available to approach.
      approachRate: rate(item.approachesMade, item.approachable),
      // Of the proposals they sent, how many became engagements.
      securedRate: rate(item.engagementsSecured, item.proposalsSent),
      // Average size of a proposal they sent — null when they have sent none.
      avgProposalValue: item.proposalsSent
        ? Math.round(item.totalProposalValue / item.proposalsSent)
        : null
    }))
    .sort((a, b) => {
      // Unassigned sorts last: it is a bucket, not a colleague.
      if (a.leadStaff === UNASSIGNED) { return 1 }
      if (b.leadStaff === UNASSIGNED) { return -1 }
      return a.leadStaff.localeCompare(b.leadStaff)
    })

  const totals = {
    teamMembers: rows.filter(r => r.leadStaff !== UNASSIGNED).length,
    prospects: sum(rows, 'prospects'),
    approachable: sum(rows, 'approachable'),
    approachesMade: sum(rows, 'approachesMade'),
    secureMeetings: sum(rows, 'secureMeetings'),
    proposalsSent: sum(rows, 'proposalsSent'),
    totalProposalValue: sum(rows, 'totalProposalValue'),
    engagementsSecured: sum(rows, 'engagementsSecured'),
    totalSecuredValue: sum(rows, 'totalSecuredValue')
  }
  totals.approachRate = rate(totals.approachesMade, totals.approachable)
  totals.securedRate = rate(totals.engagementsSecured, totals.proposalsSent)

  return { rows, totals }
}

module.exports = {
  compute,
  rate,
  countBy,
  sumBy,
  securedByMonth,
  sum,
  // Mike's dashboard
  dashboard,
  styleFunnel,
  funnelStats,
  monthlySecuredTrend,
  wholeRate,
  // The Team roll-up (stage 4)
  teamSummary,
  wasApproached,
  isApproachable,
  UNASSIGNED,
  AWAITING_RESEARCH
}
