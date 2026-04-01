/**
 * Coaching reference loader — CommonJS version for the Restify backend.
 * Loads data/coaching-reference.json and formats it for the AI prompt.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

let _coaching = null

function loadCoaching () {
  if (_coaching) return _coaching
  const filePath = resolve(process.cwd(), 'data/coaching-reference.json')
  _coaching = JSON.parse(readFileSync(filePath, 'utf8'))
  return _coaching
}

function formatCoachingForPrompt () {
  const coaching = loadCoaching()
  return coaching.map(c => {
    const scenarios = (c.scenarios || []).map(s => `  - ${s}`).join('\n')
    return `**${c.template}**
What to look for: ${c.whatToLookFor}
Scenarios: \n${scenarios}
Where it leads: ${c.whereMayLead}`
  }).join('\n\n')
}

module.exports = { formatCoachingForPrompt }
