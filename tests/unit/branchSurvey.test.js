'use strict'

const {
  isCandidate,
  selectBranches,
  handoverNote,
  describeSurvey,
  surveyLines
} = require('../../scripts/branch-survey')

/**
 * The branch survey (`startup-blind-to-other-machine`, P1).
 *
 * check-branch-state.js had NO test of any kind, which is part of why the blind spot
 * survived four sightings: there was nothing to add a case to. The git calls sit behind
 * an injected runner so the whole path — including the fetch-failed route — is pinned
 * here without a sandbox repository.
 *
 * The two properties that matter most are negative ones: it must never report noise
 * (a report that cries wolf is turned off), and it must never be able to affect a push.
 */
describe('branch-survey — isCandidate', () => {
  it('ignores master — being ahead of itself is not news', () => {
    expect(isCandidate('origin/master', 'feat/advisor-progress')).toBe(false)
  })

  it('ignores the bare `origin` entry, which is the remote HEAD pointer', () => {
    // `refs/remotes/origin/HEAD` shortens to `origin` — the one entry that does not
    // look like the others, and so the one that slips through a naive name filter.
    expect(isCandidate('origin', 'feat/advisor-progress')).toBe(false)
    expect(isCandidate('origin/HEAD', 'feat/advisor-progress')).toBe(false)
  })

  it('ignores our own branch — rule 1 already measures it exactly', () => {
    expect(isCandidate('origin/feat/advisor-progress', 'feat/advisor-progress')).toBe(false)
  })

  it('ignores release/* snapshots, which are ahead of master by design', () => {
    // Frozen PR snapshots are never merged back, so they are permanently ahead. PR #30
    // was raised from one. Reporting them would be noise on every single run.
    expect(isCandidate('origin/release/report-programme-2026-08-02', 'feat/x')).toBe(false)
    expect(isCandidate('origin/release/firm-quiz-builder-2026-08-02', 'feat/x')).toBe(false)
  })

  it('keeps another machine\'s feature branch', () => {
    expect(isCandidate('origin/feat/firm-quiz-builder-ui', 'feat/advisor-progress')).toBe(true)
  })

  it('keeps a branch whose name merely CONTAINS release', () => {
    // The rule is a prefix, not a substring: `feat/release-notes` is ordinary work.
    expect(isCandidate('origin/feat/release-notes', 'feat/x')).toBe(true)
  })
})

describe('branch-survey — selectBranches', () => {
  const rows = [
    { ref: 'origin/feat/firm-quiz-builder-ui', ahead: 4, behind: 75, lastCommit: '2026-08-01' },
    { ref: 'origin/chore/i18n-jsdoc-cleanup', ahead: 1, behind: 487, lastCommit: '2026-06-30' },
    { ref: 'origin/feat/course-builder-v3', ahead: 0, behind: 289, lastCommit: '2026-07-12' },
    { ref: 'origin/master', ahead: 0, behind: 0, lastCommit: '2026-08-02' },
    { ref: 'origin', ahead: 0, behind: 0, lastCommit: '2026-08-02' }
  ]

  it('drops a branch with nothing ahead of master', () => {
    // 289 behind and 0 ahead means everything it ever held is already in master.
    const names = selectBranches(rows, 'feat/advisor-progress').map(r => r.ref)
    expect(names).not.toContain('origin/feat/course-builder-v3')
  })

  it('keeps only the branches carrying unmerged commits', () => {
    expect(selectBranches(rows, 'feat/advisor-progress').map(r => r.ref)).toEqual([
      'origin/feat/firm-quiz-builder-ui',
      'origin/chore/i18n-jsdoc-cleanup'
    ])
  })

  it('puts the most recently touched branch first', () => {
    // An abandoned branch must never sit above the one you might collide with today.
    const out = selectBranches(rows, 'feat/advisor-progress')
    expect(out[0].ref).toBe('origin/feat/firm-quiz-builder-ui')
  })

  it('re-applies the name filter rather than trusting the caller', () => {
    // The filtering rules are the point of the file; they hold whoever calls it.
    const out = selectBranches(
      [{ ref: 'origin/master', ahead: 9, behind: 0, lastCommit: '2026-08-02' }],
      'feat/x'
    )
    expect(out).toEqual([])
  })

  it('survives a missing list rather than throwing inside the check', () => {
    expect(selectBranches(null, 'feat/x')).toEqual([])
    expect(selectBranches(undefined, 'feat/x')).toEqual([])
  })
})

