'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ LAB — does every authored question bank actually reach a live session?
//
// The locking test (tests/unit/quizBankKeys.test.js) proves a bank key is an
// exact template-library title. It cannot prove the running engine ever FINDS
// that bank, nor that the grader points at the right model answer. This bench
// closes both gaps by driving the REAL production lookup (`findQuizBank`) and
// the REAL grader selection, once per bank, and writing what it saw.
//
// Emits design/QUIZ-LAB-REPORT.md:
//   • per-bank verdict — reached / orphan / bound to the WRONG bank
//   • grader wiring — every entry id resolves to its own answer + key point
//   • the brief the AI receives for that bank (size, entry count, first entry)
//   • library coverage — which pages have a bank, by section
//   • a METRICS block, so a future change can be measured on the same banks
//
// RUN (structure only, no generation): node scripts/quiz-lab.js
// FILTER to matching banks:    node scripts/quiz-lab.js ratio
// RUN with real generation:    node -r dotenv/config scripts/quiz-lab.js --ai 3
//   (one gpt-4o call per sampled bank. Run it whenever generation is what needs
//    proving — cost is not a reason to skip it (Mike, 2026-08-02). On Node 14 add
//    NODE_EXTRA_CA_CERTS as the other labs do — pointed at a bundle covering whatever
//    re-signs HTTPS here. certs/digicert-bundle.pem does NOT cover an AV TLS scanner;
//    see design/HANDOFF.md → Local Setup / Run.)
//
// Exits 1 when a structural fault is found, so it can be wired to CI later.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const { findQuizBank } = require('../server/utils/quizOverrides')
const { validateQuizGenerate } = require('../server/utils/validateAIResponse')
const templates = require('../data/templates.json')

const QUIZ_PATH = path.resolve(process.cwd(), 'data/course-quizzes.json')
const REPORT_PATH = path.resolve(process.cwd(), 'design/QUIZ-LAB-REPORT.md')
const quizzes = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'))
const banks = quizzes.banks || {}

const args = process.argv.slice(2)
const aiFlag = args.indexOf('--ai')
const AI_SAMPLE = aiFlag === -1 ? 0 : (parseInt(args[aiFlag + 1], 10) || 3)
const filter = args.filter((a, i) => !a.startsWith('--') && i !== aiFlag + 1).join(' ').toLowerCase()

const liveBanks = Object.keys(banks)
  .filter(k => !k.startsWith('_'))
  .filter(k => !filter || k.toLowerCase().includes(filter))

// ── The brief the AI receives ────────────────────────────────────────────────
// Mirrors server/courseEngine.js -> handleQuizGenerate (the bank block and the
// bank-specific requirements). Kept as a mirror rather than an import because
// the engine builds it inline inside the request handler; if that block changes
// and this does not, the "brief" section below goes stale — the reach and
// grader checks above it drive the real code and stay true regardless.
function buildBankBrief (bank) {
  const entries = bank.entries
    .map(e => `Entry ${e.id}\nQuestion: ${e.question}\nKey point: ${e.keyPoint}`)
    .join('\n')
  return '\nFirm-authored question bank for the template this session teaches from (mandatory source material):\n' +
    entries + '\n'
}

/**
 * A session as the course engine hands it to the quiz route: an AI-invented
 * title (never a page title — that is the whole reason CB-12 matches on
 * resources) plus the exact template titles CB-02 guarantees in `resources`.
 *
 * The resource is taken from the LIBRARY, never from the bank key. Feeding the
 * key back in would make the reach check circular: a mis-keyed bank would match
 * itself exactly and look healthy, which is the very fault this bench exists to
 * catch.
 *
 * @param {string} libraryTitle - a title as it appears in data/templates.json
 * @returns {{title: string, resources: Array<string>, objectives: Array<string>}}
 */
