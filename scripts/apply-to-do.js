'use strict'

/**
 * Phase 3 of item 4.14 — closes the loop between the Handbook's ranking control
 * and the repository.
 *
 * TWO JOBS, which are the two halves phase 3 was defined as:
 *
 *  1. `npm run to-do`
 *     Regenerates the ranked table in design/features/to-do.md from
 *     design/features/to-do-items.json. The table stops being a second copy of
 *     the data kept in step by hand, which is what it had been since the data
 *     file was created.
 *
 *  2. `npm run to-do -- <file>`
 *     Applies a list Mike saved from the Handbook control — his ordering, his
 *     scores, his calls and his comments — and then does job 1.
 *
 * WHY THIS EXISTS AT ALL. On 2026-08-15 Mike marked item 4.4 Done in the
 * control, saved the file, and it was applied to the repository BY HAND: three
 * documents and one data file edited in the right order, from a downloaded file
 * nobody validated. It went fine. It is the kind of thing that goes fine until
 * the day it does not, and the failure is silent — an item that quietly ceases
 * to exist, which is the exact failure family this list was built to end.
 *
 * WHAT IT REFUSES TO DO, and this is the important part. An item Mike settles
 * (Done, Park or Delete) or removes is NOT dropped from the live list just
 * because he said so on screen. It comes off only once its closure is written on
 * design/features/to-do-done-and-parked.md — and until then this script applies
 * NOTHING and prints the block that needs writing. Half of an apply is worse
 * than none: an item can be gone from the live list and never appear on the
 * closed one, and nothing would ever say so.
 *
 * Node 14, CommonJS. It writes to design/ — the only script here that does.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const FEATURES = path.join(ROOT, 'design', 'features')
const DATA_FILE = path.join(FEATURES, 'to-do-items.json')
const PAGE_FILE = path.join(FEATURES, 'to-do.md')
const CLOSED_FILE = path.join(FEATURES, 'to-do-done-and-parked.md')

/** The generated region of to-do.md. Everything outside it is hand-written. */
const BEGIN = '<!-- BEGIN GENERATED: the ranked list — npm run to-do -->'
const END = '<!-- END GENERATED -->'

/** Who an item may be waiting on. Free text here hides a blocker. */
const WAITING = ['Mike', 'Us', 'Outside']

// What an item IS. A `defect` is something that already exists being wrong, missing,
// unverified or unmaintainable; a `feature` is a new capability, page, screen or
// behaviour. Two values only — a third gives the gate below somewhere to hide.
const KINDS = ['defect', 'feature']

/** The calls the control offers. Anything but `proceed` takes an item off the list. */
const SETTLED = { done: 'Done', park: 'Park', delete: 'Delete' }

/** The list's own voice counts in words, so the generated sentence does too. */
const WORDS = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen', 'Twenty']

function word (n) { return WORDS[n] || String(n) }

