'use strict'

/**
 * The bands the Three-Way Forecast's two-year trend read draws (item 4.61 phase (b)).
 *
 * WHAT THESE TESTS ARE FOR. A manager typing a threshold sees a number go into a box and
 * a success message come back. What they cannot see is that the number was silently
 * dropped as unrecognised, that a red line less severe than its amber has made amber
 * unreachable, or that a firm's change failed to reach the advisors under it. Those are
 * the assertions here.
 */

const {
  BASE_TREND_THRESHOLDS,
  CONFIG_KEY,
  LEVEL_KEYS,
  MOVEMENT_KEYS,
  validateTrendThresholds,
  loadResolvedTrendThresholds
} = require('../../server/utils/forecastTrendThresholds')

/** A loader over a `{scopeId: storedValue}` map, standing in for the overlay store. */
function loaderFor (map) {
  return (scopeId, key) => {
    expect(key).toBe(CONFIG_KEY)
    return Promise.resolve(Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null)
  }
}

describe('the platform thresholds as shipped', () => {
  // 🔴 A DELIBERATE PIN, AND THE ONLY ONE IN THIS FILE. These three numbers are Mike's own
  // words of 2026-09-03 — "0-35 = green - 36 - 45 - orange - 46 + = red" — and they are
  // load-bearing: they are the only banding any client gets today, and the approved
  // drawing and `trendModel.test.js` both state results computed against them. A silent
  // edit here would change what every advisor is told with nothing on screen to notice by.
  test('debtor days carries Mike’s numbers and nothing else is banded', () => {
    expect(BASE_TREND_THRESHOLDS.levels.debtorDays).toEqual({ green: 35, amber: 45 })
    expect(BASE_TREND_THRESHOLDS.levels.creditorDays).toEqual({ green: null, amber: null })
    expect(BASE_TREND_THRESHOLDS.levels.stockDays).toEqual({ green: null, amber: null })
    MOVEMENT_KEYS.forEach((k) => {
      expect(BASE_TREND_THRESHOLDS.movements[k]).toEqual({ warn: null, crit: null })
    })
  })

  test('the data file’s own documentation never reaches an API response', () => {
    expect(Object.keys(BASE_TREND_THRESHOLDS)).toEqual(['levels', 'movements'])
  })

  test('the two groups hold exactly the measures the model bands that way', () => {
    expect(Object.keys(BASE_TREND_THRESHOLDS.levels).sort()).toEqual(LEVEL_KEYS.slice().sort())
    expect(Object.keys(BASE_TREND_THRESHOLDS.movements).sort()).toEqual(MOVEMENT_KEYS.slice().sort())
  })
})

