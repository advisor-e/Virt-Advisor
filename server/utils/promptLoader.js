'use strict'

const fs = require('fs')
const path = require('path')
const { NEVER_INVENT_GUARDRAIL } = require('./promptGuardrail')

const _cache = {}

function loadPrompt (name) {
  if (_cache[name]) { return _cache[name] }
  const filePath = path.resolve(process.cwd(), 'data/prompts', name + '.txt')
  // Tier 1: single-source the never-invent-firm-IP guardrail onto EVERY system
  // prompt. loadPrompt is only ever used to build system prompts (advisorEngine
  // + courseEngine), so prepending here guarantees no mode or code path can ship
  // a prompt without it — and there is exactly one copy to maintain.
  _cache[name] = NEVER_INVENT_GUARDRAIL + '\n\n---\n\n' + fs.readFileSync(filePath, 'utf8')
  return _cache[name]
}

module.exports = { loadPrompt }
