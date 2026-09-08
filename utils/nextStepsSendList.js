/**
 * The list the next-steps draft sends, read off the pages route's answer (item 4.70,
 * stage 6). The blue box renders exactly this, and the route sends exactly this — one
 * function, so the screen cannot show one list and send another.
 *
 * 🔴 PRIVACY (Mike, 2026-09-09): eight measure keys with a colour word, and where an
 * industry was named, a position word against the Stats NZ middle half. Nothing else is
 * read off the figures here, so nothing else can be sent.
 *
 * Stats NZ publishes three of the eight on the report's own definition. Two map straight
 * across (current ratio, gross margin). Stock TURNOVER is stock days the other way up —
 * a business above the middle half on turnover holds fewer days of stock — so its position
 * is inverted on the way in, and the word sent is the word the stock DAYS measure would
 * carry. The other five have no published equivalent and send no position.
 *
 * CommonJS so the workbench and its test share one copy.
 */

'use strict'

/** Stats NZ ratio key → the report's measure key, and whether the scale runs the other way. */
const POSITION_MAP = {
  currentRatio: { key: 'currentRatio', inverted: false },
  grossProfitRatio: { key: 'grossMargin', inverted: false },
  stockTurnover: { key: 'stockDays', inverted: true }
}

const INVERSE = { below: 'above', above: 'below', within: 'within' }

/**
 * @param {object|null} figures - the pages route's `data`
 * @returns {{measures: Array<{key: string, band: string}>, positions: Array<{key: string, position: string}>}}
 */
function sendListFrom (figures) {
  const score = figures && figures.score && Array.isArray(figures.score.measures) ? figures.score.measures : []
  const measures = score
    .filter(m => m && typeof m.key === 'string' && ['green', 'amber', 'red'].includes(m.band))
    .map(m => ({ key: m.key, band: m.band }))
  const banded = {}
  measures.forEach((m) => { banded[m.key] = true })

  const rows = figures && figures.benchmarks && figures.benchmarks.available && Array.isArray(figures.benchmarks.rows) ? figures.benchmarks.rows : []
  const positions = []
  rows.forEach((r) => {
    const map = r && POSITION_MAP[r.key]
    if (!map || !INVERSE[r.position] || !banded[map.key]) { return }
    positions.push({ key: map.key, position: map.inverted ? INVERSE[r.position] : r.position })
  })
  return { measures, positions }
}

module.exports = { sendListFrom, POSITION_MAP }
