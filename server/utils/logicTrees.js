/**
 * Logic tree loader and formatter — CommonJS version for the Restify backend.
 * Loads data/logic_trees.json and provides detection + formatting for prompt injection.
 *
 * Usage:
 *   const { detectLogicTree, formatLogicTreeForPrompt } = require('./utils/logicTrees')
 *
 *   const tree = detectLogicTree(firstMessage)           // returns tree object or null
 *   const block = formatLogicTreeForPrompt(tree)         // returns formatted string for context
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

let _trees = null
let _seminarsRef = null

function loadLogicTrees () {
  if (_trees) return _trees
  const filePath = resolve(process.cwd(), 'data/logic_trees.json')
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    _trees = data.trees || []
  } catch (err) {
    console.error('[logicTrees] Failed to load logic_trees.json:', err.message)
    _trees = []
  }
  return _trees
}

/**
 * Detects which logic tree (if any) best matches the advisor's opening message.
 * Scores each tree by counting how many of its entry_triggers appear in the message.
 * Returns the highest-scoring tree, or null if nothing matches.
 */
function detectLogicTree (message) {
  const trees = loadLogicTrees()
  const lower = message.toLowerCase()

  let bestMatch = null
  let bestScore = 0

  for (const tree of trees) {
    const score = (tree.entry_triggers || []).filter(trigger =>
      lower.includes(trigger.toLowerCase())
    ).length

    if (score > bestScore) {
      bestScore = score
      bestMatch = tree
    }
  }

  return bestScore > 0 ? bestMatch : null
}

/**
 * Formats a single tree node into a readable text block for the AI.
 */
function formatNodeForPrompt (node, allNodes) {
  const lines = []

  lines.push(`**[${node.branch_name}]** (${node.type})`)
  lines.push(`Condition: ${node.condition}`)

  if (node.type === 'assessment' && node.gate_question) {
    lines.push(`Gate check: ${node.gate_question}`)
  }

  if (node.action) {
    lines.push(`Action: ${node.action}`)
  }

  if (node.question) {
    lines.push(`Ask: "${node.question}"`)
  }

  if (node.sales_process) {
    lines.push(`Sales process: ${node.sales_process}`)
  }

  if (node.templates && node.templates.length > 0) {
    lines.push(`Templates: ${node.templates.join(', ')}`)
  }

  if (node.templates_if_unsure && node.templates_if_unsure.length > 0) {
    lines.push(`Templates if client is unsure: ${node.templates_if_unsure.join(', ')}`)
  }

  if (node.support_templates && node.support_templates.length > 0) {
    lines.push(`Support with: ${node.support_templates[0]}`)
  }

  if (node.notes) {
    lines.push(`Notes: ${node.notes}`)
  }

  if (node.branches && node.branches.length > 0) {
    lines.push('Branches:')
    for (const branch of node.branches) {
      const targetNode = allNodes.find(n => n.id === branch.next_node)
      const targetName = targetNode ? targetNode.branch_name : branch.next_node
      lines.push(`  • If "${branch.answer_pattern}" → ${targetName}`)
    }
  }

  return lines.join('\n')
}

/**
 * Formats a full logic tree into a readable text block for injection into the AI context.
 */
function formatApproachGuidance (guidance) {
  if (!guidance || guidance.length === 0) return ''
  const lines = ['\n### Campaign Approach — Match HOW you reach out to the relationship warmth\n']
  for (const g of guidance) {
    lines.push(`**${g.method}**`)
    lines.push(`Relationship: ${g.relationship_status}`)
    if (g.step_detail) lines.push(`Steps: ${g.step_detail}`)
    lines.push(`Discovery meeting style: ${g.discovery_style}`)
    lines.push('')
  }
  return lines.join('\n')
}

function formatLogicTreeForPrompt (tree) {
  if (!tree) return ''

  const header = [
    `## Diagnostic Logic Tree — ${tree.name}`,
    '',
    tree.description,
    ''
  ].join('\n')

  const nodeBlocks = tree.nodes
    .map(node => formatNodeForPrompt(node, tree.nodes))
    .join('\n\n')

  const approachBlock = tree.approach_guidance
    ? formatApproachGuidance(tree.approach_guidance)
    : ''

  return header + nodeBlocks + approachBlock
}

/**
 * Loads the Trial Fit reference content for injection alongside the trial_fit tree.
 */
