'use strict'

/**
 * wagesRegisterMaths — the staff register's arithmetic (item 4.104).
 *
 * 🔴 THIS IS THE GOLDEN TEST, AND IT PINS A DELIBERATE DISAGREEMENT WITH THE SOURCE
 * WORKBOOK. Every other model in the library is tested by reproducing its workbook exactly.
 * This one must not, and the reason is recorded here beside the numbers so that a later
 * session comparing the two does not "fix" the port back to the fault.
 *
 * The source is `design/report-source-models/Wages Model.xlsx`, sheet 6, *DD Considerations*,
 * read from its stored XML on 2026-09-15. Its `H` column, "Annual Leave Liability", is what
 * its 63,154.16 headline is summed from — and 24 of its 29 rows are priced from *Sick Leave
 * Consumed* rather than *Accrued Annual Leave (outstanding)*. Money already spent, standing
 * in for money still owed.
 *
 * Mike ruled on 2026-09-15: price from accrued leave only, and report "not yet priced" where
 * there is none. So the honest figure on this sample is **10,115.84 across five people**, and
 * the tests below prove BOTH halves — what we compute, and what the workbook computed instead.
 */

const maths = require('../../server/utils/wagesRegisterMaths')

/**
 * The workbook's own 29 rated people, sheet 6 rows 8–39.
 *
 * `payRate` is column `E`, `sickLeaveDays` column `F`, `accruedLeaveDays` column `G`,
 * `yearsEmployed` column `I`, `band` column `M` mapped through the Decision 7 names. Rows 12,
 * 17 and 35 are division-block headers carrying no rating and are absent, which is why 32
 * rows of sheet yield 29 people — the same 29 the sheet's own `countif`s report (`L50:L52`
 * = 10 · 10 · 9).
 *
 * ⚠ `sickLeaveDays` IS HERE ONLY TO PROVE THE FAULT. Mike ruled it off the product entirely
 * on 2026-09-15 — *"take it off"* — so nothing outside this file carries it.
 */
const WORKBOOK_SAMPLE = [
  { row: 8, payRate: 19.95, sickLeaveDays: 12, accruedLeaveDays: null, yearsEmployed: 3, band: 'direct-loss' },
  { row: 9, payRate: 19, sickLeaveDays: 14, accruedLeaveDays: 13, yearsEmployed: 4, band: 'indirect-loss' },
  { row: 10, payRate: 19, sickLeaveDays: 14, accruedLeaveDays: 15, yearsEmployed: 5, band: 'no-material-loss' },
  { row: 11, payRate: 19, sickLeaveDays: 8, accruedLeaveDays: null, yearsEmployed: 6, band: 'no-material-loss' },
  { row: 13, payRate: 23.69, sickLeaveDays: 9, accruedLeaveDays: null, yearsEmployed: 4, band: 'direct-loss' },
  { row: 14, payRate: 23, sickLeaveDays: 10, accruedLeaveDays: null, yearsEmployed: 5, band: 'no-material-loss' },
  { row: 15, payRate: 23, sickLeaveDays: 14, accruedLeaveDays: null, yearsEmployed: 8, band: 'no-material-loss' },
  { row: 16, payRate: 23, sickLeaveDays: 16, accruedLeaveDays: null, yearsEmployed: 4, band: 'indirect-loss' },
  { row: 18, payRate: 35, sickLeaveDays: 22, accruedLeaveDays: null, yearsEmployed: 2, band: 'direct-loss' },
  { row: 19, payRate: 33.6, sickLeaveDays: 25, accruedLeaveDays: null, yearsEmployed: 3, band: 'direct-loss' },
  { row: 20, payRate: 35, sickLeaveDays: 15, accruedLeaveDays: null, yearsEmployed: 4, band: 'direct-loss' },
  { row: 21, payRate: 40.28, sickLeaveDays: 14, accruedLeaveDays: 16, yearsEmployed: 5, band: 'direct-loss' },
  { row: 22, payRate: 37, sickLeaveDays: 12, accruedLeaveDays: null, yearsEmployed: 6, band: 'indirect-loss' },
  { row: 23, payRate: 27.82, sickLeaveDays: 13, accruedLeaveDays: null, yearsEmployed: 7, band: 'indirect-loss' },
  { row: 24, payRate: 26, sickLeaveDays: 14, accruedLeaveDays: null, yearsEmployed: 8, band: 'indirect-loss' },
  { row: 25, payRate: 22, sickLeaveDays: 15, accruedLeaveDays: null, yearsEmployed: 9, band: 'indirect-loss' },
  { row: 26, payRate: 21, sickLeaveDays: 7, accruedLeaveDays: null, yearsEmployed: 10, band: 'indirect-loss' },
  { row: 27, payRate: 20, sickLeaveDays: 4, accruedLeaveDays: null, yearsEmployed: 1, band: 'indirect-loss' },
  { row: 28, payRate: 26, sickLeaveDays: 8, accruedLeaveDays: null, yearsEmployed: 2, band: 'no-material-loss' },
  { row: 29, payRate: 26, sickLeaveDays: 9, accruedLeaveDays: null, yearsEmployed: 3, band: 'no-material-loss' },
  { row: 30, payRate: 26.78, sickLeaveDays: 6, accruedLeaveDays: null, yearsEmployed: 4, band: 'no-material-loss' },
  { row: 31, payRate: 26, sickLeaveDays: 5, accruedLeaveDays: null, yearsEmployed: 5, band: 'no-material-loss' },
  { row: 32, payRate: 22, sickLeaveDays: 14, accruedLeaveDays: 4, yearsEmployed: 3, band: 'direct-loss' },
  { row: 33, payRate: 21, sickLeaveDays: 1, accruedLeaveDays: null, yearsEmployed: 4, band: 'direct-loss' },
  { row: 34, payRate: 0, sickLeaveDays: 3, accruedLeaveDays: null, yearsEmployed: 5, band: 'direct-loss' },
  { row: 36, payRate: 76.96, sickLeaveDays: 4, accruedLeaveDays: null, yearsEmployed: 4, band: 'direct-loss' },
  { row: 37, payRate: 36.4, sickLeaveDays: 5, accruedLeaveDays: null, yearsEmployed: 4, band: 'indirect-loss' },
  { row: 38, payRate: 0, sickLeaveDays: 14, accruedLeaveDays: 6, yearsEmployed: 5, band: 'indirect-loss' },
  { row: 39, payRate: 0, sickLeaveDays: 7, accruedLeaveDays: null, yearsEmployed: 10, band: 'no-material-loss' }
]

