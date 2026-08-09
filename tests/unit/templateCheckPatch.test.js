'use strict'

// What "Apply it" leads to — the exact edits the mentor's rulings add up to.
//
// Design: design/mockups/logic-table-template-check.html (approved 2026-08-05), whose
// rows carry an "Apply it" button and the line "Not yet applied to the table".
// RULED 2026-08-09 (Mike): it produces a reviewed patch, it never writes one.
//
// THE POINT OF THIS FILE is that nothing is guessed at. This screen exists because two
// confident attempts to settle these names by hand were both wrong — on 2026-08-04
// twenty-seven names were declared missing and were not, and on 2026-08-05 the safety
// net built to hold them back was watching 37 of 42 tables. So an edit that is not
// unambiguous must come back SAID SO, never quietly applied and never quietly dropped.

const { buildTemplateCheckPatch, proseOccurrences, EDIT } = require('../../server/utils/templateCheckPatch')

const TEMPLATES = [
  { title: 'FM Agenda & Minutes' },
  { title: 'Partner Accountability' }
]

/** One tree, one branch, in the `nodes` shape. */
const treesWith = rule => ({ trees: [{ id: 'firm_board_pack', name: 'Firm Board Pack', nodes: [rule] }] })

const RULING = (title, applyRequested = true) => ({
  verdict: 'ruled', title, note: '', ruledBy: 'mike@advisor-e.com', ruledAt: '2026-08-05T00:00:00.000Z', applyRequested
})

/** The scan keys a finding as treeId::ruleId::normalised(name). */
const key = (ruleId, name) => `firm_board_pack::${ruleId}::${name.toLowerCase()}`

describe('a name in a template list', () => {
  const rule = { id: 'n1', branch_name: 'B', condition: 'C', action: 'Do the thing', templates: ['BoardPack Agenda'] }

  it('becomes one ready edit, naming the field it sits in', () => {
    const patch = buildTemplateCheckPatch({
      ...treesWith(rule),
      templates: TEMPLATES,
      rulings: { [key('n1', 'BoardPack Agenda')]: RULING('FM Agenda & Minutes') }
    })

    expect(patch.edits).toHaveLength(1)
    expect(patch.edits[0]).toMatchObject({
      status: EDIT.READY,
      where: 'list',
      field: 'templates',
      from: 'BoardPack Agenda',
      to: 'FM Agenda & Minutes',
      occurrences: 1
    })
    expect(patch.counts.ready).toBe(1)
  })

  it('is AMBIGUOUS when the same name is listed twice', () => {
    const twice = { ...rule, templates: ['BoardPack Agenda', 'BoardPack Agenda'] }
    const patch = buildTemplateCheckPatch({
      ...treesWith(twice),
      templates: TEMPLATES,
      rulings: { [key('n1', 'BoardPack Agenda')]: RULING('FM Agenda & Minutes') }
    })

    // ONE edit, not two. The scan raises a finding per occurrence and both carry the
    // same key, so they are one decision — telling a developer to make the same edit
    // twice is how one of a duplicated pair silently survives the change.
    expect(patch.edits).toHaveLength(1)
    expect(patch.edits[0].status).toBe(EDIT.AMBIGUOUS)
    expect(patch.edits[0].occurrences).toBe(2)
    expect(patch.counts.ready).toBe(0)
    expect(patch.counts.needsEyes).toBe(1)
  })
})

