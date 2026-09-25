'use strict'

const {
  refsIn,
  entriesIn,
  compareRefs,
  highest,
  nextAfter,
  nextParent,
  nextFreeBySubject,
  sameJob,
  clashes,
  describeCeiling,
  highestOn,
  ceilingLines
} = require('../../scripts/ref-ceiling')

const { isCandidate } = require('../../scripts/branch-survey')

/**
 * The item-number ceiling (item 14.2, filed as 4.101 before the 2026-09-15 renumber).
 *
 * The 4.1xx values below are ARITHMETIC — fixtures proving the sort — not references to
 * any item. They are deliberately left alone: renumbering them would change what the
 * maths is being tested against. See design/ITEM-NUMBERING.md.
 *
 * Each machine allocated the next to-do number from its own branch, blind to the other's,
 * so both filed different work under the same number. It happened ELEVEN times before
 * anyone noticed, because `toDoItems.test.js` guards uniqueness on the live list alone and
 * a collision disappears from view the moment both items close into the archive.
 *
 * The cases that matter are the ones that made the bug invisible: the archive counts as
 * much as the live list, and '4.100' is higher than '4.99' even though the string is not.
 */
describe('ref-ceiling — reading the numbers in use', () => {
  it('reads live refs out of the list JSON', () => {
    const json = '{"items":[{"ref": "4.15","name":"x"},{"ref": "4.100","name":"y"}]}'
    expect(refsIn(json, '')).toEqual(['4.15', '4.100'])
  })

  it('reads closed refs out of the archive, whichever separator the entry used', () => {
    // Three years of entries, three separators. Matching on the separator would have
    // silently dropped whole eras of the archive and under-reported the ceiling.
    const md = [
      '**4.41 · A package the Constitution bans by name.** ✅ Closed',
      '**4.95 — the Sales Dashboard: the last card that said "coming soon".**',
      '**4.88 - High Level Budget.** ✅ Closed',
      'Some prose that mentions 4.99 but is not an entry.'
    ].join('\n')
    expect(refsIn('', md)).toEqual(['4.41', '4.95', '4.88'])
  })

  it('counts the archive as well as the live list — a closed number is spent for good', () => {
    // The half that was missed. Closed numbers are quoted in report.js, ARTEFACTS.md and
    // the mockups; handing one out again would point two things at one name.
    const json = '{"items":[{"ref": "4.15"}]}'
    const md = '**4.95 — the Sales Dashboard.**'
    expect(highest(refsIn(json, md))).toBe('4.95')
  })

  it('ignores anything that is not a bare major.minor ref', () => {
    expect(highest(['4.1', 'v0.12.0', '', null, 'master'])).toBe('4.1')
  })

  it('returns null when there is nothing to read', () => {
    expect(highest([])).toBeNull()
    expect(refsIn('', '')).toEqual([])
  })
})

describe('ref-ceiling — ordering', () => {
  it('puts 4.100 above 4.99, which string sorting does not', () => {
    // The whole reason this compares integers. Alphabetically '4.100' < '4.99', so a
    // naive sort would offer 4.100 as free on the very day it was allocated.
    expect(compareRefs('4.100', '4.99')).toBeGreaterThan(0)
    expect(highest(['4.99', '4.100', '4.15'])).toBe('4.100')
  })

  it('orders by the major part first', () => {
    expect(compareRefs('5.1', '4.100')).toBeGreaterThan(0)
    expect(highest(['4.100', '5.1'])).toBe('5.1')
  })

  it('treats equal refs as equal', () => {
    expect(compareRefs('4.97', '4.97')).toBe(0)
  })

  it('hands out the next number in the same series', () => {
    expect(nextAfter('4.99')).toBe('4.100')
    expect(nextAfter('4.100')).toBe('4.101')
  })

  // Mike's ruling, 2026-09-15: a whole number is a subject, its decimals are the jobs in
  // it. The parent is the half that must never be guessed — two machines both inventing
  // the same new subject is the original defect in a new scheme.
  it('gives the next free PARENT for a subject that has none', () => {
    expect(nextParent(['14.1', '9.2', '4.104'])).toBe(15)
  })

  it('counts the closed 4.x family like any other — 4 is spent', () => {
    expect(nextParent(['4.104'])).toBe(5)
  })

  it('is not fooled by string order: 4.100 does not outrank 14.1', () => {
    expect(nextParent(['4.100', '14.1'])).toBe(15)
  })

  it('survives a list with nothing usable in it', () => {
    expect(nextParent([])).toBe(1)
    expect(nextParent(null)).toBe(1)
  })
})

