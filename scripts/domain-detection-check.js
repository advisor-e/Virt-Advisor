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
  if (scores.length === 0) return { result: 'none', id: null }
  const max = Math.max(...scores.map(s => s.count))
  const top = scores.filter(s => s.count === max)
  if (top.length === 1) return { result: 'one', id: top[0].id }
  return { result: 'tie', id: null, tied: top.map(t => t.id) }
}

async function main () {
  let kwCorrect = 0, kwWrong = 0, kwNone = 0, kwTie = 0
  let backstopFired = 0, backstopCorrect = 0, combinedCorrect = 0
  const rows = []

  for (const sc of SCENARIOS) {
    // Natural problem text only — the confirmation often restates the domain, which
    // would make detection trivial; we test what the engine actually faces first.
    const text = [sc.opening, sc.situationDiagnostic].filter(Boolean).join(' ')
    const kw = keywordDetect(text)

    let finalId = null
    let via = ''
    if (kw.result === 'one') {
      finalId = kw.id
      via = 'keyword'
      if (kw.id === sc.domain) kwCorrect++; else kwWrong++
    } else if (kw.result === 'tie') {
      kwTie++; via = 'tie→advisor'
      // engine asks the advisor on a tie; if the right domain is among the tied, count
      // it as resolvable. We do not auto-resolve here.
      if (kw.tied.includes(sc.domain)) finalId = sc.domain // best case the advisor picks right
    } else {
      kwNone++
      if (HAS_AI) {
        backstopFired++
        let ai = null
        try { ai = await classifyDomainAI(text) } catch (_e) { ai = null }
        finalId = ai
        via = 'AI-backstop'
        if (ai === sc.domain) backstopCorrect++
      }
    }
    if (finalId === sc.domain) combinedCorrect++
    rows.push({ key: sc.key, expected: sc.domain, kw: kw.result === 'one' ? kw.id : kw.result, via, final: finalId, ok: finalId === sc.domain })
  }

  const n = SCENARIOS.length
  console.log(`\n=== DOMAIN-DETECTION CHECK — ${n} cases · AI backstop ${HAS_AI ? 'ON' : 'OFF'} ===\n`)
  console.log('Keyword pass alone:')
  console.log(`  correct single domain : ${kwCorrect}/${n}`)
  console.log(`  WRONG single domain   : ${kwWrong}/${n}`)
  console.log(`  no domain (→backstop) : ${kwNone}/${n}`)
  console.log(`  tie (→ask advisor)    : ${kwTie}/${n}`)
  if (HAS_AI) {
    console.log(`\nAI backstop (fired only on the ${backstopFired} no-domain cases):`)
    console.log(`  rescued correctly     : ${backstopCorrect}/${backstopFired}`)
  }
  console.log(`\nCombined (keyword + backstop) correct: ${combinedCorrect}/${n} (${(combinedCorrect / n * 100).toFixed(0)}%)`)
  console.log('\nMisses / backstop decisions:')
  rows.filter(r => !r.ok || r.via === 'AI-backstop').forEach(r => {
    console.log(`  [${r.ok ? 'OK ' : 'XX '}] ${r.expected.padEnd(14)} via ${String(r.via).padEnd(12)} → ${r.final || '—'}   (${r.key})`)
  })
  console.log('')
}

main()
