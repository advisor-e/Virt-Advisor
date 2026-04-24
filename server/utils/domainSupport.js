/**
 * Domain support reference loader — CommonJS version for the Restify backend.
 * Loads per-domain support JSON files and formats them for AI prompt injection.
 * One file per domain, loaded on demand and cached per process.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

const _cache = {}

function loadDomainSupport (domainId) {
  if (_cache[domainId]) return _cache[domainId]
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
  if (!ref) return null

  const lines = []
  lines.push(`## Domain Support Reference — ${ref.label}`)
  lines.push('')
  lines.push(ref.overview)
  lines.push('')

  for (const tool of (ref.support_tools || [])) {
    lines.push(`### ${tool.name}`)
    if (tool.purpose) lines.push(`**Purpose:** ${tool.purpose}`)
    if (tool.core_principle) lines.push(`**Core principle:** ${tool.core_principle}`)
    if (tool.when_to_use) lines.push(`**When to use:** ${tool.when_to_use}`)

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
      tool.phases.forEach(ph => {
        lines.push(`**Phase ${ph.phase} — ${ph.name}:**`)
        ph.steps.forEach(s => lines.push(`- *${s.name}:* ${s.guidance}`))
      })
    }

    if (tool.if_then_logic && tool.if_then_logic.length > 0) {
      lines.push('**If-then logic:**')
      tool.if_then_logic.forEach(l => {
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

module.exports = { formatDomainSupportForPrompt }
