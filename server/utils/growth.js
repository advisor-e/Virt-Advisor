const { readFileSync } = require('fs')
const { resolve } = require('path')

let _data = null

function loadGrowthData () {
  if (_data) return _data
  try {
    _data = JSON.parse(readFileSync(resolve(process.cwd(), 'data/growth-fundamentals.json'), 'utf8'))
  } catch (err) {
    console.error('[growth] Failed to load growth-fundamentals.json:', err.message)
    _data = { philosophy: '', stages: [], growthAspects: [], keyConceptsForAdvisors: {} }
  }
  return _data
}

const GROWTH_STAGE_NAMES = [
  'Design', 'Launch', 'Break-even', 'Lifestyle', 'Leverage',
  'Reach', 'Leapfrog', 'Maturity', 'Exit / Decline', 'Exit/Decline'
]

/**
 * Returns true if the conversation history contains a growth stage selection.
 */
function conversationHasGrowthStage (conversationHistory) {
  const text = conversationHistory.map(m => m.content || '').join(' ')
  return GROWTH_STAGE_NAMES.some(name => text.toLowerCase().includes(name.toLowerCase()))
}

/**
 * Formats the full Growth Fundamentals reference for inclusion in the AI context.
 * If a specific stage name is detected in the history, that stage's detail is highlighted first.
 */
function formatGrowthFundamentalsForPrompt (conversationHistory) {
  const data = loadGrowthData()
  const historyText = (conversationHistory || []).map(m => m.content || '').join(' ')

  // Find which stage was selected — case-insensitive, no suffix required
  const lowerHistory = historyText.toLowerCase()
  const selectedStage = data.stages.find(s => lowerHistory.includes(s.name.toLowerCase()))

  const lines = []
  lines.push('## Growth Fundamentals Reference')
  lines.push('')
  lines.push(data.philosophy)
  lines.push('')

  if (selectedStage) {
    lines.push(`### Selected Stage: ${selectedStage.name}`)
    lines.push(`**Description:** ${selectedStage.description}`)
    lines.push(`**What got them here:** ${selectedStage.whatGotYouHere}`)
    lines.push(`**What holds them back:** ${selectedStage.whatHoldsYouBack}`)
    lines.push(`**Growth Focus Tactic:** ${selectedStage.growthTactic}`)
    lines.push(`**Complexity Layer:** ${selectedStage.complexityLayer} — Psyche error to watch for: ${selectedStage.psycheError}`)
    if (selectedStage.keyNote) {
      lines.push(`**Key Advisor Note:** ${selectedStage.keyNote}`)
    }
    lines.push('')
  }

  lines.push('### All Growth Stages — What Got Them Here / What Holds Them Back')
  for (const stage of data.stages) {
    lines.push(`**${stage.name}:** Got here via — ${stage.whatGotYouHere} | Held back by — ${stage.whatHoldsYouBack} | Tactic: ${stage.growthTactic}`)
  }
  lines.push('')

  lines.push('### 9 Growth Aspects (balanced areas to address at every stage)')
  for (const aspect of data.growthAspects) {
    lines.push(`- **${aspect.name}:** ${aspect.description}`)
  }
  lines.push('')

  lines.push('### Key Concepts for Advisors')
  lines.push(`**Devil's Toilet:** ${data.keyConceptsForAdvisors.devilsToilet}`)
  lines.push(`**The Split Point:** ${data.keyConceptsForAdvisors.splitPoint}`)
  lines.push(`**Lite vs Full Framework:** ${data.keyConceptsForAdvisors.liteVsFull}`)

  return lines.join('\n')
}

module.exports = { formatGrowthFundamentalsForPrompt, conversationHasGrowthStage }
