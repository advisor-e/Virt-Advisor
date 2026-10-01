'use strict'

/**
 * @file The answer bench's scoring (item 7.19): the code checks, the judge's question and the
 * check on the judge's reply. Pure functions, so every one is tested without a network.
 *
 * Mike's rulings, 2026-10-01: an answer is scored by code checks AND by an AI judge marking it
 * against design/ANSWER-BENCH-CHECKLIST.md, which he approved as committed in fd417a13. The
 * judge's points are read from that file, never retyped here, so the approved words are the
 * ones the judge sees.
 */

const { isKnownTemplate } = require('../server/utils/tierLookup')
const { resolveModelToken } = require('../server/utils/modelChoiceScan')
const { namesUnderTemplateHeadings } = require('../server/utils/templateHeadingCheck')
const { fenceUntrusted } = require('../server/utils/promptSafety')

// The survival tools a crisis answer should lead with — the list discover-lab.js scores
// against, kept identical so the two labs agree on what a crisis answer is.
const CRISIS_TOOLS = ['Receivership vs Liquidation', 'Worst Case Scenario', 'Quick & Worst', 'Quick Position']

const MAX_REASON = 300

/**
 * The judge's points, read from the approved checklist's table.
 *
 * @param {string} markdown - design/ANSWER-BENCH-CHECKLIST.md
 * @returns {Array<{id: number, point: string, metWhen: string}>}
 * @throws {Error} when the table cannot be read — the bench never judges against a guess
 */
function parseChecklist (markdown) {
  const points = []
  String(markdown || '').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*$/)
    if (m) { points.push({ id: Number(m[1]), point: m[2].trim(), metWhen: m[3].trim() }) }
  })
  const ids = points.map(p => p.id)
  if (!points.length || ids.some((id, i) => id !== i + 1)) {
    throw new Error('ANSWER-BENCH-CHECKLIST.md: the points table could not be read')
  }
  return points
}

// The chat records its pick in lower case ("8 profit levers") while the engine's ranking keeps
// the catalogue's capitals ("8 Profit Levers"): the same template, so names compare without case.
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase()
const isCrisisTool = name => CRISIS_TOOLS.some(t => same(t, name))

/** A name the answer offers is real when it is a template or a calculation model. */
function isRealName (name) {
  return isKnownTemplate(name) || resolveModelToken(name) !== null
}

/**
 * The code checks. Each is true (passed), false (failed) or null (does not apply to this
 * mode or case), so a run's score counts only the checks that applied.
 *
 * @param {object} args
 * @param {'client'|'discover'} args.mode
 * @param {object} args.scenario - a Scenario Lab case
 * @param {string} args.text - the answer as the advisor read it
 * @param {object} [args.trace] - client mode: the decision trace the stream sent
 * @param {object} [args.meta] - client mode: the session_meta event
 * @returns {{namesExist: ?boolean, withinBudget: ?boolean, crisisFirst: ?boolean, matchesTop: ?boolean, domainMatches: ?boolean}}
 */
function codeChecks (args) {
  const scenario = args.scenario || {}
  if (args.mode === 'client') {
    const rec = (args.trace && args.trace.recommendation) || {}
    const selected = Array.isArray(rec.selected) ? rec.selected : []
    const budget = args.trace && args.trace.budget ? args.trace.budget.templateBudget : null
    return {
      namesExist: selected.length > 0 && selected.every(isRealName),
      withinBudget: Number.isInteger(budget) ? selected.length <= budget : null,
      crisisFirst: scenario.isCrisis ? isCrisisTool(selected[0]) : null,
      matchesTop: rec.top ? same(selected[0], rec.top) : null,
      domainMatches: args.meta && args.meta.domain ? args.meta.domain === scenario.domain : false
    }
  }
  const names = namesUnderTemplateHeadings(args.text).map(n => n.name)
  return {
    namesExist: names.length > 0 && names.every(isRealName),
    withinBudget: null,
    crisisFirst: scenario.isCrisis ? isCrisisTool(names[0]) : null,
    matchesTop: null,
    domainMatches: null
  }
}

/**
 * The judge's messages. The case and the answer are fenced: both are text the judge weighs,
 * never instructions it follows.
 *
 * @param {object} scenario - a Scenario Lab case
 * @param {string} answer - the answer as the advisor read it
 * @param {Array<{id: number, point: string, metWhen: string}>} points - from parseChecklist
 * @param {string[]} [told] - every answer the advisor gave the chat on the way. Without it the
 *   judge marks facts the chat WAS given (the advisor's ten years, the meeting count) as invented.
 * @returns {Array<{role: string, content: string}>}
 */
