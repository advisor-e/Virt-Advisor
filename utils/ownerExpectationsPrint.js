/**
 * @file The Business Owner Expectations page of a client's strategy plan — item 15.23.
 * @module utils/ownerExpectationsPrint
 *
 * Built from `design/mockups/strategy-concept-owner-expectations.html`, approved by Mike
 * 2026-09-25. His Decision C, in his own words: *"as owners, they want to see a summary of
 * income aspirations, annual leave, weekly work hours and task allocation in one contrast
 * table … the inputs can be split to make life easier but the report should come back
 * togeteher to provide meaning."*
 *
 * Two pure steps, and no maths of their own — every figure comes back from the model's
 * backend route (`POST /api/report/owner-expectations`):
 *
 *   1. `requestFromSaved` — the client's ONE saved record (Decision B) → the request the
 *      model's own screen sends. 🔴 IT MUST BUILD EXACTLY WHAT `OwnerExpectations.vue` BUILDS,
 *      or the plan prints different figures from the screen the advisor just worked on.
 *      `tests/unit/ownerExpectationsPrint.test.js` proves the two identical.
 *   2. `contrastFrom` — the model's answer → the contrast table's rows.
 */

/** Six owner blocks, as the workbook has (`MAX_OWNERS` in the maths module). */
const OWNERS = 6

/**
 * Ten task rows at most, as the workbook's one task column has (`MAX_TASKS` in the maths
 * module). Mike, 2026-09-26 (item 15.24): "no more than 10 tasks in the model, and table -
 * do not print onto an additional page". Ten fit the page with room to spare.
 */
const TASK_ROWS = 10

/** A saved figure, or blank — the screen's own rule. */
function figureOrBlank (v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** A list cut or padded to `n`, each entry a figure or blank. */
function figures (v, n) {
  const a = Array.isArray(v) ? v : []
  return Array.from({ length: n }, (_, i) => figureOrBlank(a[i]))
}

/** A display percentage to the decimal the model expects — the screen's `rate()`. */
function rate (pct) {
  return Number(pct || 0) / 100
}

/**
 * The model request for one client's saved figures.
 *
 * @param {object} inputs - the `inputs` of the client's saved Owner Expectations record, in
 *   the flat shape `OwnerExpectations.reportInputs()` writes (`o1.name`, `dev.cogs`, …)
 * @returns {object} the body for `POST /api/report/owner-expectations`
 */
export function requestFromSaved (inputs) {
  const s = inputs && typeof inputs === 'object' ? inputs : {}
  const owners = []
  for (let n = 1; n <= OWNERS; n++) {
    const p = 'o' + n + '.'
    const hours = figures(s[p + 'hours'], 3)
    const leave = figures(s[p + 'leave'], 3)
    const tasks = Array.isArray(s[p + 'tasks']) ? s[p + 'tasks'] : []
    const now = Array.isArray(s[p + 'now']) ? s[p + 'now'] : []
    const focus = Array.isArray(s[p + 'focus']) ? s[p + 'focus'] : []
    owners.push({
      name: typeof s[p + 'name'] === 'string' ? s[p + 'name'] : '',
      incomes: figures(s[p + 'incomes'], 4),
      stages: [0, 1, 2].map(i => ({ weeklyHours: hours[i], leaveWeeks: leave[i] })),
      duties: tasks.map((t, j) => ({
        task: typeof t === 'string' ? t : '',
        now: rate(figureOrBlank(now[j])),
        focus: rate(figureOrBlank(focus[j]))
      }))
    })
  }

  const development = {}
  Object.keys(s).filter(k => k.indexOf('dev.') === 0).forEach((k) => {
    development[k.slice(4)] = Array.isArray(s[k]) ? s[k].slice(0, 4) : []
  })

  return {
    years: figures(s.years, 4),
    owners,
    development,
    loan: {
      amount: figureOrBlank(s['loan.amount']),
      rate: rate(figureOrBlank(s['loan.ratePct'])),
      termMonths: figureOrBlank(s['loan.termMonths']),
      type: s['loan.type'] === 'Reducing' ? 'Reducing' : 'Table'
    }
  }
}

/**
 * The contrast table for the client's plan: owners across, and down the side what each wants
 * to earn, the hours and leave they want, and how their week splits across tasks.
 *
 * 🔴 WHAT IS LEFT OFF, AND WHY. NO NAME = NO COLUMN — Mike, 2026-09-25: "if a client wants
 * that column to disappear, they have to delete the clients name". An owner is printed on
 * their name alone, so an owner earning nothing still appears; the way to remove one is to
 * clear the name. A task at nothing now and nothing at focus for every printed owner is an
 * unused row and does not print.
 *
 * @param {object} result - the model's reply `data`: `{ years, owners: { owners }, development: { stages } }`
 * @returns {{years: number[], owners: object[], tasks: object[], revenue: number[]}}
 */
export function contrastFrom (result) {
  const r = result || {}
  const all = (r.owners && Array.isArray(r.owners.owners)) ? r.owners.owners : []
  const owners = all.filter(o => String(o.name || '').trim())

  // Every task any printed owner holds, in the order first met — each owner keeps their own
  // list (Mike, 2026-09-24), so one owner may hold a task another does not.
  const names = []
  owners.forEach((o) => {
    (o.duties || []).forEach((d) => {
      const name = String(d.task || '').trim()
      if (name && !names.includes(name)) { names.push(name) }
    })
  })

  const tasks = names
    .map(name => ({
      name,
      cells: owners.map((o) => {
        const d = (o.duties || []).find(x => String(x.task || '').trim() === name)
        return d ? { now: Number(d.now) || 0, focus: Number(d.focus) || 0 } : null
      })
    }))
    .filter(t => t.cells.some(c => c && (c.now > 0 || c.focus > 0)))
    .slice(0, TASK_ROWS)

  return {
    years: Array.isArray(r.years) ? r.years.slice(0, 4) : [],
    owners: owners.map(o => ({
      name: o.name || '',
      incomes: (o.incomes || []).slice(0, 4),
      stages: (o.stages || []).slice(0, 3)
    })),
    tasks,
    revenue: ((r.development && r.development.stages) || []).map(s => s.revenue)
  }
}