describe('validating a tier’s own changes', () => {
  test('a partial object is fine — an absent measure keeps coming from above', () => {
    const r = validateTrendThresholds({ levels: { stockDays: { green: 60, amber: 90 } } })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ levels: { stockDays: { green: 60, amber: 90 } } })
  })

  test('an explicit null is KEPT — it is how a threshold is cleared', () => {
    const r = validateTrendThresholds({ levels: { debtorDays: { green: null, amber: null } } })
    expect(r.ok).toBe(true)
    expect(r.value.levels.debtorDays).toEqual({ green: null, amber: null })
  })

  test('an emptied input box is read as cleared, not as zero', () => {
    const r = validateTrendThresholds({ levels: { debtorDays: { green: '', amber: '' } } })
    expect(r.ok).toBe(true)
    expect(r.value.levels.debtorDays).toEqual({ green: null, amber: null })
  })

  test('numbers typed as text are accepted, because a text input is what sends them', () => {
    const r = validateTrendThresholds({ levels: { creditorDays: { green: '30', amber: '60' } } })
    expect(r.ok).toBe(true)
    expect(r.value.levels.creditorDays).toEqual({ green: 30, amber: 60 })
  })

  // A typo that vanishes quietly is a threshold somebody believes they saved.
  test('an unknown group, measure or boundary is an error, never a silent drop', () => {
    expect(validateTrendThresholds({ nonsense: {} }).ok).toBe(false)
    expect(validateTrendThresholds({ levels: { salesGrowth: { green: 1, amber: 2 } } }).ok).toBe(false)
    expect(validateTrendThresholds({ movements: { debtorDays: { warn: 1, crit: 2 } } }).ok).toBe(false)
    expect(validateTrendThresholds({ levels: { debtorDays: { red: 50 } } }).ok).toBe(false)
  })

  test('a day-count cannot be negative, but a movement certainly can', () => {
    expect(validateTrendThresholds({ levels: { debtorDays: { green: -1, amber: 45 } } }).ok).toBe(false)
    // "Growth falls below -5%" is an ordinary red line.
    const r = validateTrendThresholds({ movements: { salesGrowth: { warn: 0, crit: -5 } } })
    expect(r.ok).toBe(true)
    expect(r.value.movements.salesGrowth).toEqual({ warn: 0, crit: -5 })
  })

  // 🔴 THE ORDERING CHECKS. A red line less severe than its amber does not look wrong on
  // screen — it produces a block that reports everything as red and never once as amber.
  test('a green figure above its amber is refused', () => {
    expect(validateTrendThresholds({ levels: { stockDays: { green: 90, amber: 60 } } }).ok).toBe(false)
    expect(validateTrendThresholds({ levels: { stockDays: { green: 60, amber: 60 } } }).ok).toBe(true)
  })

  test('a red less severe than its amber is refused, in each direction the shape means', () => {
    // "falls by more than": red must be the BIGGER fall.
    expect(validateTrendThresholds({ movements: { grossMargin: { warn: 3, crit: 1 } } }).ok).toBe(false)
    expect(validateTrendThresholds({ movements: { grossMargin: { warn: 1, crit: 3 } } }).ok).toBe(true)
    // "rises by more than": likewise.
    expect(validateTrendThresholds({ movements: { overheadRatio: { warn: 3, crit: 1 } } }).ok).toBe(false)
    // "growth falls below": red must be the LOWER figure — the opposite comparison.
    expect(validateTrendThresholds({ movements: { salesGrowth: { warn: -5, crit: 0 } } }).ok).toBe(false)
    expect(validateTrendThresholds({ movements: { salesGrowth: { warn: 0, crit: -5 } } }).ok).toBe(true)
  })

  test('one boundary on its own is not an ordering error', () => {
    expect(validateTrendThresholds({ movements: { grossMargin: { crit: 3 } } }).ok).toBe(true)
    expect(validateTrendThresholds({ levels: { stockDays: { amber: 90 } } }).ok).toBe(true)
  })

  test('anything that is not an object at all is refused', () => {
    expect(validateTrendThresholds(null).ok).toBe(false)
    expect(validateTrendThresholds([]).ok).toBe(false)
    expect(validateTrendThresholds('45').ok).toBe(false)
    expect(validateTrendThresholds({ levels: [] }).ok).toBe(false)
    expect(validateTrendThresholds({ levels: { debtorDays: 45 } }).ok).toBe(false)
  })

  test('an empty object is valid and means “this tier changes nothing”', () => {
    const r = validateTrendThresholds({})
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({})
  })
})

describe('resolving what a scope actually works to', () => {
  test('no scope at all gets the platform set', async () => {
    await expect(loadResolvedTrendThresholds(null, loaderFor({}))).resolves.toBe(BASE_TREND_THRESHOLDS)
  })

  // Identity, not merely equality: a scope that has changed nothing gets the very object
  // from the layer above, so "unchanged" is provable by reference rather than by diff.
  test('a scope that has stored nothing gets the layer above untouched', async () => {
    const got = await loadResolvedTrendThresholds('firm-1', loaderFor({}))
    expect(got).toBe(BASE_TREND_THRESHOLDS)
  })

  test('a scope’s own change merges over the platform’s, leaving the rest alone', async () => {
    const got = await loadResolvedTrendThresholds('firm-1', loaderFor({
      'firm-1': { levels: { stockDays: { green: 60, amber: 90 } } }
    }))
    expect(got.levels.stockDays).toEqual({ green: 60, amber: 90 })
    expect(got.levels.debtorDays).toEqual({ green: 35, amber: 45 })
    expect(got.movements.grossMargin).toEqual({ warn: null, crit: null })
  })

  test('a scope may clear an inherited threshold, which unbands that measure', async () => {
    const got = await loadResolvedTrendThresholds('firm-1', loaderFor({
      'firm-1': { levels: { debtorDays: { green: null, amber: null } } }
    }))
    expect(got.levels.debtorDays).toEqual({ green: null, amber: null })
  })

  // A storage fault must never stop an advisor building a forecast.
  test('a store that throws degrades to the layer above rather than rejecting', async () => {
    const thrower = () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:3306'))
    await expect(loadResolvedTrendThresholds('firm-1', thrower)).resolves.toBe(BASE_TREND_THRESHOLDS)
  })

  test('a stored value that no longer validates is ignored rather than half-applied', async () => {
    const got = await loadResolvedTrendThresholds('firm-1', loaderFor({
      'firm-1': { levels: { stockDays: { green: 90, amber: 60 } } }
    }))
    expect(got).toBe(BASE_TREND_THRESHOLDS)
  })
})
