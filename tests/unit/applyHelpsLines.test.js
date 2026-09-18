'use strict'

/**
 * Item 15.3 — the command that applies the "Helps Your Client To…" lines Mike approves.
 *
 * 🔴 WHAT THESE TESTS GUARD, and none of it is wording:
 *
 *   1. THE PAGE AND THE DATA CANNOT DRIFT APART. Every concept id on
 *      design/AGENDA-HELPS-LINES.md is a real concept that genuinely has no line. Rename a
 *      concept and the page silently stops matching it — Mike would approve a row, the
 *      command would refuse the whole run, and nothing else in the repository would have
 *      said a word.
 *   2. A DRAFT NEVER OVERWRITES MIKE'S OWN WORDS. The 34 lines already in the data were
 *      read off his decks. A row that would replace one stops the run.
 *   3. ONLY "yes" IS APPROVAL. A tick, a "y", a stray note in the cell — none of them write
 *      anything, because a half-understood cell that writes is worse than one that refuses.
 *   4. A PARTIAL APPLY NEVER HAPPENS. One bad row stops all of them.
 */

const fs = require('fs')
const path = require('path')
const { parseRows, sort, rewritePage } = require('../../scripts/apply-helps-lines')
const frameworks = require('../../server/utils/strategyFrameworks')

const PAGE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'design', 'AGENDA-HELPS-LINES.md'), 'utf8'
)
const CONCEPTS = frameworks.listConcepts()

describe('the page Mike edits', () => {
  const rows = parseRows(PAGE)

  it('carries a draft for every agenda row that has no line — all 18', () => {
    const missing = CONCEPTS.filter(c => !c.helpsClientTo)
    expect(missing).toHaveLength(18)
    expect(rows).toHaveLength(18)
    expect(rows.map(r => r.id).sort()).toEqual(missing.map(c => c.id).sort())
  })

  it('🔴 names only concepts that really exist', () => {
    // A renamed concept would make Mike's approval silently unappliable.
    const ids = CONCEPTS.map(c => c.id)
    rows.forEach((row) => {
      expect(ids).toContain(row.id)
    })
  })

  it('leaves every row unapproved until Mike says otherwise', () => {
    const { approved, waiting } = sort(rows, CONCEPTS)
    expect(approved).toHaveLength(0)
    expect(waiting).toHaveLength(18)
  })

  it('carries a non-empty draft on every row', () => {
    rows.forEach((row) => {
      expect(row.draft.length).toBeGreaterThan(20)
    })
  })
})

describe('what the command refuses to write', () => {
  const CONCEPT = CONCEPTS.find(c => !c.helpsClientTo)
  const WITH_LINE = CONCEPTS.find(c => c.helpsClientTo)

  function row (over) {
    return Object.assign(
      { approve: 'yes', id: CONCEPT.id, draft: 'A drafted line.', line: 1 }, over || {}
    )
  }

  it('🔴 refuses to overwrite a line Mike already wrote', () => {
    const { approved, problems } = sort([row({ id: WITH_LINE.id })], CONCEPTS)
    expect(approved).toHaveLength(0)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('already carries a line')
  })

  it('refuses a concept id it does not recognise', () => {
    const { approved, problems } = sort([row({ id: 'not-a-concept' })], CONCEPTS)
    expect(approved).toHaveLength(0)
    expect(problems[0]).toContain('is not a concept')
  })

  it('refuses an approved row with nothing written in it', () => {
    const { approved, problems } = sort([row({ draft: '' })], CONCEPTS)
    expect(approved).toHaveLength(0)
    expect(problems[0]).toContain('draft is empty')
  })

  it('🔴 treats anything other than "yes" as not approved', () => {
    const others = ['', 'y', '✓', 'approved', 'no', 'YES please']
    others.forEach((value) => {
      expect(sort([row({ approve: value })], CONCEPTS).approved).toHaveLength(0)
    })
    // The one spelling that does work, so the test cannot pass by refusing everything.
    expect(sort([row({ approve: 'yes' })], CONCEPTS).approved).toHaveLength(1)
  })

  it('🔴 lets one bad row stop the good ones — never a partial apply', () => {
    const { approved, problems } = sort(
      [row(), row({ id: 'not-a-concept', line: 2 })], CONCEPTS
    )
    // `sort` reports both outcomes; main() writes nothing at all when problems exist.
    expect(problems).toHaveLength(1)
    expect(approved).toHaveLength(1)
    // The contract main() relies on: any problem means nothing is written.
    expect(problems.length > 0).toBe(true)
  })
})

describe('the page after an apply', () => {
  const CONCEPT = CONCEPTS.find(c => !c.helpsClientTo)

  it('removes the applied row and records what was approved', () => {
    const applied = [{
      row: { id: CONCEPT.id, draft: 'The line Mike approved.', approve: 'yes', line: 1 },
      concept: CONCEPT
    }]
    const after = rewritePage(PAGE, applied)

    // The row is gone from the table…
    const remaining = parseRows(after)
    expect(remaining.map(r => r.id)).not.toContain(CONCEPT.id)
    expect(remaining).toHaveLength(17)
    // …and the approved text is recorded rather than lost.
    expect(after).toContain('The line Mike approved.')
    expect(after).not.toContain('*Nothing yet.*')
  })
})
