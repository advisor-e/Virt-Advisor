'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO LAB — repeatable cross-domain test bench + case-study writer + metrics.
//
// Runs a FIXED set of invented advisor sessions (scripts/scenario-lab-cases.json,
// 50 across all 14 domains) through the REAL engine and emits:
//   • design/SCENARIO-LAB-REPORT.md — readable case-study notes per session, with
//     the engine's own scoring reasons translated to plain English.
//   • a METRICS block — objective numbers so an engine change can be measured
//     before vs after on the SAME 50 cases.
//
// RUN (deterministic, free):  node scripts/scenario-lab.js
// RUN (with AI distinctions + distress):
//   NODE_EXTRA_CA_CERTS=./certs/digicert-bundle.pem node -r dotenv/config scripts/scenario-lab.js
// FILTER:  node scripts/scenario-lab.js profit
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const { extractProblemSignals, SIGNAL_DESCRIPTIONS } = require('../server/utils/problemSignals')
const { staircaseToCeiling, DOMAIN_NATURAL_ENGAGEMENT } = require('../server/utils/caseState')
const { resolveTemplatesWithOutlier, buildDisplaySet } = require('../server/utils/templateResolver')
const templates = require('../data/templates.json')

const SCENARIOS = require('./scenario-lab-cases.json')

const HAS_AI = !!process.env.OPENAI_API_KEY
let classifyDistinctions, readDistressAI, platformDistinctions
if (HAS_AI) {
  const eng = require('../server/advisorEngine')
  classifyDistinctions = eng.classifyDistinctions
  readDistressAI = eng.readDistressAI
  try {
    const d = require('../data/advisory-distinctions.json')
    platformDistinctions = Array.isArray(d) ? d : (d.platform || [])
  } catch (_e) { platformDistinctions = [] }
}

// ── Translate the resolver's reason codes into plain English ─────────────────
function explainReasons (reasons) {
  return (reasons || []).map((r) => {
    if (r === 'domain:primary_subsection') return 'a core tool type for this domain'
    if (r === 'domain:secondary_subsection') return 'a related tool type for this domain'
    if (r === 'primary_issue:strong_match') return 'closely matches the stated issue'
    if (r === 'primary_issue:partial_match') return 'partly matches the stated issue'
    if (r === 'industry:title_match') return "matches the client's industry by name"
    if (r === 'industry:tag_match') return "relevant to the client's industry"
    if (r === 'industry:mismatch_specific_model') return '(flagged: built for a different industry)'
    if (/^semantic:/.test(r)) return `strongly matches the problem described (signal weight ${r.split(':')[1]})`
    if (/^distinction:/.test(r)) return `boosted by a firm distinction (${r.replace('distinction:', '')})`
    if (/^tree_hint:/.test(r)) return 'pointed to by the logic tree'
    if (/^tag:/.test(r)) return `matches the topic "${r.split(':')[1]}"`
    if (/^purpose:/.test(r)) return `purpose mentions "${r.split(':')[1]}"`
    if (/^growth:/.test(r)) return 'matches the growth stage'
    if (r === 'engagement:primary') return 'fits the engagement style (preferred)'
    if (r === 'engagement:secondary') return 'fits the engagement style'
    if (r === 'history:already_delivered') return 'already delivered to this client — held back'
    if (r === 'history:went_less_well') return 'delivered before and went less well — held back'
    return r
  })
}

// A reason counts as CONTENT-driven (the engine responding to what was said) if it
// is not just a generic domain/engagement prior.
function isContentReason (r) {
  return /^(semantic:|distinction:|industry:title|industry:tag|primary_issue:|tag:|purpose:|tree_hint:|growth:)/.test(r)
}

const describeSignals = (s) => {
  const keys = Object.keys(s)
  if (!keys.length) return '_none — the engine read no problem signals from the words, so this ran on generic priors only_'
  return keys.map(n => `${SIGNAL_DESCRIPTIONS[n] || n} (×${s[n]})`).join(', ')
}

