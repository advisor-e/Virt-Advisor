'use strict'

/**
 * The Scenario Lab's overwrite guard and argument parsing (item 9.2).
 *
 * WHAT UAT CANNOT SEE, which is why this earns its place (Mike's rule, 2026-08-24): the lab
 * is the bench every engine decision is measured against, and the damage here is a WRONG
 * NUMBER in a file, discovered weeks later. Nobody testing the app can see it.
 *
 * The fault this pins fired THREE times before it was fixed. The lab wrote its report
 * unconditionally, so a run with the AI layers off reported score separation 2.3 against the
 * real 5.7 and silently became the record. Worse, any unrecognised argument fell through to
 * the case filter — so `--help` was read as a domain name, matched nothing, ran 0 cases, and
 * still overwrote 1,145 lines of measured results with 21 lines of zeros (2026-09-16).
 *
 * Reproduced on 2026-09-17 before the fix: `node scripts/scenario-lab.js --help` destroyed the
 * report. These tests are what stops it coming back.
 */

const fs = require('fs')
const { chooseReportPath, parseArgs } = require('../../scripts/scenario-lab')

const MAIN = '/repo/design/SCENARIO-LAB-REPORT.md'
const PARTIAL = '/repo/design/SCENARIO-LAB-REPORT-partial.md'

/** The header the lab itself writes, so the guard is tested against the real shape. */
function header (cases, ai) {
  return [
    '# Scenario Lab — Cross-Domain Case-Study Report',
    '',
    '> **Auto-generated** by `scripts/scenario-lab.js`. Re-run to refresh; do not hand-edit.',
    `> Coverage: **${cases} sessions across all 14 content domains**. AI layer (firm distinctions + distress): **${ai ? 'ON' : 'OFF'}**.`,
    ''
  ].join('\n')
}

describe('the lab never replaces a fuller report with a thinner one', () => {
  afterEach(() => { jest.restoreAllMocks() })

  /** @param {string|null} existing - the committed report, or null if there is none */
  function withExisting (existing) {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      if (existing === null) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e }
      return existing
    })
  }

  test('AI OFF does not overwrite a report measured with AI ON', () => {
    withExisting(header(51, true))
    const out = chooseReportPath(MAIN, { cases: 51, ai: false, filtered: false })
    expect(out.path).toBe(PARTIAL)
    expect(out.withheld).toMatch(/AI layers did not run/)
  })

  test('fewer cases does not overwrite a report with more', () => {
    withExisting(header(51, true))
    const out = chooseReportPath(MAIN, { cases: 12, ai: true, filtered: false })
    expect(out.path).toBe(PARTIAL)
    expect(out.withheld).toMatch(/12 cases.*51/)
  })

  test('a filtered run never becomes the full-set report, however complete it looks', () => {
    withExisting(header(51, true))
    const out = chooseReportPath(MAIN, { cases: 51, ai: true, filtered: true })
    expect(out.path).toBe(PARTIAL)
    expect(out.withheld).toMatch(/filtered/)
  })

  test('an equal run overwrites — a re-run must be able to refresh the report', () => {
    withExisting(header(51, true))
    const out = chooseReportPath(MAIN, { cases: 51, ai: true, filtered: false })
    expect(out.path).toBe(MAIN)
    expect(out.withheld).toBeNull()
  })

  test('a fuller run overwrites: more cases, and AI on where it was off', () => {
    withExisting(header(51, false))
    expect(chooseReportPath(MAIN, { cases: 60, ai: true, filtered: false }).path).toBe(MAIN)
    // AI on replacing AI off is an improvement, not a downgrade.
    expect(chooseReportPath(MAIN, { cases: 51, ai: true, filtered: false }).path).toBe(MAIN)
  })

  test('no existing report is not a reason to refuse — a first run must write one', () => {
    withExisting(null)
    const out = chooseReportPath(MAIN, { cases: 51, ai: false, filtered: false })
    expect(out.path).toBe(MAIN)
    expect(out.withheld).toBeNull()
  })

  test('an unreadable header does not block the write', () => {
    withExisting('something that is not a lab report at all')
    expect(chooseReportPath(MAIN, { cases: 51, ai: false, filtered: false }).path).toBe(MAIN)
  })
})

describe('an unknown argument stops the run instead of becoming a case filter', () => {
  test('--help is a request for help, never a domain name', () => {
    expect(parseArgs(['--help'])).toEqual({ filter: null, adjustmentsFile: null, help: true })
    expect(parseArgs(['-h']).help).toBe(true)
  })

  test('an unknown flag throws a usage error rather than filtering to nothing', () => {
    // 🔴 The exact shape of the 2026-09-16 fault: before the fix this returned
    // { filter: '--ai' }, matched no case, ran 0 of them, and overwrote the report.
    expect(() => parseArgs(['--ai'])).toThrow(/unknown option: --ai/)
    expect(() => parseArgs(['--adjustment', 'x.json'])).toThrow(/unknown option/)
    try { parseArgs(['--nope']) } catch (e) { expect(e.usage).toBe(true) }
  })

  test('a real filter and --adjustments still parse', () => {
    expect(parseArgs(['profit'])).toEqual({ filter: 'profit', adjustmentsFile: null, help: false })
    expect(parseArgs(['--adjustments', 'a.json'])).toEqual({ filter: null, adjustmentsFile: 'a.json', help: false })
    expect(parseArgs(['profit', '--adjustments', 'a.json']).filter).toBe('profit')
  })
})
