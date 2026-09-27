/**
 * The agenda sheet of Our Session Objective — where each step and its concepts sit.
 *
 * Item 15.26, built from the drawing Mike approved on 2026-09-26,
 * design/mockups/strategy-session-objective-two-sheets.html. His rulings the same day:
 * *"session objective needs to be on its own page … page 2 is the agenda layout is over to
 * you"*, then *"the agenda page needs to show the step/stage as a parent - the name of the
 * concept as a child hierarchy"*.
 *
 * 🔴 THE ONE PLACE THE GEOMETRY LIVES. The generated sheet draws from `layoutAgenda`, the
 * Run screen and the plan count the sheets from `agendaSheetCount`, and the tests check the
 * same numbers — so what is printed, what is counted and what is proved cannot disagree.
 * Every number is the approved drawing's, and most are Mike's own, read off his p2.
 *
 * WHAT IT IS NOT. It measures no glyphs: widths are estimated from Open Sans's average
 * glyph, and the sheet squeezes whatever a line still overruns once it is drawn. That is
 * why a name only a little too wide is squeezed and one far too wide wraps — the estimate
 * decides which, the browser settles the last few units.
 *
 * Node 14 compatible; imported by the generated component and by tests.
 */

/** His row (AGENDA_ROW), with its first line where his first body line sits under a title. */
export const ROW = { bulletX: 98.09, textX: 150.69, firstY: 184.09, pitch: 34.5467 }

/** A step: his bullet and row in his own emphasis on p2 — bold #002B64. */
export const STEP = { size: 25, weight: 700, ink: '#002B64', gap: ROW.pitch + 6 }

/** A concept beneath its step: 21pt in his grey, his pitch scaled to that size. */
export const CHILD = { size: 21, weight: 400, ink: '#434343', pitch: 29.02, textIn: 30 }

/** Inside the right frame bar (1477.71), and a line's foot clear of the firm's mark (778). */
export const RIGHT = 1455
export const LAST_BASELINE = 760
export const GUTTER = 20
export const MAX_COLUMNS = 3

/** Open Sans's average glyph, as a share of the type size. */
const GLYPH = 0.54

/** A line this much wider than its space is squeezed; wider still, it wraps. */
const SQUEEZE_UP_TO = 1.15

const CAPACITY = LAST_BASELINE - ROW.firstY

/**
 * The concept whose page the agenda is on. It is never listed on its own agenda.
 * @type {string}
 */
export const AGENDA_CONCEPT = 'our-session-objective'

/**
 * The agenda's groups from the session's steps — one shape for the Run screen and the plan.
 *
 * A step with no name keeps the name the plan already prints for it, so the two screens
 * list the same steps; a step with nothing placed in it still prints (Mike, 2026-09-20).
 *
 * @param {Array<{name: string, items: Array<{name: string, conceptId: string}>}>} steps
 * @returns {Array<{name: string, children: string[]}>}
 */
export function agendaGroups (steps) {
  return (steps || []).map(s => ({
    name: String((s && s.name) || '').trim(),
    children: ((s && s.items) || [])
      .filter(x => x && x.conceptId !== AGENDA_CONCEPT)
      .map(x => String(x.name || '').trim())
      .filter(Boolean)
  })).filter(g => g.name)
}

/**
 * The columns a sheet is split into: the width from his bullet to the right frame, shared.
 * @param {number} count
 * @returns {Array<{bullet: number, text: number, max: number}>}
 */
function columns (count) {
  const width = (RIGHT - ROW.bulletX + GUTTER) / count
  return Array.from({ length: count }, (_, k) => {
    const bullet = ROW.bulletX + k * width
    const text = bullet + (ROW.textX - ROW.bulletX)
    return { bullet, text, max: bullet + width - GUTTER - text }
  })
}

/**
 * A name as lines: one if it fits or can be squeezed to, else wrapped at words.
 * @param {string} text
 * @param {number} max
 * @param {number} size
 * @returns {string[]}
 */
function wrap (text, max, size) {
  const est = s => s.length * size * GLYPH
  if (est(text) <= max * SQUEEZE_UP_TO) { return [text] }
  const lines = []
  let line = ''
  text.split(' ').forEach((word) => {
    const next = line ? line + ' ' + word : word
    if (line && est(next) > max) { lines.push(line); line = word } else { line = next }
  })
  if (line) { lines.push(line) }
  return lines
}

/**
 * One step as blocks of rows at a column width. A step taller than a column is cut into
 * pieces; a piece after the first carries no step row of its own.
 * @param {{name: string, children: string[]}} group
 * @param {{max: number}} col
 * @returns {Array<Array<object>>}
 */
