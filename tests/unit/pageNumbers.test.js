'use strict'

// 🔴 WHY THIS EXISTS. Mike's ruling, 2026-09-23: a task belongs to a Handbook page and
// takes that page's number — Sales Tracker is page 17, so a job on it is 17.1, and
// nothing that is not a Sales Tracker job may start with 17.
//
// Written down, that is a convention. What makes it TRUE is this file. Before it, a task
// number pointed at one of twelve abstract subjects that existed only in a markdown
// table, and nothing anywhere could be asked whether a number meant anything at all.
// The inference failed twice in eight days on its own: 5.4 was filed under Model Library
// because the currency picker sits on that screen, and 5.3 sat in the Model Library
// family while being a job about the test suite.
//
// It guards three things and no more. Each one is a fault a person cannot see by reading
// a screen, which is the test this repository's tests have to pass to earn their place:
//
//   1. Every live task's whole number is a real Handbook page.
//   2. No two pages hold the same number — two features answering to one task family.
//   3. Every page in the index carries a number at all.
//
// It deliberately does NOT assert a page's TITLE or its position. Both change honestly
// as the product grows, and a guard on either would be switched off inside a week.
// design/PAGE-NUMBERS.md holds the rule; design/features/README.md holds the register.

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { pageNumbersIn } = require('../../scripts/ref-ceiling')

const ROOT = resolve(__dirname, '..', '..')
const INDEX = resolve(ROOT, 'design/features/README.md')
const LIST = resolve(ROOT, 'design/features/to-do-items.json')

const indexText = readFileSync(INDEX, 'utf8')
const items = JSON.parse(readFileSync(LIST, 'utf8')).items

/**
 * Every numbered row of the Handbook index, as `{ number, title, file }`.
 *
 * Read with the same expression the branch check hands numbers out from, so the register
 * can never mean one thing to a session and another to this guard.
 *
 * ⚠ A PAGE'S IDENTITY IS ITS FILE, NEVER ITS LINK TEXT. `firm-manager-hub.md` is listed
 * twice — as "The Hub itself" under the hub pages and as "Firm Manager Hub" under
 * Management — and the Handbook renders it once. Keying on the title would read that one
 * page as two features holding number 10.
 *
 * @returns {Array<{number: number, title: string, file: string}>}
 */
function rows () {
  const found = []
  const rx = /^\|\s*\**\s*(\d+)\s*\**\s*\|[^|]*\[([^\]]+)\]\((?:\.\.\/)?([A-Za-z0-9._-]+)\.md[^)]*\)/gm
  let m
  while ((m = rx.exec(indexText)) !== null) {
    found.push({
      number: Number(m[1]),
      title: m[2].replace(/[*`]/g, '').trim(),
      file: m[3]
    })
  }
  return found
}

/**
 * Every row of the index that links a page, numbered or not.
 *
 * The `#` column is optional to the Handbook build — a row without one still renders a
 * page — so an unnumbered row is invisible to every other check. This is what sees it.
 *
 * @returns {string[]} each linking row's title
 */
function linkedTitles () {
  const found = []
  const rx = /^\|(?:[^|\n]*\|)*?[^|\n]*\[([^\]]+)\]\((?:\.\.\/)?[A-Za-z0-9._-]+\.md[^)]*\)/gm
  let m
  while ((m = rx.exec(indexText)) !== null) {
    const title = m[1].replace(/[*`]/g, '').trim()
    if (!/^(brief|history)$/i.test(title)) { found.push(title) }
  }
  return found
}

describe('a task number is a Handbook page number', () => {
  test('the index holds page numbers at all', () => {
    // A register that has quietly emptied would make every check below pass on nothing.
    expect(pageNumbersIn(indexText).length).toBeGreaterThan(40)
  })

  test('no two pages hold the same number', () => {
    const seen = new Map()
    const clashes = []
    rows().forEach(({ number, file }) => {
      const held = seen.get(number)
      // One page may be listed under two groups — the Handbook renders it once, and the
      // repeat carries the same number. That is the index working, not a clash.
      if (held && held !== file) {
        clashes.push('page ' + number + ' is on both ' + held + '.md and ' + file + '.md')
      }
      if (!held) { seen.set(number, file) }
    })
    expect(clashes.length ? clashes.join('\n') : 'every page number is its own')
      .toBe('every page number is its own')
  })

  test('one page never holds two different numbers', () => {
    const seen = new Map()
    const split = []
    rows().forEach(({ number, file }) => {
      const held = seen.get(file)
      if (held !== undefined && held !== number) {
        split.push(file + '.md is listed as page ' + held + ' and as page ' + number)
      }
      if (held === undefined) { seen.set(file, number) }
    })
    expect(split.length ? split.join('\n') : 'every page has one number')
      .toBe('every page has one number')
  })

  test('every page in the index carries a number', () => {
    const numbered = new Set(rows().map(r => r.title))
    const bare = linkedTitles().filter(t => !numbered.has(t))
    expect(bare.length ? bare.join('\n') : 'every page numbered').toEqual('every page numbered')
  })

  test('every live task belongs to a page that exists', () => {
    const pages = new Set(pageNumbersIn(indexText))
    const orphans = items
      .filter(item => !pages.has(Number(String(item.ref).split('.')[0])))
      .map(item => [
        'Task ' + item.ref + ' — "' + item.name + '"',
        '  names page ' + String(item.ref).split('.')[0] + ', which is not in the Handbook index.',
        '  A feature earns a page before it can be given a task number (Mike, 2026-09-23).',
        '  Take the next free page number from `npm run check:branch`, never from this branch.'
      ].join('\n'))

    expect(orphans.length ? orphans.join('\n\n') : 'every task has a page')
      .toBe('every task has a page')
  })

  test('the numbers below 5 are never allocated', () => {
    // 2.x, 3.x and 4.x are the closed item families — 613 references in 279 code files
    // (design/ITEM-NUMBERING.md §2). A page taking one would point a live task at them.
    const low = rows().filter(r => r.number < 5).map(r => r.number + ' — ' + r.title)
    expect(low.length ? low.join('\n') : 'nothing below 5').toBe('nothing below 5')
  })
})
