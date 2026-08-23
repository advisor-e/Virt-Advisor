'use strict'

/**
 * Jest configuration for the VISUAL CHECKS — `npm run visual`.
 *
 * These are not unit tests. They drive a real Chromium against a running copy of the
 * application and assert the standards written in `design/VISUAL-CHECKS.md`. Jest is
 * used only for its assertions and its failure reporting; nothing here is shared with
 * the main suite.
 *
 * 🔴 WHY THIS IS A SEPARATE FILE RATHER THAN A FLAG ON jest.config.js.
 * The visual checks need the app running on port 3000. The pre-commit hook runs
 * `npm test`, and a hook that depends on a server being up is a hook that fails for
 * reasons that have nothing to do with the commit. Two things keep them apart, and the
 * first is the one that actually holds:
 *
 *   1. The FILENAME. The main config matches `**\/tests\/**\/*.test.js`; these files are
 *      named `*.visual.js`. A visual check therefore CANNOT be collected by the
 *      pre-commit run even if someone drops one in the wrong folder. jest.config.js
 *      needs no ignore rule and deliberately did not get one — an ignore rule is a
 *      thing that can be deleted, a naming mismatch is not.
 *   2. This config, which is only ever reached through `npm run visual`.
 *
 * Coverage is NOT collected here. The main config turns it on for every run with
 * thresholds attached; inheriting that would measure the whole backend against a run
 * that never imports it and fail on numbers that mean nothing.
 */
module.exports = {
  testEnvironment: 'node',

  // The naming rule above, stated once in code.
  testMatch: ['**/tests/visual/**/*.visual.js'],

  // Launching a browser, loading a server-rendered page and opening every panel on a
  // manager hub is slow by nature. Jest's 5-second default fails these on the clock
  // rather than on the screen, which is the least useful failure available.
  testTimeout: 180000,

  // One browser, one page at a time. These checks measure a laid-out page, and a
  // second Chromium competing for the same machine changes what gets measured.
  maxWorkers: 1,

  collectCoverage: false
}
