'use strict'

const { describeUnstaged } = require('../../scripts/check-staged-tree')

/**
 * The pre-commit "gate 0" (`hook-tests-worktree-not-commit`, ruled 2026-08-02).
 *
 * The git call is at the edge of the script; the decision is this function, so these
 * tests pin the decision without needing a throwaway repository. What matters is that
 * it refuses on ANY tracked-but-unstaged edit and stays silent otherwise — a gate that
 * fired on a clean tree would be turned off within a week.
 */
describe('check-staged-tree — describeUnstaged', () => {
  it('says nothing when no tracked file has unstaged edits', () => {
    expect(describeUnstaged([])).toBeNull()
  })

  it('treats a blank line from git output as nothing, not as a file', () => {
    // `git diff --name-only` on a clean tree returns '', which splits to ['']. Reading
    // that as one file would block every commit in the repo.
    expect(describeUnstaged([''])).toBeNull()
    expect(describeUnstaged(['  ', ''])).toBeNull()
  })

  it('survives a missing list rather than throwing inside the hook', () => {
    expect(describeUnstaged(null)).toBeNull()
    expect(describeUnstaged(undefined)).toBeNull()
  })

  it('refuses on a single unstaged file and names it', () => {
    const out = describeUnstaged(['design/CONTENT-ROUTING.md'])
    expect(out).not.toBeNull()
    expect(out.join('\n')).toContain('design/CONTENT-ROUTING.md')
    expect(out[0]).toContain('1 tracked file(s)')
  })

  it('names every file, and counts them — the real 2026-08-02 case', () => {
    // The two files that were staged by the merge, then edited, then not re-added.
    const out = describeUnstaged(['design/CONTENT-ROUTING.md', 'tests/unit/componentStyles.test.js'])
    const text = out.join('\n')
    expect(out[0]).toContain('2 tracked file(s)')
    expect(text).toContain('design/CONTENT-ROUTING.md')
    expect(text).toContain('tests/unit/componentStyles.test.js')
  })

  it('tells the committer what to do, all three ways out', () => {
    const text = describeUnstaged(['a.js']).join('\n')
    expect(text).toContain('git add')
    expect(text).toContain('git restore')
    expect(text).toContain('git stash push')
  })

  it('does not offer --no-verify as a way past it', () => {
    // Deliberate: the Working Agreement forbids bypassing hooks, so the message must
    // not teach the bypass. (check-branch-state does mention it; that one guards drift
    // a human may legitimately need to override offline. This one guards a mistake.)
    expect(describeUnstaged(['a.js']).join('\n')).not.toContain('--no-verify')
  })
})
