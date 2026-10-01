#!/usr/bin/env node
'use strict'

/**
 * @file The answer bench (item 7.19): asks the REAL advisory chat the 51 invented Scenario Lab
 * cases, then scores each written answer with code checks and an AI judge marking it against
 * design/ANSWER-BENCH-CHECKLIST.md (Mike's rulings, 2026-10-01; checklist approved as committed
 * in fd417a13). A developer tool: it changes nothing the app does.
 *
 * Usage: node scripts/answer-bench.js [--mode=client|discover|both] [--cases=N] [--label=x]
 *                                    [--damage | --damage=wrong-client]
 *
 *   --damage               swaps the chat's instructions for a one-line generic prompt, in this
 *                          run only. A bench that cannot score that lower is measuring nothing.
 *   --damage=wrong-client  the chat is told another case's story while the judge holds the true
 *                          one, so "About this client" and "Respects what was tried" must drop.
 *                          The judge then sees only the case, as in the first baseline, so the two
 *                          runs compare like with like.
 *
 * Every run is kept, never overwritten: design/answer-bench-runs/<date>-<commit>-<label>.json,
 * with the commit, both models and a fingerprint of each prompt file, until item 7.23 gives the
 * app real prompt versions. Needs OPENAI_API_KEY in .env. No database, no running server: the
 * chat uses the platform's shipped content only, so a run compares code against code; it is not
 * a copy of UAT. Cost: under 1 dollar for the chat across both modes, plus the judge.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')
const { EventEmitter } = require('events')

const REPO = path.join(__dirname, '..')
process.chdir(REPO) // the prompts load from the working directory
require('dotenv').config({ path: path.join(REPO, '.env') })

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const hit = args.find(a => a.startsWith('--' + name + '='))
  return hit ? hit.slice(name.length + 3) : fallback
}
const MODE = opt('mode', 'both')
const LIMIT = Number(opt('cases', 0)) || Infinity
const DAMAGE = args.includes('--damage') ? 'prompt' : opt('damage', null)
if (DAMAGE && !['prompt', 'wrong-client'].includes(DAMAGE)) {
  console.error('answer-bench: --damage takes no value, or =wrong-client')
  process.exit(1)
}
const LABEL = opt('label', DAMAGE ? 'damaged-' + DAMAGE : 'baseline').replace(/[^a-z0-9-]/gi, '')
const CONCURRENCY = 3
const MAX_TURNS = 25
const JUDGE_MODEL = process.env.ANSWER_BENCH_JUDGE_MODEL || 'gpt-6-astra'
const JUDGE_MAX_COMPLETION_TOKENS = 8000

if (!process.env.OPENAI_API_KEY) {
  console.error('answer-bench: OPENAI_API_KEY is not set in .env')
  process.exit(1)
}

// The damaged copy: patched before the engine loads, because it takes loadPrompt at require time.
if (DAMAGE === 'prompt') {
  const loaderPath = require.resolve('../server/utils/promptLoader')
  require.cache[loaderPath] = {
    id: loaderPath,
    filename: loaderPath,
    loaded: true,
    exports: { loadPrompt: () => 'You are a helpful assistant.' }
  }
}

const advisorMiddleware = require('../server/advisorEngine')
const { createOpenAIClient } = require('../server/utils/openaiClient')
const { AI } = require('../config/integration')
const { modelFor } = require('../server/utils/aiProvider')
const score = require('./answer-bench-score')

const CASES = require('./scenario-lab-cases.json').slice(0, LIMIT)
const CHECKLIST_PATH = path.join(REPO, 'design/ANSWER-BENCH-CHECKLIST.md')
const POINTS = score.parseChecklist(fs.readFileSync(CHECKLIST_PATH, 'utf8'))

// A fresh address per request: the chat's limiter counts per address (30 a minute), and a
// bench run sends hundreds of requests from this one machine.
let _address = 0
const nextAddress = () => { _address++; return `10.${(_address >> 16) & 255}.${(_address >> 8) & 255}.${_address & 255}` }

/** One request to the real chat, answered through a stand-in response that keeps the stream. */
function send (body) {
  return new Promise((resolve) => {
    const req = new EventEmitter()
    req.method = 'POST'
    req.url = '/api/advisor/query'
    req.headers = {}
    req.socket = { remoteAddress: nextAddress(), destroy () {} }
    req.firmId = null
    req.advisorId = null
    const writes = []
    const res = {
      headersSent: false,
      writableEnded: false,
      writeHead () { this.headersSent = true },
      setHeader () {},
      flushHeaders () {},
      write (c) { writes.push(String(c)); return true },
      end (c) { if (c) { writes.push(String(c)) } this.writableEnded = true; resolve(events(writes)) }
    }
    setImmediate(() => { req.emit('data', Buffer.from(JSON.stringify(body))); req.emit('end') })
    advisorMiddleware(req, res, () => resolve([]))
  })
}

