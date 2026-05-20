'use strict'

const fs = require('fs')
const path = require('path')

const _cache = {}

function loadPrompt (name) {
  if (_cache[name]) { return _cache[name] }
  const filePath = path.resolve(process.cwd(), 'data/prompts', name + '.txt')
  _cache[name] = fs.readFileSync(filePath, 'utf8')
  return _cache[name]
}

module.exports = { loadPrompt }
