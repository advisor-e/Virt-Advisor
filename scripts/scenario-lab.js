'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO LAB — a repeatable cross-domain test bench + case-study writer.
//
// WHY: see how the engine (and the AI layer) would handle a realistic advisor
// session in EVERY one of the 14 content domains, in one run — and get a PLAIN-
// ENGLISH report explaining what got recommended and why, the same way the live
// app's "Why this recommendation" panel does. Change the engine → re-run → read
// the report → see what moved, in all 14 at once.
//
// It runs the REAL pipeline (no reconstruction): extractProblemSignals →
// resolveTemplatesWithOutlier → buildDisplaySet, plus the AI layer
// (classifyDistinctions, readDistressAI) when an OpenAI key is present.
//
// RUN (deterministic, fast, free):       node scripts/scenario-lab.js
// RUN (with AI distinctions + distress):  NODE_EXTRA_CA_CERTS=./certs/digicert-bundle.pem node -r dotenv/config scripts/scenario-lab.js
// FILTER to one domain:                   node scripts/scenario-lab.js profit
// OUTPUT: writes design/SCENARIO-LAB-REPORT.md (readable case-study notes).
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const { extractProblemSignals, SIGNAL_DESCRIPTIONS } = require('../server/utils/problemSignals')
const { staircaseToCeiling, DOMAIN_NATURAL_ENGAGEMENT } = require('../server/utils/caseState')
const { resolveTemplatesWithOutlier, buildDisplaySet } = require('../server/utils/templateResolver')
const templates = require('../data/templates.json')

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