/** The workbook's own multiplier — `E4`, typed. Its formula reaches for a blank `D5` instead. */
const WORKBOOK_HOURS = 8

describe('priceRow — one person, and when they cannot be priced', () => {
  const person = { payRate: 19, accruedLeaveDays: 13 }

  it('prices pay rate x hours x days', () => {
    expect(maths.priceRow(person, 8)).toBe(1976)
  })

  it.each([[null], [undefined], ['']])('returns null while hours in a leave day is %p', (hours) => {
    // Question 1, ruled 2026-09-15: the field starts EMPTY and nothing is priced until it is
    // set. A silent fallback to the workbook's 8 is the fault this ruling exists to prevent.
    expect(maths.priceRow(person, hours)).toBeNull()
  })

  it.each([[0], [-1]])('returns null for a non-positive %p hours', (hours) => {
    expect(maths.priceRow(person, hours)).toBeNull()
  })

  it.each([[null], [undefined], [''], ['not a number']])('returns null when accrued leave is %p', (days) => {
    expect(maths.priceRow({ payRate: 19, accruedLeaveDays: days }, 8)).toBeNull()
  })

  it('returns null for negative accrued leave, which is not a balance', () => {
    expect(maths.priceRow({ payRate: 19, accruedLeaveDays: -1 }, 8)).toBeNull()
  })

  it.each([[null], [''], ['nonsense']])('returns null when the pay rate is %p', (rate) => {
    expect(maths.priceRow({ payRate: rate, accruedLeaveDays: 13 }, 8)).toBeNull()
  })

  it('returns null for a negative pay rate', () => {
    expect(maths.priceRow({ payRate: -5, accruedLeaveDays: 13 }, 8)).toBeNull()
  })

  it('prices a ZERO pay rate to zero rather than refusing it', () => {
    // A known zero is not the same as an unanswered field, and the workbook's own sample has
    // three zero-rate rows — row 38 carrying six days of accrued leave against one of them.
    expect(maths.priceRow({ payRate: 0, accruedLeaveDays: 6 }, 8)).toBe(0)
  })

  it('prices zero days to zero — the balance is known and it is nil', () => {
    expect(maths.priceRow({ payRate: 19, accruedLeaveDays: 0 }, 8)).toBe(0)
  })

  it('reads numbers that arrive as strings from a JSON body', () => {
    expect(maths.priceRow({ payRate: '19', accruedLeaveDays: '13' }, '8')).toBe(1976)
  })

  it('survives a missing person rather than throwing at the caller', () => {
    expect(maths.priceRow(null, 8)).toBeNull()
    expect(maths.priceRow(undefined, 8)).toBeNull()
  })
})

