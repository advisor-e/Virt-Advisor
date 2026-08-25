'use strict'

/**
 * Guards scripts/apply-to-do.js — phase 3 of item 4.14.
 *
 * 🔴 THE ONE THAT MATTERS is "refuses to drop an item whose closure is not
 * written". Everything else here is ordinary correctness; that test is the whole
 * reason the script exists in the shape it does.
 *
 * On 2026-08-15 Mike settled item 4.4 in the Handbook control and it was applied
 * to the repository by hand — three documents and a data file, edited in the
 * right order, from a downloaded file nothing validated. It went fine. The
 * failure it invites does not announce itself: an item leaves the live list,
 * nobody writes it onto the closed one, and there is then no page anywhere that
 * knows it ever existed. Nothing goes red. Somebody re-derives it in a month.
 *
 * So the script applies NOTHING — not the ordering, not the scores — until every
 * departing item is named on to-do-done-and-parked.md.
 */

const fs = require('fs')
const path = require('path')

const apply = require('../../scripts/apply-to-do')

const FEATURES = path.join(__dirname, '..', '..', 'design', 'features')
const PAGE_FILE = path.join(FEATURES, 'to-do.md')
const DATA_FILE = path.join(FEATURES, 'to-do-items.json')

/** A minimal item that passes every rule, so each test can break exactly one. */
function item (over) {
  return Object.assign({
    ref: '9.1',
    name: 'A thing',
    // Every item must say what it IS since 2026-08-26 — see the gate in
    // scripts/apply-to-do.js. A defect by default here: the fixture exists to exercise
    // the OTHER rules, and a feature would drag the gate into every unrelated case.
    kind: 'defect',
    score: 3,
    scoreReason: 'sells the package',
    blocker: false,
    blocks: null,
    waitingOn: 'Us',
    why: 'Because.',
    risk: 'We lose something.',
    askedBy: { who: 'Mike', ours: false, detail: '' },
    touches: 'Nothing much.',
    note: null
  }, over)
}

describe('the five fields are checked on the way IN, not only once committed', () => {
  it('passes a sound list', () => {
    expect(apply.validate([item()])).toEqual([])
  })

  it('refuses an empty file rather than emptying the list', () => {
    expect(apply.validate([])).toHaveLength(1)
    expect(apply.validate([])[0]).toMatch(/no items at all/)
  })

  it.each(['why', 'risk', 'touches', 'name'])('names a missing %s', (field) => {
    const broken = item()
    broken[field] = '   '
    expect(apply.validate([broken]).join(' ')).toContain('has no ' + field)
  })

  it('refuses a score outside 1-5 — a 0 is deleted with its code, never filed', () => {
    expect(apply.validate([item({ score: 0 })]).join(' ')).toMatch(/A score is 1-5/)
    expect(apply.validate([item({ score: 6 })]).join(' ')).toMatch(/A score is 1-5/)
  })

  it('refuses an item that still carries the control\'s placeholder ref', () => {
    // "+ Add an item" seeds ref "new". Committing that loses the item's identity
    // and every later cross-reference to it.
    expect(apply.validate([item({ ref: 'new' })]).join(' ')).toMatch(/still has the ref "new"/)
  })

  it('refuses a duplicate ref', () => {
    expect(apply.validate([item(), item()]).join(' ')).toContain('9.1 appears twice')
  })

  it('refuses free text where a party belongs', () => {
    expect(apply.validate([item({ waitingOn: 'the master team' })]).join(' '))
      .toMatch(/waits on "the master team"/)
  })

  it('refuses a blocker that does not say what it blocks', () => {
    expect(apply.validate([item({ blocker: true, blocks: '' })]).join(' '))
      .toMatch(/marked as blocking and does not say what it blocks/)
  })

  it('refuses "nobody asked for it" with no justification — the field that matters most', () => {
    expect(apply.validate([item({ askedBy: { who: 'us', ours: true, detail: '' } })]).join(' '))
      .toMatch(/does not say why it stays/)
    expect(apply.validate([item({ askedBy: { who: 'us', ours: true, detail: 'Kept because…' } })]))
      .toEqual([])
  })

  // 🔴 THE GATE — Mike, 2026-08-26: "ONLY the features and ideas I specifically request."
  // It is enforced here as well as in toDoItems.test.js because this is the OTHER way
  // into the list: a file saved from the Handbook's ranking control. A gate on one door
  // is not a gate.
  it('refuses a FEATURE that nobody outside asked for', () => {
    expect(apply.validate([item({
      kind: 'feature',
      askedBy: { who: 'us', ours: true, detail: 'seemed useful at the time' }
    })]).join(' ')).toMatch(/is a FEATURE that nobody outside asked for/)
  })

  it('still allows a DEFECT we found ourselves — he never asked us to stop reporting bugs', () => {
    expect(apply.validate([item({
      kind: 'defect',
      askedBy: { who: 'us', ours: true, detail: 'found while testing 4.32' }
    })])).toEqual([])
  })

  it('still allows a FEATURE Mike asked for', () => {
    expect(apply.validate([item({
      kind: 'feature',
      askedBy: { who: 'Mike', ours: false, detail: 'asked for it on 2026-08-26' }
    })])).toEqual([])
  })

  it('refuses an item that will not say which it is', () => {
    expect(apply.validate([item({ kind: undefined })]).join(' '))
      .toMatch(/does not say whether it is a defect or a feature/)
    expect(apply.validate([item({ kind: 'chore' })]).join(' '))
      .toMatch(/does not say whether it is a defect or a feature/)
  })

  it('reports every problem at once, not just the first', () => {
    const broken = item({ score: 9, why: '', waitingOn: 'nobody' })
    expect(apply.validate([broken].concat([item({ ref: '' })])).length).toBeGreaterThan(3)
  })
})