describe('branch-survey — describeSurvey', () => {
  it('says nothing at all when every branch is merged', () => {
    // Silence is the common case. A block that prints "all clear" on every run is
    // scrolled past, and then the one time it says something it is scrolled past too.
    expect(describeSurvey([])).toBeNull()
    expect(describeSurvey(null)).toBeNull()
  })

  it('names the branch and both counts — the real 2026-08-02 case', () => {
    const text = describeSurvey([
      { ref: 'origin/feat/firm-quiz-builder-ui', ahead: 4, behind: 75, lastCommit: '2026-08-01' }
    ]).join('\n')

    expect(text).toContain('feat/firm-quiz-builder-ui')
    expect(text).toContain('4 ahead')
    expect(text).toContain('75 behind')
    expect(text).toContain('2026-08-01')
  })

  it('says plainly that nothing is blocked', () => {
    // The message must not read as an error. It reports somebody else's state, and a
    // reader who thinks their own push is in trouble will start "fixing" the wrong thing.
    const text = describeSurvey([
      { ref: 'origin/feat/x', ahead: 1, behind: 2, lastCommit: '2026-08-01' }
    ]).join('\n')
    expect(text).toContain('Nothing is blocked')
  })

  it('points at the backlog entry it came from', () => {
    const text = describeSurvey([
      { ref: 'origin/feat/x', ahead: 1, behind: 2, lastCommit: '2026-08-01' }
    ]).join('\n')
    expect(text).toContain('startup-blind-to-other-machine')
  })
})

