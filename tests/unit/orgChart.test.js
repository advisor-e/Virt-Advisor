'use strict'

/**
 * The Org Chart Builder — capture form 3 of 9, item 15.1.
 *
 * 🔴 THE FIRST DESCRIBE LAYS THE BUILD AGAINST THE APPROVED DRAWING, BOX FOR BOX. The rule
 * is that a build made from an approved artefact is put beside it and every difference
 * named; this does it by machine rather than by eye, reading
 * `design/mockups/strategy-capture-org-chart-redrawn.html` and comparing every rectangle and
 * every connector against what `layout()` computes from Mike's own workbook.
 *
 * ⚠ AND THE DRAWING IS NOW THAT FUNCTION'S OWN OUTPUT, so there is nothing left to drift.
 * The drawing it replaced was drawn at one size and re-scaled to another, and the rescale
 * rounded a parent's position to a whole column — a parent centred over its children
 * legitimately sits on a HALF column, so CEO, Board, Shareholders, COO and Head HR were all
 * drawn 96px right of the children they sit over. **This test is what found it**, on the day
 * it was built, and it looked perfectly plausible on screen.
 *
 * The rest guards what UAT cannot see: that role 31 saves at all (the fault this whole form
 * exists to fix), that a removed role's boxes can never be inherited, that loading his
 * example stays inside the route's save ceiling, and that a rename carries to everyone
 * reporting to it.
 */

const fs = require('fs')
const path = require('path')

const orgChart = require('../../utils/orgChart')
const backend = require('../../server/utils/strategyOrgChart')
const forms = require('../../server/utils/strategyCaptureForms')
const frameworks = require('../../server/utils/strategyFrameworks')

const MOCKUP = path.resolve(__dirname, '../../design/mockups/strategy-capture-org-chart-redrawn.html')

/** His 24, with the ids the screen gives them when `Start from the example` is pressed. */
function example () {
  return backend.exampleRoles().map((r, i) => ({
    id: i + 1, name: r.name, person: '', reportsTo: r.reportsTo
  }))
}

/** The approved drawing's own chart, parsed out of the artefact. */
function drawing () {
  const html = fs.readFileSync(MOCKUP, 'utf8')
  const svg = html.match(/<svg[\s\S]*?<\/svg>/)[0]
  return {
    width: Number(svg.match(/width="(\d+)"/)[1]),
    height: Number(svg.match(/height="(\d+)"/)[1]),
    viewBox: svg.match(/viewBox="([^"]+)"/)[1],
    // A role box carries a fill and no stroke at all now, so the shape is matched on the
    // two coordinates alone rather than on the paint.
    rects: Array.from(svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>/g))
      .map(m => ({ x: Number(m[1]), y: Number(m[2]), fill: (m[0].match(/fill="([^"]+)"/) || [])[1] })),
    texts: Array.from(svg.matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>([^<]*)<\/text>/g))
      .map(m => ({ x: Number(m[1]), y: Number(m[2]), text: m[3].replace(/&amp;/g, '&') })),
    paths: Array.from(svg.matchAll(/<path d="([^"]+)"/g)).map(m => m[1])
  }
}

/** Where a connector starts and where it ends, whatever route it takes between. */
function endsOf (d) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number)
  const start = { x: nums[0], y: nums[1] }
  // Every segment here is H or V, so the last coordinate belongs to the axis of the last
  // command and the other is carried forward from whatever moved last.
  let x = start.x
  let y = start.y
  const steps = d.match(/[HV]\s*-?\d+(?:\.\d+)?/g) || []
  steps.forEach((s) => {
    const v = Number(s.slice(1))
    if (s[0] === 'H') { x = v } else { y = v }
  })
  return { start, end: { x, y } }
}

