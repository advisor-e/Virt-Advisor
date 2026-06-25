'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN-DETECTION CHECK — verifies the AI domain backstop across all 14 domains.
//
// The scoring lab sets the domain directly; this exercises the FRONT of the
// pipeline: it runs the REAL keyword detection (DOMAIN_PATTERNS from domains.json,
// the same logic as advisorEngine) on each scenario's NATURAL text (opening +
// what-contributed — NOT the "it is about X" confirmation), then, only when the
// keyword pass finds nothing, calls the AI backstop (classifyDomainAI) — exactly
// as the engine does. Reports keyword-only vs keyword+backstop accuracy so the
// backstop's value and safety are measured, not assumed.
//
// RUN: NODE_EXTRA_CA_CERTS=./certs/digicert-bundle.pem node -r dotenv/config scripts/domain-detection-check.js
// ─────────────────────────────────────────────────────────────────────────────

const dom = require('../data/domains.json')
const DOMAINS = Array.isArray(dom) ? dom : (dom.domains || [])
const PATTERNS = DOMAINS.map(d => ({ id: d.id, re: new RegExp(d.keywords, 'gi') }))

const SCENARIOS = require('./scenario-lab-cases.json')

const HAS_AI = !!process.env.OPENAI_API_KEY
let classifyDomainAI
if (HAS_AI) { classifyDomainAI = require('../server/advisorEngine').classifyDomainAI }

// Keyword detection — mirrors advisorEngine: count matches per domain, highest wins,
// tie => ambiguous (engine asks the advisor), zero => no domain (backstop fires).
function keywordDetect (text) {
  const scores = PATTERNS
    .map(p => ({ id: p.id, count: (text.match(p.re) || []).length }))
    .filter(s => s.count > 0)
  if (scores.length === 0) return { result: 'none', id: null, max: 0 }
  const max = Math.max(...scores.map(s => s.count))
  const top = scores.filter(s => s.count === max)
  if (top.length === 1) return { result: 'one', id: top[0].id, max }
  return { result: 'tie', id: null, tied: top.map(t => t.id), max }
}

// Proposed policy: a keyword match is only CONFIDENT when a single domain wins with
// at least 2 hits. A thin single hit (max===1) is low-confidence, so the AI backstop
// weighs in (this is what catches the confidently-wrong single-keyword mis-routes).
const CONFIDENT = (kw) => kw.result === 'one' && kw.max >= 2

async function main () {
  const rows = []
  for (const sc of SCENARIOS) {
    // Natural problem text only — the confirmation often restates the domain, which
    // would make detection trivial; we test what the engine actually faces first.
    const text = [sc.opening, sc.situationDiagnostic].filter(Boolean).join(' ')
    const kw = keywordDetect(text)
    // Run the AI if EITHER policy would consult it (no-match, or a thin single match).
    const needAI = kw.result === 'none' || (kw.result === 'one' && kw.max < 2)
    let ai = null
    if (HAS_AI && needAI) { try { ai = await classifyDomainAI(text) } catch (_e) { ai = null } }

    // CURRENT policy: keyword wins unless it found nothing → AI. Tie → advisor.
    const current = kw.result === 'one' ? kw.id
      : kw.result === 'tie' ? (kw.tied.includes(sc.domain) ? sc.domain : null)
      : ai
    // PROPOSED policy: only a CONFIDENT keyword (single, >=2 hits) wins outright; a
    // tie still asks the advisor; otherwise (no-match OR thin single) the AI decides,
    // falling back to the thin keyword if the AI abstains.
    const proposed = CONFIDENT(kw) ? kw.id
      : kw.result === 'tie' ? (kw.tied.includes(sc.domain) ? sc.domain : null)
      : (ai || kw.id)

    // SAFE policy: confident keyword wins; otherwise the right domain is "reachable"
    // if it's the keyword pick, the AI pick, or a tied option — i.e. it gets surfaced
    // (auto-used when keyword+AI agree, else offered to the advisor). Never a silent
    // override of a correct thin keyword.
    const candidates = new Set()
    if (kw.id) candidates.add(kw.id)
    if (kw.tied) kw.tied.forEach(t => candidates.add(t))
    if (ai) candidates.add(ai)
    const safeOk = CONFIDENT(kw) ? (kw.id === sc.domain) : candidates.has(sc.domain)

    rows.push({ sc, kw, ai, current, proposed, curOk: current === sc.domain, propOk: proposed === sc.domain, safeOk })
  }

  const n = SCENARIOS.length
  const cur = rows.filter(r => r.curOk).length
  const prop = rows.filter(r => r.propOk).length
  const safe = rows.filter(r => r.safeOk).length
  console.log(`SAFE policy (confident kw, else surface kw+AI to advisor): ${safe}/${n} (${(safe / n * 100).toFixed(0)}%)`)
  console.log(`\n=== DOMAIN-DETECTION CHECK — ${n} cases · AI ${HAS_AI ? 'ON' : 'OFF'} ===\n`)
  console.log(`CURRENT  policy (AI on no-match only)        : ${cur}/${n} (${(cur / n * 100).toFixed(0)}%)`)
  console.log(`PROPOSED policy (AI on no-match + thin match) : ${prop}/${n} (${(prop / n * 100).toFixed(0)}%)`)
  const fixed = rows.filter(r => !r.curOk && r.propOk)
  const regressed = rows.filter(r => r.curOk && !r.propOk)
  console.log(`\n  fixed by proposed   : ${fixed.length}`)
  console.log(`  REGRESSED by proposed: ${regressed.length}`)
  console.log('\nCases the proposed policy changes:')
  rows.filter(r => r.current !== r.proposed).forEach(r => {
    const tag = r.propOk ? 'FIXED' : r.curOk ? 'REGRESSED' : 'both-wrong'
    console.log(`  [${tag.padEnd(10)}] ${r.sc.domain.padEnd(13)} cur=${String(r.current).padEnd(14)} prop=${String(r.proposed).padEnd(14)} (${r.sc.key})`)
  })
  console.log('')
}

main()
