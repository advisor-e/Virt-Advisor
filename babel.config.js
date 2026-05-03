'use strict'

// Babel config for Jest — transpiles to CommonJS for Node 14 compatibility.
// Only active during test runs (babel-jest). Not used in production builds.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ]
}
