/**
 * Domain support reference loader — CommonJS version for the Restify backend.
 * Loads per-domain support JSON files and formats them for AI prompt injection.
 * One file per domain, loaded on demand and cached per process.
 */

const { readFileSync, readdirSync } = require('fs')
const { resolve } = require('path')

const _cache = {}

function loadDomainSupport (domainId) {
  if (_cache[domainId]) { return _cache[domainId] }
  const filePath = resolve(process.cwd(), `data/${domainId}-domain-support.json`)
  try {
    _cache[domainId] = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    _cache[domainId] = null
  }
  return _cache[domainId]
}

function formatDomainSupportForPrompt (domainId) {
  const ref = loadDomainSupport(domainId)
  if (!ref) { return null }

  const lines = []
  lines.push(`## Domain Support Reference — ${ref.label}`)
  lines.push('')
  lines.push(ref.overview)
  lines.push('')

  for (const tool of (ref.support_tools || [])) {
    lines.push(`### ${tool.name}`)
    if (tool.purpose) { lines.push(`**Purpose:** ${tool.purpose}`) }
    if (tool.core_principle) { lines.push(`**Core principle:** ${tool.core_principle}`) }
    if (tool.when_to_use) { lines.push(`**When to use:** ${tool.when_to_use}`) }

    if (tool.key_benefits && tool.key_benefits.length > 0) {
      lines.push('**Key benefits:**')
      tool.key_benefits.forEach(b => lines.push(`- ${b}`))
    }

    if (tool.advisor_confidence_note) {
      lines.push(`**Advisor confidence note:** ${tool.advisor_confidence_note}`)
    }

    if (tool.key_script) {
      lines.push(`**Key script:** ${tool.key_script}`)
    }

    if (tool.phases && tool.phases.length > 0) {
      tool.phases.forEach((ph) => {
        lines.push(`**Phase ${ph.phase} — ${ph.name}:**`)
        ph.steps.forEach(s => lines.push(`- *${s.name}:* ${s.guidance}`))
      })
    }

    if (tool.if_then_logic && tool.if_then_logic.length > 0) {
      lines.push('**If-then logic:**')
      tool.if_then_logic.forEach((l) => {
        lines.push(`- IF ${l.condition} → ${l.action} *(${l.context})*`)
      })
    }

    if (tool.sequence_summary && tool.sequence_summary.length > 0) {
      lines.push('**Sequence:**')
      tool.sequence_summary.forEach(s => lines.push(`- ${s}`))
    }

    if (tool.key_concepts) {
      lines.push('**Key concepts:**')
      Object.entries(tool.key_concepts).forEach(([k, v]) => {
        lines.push(`- *${k}:* ${v}`)
      })
    }

    lines.push('')
  }

  if (ref.advisor_guidance) {
    lines.push('### Advisor Guidance')
    Object.values(ref.advisor_guidance).forEach(g => lines.push(`- ${g}`))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Scans data/ for all *-domain-support.json files and returns the domain ID
 * whose trigger_keywords best match the given query string.
 */
function detectDomainForSession (query) {
  const dataDir = resolve(process.cwd(), 'data')
  let files = []
  try { files = readdirSync(dataDir).filter(f => f.endsWith('-domain-support.json')) } catch (e) { return null }

  const lower = query.toLowerCase()
  let bestId = null
  let bestScore = 0

  for (const file of files) {
    const domainId = file.replace('-domain-support.json', '')
    const support = loadDomainSupport(domainId)
    if (!support) { continue }
    const score = (support.trigger_keywords || []).filter(kw => lower.includes(kw.toLowerCase())).length
    if (score > bestScore) { bestScore = score; bestId = domainId }
  }

  return bestScore > 0 ? bestId : null
}

/**
 * Formats a compact but useful domain context block for course session injection.
 * Includes: domain overview, advisor guidance, and any tools matching the session resource names.
 * Falls back to the first tool if no resource name matches.
 */
function formatDomainContextForSession (domainId, resourceNames) {
  const ref = loadDomainSupport(domainId)
  if (!ref) { return null }

  const lines = []
  lines.push(`## Domain Context — ${ref.label}`)
  lines.push('')
  if (ref.overview) { lines.push(ref.overview); lines.push('') }

  if (ref.diagnostic_entry) {
    const de = ref.diagnostic_entry
    if (de.primary_question) { lines.push(`**Diagnostic entry point:** ${de.primary_question}`); lines.push('') }
  }

  // Find tools that match the session resource names
  const resources = (resourceNames || []).map(r => r.toLowerCase())
  const tools = ref.support_tools || []
  const matched = tools.filter(t =>
    resources.some(r => t.name.toLowerCase().includes(r) || r.includes(t.name.toLowerCase().split(' ')[0]))
  )
  const toolsToShow = matched.length > 0 ? matched : tools.slice(0, 1)

  for (const tool of toolsToShow) {
    lines.push(`### ${tool.name}`)
    if (tool.purpose) { lines.push(`**Purpose:** ${tool.purpose}`) }
    if (tool.core_principle) { lines.push(`**Core principle:** ${tool.core_principle}`) }
    if (tool.when_to_use) { lines.push(`**When to use:** ${tool.when_to_use}`) }
    if (tool.frameworks && tool.frameworks.length > 0) {
      lines.push('**Frameworks within this tool:**')
      tool.frameworks.forEach(f => lines.push(`- **${f.name}** (p.${f.page || '?'}): ${f.what_it_does}`))
    }
    if (tool.key_design_principles && tool.key_design_principles.length > 0) {
      lines.push('**Key design principles:**')
      tool.key_design_principles.forEach(p => lines.push(`- ${p}`))
    }
    if (tool.phases && tool.phases.length > 0) {
      tool.phases.forEach((ph) => {
        lines.push(`**Phase ${ph.phase} — ${ph.name}:**`)
        ph.steps.forEach(s => lines.push(`- *${s.name}:* ${s.guidance}`))
      })
    }
    lines.push('')
  }

  if (ref.advisor_guidance) {
    lines.push('### Advisor Guidance')
    Object.values(ref.advisor_guidance).forEach(g => lines.push(`- ${g}`))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Compact domain summary for the course DESIGN phase.
 * Gives the design AI the tool progression and purpose without full step-by-step detail.
 */
function formatDomainSummaryForDesign (domainId) {
  const ref = loadDomainSupport(domainId)
  if (!ref) { return null }

  const lines = []
  lines.push(`## Domain Knowledge — ${ref.label}`)
  lines.push('')
  if (ref.overview) { lines.push(ref.overview); lines.push('') }

  if (ref.diagnostic_entry && ref.diagnostic_entry.primary_question) {
    lines.push(`**Diagnostic entry point:** ${ref.diagnostic_entry.primary_question}`)
    lines.push('')
  }

  lines.push('**Tools in this domain (use these as session resources, in sequence):**')
  for (const tool of (ref.support_tools || [])) {
    const useNote = tool.when_to_use ? ` — ${tool.when_to_use}` : ''
    lines.push(`- **${tool.name}**: ${tool.purpose}${useNote}`)
  }
  lines.push('')
  lines.push('*When building sessions in this domain, choose from these tools and sequence them as listed above.*')

  return lines.join('\n')
}

/**
 * Detects up to 2 most relevant domains from a query string.
 * Used in the design phase where conversations may span multiple domains.
 */
function detectDomainsForDesign (query) {
  const dataDir = resolve(process.cwd(), 'data')
  let files = []
  try { files = readdirSync(dataDir).filter(f => f.endsWith('-domain-support.json')) } catch (e) { return [] }

  const lower = query.toLowerCase()
  const scores = []

  for (const file of files) {
    const domainId = file.replace('-domain-support.json', '')
    const support = loadDomainSupport(domainId)
    if (!support) { continue }
    const score = (support.trigger_keywords || []).filter(kw => lower.includes(kw.toLowerCase())).length
    if (score > 0) { scores.push({ domainId, score }) }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(s => s.domainId)
}

module.exports = { formatDomainSupportForPrompt, detectDomainForSession, formatDomainContextForSession, formatDomainSummaryForDesign, detectDomainsForDesign }