function blocksOf (group, col) {
  const rows = wrap(group.name, col.max, STEP.size)
    .map((text, i) => ({ kind: 'step', text, lead: i === 0, advance: ROW.pitch }))
  const childMax = col.max - CHILD.textIn
  group.children.forEach((name) => {
    wrap(name, childMax, CHILD.size)
      .forEach((text, i) => rows.push({ kind: 'child', text, lead: i === 0, advance: CHILD.pitch }))
  })
  const pieces = []
  let cur = []
  let h = 0
  rows.forEach((r) => {
    if (cur.length && h + r.advance > CAPACITY) { pieces.push(cur); cur = []; h = 0 }
    if (cur.length) { h += r.advance }
    cur.push(r)
  })
  if (cur.length) { pieces.push(cur) }
  return pieces
}

/** @param {Array<object>} block @returns {number} its height, first baseline to last */
const heightOf = block => block.slice(1).reduce((n, r) => n + r.advance, 0)

/**
 * Blocks into columns, none taller than `limit`; a block moves whole to the next column.
 * @param {Array<Array<object>>} blocks
 * @param {number} limit
 * @returns {Array<Array<Array<object>>>}
 */
function fill (blocks, limit) {
  const cols = [[]]
  let h = 0
  blocks.forEach((b) => {
    const col = cols[cols.length - 1]
    const need = (col.length ? STEP.gap : 0) + heightOf(b)
    if (col.length && h + need > limit) { cols.push([b]); h = heightOf(b) } else { col.push(b); h += need }
  })
  return cols
}

/**
 * Columns of blocks as rows with their positions.
 * @param {Array<Array<Array<object>>>} cols
 * @param {Array<{bullet: number, text: number, max: number}>} geo
 * @returns {{rows: Array<object>}}
 */
function place (cols, geo) {
  const rows = []
  cols.forEach((col, k) => {
    const c = geo[k]
    let y = ROW.firstY
    col.forEach((block, bi) => {
      block.forEach((r, ri) => {
        if (ri) { y += r.advance } else if (bi) { y += STEP.gap }
        const step = r.kind === 'step'
        const look = step ? STEP : CHILD
        rows.push({
          kind: r.kind,
          text: r.text,
          lead: r.lead,
          mark: step ? '●' : '–',
          markX: step ? c.bullet : c.text,
          x: step ? c.text : c.text + CHILD.textIn,
          y: Math.round(y * 100) / 100,
          max: Math.round((step ? c.max : c.max - CHILD.textIn) * 10) / 10,
          size: look.size,
          weight: look.weight,
          ink: look.ink
        })
      })
    })
  })
  return { rows }
}

/**
 * The agenda as sheets of positioned rows.
 *
 * The fewest columns, up to three, that hold it, as even as they can be; a step is never
 * parted from its concepts unless it alone is taller than a column. What three columns
 * cannot hold continues on another sheet.
 *
 * @param {Array<{name: string, children: string[]}>} groups
 * @returns {Array<{rows: Array<{kind: string, text: string, lead: boolean, mark: string,
 *   markX: number, x: number, y: number, max: number, size: number, weight: number,
 *   ink: string}>}>} none where there are no groups
 */
export function layoutAgenda (groups) {
  const list = (groups || []).filter(g => g && g.name)
    .map(g => ({ name: g.name, children: g.children || [] }))
  if (!list.length) { return [] }
  for (let c = 1; c <= MAX_COLUMNS; c++) {
    const geo = columns(c)
    const blocks = [].concat(...list.map(g => blocksOf(g, geo[0])))
    if (fill(blocks, CAPACITY).length > c) { continue }
    let lo = Math.max(...blocks.map(heightOf))
    let hi = CAPACITY
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (fill(blocks, mid).length <= c) { hi = mid } else { lo = mid }
    }
    return [place(fill(blocks, hi), geo)]
  }
  const geo = columns(MAX_COLUMNS)
  const cols = fill([].concat(...list.map(g => blocksOf(g, geo[0]))), CAPACITY)
  const sheets = []
  for (let i = 0; i < cols.length; i += MAX_COLUMNS) {
    sheets.push(place(cols.slice(i, i + MAX_COLUMNS), geo))
  }
  return sheets
}

/**
 * How many agenda sheets a session needs — one even with no steps, which shows his lines.
 * @param {Array<{name: string, children: string[]}>} groups
 * @returns {number}
 */
export function agendaSheetCount (groups) {
  return Math.max(1, layoutAgenda(groups).length)
}
