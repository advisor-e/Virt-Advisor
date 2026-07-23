/**
 * Domain support reference loader — CommonJS version for the Restify backend.
 * Loads per-domain support JSON files and formats them for AI prompt injection.
 * One file per domain, loaded on demand and cached per process.
 *
 * Firm-aware since Phase 0 (design/FIRM-EDITABLE-TABLES-PLAN.md §3): every
 * reader takes an optional `firmSupport` map (loadFirmDomainSupport) and
 * blends the firm's sparse override over the platform base at the point of
 * use. `_cache` holds the PLATFORM BASE ONLY — merged copies are built fresh
 * per call and never cached, so one firm's edits cannot reach another firm.
 */

const { readFileSync, readdirSync } = require('fs')
const { resolve } = require('path')
const { mergeEntry } = require('./firmContent')

const _cache = {}
let _domainFiles = null

function getDomainFiles () {
  if (_domainFiles) { return _domainFiles }
  const dataDir = resolve(process.cwd(), 'data')
  try {
    _domainFiles = readdirSync(dataDir).filter(f => f.endsWith('-domain-support.json'))
  } catch (e) {
    _domainFiles = []
  }
  return _domainFiles
}

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

/**
 * The domain-support entry the CURRENT REQUEST should see: the cached platform
 * base with the firm's sparse override (if any) merged over it. The merged
 * copy is built fresh on every call and NEVER written into _cache — that is
 * the cross-firm isolation guarantee. Overrides apply to existing domains
 * only; ids with no base file are ignored (adding whole new domains is a
 * later-phase decision).
 * @param {string} domainId
 * @param {Object|null} firmSupport - the firm's override map, keyed by domain id
 * @returns {Object|null}
 */
function resolveDomainSupport (domainId, firmSupport) {
  const base = loadDomainSupport(domainId)
  if (!base) { return base }
  const override = (firmSupport && typeof firmSupport === 'object' && !Array.isArray(firmSupport))
    ? firmSupport[domainId]
    : null
  if (!override || typeof override !== 'object' || Array.isArray(override)) { return base }
  return mergeEntry(base, override)
}

/**
 * Formats one four-column material (§0.5: name / summary / who & when / steps)
 * into prompt lines. The four-column `materials` shape is the re-authored
 * domain-support standard; files still on the legacy `support_tools` shape are
 * rendered by each caller's fallback branch, unchanged.
 * @param {{name?: string, summary?: string, who_when?: string, steps?: Array<string>}} material
 * @returns {Array<string>}
 */