describe('the ranked table is generated, not maintained', () => {
  const list = [
    item({ ref: '4.14', name: 'First by his call', score: 1, waitingOn: 'Us' }),
    item({ ref: '2.1', name: 'A blocker', score: 3, blocker: true, blocks: 'The UAT round', waitingOn: 'Mike' }),
    item({ ref: '3.5', name: 'Last', score: 5, waitingOn: 'Us' })
  ]

  it('keeps the array order — it never sorts by score or blocker', () => {
    // The whole point. A 1 that Mike ranked first stays first, above a blocker
    // and above a 5. to-do-items.json's own header forbids re-sorting.
    const rows = apply.renderTable(list).split('\n').filter(l => /^\| \d+ \|/.test(l))
    expect(rows[0]).toContain('**4.14**')
    expect(rows[1]).toContain('**2.1**')
    expect(rows[2]).toContain('**3.5**')
  })

  it('marks a blocker and says what it blocks', () => {
    expect(apply.renderTable(list)).toContain('| 2 | 🔒 **2.1** A blocker | 3 | The UAT round | **Mike** |')
  })

  it('puts a dash where nothing is blocked', () => {
    expect(apply.renderTable(list)).toContain('| 1 | **4.14** First by his call | 1 | — | Us |')
  })

  it('counts in words, in the list\'s own voice, and counts Mike\'s separately', () => {
    expect(apply.renderTable(list)).toContain('**Three live items. One needs Mike.**')
  })

  it('agrees with itself at one, and at none — the counts the first version got wrong', () => {
    // Printed on the live page as "One need Mike." and then "no need Mike." A
    // generated sentence carries the list's own voice; it cannot go slack at the
    // exact moment the list is nearly clear.
    const one = list.slice(0, 2).filter(i => i.waitingOn === 'Mike')
    expect(apply.renderTable(one)).toContain('**One live item. One needs Mike.**')

    const none = list.filter(i => i.waitingOn !== 'Mike')
    expect(apply.renderTable(none)).toContain('live items. None need Mike.**')
  })

  it('replaces only what sits between the markers', () => {
    const page = 'before\n' + apply.BEGIN + '\nOLD\n' + apply.END + '\nafter\n'
    const next = apply.spliceTable(page, list)
    expect(next).toMatch(/^before\n/)
    expect(next).toMatch(/after\n$/)
    expect(next).not.toContain('OLD')
    expect(next).toContain('**4.14**')
  })

  it('refuses to write when a marker has gone, rather than guessing where', () => {
    expect(() => apply.spliceTable('no markers here', list)).toThrow(/lost its generated-table markers/)
    expect(() => apply.spliceTable(apply.BEGIN + ' only', list)).toThrow(/lost its generated-table markers/)
  })

  it('the committed page already matches the committed data', () => {
    // This is what makes the table stop being a second copy. If it fails, the
    // fix is `npm run to-do` — never editing the table by hand.
    //
    // Line endings are normalised before comparing, and ONLY line endings.
    // `core.autocrlf=true` on a Windows machine rewrites the working copy to
    // CRLF on checkout while the generator emits LF, so a plain text compare
    // failed after a branch switch with not one word changed — 13 invisible
    // characters, one per row of the table. `git status` cannot see it, because
    // git is configured to expect exactly that conversion. Comparing the words
    // rather than the invisible characters keeps what this guards — that the
    // page and the data agree — and stops it firing on a checkout.
    const lf = text => text.replace(/\r\n/g, '\n')
    const page = fs.readFileSync(PAGE_FILE, 'utf8')
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    expect(lf(apply.spliceTable(page, data.items))).toBe(lf(page))
  })
})