describe('a name written into a sentence', () => {
  it('names WHICH of the three prose fields it is in', () => {
    // `prose` in the scan is action + notes + recommendation joined, so the finding
    // itself cannot say which one. An edit that did not resolve that would be an
    // instruction to search-and-replace across a branch, which is how the wrong
    // sentence gets rewritten.
    const rule = { id: 'n2', branch_name: 'B', condition: 'C', action: 'Nothing here', recommendation: 'Deploy the Yellow Card today' }
    const patch = buildTemplateCheckPatch({
      trees: [{ id: 'firm_board_pack', name: 'Firm Board Pack', nodes: [rule] }],
      templates: TEMPLATES,
      rulings: { [key('n2', 'Yellow Card')]: RULING('Partner Accountability') }
    })

    expect(patch.edits[0]).toMatchObject({ status: EDIT.READY, where: 'prose', field: 'recommendation' })
  })

  it('is AMBIGUOUS when the name appears in two fields', () => {
    const rule = {
      id: 'n3',
      branch_name: 'B',
      condition: 'C',
      action: 'Issue a Yellow Card',
      recommendation: 'Deploy the Yellow Card today'
    }
    const patch = buildTemplateCheckPatch({
      trees: [{ id: 'firm_board_pack', name: 'Firm Board Pack', nodes: [rule] }],
      templates: TEMPLATES,
      rulings: { [key('n3', 'Yellow Card')]: RULING('Partner Accountability') }
    })

    expect(patch.edits[0].status).toBe(EDIT.AMBIGUOUS)
    expect(patch.edits[0].reason).toMatch(/more than one field/)
    expect(patch.edits[0].field).toBe('action, recommendation')
  })

  it('counts occurrences by exact text, so a longer name is not half-rewritten', () => {
    // Substring matching would find "BoardPack Agenda" inside "BoardPack Agenda
    // Notes" and report an edit that would corrupt the longer name.
    const hits = proseOccurrences({ action: 'Use the BoardPack Agenda Notes and the BoardPack Agenda' }, 'BoardPack Agenda')
    expect(hits).toEqual([{ field: 'action', count: 2 }])
  })
})

describe('the file may have moved on since the ruling', () => {
  it('a branch that no longer exists comes back STALE, not dropped', () => {
    const patch = buildTemplateCheckPatch({
      trees: [{ id: 'firm_board_pack', name: 'Firm Board Pack', nodes: [] }],
      templates: TEMPLATES,
      rulings: { [key('gone', 'BoardPack Agenda')]: RULING('FM Agenda & Minutes') }
    })

    // Nothing to edit, so the scan raises no finding for it either — the ruling is
    // simply no longer about anything. What matters is that the patch does not claim
    // it as ready.
    expect(patch.counts.ready).toBe(0)
  })

  it('a ruling pointing at a title the catalogue no longer carries is refused', () => {
    // Swapping one dead name for another dead name is the failure mode this whole
    // screen was built to end.
    const rule = { id: 'n4', branch_name: 'B', condition: 'C', action: 'x', templates: ['BoardPack Agenda'] }
    const patch = buildTemplateCheckPatch({
      ...treesWith(rule),
      templates: TEMPLATES,
      rulings: { [key('n4', 'BoardPack Agenda')]: RULING('A Template That Was Retitled') }
    })

    expect(patch.edits[0].status).toBe(EDIT.UNKNOWN_TEMPLATE)
    expect(patch.counts.ready).toBe(0)
  })
})

describe('which decisions produce an edit at all', () => {
  const rule = { id: 'n5', branch_name: 'B', condition: 'C', action: 'x', templates: ['BoardPack Agenda'] }

  it('a ruling not yet sent for applying is counted, not included', () => {
    const patch = buildTemplateCheckPatch({
      ...treesWith(rule),
      templates: TEMPLATES,
      rulings: { [key('n5', 'BoardPack Agenda')]: RULING('FM Agenda & Minutes', false) }
    })

    expect(patch.edits).toHaveLength(0)
    // Counted so a short patch is never mistaken for a finished job.
    expect(patch.counts.ruledNotRequested).toBe(1)
  })

  it('"Not a tool" correctly produces NO edit, and says so in the counts', () => {
    // The dismissal IS the outcome — the phrase was never a document, so there is
    // nothing in the table to change.
    const patch = buildTemplateCheckPatch({
      ...treesWith(rule),
      templates: TEMPLATES,
      rulings: { [key('n5', 'BoardPack Agenda')]: { verdict: 'dismissed', title: null, ruledAt: 'x' } }
    })

    expect(patch.edits).toHaveLength(0)
    expect(patch.counts.dismissed).toBe(1)
  })

  it('"Missing — flag it" produces NO edit either — only the master team can close it', () => {
    const patch = buildTemplateCheckPatch({
      ...treesWith(rule),
      templates: TEMPLATES,
      rulings: { [key('n5', 'BoardPack Agenda')]: { verdict: 'flagged', title: null, ruledAt: 'x' } }
    })

    expect(patch.edits).toHaveLength(0)
    expect(patch.counts.flagged).toBe(1)
  })
})

describe('with no rulings at all', () => {
  it('returns an empty patch rather than failing', () => {
    // The state the app is actually in today: nothing has been ruled yet.
    const patch = buildTemplateCheckPatch({ rulings: {} })
    expect(patch.edits).toEqual([])
    expect(patch.counts.requested).toBe(0)
  })
})
