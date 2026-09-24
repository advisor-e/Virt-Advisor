'use strict'

/**
 * count-code — the line classifier behind design/CODE-SIZE.md.
 *
 * The page is a number Mike reads as a founder. A classifier that counted a JSDoc block as
 * code, or a code line with a trailing comment as a comment, would print a plausible wrong
 * figure that nobody could tell from a right one — which is exactly what a test is for.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { countCode, measure, renderMarkdown, localDate, writeRecord } = require('../../scripts/count-code')

describe('countCode', () => {
  test('blank lines and line comments are not code', () => {
    const r = countCode('\n  \n// a comment\nconst a = 1')
    expect(r).toEqual({ code: 1, comment: 1, blank: 2 })
  })

  test('a JSDoc block is comment from /** to */, every line', () => {
    const r = countCode('/**\n * @param {string} x\n * says why\n */\nfunction f (x) { return x }')
    expect(r).toEqual({ code: 1, comment: 4, blank: 0 })
  })

  test('a one-line block comment closes on its own line', () => {
    const r = countCode('/* one line */\nconst a = 1\n/* opens\nstill\n*/\nconst b = 2')
    expect(r).toEqual({ code: 2, comment: 4, blank: 0 })
  })

  test('code with a trailing comment is code; Pug and HTML comments are comments', () => {
    const r = countCode("const a = 1 // why\n//- a pug comment\n<!-- html -->\ndiv.hub(v-if='x')")
    expect(r).toEqual({ code: 2, comment: 2, blank: 0 })
  })

  test('CRLF files count the same as LF files', () => {
    expect(countCode('a\r\n// c\r\n\r\nb')).toEqual(countCode('a\n// c\n\nb'))
  })
})

describe('measure and render', () => {
  test('measures this repository: components and server are the two largest areas, tests are separate', () => {
    const m = measure(require('path').resolve(__dirname, '..', '..'))
    const dirs = m.areas.map(a => a.dir)
    expect(dirs.slice(0, 2).sort()).toEqual(['components', 'server'])
    expect(m.app.code).toBeGreaterThan(50000)
    expect(m.tests.code).toBeGreaterThan(0)
    // Tests are reported beside the code, never added into it.
    const areaSum = m.areas.reduce((n, a) => n + a.code, 0)
    expect(areaSum).toBe(m.app.code)
  })

  test('the record names its stamp and its totals, and says it is generated', () => {
    const md = renderMarkdown({
      areas: [{ dir: 'server', files: 2, code: 1500, comment: 300 }],
      byType: { '.js': { files: 2, code: 1500 } },
      app: { files: 2, code: 1500, comment: 300, blank: 10 },
      tests: { files: 3, code: 2000, comment: 0, blank: 0 },
      localeLines: 42
    }, { date: '2026-09-10', commit: 'abc1234' })
    expect(md).toContain('Generated. Do not edit')
    expect(md).toContain('2026-09-10')
    expect(md).toContain('abc1234')
    expect(md).toContain('1,500')
    expect(md).toContain('2,000')
    expect(md).toContain('more test code than app code')
  })

  test('the stamp is the local date, not the UTC one', () => {
    // 2026-09-16 08:29 NZST is still 2026-09-15 in UTC. toISOString() stamped yesterday
    // beside a commit made this morning, and the page says nothing about time zones.
    const morning = new Date(2026, 8, 16, 8, 29, 0)
    expect(localDate(morning)).toBe('2026-09-16')
    const lateEvening = new Date(2026, 8, 16, 23, 59, 0)
    expect(localDate(lateEvening)).toBe('2026-09-16')
  })
})

// Item 14.4: every Handbook build rewrote the record just to move its date and commit, so
// every session on both machines began with a changed tracked file and identical figures.
describe('writeRecord only rewrites when a count moves', () => {
  let root, file

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'va-count-code-'))
    fs.mkdirSync(path.join(root, 'components'))
    fs.mkdirSync(path.join(root, 'design'))
    fs.writeFileSync(path.join(root, 'components', 'a.js'), 'const a = 1\n')
    file = path.join(root, 'design', 'CODE-SIZE.md')
  })

  afterEach(() => { fs.rmdirSync(root, { recursive: true }) })

  /** The record as git leaves it on Windows: CRLF, stamped at an older date and commit. */
  function ageTheStamp () {
    const old = fs.readFileSync(file, 'utf8')
      .replace(/^> \*\*Measured .*$/m, '> **Measured 2026-01-01 at commit `0000000`.**')
      .replace(/\n/g, '\r\n')
    fs.writeFileSync(file, old)
    return old
  }

  test('same counts under an older stamp: the file is left exactly as it was', () => {
    expect(writeRecord(root).written).toBe(true)
    const old = ageTheStamp()
    expect(writeRecord(root).written).toBe(false)
    expect(fs.readFileSync(file, 'utf8')).toBe(old)
  })

  test('a changed count is written, with a fresh stamp', () => {
    writeRecord(root)
    ageTheStamp()
    fs.writeFileSync(path.join(root, 'components', 'b.js'), 'const b = 2\n')
    const r = writeRecord(root)
    expect(r.written).toBe(true)
    expect(r.code).toBe(2)
    expect(fs.readFileSync(file, 'utf8')).toContain('Measured ' + localDate())
  })
})
