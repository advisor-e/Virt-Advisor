'use strict'

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],

  // Governance framework §11.2 — coverage requirements
  collectCoverageFrom: [
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
    }
  }
}