// ── The invented sessions — one realistic full session per domain ────────────
const SCENARIOS = [
  { key: 'profit · ORDINARY (margins/pricing)', domain: 'profit', staircase: 3, budget: 3, industry: 'a small manufacturer',
    opening: 'Their margins keep shrinking and they don\'t really know what each product actually costs to make.',
    situationDiagnostic: 'Costs have crept up, they guess their prices, and they have never modelled their break-even.',
    clientAlreadyTried: 'They put prices up once across the board, lost a few customers, got scared and stopped.',
    domainConfirmed: 'Yes, it is really about understanding their costs and pricing properly.',
    expect: 'cost/pricing/feasibility + revenue model tools; NOT crisis tools' },
  { key: 'profit · CRISIS (café liquidation)', domain: 'profit', staircase: 3, budget: 3, industry: 'a couple of cafes',
    opening: 'I have a client who is scared about going under and not sure how they will make ends meet — they think the business could be lost.',
    situationDiagnostic: 'Poor financial management, not upselling as much as they could, and an economic downturn hitting everyone.',
    clientAlreadyTried: 'Nothing really — they put their head in the sand and hoped it would get better.',
    domainConfirmed: 'It is more serious than a downturn — we are talking about whether they stay in business or are forced out entirely, possibly facing liquidation.',
    expect: 'SURVIVAL tools should lead (Quick & Worst, Receivership vs Liquidation); sales tools secondary' },
  { key: 'staff · performance/delegation', domain: 'staff', staircase: 3, budget: 2, industry: 'a building firm',
    opening: 'The owner is drowning because the team can\'t be trusted to run anything without them.',
    situationDiagnostic: 'No clear roles, nobody is held to account, and the owner does everything themselves.',
    clientAlreadyTried: 'They hired a 2IC last year but never gave them real authority so it changed nothing.',
    domainConfirmed: 'Yes, it is about the team\'s performance and the owner being able to delegate.',
    expect: 'staff/team performance + accountability tools' },
  { key: 'data-systems · unreliable numbers', domain: 'data-systems', staircase: 2, budget: 2, industry: 'a retailer',
    opening: 'They genuinely don\'t trust their own numbers — the books are a mess and reports are always late.',
    situationDiagnostic: 'Everything is in spreadsheets, data is entered twice, and there is no single source of truth.',
    clientAlreadyTried: 'They bought accounting software but never set it up properly so it sits unused.',
    domainConfirmed: 'Yes, it is about getting reliable data and reporting they can rely on.',
    expect: 'data quality / reporting / financial-systems tools' },
  { key: 'sales-marketing · weak pipeline', domain: 'sales-marketing', staircase: 3, budget: 2, industry: 'a services business',
    opening: 'Not enough new customers are coming through the door and sales have gone flat.',
    situationDiagnostic: 'No marketing to speak of, no follow-up on leads, and no real sales process.',
    clientAlreadyTried: 'They boosted a few posts on social media but got nothing measurable from it.',
    domainConfirmed: 'Yes, it is about lifting sales volume and getting a proper pipeline.',
    expect: 'sales process / customer journey / marketing tools' },
  { key: 'forecasting · cash-flow surprises', domain: 'forecasting', staircase: 3, budget: 2, industry: 'a hospitality venue',
    opening: 'They keep getting blindsided by cash — some months there is nothing left to pay the bills.',
    situationDiagnostic: 'Very seasonal, no forecast, and they spend in the good months without planning for the lean ones.',
    clientAlreadyTried: 'They tried watching the bank balance but that is reactive and too late.',
    domainConfirmed: 'Yes, it is about forecasting cash flow so there are no surprises.',
    expect: 'forecasting / cash-flow / reporting tools' },
  { key: 'governance · accountability', domain: 'governance', staircase: 4, budget: 2, industry: 'a professional firm',
    opening: 'Decisions get made in meetings and then nothing happens — no one owns anything.',
    situationDiagnostic: 'No structure to decisions, the partners undermine each other, and accountability is non-existent.',
    clientAlreadyTried: 'They started weekly meetings but with no agenda they just talk in circles.',
    domainConfirmed: 'Yes, it is about decision-making and accountability at the top.',
    expect: 'governance / accountability / decision tools' },
  { key: 'strategy · no direction', domain: 'strategy', staircase: 4, budget: 2, industry: 'a tech company',
    opening: 'They have lost their way — the market shifted and they are not sure what their business even is anymore.',
    situationDiagnostic: 'No clear plan, chasing every opportunity, and their old competitive edge has gone.',
    clientAlreadyTried: 'They did a one-page plan at a retreat two years ago and never looked at it again.',
    domainConfirmed: 'Yes, it is about strategic direction and where the business is heading.',
    expect: 'strategy / planning / competitive-position tools' },
  { key: 'systems · chaotic process', domain: 'systems', staircase: 3, budget: 2, industry: 'a manufacturer',
    opening: 'Everything is chaotic — jobs fall through the cracks because nothing is documented or repeatable.',
    situationDiagnostic: 'No standard processes, constant bottlenecks, and it all lives in one person\'s head.',
    clientAlreadyTried: 'They wrote a few procedures once but no one follows them.',
    domainConfirmed: 'Yes, it is about getting proper systems and processes in place.',
    expect: 'systems / process / workflow tools' },
  { key: 'valuation · what is it worth', domain: 'valuation', staircase: 4, budget: 2, industry: 'a wholesaler',
    opening: 'The owner wants to know what the business is actually worth — they are thinking about selling.',
    situationDiagnostic: 'They have had an offer but no idea if it is fair and no recent valuation.',
    clientAlreadyTried: 'They used an online valuation calculator and didn\'t trust the result.',
    domainConfirmed: 'Yes, it is about valuing the business properly before any sale.',
    expect: 'valuation / specialist tools' },
  { key: 'risk · over-reliant on one customer', domain: 'risk', staircase: 4, budget: 2, industry: 'a contract supplier',
    opening: 'They have one customer that is 70% of revenue and no plan for if that customer leaves.',
    situationDiagnostic: 'No contingency, no key-person cover, and no risk planning at all.',
    clientAlreadyTried: 'They keep saying they will diversify but never get to it.',
    domainConfirmed: 'Yes, it is about managing the risk of being so exposed.',
    expect: 'risk / contingency / specialist tools' },
  { key: 'succession · owner wants out', domain: 'succession', staircase: 4, budget: 2, industry: 'a family farm',
    opening: 'The owner is getting older and wants to step back but there is no plan for who takes over.',
    situationDiagnostic: 'The kids might take it on but nothing is agreed and the owner\'s identity is tied up in it.',
    clientAlreadyTried: 'They talked about it at Christmas once and it caused a family argument.',
    domainConfirmed: 'Yes, it is about succession and handing the business on.',
    expect: 'succession / exit / family-handover tools' },
  { key: 'conflict · partners not aligned', domain: 'conflict', staircase: 3, budget: 2, industry: 'a two-partner business',
    opening: 'The two partners are barely talking — one feels they do all the work and it is getting toxic.',
    situationDiagnostic: 'They never agreed what each wanted from the business and resentment has built up.',
    clientAlreadyTried: 'They tried to thrash it out themselves and it turned into a shouting match.',
    domainConfirmed: 'Yes, it is about the conflict between the partners.',
    expect: 'conflict / mediation / alignment tools' },
  { key: 'eoy · compliance-to-value', domain: 'eoy', staircase: 2, budget: 2, industry: 'a general SME',
    opening: 'We have the end-of-year meeting coming up and I want to turn it into more than signing off the accounts.',
    situationDiagnostic: 'The compliance work is done; I want to add value and open up advisory.',
    clientAlreadyTried: 'Last year the EOY meeting was 20 minutes of signing forms and nothing more.',
    domainConfirmed: 'Yes, it is about making the end-of-year meeting valuable.',
    expect: 'EOY meeting / value-conversation tools' },
  { key: 'due-diligence · buying a business', domain: 'due-diligence', staircase: 4, budget: 2, industry: 'an acquirer',
    opening: 'My client is looking at buying another business and needs help working out if it is a good deal.',
    situationDiagnostic: 'They have the target\'s accounts but don\'t know what to check or what the risks are.',
    clientAlreadyTried: 'They glanced at the P&L themselves but have no structured process.',
    domainConfirmed: 'Yes, it is about due diligence on the acquisition.',
    expect: 'due-diligence / acquisition / specialist tools' }
]

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
    return r
  })
}