describe('the chart is the approved drawing, computed rather than copied', () => {
  const drawn = drawing()
  const built = orgChart.layout(example())

  test('his 24 roles and the outside parent above them are all there', () => {
    expect(built.boxes.length).toBe(25)
    expect(drawn.rects.length).toBe(25)
  })

  test('every box sits where the drawing puts it', () => {
    built.boxes.forEach((box) => {
      const match = drawn.rects.find(r => r.x === box.x && r.y === box.y)
      expect({ name: box.name, found: Boolean(match) }).toEqual({ name: box.name, found: true })
    })
    drawn.rects.forEach((r) => {
      expect(built.boxes.some(b => b.x === r.x && b.y === r.y)).toBe(true)
    })
  })

  test('every role label is his own word, on the drawing\'s own baseline', () => {
    // The drawing carries a sample person in most boxes and the build's roles carry none, so
    // the baseline differs by design: a box with somebody in it lifts its title to make room.
    // What is compared is the WORD and the column it is centred on.
    built.boxes.forEach((box) => {
      const label = drawn.texts.find(t => t.x === box.x + orgChart.TEXT_MID && t.text === box.name)
      expect({ name: box.name, found: Boolean(label) }).toEqual({ name: box.name, found: true })
    })
  })

  test('a person lifts the role title and sits beneath it', () => {
    // 🔴 THE TWO BASELINES ARE THE DRAWING'S, not chosen here. A role with nobody in it
    // centres instead, which is Decision B: no invented word beneath an unfilled position.
    const withPerson = orgChart.layout([
      { id: 1, name: 'CEO', person: 'Alan Whitcombe', reportsTo: '' },
      { id: 2, name: 'CFO', person: '', reportsTo: 'CEO' }
    ])
    const ceo = withPerson.boxes.find(b => b.name === 'CEO')
    const cfo = withPerson.boxes.find(b => b.name === 'CFO')
    expect(ceo.person).toBe('Alan Whitcombe')
    expect(cfo.person).toBe('')
    expect(orgChart.TEXT_ROLE).toBeLessThan(orgChart.TEXT_ROLE_ALONE)
    expect(orgChart.TEXT_PERSON).toBeGreaterThan(orgChart.TEXT_ROLE)
  })

  test('every box knows how far down it sits, and that is what colours it', () => {
    // Decision E. A depth that stopped arriving would silently flatten the chart back to one
    // colour — which is exactly the screen Mike rejected, and it would still render.
    const depths = built.boxes.filter(b => b.kind !== 'outside').map(b => b.depth)
    expect(Math.min.apply(null, depths)).toBe(0)
    expect(Math.max.apply(null, depths)).toBe(6)
    expect(built.boxes.find(b => b.kind === 'outside').depth).toBe(-1)
    // Every band is a colour Mike already owns; a seventh level down keeps the last one
    // rather than running out.
    expect(orgChart.BANDS.length).toBe(7)
    expect(orgChart.bandFor(0).fill).toBe('#002B64')
    expect(orgChart.bandFor(99)).toBe(orgChart.BANDS[6])
  })

  test('the three kinds of box are the three the drawing distinguishes', () => {
    const kinds = {}
    built.boxes.forEach((b) => { kinds[b.kind] = (kinds[b.kind] || 0) + 1 })
    // Shareholders is outside, Board is the top of what he typed, and the other 23 are
    // ordinary roles. A second root here would mean the chart had split in two.
    expect(kinds).toEqual({ outside: 1, root: 1, role: 23 })
    const outside = built.boxes.find(b => b.kind === 'outside')
    expect(outside.name).toBe('Shareholders')
    expect(built.boxes.find(b => b.kind === 'root').name).toBe('Board')
  })

  test('the panel is the size the drawing is', () => {
    expect(built.width).toBe(drawn.width)
    expect(built.height).toBe(drawn.height)
    expect(built.viewBox).toBe(drawn.viewBox)
    // The toolbar reads "24 roles · 7 levels"; both halves are worked out, never typed.
    expect(built.levels).toBe(7)
    expect(built.roleCount).toBe(24)
  })

  test('all 24 connectors are the drawing\'s own, character for character', () => {
    // 🔴 ALL OF THEM NOW, WHERE THE OLD DRAWING MATCHED 23 OF 24. That drawing drew the
    // outside parent's connector as a single vertical stroke, which only worked because
    // `Shareholders` has one role beneath it. The build uses the same elbow everywhere so an
    // outside parent can carry more than one, and the redrawn artefact is generated from
    // this very function — so there is no longer any difference to tolerate.
    expect(built.links.length).toBe(24)
    built.links.forEach((l) => {
      expect({ id: l.id, known: drawn.paths.includes(l.d) }).toEqual({ id: l.id, known: true })
    })
    expect(drawn.paths.length).toBe(24)
  })

  test('the outside parent leaves its own box and lands on the role beneath it', () => {
    const outside = built.links.filter(l => l.kind === 'outside')
    expect(outside.length).toBe(1)
    const box = built.boxes.find(b => b.kind === 'outside')
    const board = built.boxes.find(b => b.name === 'Board')
    expect(endsOf(outside[0].d)).toEqual({
      start: { x: box.x + orgChart.TEXT_MID, y: box.y + orgChart.BOX_H },
      end: { x: board.x + orgChart.TEXT_MID, y: board.y }
    })
  })
})

