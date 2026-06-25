'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// DISCOVER LAB — cross-query test bench for Discover (template search) mode.
//
// Discover = a LITERAL keyword pre-filter (filterTemplatesByQuery) → the AI ranks
// the candidates. This lab runs the REAL pre-filter over a fixed set of invented
// searches and measures: did the right template surface, and (for crisis searches)
// where do the survival tools rank? With a key, an AI-rank layer captures what the
// AI actually picks as "best match". Same idea as the Client scenario lab — change
// the search logic, re-run, see what moved across all searches before shipping.
//
// RUN:        node scripts/discover-lab.js
// WITH AI:    NODE_EXTRA_CA_CERTS=./certs/digicert-bundle.pem node -r dotenv/config scripts/discover-lab.js
// OUTPUT:     design/DISCOVER-LAB-REPORT.md
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const { filterTemplatesByQuery } = require('../server/utils/templates')
const allTemplates = require('../data/templates.json')

// Discover searches the client-delivery ("Do the Job") library only.
const POOL = allTemplates.filter(t => t.menuSection !== 'get-the-job' && t.menuSection !== 'get-organised')
const byTitle = {}
POOL.forEach(t => { byTitle[t.title] = t })

const CASES = require('./discover-lab-cases.json')
const CRISIS_TOOLS = ['Receivership vs Liquidation', 'Worst Case Scenario', 'Quick & Worst', 'Quick Position']
const TOPN = 8

const HAS_AI = !!process.env.OPENAI_API_KEY
let makeClient
if (HAS_AI) { makeClient = require('../server/utils/openaiClient').createOpenAIClient }

// AI-rank: mirror Discover's intent — given the pre-filtered candidates + the search,
// pick the single best match. Measured (JSON) so we can score it across all searches.
async function aiRank (query, candidates) {
  const client = makeClient({ apiKey: process.env.OPENAI_API_KEY })
  const list = candidates.slice(0, 20).map((t, i) => `${i + 1}. ${t.title} — ${(t.purpose || '').slice(0, 140)}`).join('\n')
  const prompt = `An advisor is searching for the single best advisory TEMPLATE for their situation. Pick the best match from the candidate list by MEANING. If the client's business may be FAILING (going under, insolvency, liquidation, receivership, cannot pay debts), prioritise survival/insolvency tools over general education tools.

Advisor's search: ${query}

Candidates:
${list}

Return ONLY JSON {"best":"<exact title>","alternatives":["<title>","<title>"]}.`
  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini', max_tokens: 80, temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = res.choices[0] && res.choices[0].message ? res.choices[0].message.content : '{}'
    const parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0])
    return { best: parsed.best || null, alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [] }
  } catch (_e) { return { best: null, alternatives: [] } }
}

