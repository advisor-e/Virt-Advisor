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

  test('slice 2\'s options write what each screen wrote before', () => {
    // pctUpTo: the bands that read "80%", never "80.0%" (Stock Purchasing, Mid-Level Budget)
    expect(f.pctUpTo(0.8, undefined, 'en')).toBe('80%')
    expect(f.pctUpTo(0.401, undefined, 'en')).toBe('40.1%')
    expect(f.pctUpTo(0.08625, 2, 'en')).toBe('8.63%')
    expect(f.times(12, 'en', 0)).toBe('12×')
    expect(f.signedPct100(20, 'en', 0)).toBe('+20%')
    expect(f.signedPct100(-40, 'en', 0)).toBe('-40%')
    expect(f.signedPct100(0, 'en', 0)).toBe('0%')
    // numUpTo: scores and counts that are usually whole (slice 3)
    expect(f.numUpTo(7, undefined, 'en')).toBe('7')
    expect(f.numUpTo(7.5, undefined, 'en')).toBe('7.5')
    expect(f.numUpTo(2814, 0, 'en')).toBe('2,814')
    expect(f.numUpTo(185.5, 2, 'en')).toBe('185.5')
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
    expect(norm(f.pctUpTo(0.401, undefined, 'de'))).toBe('40,1 %')
    expect(norm(f.pctUpTo(0.8, undefined, 'de'))).toBe('80 %')
    expect(f.times(12.4, 'de', 0)).toBe('12×')
    expect(norm(f.signedPct100(20, 'de', 0))).toBe('+20 %')
    expect(f.numUpTo(7.5, undefined, 'de')).toBe('7,5')
    expect(f.numUpTo(2814, 0, 'de')).toBe('2.814')
  })

  test('the points unit is the one it is given, so a translation reaches it', () => {
    expect(f.pts(0.7, 'de', 'Pkt.')).toBe('+0,7 Pkt.')
  })

  test('an unknown language falls back to English rather than failing', () => {
    expect(f.times(1.6, 'not-a-locale!')).toBe('1.6×')
  })
})

describe('no figure is shown as a dash, never as zero', () => {
  test.each(['pct', 'pctUpTo', 'pct100', 'pts', 'signedPct', 'signedPct100', 'days', 'times', 'ratio2', 'numUpTo'])('%s', (name) => {
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

  test('no component that mixes it in keeps a method of the same name', () => {
    // In Vue 2 a component's own method silently beats the mixin's, so a screen with its
    // own `pct` goes on writing English with the mixin present and nothing looking wrong —
    // the trap slice 2 removed from five report screens (item 13.8).
    const NAMES = Object.keys(require('../../mixins/reportFormatMixin').default.methods)
    const own = new RegExp('^\\s{2,6}(' + NAMES.join('|') + ')\\s*\\(', 'm')
    const dir = path.join(__dirname, '../../components')
    const offenders = []
    const walk = (d) => {
      fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const p = path.join(d, e.name)
        if (e.isDirectory()) { walk(p); return }
        if (!e.name.endsWith('.vue')) { return }
        const src = fs.readFileSync(p, 'utf8')
        if (src.includes('import reportFormatMixin from') && own.test(src)) {
          offenders.push(path.relative(dir, p) + ': ' + src.match(own)[1])
        }
      })
    }
    walk(dir)
    expect(offenders).toEqual([])
  })
})
