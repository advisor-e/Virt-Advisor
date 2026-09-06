'use strict'

/**
 * The price ladder imported stock sells down at as it ages (item 4.64).
 *
 * WHAT THESE TESTS ARE FOR. A mentor typing a price sees a number go into a box and a
 * success message come back. What they cannot see is that the figure was silently dropped
 * as unrecognised, that a boundary they moved has left the standard price applying to
 * nothing at all, or that a blank box became a mark-up of zero and put a whole band of a
 * client's stock on sale at cost. Those are the assertions here.
 */

const {
  BASE_SELL_DOWN,
  CONFIG_KEY,
  LADDER_KEYS,
  TERM_KEYS,
  PATTERN_NAMES,
  validateSellDown,
  loadResolvedSellDown
} = require('../../server/utils/forecastSellDown')

/** A loader over a `{scopeId: storedValue}` map, standing in for the overlay store. */
function loaderFor (map) {
  return (scopeId, key) => {
    expect(key).toBe(CONFIG_KEY)
    return Promise.resolve(Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null)
  }
}

describe('the platform ladder as shipped', () => {
  // 🔴 A DELIBERATE PIN, AND THE ONLY ONE IN THIS FILE. Every figure is Mike's, read out of
  // `Supplier 1 Inputs` row 19 of his Import & Retail workbook on 2026-09-04. They are
  // load-bearing: they price every container of imported stock on every forecast, and
  // `threeWayForecastModel.test.js` states revenue computed against them. A silent edit
  // here would change what a client is told their stock is worth, with nothing on screen
  // to notice it by — which is precisely what UAT cannot catch.
  test('the platform ladder is Mike’s own figures, exactly as the workbook gives them', () => {
    expect(BASE_SELL_DOWN.ladder).toEqual({
      newMarkup: 1.85,
      standardMarkup: 1.52,
      runoutMarkup: 1.22,
      newUpToDays: 60,
      standardUpToDays: 90,
      runoutUpToDays: 120
    })
    // The workbook's own worked example: Stock 1 cost 145, New Stock Retail Price 413.25.
    expect(145 * (1 + BASE_SELL_DOWN.ladder.newMarkup)).toBeCloseTo(413.25, 2)
  })

  test('every demand pattern’s four bands total the whole container', () => {
    expect(BASE_SELL_DOWN.patterns.length).toBeGreaterThan(0)
    BASE_SELL_DOWN.patterns.forEach((p) => {
      expect(p.curve).toHaveLength(4)
      expect(p.curve.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
    })
  })

  test('the shipped default names a pattern that exists', () => {
    expect(PATTERN_NAMES).toContain(BASE_SELL_DOWN.defaultPattern)
  })

  // The shipped ladder has to survive its own validator, or no tier could ever save a
  // change on top of it — and the ordering rule is exactly where a hand-edit would trip.
  test('the shipped ladder is one the validator would accept', () => {
    const editable = {}
    LADDER_KEYS.forEach((k) => { editable[k] = BASE_SELL_DOWN.ladder[k] })
    const terms = {}
    TERM_KEYS.forEach((k) => { terms[k] = BASE_SELL_DOWN.terms[k] })
    const r = validateSellDown({ ladder: editable, terms, defaultPattern: BASE_SELL_DOWN.defaultPattern })
    expect(r.errors).toEqual([])
    expect(r.ok).toBe(true)
  })

  test('the data file’s own documentation never reaches an API response', () => {
    expect(Object.keys(BASE_SELL_DOWN).sort()).toEqual(['defaultPattern', 'ladder', 'patterns', 'terms'])
  })
})

describe('the supplier terms are the workbook’s, and editable', () => {
  // A SECOND DELIBERATE PIN, for the same reason as the ladder above. These seven figures
  // decide which calendar month every deposit, balance and landing falls in, and the
  // interest charged on the deferred balance. They summed to the 154 / 149 / 144 day totals
  // Mike's own sheet states for sea, air and express — a silent edit would move cash
  // between months on a document a lender reads, with nothing on screen to notice it by.
  test('the platform terms are Mike’s own figures, exactly as the workbook gives them', () => {
    expect(BASE_SELL_DOWN.terms).toEqual({
      manufactureDays: 120,
      balanceDueDays: 91,
      prepDays: 9,
      interestCoverPct: 0.06,
      seaDays: 25,
      airDays: 20,
      expressDays: 15
    })
    // The totals his sheet states, which is what makes the parts checkable.
    const t = BASE_SELL_DOWN.terms
    expect(t.manufactureDays + t.seaDays + t.prepDays).toBe(154)
    expect(t.manufactureDays + t.airDays + t.prepDays).toBe(149)
    expect(t.manufactureDays + t.expressDays + t.prepDays).toBe(144)
  })

  test('a tier may change a term, and it reaches the resolved result', async () => {
    // The whole point of the change: until 2026-09-04 these were hardcoded in the intake
    // component, under a badge on screen claiming they came from platform settings.
    const resolved = await loadResolvedSellDown('firm-1', loaderFor({
      'firm-1': { terms: { manufactureDays: 150, interestCoverPct: 0.08 } }
    }))
    expect(resolved.terms.manufactureDays).toBe(150)
    expect(resolved.terms.interestCoverPct).toBe(0.08)
    // Everything untouched still comes from the platform.
    expect(resolved.terms.seaDays).toBe(BASE_SELL_DOWN.terms.seaDays)
    // And the ladder beside it is undisturbed.
    expect(resolved.ladder).toEqual(BASE_SELL_DOWN.ladder)
  })

  test('a day count must be a whole number of days, and at least one', () => {
    expect(validateSellDown({ terms: { manufactureDays: 0 } }).ok).toBe(false)
    expect(validateSellDown({ terms: { seaDays: -5 } }).ok).toBe(false)
    expect(validateSellDown({ terms: { prepDays: 9.5 } }).ok).toBe(false)
    expect(validateSellDown({ terms: { prepDays: 9 } }).ok).toBe(true)
  })

  test('interest cover may be nil, but never negative', () => {
    // Unlike a rung of the ladder, a supplier charging nothing for the credit period is a
    // real arrangement. Negative would pay the client to defer, which is a typo every time.
    expect(validateSellDown({ terms: { interestCoverPct: 0 } }).ok).toBe(true)
    expect(validateSellDown({ terms: { interestCoverPct: -0.01 } }).ok).toBe(false)
  })

  test('a term that is not one of the seven is refused, never silently dropped', () => {
    // A figure that vanishes quietly is a term somebody believes they set.
    const r = validateSellDown({ terms: { shippingDays: 25 } })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/shippingDays/)
  })

  test('a blank term is refused — a supplier term has no empty state', () => {
    expect(validateSellDown({ terms: { manufactureDays: '' } }).ok).toBe(false)
    expect(validateSellDown({ terms: { manufactureDays: null } }).ok).toBe(false)
  })
})