function sessionFor (libraryTitle) {
  return {
    title: `Session 2: Putting ${libraryTitle.split(' ')[0]} to work with your client`,
    resources: [libraryTitle],
    objectives: ['Understand the framework', 'Apply it in a client meeting']
  }
}

/**
 * @param {string} key - a bank key as authored
 * @returns {string|null} the library's own spelling of that title, or null when
 *   no page carries it (an orphan bank no session can ever request)
 */
function libraryTitleFor (key) {
  const wanted = String(key).trim().toLowerCase()
  const hit = templates.find(t => String(t.title || '').trim().toLowerCase() === wanted)
  return hit ? hit.title : null
}

function checkReach (key) {
  const expected = banks[key]
  const libraryTitle = libraryTitleFor(key)
  if (!libraryTitle) {
    return { status: 'ORPHAN', note: 'no library page carries this title, so no session can ever request it' }
  }
  const found = findQuizBank(banks, sessionFor(libraryTitle), templates)
  if (found === expected) { return { status: 'reached', note: '' } }
  if (!found) { return { status: 'ORPHAN', note: `a session teaching from "${libraryTitle}" finds no bank` } }
  const wrongKey = liveBanks.find(k => banks[k] === found) ||
    Object.keys(banks).find(k => banks[k] === found)
  return { status: 'MISBOUND', note: `binds to the "${wrongKey}" bank instead` }
}

/**
 * Grader wiring: handleQuizGrade selects the marking guide with
 * `bank.entries.find(e => e.id === bankRef)`. Every id a generated question can
 * cite must therefore resolve to its OWN entry, with an answer and a key point.
 *
 * @param {{entries: Array}} bank
 * @returns {Array<string>} human-readable faults, empty when the wiring is sound
 */
function checkGrader (bank) {
  const faults = []
  const seen = new Set()
  bank.entries.forEach((entry, i) => {
    if (!Number.isInteger(entry.id)) { faults.push(`entry ${i + 1} has a non-integer id`) }
    if (seen.has(entry.id)) { faults.push(`duplicate id ${entry.id} — the grader would mark against the first one`) }
    seen.add(entry.id)
    const selected = bank.entries.find(e => e.id === entry.id)
    if (selected !== entry) { faults.push(`id ${entry.id} selects a different entry`) }
    if (!entry.answer || !String(entry.answer).trim()) { faults.push(`id ${entry.id} has no model answer`) }
    if (!entry.keyPoint || !String(entry.keyPoint).trim()) { faults.push(`id ${entry.id} has no key point`) }
  })
  return faults
}

function coverage () {
  const keyed = new Set(liveBanks.map(k => k.toLowerCase()))
  const bySection = new Map()
  for (const t of templates) {
    const section = `${t.section || '(none)'} / ${t.subSection || '(none)'}`
    if (!bySection.has(section)) { bySection.set(section, { total: 0, withBank: 0 }) }
    const row = bySection.get(section)
    row.total++
    if (keyed.has(String(t.title || '').toLowerCase())) { row.withBank++ }
  }
  return bySection
}

