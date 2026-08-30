'use strict'

/**
 * Puts `NODE_ENV` back after every test, in every file.
 *
 * 🔴 WHY THIS EXISTS. Twenty-nine test files set `NODE_ENV = 'production'` to prove that a
 * database failure surfaces instead of falling back to a dev JSON file, then set it back on
 * the last line. Eight of them had no `finally` and no `afterEach`, so **the restore line is
 * skipped the moment an assertion above it throws** — and every later test in that file then
 * runs as though it were production.
 *
 * Reproduced 2026-08-25 before this was written. One deliberate failure in
 * `cases.routes.test.js` produced TWO:
 *
 *   ● listCases › returns 500 when the DB errors in production      (the real one)
 *   ● anonymiseCasePreview › outside production a failed read falls back to the dev file
 *
 * The second is a test whose whole subject is NOT being in production. That is the shape of
 * the intermittent red the item recorded: a run fails, the failures do not obviously relate,
 * and re-running clears it — which teaches everyone to re-run rather than read, and is how a
 * real break gets waved through.
 *
 * ⚠ IT IS A BACKSTOP, NOT PERMISSION. A test still ought to restore what it changed; this
 * only means forgetting cannot leak into the next test. Files that already restore in their
 * own `afterEach` are unaffected — theirs runs first, and both put back the same value.
 *
 * ⚠ AND IT DOES NOT MAKE MUTATING A GLOBAL MID-TEST SAFE. Anything the code under test
 * schedules and does not await can still read the value after it has been put back. Nothing
 * in the suite does that today; if a test ever needs the guarantee, it should inject the
 * value the code reads rather than reach for the environment.
 */

/**
 * ⚠ CAPTURED PER TEST, NOT ONCE PER PROCESS, and the difference matters. A file may set
 * `NODE_ENV` at module load because EVERY test in it is about production
 * (`mentorDeletePartial.routes.test.js` does). Restoring to the process's original would
 * undo that after the first test and break the rest of the file. Restoring to whatever was
 * in force when this test began leaves such a file alone and still stops a leak.
 */
let hadIt = false
let before

beforeEach(() => {
  hadIt = Object.prototype.hasOwnProperty.call(process.env, 'NODE_ENV')
  before = process.env.NODE_ENV
})

afterEach(() => {
  if (!hadIt) {
    delete process.env.NODE_ENV
  } else if (process.env.NODE_ENV !== before) {
    process.env.NODE_ENV = before
  }
})
