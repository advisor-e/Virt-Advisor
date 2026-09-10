'use strict'

/**
 * The list the next-steps draft sends, read off the pages route's answer (item 4.70,
 * stage 6). One function feeds both the blue box and the request, so this is where
 * "exactly what will be sent" is pinned to the figures.
 */

const { sendListFrom, POSITION_MAP } = require('../../utils/nextStepsSendList')
const { MEASURE_KEYS, validateSendList } = require('../../server/report/nextStepsDraft')

const SCORE = {
  measures: [
    { key: 'salesGrowth', band: 'green' }, { key: 'grossMargin', band: 'green' }, { key: 'overheadRatio', band: 'amber' },
    { key: 'debtorDays', band: 'amber' }, { key: 'creditorDays', band: 'green' }, { key: 'stockDays', band: 'red' },
    { key: 'currentRatio', band: 'green' }, { key: 'debtToEquity', band: 'green' }
  ]
}

const BENCHMARKS = {
  available: true,
  rows: [
    { key: 'returnOnEquity', you: 0.4, position: 'above' },
    { key: 'grossProfitRatio', you: 0.41, position: 'within' },
    { key: 'currentRatio', you: 1.4, position: 'below' },
    { key: 'stockTurnover', you: 3.1, position: 'below' },
    { key: 'quickRatio', you: 0.9, position: null }
  ]
}

test('the eight colours come off the score, in the score\'s order, and nothing else does', () => {
  const out = sendListFrom({ score: SCORE, summary: { revenue: 2840000 }, benchmarks: null })
  expect(out.measures).toEqual(SCORE.measures)
  expect(out.positions).toEqual([])
  expect(JSON.stringify(out)).not.toContain('2840000')
})

test('🔴 what it builds is what the route accepts — the two never disagree', () => {
  const out = sendListFrom({ score: SCORE, benchmarks: BENCHMARKS })
  expect(validateSendList(out).ok).toBe(true)
  out.measures.forEach(m => expect(MEASURE_KEYS).toContain(m.key))
  out.positions.forEach(p => expect(MEASURE_KEYS).toContain(p.key))
})

test('positions come across for the three Stats NZ publishes on the report\'s definition, stock turnover inverted', () => {
  const out = sendListFrom({ score: SCORE, benchmarks: BENCHMARKS })
  expect(out.positions).toEqual([
    { key: 'grossMargin', position: 'within' },
    { key: 'currentRatio', position: 'below' },
    // Turnover BELOW the middle half is stock DAYS above it — the word the measure carries.
    { key: 'stockDays', position: 'above' }
  ])
  expect(Object.keys(POSITION_MAP)).toEqual(['currentRatio', 'grossProfitRatio', 'stockTurnover'])
})

test('a position is sent only for a measure the score banded', () => {
  const partial = { measures: [{ key: 'debtorDays', band: 'amber' }] }
  expect(sendListFrom({ score: partial, benchmarks: BENCHMARKS }).positions).toEqual([])
})

test('an unavailable comparison, an unbanded measure, or no figures at all send nothing wrong', () => {
  expect(sendListFrom({ score: SCORE, benchmarks: { available: false, rows: BENCHMARKS.rows } }).positions).toEqual([])
  expect(sendListFrom({ score: { measures: [{ key: 'stockDays', band: null }, { key: 'debtorDays', band: 'amber' }] } }).measures).toEqual([{ key: 'debtorDays', band: 'amber' }])
  expect(sendListFrom(null)).toEqual({ measures: [], positions: [] })
  expect(sendListFrom({})).toEqual({ measures: [], positions: [] })
})