describe('validating a tier’s own changes', () => {
  test('a partial ladder is fine — an absent figure keeps coming from above', () => {
    const r = validateSellDown({ ladder: { runoutMarkup: 1 } })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ ladder: { runoutMarkup: 1 } })
  })

  test('numbers typed as text are accepted, because a text input is what sends them', () => {
    const r = validateSellDown({ ladder: { newMarkup: '2.5', newUpToDays: '45' } })
    expect(r.ok).toBe(true)
    expect(r.value.ladder).toEqual({ newMarkup: 2.5, newUpToDays: 45 })
  })

  // 🔴 THE LADDER HAS NO BLANK RUNG. A cleared box read as 0 would price a whole band of a
  // client's stock at exactly what it cost to land, and the forecast would look perfectly
  // ordinary — just several thousand short.
  test('an emptied box is an error, never a mark-up of zero', () => {
    expect(validateSellDown({ ladder: { newMarkup: '' } }).ok).toBe(false)
    expect(validateSellDown({ ladder: { newMarkup: null } }).ok).toBe(false)
    expect(validateSellDown({ ladder: { newMarkup: 'abc' } }).ok).toBe(false)
  })

  test('a mark-up of zero IS allowed — clearing stock at cost is a real decision', () => {
    expect(validateSellDown({ ladder: { runoutMarkup: 0 } }).ok).toBe(true)
  })

  test('a negative mark-up is refused — it would price stock below cost', () => {
    expect(validateSellDown({ ladder: { runoutMarkup: -0.1 } }).ok).toBe(false)
  })

  test('a boundary must be a whole number of days, and at least one', () => {
    expect(validateSellDown({ ladder: { newUpToDays: 0 } }).ok).toBe(false)
    expect(validateSellDown({ ladder: { newUpToDays: -30 } }).ok).toBe(false)
    expect(validateSellDown({ ladder: { newUpToDays: 45.5 } }).ok).toBe(false)
    expect(validateSellDown({ ladder: { newUpToDays: 45 } }).ok).toBe(true)
  })

  // 🔴 THE ORDERING CHECK. Set the new boundary past the standard one and the engine's
  // middle branch is unreachable: every band prices as new or as runout and the standard
  // price never applies once. Nothing on any screen looks wrong.
  test('a new-stock boundary past the standard one is refused', () => {
    expect(validateSellDown({ ladder: { newUpToDays: 100, standardUpToDays: 90 } }).ok).toBe(false)
    expect(validateSellDown({ ladder: { newUpToDays: 90, standardUpToDays: 90 } }).ok).toBe(true)
  })

  // One field at a time is how an inversion would otherwise get in: the sent figure is
  // checked against the INHERITED one, not only against a partner that happens to be sent.
  test('one boundary sent alone is still checked against the one it inherits', () => {
    // Shipped standard boundary is 90, so a new boundary of 120 inverts the pair.
    expect(validateSellDown({ ladder: { newUpToDays: 120 } }).ok).toBe(false)
    // And the other way round: shipped new boundary is 60, so a standard of 30 inverts it.
    expect(validateSellDown({ ladder: { standardUpToDays: 30 } }).ok).toBe(false)
  })

  test('an unknown key is an error, never a silent drop', () => {
    expect(validateSellDown({ nonsense: {} }).ok).toBe(false)
    expect(validateSellDown({ ladder: { middleMarkup: 1.4 } }).ok).toBe(false)
  })

  // The engine's runout markup is the ELSE branch — it has no boundary. A box for it would
  // be a control that silently does nothing, so the field is refused with that reason.
  test('runoutUpToDays is refused as derived, and says so', () => {
    const r = validateSellDown({ ladder: { runoutUpToDays: 200 } })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/derived/)
  })

  test('the demand shapes themselves are not editable here', () => {
    const r = validateSellDown({ patterns: [{ name: 'Mine', curve: [1, 0, 0, 0] }] })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/total 1/)
  })

  // A name matching nothing does not fail loudly downstream — the engine falls back to the
  // shipped default — so the manager would see their choice saved and quietly ignored.
  test('a default pattern must name one that exists', () => {
    expect(validateSellDown({ defaultPattern: 'Steady Eddy' }).ok).toBe(true)
    expect(validateSellDown({ defaultPattern: 'Whatever' }).ok).toBe(false)
    expect(validateSellDown({ defaultPattern: 42 }).ok).toBe(false)
  })

  test('anything that is not an object at all is refused', () => {
    expect(validateSellDown(null).ok).toBe(false)
    expect(validateSellDown([]).ok).toBe(false)
    expect(validateSellDown('1.85').ok).toBe(false)
    expect(validateSellDown({ ladder: [] }).ok).toBe(false)
    expect(validateSellDown({ ladder: 1.85 }).ok).toBe(false)
  })

  test('an empty object is valid and means “this tier changes nothing”', () => {
    const r = validateSellDown({})
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({})
  })
})

