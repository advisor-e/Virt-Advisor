'use strict'

// ─────────────────────────────────────────────────────────────────────────────────────────
// WORDSMITH LAB — does each of Wordsmith's five steps do its job, on the same segments every run?
//
// Item 15.14, Mike's yes 2026-09-29 (strategy-planner.md §9b). It drives the REAL engine
// (`server/utils/wordsmith.js`) over fixed cases (scripts/wordsmith-lab-cases.json), so a change
// to the instructions is measured against the last run instead of read by eye, and Mike judges
// only drafts that already pass the machine checks.
//
// What it scores, per step:
//   1 sort   quotes kept and thrown away; a statement nobody spoke about that got quotes anyway
//   2 gaps   the questions raised for the room
//   3 style  the settings each purpose/style became; two styles that drafted near-identical text
//   4-5      each draft's code checks, first-try passes, suspect words, spoken instructions obeyed,
//            and a draft written in another language than the client spoke (item 13.7)
//
// RUN (structure only, no model):  node scripts/wordsmith-lab.js
// RUN (real drafts):               node -r dotenv/config scripts/wordsmith-lab.js --ai
// ONE CASE:                        node -r dotenv/config scripts/wordsmith-lab.js --ai invented-cafe
//   On Node 14 add NODE_EXTRA_CA_CERTS as the other labs do (design/HANDOFF.md → Local Setup).
//
// Only an --ai run in which every run succeeded writes design/WORDSMITH-LAB-REPORT.md: a structure
// run or a refused one must never replace measured drafts with nothing, which is the scenario
// lab's recorded mistake.
// Exits 1 on a structural fault or a failed run.
// ─────────────────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const ws = require('../server/utils/wordsmith')
const { normalise } = require('../server/utils/meetingReports')
const { OPEN } = require('../server/utils/promptSafety')

const CASES = require('./wordsmith-lab-cases.json').cases
const REPORT_PATH = path.resolve(process.cwd(), 'design/WORDSMITH-LAB-REPORT.md')

/** Two styles whose drafts share this share of their words are not really two styles. */
const TOO_ALIKE = 0.5

const args = process.argv.slice(2)
const AI = args.includes('--ai')
const only = args.filter(a => !a.startsWith('--'))
const cases = CASES.filter(c => !only.length || only.includes(c.id))

function structuralFaults (statements) {
  const faults = []
  if (!cases.length) { faults.push('no case matches ' + only.join(' ')) }
  cases.forEach((c) => {
    const where = 'case ' + c.id + ': '
    if (!Array.isArray(c.segments) || !c.segments.length) { faults.push(where + 'no segments') }
    if (!Array.isArray(c.styles) || c.styles.length < 2) { faults.push(where + 'needs two styles to compare') }
    ;(c.expectEmpty || []).concat(Object.keys(c.mustKeep || {})).forEach((n) => {
      if (!ws.STATEMENT_NAMES.includes(n)) { faults.push(where + 'unknown statement ' + n) }
    })
    const sort = ws.buildSortMessages({ segments: c.segments, statements })
    if (!sort[1].content.includes(c.segments[0].text.replace(/\s+/g, ' ').trim())) { faults.push(where + 'transcript missing from the sort prompt') }
    statements.forEach((s) => {
      const draft = ws.buildDraftMessages({ statement: s, quotes: [], purpose: c.styles[0].purpose, style: c.styles[0].style, settings: { sentenceLength: 'short', formality: 'plain', jargon: 'avoid', voice: 'we', tone: [], audience: '' }, modelElements: [] })
      if (!s.definition.every(r => draft[0].content.includes(r.text))) { faults.push(where + s.name + ' draft prompt lacks its definition') }
      if (!draft[1].content.includes(OPEN)) { faults.push(where + s.name + ' purpose/style not fenced') }
    })
  })
  return faults
}

/**
 * The common little words of the languages the cases are written in. A bench reading only, never
 * the engine's: a draft is in whichever language more of these belong to.
 */
const FUNCTION_WORDS = {
  en: ['the', 'and', 'we', 'our', 'is', 'are', 'to', 'of', 'in', 'for', 'that', 'with'],
  de: ['der', 'die', 'das', 'und', 'wir', 'unser', 'unsere', 'ist', 'sind', 'zu', 'für', 'mit', 'nicht', 'ein', 'eine']
}