// ── AI mode ──────────────────────────────────────────────────────────────────
function normaliseText (s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

/** Word overlap 0..1 — used only to flag a question copied near-verbatim. */
function overlap (a, b) {
  const wordsA = new Set(normaliseText(a).split(' ').filter(w => w.length > 3))
  const wordsB = new Set(normaliseText(b).split(' ').filter(w => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) { return 0 }
  let shared = 0
  wordsA.forEach(w => { if (wordsB.has(w)) { shared++ } })
  return shared / Math.min(wordsA.size, wordsB.size)
}

async function generateFor (key, client) {
  const bank = banks[key]
  const libraryTitle = libraryTitleFor(key) || key
  const template = templates.find(t => t.title === libraryTitle)
  // Stand-in for "what the session taught". A real session's content is written
  // by the AI live; the page's own purpose is the closest honest substitute, and
  // the report labels it as synthetic so nobody reads it as a real transcript.
  const taught = `${(template && template.purpose) || key}\n\nTopics: ${(template && template.support) || ''}`
  const prompt = `Generate exactly 3 quiz questions to test an advisor's understanding of a course session.

Session details and content covered (AI responses):
Session title: ${sessionFor(libraryTitle).title}
Session objectives: Understand the framework; Apply it in a client meeting
Session content covered:
${taught}
${buildBankBrief(bank)}
Requirements:
- Open-ended questions (not multiple choice)
- Build every question from the firm-authored question bank above: choose the 3 entries most relevant to the session content covered, and tailor each to that content — adapt wording and scenario details, keep the entry's substance and key point. Never copy an entry word-for-word and never ask anything the bank does not cover.
- Each question must carry "bankRef": the id of the bank entry it is built from.
- Question 3 must ask the advisor to apply what was taught to their own practice or a client situation.
- Each question must relate to a session objective
- Answerable in 2-4 sentences

Return ONLY valid JSON with no other text:
{"questions":[{"id":1,"question":"...","objective":"...","bankRef":1},{"id":2,"question":"...","objective":"...","bankRef":2},{"id":3,"question":"...","objective":"...","bankRef":3}]}`

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    response_format: { type: 'json_object' }
  })
  const data = JSON.parse(completion.choices[0].message.content)
  const result = validateQuizGenerate(data)
  if (!result.valid) { return { key, error: `invalid AI shape: ${result.errors.join('; ')}` } }

  const questions = result.data.questions.map(q => {
    const entry = bank.entries.find(e => e.id === q.bankRef) || null
    return {
      question: q.question,
      objective: q.objective,
      bankRef: q.bankRef,
      entryQuestion: entry ? entry.question : null,
      fault: entry ? null : `cites bank entry ${q.bankRef}, which does not exist`,
      copied: entry ? overlap(q.question, entry.question) >= 0.9 : false
    }
  })
  return { key, questions }
}