describe('ref-ceiling — what it prints', () => {
  const rows = [
    { label: 'this branch (feat/advisor-progress)', highest: '4.101', pages: [17, 44] },
    { label: 'origin/feat/firm-quiz-builder-ui', highest: '4.99', pages: [17, 51] }
  ]

  it('leads with what a number MEANS, not with a serial to take', () => {
    expect(describeCeiling(rows)[0]).toBe('A WHOLE NUMBER IS A HANDBOOK PAGE; ITS DECIMALS ARE THE JOBS ON IT.')
  })

  it('names the next free page from the highest across ALL branches', () => {
    // Since Mike's ruling of 2026-09-23 a new number is a new Handbook page, not a new
    // subject. 44 here and 51 there: the next page is 52, and it is read from the other
    // machine's index as readily as from this one's.
    expect(describeCeiling(rows).join('\n')).toContain('page 52, the next free one')
  })

  it('says so plainly when no branch could yield a page number', () => {
    // Silence would read as "there are none free", which is the one thing it cannot mean.
    const blind = [{ label: 'this branch (feat/advisor-progress)', highest: '4.101', pages: [] }]
    expect(describeCeiling(blind).join('\n'))
      .toContain('A page number could not be read from design/features/README.md')
  })

  it('takes the ceiling from the other machine when that one is higher', () => {
    const other = [
      { label: 'this branch (feat/advisor-progress)', highest: '4.90', pages: [17] },
      { label: 'origin/feat/firm-quiz-builder-ui', highest: '4.99', pages: [17] }
    ]
    expect(describeCeiling(other).join('\n')).toContain('4.99')
  })

  it('shows every branch it managed to read, so the number can be checked', () => {
    const printed = describeCeiling(rows).join('\n')
    expect(printed).toContain('origin/feat/firm-quiz-builder-ui')
    expect(printed).toContain('4.99')
  })

  it('says nothing at all when no branch could be read', () => {
    // Silence beats a confident wrong ceiling: a report nobody can trust gets ignored,
    // and this one only has to be wrong once to hand out a taken number.
    expect(describeCeiling([])).toBeNull()
    expect(describeCeiling([{ label: 'x', highest: null }])).toBeNull()
  })
})