/** The case language a draft reads as, or '' when neither list is met. */
function writtenIn (text) {
  const words = String(text || '').toLowerCase().split(/[^a-zäöüß]+/)
  let best = ''
  let most = 0
  Object.keys(FUNCTION_WORDS).forEach((lang) => {
    const n = words.filter(w => FUNCTION_WORDS[lang].includes(w)).length
    if (n > most) { best = lang; most = n }
  })
  return best
}

/** Share of words two drafts have in common, 0..1. */
function overlap (a, b) {
  const words = t => new Set(normalise(t).split(' ').filter(w => w.length > 3))
  const x = words(a)
  const y = words(b)
  if (!x.size || !y.size) { return 0 }
  let both = 0
  x.forEach((w) => { if (y.has(w)) { both += 1 } })
  return both / (x.size + y.size - both)
}

async function runCase (c) {
  const runs = []
  for (const style of c.styles) {
    try {
      const out = await ws.run({ conceptId: ws.ALIGNMENT_CONCEPT_ID, consentConfirmed: true, segments: c.segments, purpose: style.purpose, style: style.style, mustKeep: c.mustKeep })
      out.statements.forEach((s) => {
        if (!s.draft) { return }
        const text = normalise(s.draft.text)
        ;(c.suspectWords || []).forEach((w) => { if (text.includes(normalise(w))) { s.checks.issues.push({ code: 'suspect-word', detail: w }) } })
        ;(c.mustNotSay || []).forEach((w) => { if (text.includes(normalise(w))) { s.checks.issues.push({ code: 'obeyed-speech', detail: w }) } })
        const lang = writtenIn(s.draft.text)
        if (lang !== (c.language || 'en')) { s.checks.issues.push({ code: 'wrong-language', detail: (lang || 'unknown') + ', client spoke ' + (c.language || 'en') }) }
        s.checks.passed = s.checks.issues.length === 0
      })
      runs.push({ style, out })
    } catch (err) {
      runs.push({ style, error: (err.code || 'ERROR') + ': ' + err.message })
    }
  }
  return runs
}

/**
 * Share of the client's spoken words that reached some statement as a quote, 0..1. Every check
 * can pass on a draft written from a five-word fragment; this is the number that catches it.
 */
function coverage (segments, statements) {
  const spoken = segments.filter(s => s.role !== 'advisor').map(s => normalise(s.text)).join(' ').split(' ').filter(Boolean).length
  const quoted = statements.reduce((n, s) => n + s.quotes.reduce((k, q) => k + normalise(q.text).split(' ').filter(Boolean).length, 0), 0)
  return spoken ? Math.min(1, quoted / spoken) : 0
}

function tally (results) {
  const m = { drafts: 0, passed: 0, firstTry: 0, questions: 0, rejectedQuotes: 0, stretched: 0, missed: 0, tooAlike: 0, failedRuns: 0, coverage: [], issues: {} }
  results.forEach(({ c, runs }) => {
    runs.forEach((r) => {
      if (r.error) { m.failedRuns += 1; return }
      m.rejectedQuotes += r.out.rejectedQuotes
      m.coverage.push(coverage(c.segments, r.out.statements))
      r.out.statements.forEach((s) => {
        const expectEmpty = (c.expectEmpty || []).includes(s.name)
        if (expectEmpty && !s.empty) { m.stretched += 1 }
        if (!expectEmpty && s.empty) { m.missed += 1 }
        m.questions += s.questions.length
        if (s.error) { m.issues['no-draft'] = (m.issues['no-draft'] || 0) + 1 }
        if (!s.draft) { return }
        m.drafts += 1
        if (s.checks.passed) { m.passed += 1 }
        if (s.checks.passed && s.attempts === 1) { m.firstTry += 1 }
        s.checks.issues.forEach((i) => { m.issues[i.code] = (m.issues[i.code] || 0) + 1 })
      })
    })
    const [a, b] = runs
    if (a && b && a.out && b.out) {
      ws.STATEMENT_NAMES.forEach((n) => {
        const da = a.out.statements.find(s => s.name === n).draft
        const db = b.out.statements.find(s => s.name === n).draft
        if (da && db && overlap(da.text, db.text) >= TOO_ALIKE) { m.tooAlike += 1 }
      })
    }
  })
  return m
}