function formatMaterialLines (material) {
  const lines = []
  if (!material || typeof material !== 'object') { return lines }
  lines.push(`### ${material.name}`)
  if (material.summary) { lines.push(material.summary) }
  if (material.who_when) { lines.push(`**Who & when it suits:** ${material.who_when}`) }
  if (Array.isArray(material.steps) && material.steps.length > 0) {
    lines.push('**How to use it:**')
    material.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`))
  }
  return lines
}

function formatDomainSupportForPrompt (domainId, firmSupport) {
  const ref = resolveDomainSupport(domainId, firmSupport)
  if (!ref) { return null }

  const lines = []
  lines.push(`## Domain Support Reference — ${ref.label}`)
  lines.push('')
  lines.push(ref.overview)
  lines.push('')

  // Four-column re-authored shape (§0.5) takes precedence; legacy support_tools
  // files fall through to the original rich renderer below.
  if (Array.isArray(ref.materials) && ref.materials.length > 0) {
    for (const material of ref.materials) {
      formatMaterialLines(material).forEach(l => lines.push(l))
      lines.push('')
    }
  } else {
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
  }

  if (ref.advisor_guidance) {
    lines.push('### Advisor Guidance')
    Object.values(ref.advisor_guidance).forEach(g => lines.push(`- ${g}`))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Learn-mode enrichment (Mike's ruling 2026-07-16): the domain-support file id
 * for a LEARN coaching tree, or null when the tree has no verified file.
 * Resolution order: an explicit `domainSupport` field on the tree (the
 * data-owned mapping in logic_trees.json — used where names don't align, e.g.
 * sales_process → get-sales) wins; otherwise the mechanical name conversion
 * (underscore → hyphen) applies when that file exists. No file → null: the
 * tree stays tree-reference-only. A mapping is NEVER guessed.
 *
 * @param {{id?: string, domainSupport?: string}|null} tree - a learn logic tree
 * @returns {string|null} a domain-support file id (without the suffix)
 */
function supportIdForLearnTree (tree) {
  if (!tree) { return null }
  const files = getDomainFiles()
  const explicit = (typeof tree.domainSupport === 'string' && tree.domainSupport.trim()) || null
  if (explicit) {
    return files.includes(`${explicit}-domain-support.json`) ? explicit : null
  }
  const mechanical = String(tree.id || '').replace(/_/g, '-')
  return (mechanical && files.includes(`${mechanical}-domain-support.json`)) ? mechanical : null
}

/**
 * Scans data/ for all *-domain-support.json files and returns the domain ID
 * whose trigger_keywords best match the given query string. A firm override
 * that edits trigger_keywords changes which domain fires FOR THAT FIRM — the
 * feature working as intended (plan §3, "a side effect to be deliberate about").
 * @param {string} query
 * @param {Object|null} [firmSupport] - the firm's override map (loadFirmDomainSupport)
 */
function detectDomainForSession (query, firmSupport) {
  const files = getDomainFiles()

  const lower = query.toLowerCase()
  let bestId = null
  let bestScore = 0

  for (const file of files) {
    const domainId = file.replace('-domain-support.json', '')
    const support = resolveDomainSupport(domainId, firmSupport)
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
function formatDomainContextForSession (domainId, resourceNames, firmSupport) {
  const ref = resolveDomainSupport(domainId, firmSupport)
  if (!ref) { return null }

  const lines = []
  lines.push(`## Domain Context — ${ref.label}`)
  lines.push('')
  if (ref.overview) { lines.push(ref.overview); lines.push('') }

  if (ref.diagnostic_entry) {
    const de = ref.diagnostic_entry
    if (de.primary_question) { lines.push(`**Diagnostic entry point:** ${de.primary_question}`); lines.push('') }
  }

  // Find materials/tools that match the session resource names
  const resources = (resourceNames || []).map(r => r.toLowerCase())

  // Four-column shape (§0.5): match materials by session resource name, else
  // show the first. Legacy support_tools files use the original branch.
  if (Array.isArray(ref.materials) && ref.materials.length > 0) {
    const matchedMaterials = ref.materials.filter(m =>
      resources.some(r => m.name.toLowerCase().includes(r) || r.includes(m.name.toLowerCase().split(' ')[0]))
    )
    const materialsToShow = matchedMaterials.length > 0 ? matchedMaterials : ref.materials.slice(0, 1)
    for (const material of materialsToShow) {
      formatMaterialLines(material).forEach(l => lines.push(l))
      lines.push('')
    }
  } else {
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
function formatDomainSummaryForDesign (domainId, firmSupport) {
  const ref = resolveDomainSupport(domainId, firmSupport)
  if (!ref) { return null }

  const lines = []
  lines.push(`## Domain Knowledge — ${ref.label}`)
  lines.push('')
  if (ref.overview) { lines.push(ref.overview); lines.push('') }

  if (ref.diagnostic_entry && ref.diagnostic_entry.primary_question) {
    lines.push(`**Diagnostic entry point:** ${ref.diagnostic_entry.primary_question}`)
    lines.push('')
  }

  // CB-33: these tool names are teaching concepts from the support file, NOT
  // template names — presenting them as resource candidates made the AI write
  // them into `resources`, where grounding (CB-02) rightly stripped them.
  lines.push('**Teaching frameworks in this domain (background knowledge for designing session content and order — these are NOT resource names):**')
  if (Array.isArray(ref.materials) && ref.materials.length > 0) {
    for (const material of ref.materials) {
      const whoNote = material.who_when ? ` — ${material.who_when}` : ''
      lines.push(`- **${material.name}**: ${material.summary}${whoNote}`)
    }
  } else {
    for (const tool of (ref.support_tools || [])) {
      const useNote = tool.when_to_use ? ` — ${tool.when_to_use}` : ''
      lines.push(`- **${tool.name}**: ${tool.purpose}${useNote}`)
    }
  }
  lines.push('')
  lines.push('*Use these frameworks to decide what each session teaches and in what order. Session "resources" must come only from the "Available templates and resources" list — never list a framework name above as a resource.*')

  return lines.join('\n')
}

/**
 * Detects up to 2 most relevant domains from a query string.
 * Used in the design phase where conversations may span multiple domains.
 */
function detectDomainsForDesign (query, firmSupport) {
  const files = getDomainFiles()

  const lower = query.toLowerCase()
  const scores = []

  for (const file of files) {
    const domainId = file.replace('-domain-support.json', '')
    const support = resolveDomainSupport(domainId, firmSupport)
    if (!support) { continue }
    const score = (support.trigger_keywords || []).filter(kw => lower.includes(kw.toLowerCase())).length
    if (score > 0) { scores.push({ domainId, score }) }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(s => s.domainId)
}

module.exports = { resolveDomainSupport, formatDomainSupportForPrompt, supportIdForLearnTree, detectDomainForSession, formatDomainContextForSession, formatDomainSummaryForDesign, detectDomainsForDesign }
