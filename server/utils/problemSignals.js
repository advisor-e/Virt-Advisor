'use strict'

// Load signal dictionary — the single source of truth for phrase-to-signal mapping.
// Edit data/signal-dictionary.json to add phrases. No code changes required.
const _dict = require('../../data/signal-dictionary.json')

// Compile regex patterns once at module load — not on every request.
const _compiled = {}
for (const [signal, entry] of Object.entries(_dict.signals)) {
  _compiled[signal] = entry.patterns.map(p => new RegExp(p, 'i'))
}

// Export the signal registry for use by templateResolver (domain scope, penalty flags).
const SIGNAL_REGISTRY = Object.fromEntries(
  Object.entries(_dict.signals).map(([name, entry]) => [name, {
    domains: entry.domains || [],
    penaltyOnly: !!entry.penaltyOnly
  }])
)

// Plain-English description per signal — used by the cause-first confirmation to
// show the advisor the driver the engine identified (Phase 2). Sourced from the
// dictionary's own `description` field, so no new data is introduced.
const SIGNAL_DESCRIPTIONS = Object.fromEntries(
  Object.entries(_dict.signals).map(([name, entry]) => [name, entry.description || name])
)

/**
 * Extract structured problem signals from a free-text situationDiagnostic string.
 * Returns { signalName: matchCount } for any signal with at least one match.
 * Returns empty object if input is absent or not a real answer.
 *
 * To add a new phrase: edit data/signal-dictionary.json — no code change needed.
 */
function extractProblemSignals (text) {
  const result = {}
  if (!text || typeof text !== 'string' || text === 'pending') {
    return result
  }
  for (const [signalName, patterns] of Object.entries(_compiled)) {
    let count = 0
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        count++
      }
    }
    if (count > 0) {
      result[signalName] = count
    }
  }
  return result
}

module.exports = { extractProblemSignals, SIGNAL_REGISTRY, SIGNAL_DESCRIPTIONS }