describe('his worked example is read from the workbook, never typed', () => {
  const roles = backend.exampleRoles()

  test('all 24, in his document\'s order, from Board to Personal Assistant', () => {
    expect(roles.length).toBe(24)
    expect(roles[0]).toEqual({ name: 'Board', reportsTo: 'Shareholders' })
    expect(roles[23]).toEqual({ name: 'Personal Assistant', reportsTo: 'Head of Purchasing' })
  })

  test('his six empty rows are not roles', () => {
    // Rows 25–30 of his sheet are ruled lines waiting for a client. Counting them would put
    // six nameless boxes on a client's chart.
    expect(roles.every(r => r.name.trim())).toBe(true)
  })

  test('the second column keeps his own heading', () => {
    expect(backend.headColumnLabel()).toBe('Reporting Head')
  })
})

describe('the fault this form exists to fix: role 31 saves', () => {
  const concept = frameworks.getConcept('design-the-organisational-hierarchy-chart')

  test('the concept really is on this form', () => {
    expect(concept).toBeTruthy()
    expect(concept.captureForm).toBe('parent-child-list')
  })

  test('a 31st role is admitted, where his sheet has 30 rows', () => {
    // 🔴 THIS IS THE WHOLE REASON THE FORM IS A MINI-APP. Saved positionally, role 31 would
    // be refused with "a capture box in this save does not belong to its framework" and the
    // advisor told their typing could not be saved — mid-session, with a client watching.
    expect(forms.hasCaptureField(concept.id, 'orgrole-31-name', frameworks.getConcept)).toBe(true)
    expect(forms.hasCaptureField(concept.id, 'orgrole-31-head', frameworks.getConcept)).toBe(true)
  })

  test('every key the screen writes is a key the guard admits', () => {
    // The screen and the guard hold the key shape in one file so they cannot drift; this
    // proves the round trip rather than trusting that they do.
    const entries = orgChart.entriesForRoles(example())
    expect(entries.length).toBe(49)
    entries.forEach((e) => {
      expect(forms.hasCaptureField(concept.id, e.fieldKey, frameworks.getConcept)).toBe(true)
    })
  })

  test('the guard is still a whitelist', () => {
    const refused = ['orgrole-0-name', 'orgrole-201-name', 'orgrole-1-notes', 'orgrole--1-name',
      'orgroles-x', 't0r1c3', 'orgrole-1', '', 'orgrole-1-name-extra']
    refused.forEach((key) => {
      expect({ key, admitted: orgChart.isOrgChartKey(key) }).toEqual({ key, admitted: false })
    })
  })

  test('no other concept gains these keys', () => {
    // The guard reaches `isOrgChartKey` only for a concept authored on this form, so a
    // looser rule cannot leak into the other nineteen templates by accident.
    const others = frameworks.listConcepts()
      .filter(c => c.captureTemplate && c.captureForm !== 'parent-child-list')
    expect(others.length).toBeGreaterThan(0)
    others.forEach((c) => {
      expect({ id: c.id, admitted: forms.hasCaptureField(c.id, 'orgrole-1-name', frameworks.getConcept) })
        .toEqual({ id: c.id, admitted: false })
    })
  })
})

