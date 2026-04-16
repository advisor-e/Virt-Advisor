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

/**
 * Loads the EOY Meeting reference content for injection alongside the eoy_meeting tree.
 */
function loadEoyReference () {
  const filePath = resolve(process.cwd(), 'data/eoy-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load eoy-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the EOY Meeting reference content as a text block for the AI context.
 */
function formatEoyReferenceForPrompt () {
  const ref = loadEoyReference()
  if (!ref) return ''

  const lines = [
    '## End of Year Meeting — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.templates && ref.templates.length) {
    lines.push('### EOY Template Suite')
    for (const t of ref.templates) {
      lines.push(`**${t.name}**`)
      lines.push(`Purpose: ${t.purpose}`)
      if (t.variants) {
        lines.push('Deck variants:')
        for (const v of t.variants) lines.push(`  • ${v.name}: ${v.use_when}`)
      }
      lines.push(`Helps advisor: ${t.helps_advisor}`)
      lines.push(`Helps owner: ${t.helps_owner}`)
      if (t.indicators) lines.push(`Indicators: ${t.indicators}`)
      lines.push('')
    }
  }

  if (ref.stages && ref.stages.length) {
    lines.push('### EOY Meeting Stages — Coaching Detail')
    for (const stage of ref.stages) {
      lines.push(`**Stage ${stage.stage}: ${stage.name}**`)
      lines.push(`Key principle: ${stage.key_principle}`)
      if (stage.coaching_points) {
        for (const point of stage.coaching_points) lines.push(`• ${point}`)
      }
      if (stage.difficult_client_handling) {
        lines.push('Difficult client handling:')
        for (const d of stage.difficult_client_handling) {
          lines.push(`  • ${d.type}: ${d.approach}`)
        }
      }
      lines.push('')
    }
  }

  if (ref.cash_volatility_strategies) {
    const cv = ref.cash_volatility_strategies
    lines.push('### Cash Volatility Strategies (WHAT-HOW Framework)')
    lines.push(cv.overview)
    lines.push(`Framework: ${cv.framework}`)
    for (const s of (cv.strategies || [])) {
      lines.push(`• ${s.area} — WHAT: ${s.what} | HOW: ${s.how}`)
    }
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Loads the Heald Matrix reference content for injection alongside the heald_matrix tree.
 */
function loadHealdMatrixReference () {
  const filePath = resolve(process.cwd(), 'data/heald-matrix-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load heald-matrix-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Heald Matrix reference content as a text block for the AI context.
 */
function formatHealdMatrixReferenceForPrompt () {
  const ref = loadHealdMatrixReference()
  if (!ref) return ''

  const lines = [
    '## The Heald Matrix — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.framework_purpose) {
    const fp = ref.framework_purpose
    lines.push('### Framework Purpose')
    lines.push(fp.overview)
    lines.push('Coping styles:')
    for (const cs of (fp.coping_styles || [])) {
      lines.push(`  • ${cs.style}: positive = ${cs.positive_state} | negative = ${cs.negative_state}. ${cs.note}`)
    }
    lines.push(`Why it works: ${fp.why_it_works}`)
    lines.push('')
  }

  if (ref.quadrants) {
    lines.push('### The Four Quadrants (reveal in this order)')
    for (const q of ref.quadrants) {
      lines.push(`${q.reveal_order}. ${q.name} (${q.position}): ${q.description}`)
    }
    lines.push('')
  }

  for (const step of (ref.steps || [])) {
    lines.push(`### Step ${step.step}: ${step.name}`)
    lines.push(`Key principle: ${step.key_principle}`)
    for (const point of (step.coaching_points || [])) lines.push(`• ${point}`)
    if (step.facilitation_prompts) {
      lines.push('Facilitation prompts:')
      for (const p of step.facilitation_prompts) lines.push(`  • "${p}"`)
    }
    if (step.closing_script) lines.push(`Closing script: "${step.closing_script}"`)
    if (step.email_template) lines.push(`Follow-up email template: ${step.email_template}`)
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) lines.push(`• ${value}`)
  }

  return lines.join('\n')
}

/**
 * Loads the Capacity, Capability, Opportunity reference content for injection alongside the capacity_capability_opportunity tree.
 */
function loadCCOReference () {
  const filePath = resolve(process.cwd(), 'data/capacity-capability-opportunity-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load capacity-capability-opportunity-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the CCO reference content as a text block for the AI context.
 */
function formatCCOReferenceForPrompt () {
  const ref = loadCCOReference()
  if (!ref) return ''

  const lines = [
    '## Capacity, Capability, Opportunity — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.framework_overview) {
    const ov = ref.framework_overview
    lines.push('### Framework Overview')
    lines.push(`Purpose: ${ov.purpose}`)
    lines.push(`Goldilocks conditions: ${ov.goldilocks_conditions}`)
    lines.push(`Legitimate constraints language: ${ov.legitimate_constraints_language}`)
    lines.push(`Advisor protection: ${ov.advisor_protection}`)
    lines.push('Delivery options:')
    for (const d of (ov.delivery_options || [])) lines.push(`  • ${d}`)
    lines.push('')
  }

  for (const pillar of (ref.pillars || [])) {
    lines.push(`### Pillar ${pillar.pillar}: ${pillar.name}`)
    lines.push(`Definition: ${pillar.definition}`)
    lines.push(`Key principle: ${pillar.key_principle}`)
    for (const point of (pillar.coaching_points || [])) lines.push(`• ${point}`)
    if (pillar.key_script) lines.push(`Key script: "${pillar.key_script}"`)
    if (pillar.not_yet_note) lines.push(`NOT YET note: ${pillar.not_yet_note}`)
    if (pillar.key_saying) lines.push(`Key saying: "${pillar.key_saying}"`)
    lines.push('')
  }

  if (ref.application_steps) {
    lines.push('### Application Steps')
    for (const step of ref.application_steps) {
      lines.push(`Step ${step.step} — ${step.name}: ${step.guidance}`)
    }
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) lines.push(`• ${value}`)
  }

  return lines.join('\n')
}

/**
 * Loads the Conflict Meeting reference content for injection alongside the conflict_meeting tree.
 */
function loadConflictMeetingReference () {
  const filePath = resolve(process.cwd(), 'data/conflict-meeting-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load conflict-meeting-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Conflict Meeting reference content as a text block for the AI context.
 */
function formatConflictMeetingReferenceForPrompt () {
  const ref = loadConflictMeetingReference()
  if (!ref) return ''

  const lines = [
    '## Framing a Conflict Meeting — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  for (const stage of (ref.stages || [])) {
    lines.push(`### Stage ${stage.stage}: ${stage.name}`)
    lines.push(`Key principle: ${stage.key_principle}`)
    for (const point of (stage.coaching_points || [])) lines.push(`• ${point}`)
    if (stage.santa_claus_sequence) {
      lines.push('Santa Claus sequence:')
      for (const q of stage.santa_claus_sequence) lines.push(`  • ${q.type}: "${q.question}"`)
    }
    if (stage.prescribed_cognitive_pathway) lines.push(`Prescribed cognitive pathway: ${stage.prescribed_cognitive_pathway}`)
    if (stage.closing_anchor) lines.push(`Closing anchor: ${stage.closing_anchor}`)
    if (stage.steps) {
      for (const s of stage.steps) {
        lines.push(`Step ${s.step} — ${s.name}:`)
        if (s.script) lines.push(`  Script: "${s.script}"`)
        if (s.scripts) s.scripts.forEach(sc => lines.push(`  Script: "${sc}"`))
        if (s.description) lines.push(`  ${s.description}`)
      }
    }
    if (stage.concepts) {
      for (const c of stage.concepts) {
        lines.push(`Concept ${c.concept} — ${c.name}: ${c.description}`)
        if (c.example_script) lines.push(`  Example: "${c.example_script}"`)
      }
    }
    if (stage.delivery_elements) {
      lines.push('Delivery elements:')
      for (const d of stage.delivery_elements) lines.push(`  • ${d.element}: ${d.description}`)
    }
    lines.push('')
  }

  if (ref.facilitator_framework) {
    const fw = ref.facilitator_framework
    lines.push('### Facilitator Framework — Sustain These Three Things')
    for (const p of (fw.pillars || [])) lines.push(`• ${p.pillar}: ${p.guidance}`)
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) lines.push(`• ${value}`)
  }

  return lines.join('\n')
}

/**
 * Loads the Growth Curve Reveal reference content for injection alongside the reveal_growth_curve tree.
 */
function loadGrowthCurveRevealReference () {
  const filePath = resolve(process.cwd(), 'data/growth-curve-reveal-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load growth-curve-reveal-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Growth Curve Reveal reference content as a text block for the AI context.
 */
function formatGrowthCurveRevealReferenceForPrompt () {
  const ref = loadGrowthCurveRevealReference()
  if (!ref) return ''

  const lines = [
    '## Revealing the Growth Curve — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  for (const step of (ref.steps || [])) {
    lines.push(`### Step ${step.step}: ${step.name}`)
    lines.push(`Key principle: ${step.key_principle}`)
    if (step.opening_script) lines.push(`Opening script: "${step.opening_script}"`)
    if (step.transition_script) lines.push(`Transition: "${step.transition_script}"`)
    if (step.closing_script) lines.push(`Closing script: "${step.closing_script}"`)
    if (step.yes_response) lines.push(`Yes response: "${step.yes_response}"`)
    if (step.persona_elements) {
      lines.push('Persona elements to develop:')
      for (const el of step.persona_elements) lines.push(`  • ${el}`)
    }
    if (step.sequence) {
      for (const part of step.sequence) {
        lines.push(`Part ${part.part} — ${part.name}: ${part.description}`)
        lines.push(`  Script: "${part.script}"`)
      }
    }
    if (step.relevance_questions) {
      lines.push('Relevance questions:')
      for (const q of step.relevance_questions) lines.push(`  • "${q}"`)
    }
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
 * Loads the Facilitation 101 reference content for injection alongside the facilitation_101 tree.
 */
function loadFacilitationReference () {
  const filePath = resolve(process.cwd(), 'data/facilitation-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load facilitation-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Facilitation 101 reference content as a text block for the AI context.
 */
function formatFacilitationReferenceForPrompt () {
  const ref = loadFacilitationReference()
  if (!ref) return ''

  const lines = [
    '## Facilitation 101 — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  for (const stage of (ref.stages || [])) {
    lines.push(`### Stage ${stage.stage}: ${stage.name}`)
    lines.push(`Key principle: ${stage.key_principle}`)
    if (stage.opening_script) lines.push(`Opening script: "${stage.opening_script}"`)
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
 * Loads the Deming's Volatility reference content for injection alongside the demings_volatility tree.
 */
function loadDemingsVolatilityReference () {
  const filePath = resolve(process.cwd(), 'data/demings-volatility-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load demings-volatility-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Deming's Volatility reference content as a text block for the AI context.
 */
function formatDemingsVolatilityReferenceForPrompt () {
  const ref = loadDemingsVolatilityReference()
  if (!ref) return ''

  const lines = [
    "## Deming's Theory of Volatility — Detailed Coaching Reference",
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.theory_overview) {
    lines.push('### Theory Overview')
    lines.push(`• The problem with averages: ${ref.theory_overview.the_problem_with_averages}`)
    lines.push(`• The solution: ${ref.theory_overview.the_solution}`)
    lines.push(`• Deming quote: "${ref.theory_overview.deming_quote}"`)
    lines.push('')
  }

  if (ref.variation_types) {
    lines.push('### The Four Variation Types')
    for (const v of ref.variation_types) {
      lines.push(`**${v.type}** (${v.frequency} / ${v.impact}): ${v.description}`)
      lines.push(`  Advisor note: ${v.advisor_note}`)
    }
    lines.push('')
  }

  if (ref.causation_correlation_coincidence) {
    const ccc = ref.causation_correlation_coincidence
    lines.push('### Causation, Correlation, and Coincidence')
    lines.push(ccc.description)
    for (const level of (ccc.levels || [])) {
      lines.push(`• ${level.level}: ${level.definition} Example: ${level.example}`)
    }
    lines.push(`Advisor note: ${ccc.advisor_note}`)
    lines.push('')
  }

  if (ref.caravan_metaphor) {
    lines.push('### The Caravan Metaphor')
    lines.push(ref.caravan_metaphor)
    lines.push('')
  }

  if (ref.application_steps) {
    lines.push('### Application Steps')
    for (const step of ref.application_steps) {
      lines.push(`**Step ${step.step} — ${step.name}:** ${step.guidance}`)
      if (step.options) {
        for (const opt of step.options) {
          lines.push(`  • ${opt.option}: ${opt.question} ${opt.detail}`)
        }
      }
    }
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Loads the Working Capital Cycle reference content for injection alongside the working_capital_cycle tree.
 */
function loadWorkingCapitalCycleReference () {
  const filePath = resolve(process.cwd(), 'data/working-capital-cycle-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load working-capital-cycle-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Working Capital Cycle reference content as a text block for the AI context.
 */
function formatWorkingCapitalCycleReferenceForPrompt () {
  const ref = loadWorkingCapitalCycleReference()
  if (!ref) return ''

  const lines = [
    '## Working Capital Cycle — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.capital_types) {
    lines.push('### Fixed vs Working Capital')
    lines.push(`• ${ref.capital_types.fixed_capital.label}: ${ref.capital_types.fixed_capital.description} Advisor note: ${ref.capital_types.fixed_capital.advisor_note}`)
    lines.push(`• ${ref.capital_types.working_capital.label}: ${ref.capital_types.working_capital.description} Advisor note: ${ref.capital_types.working_capital.advisor_note}`)
    lines.push('')
  }

  if (ref.the_cycle) {
    lines.push('### The Working Capital Cycle')
    lines.push(ref.the_cycle.description)
    lines.push(ref.the_cycle.cycle_speed_example)
    lines.push('')
  }

  if (ref.three_problem_types) {
    lines.push('### The Three Problem Types')
    for (const p of ref.three_problem_types) {
      lines.push(`**${p.type}**`)
      lines.push(`Trigger: ${p.trigger}`)
      lines.push(`Diagnosis: ${p.diagnosis}`)
      if (p.scenario) lines.push(`Scenario: ${p.scenario}`)
      if (p.advisor_note) lines.push(`Advisor note: ${p.advisor_note}`)
      if (p.funding_note) lines.push(`Funding note: ${p.funding_note}`)
      lines.push('')
    }
  }

  if (ref.cash_preservation_tactics) {
    lines.push('### Cash Preservation Tactics')
    for (const cat of (ref.cash_preservation_tactics.categories || [])) {
      lines.push(`**${cat.area}**`)
      for (const t of cat.tactics) {
        lines.push(`• ${t}`)
      }
      lines.push('')
    }
  }

  if (ref.cost_categories) {
    lines.push('### Cost Categories (Category Secrets Framework)')
    for (const cat of (ref.cost_categories.categories || [])) {
      lines.push(`• ${cat.label} (${cat.also_known_as}): ${cat.description} Focus: ${cat.focus}`)
    }
    lines.push('')
  }

  if (ref.management_effectiveness_audit) {
    lines.push('### Management Effectiveness Audit — Red Flags')
    for (const flag of (ref.management_effectiveness_audit.red_flags || [])) {
      lines.push(`• ${flag}`)
    }
    lines.push('')
  }

  if (ref.over_trading_warning) {
    lines.push('### Over-Trading Warning')
    lines.push(ref.over_trading_warning.description)
    lines.push(ref.over_trading_warning.risk)
    lines.push(ref.over_trading_warning.expansion_principle)
    lines.push('')
  }

  if (ref.discounting_danger) {
    lines.push('### Discounting Danger')
    lines.push(ref.discounting_danger.key_point)
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Loads the Ratio Analysis reference content for injection alongside the ratio_analysis tree.
 */
function loadRatioAnalysisReference () {
  const filePath = resolve(process.cwd(), 'data/ratio-analysis-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load ratio-analysis-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Ratio Analysis reference content as a text block for the AI context.
 */
function formatRatioAnalysisReferenceForPrompt () {
  const ref = loadRatioAnalysisReference()
  if (!ref) return ''

  const lines = [
    '## Ratio Analysis — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.advisory_staircase) {
    lines.push('### The Advisory Staircase')
    lines.push(ref.advisory_staircase.description)
    for (const s of (ref.advisory_staircase.steps || [])) {
      lines.push(`• Step ${s.step} — ${s.name}: ${s.description}`)
    }
    lines.push(`Advisor note: ${ref.advisory_staircase.advisor_note}`)
    lines.push('')
  }

  if (ref.know_thyself_first) {
    lines.push('### Know Thyself First')
    lines.push(ref.know_thyself_first.description)
    lines.push('Three perspectives required before using external benchmarks:')
    for (const p of (ref.know_thyself_first.three_perspectives || [])) {
      lines.push(`• ${p}`)
    }
    lines.push(`Advisor note: ${ref.know_thyself_first.advisor_note}`)
    lines.push('')
  }

  if (ref.when_data_is_less_relevant) {
    lines.push('### When Data Is Less Relevant')
    for (const c of (ref.when_data_is_less_relevant.conditions || [])) {
      lines.push(`**${c.label}**`)
      lines.push(c.explanation)
      if (c.example) lines.push(`Example: ${c.example}`)
      lines.push('')
    }
  }

  if (ref.common_size_year_on_year) {
    lines.push('### Common Size Year on Year Data')
    lines.push(ref.common_size_year_on_year.drag_race_metaphor)
    lines.push(ref.common_size_year_on_year.the_fix)
    for (const m of (ref.common_size_year_on_year.methods || [])) {
      lines.push(`• ${m.name}: ${m.method} ${m.purpose}`)
    }
    lines.push('')
  }

  if (ref.interrogate_benchmark_data) {
    lines.push('### Interrogate External Benchmark Data')
    lines.push('Questions to ask of any purchased benchmark data:')
    for (const q of (ref.interrogate_benchmark_data.questions_to_ask || [])) {
      lines.push(`• ${q}`)
    }
    lines.push(`Advisor note: ${ref.interrogate_benchmark_data.advisor_note}`)
    lines.push('')
  }

  if (ref.collaborative_approach) {
    lines.push('### Collaborative Approach')
    lines.push(ref.collaborative_approach.why_it_matters)
    lines.push(ref.collaborative_approach.manual_over_automated)
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Loads the Dashboard Discussions reference content for injection alongside the dashboard_discussions tree.
 */
function loadDashboardDiscussionsReference () {
  const filePath = resolve(process.cwd(), 'data/dashboard-discussions-reference.json')
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[logicTrees] Failed to load dashboard-discussions-reference.json:', err.message)
    return null
  }
}

/**
 * Formats the Dashboard Discussions reference content as a text block for the AI context.
 */
function formatDashboardDiscussionsReferenceForPrompt () {
  const ref = loadDashboardDiscussionsReference()
  if (!ref) return ''

  const lines = [
    '## Dashboard Discussions — Detailed Coaching Reference',
    '',
    `Objective: ${ref.objective}`,
    `Core principle: ${ref.core_principle}`,
    ''
  ]

  if (ref.session_mindset) {
    lines.push('### Session Mindset')
    lines.push(`• Advisor role: ${ref.session_mindset.advisor_role}`)
    lines.push(`• Client role: ${ref.session_mindset.client_role}`)
    lines.push(`• Session objective: ${ref.session_mindset.session_objective}`)
    lines.push('')
  }

  if (ref.the_3x3_framework) {
    lines.push('### The 3x3 Framework')
    lines.push(ref.the_3x3_framework.cause_event_effect)
    lines.push('')
    for (const cat of (ref.the_3x3_framework.cost_categories || [])) {
      lines.push(`**${cat.label} (${cat.cost_type})**`)
      lines.push(`Definition: ${cat.definition}`)
      lines.push(`To change these: ${cat.to_change_these}`)
      lines.push(`Tactical options: ${cat.tactical_options.join('; ')}`)
      lines.push('')
    }
  }

  if (ref.dashboard_metrics) {
    lines.push('### Dashboard Metrics')
    for (const m of ref.dashboard_metrics) {
      lines.push(`**${m.name}**`)
      lines.push(`Relates to: ${m.relates_to.join(', ')}`)
      lines.push(`What it highlights: ${m.what_it_highlights}`)
      if (m.variation_types) {
        for (const v of m.variation_types) {
          lines.push(`• ${v}`)
        }
      }
      lines.push('')
    }
  }

  if (ref.facilitation_process) {
    lines.push('### Facilitation Process')
    for (const step of ref.facilitation_process) {
      lines.push(`**Step ${step.step} — ${step.name}:** ${step.guidance}`)
    }
    lines.push('')
  }

  if (ref.key_concepts) {
    lines.push('### Key Concepts')
    for (const [key, value] of Object.entries(ref.key_concepts)) {
      lines.push(`• ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Builds the full reference text block for a given learn-mode tree.
 * Used by both learn mode (primary path) and the deep-dive offer in client/discover mode.
 * Returns a formatted string combining the tree prompt and its companion reference content,
 * or null if the tree is not a recognised learn-mode tree.
 */
function buildLearnReferenceText (tree) {
  if (!tree || tree.mode !== 'learn') return null

  let text = formatLogicTreeForPrompt(tree)

  if (tree.id === 'public_speaking') {
    const ref = formatSeminarsReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'trial_fit') {
    const ref = formatTrialFitReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'cautious_reveal') {
    const ref = formatCautiousRevealReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'eoy_meeting') {
    const ref = formatEoyReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'facilitation_101') {
    const ref = formatFacilitationReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'reveal_growth_curve') {
    const ref = formatGrowthCurveRevealReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'conflict_meeting') {
    const ref = formatConflictMeetingReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'capacity_capability_opportunity') {
    const ref = formatCCOReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'heald_matrix') {
    const ref = formatHealdMatrixReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'demings_volatility') {
    const ref = formatDemingsVolatilityReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'working_capital_cycle') {
    const ref = formatWorkingCapitalCycleReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'ratio_analysis') {
    const ref = formatRatioAnalysisReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  } else if (tree.id === 'dashboard_discussions') {
    const ref = formatDashboardDiscussionsReferenceForPrompt()
    if (ref) text += '\n\n---\n\n' + ref
  }

  return text
}

module.exports = { loadLogicTrees, detectLogicTree, formatLogicTreeForPrompt, formatSeminarsReferenceForPrompt, formatTrialFitReferenceForPrompt, formatCautiousRevealReferenceForPrompt, formatEoyReferenceForPrompt, formatFacilitationReferenceForPrompt, formatGrowthCurveRevealReferenceForPrompt, formatConflictMeetingReferenceForPrompt, formatCCOReferenceForPrompt, formatHealdMatrixReferenceForPrompt, formatDemingsVolatilityReferenceForPrompt, formatWorkingCapitalCycleReferenceForPrompt, formatRatioAnalysisReferenceForPrompt, formatDashboardDiscussionsReferenceForPrompt, buildLearnReferenceText }