describe('toCents', () => {
  it('kills the floating-point tail', () => {
    // 40.28 * 8 * 16 is 5155.839999999999 in IEEE-754.
    expect(maths.toCents(40.28 * 8 * 16)).toBe(5155.84)
  })
})

describe('priceAll', () => {
  it('adds a rounded liability to each person without disturbing the rest of the row', () => {
    const out = maths.priceAll([{ name: 'Bruce', payRate: 40.28, accruedLeaveDays: 16 }], 8)
    expect(out[0].name).toBe('Bruce')
    expect(out[0].liability).toBe(5155.84)
  })

  it('carries null through for an unpriced person', () => {
    expect(maths.priceAll([{ payRate: 19, accruedLeaveDays: null }], 8)[0].liability).toBeNull()
  })

  it('returns an empty list for anything that is not a list', () => {
    expect(maths.priceAll(null, 8)).toEqual([])
  })
})

describe('summarise — the bands, and the gap shown beside them', () => {
  it('counts everyone in a band but prices only those who can be priced', () => {
    const out = maths.summarise([
      { band: 'direct-loss', payRate: 10, accruedLeaveDays: 2, yearsEmployed: 4 },
      { band: 'direct-loss', payRate: 10, accruedLeaveDays: null, yearsEmployed: 6 }
    ], 8)
    const direct = out.bands.find(b => b.band === 'direct-loss')
    expect(direct.people).toBe(2)
    expect(direct.priced).toBe(1)
    expect(direct.liability).toBe(160)
    expect(direct.avgYears).toBe(5)
  })

  it('always reports all three bands, even when empty', () => {
    const out = maths.summarise([], 8)
    expect(out.bands.map(b => b.band)).toEqual(['direct-loss', 'indirect-loss', 'no-material-loss'])
    expect(out.total.people).toBe(0)
    expect(out.total.priced).toBe(0)
    expect(out.total.liability).toBe(0)
  })

  it('gives an empty band a null average rather than a zero', () => {
    expect(maths.summarise([], 8).bands[0].avgYears).toBeNull()
  })

  it('averages over the people who HAVE a length of service, not the whole band', () => {
    // The workbook divides by the band count, which quietly understates the moment one
    // person has no figure. Same answer whenever everybody does.
    const out = maths.summarise([
      { band: 'direct-loss', yearsEmployed: 4 },
      { band: 'direct-loss', yearsEmployed: null }
    ], 8)
    expect(out.bands[0].avgYears).toBe(4)
  })

  it('🔴 counts an UNRATED person in the total — the total is the register, not the bands', () => {
    // This test asserted the opposite until 2026-09-15, and it was wrong. Opening the screen
    // showed "1 person" above twenty-nine people, because on a register nobody has rated yet
    // every row is outside all three bands. A headcount that only counts the people somebody
    // has got round to rating is not a headcount.
    const out = maths.summarise([
      { band: 'Vital', payRate: 10, accruedLeaveDays: 2 },
      { band: null, payRate: 10, accruedLeaveDays: 2 }
    ], 8)
    expect(out.total.people).toBe(2)
    expect(out.total.priced).toBe(2)
    expect(out.total.liability).toBe(320)
    // 'Vital' is the workbook's word, not a band; both these people are unrated.
    expect(out.bands.every(b => b.people === 0)).toBe(true)
    expect(out.unrated.people).toBe(2)
  })

  it('reports the unrated separately so the bands and the total reconcile on screen', () => {
    const out = maths.summarise([
      { band: 'direct-loss', payRate: 10, accruedLeaveDays: 2, yearsEmployed: 4 },
      { band: null, payRate: 10, accruedLeaveDays: 1 }
    ], 8)
    const banded = out.bands.reduce((n, b) => n + b.people, 0)
    expect(banded + out.unrated.people).toBe(out.total.people)
    expect(maths.toCents(out.bands.reduce((n, b) => n + b.liability, 0) + out.unrated.liability))
      .toBe(out.total.liability)
  })

  it('survives anything that is not a list', () => {
    expect(maths.summarise(null, 8).total.people).toBe(0)
  })

  it('prices nothing at all until hours in a leave day is set', () => {
    const out = maths.summarise(WORKBOOK_SAMPLE, null)
    expect(out.total.priced).toBe(0)
    expect(out.total.liability).toBe(0)
    expect(out.total.people).toBe(29)
  })
})