describe('Decision C — his empty fourth column is gone', () => {
  test('the old positional reading offered 49 boxes and this offers none', () => {
    const concept = frameworks.getConcept('design-the-organisational-hierarchy-chart')
    const capture = forms.captureForConcept(concept)
    expect(capture.supplied).toBe(true)
    // 32 of the old 49 came from a column that is empty top to bottom in his sheet and
    // carries no heading. There are no positional boxes at all now.
    expect(capture.fields).toEqual([])
    expect(capture.orgChart.example.length).toBe(24)
  })
})

describe('the roster is what makes a role real', () => {
  test('a role not named in the roster is not read, however much it holds', () => {
    const roles = orgChart.rolesFrom({
      orgroles: '1,3',
      'orgrole-1-name': 'CEO',
      'orgrole-2-name': 'A role that was removed',
      'orgrole-3-name': 'CFO',
      'orgrole-3-head': 'CEO'
    })
    expect(roles.map(r => r.name)).toEqual(['CEO', 'CFO'])
  })

  test('removing a role from the middle can never hand its boxes to a later one', () => {
    // 🔴 THE REASON `nextRoleId` COUNTS UP AND NEVER FILLS GAPS. Reusing id 2 would pick up
    // the removed role's orphaned name and put a stranger on a client's chart.
    const held = { orgroles: '1,3', 'orgrole-2-name': 'Removed' }
    expect(orgChart.nextRoleId(orgChart.rolesFrom(held), held)).toBe(4)
  })

  test('nor can removing the LAST one — and the roster alone cannot tell', () => {
    // 🔴 THIS IS THE CASE THE MIDDLE-OF-THE-LIST TEST ABOVE CANNOT SEE, and it was a real
    // defect found by clicking Remove then Add in a browser. With role 3 gone the roster's
    // highest id is 2, so an id taken from the roster is 3 — the one just removed — and the
    // "blank" row arrives holding Personal Assistant and their reporting line.
    const held = {
      orgroles: '1,2',
      'orgrole-1-name': 'Board',
      'orgrole-2-name': 'CEO',
      'orgrole-3-name': 'Personal Assistant',
      'orgrole-3-head': 'Head of Purchasing'
    }
    expect(orgChart.nextRoleId(orgChart.rolesFrom(held), held)).toBe(4)
  })

  test('and not when every role has been removed', () => {
    const held = { orgroles: '', 'orgrole-1-name': 'Board', 'orgrole-7-name': 'CEO' }
    expect(orgChart.nextRoleId(orgChart.rolesFrom(held), held)).toBe(8)
  })

  test('the roster is read defensively — a hostile one yields nothing', () => {
    expect(orgChart.rolesFrom({ orgroles: '0,-1,999,abc,,1,1' })).toEqual([
      { id: 1, name: '', person: '', reportsTo: '' }
    ])
    expect(orgChart.rolesFrom({})).toEqual([])
    expect(orgChart.rolesFrom(null)).toEqual([])
  })
})

describe('a rename carries to everyone reporting to that role', () => {
  const roles = [
    { id: 1, name: 'CEO', reportsTo: '' },
    { id: 2, name: 'COO', reportsTo: 'CEO' },
    { id: 3, name: 'Head HR', reportsTo: 'COO' },
    { id: 4, name: 'Factory Foreman', reportsTo: 'COO' }
  ]

  test('both of the COO\'s reports follow the new name', () => {
    const next = orgChart.renameCascade(roles, 2, 'Operations Director')
    expect(next.map(r => r.reportsTo)).toEqual(['', 'CEO', 'Operations Director', 'Operations Director'])
    // And the chart still holds together — nobody fell out under a dashed outside parent.
    expect(orgChart.checks(next).outside).toEqual([])
  })

  test('naming a role for the first time sweeps nobody up', () => {
    // Every role with no Reporting Head has the same empty string; matching on it would
    // reparent all of them the moment the first role was named.
    const blank = [
      { id: 1, name: '', reportsTo: '' },
      { id: 2, name: 'CFO', reportsTo: '' }
    ]
    expect(orgChart.renameCascade(blank, 1, 'CEO').map(r => r.reportsTo)).toEqual(['', ''])
  })
})

