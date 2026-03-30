import { readFileSync } from 'fs'
import { resolve } from 'path'

let _coaching = null

function loadCoaching() {
  if (_coaching) return _coaching
  const filePath = resolve(process.cwd(), 'data/coaching-reference.json')
  _coaching = JSON.parse(readFileSync(filePath, 'utf8'))
  return _coaching
}

/**
 * Format the coaching reference into a concise string for the Claude prompt.
 * Includes template name, what to look for, and sequencing hints.
 */
export function formatCoachingForPrompt() {
  const coaching = loadCoaching()
  return coaching.map(c => {
    const scenarios = (c.scenarios || []).map(s => `  - ${s}`).join('\n')
    return `**${c.template}**
What to look for: ${c.whatToLookFor}
Scenarios: \n${scenarios}
Where it leads: ${c.whereMayLead}`
  }).join('\n\n')
}