describe('branch-survey — surveyLines (git at the edge)', () => {
  /**
   * A fake git runner. Returns null for anything not scripted, exactly as the real
   * `gitSafe` does when a command fails.
   * @param {Object} responses keyed by the joined argument list
   * @returns {function(string[]): (string|null)} runner
   */
  function fakeGit (responses) {
    return function (args) {
      const key = args.join(' ')
      return Object.prototype.hasOwnProperty.call(responses, key) ? responses[key] : null
    }
  }

  const REFS = 'for-each-ref --format=%(refname:short)\t%(committerdate:short) refs/remotes/origin'

  it('reports nothing when the wider fetch fails, and asks git nothing else', () => {
    // THE PROPERTY THAT MATTERS: check-branch-state fetches `master` alone for its
    // drift rule. If this survey's own fetch fails it must go quiet, never degrade
    // that rule into "unverified" — a push must not be affected by a report.
    const calls = []
    const git = (args) => { calls.push(args.join(' ')); return null }

    expect(surveyLines(git, 'feat/advisor-progress')).toBeNull()
    expect(calls).toEqual(['fetch origin --quiet'])
  })

  it('reports nothing when there are no remote refs to read', () => {
    const git = fakeGit({ 'fetch origin --quiet': '', [REFS]: '' })
    expect(surveyLines(git, 'feat/advisor-progress')).toBeNull()
  })

  it('counts against origin/master, never the local master', () => {
    // A local `master` here can be weeks stale or absent — this repo reaches master by
    // pull request. Counting against it would make every number quietly wrong.
    const calls = []
    const git = (args) => {
      calls.push(args.join(' '))
      if (args[0] === 'fetch') { return '' }
      if (args[0] === 'for-each-ref') { return 'origin/feat/other\t2026-08-01' }
      return '75\t4'
    }

    surveyLines(git, 'feat/advisor-progress')
    expect(calls).toContain('rev-list --left-right --count origin/master...origin/feat/other')
    expect(calls.join('\n')).not.toContain('--count master...')
  })

  it('does not spend a count on a branch it would never report', () => {
    // Pruning by name before counting is why this is cheap enough to run on a push.
    const calls = []
    const git = (args) => {
      calls.push(args.join(' '))
      if (args[0] === 'fetch') { return '' }
      if (args[0] === 'for-each-ref') {
        return [
          'origin\t2026-08-02',
          'origin/master\t2026-08-02',
          'origin/feat/advisor-progress\t2026-08-02',
          'origin/release/report-programme-2026-08-02\t2026-08-02'
        ].join('\n')
      }
      return '0\t0'
    }

    expect(surveyLines(git, 'feat/advisor-progress')).toBeNull()
    expect(calls.filter(c => c.indexOf('rev-list') === 0)).toEqual([])
  })

  it('drives the whole path end to end on the real 2026-08-02 state', () => {
    const git = fakeGit({
      'fetch origin --quiet': '',
      [REFS]: [
        'origin\t2026-08-02',
        'origin/master\t2026-08-02',
        'origin/feat/advisor-progress\t2026-08-02',
        'origin/feat/firm-quiz-builder-ui\t2026-08-01',
        'origin/release/report-programme-2026-08-02\t2026-08-02',
        'origin/feat/course-builder-v3\t2026-07-12'
      ].join('\n'),
      'rev-list --left-right --count origin/master...origin/feat/firm-quiz-builder-ui': '75\t4',
      'rev-list --left-right --count origin/master...origin/feat/course-builder-v3': '289\t0'
    })

    const text = surveyLines(git, 'feat/advisor-progress').join('\n')

    expect(text).toContain('feat/firm-quiz-builder-ui')
    expect(text).toContain('4 ahead, 75 behind')
    // Fully merged, our own branch, the snapshot and the HEAD pointer all stay out.
    expect(text).not.toContain('course-builder-v3')
    expect(text).not.toContain('advisor-progress')
    expect(text).not.toContain('release/')
  })
})

/**
 * The other machine's handover, read from ITS branch — item 14.2's second half.
 *
 * 🔴 WHAT THIS PREVENTS, TWICE OVER. Startup compares handover dates using the copy of
 * `HANDOVER-desktop.md` in THIS machine's working tree, which is frozen at the last merge.
 * On 2026-09-14 a session called the desktop idle since 2026-09-10 when its real note was
 * two days newer, and on 2026-09-15 it read a note dated the 13th while the desktop's own
 * branch carried one from the 15th. Both times the file existed, parsed and had a date —
 * so nothing could look wrong. Only reading the other branch settles it.
 */
