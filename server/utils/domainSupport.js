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
const { fenceUntrusted } = require('./promptSafety')

const _cache = {}
let _domainFiles = null

/**
 * The firm's raw override object for a domain, or null. Used to tell whether a
 * field the model is about to read was authored by the firm (untrusted) rather
 * than the platform (trusted repo data).
 * @param {Object|null} firmSupport - override map keyed by domain id
 * @param {string} domainId
 * @returns {Object|null}
 */
function _overrideFor (firmSupport, domainId) {
  return (firmSupport && typeof firmSupport === 'object' && !Array.isArray(firmSupport))
    ? (firmSupport[domainId] || null)
    : null
}

/**
 * True when a given field of a domain's merged support came from the firm's
 * override (so it is untrusted and must be fenced before reaching a prompt).
 * Arrays merge wholesale (server/utils/deepMerge.js), so an overridden
 * `materials` means every material is firm-authored — all-or-nothing per field.
 * @param {Object|null} firmSupport
 * @param {string} domainId
 * @param {string} field - e.g. 'overview' or 'materials'
 * @returns {boolean}
 */
function _firmAuthored (firmSupport, domainId, field) {
  const override = _overrideFor(firmSupport, domainId)
  return !!(override && typeof override === 'object' && !Array.isArray(override) &&
    Object.prototype.hasOwnProperty.call(override, field))
}

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

/**
 * A stored situation key rendered as ordinary words.
 * `entrenched_position_with_loss_of_self` → `Entrenched position with loss of self`.
 *
 * Generated rather than authored, and READ-ONLY on the screen for that reason:
 * the key is the identity the stored guidance is filed under, so renaming one
 * would repoint the content. See design/DOMAIN-DIAGNOSTIC-BRANCHES.md §3b.
 * @param {string} key
 * @returns {string}
 */