describe('resolving what a scope actually works to', () => {
  test('no scope at all gets the platform ladder', async () => {
    await expect(loadResolvedSellDown(null, loaderFor({}))).resolves.toBe(BASE_SELL_DOWN)
  })

  // Identity, not merely equality: a scope that has changed nothing gets the very object
  // from the layer above, so "unchanged" is provable by reference rather than by diff.
  test('a scope that has stored nothing gets the layer above untouched', async () => {
    const got = await loadResolvedSellDown('firm-1', loaderFor({}))
    expect(got).toBe(BASE_SELL_DOWN)
  })

  test('a scope’s own change merges over the platform’s, leaving the rest alone', async () => {
    const got = await loadResolvedSellDown('firm-1', loaderFor({
      'firm-1': { ladder: { runoutMarkup: 0.8 } }
    }))
    expect(got.ladder.runoutMarkup).toBe(0.8)
    expect(got.ladder.newMarkup).toBe(1.85)
    expect(got.ladder.standardUpToDays).toBe(90)
    // The shapes are never stored, so they always come through from the platform.
    expect(got.patterns).toBe(BASE_SELL_DOWN.patterns)
  })

  test('a scope may choose a different demand shape without touching the prices', async () => {
    const got = await loadResolvedSellDown('firm-1', loaderFor({
      'firm-1': { defaultPattern: 'Slow Burn' }
    }))
    expect(got.defaultPattern).toBe('Slow Burn')
    expect(got.ladder).toEqual(BASE_SELL_DOWN.ladder)
  })

  // A storage fault must never stop an advisor building a forecast.
  test('a store that throws degrades to the layer above rather than rejecting', async () => {
    const thrower = () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:3306'))
    await expect(loadResolvedSellDown('firm-1', thrower)).resolves.toBe(BASE_SELL_DOWN)
  })

  test('a stored value that no longer validates is ignored rather than half-applied', async () => {
    const got = await loadResolvedSellDown('firm-1', loaderFor({
      'firm-1': { ladder: { newUpToDays: 120, standardUpToDays: 90 } }
    }))
    expect(got).toBe(BASE_SELL_DOWN)
  })
})