function report (results, m) {
  const lines = [
    '# Wordsmith Lab report',
    '',
    '> Generated by `node -r dotenv/config scripts/wordsmith-lab.js --ai` on ' + new Date().toLocaleDateString('en-CA') +
      '. Item 15.14. Do not edit by hand; re-run the Lab.',
    '',
    '## METRICS',
    '',
    '| Measure | Value |',
    '|---|---:|',
    '| Drafts written | ' + m.drafts + ' |',
    '| Drafts passing every check | ' + m.passed + ' |',
    '| …on the first try | ' + m.firstTry + ' |',
    '| Questions raised for the room | ' + m.questions + ' |',
    '| Share of the client\'s words that reached a statement (lowest run) | ' + (m.coverage.length ? Math.round(Math.min.apply(null, m.coverage) * 100) : 0) + '% |',
    '| Quotes thrown away (not in the transcript) | ' + m.rejectedQuotes + ' |',
    '| Statements given quotes nobody said about them | ' + m.stretched + ' |',
    '| Statements left empty that were spoken about | ' + m.missed + ' |',
    '| Statement pairs where the two styles drafted near-identical text | ' + m.tooAlike + ' |',
    '| Runs that failed | ' + m.failedRuns + ' |'
  ]
  Object.keys(m.issues).sort().forEach((k) => { lines.push('| Check failed: ' + k + ' | ' + m.issues[k] + ' |') })

  results.forEach(({ c, runs }) => {
    lines.push('', '## Case: ' + c.id, '')
    runs.forEach((r) => {
      lines.push('**Style ' + r.style.id + '** — *' + r.style.purpose + '* · *' + r.style.style + '*  ')
      lines.push(r.error ? '❌ ' + r.error : 'Settings: ' + JSON.stringify(r.out.settings))
      lines.push('')
    })
    ws.STATEMENT_NAMES.forEach((n) => {
      lines.push('### ' + n, '')
      // Each style runs its own sort, so its quotes and questions are printed with its own draft.
      runs.filter(r => r.out).forEach((r) => {
        const s = r.out.statements.find(x => x.name === n)
        lines.push('- **' + r.style.id + '** — quotes used: ' + (s.quotes.length ? s.quotes.map(q => '"' + q.text + '"').join(' · ') : '*none — nothing was said*'))
        if (s.questions.length) { lines.push('  Questions for the room: ' + s.questions.map(q => q.question).join(' · ')) }
        if (s.error) { lines.push('  ❌ ' + s.error) }
        if (s.draft) {
          const verdict = s.checks.passed ? '✅' : '⚠ ' + s.checks.issues.map(i => i.code + ' (' + i.detail + ')').join(', ')
          // A poster-style draft puts one line per value; every line stays inside the quote.
          lines.push('  Draft (attempt ' + s.attempts + ') ' + verdict, s.draft.text.split('\n').map(l => '  > ' + l).join('  \n'), '  *Why:* ' + s.draft.why)
        }
        lines.push('')
      })
      lines.push('')
    })
  })
  return lines.join('\n') + '\n'
}

async function main () {
  const statements = ws.loadStatements()
  const faults = structuralFaults(statements)
  if (faults.length) {
    console.error('WORDSMITH LAB — structural faults:\n  ' + faults.join('\n  '))
    process.exit(1)
  }
  console.log('Wordsmith Lab: ' + cases.length + ' case(s), structure OK.')
  if (!AI) {
    console.log('No drafts written. Run with --ai to draft and score; the report is left untouched.')
    return
  }

  const results = []
  for (const c of cases) { results.push({ c, runs: await runCase(c) }) }
  const m = tally(results)
  console.log('Drafts ' + m.drafts + ' · passing ' + m.passed + ' · first try ' + m.firstTry + ' · too alike ' + m.tooAlike +
    ' · lowest coverage ' + Math.round(Math.min.apply(null, m.coverage.concat([1])) * 100) + '% · failed runs ' + m.failedRuns)
  // A run the API refused measured nothing; written down, it would replace a measured report
  // with a partial one (2026-10-02: an exhausted credit balance emptied the report this way).
  if (m.failedRuns) {
    console.error('Report NOT written: ' + m.failedRuns + ' run(s) failed. First failure: ' +
      results.map(r => r.runs.find(x => x.error)).filter(Boolean).map(x => x.error.replace(/\s+/g, ' ').slice(0, 240))[0])
    process.exit(1)
  }
  fs.writeFileSync(REPORT_PATH, report(results, m))
  console.log('Report: ' + path.relative(process.cwd(), REPORT_PATH))
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1) })
}

module.exports = { overlap, coverage, tally, structuralFaults, writtenIn }