describe('branch-survey — the other machine handover note', () => {
  describe('handoverNote', () => {
    it('says nothing for a branch that is nobody machine', () => {
      expect(handoverNote({ machine: null, handoverDate: '2026-09-15', lastCommit: '2026-09-15' })).toBeNull()
      expect(handoverNote(null)).toBeNull()
    })

    it('reports a note written on the same day as the last commit as current', () => {
      const s = handoverNote({ machine: 'desktop', handoverDate: '2026-09-15', lastCommit: '2026-09-15' })
      expect(s).toContain('desktop')
      expect(s).toContain('2026-09-15')
      expect(s).toContain('current')
    })

    it('🔴 CALLS OUT A NOTE OLDER THAN ITS OWN BRANCH last commit', () => {
      // The real 2026-09-14 shape: committed on the 15th, note still dated the 13th.
      const s = handoverNote({ machine: 'desktop', handoverDate: '2026-09-13', lastCommit: '2026-09-15' })
      expect(s).toContain('OLDER')
      expect(s).toContain('2026-09-13')
      expect(s).toContain('2026-09-15')
      expect(s).not.toContain('current')
    })

    it('🔴 REFUSES TO CALL A FORWARD-DATED NOTE CURRENT', () => {
      // The real 2026-09-21 shape: the desktop's note headed 2026-09-22 with every commit
      // on its branch dated the 21st. A typed date ahead of the work cannot prove
      // freshness, and calling it current is how a genuinely stale note passes unseen.
      const s = handoverNote({ machine: 'desktop', handoverDate: '2026-09-22', lastCommit: '2026-09-21' })
      expect(s).toContain('LATER')
      expect(s).toContain('2026-09-22')
      expect(s).toContain('2026-09-21')
      expect(s).not.toContain('current, and read')
    })

    it('says so plainly when the branch carries no note at all', () => {
      const s = handoverNote({ machine: 'desktop', handoverDate: null, lastCommit: '2026-09-15' })
      expect(s).toContain('no handover')
    })

    it('does not call a note stale when the branch commit date is unknown', () => {
      const s = handoverNote({ machine: 'laptop', handoverDate: '2026-09-15', lastCommit: '' })
      expect(s).not.toContain('OLDER')
    })
  })

  describe('through surveyLines', () => {
    const REFS_CMD = 'for-each-ref --format=%(refname:short)\t%(committerdate:short) refs/remotes/origin'

    /** The desktop branch, ahead of master, with whatever note is given. */
    function run (note, commitDate) {
      const responses = {
        'fetch origin --quiet': '',
        [REFS_CMD]: 'origin/feat/firm-quiz-builder-ui\t' + commitDate,
        'rev-list --left-right --count origin/master...origin/feat/firm-quiz-builder-ui': '0\t89'
      }
      if (note !== null) {
        responses['show origin/feat/firm-quiz-builder-ui:design/HANDOVER-desktop.md'] = note
      }
      const git = (args) => {
        const key = args.join(' ')
        return Object.prototype.hasOwnProperty.call(responses, key) ? responses[key] : null
      }
      return surveyLines(git, 'feat/advisor-progress').join('\n')
    }

    it('reads the note from the OTHER branch, not from this working tree', () => {
      const calls = []
      const git = (args) => {
        calls.push(args.join(' '))
        if (args[0] === 'fetch') { return '' }
        if (args[0] === 'for-each-ref') { return 'origin/feat/firm-quiz-builder-ui\t2026-09-15' }
        if (args[0] === 'rev-list') { return '0\t89' }
        return '## 2026-09-15 · Desktop\n'
      }
      surveyLines(git, 'feat/advisor-progress')
      expect(calls).toContain('show origin/feat/firm-quiz-builder-ui:design/HANDOVER-desktop.md')
    })

    it('prints the date it found on that branch', () => {
      expect(run('## 2026-09-15 · Desktop · branch `feat/firm-quiz-builder-ui`\n', '2026-09-15'))
        .toContain('desktop handover dated 2026-09-15')
    })

    it('🔴 FLAGS THE NOTE THAT CAUSED THE FALSE STALENESS REPORT', () => {
      expect(run('## 2026-09-13 · Desktop\n', '2026-09-15')).toContain('OLDER than its last commit')
    })

    it('reports a branch with no note rather than staying silent about it', () => {
      expect(run(null, '2026-09-15')).toContain('no handover note on that branch')
    })

    it('spends no git call on a branch that belongs to no machine', () => {
      const calls = []
      const git = (args) => {
        calls.push(args.join(' '))
        if (args[0] === 'fetch') { return '' }
        if (args[0] === 'for-each-ref') { return 'origin/feat/somebody-else\t2026-09-15' }
        return '0\t3'
      }
      surveyLines(git, 'feat/advisor-progress')
      expect(calls.filter(c => c.indexOf('show ') === 0)).toEqual([])
    })

    it('still reports the branch when the note cannot be read — it must never throw', () => {
      // A survey failure must never turn a working drift check into an unverified one.
      const text = run(null, '2026-09-15')
      expect(text).toContain('feat/firm-quiz-builder-ui')
      expect(text).toContain('89 ahead')
    })
  })
})