function readJson (file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Every rule the list's §2 demands, applied to a list before it is trusted.
 *
 * These are the same rules tests/unit/toDoItems.test.js holds the COMMITTED file
 * to. They are repeated against an INCOMING file because a file that arrives
 * from a browser is the one nothing has ever checked — and by the time the test
 * suite sees it, it is already committed.
 *
 * @param {Array<Object>} items
 * @returns {Array<string>} every problem found, not just the first
 */
function validate (items) {
  const problems = []

  if (!Array.isArray(items) || !items.length) {
    return ['The file carries no items at all.']
  }

  const seen = {}
  items.forEach((item, i) => {
    const ref = item && item.ref ? String(item.ref) : '(item ' + (i + 1) + ', with no ref)'

    if (!item || typeof item !== 'object') {
      problems.push(ref + ' is not an item.')
      return
    }
    if (!item.ref || !String(item.ref).trim()) {
      // The ref is the item's identity: it is how the closed page, the Handbook
      // and every session refer back to it. Without one it cannot be closed.
      problems.push(ref + ' has no ref of its own.')
    }
    if (ref === 'new') {
      problems.push('An item still has the ref "new" — "' + (item.name || '') +
        '". Give it a number before it can join the list.')
    }
    if (seen[ref]) { problems.push(ref + ' appears twice.') }
    seen[ref] = true

    if (!Number.isInteger(item.score) || item.score < 1 || item.score > 5) {
      problems.push(ref + ' scores ' + JSON.stringify(item.score) +
        '. A score is 1-5 — and a 0 is deleted with its code, never filed.')
    }
    ;['why', 'risk', 'touches', 'name'].forEach((field) => {
      if (typeof item[field] !== 'string' || !item[field].trim()) {
        problems.push(ref + ' has no ' + field + '.')
      }
    })
    if (!item.askedBy || !String(item.askedBy.who || '').trim()) {
      problems.push(ref + ' does not say who asked for it.')
    } else if (item.askedBy.ours && !String(item.askedBy.detail || '').trim()) {
      problems.push(ref + ' says nobody outside asked for it, and then does not say why it stays.')
    }

    // 🔴 THE GATE, and it is here as well as in tests/unit/toDoItems.test.js on purpose.
    // The test guards the file; this guards the OTHER way in — a list saved from the
    // Handbook's ranking control and applied with `npm run to-do -- <file>`. A gate on
    // one door only is not a gate. Mike, 2026-08-26: "ONLY the features and ideas I
    // specifically request."
    if (KINDS.indexOf(item.kind) === -1) {
      problems.push(ref + ' does not say whether it is a defect or a feature. ' +
        'It must be one of: ' + KINDS.join(', ') + '.')
    } else if (item.kind === 'feature' && item.askedBy && item.askedBy.ours === true) {
      problems.push(ref + ' "' + (item.name || '') + '" is a FEATURE that nobody outside ' +
        'asked for. Mike\'s ruling of 2026-08-26: only features and ideas he specifically ' +
        'requests get built. Propose it to him in one sentence instead of filing it. ' +
        '(A DEFECT found by us is still fine — that is what `kind` is for.)')
    }
    if (WAITING.indexOf(item.waitingOn) === -1) {
      problems.push(ref + ' waits on "' + item.waitingOn + '". It must be one of: ' +
        WAITING.join(', ') + '.')
    }
    if (item.blocker && !String(item.blocks || '').trim()) {
      problems.push(ref + ' is marked as blocking and does not say what it blocks.')
    }
    if (item.yourCall && item.yourCall !== 'proceed' && !SETTLED[item.yourCall]) {
      problems.push(ref + ' carries an unknown call, "' + item.yourCall + '".')
    }
  })
  return problems
}

// ── The generated table ────────────────────────────────────────────────────

/**
 * §1's ranked table and the sentence under it, from the data.
 *
 * ORDER IS THE ARRAY'S ORDER. Nothing here sorts, and nothing here may: the
 * array is Mike's own ranking and item 4.14 is a 1 that he put first.
 *
 * @param {Array<Object>} items
 * @returns {string} markdown, without the surrounding markers
 */
function renderTable (items) {
  const head = [
    '| # | Item | Score | Blocks | Waiting on |',
    '| --- | --- | --- | --- | --- |'
  ]

  const rows = items.map((item, i) =>
    '| ' + (i + 1) +
    ' | ' + (item.blocker ? '🔒 ' : '') + '**' + item.ref + '** ' + item.name +
    ' | ' + item.score +
    ' | ' + (item.blocker ? item.blocks : '—') +
    ' | ' + (item.waitingOn === 'Mike' ? '**Mike**' : item.waitingOn) + ' |')

  const mike = items.filter(item => item.waitingOn === 'Mike').length

  // Both halves agree with their own count. The first version pluralised neither,
  // and the day the list first reached one Mike-item it printed "One need Mike.";
  // the day it reached none, "no need Mike." A generated sentence is read as the
  // list's own voice, so it has to survive its own edge cases.
  const liveLine = word(items.length) + ' live item' + (items.length === 1 ? '' : 's') + '.'
  const mikeLine = mike === 0
    ? 'None need Mike.'
    : word(mike) + (mike === 1 ? ' needs Mike.' : ' need Mike.')

  return head.concat(rows).join('\n') + '\n\n' +
    '**' + liveLine + ' ' + mikeLine + '** ' +
    'If this list passes about twenty, something is wrong.'
}

/**
 * The page with its generated region replaced. Pure — no file is touched.
 *
 * Refuses rather than guesses: a missing marker means somebody edited the page
 * by hand where the generator writes, and writing over that would destroy it.
 *
 * @param {string} page   to-do.md as it stands
 * @param {Array<Object>} items
 * @returns {string} the page as it should stand
 * @throws if either marker is missing or they are the wrong way round
 */
function spliceTable (page, items) {
  const start = page.indexOf(BEGIN)
  const end = page.indexOf(END)

  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      'design/features/to-do.md has lost its generated-table markers.\n' +
      'Expected, on their own lines:\n  ' + BEGIN + '\n  ' + END + '\n' +
      'Nothing has been written. Put them back around the ranked table first.'
    )
  }

  return page.slice(0, start + BEGIN.length) + '\n' +
    renderTable(items) + '\n' + page.slice(end)
}