function humaniseSituation (key) {
  const words = String(key || '').replace(/_/g, ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

/**
 * The domain's diagnostic entry: the question that works out which situation the
 * client is in, and the authored guidance for each answer.
 *
 * WHY THIS EXISTS (item 4.16 A+B, 2026-08-16). The 65 branches under
 * `diagnostic_entry` reached NO prompt at all — two of the three formatters in
 * this file emitted `primary_question` and stopped, and the advisor path below
 * emitted neither. So an adviser asking about an entrenched partnership dispute
 * was never told the authored rule that trying to resolve the substance before
 * the loss-of-self dynamic WILL fail.
 *
 * ⚠ THEY ARE NOT DUPLICATES OF THE LOGIC TREES, and that was tested rather than
 * assumed — the build spec's claim that ~55 of them were is overturned with
 * evidence in design/DOMAIN-DIAGNOSTIC-BRANCHES.md §1. The tree says WHICH
 * conversation this is; the branch says WHAT TO DO once you are in it.
 *
 * The heading matches the Domain Support screen's own, word for word (approved
 * by Mike 2026-08-16), so a firm editing a row can find what it changed in the
 * prompt.
 *
 * @param {Object} ref - the resolved domain-support entry
 * @param {boolean} fenced - true when the firm authored this domain's entry
 * @returns {Array<string>} lines, or [] when the domain has no diagnostic entry
 */
function formatDiagnosticEntryLines (ref, fenced) {
  const de = ref && ref.diagnostic_entry
  if (!de || typeof de !== 'object' || Array.isArray(de)) { return [] }

  const lines = []
  if (de.primary_question) {
    const q = `**Diagnostic entry point:** ${de.primary_question}`
    lines.push(fenced ? fenceUntrusted(q) : q)
    lines.push('')
  }

  const situations = Object.keys(de)
    .filter(k => k !== 'primary_question' && typeof de[k] === 'string' && de[k].trim())
  if (situations.length > 0) {
    lines.push('**What to do, depending on the situation:**')
    const body = situations
      .map(k => `- **${humaniseSituation(k)}:** ${de[k]}`)
      .join('\n')
    lines.push(fenced ? fenceUntrusted(body) : body)
    lines.push('')
  }
  return lines
}

function formatDomainSupportForPrompt (domainId, firmSupport) {
  const ref = resolveDomainSupport(domainId, firmSupport)
  if (!ref) { return null }

  // Firm-authored fields are untrusted user input reaching the prompt — fenced
  // so the model reads them as data, never instructions (CLAUDE.md → Security;
  // same guard the quiz banks use, courseEngine.js CB-30). Platform fields are
  // repo data and stay unfenced, leaving existing prompt behaviour unchanged.
  const overviewFirm = _firmAuthored(firmSupport, domainId, 'overview')
  const materialsFirm = _firmAuthored(firmSupport, domainId, 'materials')

  const diagnosticFirm = _firmAuthored(firmSupport, domainId, 'diagnostic_entry')

  const lines = []
  lines.push(`## Domain Support Reference — ${ref.label}`)
  lines.push('')
  lines.push(overviewFirm ? fenceUntrusted(ref.overview) : ref.overview)
  lines.push('')
  // THE ADVISOR PATH HAD NEITHER the entry question nor its branches — not just
  // the branches. This is the formatter an advisor's own session reads.
  for (const line of formatDiagnosticEntryLines(ref, diagnosticFirm)) { lines.push(line) }

  // Four-column re-authored shape (§0.5) takes precedence; legacy support_tools
  // files fall through to the original rich renderer below.
  if (Array.isArray(ref.materials) && ref.materials.length > 0) {
    for (const material of ref.materials) {
      const body = formatMaterialLines(material).join('\n')
      lines.push(materialsFirm ? fenceUntrusted(body) : body)
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
 * Formats a domain context block for course session injection: overview,
 * diagnostic entry point, every material for the domain, and advisor guidance.
 *
 * Deliberately UNFILTERED — see the comment at the materials loop below. The
 * session's own template resources are already injected separately by the caller
 * (courseEngine.js `sessionInject`); this block is domain background knowledge.
 * @param {string} domainId
 * @param {Object|null} firmSupport - firm overlay bundle, or null for platform content
 * @returns {string|null} prompt block, or null when the domain has no support file
 */
function formatDomainContextForSession (domainId, firmSupport) {
  const ref = resolveDomainSupport(domainId, firmSupport)
  if (!ref) { return null }

  // Firm-authored fields are fenced before reaching the prompt (see
  // formatDomainSupportForPrompt); platform fields stay unchanged.
  const overviewFirm = _firmAuthored(firmSupport, domainId, 'overview')
  const materialsFirm = _firmAuthored(firmSupport, domainId, 'materials')

  const lines = []
  lines.push(`## Domain Context — ${ref.label}`)
  lines.push('')
  if (ref.overview) { lines.push(overviewFirm ? fenceUntrusted(ref.overview) : ref.overview); lines.push('') }

  for (const line of formatDiagnosticEntryLines(ref, _firmAuthored(firmSupport, domainId, 'diagnostic_entry'))) {
    lines.push(line)
  }

  // EVERY material for the detected domain reaches the prompt — there is no
  // name-matching filter, deliberately.
  //
  // This used to filter materials by the session's template resource names and
  // fall back to `materials.slice(0, 1)`. That compared two different namespaces:
  // CB-33 established that material names are *teaching concepts*, NOT template
  // names (see formatDomainSummaryForDesign below, where CB-02 grounding strips
  // them from `resources`) — so there was no correct match to find. Measured over
  // all 29 domains / 181 rows: 66 rows could not be matched by ANY library page,
  // 22 of 29 domains had no exactly-matching row, and the silent `slice(0, 1)`
  // fallback briefed the AI on row 1 whatever the session was about, while a
  // shared first word pulled in unrelated rows ("Business Dating" matched
  // "Business Targets"). Sending the full set mirrors the advisor path
  // (formatDomainSupportForPrompt), which has always done this and never had the
  // defect. Cost measured: worst case ~7.4k tokens (people-power), median ~1.7k —
  // volume the advisor path already carries. If a cap is ever needed it must say
  // that it capped (no-silent-caps rule); there is none today.
  if (Array.isArray(ref.materials) && ref.materials.length > 0) {
    for (const material of ref.materials) {
      const body = formatMaterialLines(material).join('\n')
      lines.push(materialsFirm ? fenceUntrusted(body) : body)
      lines.push('')
    }
  } else {
    for (const tool of (ref.support_tools || [])) {
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

  // Firm-authored fields are fenced before reaching the prompt (see
  // formatDomainSupportForPrompt); platform fields stay unchanged.
  const overviewFirm = _firmAuthored(firmSupport, domainId, 'overview')
  const materialsFirm = _firmAuthored(firmSupport, domainId, 'materials')

  const lines = []
  lines.push(`## Domain Knowledge — ${ref.label}`)
  lines.push('')
  if (ref.overview) { lines.push(overviewFirm ? fenceUntrusted(ref.overview) : ref.overview); lines.push('') }

  for (const line of formatDiagnosticEntryLines(ref, _firmAuthored(firmSupport, domainId, 'diagnostic_entry'))) {
    lines.push(line)
  }

  // CB-33: these tool names are teaching concepts from the support file, NOT
  // template names — presenting them as resource candidates made the AI write
  // them into `resources`, where grounding (CB-02) rightly stripped them.
  // The header and closing note are platform instructions and stay outside the
  // fence; only the firm-authored bullets are fenced when overridden.
  lines.push('**Teaching frameworks in this domain (background knowledge for designing session content and order — these are NOT resource names):**')
  if (Array.isArray(ref.materials) && ref.materials.length > 0) {
    const bullets = ref.materials.map((material) => {
      const whoNote = material.who_when ? ` — ${material.who_when}` : ''
      return `- **${material.name}**: ${material.summary}${whoNote}`
    }).join('\n')
    lines.push(materialsFirm ? fenceUntrusted(bullets) : bullets)
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

module.exports = { resolveDomainSupport, formatDomainSupportForPrompt, supportIdForLearnTree, detectDomainForSession, formatDomainContextForSession, formatDomainSummaryForDesign, detectDomainsForDesign, formatDiagnosticEntryLines, humaniseSituation }