async function main () {
  const results = []
  for (const c of CASES) {
    const re = new RegExp(c.expect, 'i')
    const ranked = filterTemplatesByQuery(POOL, c.query, 25) // the REAL Discover pre-filter
    const top = ranked.slice(0, TOPN)
    // First candidate whose TITLE matches the expectation, and its rank (1-based).
    const expectIdx = ranked.findIndex(t => re.test(t.title || ''))
    const expectRank = expectIdx === -1 ? null : expectIdx + 1
    // Where do the survival tools land?
    const crisisRanks = CRISIS_TOOLS.map(name => {
      const idx = ranked.findIndex(t => t.title === name)
      return { name, rank: idx === -1 ? null : idx + 1 }
    })
    let ai = null
    if (HAS_AI) { ai = await aiRank(c.query, ranked) }
    results.push({ c, re, top, expectRank, crisisRanks, ai })
  }

  // ── Metrics ─────────────────────────────────────────────────────────────────
  const n = results.length
  const preHitTop8 = results.filter(r => r.expectRank && r.expectRank <= TOPN).length
  const preHitAny = results.filter(r => r.expectRank).length
  const crisisCases = results.filter(r => r.c.isCrisis)
  const crisisToolTop3 = crisisCases.filter(r => r.crisisRanks.some(x => x.rank && x.rank <= 3)).length
  const aiHit = HAS_AI ? results.filter(r => r.ai && r.ai.best && r.re.test(r.ai.best)).length : null
  const aiCrisisHit = HAS_AI ? crisisCases.filter(r => r.ai && r.ai.best && CRISIS_TOOLS.includes(r.ai.best)).length : null

  const lines = []
  lines.push('# Discover Lab — Template-Search Test Bench')
  lines.push('')
  lines.push('> **Auto-generated** by `scripts/discover-lab.js` over `discover-lab-cases.json`. Re-run to refresh.')
  lines.push('> Discover = literal keyword pre-filter (`filterTemplatesByQuery`) → AI ranks. This measures both.')
  lines.push(`> ${n} fixed searches · client-delivery pool of ${POOL.length} templates · AI-rank: **${HAS_AI ? 'ON' : 'OFF'}**.`)
  lines.push('')
  lines.push('## Metrics')
  lines.push('')
  lines.push(`- **Pre-filter surfaces the right template in the top ${TOPN}:** ${preHitTop8}/${n} (${(preHitTop8 / n * 100).toFixed(0)}%) — anywhere in top-25: ${preHitAny}/${n}.`)
  lines.push(`- **Crisis searches with a survival tool in the top 3 (pre-filter):** ${crisisToolTop3}/${crisisCases.length}.`)
  if (HAS_AI) {
    lines.push(`- **AI best-match is the right kind of template:** ${aiHit}/${n} (${(aiHit / n * 100).toFixed(0)}%).`)
    lines.push(`- **Crisis searches where the AI led with a survival tool:** ${aiCrisisHit}/${crisisCases.length}.`)
  }
  lines.push('')
  lines.push('## At a glance')
  lines.push('')
  lines.push(`| Search | Crisis? | Pre-filter top-${TOPN} #1 | Right template rank | Survival tools (rank) | AI best match |`)
  lines.push('|---|:--:|---|:--:|---|---|')
  for (const r of results) {
    const crisisStr = r.crisisRanks.filter(x => x.rank).map(x => `${x.name.split(' ')[0]}#${x.rank}`).join(' ') || '—'
    const aiStr = r.ai ? (r.ai.best || '—') : '–'
    lines.push(`| ${r.c.key} | ${r.c.isCrisis ? 'YES' : ''} | ${r.top[0] ? r.top[0].title : '—'} | ${r.expectRank || '**none**'} | ${r.c.isCrisis ? crisisStr : ''} | ${aiStr} |`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  for (const r of results) {
    lines.push(`## ${r.c.key}${r.c.isCrisis ? '  ⚠ (crisis search)' : ''}`)
    lines.push('')
    lines.push(`**Search:** ${r.c.query}`)
    lines.push(`**Pre-filter top ${TOPN}:** ${r.top.map(t => t.title).join(' · ') || '—'}`)
    lines.push(`**Right template:** ${r.expectRank ? `rank ${r.expectRank}` : 'NOT in top-25'} (expected ~/${r.c.expect}/)`)
    if (r.c.isCrisis) {
      lines.push(`**Survival tools:** ${r.crisisRanks.map(x => `${x.name} → ${x.rank ? 'rank ' + x.rank : 'absent'}`).join(' · ')}`)
    }
    if (r.ai) {
      lines.push(`**AI best match:** ${r.ai.best || '—'}${r.ai.alternatives.length ? ` · alts: ${r.ai.alternatives.join(', ')}` : ''}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  fs.writeFileSync(path.join(process.cwd(), 'design', 'DISCOVER-LAB-REPORT.md'), lines.join('\n'), 'utf8')
  console.log(`\n=== DISCOVER LAB — ${n} searches · AI ${HAS_AI ? 'ON' : 'OFF'} ===`)
  console.log(`  pre-filter right-template in top ${TOPN}: ${preHitTop8}/${n}`)
  console.log(`  crisis: survival tool in top 3 (pre-filter): ${crisisToolTop3}/${crisisCases.length}`)
  if (HAS_AI) {
    console.log(`  AI best-match right kind: ${aiHit}/${n}`)
    console.log(`  crisis: AI led with a survival tool: ${aiCrisisHit}/${crisisCases.length}`)
  }
  console.log(`\nReport: design/DISCOVER-LAB-REPORT.md\n`)
}

main()
