module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true
  },
  extends: ['@nuxtjs'],
  rules: {
    // Governance framework §14.2 — mandatory rules
    'no-unused-vars': 'error',
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
    'prefer-const': 'error',

    // Vue 2 / Pug template accommodations
    'vue/html-self-closing': 'off', // Pug handles self-closing differently
    'vue/multi-word-component-names': 'off', // Single-word names exist in this project
    'vue/no-v-html': 'off', // v-html is used with DOMPurify — safe, audited

    // Spacing and style — warn only, not blocking
    'space-before-function-paren': 'off',
    indent: 'off' // Handled by Pug indentation rules
  },
  overrides: [
    {
      // CommonJS backend files — allow require() and module.exports
      files: ['server-middleware/**/*.js', 'server/**/*.js', 'scripts/**/*.js'],
      env: { node: true, browser: false },
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      // Jest test files — expose Jest globals (describe, test, expect, jest, etc.)
      files: ['tests/**/*.test.js'],
      env: { jest: true, node: true, browser: false }
    }
  ]
}
