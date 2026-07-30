'use strict'

/**
 * GUARD — the generated status table must never silently come back empty.
 *
 * Why this file exists. The first working version of the generator produced
 * "0 outstanding, 0 completed" and reported success. The cause was that
 * ACTIONS.md is CRLF on disk and `\r` is a line terminator to a JavaScript
 * regex, so `^(\s*)-\s+(.*)$` matched nothing. It looked like a clean run.
 *
 * That is the exact failure this whole piece of work exists to prevent: a
 * surface that says everything is fine because it can no longer see anything.
 * A status table that quietly shows no tasks is worse than no status table,
 * because it is believed.
 */

const { collectItems, parseItem, summarise } = require('../../scripts/generate-status-table')

describe('status table generator', () => {
  describe('it cannot silently report nothing', () => {
    const { items, unparsed } = collectItems()

    it('parses a realistic number of items out of ACTIONS.md', () => {
      // Floors, not exact counts — the backlog moves. They fail if parsing
      // breaks wholesale, which is the failure mode that actually happened.
      expect(items.length).toBeGreaterThanOrEqual(100)
    })

    it('finds both outstanding and completed work', () => {
      const outstanding = items.filter(i => !i.status.done)
      const done = items.filter(i => i.status.done)

      expect(outstanding.length).toBeGreaterThan(0)
      expect(done.length).toBeGreaterThan(0)
    })

    it('leaves few list lines unattributed, and never hides how many', () => {
      // `unparsed` is reported in the generated file on purpose. This asserts it
      // stays a small minority — if most lines stop parsing, the table is
      // lying by omission even though it still renders rows.
      expect(unparsed).toBeLessThan(items.length)
      expect(typeof unparsed).toBe('number')
    })

    it('gives every row a status, a section and a line to link to', () => {
      for (const item of items) {
        expect(typeof item.status.label).toBe('string')
        expect(item.status.label.length).toBeGreaterThan(0)
        expect(typeof item.section).toBe('string')
        expect(item.lineNo).toBeGreaterThan(0)
      }
    })
  })

  describe('parsing the shapes ACTIONS.md actually uses', () => {
    it('reads an entry with an anchor, a marker, a priority and a type', () => {
      const item = parseItem(
        '- <a id="demo"></a>☐ **P1 · BUILD — a thing that needs doing.** Detail follows.',
        42,
        'A section'
      )

      expect(item).not.toBeNull()
      expect(item.anchor).toBe('demo')
      expect(item.priority).toBe('P1')
      expect(item.type).toBe('BUILD')
      expect(item.status.done).toBe(false)
      expect(item.title).toBe('a thing that needs doing')
    })

    it('reads an entry that opens the bold BEFORE the marker', () => {
      // Two real entries are written this way. Missing them under-counts
      // completed work, which is the one thing this table must not do.
      const item = parseItem('- **✅ Done 2026-06-29 — some finished work.** More text.', 7, 'S')

      expect(item).not.toBeNull()
      expect(item.status.done).toBe(true)
    })

    it('ignores a list line that carries no status marker', () => {
      expect(parseItem('- just a sub-point with no marker', 9, 'S')).toBeNull()
    })

    it('records nesting depth so sub-tasks are visibly sub-tasks', () => {
      const nested = parseItem('  - ☐ **P2 · FIX — nested item.**', 11, 'S')

      expect(nested.depth).toBe(1)
    })
  })

  describe('titles stay readable', () => {
    it('joins a wrapped entry rather than cutting where the line broke', () => {
      const item = parseItem(
        '- ☐ **P1 · BUILD — a visible routing map: which material reaches',
        1,
        'S',
        'CLIENT RECOMMENDATIONS, and which is ADVISOR-READ-ONLY.** Raised by Mike.'
      )

      expect(item.title).toBe('a visible routing map: which material reaches CLIENT RECOMMENDATIONS, and which is ADVISOR-READ-ONLY')
    })

    it('does not cut a title at a colon inside a parenthetical', () => {
      // "(ruled: INJECT)" lost its point when colons were treated as sentence ends.
      expect(summarise('Learn-mode enrichment — BUILT 2026-07-16 (ruled: INJECT). Then detail.'))
        .toBe('Learn-mode enrichment — BUILT 2026-07-16 (ruled: INJECT)')
    })

    it('escapes a pipe so one entry cannot break the whole table', () => {
      expect(summarise('a title with a | pipe in it')).toContain('\\|')
    })

    it('never returns an empty cell', () => {
      expect(summarise('')).toBe('(untitled)')
    })
  })
})