/**
 * @param {Array<Object>} items
 * @returns {boolean} true if the file changed
 */
function writeTable (items) {
  const page = fs.readFileSync(PAGE_FILE, 'utf8')
  const next = spliceTable(page, items)
  if (next === page) return false
  fs.writeFileSync(PAGE_FILE, next, 'utf8')
  return true
}

// ── Applying a list saved from the Handbook ────────────────────────────────

/**
 * What has to be written on the closed page before an item may leave the list.
 *
 * The script cannot write this itself and should not pretend to: "what proved
 * it" is a judgement about evidence, and an auto-generated sentence saying an
 * item is done is worth nothing to the person reading it in six months.
 *
 * @param {Object} item  the item as it came back from the control
 * @returns {string}
 */
function closureBlock (item) {
  const call = SETTLED[item.yourCall] || item.yourCall
  const comment = String(item.yourComment || '').trim()

  return [
    '**' + item.ref + ' · ' + item.name + '.** ' +
      (item.yourCall === 'done' ? '✅ Closed' : call === 'Delete' ? '🔴 Deleted' : '⏸ Parked') +
      ' <date> by Mike, from the Handbook control.',
    '',
    '- **Why it mattered:** ' + item.why,
    '- **What we would have lost:** ' + item.risk,
    comment ? '- **Mike\'s own words:** *"' + comment + '"*' : '- ⚠ **He left no comment.**',
    '- **What proves it:** <write this — it is the only part no script can supply>'
  ].join('\n')
}

/**
 * Works out what applying a saved list would do. Pure — no file is touched.
 *
 * ALL OR NOTHING. If any item cannot come off the list yet, nothing is applied —
 * not the ordering, not the scores. A partial apply leaves the repository in a
 * state nobody chose and nobody can see.
 *
 * @param {Object} saved       the file saved from the control
 * @param {Object} current     design/features/to-do-items.json as it stands
 * @param {string} closedPage  to-do-done-and-parked.md, searched for each ref
 * @returns {{applied: boolean, data: Object|null, lines: Array<string>}}
 */