describe('the ladder the engine actually prices with', () => {
  // The engine's own branch, restated here so a change to either side has to be deliberate:
  // `days <= newUpToDays ? new : (days <= standardUpToDays ? standard : runout)`.
  function markupFor (ladder, days) {
    if (days <= ladder.newUpToDays) { return ladder.newMarkup }
    return days <= ladder.standardUpToDays ? ladder.standardMarkup : ladder.runoutMarkup
  }

  test('the shipped ladder puts all three rungs to work across the four bands', () => {
    const l = BASE_SELL_DOWN.ladder
    expect([30, 60, 90, 120].map(d => markupFor(l, d))).toEqual([1.85, 1.85, 1.52, 1.22])
  })

  // Accepted by the validator and legitimate — but it means two thirds of the ladder is
  // never used, which is why the screen says so in words rather than leaving it to be
  // discovered in a client's revenue.
  test('a boundary past the last band leaves every rung below it unused', () => {
    const l = Object.assign({}, BASE_SELL_DOWN.ladder, { newUpToDays: 150, standardUpToDays: 180 })
    expect(validateSellDown({ ladder: { newUpToDays: 150, standardUpToDays: 180 } }).ok).toBe(true)
    expect([30, 60, 90, 120].map(d => markupFor(l, d))).toEqual([1.85, 1.85, 1.85, 1.85])
  })

  // 🔴 THE REASON runoutUpToDays IS NOT EDITABLE: the engine never reads it. If this test
  // ever fails, the field has become live and the screen owes it a box.
  test('runoutUpToDays changes nothing, whatever it is set to', () => {
    const wide = Object.assign({}, BASE_SELL_DOWN.ladder, { runoutUpToDays: 999 })
    const narrow = Object.assign({}, BASE_SELL_DOWN.ladder, { runoutUpToDays: 1 })
    expect([30, 60, 90, 120].map(d => markupFor(wide, d)))
      .toEqual([30, 60, 90, 120].map(d => markupFor(narrow, d)))
  })
})