describe('ref-ceiling — reading a branch through git', () => {
  /**
   * A git runner standing in for a two-machine repo.
   * @param {object} files map of `<ref>:<path>` to contents
   * @returns {function(string[]): (string|null)} a non-throwing runner
   */
  function runner (files) {
    return function (args) {
      if (args[0] === 'show') { return Object.prototype.hasOwnProperty.call(files, args[1]) ? files[args[1]] : null }
      if (args[0] === 'for-each-ref') { return files.__refs === undefined ? null : files.__refs }
      return null
    }
  }

  const LIVE = ':design/features/to-do-items.json'
  const ARCH = ':design/features/to-do-done-and-parked.md'

  // A Handbook index whose highest page is 53, so the next free page is 54. Two rows is
  // enough: the number is read from the `#` column, never counted from the row total.
  const INDEX_53 = [
    '| # | Brief | History |',
    '|---|---|---|',
    '| 17 | [Sales Tracker](sales-tracker.md) | [history](sales-tracker-history.md) |',
    '| 53 | [Case Studies & Clients](cases-and-clients.md) | [history](cases-and-clients-history.md) |'
  ].join('\n')

  it('reads both files from a branch and returns its highest', () => {
    const git = runner({
      ['origin/feat/other' + LIVE]: '{"items":[{"ref": "4.93"}]}',
      ['origin/feat/other' + ARCH]: '**4.99 — something closed.**'
    })
    expect(highestOn(git, 'origin/feat/other')).toBe('4.99')
  })

  it('returns null for a branch whose files cannot be read', () => {
    expect(highestOn(runner({}), 'origin/feat/missing')).toBeNull()
  })

  it('survives a branch holding only one of the two files', () => {
    const git = runner({ ['origin/feat/half' + LIVE]: '{"items":[{"ref": "4.7"}]}' })
    expect(highestOn(git, 'origin/feat/half')).toBe('4.7')
  })

  it('reports this branch from the WORKING TREE, not from HEAD', () => {
    // A session that has just filed an item has not committed it. Reading HEAD would
    // offer that session back the very number it is already using.
    const git = runner({
      __refs: '',
      ['HEAD' + LIVE]: '{"items":[{"ref": "4.99"}]}',
      ['HEAD' + ARCH]: ''
    })
    const printed = ceilingLines(git, 'feat/advisor-progress', isCandidate, {
      live: '{"items":[{"ref": "4.101"}]}',
      archive: '',
      index: INDEX_53
    }).join('\n')
    expect(printed).toContain('page 54, the next free one')
  })

  it('takes in the other machine\'s branch and skips master and release snapshots', () => {
    // Borrowing branch-survey's filter is the point: the two reports must agree on what
    // counts as another machine's list. A release/* snapshot is a frozen copy, not work.
    const git = runner({
      __refs: ['origin/master', 'origin/HEAD', 'origin/release/frozen-2026-08-02', 'origin/feat/other'].join('\n'),
      ['origin/master' + LIVE]: '{"items":[{"ref": "4.200"}]}',
      ['origin/release/frozen-2026-08-02' + LIVE]: '{"items":[{"ref": "4.300"}]}',
      ['origin/feat/other' + LIVE]: '{"items":[{"ref": "4.99"}]}'
    })
    const printed = ceilingLines(git, 'feat/advisor-progress', isCandidate, {
      live: '{"items":[{"ref": "4.101"}]}',
      archive: '',
      index: INDEX_53
    }).join('\n')

    expect(printed).toContain('page 54, the next free one')
    expect(printed).toContain('origin/feat/other')
    expect(printed).not.toContain('origin/master')
    expect(printed).not.toContain('release/frozen')
  })

  it('still reports this branch when git can tell it nothing about the others', () => {
    // Offline, or a fresh clone with no remotes. Half a ceiling beats none.
    const git = runner({})
    const printed = ceilingLines(git, 'feat/advisor-progress', isCandidate, {
      live: '{"items":[{"ref": "4.101"}]}',
      archive: '',
      index: INDEX_53
    }).join('\n')
    expect(printed).toContain('page 54, the next free one')
  })
})

/**
 * The decimal half, added 2026-09-16 after the TWELFTH collision — item 7.5, filed on
 * both machines a day apart.
 *
 * The ceiling above was built on 2026-09-14 and works: it stops two machines claiming the
 * same new SUBJECT. Mike's ruling of 2026-09-15 then made almost every new job a DECIMAL
 * of a subject that already exists, and nothing compared those across branches. The box
 * could print "highest in use 14.2 / 14.1" on a morning when 7.5 named two unrelated jobs.
 *
 * These cases are the ones that decide whether the box can be trusted: a ref on two
 * branches is USUALLY the same item and must stay silent, or the warning gets scrolled past.
 */