// ── Report ───────────────────────────────────────────────────────────────────
async function main () {
  const rows = liveBanks.map(key => ({
    key,
    bank: banks[key],
    reach: checkReach(key),
    graderFaults: checkGrader(banks[key]),
    brief: buildBankBrief(banks[key])
  }))

  const orphans = rows.filter(r => r.reach.status === 'ORPHAN')
  const misbound = rows.filter(r => r.reach.status === 'MISBOUND')
  const graderBroken = rows.filter(r => r.graderFaults.length > 0)
  const entryTotal = rows.reduce((n, r) => n + r.bank.entries.length, 0)

  const aiResults = []
  if (AI_SAMPLE > 0) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('[quiz-lab] --ai needs OPENAI_API_KEY in the environment. Skipping generation.')
    } else {
      const { createOpenAIClient } = require('../server/utils/openaiClient')
      const client = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY })
      // Spread the sample across the bank list rather than taking the first N,
      // so one run exercises several source PDFs rather than a single one.
      const step = Math.max(1, Math.floor(rows.length / AI_SAMPLE))
      const sample = rows.filter((r, i) => i % step === 0).slice(0, AI_SAMPLE).map(r => r.key)
      for (const key of sample) {
        console.log(`[quiz-lab] generating for "${key}" ...`)
        try {
          aiResults.push(await generateFor(key, client))
        } catch (e) {
          aiResults.push({ key, error: e.message })
        }
      }
    }
  }

  const out = []
  out.push('# Quiz Lab Report')
  out.push('')
  out.push('Generated by `node scripts/quiz-lab.js` — see that file\'s header for what it proves.')
  out.push('Deterministic: the same banks and the same library produce the same report.')
  out.push('')
  out.push('## METRICS')
  out.push('')
  out.push('```')
  out.push(`banks examined          ${rows.length}${filter ? ` (filter: "${filter}")` : ''}`)
  out.push(`questions               ${entryTotal}`)
  out.push(`reached by a session    ${rows.length - orphans.length - misbound.length}`)
  out.push(`ORPHAN (never reached)  ${orphans.length}`)
  out.push(`MISBOUND (wrong bank)   ${misbound.length}`)
  out.push(`grader wiring faults    ${graderBroken.length}`)
  out.push('```')
  out.push('')

  out.push('## Per-bank verdict')
  out.push('')
  out.push('| Bank (page title) | Questions | Reach | Grader | Brief to AI |')
  out.push('| --- | --- | --- | --- | --- |')
  for (const r of rows) {
    const reach = r.reach.status === 'reached' ? 'reached' : `**${r.reach.status}** — ${r.reach.note}`
    const grader = r.graderFaults.length === 0 ? 'ok' : `**${r.graderFaults.join('; ')}**`
    out.push(`| ${r.key} | ${r.bank.entries.length} | ${reach} | ${grader} | ${r.brief.length} chars |`)
  }
  out.push('')

  out.push('## Library coverage')
  out.push('')
  out.push('Pages that have an authored bank, by section. A page with no bank still gets a quiz —')
  out.push('the AI writes it from the session content instead of the firm\'s own questions.')
  out.push('')
  out.push('| Section / sub-section | Pages | With a bank |')
  out.push('| --- | --- | --- |')
  const cov = coverage()
  let covered = 0
  let totalPages = 0
  for (const [section, row] of cov) {
    covered += row.withBank
    totalPages += row.total
    if (row.withBank > 0) { out.push(`| ${section} | ${row.total} | ${row.withBank} |`) }
  }
  out.push('')
  out.push(`**${covered} of ${totalPages} library pages have an authored bank.** Sections with none are omitted above.`)
  out.push('')

  out.push('## What the AI is told (opening of each brief)')
  out.push('')
  for (const r of rows) {
    out.push(`### ${r.key}`)
    out.push('')
    out.push('```')
    out.push(r.brief.trim().split('\n').slice(0, 5).join('\n'))
    out.push('```')
    out.push('')
  }

  if (aiResults.length > 0) {
    out.push('## Generated quizzes (AI mode)')
    out.push('')
    out.push('Session content is a stand-in — the page\'s own purpose text, not a real session')
    out.push('transcript. Judge the questions, not the session.')
    out.push('')
    for (const res of aiResults) {
      out.push(`### ${res.key}`)
      out.push('')
      if (res.error) {
        out.push(`FAILED: ${res.error}`)
        out.push('')
        continue
      }
      for (const q of res.questions) {
        out.push(`- **${q.question}**`)
        out.push(`  - objective: ${q.objective}`)
        out.push(`  - built from entry ${q.bankRef}: ${q.entryQuestion || '(missing)'}`)
        if (q.fault) { out.push(`  - **FAULT: ${q.fault}**`) }
        if (q.copied) { out.push('  - **FLAG: near-verbatim copy of the bank entry (the prompt forbids word-for-word)**') }
      }
      out.push('')
    }
  }

  fs.writeFileSync(REPORT_PATH, out.join('\n') + '\n', 'utf8')

  console.log('')
  console.log(`banks ${rows.length} | questions ${entryTotal} | orphans ${orphans.length} | misbound ${misbound.length} | grader faults ${graderBroken.length}`)
  for (const r of orphans) { console.log(`  ORPHAN   ${r.key} — ${r.reach.note}`) }
  for (const r of misbound) { console.log(`  MISBOUND ${r.key} — ${r.reach.note}`) }
  for (const r of graderBroken) { console.log(`  GRADER   ${r.key} — ${r.graderFaults.join('; ')}`) }
  console.log(`report -> ${path.relative(process.cwd(), REPORT_PATH)}`)

  if (orphans.length > 0 || misbound.length > 0 || graderBroken.length > 0) { process.exitCode = 1 }
}

main().catch(e => {
  console.error('[quiz-lab]', e.message)
  process.exitCode = 1
})
