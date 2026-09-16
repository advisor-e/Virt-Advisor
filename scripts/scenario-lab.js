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
// RUN (deterministic layers only — distinctions and distress measure as ZERO, so
//      this run UNDERSTATES the engine and is never the answer on its own):
//   node scripts/scenario-lab.js
// RUN (COMPLETE — the live AI layers included. This is the one to trust; cost is
//      never a reason to prefer the run above — Mike, 2026-08-02):
//   NODE_EXTRA_CA_CERTS=<bundle covering whatever re-signs HTTPS on this box> \
//     node -r dotenv/config scripts/scenario-lab.js
//   ⚠ certs/digicert-bundle.pem does NOT cover an antivirus TLS scanner.
//     Verified 2026-08-02: Avast Web/Mail Shield re-signs api.openai.com, and every
//     call dies UNABLE_TO_VERIFY_LEAF_SIGNATURE in ~20ms — which reads like a network
//     fault, not a cert problem, and cost half an hour to spot. Recipe (export the AV
//     root from the OS trust store): design/HANDOFF.md → Local Setup / Run.
// FILTER:  node scripts/scenario-lab.js profit
// WITH OUTCOME LEARNING (item 4.87, the fixed bench): the live adjustments as the mentor
// page exports them (GET /api/mentor/outcome-learning/export → `adjustments`, or the
// whole response) —
//   node scripts/scenario-lab.js --adjustments live.json
// Run it without the flag first: the difference between the two METRICS blocks is the
// fixed bench's answer, and the block names the file and how many adjustments applied.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const { SIGNAL_DESCRIPTIONS } = require('../server/utils/problemSignals')
const { resolveTemplatesWithOutlier, buildDisplaySet } = require('../server/utils/templateResolver')
const { scenarioToCase, hasCapBreach } = require('../server/utils/outcomeBench')
const { rankLabels, proposesIssue, parseReply } = require('../server/utils/primaryIssueProposer')
const templates = require('../data/templates.json')

const SCENARIOS = require('./scenario-lab-cases.json')

const USAGE = `
Scenario Lab — replays the fixed case set through the engine and writes
design/SCENARIO-LAB-REPORT.md.

  node scripts/scenario-lab.js                     all cases
  node scripts/scenario-lab.js <domain|key>        only cases matching it
  node scripts/scenario-lab.js --adjustments <f>   with live Outcome Learning adjustments
  node scripts/scenario-lab.js --help              this message

Set OPENAI_API_KEY to measure the AI layers; without it the run is PARTIAL and
will not overwrite a fuller report.
`

// ── Arguments: an optional domain/key filter, and --adjustments <file> ──────
/**
 * 🔴 AN UNKNOWN --flag IS AN ERROR, NEVER A FILTER. It used to fall through to the filter
 * branch below, so `--help` was read as a domain name, matched no case, ran 0 of them — and
 * the run still wrote the report, replacing 1,145 lines of AI-measured results with 21 lines
 * of zeros. Item 9.2; seen three times, most recently 2026-09-16. Anything starting with `-`
 * that is not a known flag now stops the run before a single case is replayed.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{filter: string|null, adjustmentsFile: string|null, help: boolean}}
 */
function parseArgs (argv) {
  const out = { filter: null, adjustmentsFile: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      out.help = true
    } else if (arg === '--adjustments') {
      out.adjustmentsFile = argv[i + 1] || null
      i += 1
    } else if (arg.charAt(0) === '-') {
      const err = new Error('unknown option: ' + arg)
      err.usage = true
      throw err
    } else if (!out.filter) {
      out.filter = arg
    }
  }
  return out
}

/**
 * 🔴 A RUN THAT MEASURED LESS NEVER REPLACES ONE THAT MEASURED MORE (item 9.2).
 *
 * The report used to be written unconditionally, so a run with the AI layers off reported score
 * separation 2.3 against the real 5.7 and silently became the record — and a filtered run wrote
 * a subset over the full set. Nothing said so except a console line nobody had to read.
 *
 * The existing report states its own coverage in its header, so this reads what is there rather
 * than keeping separate state: a run is allowed to overwrite when it is at least as complete —
 * AI on if the old one had AI on, and no fewer cases. Anything less goes to a clearly named
 * partial file and says why. A missing or unreadable report is not a reason to refuse; a first
 * run must be able to write one.
 *
 * @param {string} mainPath - design/SCENARIO-LAB-REPORT.md
 * @param {{cases: number, ai: boolean, filtered: boolean}} run - what THIS run measured
 * @returns {{path: string, withheld: string|null}} where to write, and why not the main report
 */