describe('a notice, never a block', () => {
  test('his own example raises exactly one, and it is the outside parent', () => {
    const found = orgChart.checks(example())
    expect(found.outside).toEqual(['Shareholders'])
    expect(found.looped).toEqual([])
    // One top: everything hangs off Shareholders, so there is no second chief executive.
    expect(found.tops).toEqual(['Shareholders'])
  })

  test('two people reporting to each other are noticed, and both are still drawn', () => {
    const roles = [
      { id: 1, name: 'A', reportsTo: 'B' },
      { id: 2, name: 'B', reportsTo: 'A' }
    ]
    expect(orgChart.checks(roles).looped).toEqual(['A', 'B'])
    // 🔴 WHAT THE ADVISOR TYPED IS ALWAYS KEPT. A circle that dropped its roles off the
    // chart would lose a client's own words to a check.
    expect(orgChart.layout(roles).boxes.map(b => b.name).sort()).toEqual(['A', 'B'])
  })

  test('a role reporting to itself is a circle of one, and is still drawn', () => {
    const roles = [{ id: 1, name: 'A', reportsTo: 'A' }]
    expect(orgChart.checks(roles).looped).toEqual(['A'])
    const built = orgChart.layout(roles)
    expect(built.boxes.map(b => b.name)).toEqual(['A'])
    // Never a connector from a box back to itself.
    expect(built.links).toEqual([])
  })

  test('a second chief executive is noticed', () => {
    const roles = [
      { id: 1, name: 'CEO', reportsTo: '' },
      { id: 2, name: 'Also CEO', reportsTo: '' }
    ]
    expect(orgChart.checks(roles).tops).toEqual(['CEO', 'Also CEO'])
  })

  test('two roles under one outside parent are one top, not two', () => {
    // They share a head, so the chart has a single top — saying otherwise would report a
    // split that is not on the screen.
    const roles = [
      { id: 1, name: 'Board', reportsTo: 'Shareholders' },
      { id: 2, name: 'Trustees', reportsTo: 'Shareholders' }
    ]
    const found = orgChart.checks(roles)
    expect(found.tops).toEqual(['Shareholders'])
    expect(orgChart.layout(roles).boxes.filter(b => b.kind === 'outside').length).toBe(1)
  })

  test('an unnamed row is a box waiting to be typed into, not a person', () => {
    const roles = [{ id: 1, name: '', reportsTo: '' }, { id: 2, name: 'CEO', reportsTo: '' }]
    expect(orgChart.layout(roles).roleCount).toBe(1)
    expect(orgChart.checks(roles).tops).toEqual(['CEO'])
  })
})

/**
 * The redraw of 2026-09-21, ruled decision by decision after Mike used the two-column screen.
 * Each of these guards a ruling that a person in UAT would not catch, because the screen
 * renders perfectly happily either way.
 */
