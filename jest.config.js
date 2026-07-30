'use strict'

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],

  // Component tests opt into jsdom per-file with a `@jest-environment jsdom` docblock,
  // so the backend suite stays on the faster 'node' environment.
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': '@vue/vue2-jest'
  },
  // Components import via the Nuxt aliases; without these every test dies on its
  // first import.
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Globals jsdom omits that the app's dependencies expect — see the file for why.
  setupFiles: ['<rootDir>/tests/setupJsdom.js'],

  // Compile Pug the same way the app does. `pug-plain-loader` (the app's build path)
  // hardcodes `doctype: 'html'`; @vue/vue2-jest does not, so a valueless Pug attribute
  // — `@dragover.prevent`, `@submit.prevent`, `hidden` — expands to
  // `@dragover.prevent="@dragover.prevent"` and template compilation fails outright.
  // Without this, no component containing one can be tested at all.
  globals: {
    'vue-jest': { pug: { doctype: 'html' } }
  },

  // Coverage is collected on EVERY run, so the thresholds below are enforced by the
  // pre-commit hook rather than left to whoever remembers to type `npm run test:coverage`.
  // Rebuilt 2026-07-30 — see design/COVERAGE-DEBT.md for the reasoning and the debt list.
  //
  // The history that made this necessary: the previous `global: { lines: 80 }` was written
  // on 2026-05-04, when `collectCoverageFrom` reached 9 files in server/utils. That folder
  // now holds 47, an AI engine grew inside it, and — because nothing ever ran coverage —
  // nothing objected. The standard did not slip; the measured set grew underneath a number
  // no one was checking. Hence: measure everything the standard names, and enforce always.
  //
  // For the full per-file table (this config prints a summary only):
  //   npx jest --coverage --coverageReporters=text
  collectCoverage: true,
  coverageReporters: ['text-summary'],
  collectCoverageFrom: [
    'server/**/*.js',
    'server-middleware/**/*.js',
    'mixins/**/*.js',
    // Process bootstraps: run only by `npm run backend`, never imported by a test.
    // Collaborate's own config excluded its equivalent for the same reason.
    '!server/restify-server.js',
    '!server/collaborate/restify-server.js',
    '!node_modules/**'
  ],

  // TWO KINDS OF NUMBER LIVE HERE, and the difference matters:
  //
  //   STANDARDS — the figure CLAUDE.md §Testing actually asks for, in force because we
  //   currently meet it. Never lower one of these; raise the code to it.
  //
  //   FLOORS — a measured "no worse than today" ratchet on code that does NOT yet meet
  //   the standard. A floor is not a standard and never becomes one: the standard it owes
  //   is recorded against it in design/COVERAGE-DEBT.md with the lines outstanding. When
  //   tests are added, raise the floor in the same commit — that is the ratchet turning.
  //   Every floor below was measured on 2026-07-30, set one point under the actual so a
  //   trivial refactor cannot trip it.
  //
  // `global` is deliberately kept as a catch-all: every path we own is bucketed below, so
  // global matches nothing today — and therefore catches any NEW directory at the full
  // standard rather than letting new code land ungated.
  coverageThreshold: {
    global: { statements: 80, branches: 70, functions: 80, lines: 80 },

    // ── STANDARDS: met today, held here ─────────────────────────────────────────────
    // Financial models (business performance report). 100% lines across all 11 files;
    // CLAUDE.md treats financial logic as must-test, so this is held high deliberately.
    './server/report/': { statements: 96, branches: 85, functions: 99, lines: 99 },
    // firmAuth — the IDOR-safe guard every firm-scoped route depends on. Reached 100% on
    // all four metrics on 2026-07-30: the dev MENTOR bypass and the whole of
    // requireMentorRole (the one gate that deliberately crosses the firm boundary) had no
    // test at all. Held at 100 — nothing in this file may regress.
    './server/middleware/': { statements: 100, branches: 100, functions: 100, lines: 100 },
    // CB-13 (design/COURSE-BUILDER-PLAN.md Phase 5): the course engine was untested until
    // 2026-07-15; `lines: 90` is that original lock, unchanged. The other three metrics
    // were added 2026-07-30 as measured floors so branch coverage cannot rot behind it.
    './server/courseEngine.js': { statements: 88, branches: 77, functions: 86, lines: 90 },
    // AI-response validation and LLM input sanitisation: CLAUDE.md requires 100%.
    // sanitiseInput reached 100% branches on 2026-07-30 (the identity fields and the
    // case-review object were previously unexercised); its old `branches: 85` is retired
    // by being met, not by being lowered.
    './server/utils/sanitiseInput.js': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './server/utils/validateAIResponse.js': { statements: 100, branches: 100, functions: 100, lines: 100 },

    // ── FLOORS: below standard, ratcheted. Debt in design/COVERAGE-DEBT.md ──────────
    // Raised from 69/64/74/71 on 2026-07-30 (health.js 0→100%, cases.js 76→98.6%).
    // Cannot reach its 90% standard until firmManager.js (264 lines) and report.js (60)
    // are done — firmManager deliberately waits for Collaborate slice 2, which rewrites it.
    './server/routes/': { statements: 71, branches: 65, functions: 75, lines: 73 },
    // Was a floor at 65/58/79/66. The 13 learn-mode reference formatters were covered on
    // 2026-07-30 (tests/unit/learnReferenceFormatters.test.js), taking logicTrees.js from
    // 22% to 82% lines and this bucket from 67.9% to 84.1% — so it now EXCEEDS the 80%
    // standard, and the measured ratchet is the binding number rather than the standard.
    './server/utils/': { statements: 81, branches: 64, functions: 82, lines: 83 },
    './mixins/': { statements: 29, branches: 20, functions: 31, lines: 31 },
    './server-middleware/': { statements: 9, branches: 12, functions: 4, lines: 10 },
    './server/advisorEngine.js': { statements: 35, branches: 24, functions: 35, lines: 36 },
    './server/services/': { statements: 12, branches: 0, functions: 0, lines: 13 },

    // ── COLLABORATE: its own repo's standards, carried across on landing ────────────
    // Its `global: 88/78/88/88` averaged routes and utils together with these files; with
    // routes and the three 100% utils bucketed separately (jest scores each file against
    // its longest matching path), the remainder measures 84/79/94/84 — so this is a
    // re-partition of their gate, not a relaxation of it. Its routes and utils standards
    // are carried across untouched.
    //
    // Set from measurement AFTER `!server/collaborate/restify-server.js` is applied — the
    // first draft of this line was computed with that 0% boot file still in the bucket and
    // read 83/77/93/82, which would have left 13 points of silent slack under code that
    // actually measures 96/82/99/99. Recompute a bucket's floor whenever its exclusions change.
    './server/collaborate/': { statements: 95, branches: 80, functions: 97, lines: 98 },
    './server/collaborate/routes/': { statements: 90, branches: 80, functions: 90, lines: 90 },
    './server/collaborate/utils/sanitiseInput.js': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './server/collaborate/utils/validateAIResponse.js': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './server/collaborate/utils/productionGuard.js': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './mixins/collaborate/': { statements: 80, branches: 75, functions: 80, lines: 80 },
    './server-middleware/collaborate/': { statements: 99, branches: 84, functions: 99, lines: 99 }
  }
}