function runScenario (sc, boosts) {
  const text = [sc.situationDiagnostic, sc.domainConfirmed].filter(Boolean).join(' ') // CURRENT live engine input
  const problemSignals = extractProblemSignals(text)
  const ceiling = staircaseToCeiling(sc.staircase)
  const engagement = sc.engagement || DOMAIN_NATURAL_ENGAGEMENT[sc.domain] || 'facilitation'
  const caseState = {
    domain: sc.domain, primaryIssue: '', industry: sc.industry || null,
    solutionCategories: [sc.domain], complexityCeiling: ceiling,
    client: {}, advisor: {}, problemSignals
  }
  const strategy = { engagementType: engagement, templateBudget: sc.budget || 2 }
  const resolved = resolveTemplatesWithOutlier(caseState, strategy, templates, { distinctionBoosts: boosts || {} })
  const cards = buildDisplaySet(resolved, strategy.templateBudget)
  const log = resolved.primary.scoringLog
  return {
    problemSignals, ceiling, engagement, budget: strategy.templateBudget, cards,
    topScores: log.slice(0, 6).map(t => t.score),
    topReasons: (cards[0] && cards[0].matchReasons) || []
  }
}

async function main () {
  const filter = process.argv[2]
  const scenarios = filter ? SCENARIOS.filter(s => s.domain === filter || s.key.includes(filter)) : SCENARIOS

  const results = []
  for (const sc of scenarios) {
    let boosts = {}
    let distress = null
    if (HAS_AI) {
      const fullText = [sc.opening, sc.situationDiagnostic, sc.clientAlreadyTried, sc.domainConfirmed].filter(Boolean).join(' ')
      try { boosts = await classifyDistinctions(sc.domain, fullText, platformDistinctions) || {} } catch (_e) { boosts = {} }
      try { distress = await readDistressAI(fullText) } catch (_e) { distress = null }
    }
    results.push({ sc, distress, boosts, run: runScenario(sc, boosts) })
  }

  // ── Metrics ────────────────────────────────────────────────────────────────
  const n = results.length
  const signalFired = results.filter(r => Object.keys(r.run.problemSignals).length > 0).length
  const contentDriven = results.filter(r => (r.run.topReasons || []).some(isContentReason)).length
  const gaps = results.map(r => (r.run.topScores[0] || 0) - (r.run.topScores[3] || 0))
  const avgGap = (gaps.reduce((a, b) => a + b, 0) / (n || 1)).toFixed(1)
  // Distress precision/recall vs the isCrisis ground truth
  const crisisCases = results.filter(r => r.sc.isCrisis)
  const distressTrue = results.filter(r => r.distress === true)
  const truePos = distressTrue.filter(r => r.sc.isCrisis).length
  const precision = distressTrue.length ? (truePos / distressTrue.length * 100).toFixed(0) : 'n/a'
  const recall = crisisCases.length ? (truePos / crisisCases.length * 100).toFixed(0) : 'n/a'

  const metrics = [
    `- **Signal lever fired:** ${signalFired}/${n} sessions (${(signalFired / n * 100).toFixed(0)}%) — the rest ran on generic domain priors only.`,
    `- **Content-driven top pick:** ${contentDriven}/${n} (${(contentDriven / n * 100).toFixed(0)}%) — the #1 recommendation matched on something the advisor actually said (a signal, distinction, industry or topic), not just a domain prior.`,
    `- **Average score separation (top vs 4th):** ${avgGap} points — higher = more decisive / confident ranking.`,
    HAS_AI
      ? `- **Distress read:** fired TRUE in ${distressTrue.length}/${n}; of those, ${truePos} were genuine crises → **precision ${precision}%**, **recall ${recall}%** (there are ${crisisCases.length} genuine crises in the set).`
      : `- **Distress read:** AI layer off — run with the OpenAI key to measure.`
  ]

  // ── Report ─────────────────────────────────────────────────────────────────
  const lines = []
  lines.push('# Scenario Lab — Cross-Domain Case-Study Report')
  lines.push('')
  lines.push('> **Auto-generated** by `scripts/scenario-lab.js` over the fixed 50-case set (`scenario-lab-cases.json`). Re-run to refresh; do not hand-edit.')
  lines.push(`> Coverage: **${n} sessions across all 14 content domains**. AI layer (firm distinctions + distress): **${HAS_AI ? 'ON' : 'OFF'}**.`)
  lines.push('')
  lines.push('## Metrics (measure before vs after an engine change)')
  lines.push('')
  lines.push(...metrics)
  lines.push('')
  lines.push('## At a glance')
  lines.push('')
  lines.push('| # | Domain | Top recommendation | Signal? | Content-driven? | Crisis? | Distress |')
  lines.push('|--:|---|---|:--:|:--:|:--:|:--:|')
  results.forEach((r, i) => {
    const sig = Object.keys(r.run.problemSignals).length > 0 ? 'yes' : '**no**'
    const cd = (r.run.topReasons || []).some(isContentReason) ? 'yes' : '**no**'
    const top = r.run.cards[0] ? r.run.cards[0].title : '—'
    const dist = r.distress === null ? '–' : (r.distress ? '**TRUE**' : 'false')
    lines.push(`| ${i + 1} | ${r.sc.domain} | ${top} | ${sig} | ${cd} | ${r.sc.isCrisis ? 'YES' : ''} | ${dist} |`)
  })
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const r of results) {
    const { sc, run, boosts, distress } = r
    lines.push(`## ${sc.key}${sc.isCrisis ? '  ⚠ (genuine crisis)' : ''}`)
    lines.push('')
    lines.push('**The advisor\'s session (invented):**')
    lines.push(`- _Core problem:_ ${sc.opening}`)
    lines.push(`- _What contributed:_ ${sc.situationDiagnostic}`)
    lines.push(`- _Already tried:_ ${sc.clientAlreadyTried}`)
    lines.push(`- _On the check-in:_ ${sc.domainConfirmed}`)
    lines.push(`- _Industry:_ ${sc.industry} · _Staircase:_ step ${sc.staircase} · _Sessions:_ ${sc.budget}`)
    lines.push('')
    lines.push('**What the engine decided:**')
    lines.push(`- **Domain:** ${sc.domain} · **Engagement:** ${run.engagement} · **Ceiling:** ${run.ceiling} · **Budget:** ${run.budget}`)
    lines.push(`- **Problem signals read:** ${describeSignals(run.problemSignals)}`)
    if (HAS_AI) {
      const bk = Object.keys(boosts)
      lines.push(`- **Firm distinctions boosting:** ${bk.length ? bk.map(k => `${k} (+${boosts[k]})`).join(', ') : '_none matched_'}`)
      lines.push(`- **Distress read:** ${distress === null ? 'n/a' : (distress ? '**YES**' : 'no')}${sc.isCrisis && distress !== true ? '  ← MISS (this is a genuine crisis)' : ''}${!sc.isCrisis && distress === true ? '  ← FALSE POSITIVE' : ''}`)
    }
    lines.push('')
    lines.push('**Recommended templates, and why:**')
    if (!run.cards.length) {
      lines.push('- _No template scored above zero._')
    } else {
      run.cards.forEach((c, i) => {
        const why = explainReasons(c.matchReasons)
        lines.push(`${i + 1}. **${c.title}** _(score ${c.score})_ — ${why.length ? why.join('; ') : 'domain prior only'}.`)
      })
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const outPath = path.join(process.cwd(), 'design', 'SCENARIO-LAB-REPORT.md')
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

  console.log(`\n=== SCENARIO LAB — ${n} cases · AI ${HAS_AI ? 'ON' : 'OFF'} ===`)
  metrics.forEach(m => console.log(m.replace(/\*\*/g, '').replace(/^- /, '  ')))
  console.log(`\nReport: design/SCENARIO-LAB-REPORT.md\n`)
}

main()