function planApply (saved, current, closedPage) {
  const lines = []

  const incoming = saved.items || []
  const problems = validate(incoming)
  if (problems.length) {
    lines.push('This file cannot be applied. ' + problems.length + ' problem' +
      (problems.length === 1 ? '' : 's') + ':')
    problems.forEach(p => lines.push('  - ' + p))
    return { applied: false, data: null, lines: lines }
  }

  const keeping = incoming.filter(item => (item.yourCall || 'proceed') === 'proceed')
  const settling = incoming.filter(item => (item.yourCall || 'proceed') !== 'proceed')

  // An item he deleted with the × is simply absent. It leaves the list the same
  // way a settled one does, and needs its closure written the same way.
  const arriving = {}
  incoming.forEach((item) => { arriving[item.ref] = true })
  const removed = current.items.filter(item => !arriving[item.ref])

  const leaving = settling.concat(removed.map(item => ({
    ref: item.ref, name: item.name, why: item.why, risk: item.risk,
    yourCall: 'delete', yourComment: ''
  })))
  const unwritten = leaving.filter(item => closedPage.indexOf(item.ref + ' ·') === -1 &&
    closedPage.indexOf('**' + item.ref + '**') === -1)

  // ── what he changed, in plain English ──
  const wasOrder = current.items.map(item => item.ref).join(', ')
  const nowOrder = keeping.map(item => item.ref).join(', ')
  if (wasOrder !== nowOrder) {
    lines.push('The order changed:')
    lines.push('  was: ' + wasOrder)
    lines.push('  now: ' + nowOrder)
  } else {
    lines.push('The order is unchanged.')
  }

  incoming.forEach((item) => {
    const before = current.items.filter(o => o.ref === item.ref)[0]
    if (before && before.score !== item.score) {
      lines.push('Score changed — ' + item.ref + ': ' + before.score + ' → ' + item.score)
    }
    if (String(item.yourComment || '').trim()) {
      lines.push('Comment on ' + item.ref + ': "' + item.yourComment.trim() + '"')
    }
  })

  leaving.forEach((item) => {
    lines.push('Leaving the list — ' + item.ref + ': ' +
      (SETTLED[item.yourCall] || item.yourCall))
  })

  if (unwritten.length) {
    lines.push('')
    lines.push('NOTHING HAS BEEN WRITTEN. ' + unwritten.length + ' item' +
      (unwritten.length === 1 ? ' is' : 's are') + ' leaving the list with no closure ' +
      'recorded on design/features/to-do-done-and-parked.md.')
    lines.push('')
    lines.push('An item must never be gone from both pages. Write the block below on that')
    lines.push('page — finishing the last line yourself — then run this again.')
    unwritten.forEach((item) => {
      lines.push('')
      lines.push('  ' + new Array(70).join('-'))
      closureBlock(item).split('\n').forEach(l => lines.push('  ' + l))
    })
    return { applied: false, data: null, lines: lines }
  }

  // 🔴 HIS COMMENT ON A LIVE ITEM IS AN INSTRUCTION, NOT A DECISION.
  //
  // Until 2026-08-21 both `yourCall` and `yourComment` were dropped here, on the
  // reasoning that a call and a comment are decisions rather than schema. That is
  // true of a SETTLED item — its words are carried onto the closed page by
  // closureBlock() and survive there. It was never true of a live one. A live
  // item's comment is the only thing on the whole round trip that says what Mike
  // wants done, and it was printed to the console once and thrown away.
  //
  // What that cost: on 2026-08-15 he wrote "get this done, it doesn't rely on me
  // and should never have been parked" on 4.7, "if this is just a handover note -
  // get it done" on 4.12, and "draft the email you want me to send Carl" on 3.5.
  // All three were applied, all three words discarded, and six days later all
  // three items were still open and still reading "waiting on Us" — because no
  // session after that one could see he had said anything at all.
  //
  // `yourCall` is still dropped, and that part was always right: for an item on
  // this list it is always "proceed", which the item's presence already says.
  const clean = keeping.map((item) => {
    const out = {}
    Object.keys(item).forEach((key) => {
      if (key !== 'yourCall' && key !== 'yourComment') out[key] = item[key]
    })
    const said = String(item.yourComment || '').trim()
    out.comment = said || null
    return out
  })

  lines.push('')
  lines.push('Ready to apply. ' + clean.length + ' live item' + (clean.length === 1 ? '' : 's') + '.')

  return {
    applied: true,
    data: {
      _readme: current._readme,
      orderedByMikeOn: saved.orderedByMikeOn || current.orderedByMikeOn,
      orderSource: current.orderSource,
      items: clean
    },
    lines: lines
  }
}

/**
 * planApply(), plus the one write it authorises.
 *
 * @param {string} savedPath
 * @returns {{applied: boolean, lines: Array<string>}}
 */
function applySaved (savedPath) {
  const result = planApply(
    readJson(savedPath),
    readJson(DATA_FILE),
    fs.readFileSync(CLOSED_FILE, 'utf8')
  )

  if (result.applied) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(result.data, null, 2) + '\n', 'utf8')
  }
  return result
}

// ── Console ────────────────────────────────────────────────────────────────

if (require.main === module) {
  const given = process.argv[2]

  try {
    console.log('')

    if (given) {
      const savedPath = path.resolve(given)
      if (!fs.existsSync(savedPath)) {
        console.error('No file at ' + savedPath)
        process.exit(1)
      }
      console.log('Applying ' + savedPath)
      console.log('')
      const result = applySaved(savedPath)
      result.lines.forEach(line => console.log(line))
      if (!result.applied) {
        console.log('')
        process.exit(1)
      }
      console.log('')
    }

    const items = readJson(DATA_FILE).items
    const changed = writeTable(items)
    console.log(changed
      ? 'design/features/to-do.md — ranked table rewritten from the data, ' + items.length + ' items.'
      : 'design/features/to-do.md — already matches the data, nothing to write.')
    console.log('')
  } catch (err) {
    console.error('')
    console.error(err.message)
    console.error('')
    process.exit(1)
  }
}

module.exports = {
  validate,
  renderTable,
  spliceTable,
  writeTable,
  closureBlock,
  planApply,
  applySaved,
  BEGIN,
  END
}