function events (writes) {
  return writes.join('').split('\n\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line.replace(/^data: /, '')) } catch (e) { return {} }
  })
}

/** The answer as the advisor read it: the final rewrite when there is one, else the stream. */
function answerText (evs) {
  const replaced = evs.filter(e => e.type === 'replace').pop()
  return replaced ? replaced.text : evs.filter(e => e.type === 'delta').map(e => e.text).join('')
}

// Client mode answers by the field each scripted question asks about, never by turn number:
// a case can add a disambiguation question, and the order is the engine's to change.
const ADVISOR_PROFILE = {
  experience: 'About ten years delivering advisory work.',
  enjoyment: 'Practical numbers work with owner-managers.'
}

function answerFor (field, scenario) {
  const answers = {
    clientRaisedIssue: 'They raised it themselves.',
    situationDiagnostic: scenario.situationDiagnostic,
    clientAlreadyTried: scenario.clientAlreadyTried,
    domainConfirmed: scenario.domainConfirmed,
    disambiguationAnswer: scenario.domain,
    issueProposed: 'Yes, that is it.',
    issueDriver: scenario.situationDiagnostic,
    industry: scenario.industry,
    ownership: 'Privately owned.',
    growthStage: 'Established and stable.',
    advisoryStaircase: 'Step ' + scenario.staircase,
    advisorExperience: ADVISOR_PROFILE.experience,
    advisorConfidence: 'Fairly confident, familiar territory.',
    advisorEnjoyment: ADVISOR_PROFILE.enjoyment,
    advisorMeetingCount: scenario.budget + ' meetings',
    advisorSessionLength: '90 minutes'
  }
  return answers[field] || 'Yes.'
}

async function runClient (scenario) {
  const start = await send({ query: '__init__', mode: 'client', conversationHistory: [] })
  const sessionId = (start.find(e => e.type === 'session') || {}).sessionId
  const history = []
  let query = 'My client is ' + scenario.industry + '. ' + scenario.opening
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const evs = await send({ query, mode: 'client', sessionId, conversationHistory: history.slice(), advisorProfile: ADVISOR_PROFILE })
    const text = answerText(evs)
    const trace = evs.find(e => e.type === 'trace')
    if (trace) {
      const told = history.filter(m => m.role === 'user').map(m => m.content)
        .concat([query, 'Advisor profile: ' + ADVISOR_PROFILE.experience + ' ' + ADVISOR_PROFILE.enjoyment])
      return { text, told, trace: trace.trace, meta: evs.find(e => e.type === 'session_meta') || null, turns: turn }
    }
    const error = evs.find(e => e.type === 'error')
    if (error) { return { error: error.code || error.message || 'error', turns: turn } }
    history.push({ role: 'user', content: query }, { role: 'assistant', content: text })
    query = answerFor((evs.find(e => e.type === 'done') || {}).field || '', scenario)
  }
  return { error: 'no recommendation within ' + MAX_TURNS + ' turns', turns: MAX_TURNS }
}

async function runDiscover (scenario) {
  const first = scenario.opening + ' ' + scenario.situationDiagnostic
  let evs = await send({ query: first, mode: 'discover', conversationHistory: [] })
  let text = answerText(evs)
  const told = [first]
  // Discover may ask one clarifying question when the search is vague (discover.txt).
  if (!/best match/i.test(text) && !evs.some(e => e.type === 'error')) {
    const history = [{ role: 'user', content: first }, { role: 'assistant', content: text }]
    evs = await send({ query: scenario.clientAlreadyTried, mode: 'discover', conversationHistory: history })
    text = answerText(evs)
    told.push(scenario.clientAlreadyTried)
  }
  const error = evs.find(e => e.type === 'error')
  return error ? { error: error.code || error.message || 'error' } : { text, told }
}