function loadTrialFitReference () {
  const filePath = resolve(process.cwd(), 'data/trial-fit-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load trial-fit-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Trial Fit reference content as a text block for the AI context.
 */
function formatTrialFitReferenceForPrompt () {
  const ref = loadTrialFitReference()
  if (!ref) return ''

  const lines = [
    '## Trial Fit Method — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.why_advisors_use_revenue_models) {
    const why = ref.why_advisors_use_revenue_models
    lines.push('### Why Advisors Use Revenue Models')
    lines.push(why.summary)
    for (const b of (why.benefits || [])) lines.push(`• ${b}`)
    if (why.key_script) lines.push(`Key script: ${why.key_script}`)
    if (why.advisor_confidence_note) lines.push(`Advisor confidence: ${why.advisor_confidence_note}`)
    lines.push('')
  }

  if (ref.when_to_use) {
    lines.push('### When to Use the Trial Fit Method')
    lines.push(`Client profile: ${ref.when_to_use.client_profile}`)
    lines.push('Indicators:')
    for (const ind of (ref.when_to_use.indicators || [])) {
      lines.push(`• ${ind}`)
    }
    if (ref.when_to_use.caution) lines.push(`Caution: ${ref.when_to_use.caution}`)
    lines.push('')
  }

  for (const stage of (ref.stages || [])) {
    lines.push(`### Stage ${stage.stage}: ${stage.name}`)
    lines.push(`Key principle: ${stage.key_principle}`)
    for (const point of (stage.coaching_points || [])) {
      lines.push(`• ${point}`)
    }
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) {
      lines.push(`• ${value}`)
    }
    lines.push('')
  }

  if (ref.additional_guidance) {
    lines.push('### Additional Guidance')
    for (const [key, value] of Object.entries(ref.additional_guidance)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Loads the Cautious Reveal reference content for injection alongside the cautious_reveal tree.
 */
function loadCautiousRevealReference () {
  const filePath = resolve(process.cwd(), 'data/cautious-reveal-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load cautious-reveal-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Cautious Reveal reference content as a text block for the AI context.
 */
function formatCautiousRevealReferenceForPrompt () {
  const ref = loadCautiousRevealReference()
  if (!ref) return ''

  const lines = [
    '## Cautious Reveal Method — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.why_advisors_use_revenue_models) {
    const why = ref.why_advisors_use_revenue_models
    lines.push('### Why Advisors Use Revenue Models')
    lines.push(why.summary)
    for (const b of (why.benefits || [])) lines.push(`• ${b}`)
    if (why.key_script) lines.push(`Key script: ${why.key_script}`)
    if (why.advisor_confidence_note) lines.push(`Advisor confidence: ${why.advisor_confidence_note}`)
    lines.push('')
  }

  if (ref.when_to_use) {
    lines.push('### When to Use the Cautious Reveal Method')
    lines.push(`Client profile: ${ref.when_to_use.client_profile}`)
    if (ref.when_to_use.typical_scenarios) {
      lines.push('Typical scenarios:')
      for (const s of ref.when_to_use.typical_scenarios) {
        lines.push(`• ${s}`)
      }
    }
    if (ref.when_to_use.contrast_with_trial_fit) lines.push(`Contrast with Trial Fit: ${ref.when_to_use.contrast_with_trial_fit}`)
    lines.push('')
  }

  for (const step of (ref.steps || [])) {
    lines.push(`### Step ${step.step}: ${step.name}`)
    lines.push(`Key principle: ${step.key_principle}`)
    for (const point of (step.coaching_points || [])) {
      lines.push(`• ${point}`)
    }
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) {
      lines.push(`• ${value}`)
    }
    lines.push('')
  }

  if (ref.additional_guidance) {
    lines.push('### Additional Guidance')
    for (const [key, value] of Object.entries(ref.additional_guidance)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Loads the Powerful Seminars reference content for injection alongside the public_speaking tree.
 */
function loadSeminarsReference () {
  if (_seminarsRef) return _seminarsRef
  const filePath = resolve(process.cwd(), 'data/powerful-seminars.json')
  try {
    _seminarsRef = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load powerful-seminars.json:', err.message)
    _seminarsRef = null
  }
  return _seminarsRef
}

/**
 * Formats the Powerful Seminars reference content as a text block for the AI context.
 * Includes the full stage guidance, delivery styles, and 8 delivery steps.
 */
function formatSeminarsReferenceForPrompt () {
  const ref = loadSeminarsReference()
  if (!ref) return ''

  const lines = [
    '## Powerful Seminars Reference — Detailed Coaching Content',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  for (const stage of (ref.stages || [])) {
    lines.push(`### Stage ${stage.stage}: ${stage.name}`)
    lines.push(`Key principle: ${stage.key_principle}`)

    if (stage.coaching_points) {
      for (const point of stage.coaching_points) {
        lines.push(`• ${point}`)
      }
    }

    if (stage.styles) {
      for (const style of stage.styles) {
        lines.push(`**${style.style}** — Use when: ${style.use_when}`)
        lines.push(`  Characteristics: ${style.characteristics}`)
        if (style.frame) lines.push(`  Frame: ${style.frame}`)
      }
      if (stage.delivery_circle) lines.push(`Delivery sequence: ${stage.delivery_circle}`)
    }

    if (stage.eight_steps) {
      for (const step of stage.eight_steps) {
        lines.push(`Step ${step.step}: ${step.name} — ${step.guidance}`)
      }
    }

    if (stage.cpd_example) {
      const ex = stage.cpd_example
      lines.push(`C.P.D. example — Concept: "${ex.concept}" | Principles: ${ex.principles.join(', ')}`)
    }

    lines.push('')
  }

  if (ref.additional_guidance) {
    lines.push('### Additional Guidance')
    for (const [key, value] of Object.entries(ref.additional_guidance)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

module.exports = { loadLogicTrees, detectLogicTree, formatLogicTreeForPrompt, formatSeminarsReferenceForPrompt, formatTrialFitReferenceForPrompt, formatCautiousRevealReferenceForPrompt }