const describeSignals = (s) => {
  const keys = Object.keys(s)
  if (!keys.length) return '_none — the engine read no problem signals from the words, so this domain ran on generic priors only_'
  return keys.map(n => `${SIGNAL_DESCRIPTIONS[n] || n} (×${s[n]})`).join(', ')
}

// ── Run one scenario through the real pipeline ───────────────────────────────
function runScenario (sc, boosts) {
  // CURRENT live engine reads situationDiagnostic + the confirmation.
  const text = [sc.situationDiagnostic, sc.domainConfirmed].filter(Boolean).join(' ')
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
  return { problemSignals, ceiling, engagement, budget: strategy.templateBudget, cards, hasOutlier: resolved.hasOutlier }
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

  // ── Render the readable case-study report ──────────────────────────────────
  const lines = []
  lines.push('# Scenario Lab — Cross-Domain Case-Study Report')
  lines.push('')
  lines.push(`> **Auto-generated** by \`scripts/scenario-lab.js\` — re-run to refresh. Do not hand-edit.`)
  lines.push('> Each section is an invented advisor session run through the **real** engine; the "why" is the engine\'s own scoring reasons, translated to plain English.')
  lines.push('>')
  lines.push(`> Coverage: **${scenarios.length} sessions across all 14 content domains**. AI layer (firm distinctions + distress read): **${HAS_AI ? 'ON' : 'OFF — run with the OpenAI key to include it'}**.`)
  lines.push('')
  // Summary table
  lines.push('## At a glance')
  lines.push('')
  lines.push('| Domain | Top recommendation | Signal lever fired? | Distress |')
  lines.push('|---|---|---|---|')
  for (const r of results) {
    const sigFired = Object.keys(r.run.problemSignals).length > 0 ? 'yes' : '**no**'
    const top = r.run.cards[0] ? r.run.cards[0].title : '—'
    lines.push(`| ${r.sc.domain} | ${top} | ${sigFired} | ${r.distress === null ? '–' : (r.distress ? 'TRUE' : 'false')} |`)
  }
  const silent = results.filter(r => Object.keys(r.run.problemSignals).length === 0).length
  lines.push('')
  lines.push(`**Signal coverage:** the problem-signal lever fired in ${results.length - silent}/${results.length} sessions — it was **silent in ${silent}**, which therefore ran on generic domain priors only. Those are the domains where relevance is weakest.`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const r of results) {
    const { sc, run, boosts, distress } = r
    lines.push(`## ${sc.key}`)
    lines.push('')
    lines.push('**The advisor\'s session (invented):**')
    lines.push(`- _Core problem:_ ${sc.opening}`)
    lines.push(`- _What contributed:_ ${sc.situationDiagnostic}`)
    lines.push(`- _Already tried:_ ${sc.clientAlreadyTried}`)
    lines.push(`- _On the check-in, the advisor said:_ ${sc.domainConfirmed}`)
    lines.push(`- _Industry:_ ${sc.industry} · _Advisory Staircase:_ step ${sc.staircase} · _Sessions:_ ${sc.budget}`)
    lines.push('')
    lines.push('**What the engine decided:**')
    lines.push(`- **Domain:** ${sc.domain} · **Engagement:** ${run.engagement} · **Complexity ceiling:** ${run.ceiling} · **Budget:** ${run.budget} template(s)`)
    lines.push(`- **Problem signals read:** ${describeSignals(run.problemSignals)}`)
    if (HAS_AI) {
      const bk = Object.keys(boosts)
      lines.push(`- **Firm distinctions boosting templates:** ${bk.length ? bk.map(k => `${k} (+${boosts[k]})`).join(', ') : '_none matched_'}`)
      lines.push(`- **Distress read (business may be failing?):** ${distress === null ? 'n/a' : (distress ? '**YES**' : 'no')}`)
    }
    lines.push('')
    lines.push('**Recommended templates, and why:**')
    if (!run.cards.length) {
      lines.push('- _No template scored above zero — nothing surfaced._')
    } else {
      run.cards.forEach((c, i) => {
        const why = explainReasons(c.matchReasons)
        lines.push(`${i + 1}. **${c.title}** _(score ${c.score})_ — ${why.length ? why.join('; ') : 'matched on domain prior only'}.`)
      })
    }
    lines.push('')
    lines.push(`**Expected:** ${sc.expect}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const outPath = path.join(process.cwd(), 'design', 'SCENARIO-LAB-REPORT.md')
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

  // Console summary
  console.log(`\nScenario Lab — ${scenarios.length} sessions across 14 domains · AI layer ${HAS_AI ? 'ON' : 'OFF'}`)
  console.log(`Signal lever silent in ${silent}/${results.length} domains (ran on priors only).`)
  if (HAS_AI) {
    const dt = results.filter(r => r.distress === true).length
    console.log(`Distress read fired TRUE in ${dt}/${results.length} sessions.`)
  }
  console.log(`\nReadable report written to: design/SCENARIO-LAB-REPORT.md\n`)
}

main()