let _judgeClient = null
async function judge (scenario, answer, told) {
  if (!_judgeClient) { _judgeClient = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY }) }
  try {
    const reply = await _judgeClient.chat.completions.create({
      model: JUDGE_MODEL,
      messages: score.buildJudgeMessages(scenario, answer, POINTS, told),
      max_completion_tokens: JUDGE_MAX_COMPLETION_TOKENS
    // Invented cases and the app's own answer: nothing a person typed (Z3).
    }, { personal: false, moderate: [], timeout: 120000 })
    const message = reply && reply.choices && reply.choices[0] && reply.choices[0].message
    return score.validateJudgeReply(message ? message.content : '', POINTS)
  } catch (err) {
    return { ok: false, error: 'judge call failed: ' + err.message.split('\n')[0] }
  }
}

/**
 * @param {object} scenario - the case the answer is judged against
 * @param {'client'|'discover'} mode
 * @param {object} story - the case the chat is told: the same one, except under wrong-client
 */
async function runCase (scenario, mode, story) {
  const out = mode === 'client' ? await runClient(story) : await runDiscover(story)
  if (out.error) {
    return { key: scenario.key, mode, error: out.error, checks: {}, judge: { ok: false, error: 'no answer' } }
  }
  const checks = score.codeChecks({ mode, scenario, text: out.text, trace: out.trace, meta: out.meta })
  const verdict = await judge(scenario, out.text, DAMAGE === 'wrong-client' ? undefined : out.told)
  const selected = out.trace ? out.trace.recommendation.selected : undefined
  return { key: scenario.key, mode, turns: out.turns, selected, checks, judge: verdict, answer: out.text }
}

async function pool (jobs) {
  const results = new Array(jobs.length)
  let next = 0
  async function worker () {
    while (next < jobs.length) {
      const i = next++
      results[i] = await jobs[i]()
      const r = results[i]
      process.stdout.write(`${i + 1}/${jobs.length} ${r.mode} ${r.key}: ${r.error ? 'ERROR ' + r.error : 'ok'}\n`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return results
}

const fingerprint = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12)

// The machine's own calendar day. toISOString() is UTC, which named New Zealand morning runs
// as the day before (2026-10-02); the exact UTC timestamp still goes inside the file.
const localDay = (d = new Date()) =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')

;(async () => {
  // Checked before a single call is paid for: a run is never overwritten.
  const commit = execSync('git rev-parse --short HEAD').toString().trim()
  const dir = path.join(REPO, 'design/answer-bench-runs')
  const file = path.join(dir, `${localDay()}-${commit}-${LABEL}.json`)
  if (fs.existsSync(file)) {
    console.error('answer-bench: ' + path.relative(REPO, file) + ' already exists — use --label to name this run')
    process.exit(1)
  }

  const modes = MODE === 'both' ? ['client', 'discover'] : [MODE]
  const jobs = []
  // Wrong-client pairs each case with the one half the list away, so no case meets itself.
  const toldFor = i => (DAMAGE === 'wrong-client' ? CASES[(i + Math.floor(CASES.length / 2)) % CASES.length] : CASES[i])
  modes.forEach(mode => CASES.forEach((scenario, i) => jobs.push(() => runCase(scenario, mode, toldFor(i)))))

  const started = Date.now()
  const results = await pool(jobs)
  const byMode = {}
  modes.forEach((m) => { byMode[m] = score.summarise(results.filter(r => r.mode === m)) })

  const run = {
    date: new Date().toISOString(),
    commit,
    label: LABEL,
    damaged: DAMAGE,
    narrativeModel: modelFor(AI.primary, 'narrative'),
    judgeModel: JUDGE_MODEL,
    prompts: {
      client: fingerprint('data/prompts/client.txt'),
      discover: fingerprint('data/prompts/discover.txt'),
      checklist: fingerprint(CHECKLIST_PATH)
    },
    minutes: Math.round((Date.now() - started) / 6000) / 10,
    summary: { all: score.summarise(results), byMode },
    results
  }

  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(run, null, 2) + '\n')

  console.log('\n' + JSON.stringify(run.summary, null, 2))
  console.log('Saved ' + path.relative(REPO, file))
  process.exit(0)
})().catch((err) => {
  console.error('answer-bench failed:', err)
  process.exit(1)
})