describe('THE GOLDEN TEST — the workbook sample, and the figure we refuse to reproduce', () => {
  const out = maths.summarise(WORKBOOK_SAMPLE, WORKBOOK_HOURS)
  const band = name => out.bands.find(b => b.band === name)

  it('reads the same 29 people the sheet counts, in the same three bands', () => {
    // The sheet's own countifs: L50 = 10, L51 = 10, L52 = 9.
    expect(band('direct-loss').people).toBe(10)
    expect(band('indirect-loss').people).toBe(10)
    expect(band('no-material-loss').people).toBe(9)
    expect(out.total.people).toBe(29)
  })

  it('reproduces the sheet\'s average years of service exactly', () => {
    // L58:L60 = M58/L50 etc: 37/10, 58/10, 48/9. These we DO reproduce — they read column I,
    // which carries no fault.
    expect(band('direct-loss').avgYears).toBe(3.7)
    expect(band('indirect-loss').avgYears).toBe(5.8)
    expect(band('no-material-loss').avgYears).toBe(5.3)
  })

  it('prices only the FIVE people who have an accrued-leave balance', () => {
    // Rows 9, 10, 21, 32 and 38 are the only ones carrying column G at all.
    expect(out.total.priced).toBe(5)
    expect(band('direct-loss').priced).toBe(2)
    expect(band('indirect-loss').priced).toBe(2)
    expect(band('no-material-loss').priced).toBe(1)
  })

  it('totals 10,115.84, band by band', () => {
    // Direct loss: row 21 40.28x8x16 = 5,155.84 + row 32 22x8x4 = 704.00
    expect(band('direct-loss').liability).toBe(5859.84)
    // Indirect loss: row 9 19x8x13 = 1,976.00 + row 38 0x8x6 = 0.00 (a known zero pay rate)
    expect(band('indirect-loss').liability).toBe(1976)
    // No material loss: row 10 19x8x15 = 2,280.00
    expect(band('no-material-loss').liability).toBe(2280)
    expect(out.total.liability).toBe(10115.84)
  })

  it('🔴 does NOT reproduce the workbook\'s 63,154.16, and that is the point', () => {
    // L54:L56 = 29,191.44 + 20,189.28 + 13,773.44. Every other model in this library is
    // tested by matching its workbook. If a later session "fixes" this to match, it will have
    // restored a leave liability built from sick leave already taken.
    expect(out.total.liability).not.toBeCloseTo(63154.16, 2)
    expect(out.total.liability).toBeLessThan(63154.16)
  })

  it('🔴 proves fault 3: the workbook priced 24 people from SICK LEAVE', () => {
    // Every unpriced row reconstructs exactly from column F at the same 8 hours, which is how
    // the fault was identified rather than guessed at. Mary G is the clearest: no accrued
    // figure at all, and the sheet's H8 shows 1,915.20 = 19.95 x 8 x 12 sick days.
    const unpriced = WORKBOOK_SAMPLE.filter(p => p.accruedLeaveDays === null)
    expect(unpriced).toHaveLength(24)

    const workbookH = { 8: 1915.2, 11: 1216, 13: 1705.68, 18: 6160, 36: 2462.72 }
    Object.keys(workbookH).forEach((row) => {
      const p = WORKBOOK_SAMPLE.find(x => x.row === Number(row))
      expect(maths.toCents(p.payRate * WORKBOOK_HOURS * p.sickLeaveDays)).toBe(workbookH[row])
      // And each of them is null for us, because none has an accrued balance.
      expect(maths.priceRow(p, WORKBOOK_HOURS)).toBeNull()
    })
  })

  it('🔴 proves fault 1: the surviving formula reaches a blank cell', () => {
    // H8 is (E8*$D$5)*G8. D5 is empty, so the formula evaluates to 0 - while the sheet
    // displays 1,915.20, a cached value from before the reference broke. Both of the numbers
    // the sheet can show for Mary G are wrong, by different routes.
    const maryG = WORKBOOK_SAMPLE.find(p => p.row === 8)
    const blankD5 = 0
    expect(maryG.payRate * blankD5 * (maryG.accruedLeaveDays || 0)).toBe(0)
    expect(maths.priceRow(maryG, WORKBOOK_HOURS)).toBeNull()
  })
})

describe('the band names are Decision 7\'s, not the workbook\'s', () => {
  it('maps the sheet\'s own words in one direction only, for reading its sample', () => {
    // Pinned because these three strings are load-bearing: "Dispensable" is the word Mike's
    // ruling of 2026-09-14 exists to keep off a document a tribunal may read.
    expect(maths.WORKBOOK_BANDS.Vital).toBe('direct-loss')
    expect(maths.WORKBOOK_BANDS.Beneficial).toBe('indirect-loss')
    expect(maths.WORKBOOK_BANDS.Dispensable).toBe('no-material-loss')
    expect(maths.BANDS).not.toContain('dispensable')
  })
})
