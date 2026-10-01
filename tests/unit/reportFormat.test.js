'use strict'

/**
 * The report pages' unit-free formatters (item 13.8). What a person in UAT cannot see is
 * the digits being written in the wrong language for a reader of another one — "1.6×" to a
 * German reader, who reads the point as a thousands separator — so these pin the two
 * languages side by side, and pin that English is exactly what it was before.
 */

const fs = require('fs')
const path = require('path')
const f = require('../../utils/reportFormat')

// German puts a no-break space before "%"; normalise it.
const norm = s => s.replace(/\s/g, ' ')

describe('English is unchanged', () => {
  test('every formatter writes what toFixed wrote before', () => {
    expect(f.pct(0.139)).toBe('13.9%')
    expect(f.pct(0.139, 0, 'en')).toBe('14%')
    expect(f.pct(-0.052, 1, 'en')).toBe('-5.2%')
    expect(f.pct100(13.9, undefined, 'en')).toBe('13.9%')
    expect(f.pts(0.7, 'en')).toBe('+0.7 pts')
    expect(f.pts(-1.25, 'en')).toBe('-1.3 pts')
    expect(f.signedPct(0.124, 'en')).toBe('+12.4%')
    expect(f.signedPct(-0.124, 'en')).toBe('-12.4%')
    expect(f.signedPct100(2.2, 'en')).toBe('+2.2%')
    expect(f.days(46.6, 'en')).toBe('47')
    expect(f.times(5.23, 'en')).toBe('5.2×')
    expect(f.ratio2(0.38, 'en')).toBe('0.38')
  })
})

describe('🔴 German gets a decimal comma', () => {
  test('percentages, points, multiples and ratios', () => {
    expect(norm(f.pct(0.139, 1, 'de'))).toBe('13,9 %')
    expect(norm(f.pct100(13.9, 1, 'de'))).toBe('13,9 %')
    expect(f.pts(0.7, 'de')).toBe('+0,7 pts')
    expect(norm(f.signedPct(0.124, 'de'))).toBe('+12,4 %')
    expect(norm(f.signedPct100(-2.2, 'de'))).toBe('-2,2 %')
    expect(f.times(1.6, 'de')).toBe('1,6×')
    expect(f.ratio2(1.09, 'de')).toBe('1,09')
    expect(f.days(1234, 'de')).toBe('1.234')
  })

  test('the points unit is the one it is given, so a translation reaches it', () => {
    expect(f.pts(0.7, 'de', 'Pkt.')).toBe('+0,7 Pkt.')
  })

  test('an unknown language falls back to English rather than failing', () => {
    expect(f.times(1.6, 'not-a-locale!')).toBe('1.6×')
  })
})

describe('no figure is shown as a dash, never as zero', () => {
  test.each(['pct', 'pct100', 'pts', 'signedPct', 'signedPct100', 'days', 'times', 'ratio2'])('%s', (name) => {
    expect(f[name](null)).toBe(f.DASH)
    expect(f[name](NaN)).toBe(f.DASH)
  })
})

describe('direction', () => {
  test('up, down, or nothing', () => {
    expect(f.direction(2)).toBe('up')
    expect(f.direction(-2)).toBe('down')
    expect(f.direction(0)).toBeNull()
    expect(f.direction(null)).toBeNull()
  })
})

describe('🔴 GUARD: a screen reaches these through the mixin, which passes the reader\'s language', () => {
  // Required directly, a formatter is called without a locale and writes English digits in
  // every language — the fault item 13.8 fixed on all 13 Business Performance Report screens.
  test('no component requires utils/reportFormat', () => {
    const dir = path.join(__dirname, '../../components')
    const offenders = []
    const walk = (d) => {
      fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const p = path.join(d, e.name)
        if (e.isDirectory()) { walk(p); return }
        if (e.name.endsWith('.vue') && /require\(['"]~\/utils\/reportFormat['"]\)/.test(fs.readFileSync(p, 'utf8'))) {
          offenders.push(path.relative(dir, p))
        }
      })
    }
    walk(dir)
    expect(offenders).toEqual([])
  })
})