describe('applying a list saved from the control', () => {
  const current = { _readme: ['x'], orderedByMikeOn: '2026-01-01', orderSource: 'the control', items: [item({ ref: '1.1' }), item({ ref: '1.2' })] }

  function saved (items) {
    return { orderedByMikeOn: '2026-02-02', items }
  }

  it('applies his order, scores and comments when nothing is leaving', () => {
    const result = apply.planApply(
      saved([item({ ref: '1.2', score: 5, yourCall: 'proceed', yourComment: 'do this first' }),
        item({ ref: '1.1', yourCall: 'proceed', yourComment: '' })]),
      current, '')

    expect(result.applied).toBe(true)
    expect(result.data.items.map(i => i.ref)).toEqual(['1.2', '1.1'])
    expect(result.data.items[0].score).toBe(5)
    expect(result.data.orderedByMikeOn).toBe('2026-02-02')
    expect(result.lines.join('\n')).toContain('The order changed')
    // This test was named "...and comments" from the day it was written and never
    // once looked at one. The assertion below is the one that was missing.
    expect(result.data.items[0].comment).toBe('do this first')
  })

  // 🔴 THE SECOND ONE THAT MATTERS, and it replaces a test that asserted the
  // opposite. "Strips his call and comment — they are decisions, not schema" was
  // deliberate, tested, and wrong for a live item: a comment on something still
  // open is an instruction, and dropping it lost three of his on 2026-08-15
  // (4.7, 4.12, 3.5) for six days without a single gate going red.
  it('KEEPS his comment on a live item — it is an instruction, not a decision', () => {
    const result = apply.planApply(
      saved([item({ ref: '1.1', yourCall: 'proceed', yourComment: 'get this done' }),
        item({ ref: '1.2', yourCall: 'proceed' })]),
      current, '')

    const kept = result.data.items.filter(o => o.ref === '1.1')[0]
    expect(kept.comment).toBe('get this done')

    // An item he said nothing about carries null, not an empty string — the same
    // shape `note` uses, so "he said nothing" and "he said ''" cannot diverge.
    expect(result.data.items.filter(o => o.ref === '1.2')[0].comment).toBeNull()

    // The control's own two fields never become schema. `yourCall` is always
    // "proceed" for a live item, which its presence on the list already says.
    result.data.items.forEach((saved_) => {
      expect(saved_).not.toHaveProperty('yourCall')
      expect(saved_).not.toHaveProperty('yourComment')
    })
  })

  it('trims his comment, and does not keep whitespace as though he had spoken', () => {
    const result = apply.planApply(
      saved([item({ ref: '1.1', yourCall: 'proceed', yourComment: '   ' }),
        item({ ref: '1.2', yourCall: 'proceed', yourComment: '  spaced  ' })]),
      current, '')

    expect(result.data.items.filter(o => o.ref === '1.1')[0].comment).toBeNull()
    expect(result.data.items.filter(o => o.ref === '1.2')[0].comment).toBe('spaced')
  })

  it('a comment survives the NEXT round trip — the failure was silent for six days', () => {
    // Apply once, then feed the result straight back in the way the control does,
    // with him saying nothing new. His earlier words must still be there.
    const first = apply.planApply(
      saved([item({ ref: '1.1', yourCall: 'proceed', yourComment: 'draft the email' }),
        item({ ref: '1.2', yourCall: 'proceed' })]),
      current, '')

    const roundTripped = first.data.items.map(o =>
      Object.assign({}, o, { yourCall: 'proceed', yourComment: o.comment || '' }))

    const second = apply.planApply(saved(roundTripped), first.data, '')
    expect(second.data.items.filter(o => o.ref === '1.1')[0].comment).toBe('draft the email')
  })

  // 🔴 THE ONE THAT MATTERS.
  it('refuses everything when a settled item has no closure written', () => {
    const result = apply.planApply(
      saved([item({ ref: '1.1', yourCall: 'done', yourComment: 'sorted' }),
        item({ ref: '1.2', score: 5, yourCall: 'proceed' })]),
      current, 'a closed page mentioning nothing')

    expect(result.applied).toBe(false)
    expect(result.data).toBeNull()
    expect(result.lines.join('\n')).toContain('NOTHING HAS BEEN WRITTEN')
    // Not even the unrelated score change on 1.2 goes through.
    expect(result.lines.join('\n')).toContain('Score changed — 1.2: 3 → 5')
  })

  it('lets it through once the closure is on the page', () => {
    const result = apply.planApply(
      saved([item({ ref: '1.1', yourCall: 'done' }), item({ ref: '1.2', yourCall: 'proceed' })]),
      current, 'earlier work, and **1.1** closed on some date')

    expect(result.applied).toBe(true)
    expect(result.data.items.map(i => i.ref)).toEqual(['1.2'])
  })

  it('treats an item he removed with the × exactly like one he settled', () => {
    // Absent is a decision too, and it loses the item just as completely.
    const result = apply.planApply(saved([item({ ref: '1.1', yourCall: 'proceed' })]), current, '')
    expect(result.applied).toBe(false)
    expect(result.lines.join('\n')).toContain('Leaving the list — 1.2')
  })

  it('refuses a file that breaks the rules, before looking at anything else', () => {
    const result = apply.planApply(saved([item({ ref: '1.1', score: 0 })]), current, '')
    expect(result.applied).toBe(false)
    expect(result.data).toBeNull()
    expect(result.lines.join('\n')).toContain('cannot be applied')
  })

  it('says the order is unchanged when it is', () => {
    const result = apply.planApply(
      saved([item({ ref: '1.1' }), item({ ref: '1.2' })]), current, '')
    expect(result.lines.join('\n')).toContain('The order is unchanged.')
  })
})

describe('the closure block a human still has to finish', () => {
  it('carries his own words, because nothing else records them', () => {
    const block = apply.closureBlock(
      item({ ref: '4.4', yourCall: 'done', yourComment: 'Check if this works.' }))
    expect(block).toContain('✅ Closed')
    expect(block).toContain('*"Check if this works."*')
  })

  it('says plainly when he left no comment', () => {
    expect(apply.closureBlock(item({ yourCall: 'park', yourComment: '' })))
      .toContain('He left no comment')
  })

  it('refuses to invent the evidence', () => {
    // A script writing "this is done" is worth nothing to whoever reads it in
    // six months. The one line that matters is left for a person.
    expect(apply.closureBlock(item({ yourCall: 'done' })))
      .toContain('it is the only part no script can supply')
  })
})