function buildJudgeMessages (scenario, answer, points, told) {
  const list = points.map(p => `${p.id}. ${p.point} — met when: ${p.metWhen}`).join('\n')
  const system = 'You judge one answer an AI advisory assistant gave a business advisor. Mark each ' +
    'checklist point met or not met, with a one-line reason. Judge only what the answer says; ' +
    'never rewrite it. Reply with JSON only: {"points":[{"id":1,"met":true,"reason":"..."}, ...]} ' +
    'with exactly one entry for every point.\n\nThe checklist:\n' + list
  const situation = [
    'Industry: ' + (scenario.industry || ''),
    'What the advisor said: ' + (scenario.opening || ''),
    'The situation: ' + (scenario.situationDiagnostic || ''),
    'What the client already tried: ' + (scenario.clientAlreadyTried || ''),
    'Crisis: ' + (scenario.isCrisis ? 'yes' : 'no')
  ].concat(Array.isArray(told) && told.length
    ? ['Everything the advisor told the assistant, in order — these facts were given, not invented:']
        .concat(told.map(t => '- ' + t))
    : []).join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: 'The case:\n' + fenceUntrusted(situation) + '\n\nThe answer:\n' + fenceUntrusted(answer) }
  ]
}

/**
 * The judge's reply, checked before any of it is counted. Anything short of exactly one
 * well-formed verdict per point is unscored — never a pass.
 *
 * @param {string} raw - the judge's reply text
 * @param {Array<{id: number}>} points
 * @returns {{ok: true, verdicts: Array<{id: number, met: boolean, reason: string}>} | {ok: false, error: string}}
 */
function validateJudgeReply (raw, points) {
  const text = typeof raw === 'string' ? raw : ''
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) { return { ok: false, error: 'no JSON object' } }
  let parsed
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch (e) {
    return { ok: false, error: 'malformed JSON' }
  }
  const list = parsed && parsed.points
  if (!Array.isArray(list)) { return { ok: false, error: 'points is not a list' } }
  if (list.length !== points.length) { return { ok: false, error: 'wrong number of points' } }

  const verdicts = []
  for (const p of points) {
    const found = list.filter(v => v && v.id === p.id)
    if (found.length !== 1) { return { ok: false, error: 'point ' + p.id + ' missing or repeated' } }
    const v = found[0]
    if (typeof v.met !== 'boolean') { return { ok: false, error: 'point ' + p.id + ': met is not true or false' } }
    if (typeof v.reason !== 'string' || !v.reason.trim()) { return { ok: false, error: 'point ' + p.id + ': no reason' } }
    verdicts.push({ id: p.id, met: v.met, reason: v.reason.trim().slice(0, MAX_REASON) })
  }
  return { ok: true, verdicts }
}

/**
 * A run's totals, overall AND per check and per point. The per-point figures are the result:
 * the proving runs of 2026-10-01 showed an average across all seven points hiding real damage —
 * "About this client" fell from 17 of 51 to 0 while the average moved four points, because a
 * wrong-client answer passes "Respects what was tried" by never mentioning it.
 *
 * @param {Array<{checks: object, judge: ?{ok: boolean, verdicts?: Array}}>} results
 * @returns {{cases: number, codePassed: number, codeApplied: number, codeScore: ?number, judgeMet: number, judgePoints: number, judgeScore: ?number, unscored: number, byCheck: object, byPoint: object}}
 */
function summarise (results) {
  let codePassed = 0
  let codeApplied = 0
  let judgeMet = 0
  let judgePoints = 0
  let unscored = 0
  const byCheck = {}
  const byPoint = {}
  const tally = (into, key, ok) => {
    into[key] = into[key] || { passed: 0, of: 0 }
    into[key].of++
    if (ok) { into[key].passed++ }
  }
  results.forEach((r) => {
    Object.entries(r.checks || {}).forEach(([name, v]) => {
      if (v === null) { return }
      codeApplied++
      if (v === true) { codePassed++ }
      tally(byCheck, name, v === true)
    })
    if (r.judge && r.judge.ok) {
      r.judge.verdicts.forEach((v) => {
        judgePoints++
        if (v.met) { judgeMet++ }
        tally(byPoint, v.id, v.met)
      })
    } else {
      unscored++
    }
  })
  const share = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null)
  return {
    cases: results.length,
    codePassed,
    codeApplied,
    codeScore: share(codePassed, codeApplied),
    judgeMet,
    judgePoints,
    judgeScore: share(judgeMet, judgePoints),
    unscored,
    byCheck,
    byPoint
  }
}

module.exports = { CRISIS_TOOLS, parseChecklist, codeChecks, buildJudgeMessages, validateJudgeReply, summarise }