function chooseReportPath (mainPath, run) {
  const partial = mainPath.replace(/\.md$/, '-partial.md')

  // A filter is a subset by definition — it can never stand as the full-set report.
  if (run.filtered) {
    return { path: partial, withheld: 'This run was filtered to a subset of the cases.' }
  }

  let existing = ''
  try { existing = fs.readFileSync(mainPath, 'utf8') } catch (_e) { return { path: mainPath, withheld: null } }

  // The header line this script writes: "Coverage: **51 sessions ...** AI layer ...: **ON**."
  const header = existing.split('\n').slice(0, 12).join('\n')
  const hadAi = /AI layer[^*]*\*\*ON\*\*/.test(header)
  const casesMatch = header.match(/\*\*(\d+) sessions/)
  const hadCases = casesMatch ? Number(casesMatch[1]) : 0

  if (hadAi && !run.ai) {
    return { path: partial, withheld: 'The AI layers did not run; the existing report measured them.' }
  }
  if (run.cases < hadCases) {
    return { path: partial, withheld: `This run measured ${run.cases} cases; the existing report has ${hadCases}.` }
  }
  return { path: mainPath, withheld: null }
}

/**
 * The live adjustments, in the resolver option shape. Accepts either the bare array the
 * export returns under `adjustments`, or the whole export response. Anything else stops
 * the run rather than measuring silently with nothing applied.
 * @param {string|null} file
 * @returns {Array<Object>}
 */
function loadAdjustments (file) {
  if (!file) { return [] }
  const parsed = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.adjustments) ? parsed.adjustments : null)
  if (!list) { throw new Error(`--adjustments ${file}: expected a JSON array, or an object with an "adjustments" array`) }
  return list
}

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
    // Outcome Learning (4.87) — Mike's wording 2026-09-11, the same as the locale's.
    if (r.indexOf('pooled:held_back-') === 0) return 'learned from outcomes −' + r.slice('pooled:held_back-'.length)
    if (r === 'pooled:outweighed') return 'outcome learning weighed and outweighed'
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

/**
 * What the primary-issue step would do on this case (item 4.97 US1). The case's own
 * `primaryIssue` is the proposer's top rank — `scenarioToCase` sets it — so the report only
 * has to say WHY there is no label when there is none: a context domain that never proposes
 * by design, evidence too thin to name one, or simply nothing matched.
 * @param {Object} sc - one entry of scripts/scenario-lab-cases.json
 * @param {Object} caseState - as the bench built it
 * @returns {{label: string, outcome: 'proposed'|'context'|'weak'|'no-match'}}
 */
function issueOutcome (sc, caseState) {
  if (caseState.primaryIssue) { return { label: caseState.primaryIssue, outcome: 'proposed' } }
  if (!proposesIssue(sc.domain)) { return { label: '', outcome: 'context' } }
  const text = [sc.situationDiagnostic, sc.domainConfirmed].filter(Boolean).join(' ')
  const ranked = rankLabels(sc.domain, text, caseState.problemSignals)
  return { label: '', outcome: ranked.weakEvidence ? 'weak' : 'no-match' }
}

/**
 * The Issue cell. A withheld label says WHY in the same words the advisor's screen would —
 * the engine asking rather than asserting is a result, not a blank.
 * @param {{label: string, outcome: string}} issue
 * @returns {string}
 */
function describeIssue (issue) {
  if (issue.outcome === 'proposed') { return issue.label }
  if (issue.outcome === 'weak') { return '_**asks** — evidence too thin_' }
  if (issue.outcome === 'context') { return '_context domain — none by design_' }
  return '_**asks** — nothing matched_'
}

function runScenario (sc, boosts, adjustments) {
  // The case shape is the fixed bench's own (outcomeBench.scenarioToCase), so the report
  // and the bench can never disagree about what a case is.
  const { caseState, strategy, signalTypes } = scenarioToCase(sc)
  const resolved = resolveTemplatesWithOutlier(caseState, strategy, templates, {
    distinctionBoosts: boosts || {},
    pooledAdjustments: adjustments || [],
    pooledSignalTypes: signalTypes
  })
  const cards = buildDisplaySet(resolved, strategy.templateBudget)
  const log = resolved.primary.scoringLog
  return {
    problemSignals: caseState.problemSignals,
    issue: issueOutcome(sc, caseState),
    ceiling: caseState.complexityCeiling,
    engagement: strategy.engagementType,
    budget: strategy.templateBudget,
    cards,
    topScores: log.slice(0, 6).map(t => t.score),
    topReasons: (cards[0] && cards[0].matchReasons) || [],
    // 4.97 US3. The same case with NO pooled adjustments, so the report can say whether the
    // pool re-ordered anything against the advisor's own evidence. Only computed when there
    // are adjustments to measure — a plain run does a single resolve per case, as before.
    plainCards: (adjustments && adjustments.length)
      ? buildDisplaySet(resolveTemplatesWithOutlier(caseState, strategy, templates, {
          distinctionBoosts: boosts || {},
          pooledAdjustments: [],
          pooledSignalTypes: signalTypes
        }), strategy.templateBudget)
      : null
  }
}

