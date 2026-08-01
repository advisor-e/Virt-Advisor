'use strict'

/**
 * FRESHNESS GUARD — design/CONTENT-ROUTING.md must match the content it describes.
 *
 * Why this file exists. A generated report with no freshness check rots, and is
 * then believed. On 2026-08-01 design/STATUS.md was found stale by roughly 260
 * lines: the generator was correct, nobody had re-run it, and nothing failed. A
 * routing map that says an asset reaches client recommendations when it no longer
 * does is worse than no map, because the whole point of it is to be trusted.
 *
 * So this test regenerates the report in memory and compares. If content data
 * changes, `npm run routing` must be run before committing. That friction is
 * deliberate and it is the cheapest part of this whole guard.
 */

const fs = require('fs')
const path = require('path')

const { render, findUncoveredFiles, COVERED_FILES } = require('../../scripts/generate-content-routing')
const { classifyAllContent, summariseRouting } = require('../../server/utils/contentRouting')

const REPORT_PATH = path.join(__dirname, '..', '..', 'design', 'CONTENT-ROUTING.md')

// Git may check the file out with CRLF on Windows while the generator writes LF.
// Comparing raw bytes would fail for a reason that has nothing to do with content.
const normalise = s => String(s).replace(/\r\n/g, '\n').trimEnd()

describe('design/CONTENT-ROUTING.md is generated, and current', () => {
  it('exists', () => {
    expect(fs.existsSync(REPORT_PATH)).toBe(true)
  })

  it('matches what the generator produces right now — run `npm run routing` if this fails', () => {
    const committed = normalise(fs.readFileSync(REPORT_PATH, 'utf8'))
    const fresh = normalise(render())

    if (committed !== fresh) {
      // Point at the first difference rather than dumping 600 lines of diff.
      const a = committed.split('\n')
      const b = fresh.split('\n')
      // findIndex returns -1 when every line of the SHORTER file matches — i.e. one
      // file is a truncation of the other. Reporting that as "line 0" would name the
      // wrong place and print "(end of file)" for both sides, which reads like a bug
      // in the test rather than a stale report. Caught while proving this guard can
      // actually fail; a message that misleads is worth as little as no message.
      const firstDiff = a.findIndex((line, n) => line !== b[n])
      const detail = firstDiff === -1
        ? `The files agree for their first ${Math.min(a.length, b.length)} lines but differ in length ` +
          `— committed ${a.length}, current ${b.length}.`
        : `First difference at line ${firstDiff + 1}:\n` +
          `  committed: ${a[firstDiff] === undefined ? '(no such line)' : a[firstDiff]}\n` +
          `  current:   ${b[firstDiff] === undefined ? '(no such line)' : b[firstDiff]}`

      throw new Error(
        'design/CONTENT-ROUTING.md is out of date. Run `npm run routing` and commit the result.\n' + detail
      )
    }
    expect(committed).toBe(fresh)
  })

  it('is not vacuously short — a truncated report would otherwise "match" itself', () => {
    const committed = fs.readFileSync(REPORT_PATH, 'utf8')
    expect(committed.split('\n').length).toBeGreaterThanOrEqual(300)
    expect(committed).toContain('What this map does not cover')
  })
})

describe('the report states its own edges', () => {
  it('names every unclassified asset instead of dropping it', () => {
    // 0 today. The assertion is not "there are none" — it is that any that appear
    // are visible in the report rather than missing from the count.
    const { unknown } = summariseRouting()
    const committed = fs.readFileSync(REPORT_PATH, 'utf8')

    if (unknown.length > 0) {
      expect(committed).toContain('UNCLASSIFIED')
      for (const row of unknown) { expect(committed).toContain(row.name) }
    }
    expect(committed).toContain(`**${unknown.length} unknown**`)
  })

  it('derives its blind-spot list from disk, so a new data file cannot go unmentioned', () => {
    const { uncovered } = findUncoveredFiles()
    const committed = fs.readFileSync(REPORT_PATH, 'utf8')

    // Non-vacuous: the classifier covers 5 families, so there MUST be uncovered
    // files. A version of this that quietly returned [] would otherwise pass.
    expect(uncovered.length).toBeGreaterThan(0)
    for (const file of uncovered) {
      expect(committed).toContain(`data/${file}`)
    }
  })

  it('never lists a file as both covered and a blind spot', () => {
    const { uncovered } = findUncoveredFiles()
    expect(uncovered.filter(f => COVERED_FILES.includes(f))).toEqual([])
  })

  it('covers every asset the classifier produces — the report cannot show a subset', () => {
    const rows = classifyAllContent()
    const committed = fs.readFileSync(REPORT_PATH, 'utf8')

    expect(rows.length).toBeGreaterThanOrEqual(450)
    expect(committed).toContain(`**${rows.length} content assets classified**`)

    // Every family the classifier emits must have a section in the report. A family
    // added to the module but forgotten in FAMILIES would silently vanish from the
    // table while the totals still looked plausible.
    const familyCounts = summariseRouting(rows).byFamily
    for (const family of Object.keys(familyCounts)) {
      const total = Object.values(familyCounts[family]).reduce((a, b) => a + b, 0)
      expect(committed).toContain(`<strong>${total} assets</strong>`)
    }
  })
})
