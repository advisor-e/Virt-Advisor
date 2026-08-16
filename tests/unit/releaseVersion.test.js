'use strict'

// 🔴 WHY THIS EXISTS. `package.json` said `0.6.0` while `v0.7.0` and `v0.8.0` were
// cut, tagged and offered to the master-app team — wrong through two whole releases
// and noticed by nobody, because nothing in the app reads it. That is exactly why it
// drifts: a number no code depends on has no failing test behind it, so the only
// thing holding it straight is somebody remembering during a release.
//
// It still matters. The Version-Pull Recording Rule (CLAUDE.md) exists so everyone
// can always answer "which version is running where", and the first place anyone
// looks inside a deployed folder is `package.json`. A stale number there does not
// break the app — it misinforms the person checking, which is worse than silence.
//
// The newest RELEASE-NOTES file is the reference rather than the git tag, because a
// test must run the same on a fresh clone with no tags fetched, and because it puts
// the two release steps in the right order: the notes are written first, then the
// version is stamped to match them.

const { readdirSync } = require('fs')
const { resolve } = require('path')

const DESIGN_DIR = resolve(__dirname, '..', '..', 'design')
const NOTES_RE = /^RELEASE-NOTES-v(\d+)\.(\d+)\.(\d+)\.md$/

/** @returns {Array<{version: string, parts: number[], file: string}>} newest first */
function releaseNotes () {
  const found = []
  for (const file of readdirSync(DESIGN_DIR)) {
    const m = NOTES_RE.exec(file)
    if (m) {
      found.push({
        version: m[1] + '.' + m[2] + '.' + m[3],
        parts: [Number(m[1]), Number(m[2]), Number(m[3])],
        file
      })
    }
  }
  // Numeric compare, not lexical — '0.10.0' must beat '0.9.0'.
  return found.sort((a, b) =>
    (b.parts[0] - a.parts[0]) || (b.parts[1] - a.parts[1]) || (b.parts[2] - a.parts[2])
  )
}

describe('the stamped version matches the newest release', () => {
  test('release notes exist to compare against', () => {
    expect(releaseNotes().length).toBeGreaterThan(0)
  })

  test('package.json carries the newest released version', () => {
    const newest = releaseNotes()[0]
    const pkg = require('../../package.json')

    // Named in the failure message: the fix is one of two edits, and which one
    // depends on where in a release you are standing.
    expect({ packageJson: pkg.version, newestNotes: newest.version }).toEqual({
      packageJson: newest.version,
      newestNotes: newest.version
    })
  })
})
