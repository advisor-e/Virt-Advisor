'use strict'

// Item 15.25 — the rules that decide which of a concept page's lines an advisor edits as one
// block, what the edit is stored under, and how their words re-wrap.
//
// WHAT THESE GUARD, and none of it is visible in UAT until it goes wrong:
//   1. A BLOCK NAME THAT DRIFTS. An edit is stored under the block's name; if the name changes
//      when nothing about the page did, every saved edit silently stops appearing.
//   2. A REDRAWN PAGE INHERITING AN OLD EDIT. If a corrected drawing kept the old name, an
//      advisor's words would land on a different question, and read perfectly naturally.
//   3. A WRAP THAT LOSES OR INVENTS WORDS. The client's printed plan would quote them wrong.
// The DOM half — measuring, drawing, the fit check — runs in a real browser, not in jsdom,
// which has no text layout; it is proved by driving the app (see the item's closure).

import { groupLines, blockKey, hashWords, normaliseWords, wrapText, sheetEdits, NO_EDITS } from '../../utils/conceptTextBlocks'

const line = (x, y, over) => Object.assign({ x, y, fontSize: 18.8, look: '18.8px|400|normal|#002B64|start' }, over || {})

describe('groupLines — which lines are one paragraph', () => {
  it('joins lines that share a look and a left edge and step down by one line', () => {
    // Porter's "Customers" question as drawn: four lines, 21.9 apart.
    expect(groupLines([line(850.8, 141.9), line(850.8, 163.8), line(850.8, 185.7), line(850.8, 207.6)]))
      .toEqual([[0, 1, 2, 3]])
  })

  it('keeps a heading apart from the paragraph beneath it', () => {
    const heading = line(57.8, 98.7, { fontSize: 50, look: '50px|400|normal|#002B64|start' })
    expect(groupLines([heading, line(57.8, 130), line(57.8, 151.9)])).toEqual([[0], [1, 2]])
  })

  it('splits two columns that sit side by side', () => {
    expect(groupLines([line(80.5, 234), line(850.8, 255.9)])).toEqual([[0], [1]])
  })

  it('splits a paragraph from the next one when the gap is a blank line or more', () => {
    expect(groupLines([line(80, 100), line(80, 121.9), line(80, 170)])).toEqual([[0, 1], [2]])
  })

  it('answers an empty page with no blocks', () => {
    expect(groupLines([])).toEqual([])
    expect(groupLines(undefined)).toEqual([])
  })
})

describe('blockKey — the name an edit is stored under', () => {
  const words = 'Are customers likely to be motivated to pay premium prices in return for latest style?'

  it('is the same every time for the same block, whatever its spacing', () => {
    expect(blockKey(10, words)).toBe(blockKey(10, '  ' + words.replace(/ /g, '   ') + '\n'))
  })

  it('🔴 changes when the drawing\'s words change, so an old edit is dropped rather than misplaced', () => {
    expect(blockKey(10, words)).not.toBe(blockKey(10, words.replace('premium', 'higher')))
  })

  it('changes with the block\'s position too', () => {
    expect(blockKey(10, words)).not.toBe(blockKey(11, words))
  })

  it('always matches the shape the server stores', () => {
    // server/utils/strategySessionStore.js BLOCK_KEY — a key the store refuses is an edit lost.
    const BLOCK_KEY = /^b\d{1,4}-[0-9a-z]{1,13}$/
    ;['', 'x', words, 'é'.repeat(500), '\u0000'].forEach((w, i) => {
      expect(blockKey(i * 997, w)).toMatch(BLOCK_KEY)
    })
  })

  it('hashes to a stable value, pinned so a change to the hash is a deliberate one', () => {
    // Changing hashWords renames every block on every page and orphans every saved edit.
    expect(hashWords('Customers')).toBe(hashWords('Customers'))
    expect(hashWords('Customers')).toBe('1vweyym')
  })
})

describe('wrapText — the advisor\'s words, back into lines', () => {
  // One unit per character: a column 20 wide holds 20 characters.
  const measure = s => s.length

  it('fills each line as far as the column allows, and marks which lines were broken', () => {
    expect(wrapText('the quick brown fox jumps over the lazy dog', 20, measure)).toEqual([
      { s: 'the quick brown fox', full: true },
      { s: 'jumps over the lazy', full: true },
      { s: 'dog', full: false }
    ])
  })

  it('never loses or invents a word', () => {
    const text = 'For this client: do trade buyers care more about delivery speed than price?'
    const joined = wrapText(text, 17, measure).map(l => l.s).join(' ')
    expect(joined).toBe(text)
  })

  it('starts a new paragraph where the advisor pressed return', () => {
    expect(wrapText('one\ntwo', 50, measure)).toEqual([{ s: 'one', full: false }, { s: 'two', full: false }])
  })

  it('gives a word wider than the column a line of its own, for the fit check to judge', () => {
    expect(wrapText('a supercalifragilistic b', 5, measure).map(l => l.s)).toEqual(['a', 'supercalifragilistic', 'b'])
  })

  it('answers nothing with no lines', () => {
    expect(wrapText('   ', 20, measure)).toEqual([])
    expect(wrapText(null, 20, measure)).toEqual([])
  })
})

describe('sheetEdits — one page\'s edits out of the session\'s', () => {
  it('finds a page by concept and sheet, as the store keys it', () => {
    const all = { 'porters-5-forces#0': { 'b2-x': 'Customers and trade buyers' } }
    expect(sheetEdits(all, 'porters-5-forces', 0)).toEqual({ 'b2-x': 'Customers and trade buyers' })
    expect(sheetEdits(all, 'porters-5-forces', 1)).toBe(NO_EDITS)
  })

  it('🔴 returns ONE shared empty value, so an unedited page is never redrawn for nothing', () => {
    // A fresh {} per call would change identity on every keystroke elsewhere on the screen
    // and redraw every page the drawing watches.
    expect(sheetEdits({}, 'pricing', 0)).toBe(sheetEdits(undefined, 'boston-model', 3))
    expect(Object.isFrozen(NO_EDITS)).toBe(true)
  })
})

describe('normaliseWords', () => {
  it('collapses spacing and trims, and treats nothing as empty', () => {
    expect(normaliseWords('  a \n b\t c ')).toBe('a b c')
    expect(normaliseWords(null)).toBe('')
  })
})