describe('ref-ceiling — one number, two different jobs', () => {
  const laptop = {
    label: 'this branch (feat/advisor-progress)',
    entries: [{ ref: '7.5', name: 'Nothing records which calculation model the AI named' }]
  }
  const desktop = {
    label: 'origin/feat/firm-quiz-builder-ui',
    entries: [{ ref: '7.5', name: "A page's templates are hidden behind whichever won the ID" }]
  }

  it('catches the real 2026-09-16 collision', () => {
    const found = clashes([laptop, desktop])
    expect(found).toHaveLength(1)
    expect(found[0].ref).toBe('7.5')
    expect(found[0].sides.map(s => s.label)).toEqual([laptop.label, desktop.label])
  })

  it('treats a ref both branches inherited as one item renamed, and still flags a new one', () => {
    // 15.8 was renamed on 2026-09-24 with no word in common while the desktop was behind;
    // titles alone read that as two jobs. 7.5 was never in the shared history — a real clash.
    const renamed = [
      { label: 'mine', entries: [{ ref: '15.8', name: 'Two unlicensed pictures print in clients\' plans' }] },
      { label: 'theirs', inherited: ['15.8'], entries: [{ ref: '15.8', name: 'Two stock images have no licence check' }] }
    ]
    expect(clashes(renamed)).toEqual([])
    expect(clashes([laptop, Object.assign({ inherited: ['7.1'] }, desktop)])).toHaveLength(1)
  })

  it('stays SILENT on the same item held by both branches', () => {
    // The case that decides whether anyone reads the box. Nearly every ref is on both
    // branches — a warning on each would bury the one that matters among nine that do not.
    const both = [
      { label: 'a', entries: [{ ref: '8.1', name: 'Meeting Review — three non-coding gates' }] },
      { label: 'b', entries: [{ ref: '8.1', name: 'Meeting Review — three non-coding gates' }] }
    ]
    expect(clashes(both)).toEqual([])
  })

  it('forgives a title edited on one branch and not the other', () => {
    expect(sameJob('The 14 branches that name a page nobody can open',
      'The 14 branches that still name a page nobody can open')).toBe(true)
    expect(sameJob('Adviser Network runs on nine invented people',
      'Adviser Network runs on nine invented people and forgets every decision')).toBe(true)
  })

  it('does not call two unrelated jobs the same because both are short', () => {
    expect(sameJob('Load a payroll report to pre-fill the team',
      'A second opinion from two AI providers')).toBe(false)
  })

  it('says nothing about a ref it cannot name', () => {
    // A number with no title is a number we cannot judge. Crying wolf over it would
    // train the reader to skip the box that carries a real clash.
    expect(sameJob('', 'anything at all')).toBe(true)
    expect(clashes([{ label: 'a', entries: [{ ref: '9.9', name: '' }] },
      { label: 'b', entries: [{ ref: '9.9', name: 'something else entirely' }] }])).toEqual([])
  })

  it('reads one branch once, so a within-branch duplicate is left to its own guard', () => {
    // toDoItems.test.js fails the build on a duplicate inside one live list, where it can
    // name the file to fix. This report is about what one machine cannot see.
    const twice = [{
      label: 'a',
      entries: [{ ref: '4.93', name: 'One job' }, { ref: '4.93', name: 'A quite different job' }]
    }]
    expect(clashes(twice)).toEqual([])
  })

  it('prints both titles and both branches, so a person can settle it', () => {
    const printed = describeCeiling([
      Object.assign({ highest: '7.5' }, laptop),
      Object.assign({ highest: '7.5' }, desktop)
    ]).join('\n')

    expect(printed).toContain('ONE NUMBER, TWO DIFFERENT JOBS')
    expect(printed).toContain('which calculation model the AI named')
    expect(printed).toContain('whichever won the ID')
    expect(printed).toContain('origin/feat/firm-quiz-builder-ui')
  })

  it('does not shout about the eleven already written down', () => {
    // 4.94 names two unrelated jobs across these branches and always will — it is history,
    // recorded in ITEM-NUMBERING.md §5. A red box repeating it every morning is how the
    // box stops being read, and the one that must be seen is a NEW one.
    const printed = describeCeiling([
      { label: 'a', highest: '4.94', entries: [{ ref: '4.94', name: 'Stock Purchasing' }] },
      { label: 'b', highest: '4.94', entries: [{ ref: '4.94', name: 'Why this named the wrong hold-back' }] }
    ]).join('\n')

    expect(printed).not.toContain('ONE NUMBER, TWO DIFFERENT JOBS')
    expect(printed).toContain('Already recorded, nothing to do: 4.94')
  })

  it('still shouts about a new one standing beside a recorded one', () => {
    const printed = describeCeiling([
      {
        label: 'a',
        highest: '7.5',
        entries: [{ ref: '4.94', name: 'Stock Purchasing' }, { ref: '7.5', name: 'Which model the AI named' }]
      },
      {
        label: 'b',
        highest: '7.5',
        entries: [{ ref: '4.94', name: 'A wrong hold-back' }, { ref: '7.5', name: "A page's templates hidden" }]
      }
    ]).join('\n')

    expect(printed).toContain('ONE NUMBER, TWO DIFFERENT JOBS')
    expect(printed).toContain('7.5')
    expect(printed).toContain('Already recorded, nothing to do: 4.94')
  })

  it('leaves an ordinary morning exactly as it was', () => {
    // No clash, no box: the report opens on what a number means, as it always did.
    const quiet = describeCeiling([{ label: 'this branch (x)', highest: '4.101' }])
    expect(quiet[0]).toBe('A WHOLE NUMBER IS A HANDBOOK PAGE; ITS DECIMALS ARE THE JOBS ON IT.')
  })
})