async function main () {
  const { filter, adjustmentsFile, help } = parseArgs(process.argv.slice(2))
  if (help) { console.log(USAGE); return }
  const adjustments = loadAdjustments(adjustmentsFile)
  const scenarios = filter ? SCENARIOS.filter(s => s.domain === filter || s.key.includes(filter)) : SCENARIOS

  // A filter that matches nothing is a typo, not a measurement. Stopping here means a
  // mistyped domain cannot reach the writer at all (item 9.2).
  if (!scenarios.length) {
    console.error(`\nNo case matches "${filter}". Nothing was run and no report was written.`)
    console.error(`Known domains: ${[...new Set(SCENARIOS.map(s => s.domain))].sort().join(', ')}\n`)
    process.exitCode = 1
    return
  }

  const results = []
  for (const sc of scenarios) {
    let boosts = {}
    let distress = null
    // A failed classifier returns no boosts, which is also what "nothing matched" returns.
    // Measuring the distinction lever across 50 cases while some calls silently failed
    // would understate it and read as an engine result — so failures are counted and
    // stated in the report rather than averaged in.
    let aiFailed = false
    if (HAS_AI) {
      const fullText = [sc.opening, sc.situationDiagnostic, sc.clientAlreadyTried, sc.domainConfirmed].filter(Boolean).join(' ')
      try {
        const classified = await classifyDistinctions(sc.domain, fullText, platformDistinctions)
        boosts = (classified && classified.boosts) || {}
        aiFailed = !!(classified && classified.ok === false)
      } catch (_e) { boosts = {}; aiFailed = true }
      try { distress = await readDistressAI(fullText) } catch (_e) { distress = null }
    }
    results.push({ sc, distress, boosts, aiFailed, run: runScenario(sc, boosts, adjustments) })
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
  // Outcome Learning: which file, how many applied, and how many cases carry the hold-back
  // on their top card — the fixed bench's own count, so the two runs can be laid side by side.
  const heldBackTops = results.filter(r => (r.run.topReasons || []).some(x => /^pooled:/.test(x))).length
  metrics.push(adjustmentsFile
    ? `- **Outcome Learning:** ${adjustments.length} live adjustment${adjustments.length === 1 ? '' : 's'} applied from \`${adjustmentsFile}\`; the #1 card carries a pooled hold-back or outweigh in ${heldBackTops}/${n} cases.`
    : '- **Outcome Learning:** no adjustments applied — run again with `--adjustments <file>` to measure the fixed bench with the live ones.')
  // 4.97 US3: the rule that the advisor's own words always win, as a countable figure. The
  // resolver never adjusts a template their evidence reached, so this must read 0 — and a
  // number that CAN go up is worth more than a sentence saying it cannot.
  if (adjustments.length > 0) {
    const breaches = results.filter(r => r.run.plainCards && hasCapBreach(r.run.plainCards, r.run.cards)).length
    metrics.push(`- **Cap breaches on the fixed bench: ${breaches}/${n}** — cases where a pooled adjustment moved a template BELOW one the adviser's own evidence had ranked above it. Expected 0; anything higher is a defect in the rule, not a measurement.`)
  }
  // Primary issue (4.97 US1): how often the engine NAMES the problem, and how often its
  // proposal survives the advisor's own words unchanged. The invented cases carry no reply to
  // a proposal, so "would confirm" replays the case's OWN description through parseReply —
  // the same code the live step runs when an advisor restates the issue in their own words.
  // It is a proxy and the report line says so; a real confirmation rate needs real advisors.
  const proposed = results.filter(r => r.run.issue.outcome === 'proposed')
  const wouldConfirm = proposed.filter((r) => {
    const text = [r.sc.situationDiagnostic, r.sc.domainConfirmed].filter(Boolean).join(' ')
    return parseReply(text, r.run.issue.label, r.sc.domain).outcome === 'confirmed'
  }).length
  const weakCount = results.filter(r => r.run.issue.outcome === 'weak').length
  const contextCount = results.filter(r => r.run.issue.outcome === 'context').length
  metrics.push(
    `- **Primary issue proposed:** ${proposed.length}/${n} (${(proposed.length / n * 100).toFixed(0)}%) — the engine named one of Mike's authored labels. Of the rest: ${weakCount} had evidence too thin to name one (the open driver question is asked instead), ${contextCount} are context domains that never propose by design, and ${n - proposed.length - weakCount - contextCount} matched no label at all.`,
    `- **Would confirm as proposed:** ${wouldConfirm}/${proposed.length}${proposed.length ? ` (${(wouldConfirm / proposed.length * 100).toFixed(0)}%)` : ''} — replaying each case's own description as the reply leaves the proposed label standing. A PROXY, not a confirmation rate: the invented cases have no advisor to answer, so this measures whether the proposal agrees with the words it was built from, never whether a real advisor would accept it.`
  )
  const distinctionFailures = results.filter(r => r.aiFailed).length
  if (distinctionFailures > 0) {
    metrics.push(`- 🔴 **Distinction classifier FAILED on ${distinctionFailures}/${n} cases** — those sessions ran with no distinction lever at all, so every figure above understates it. This is a fault in the run, not a result: fix it and re-run before comparing anything.`)
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  const lines = []
  lines.push('# Scenario Lab — Cross-Domain Case-Study Report')
  lines.push('')
  lines.push('> **Auto-generated** by `scripts/scenario-lab.js` over the fixed 50-case set (`scenario-lab-cases.json`). Re-run to refresh; do not hand-edit.')
  lines.push(`> Coverage: **${n} sessions across all 14 content domains**. AI layer (firm distinctions + distress): **${HAS_AI ? 'ON' : 'OFF'}**. Outcome Learning adjustments: **${adjustmentsFile ? `${adjustments.length} from ${adjustmentsFile}` : 'none'}**.`)
  lines.push('')
  lines.push('## Metrics (measure before vs after an engine change)')
  lines.push('')
  lines.push(...metrics)
  lines.push('')
  lines.push('## At a glance')
  lines.push('')
  lines.push('| # | Domain | Issue | Top recommendation | Signal? | Content-driven? | Crisis? | Distress |')
  lines.push('|--:|---|---|---|:--:|:--:|:--:|:--:|')
  results.forEach((r, i) => {
    const sig = Object.keys(r.run.problemSignals).length > 0 ? 'yes' : '**no**'
    const cd = (r.run.topReasons || []).some(isContentReason) ? 'yes' : '**no**'
    const top = r.run.cards[0] ? r.run.cards[0].title : '—'
    const dist = r.distress === null ? '–' : (r.distress ? '**TRUE**' : 'false')
    lines.push(`| ${i + 1} | ${r.sc.domain} | ${describeIssue(r.run.issue)} | ${top} | ${sig} | ${cd} | ${r.sc.isCrisis ? 'YES' : ''} | ${dist} |`)
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
    lines.push(`- **Main issue:** ${describeIssue(run.issue)}`)
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
  const target = chooseReportPath(outPath, { cases: n, ai: HAS_AI, filtered: !!filter })
  fs.writeFileSync(target.path, lines.join('\n'), 'utf8')

  console.log(`\n=== SCENARIO LAB — ${n} cases · AI ${HAS_AI ? 'ON' : 'OFF'} ===`)
  metrics.forEach(m => console.log(m.replace(/\*\*/g, '').replace(/^- /, '  ')))
  if (target.withheld) {
    console.log(`\n🔴 THE MAIN REPORT WAS NOT TOUCHED. ${target.withheld}`)
    console.log(`   Written instead to: design/${path.basename(target.path)}`)
    console.log('   Re-run without a filter, and with OPENAI_API_KEY set, to replace the main report.\n')
  } else {
    console.log(`\nReport: design/${path.basename(target.path)}\n`)
  }
}

// Run only when invoked directly, so the guards above can be tested without replaying 51
// sessions on import — the pattern the other scripts here already use.
if (require.main === module) {
  main().catch((err) => {
    // An unknown flag is a usage error, not a crash: say what was wrong and how to run it.
    if (err && err.usage) { console.error('\n' + err.message + '\n' + USAGE); process.exitCode = 1; return }
    throw err
  })
}

module.exports = { chooseReportPath, parseArgs }
