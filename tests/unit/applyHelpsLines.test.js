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

  // 🔴 AGENDA ROWS, AND THE FILTER NOW SAYS SO. It read "every concept with no
  // Helps line", which WAS exactly the 18 agenda rows until 2026-09-23 — so the
  // page's whole subject rode on a coincidence. Eight agenda rows were deleted that
  // day and two FRAMING PAGES arrived, which carry no Helps line either and are not
  // agenda rows: this page exists for Decision B, which is about the rows whose only
  // words are a name. A framing page's teaching is his drawn slide.
  const agendaRows = () => CONCEPTS.filter(c => c.source === 'agenda')

  it('leaves no agenda row or framing page without either a line or a draft waiting on this page', () => {
    // The ten agenda rows were approved and applied on 2026-09-24. The two framing pages
    // were drafted the same day on Mike's yes, because they were the last rows of the menu
    // showing a name and nothing else. Either way: no line means a draft here for Mike.
    const missing = CONCEPTS
      .filter(c => c.source === 'agenda' || c.source === 'framing-page')
      .filter(c => !c.helpsClientTo)
    expect(rows.map(r => r.id).sort()).toEqual(missing.map(c => c.id).sort())
  })

  it('🔴 every agenda row\'s line is one Mike approved, recorded here word for word', () => {
    // Mike's rulings of 2026-09-17: the line is his; an AI may draft it but only his
    // approval puts it in the data. A line that reached the data without passing through
    // this page's record is a generated sentence nobody approved — and it reads perfectly
    // reasonably to anyone in UAT.
    const record = PAGE.slice(PAGE.indexOf('## What has been applied'))
    agendaRows().filter(c => c.helpsClientTo).forEach((c) => {
      expect(record).toContain('`' + c.id + '` — "' + c.helpsClientTo + '"')
    })
  })

  it('🔴 names only concepts that really exist', () => {
    // A renamed concept would make Mike's approval silently unappliable.
    const ids = CONCEPTS.map(c => c.id)
    rows.forEach((row) => {
      expect(ids).toContain(row.id)
    })
  })

  it('holds nothing the command would refuse', () => {
    expect(sort(rows, CONCEPTS).problems).toEqual([])
  })

  it('carries a non-empty draft on every row', () => {
    rows.forEach((row) => {
      expect(row.draft.length).toBeGreaterThan(20)
    })
  })
})

describe('what the command refuses to write', () => {
  // A FIXTURE, not the live data: since 2026-09-24 every concept carries a line, so a test
  // that needs one without would stop testing anything. These rules hold whatever the data holds.
  const FIXTURE_CONCEPTS = [
    { id: 'no-line-yet', helpsClientTo: null },
    { id: 'mikes-own', helpsClientTo: 'A line Mike wrote himself.' }
  ]
  const CONCEPT = FIXTURE_CONCEPTS[0]
  const WITH_LINE = FIXTURE_CONCEPTS[1]

  function row (over) {
    return Object.assign(
      { approve: 'yes', id: CONCEPT.id, draft: 'A drafted line.', line: 1 }, over || {}
    )
  }

  it('🔴 refuses to overwrite a line Mike already wrote', () => {
    const { approved, problems } = sort([row({ id: WITH_LINE.id })], FIXTURE_CONCEPTS)
    expect(approved).toHaveLength(0)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('already carries a line')
  })

  it('refuses a concept id it does not recognise', () => {
    const { approved, problems } = sort([row({ id: 'not-a-concept' })], FIXTURE_CONCEPTS)
    expect(approved).toHaveLength(0)
    expect(problems[0]).toContain('is not a concept')
  })

  it('refuses an approved row with nothing written in it', () => {
    const { approved, problems } = sort([row({ draft: '' })], FIXTURE_CONCEPTS)
    expect(approved).toHaveLength(0)
    expect(problems[0]).toContain('draft is empty')
  })

  it('🔴 treats anything other than "yes" as not approved', () => {
    const others = ['', 'y', '✓', 'approved', 'no', 'YES please']
    others.forEach((value) => {
      expect(sort([row({ approve: value })], FIXTURE_CONCEPTS).approved).toHaveLength(0)
    })
    // The one spelling that does work, so the test cannot pass by refusing everything.
    expect(sort([row({ approve: 'yes' })], FIXTURE_CONCEPTS).approved).toHaveLength(1)
  })

  it('🔴 lets one bad row stop the good ones — never a partial apply', () => {
    const { approved, problems } = sort(
      [row(), row({ id: 'not-a-concept', line: 2 })], FIXTURE_CONCEPTS
    )
    // `sort` reports both outcomes; main() writes nothing at all when problems exist.
    expect(problems).toHaveLength(1)
    expect(approved).toHaveLength(1)
    // The contract main() relies on: any problem means nothing is written.
    expect(problems.length > 0).toBe(true)
  })
})

describe('the page after an apply', () => {
  // A FIXTURE, not the live page: the live page's drafts are used up once Mike approves
  // them, and a test that needs a draft to exist stops testing anything the day he does.
  const FIXTURE = [
    '# Drafts',
    '',
    '| Approve | Concept | Draft | Drafted from |',
    '|---|---|---|---|',
    '| yes | `first-row`<br>**First** | The line Mike approved. | p1 |',
    '| | `second-row`<br>**Second** | Still waiting. | p2 |',
    '',
    '---',
    '',
    '## What has been applied',
    '',
    '*Nothing yet.* `npm run helps-lines` writes a dated line here for every row it applies, so this',
    'page is also the record of which line was approved when.',
    ''
  ].join('\n')
  const applied = [{ row: { id: 'first-row', draft: 'The line Mike approved.', approve: 'yes', line: 5 } }]
  const after = rewritePage(FIXTURE, applied)

  it('removes the applied row and records what was approved', () => {
    const remaining = parseRows(after)
    expect(remaining.map(r => r.id)).toEqual(['second-row'])
    expect(after).toContain('`first-row` — "The line Mike approved."')
  })

  it('🔴 removes the WHOLE "Nothing yet" note, both of its lines', () => {
    // Its second line was left stranded under the record by the first real apply,
    // 2026-09-24. Checking only the first line is how that passed.
    expect(after).not.toContain('*Nothing yet.*')
    expect(after).not.toContain('page is also the record of which line was approved when.')
  })
})