describe('ref-ceiling — the next free decimal of each subject', () => {
  it('reads every OPEN subject in use, across all branches', () => {
    expect(nextFreeBySubject(['7.1', '7.5', '9.1', '4.104', '7.9'])).toEqual([
      { subject: 7, next: '7.10' },
      { subject: 9, next: '9.2' }
    ])
  })

  it('never offers a decimal of a CLOSED family, however free it looks', () => {
    // design/ITEM-NUMBERING.md §2: 2.x, 3.x and 4.x are the old flat scheme, shut for
    // good, with 613 references to them written into 279 code files. Offering 4.103 back
    // would point a comment at the wrong job permanently. Found by running the report
    // against the real repo, which offered exactly that.
    expect(nextFreeBySubject(['2.9', '3.5', '4.102'])).toEqual([])
    expect(nextFreeBySubject(['4.102', '5.2'])).toEqual([{ subject: 5, next: '5.3' }])
  })

  it('never offers a gap back — a deleted number is spent for good', () => {
    // 7.2 and 7.3 gone means two items were deleted, and the archive says which.
    // Handing 7.2 out again would point two unrelated things at one name.
    expect(nextFreeBySubject(['7.1', '7.4'])).toEqual([{ subject: 7, next: '7.5' }])
  })

  it('counts by number, not by string: 7.100 beats 7.99', () => {
    // Alphabetically '7.100' < '7.99', which would offer back a number already in use.
    expect(nextFreeBySubject(['7.99', '7.100'])).toEqual([{ subject: 7, next: '7.101' }])
  })

  it('ignores anything that is not a bare major.minor', () => {
    expect(nextFreeBySubject(['v0.12.0', 'master', '', null, '7.1'])).toEqual([{ subject: 7, next: '7.2' }])
  })

  it('shows the table in the report, because the ceiling alone hid 7.5', () => {
    const printed = describeCeiling([{
      label: 'this branch (x)',
      highest: '14.2',
      entries: [{ ref: '7.5', name: 'a' }, { ref: '14.2', name: 'b' }]
    }]).join('\n')
    expect(printed).toContain('7 → 7.6')
    expect(printed).toContain('14 → 14.3')
  })
})

describe('ref-ceiling — reading names as well as numbers', () => {
  it('parses the live list as JSON, not by assuming name follows ref', () => {
    // The ranking control rewrites this file, so field order is its to change.
    const json = '{"items":[{"name":"Title first","kind":"defect","ref":"7.5"}]}'
    expect(entriesIn(json, '')).toEqual([{ ref: '7.5', name: 'Title first' }])
  })

  it('falls back to a regex when a branch is caught mid-edit with broken JSON', () => {
    const broken = '{"items":[{"ref": "7.5","name":"Half a list",'
    expect(entriesIn(broken, '')).toEqual([{ ref: '7.5', name: 'Half a list' }])
  })

  it('takes the title off an archive line, whichever separator it used', () => {
    const md = [
      '**4.95 — the Sales Dashboard.** ✅ Closed',
      '**4.88 - High Level Budget.** ✅ Closed'
    ].join('\n')
    expect(entriesIn('', md)).toEqual([
      { ref: '4.95', name: 'the Sales Dashboard' },
      { ref: '4.88', name: 'High Level Budget' }
    ])
  })

  it('reads a branch through git with its names intact', () => {
    const git = (args) => {
      if (args[0] !== 'show') { return null }
      if (args[1] === 'origin/feat/other:design/features/to-do-items.json') {
        return '{"items":[{"ref":"7.5","name":"Their job"}]}'
      }
      return null
    }
    expect(require('../../scripts/ref-ceiling').entriesOn(git, 'origin/feat/other'))
      .toEqual([{ ref: '7.5', name: 'Their job' }])
  })
})

describe('ref-ceiling — it can never block a push', () => {
  it('claims nothing when every git call fails', () => {
    // A failing git must produce silence, not a wrong ceiling and not an exception.
    const failing = () => null
    expect(ceilingLines(failing, 'feat/x', isCandidate, { live: '', archive: '' })).toBeNull()
  })

  it('leaves a THROWING git to the caller, which is where the guarantee lives', () => {
    // Deliberate: this module does not swallow errors, because a silent catch here
    // would hide a broken git from every other check too. check-branch-state.js wraps
    // the call in its own try/catch — the same shape as survey() and activeReport().
    const exploding = () => { throw new Error('git is not available') }
    expect(() => ceilingLines(exploding, 'feat/x', isCandidate, { live: '', archive: '' })).toThrow()
  })
})
