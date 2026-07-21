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

  // Governance framework §11.2 — coverage requirements
  collectCoverageFrom: [
    'server/courseEngine.js',
    'server/utils/**/*.js',
    'server-middleware/**/*.js',
    '!node_modules/**'
  ],

  // Per-file thresholds enforcing governance framework §11.2
  coverageThreshold: {
    global: {
      lines: 80
    },
    './server/utils/validateAIResponse.js': {
      lines: 100,
      branches: 100,
      functions: 100,
      statements: 100
    },
    './server/utils/sanitiseInput.js': {
      lines: 90,
      branches: 85
    },
    // CB-13 (design/COURSE-BUILDER-PLAN.md Phase 5): the course engine was
    // untested until 2026-07-15; locked at the ≥90% route standard so it
    // cannot quietly slip back (measured 92% lines at lock time).
    './server/courseEngine.js': {
      lines: 90
    }
  }
}