describe('the redraw — a role, the person in it, and who they report to', () => {
  test('A — a role and its person are two separate boxes', () => {
    const held = {
      orgroles: '1',
      'orgrole-1-name': 'Managing Director',
      'orgrole-1-person': 'bobby moors'
    }
    expect(orgChart.rolesFrom(held)).toEqual([
      { id: 1, name: 'Managing Director', person: 'bobby moors', reportsTo: '' }
    ])
    // The fault this closes: with one box, "bobby moors" WAS the role.
    expect(orgChart.layout(orgChart.rolesFrom(held))[0]).toBeUndefined()
    expect(orgChart.layout(orgChart.rolesFrom(held)).boxes[0].name).toBe('Managing Director')
    expect(orgChart.layout(orgChart.rolesFrom(held)).boxes[0].person).toBe('bobby moors')
  })

  test('B — a role with nobody in it is still drawn', () => {
    const roles = [
      { id: 1, name: 'Managing Director', person: 'bobby moors', reportsTo: '' },
      { id: 2, name: 'Quality Manager', person: '', reportsTo: 'Managing Director' }
    ]
    const drawnChart = orgChart.layout(roles)
    expect(drawnChart.roleCount).toBe(2)
    expect(drawnChart.boxes.map(b => b.name)).toEqual(['Managing Director', 'Quality Manager'])
    // A person can never decide whether a position appears — only the role name can.
    expect(orgChart.layout([{ id: 1, name: '', person: 'somebody', reportsTo: '' }]).boxes).toEqual([])
  })

  test('D — reportsTo names a role, so a person leaving does not break the chart', () => {
    const before = [
      { id: 1, name: 'Managing Director', person: 'bobby moors', reportsTo: '' },
      { id: 2, name: 'Operations Manager', person: 'billy smith', reportsTo: 'Managing Director' }
    ]
    const after = before.map(r => r.id === 1 ? Object.assign({}, r, { person: 'someone else' }) : r)
    // The structure is identical: only a name inside a box changed.
    expect(orgChart.layout(after).links).toEqual(orgChart.layout(before).links)
    expect(orgChart.checks(after).outside).toEqual([])
  })

  test('D — renaming the ROLE still carries to everyone reporting to it', () => {
    const roles = [
      { id: 1, name: 'COO', person: 'Dev Okonkwo', reportsTo: '' },
      { id: 2, name: 'Head HR', person: 'Moana Peters', reportsTo: 'COO' }
    ]
    const next = orgChart.renameCascade(roles, 1, 'Operations Director')
    expect(next[1].reportsTo).toBe('Operations Director')
    // And the person in the renamed role is untouched by it.
    expect(next[0].person).toBe('Dev Okonkwo')
  })

  test('loading his example stays inside the route ceiling of 60 entries', () => {
    // 🔴 THREE BOXES PER ROLE WOULD BE 73 AND THE SAVE WOULD BE REFUSED. His workbook names
    // no people, so the empty `person` boxes are not written. If a future example ever
    // carried people this fails here rather than as "your typing could not be saved" in a
    // client meeting.
    const entries = orgChart.entriesForRoles(example())
    expect(entries.length).toBeLessThanOrEqual(60)
    expect(entries.some(e => /-person$/.test(e.fieldKey))).toBe(false)
  })

  test('an empty box is not written, and a filled one always is', () => {
    const entries = orgChart.entriesForRoles([
      { id: 1, name: 'CEO', person: '', reportsTo: '' },
      { id: 2, name: 'CFO', person: 'Priya Raman', reportsTo: 'CEO' }
    ])
    expect(entries).toEqual([
      { fieldKey: 'orgroles', value: '1,2' },
      { fieldKey: 'orgrole-1-name', value: 'CEO' },
      { fieldKey: 'orgrole-2-name', value: 'CFO' },
      { fieldKey: 'orgrole-2-person', value: 'Priya Raman' },
      { fieldKey: 'orgrole-2-head', value: 'CEO' }
    ])
  })
})

describe('the two strings this screen cannot get wrong', () => {
  const en = require('../../locales/en.json').strategyPlanner.orgChart

  // 🔴 WORDING IS NORMALLY NOT ASSERTED HERE — Mike's ruling of 2026-08-24: a person in UAT
  // sees a wrong word in five seconds and an assertion costs a rewrite every time one
  // changes. That ruling makes ONE exception, for wording he has explicitly approved, pinned
  // once beside the data with the reason written down. These two qualify, and this is that
  // one place.
  test('the top-of-the-chart choice says Nobody', () => {
    // It read "Reports to…" until 2026-09-21 and Mike reported the option as MISSING. The
    // capability was never absent; the prompt-shaped label hid it. A word that has already
    // caused somebody to report a working feature as broken is load-bearing.
    expect(en.nobody).toBe('Nobody')
  })

  test('the two columns that are ours are still named as ruled', () => {
    // "Role" was ruled 2026-09-21 because a blank heading beside a filled one reads as a
    // fault; "Name" was ruled on the redraw. Everything else on this screen is read from his
    // workbook, so these are the only two words here that could drift away from a ruling.
    expect(en.role).toBe('Role')
    expect(en.person).toBe('Name')
  })
})
