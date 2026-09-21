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

module.exports = { compute, rate, countBy, sumBy, securedByMonth, sum }
