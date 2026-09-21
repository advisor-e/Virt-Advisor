/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Org Chart Builder on screen — capture form 3 of 9, item 15.1.
 *
 * Approved artefact: `design/mockups/strategy-capture-parent-child-list.html`, five
 * decisions ruled by Mike 2026-09-21.
 *
 * 🔴 WHAT THESE GUARD, and none of it is wording or styling — the coordinates and the
 * record shape are in `tests/unit/orgChart.test.js`:
 *
 *   1. **The roster and the box it makes real are saved TOGETHER.** The opening row is not
 *      stored until something is typed into it, so a save that carried only the name would
 *      lose the row on the next reload — and the screen would look perfectly correct until
 *      somebody came back to the session.
 *   2. **`field-opened` still fires** (Decision 11). That event is the navigation timeline,
 *      which is how a recording's words reach the right box without a model deciding. A
 *      screen that drops it looks identical and has broken the ruling.
 *   3. **The picker never offers the role in its own row**, and never loses a Reporting Head
 *      it cannot have produced — his own `Shareholders` is exactly that case.
 *   4. **Decision A: the screen opens EMPTY**, and his 24 arrive on one click, in one save.
 *   5. **A rename reaches the roles reporting to it in the same save.** Two saves would show
 *      a client a chart that had fallen apart between them.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const StrategyOrgChartBuilder = require('~/components/strategy/StrategyOrgChartBuilder.vue').default
const StrategyConceptCapture = require('~/components/strategy/StrategyConceptCapture.vue').default
const backend = require('~/server/utils/strategyOrgChart')
const forms = require('~/server/utils/strategyCaptureForms')
const frameworks = require('~/server/utils/strategyFrameworks')

const SHAPE = backend.captureShape()
const CONCEPT = frameworks.getConcept('design-the-organisational-hierarchy-chart')

/**
 * @param {object} entries
 * @returns {object} a mounted builder
 */
function mount (entries) {
  return mountWithBuefy(StrategyOrgChartBuilder, {
    propsData: { entries: entries || {}, shape: SHAPE }
  })
}

/** The entries a session holds once his example has been loaded. */
function loadedExample () {
  const held = { orgroles: [] }
  backend.exampleRoles().forEach((r, i) => {
    const id = i + 1
    held.orgroles.push(id)
    held['orgrole-' + id + '-name'] = r.name
    held['orgrole-' + id + '-head'] = r.reportsTo
  })
  held.orgroles = held.orgroles.join(',')
  return held
}

describe('Decision A — the screen opens empty', () => {
  test('one row, nothing in it, and nothing saved to say so', () => {
    const w = mount({})
    expect(w.findAll('tbody tr').length).toBe(1)
    expect(w.emitted('fields-changed')).toBeFalsy()
    w.destroy()
  })

  test('his 24 arrive on one click, in ONE save of 49 boxes', () => {
    // 🔴 THE ROUTE REFUSES MORE THAN 60 ENTRIES IN ONE SAVE. 24 roles is the roster plus two
    // boxes each; a 30th role would still fit, and anything that split this into 49 requests
    // would hammer the session for a single click.
    const w = mount({})
    w.vm.startFromExample()
    const saved = w.emitted('fields-changed')[0][0].entries
    expect(saved.length).toBe(49)
    expect(saved[0].fieldKey).toBe('orgroles')
    expect(saved[0].value).toBe(Array.from({ length: 24 }, (x, i) => i + 1).join(','))
    expect(saved).toContainEqual({ fieldKey: 'orgrole-1-name', value: 'Board' })
    expect(saved).toContainEqual({ fieldKey: 'orgrole-1-head', value: 'Shareholders' })
    w.destroy()
  })

  test('every box in that save is one the backend guard admits', () => {
    const w = mount({})
    w.vm.startFromExample()
    w.emitted('fields-changed')[0][0].entries.forEach((e) => {
      expect(forms.hasCaptureField(CONCEPT.id, e.fieldKey, frameworks.getConcept)).toBe(true)
    })
    w.destroy()
  })
})

describe('the roster and the box it makes real are saved together', () => {
  test('typing into the opening row records that the row exists', () => {
    const w = mount({})
    const role = w.vm.rows[0]
    w.vm.onNameInput(role, 'CEO')
    const saved = w.emitted('fields-changed')[0][0].entries
    // Without the roster this name has no row to sit on, and a reload loses it.
    expect(saved).toEqual([
      { fieldKey: 'orgroles', value: '1' },
      { fieldKey: 'orgrole-1-name', value: 'CEO' }
    ])
    w.destroy()
  })

  test('typing into a row that already exists saves only that box', () => {
    const w = mount({ orgroles: '1', 'orgrole-1-name': 'CEO' })
    w.vm.onNameInput(w.vm.rows[0], 'Chief Executive')
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgrole-1-name', value: 'Chief Executive' }
    ])
    w.destroy()
  })

  test('adding a role writes the roster and nothing else', () => {
    const w = mount({ orgroles: '1', 'orgrole-1-name': 'CEO' })
    w.vm.addRole()
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgroles', value: '1,2' }
    ])
    w.destroy()
  })

  test('removing a role takes it out of the roster and leaves its boxes alone', () => {
    // There is no DELETE route, and this is why none is needed.
    const w = mount({ orgroles: '1,2', 'orgrole-1-name': 'CEO', 'orgrole-2-name': 'CFO' })
    w.vm.removeRole(w.vm.rows[1])
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgroles', value: '1' }
    ])
    w.destroy()
  })

  test('Clear all empties the roster and puts the empty row back', () => {
    const w = mount(loadedExample())
    w.vm.clearAll()
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgroles', value: '' }
    ])
    w.destroy()
  })
})

describe('Decision 11 — the box that was open claims the words', () => {
  test('moving into a role name box reports which box', () => {
    const w = mount({ orgroles: '1', 'orgrole-1-name': 'CEO' })
    w.vm.onBoxFocus({ key: 'orgrole-1-name' })
    expect(w.emitted('field-opened')[0][0]).toEqual({ fieldKey: 'orgrole-1-name' })
    w.destroy()
  })

  test('dictated words are saved exactly as typed ones are', () => {
    const w = mount({ orgroles: '1' })
    w.vm.emitVoice('orgrole-1-name', 'Chief Financial Officer')
    expect(w.emitted('fields-changed')[0][0].entries).toContainEqual({
      fieldKey: 'orgrole-1-name', value: 'Chief Financial Officer'
    })
    w.destroy()
  })
})

describe('the Reporting Head picker', () => {
  test('never offers the role in its own row', () => {
    const w = mount({
      orgroles: '1,2',
      'orgrole-1-name': 'CEO',
      'orgrole-2-name': 'CFO',
      'orgrole-2-head': 'CEO'
    })
    expect(w.vm.headOptions(w.vm.rows[1])).toEqual(['CEO'])
    expect(w.vm.headOptions(w.vm.rows[0])).toEqual(['CFO'])
    w.destroy()
  })

  test('excludes its own row by id, not by name', () => {
    // Two roles a client has given the same name must not delete each other from the list.
    const w = mount({
      orgroles: '1,2',
      'orgrole-1-name': 'Manager',
      'orgrole-2-name': 'Manager'
    })
    expect(w.vm.headOptions(w.vm.rows[0])).toEqual(['Manager'])
    w.destroy()
  })

  test('keeps a Reporting Head that is not a role — his own Shareholders', () => {
    // 🔴 THE PICKER COULD NOT HAVE PRODUCED IT, AND IT MUST STILL BE THERE. Dropping it
    // would silently delete the top of his chart the first time the row was touched.
    const w = mount(loadedExample())
    expect(w.vm.headOptions(w.vm.rows[0])[0]).toBe('Shareholders')
    w.destroy()
  })
})

describe('a rename reaches everyone reporting to that role, in one save', () => {
  test('both of the COO\'s reports move with it', () => {
    const w = mount({
      orgroles: '1,2,3',
      'orgrole-1-name': 'COO',
      'orgrole-2-name': 'Head HR',
      'orgrole-2-head': 'COO',
      'orgrole-3-name': 'Factory Foreman',
      'orgrole-3-head': 'COO'
    })
    w.vm.onNameInput(w.vm.rows[0], 'Operations Director')
    // One save: two children left pointing at a name that no longer exists, even briefly,
    // is a chart that has fallen apart.
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgrole-1-name', value: 'Operations Director' },
      { fieldKey: 'orgrole-2-head', value: 'Operations Director' },
      { fieldKey: 'orgrole-3-head', value: 'Operations Director' }
    ])
    w.destroy()
  })

  test('a role nobody reports to renames on its own', () => {
    const w = mount({ orgroles: '1', 'orgrole-1-name': 'CEO' })
    w.vm.onNameInput(w.vm.rows[0], 'Chief Executive')
    expect(w.emitted('fields-changed')[0][0].entries.length).toBe(1)
    w.destroy()
  })
})

describe('the capture card reaches for the builder, and only for this form', () => {
  test('the Org Chart concept renders the builder', () => {
    const w = mountWithBuefy(StrategyConceptCapture, {
      propsData: {
        name: CONCEPT.name,
        conceptId: CONCEPT.id,
        capture: forms.captureForConcept(CONCEPT),
        entries: {}
      }
    })
    expect(w.findComponent(StrategyOrgChartBuilder).exists()).toBe(true)
    w.destroy()
  })

  test('a concept on any other form does not', () => {
    const other = frameworks.listConcepts()
      .find(c => c.captureTemplate && c.captureForm && c.captureForm !== 'parent-child-list')
    const w = mountWithBuefy(StrategyConceptCapture, {
      propsData: {
        name: other.name,
        conceptId: other.id,
        capture: forms.captureForConcept(other),
        entries: {}
      }
    })
    expect(w.findComponent(StrategyOrgChartBuilder).exists()).toBe(false)
    w.destroy()
  })

  test('the builder\'s saves reach the page as one batch', () => {
    const w = mountWithBuefy(StrategyConceptCapture, {
      propsData: {
        name: CONCEPT.name,
        conceptId: CONCEPT.id,
        capture: forms.captureForConcept(CONCEPT),
        entries: {}
      }
    })
    w.findComponent(StrategyOrgChartBuilder).vm.startFromExample()
    expect(w.emitted('fields-changed')[0][0].entries.length).toBe(49)
    w.destroy()
  })
})

/**
 * 🔴 REMOVE THE LAST ROLE, ADD ONE, AND THE NEW ROW MUST BE EMPTY.
 *
 * Found by clicking those two buttons in a browser on 2026-09-21, with 18 component tests
 * and 31 unit tests green. A removed role's boxes are deliberately left in the store — that
 * is what makes a DELETE route unnecessary — so an id taken from the roster alone falls back
 * the moment the highest one goes, and the advisor is handed a "blank" row with the removed
 * person's name and reporting line already in it. On a client's own org chart.
 */
describe('a removed role never comes back in the next blank row', () => {
  test('adding after removing the last role issues a fresh id', () => {
    const w = mount({
      orgroles: '1,2',
      'orgrole-1-name': 'Board',
      'orgrole-2-name': 'CEO',
      // Role 3 was removed a moment ago; its boxes are still here, unread.
      'orgrole-3-name': 'Personal Assistant',
      'orgrole-3-head': 'Head of Purchasing'
    })
    w.vm.addRole()
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgroles', value: '1,2,4' }
    ])
    w.destroy()
  })

  test('the opening blank row does not inherit one either', () => {
    // Clear all empties the roster and leaves every box behind it.
    const w = mount({ orgroles: '', 'orgrole-1-name': 'Board', 'orgrole-24-name': 'Personal Assistant' })
    expect(w.vm.rows.length).toBe(1)
    expect(w.vm.rows[0]).toEqual({ id: 25, name: '', person: '', reportsTo: '' })
    w.destroy()
  })

  test('and the row on screen really is empty', () => {
    const w = mount({ orgroles: '', 'orgrole-1-name': 'Board' })
    expect(w.findAll('tbody tr').length).toBe(1)
    expect(w.find('tbody tr input').element.value).toBe('')
    w.destroy()
  })
})

describe('the chart panel appears only once there is a chart', () => {
  test('the empty screen is the table alone', () => {
    // A bordered panel drawn around nothing reads as a screen that failed to load.
    const w = mount({})
    expect(w.find('.soc').exists()).toBe(false)
    w.destroy()
  })

  test('a row with no name is still no chart', () => {
    const w = mount({ orgroles: '1' })
    expect(w.find('.soc').exists()).toBe(false)
    w.destroy()
  })

  test('naming one role brings it', () => {
    const w = mount({ orgroles: '1', 'orgrole-1-name': 'Owner' })
    expect(w.find('.soc svg').exists()).toBe(true)
    w.destroy()
  })
})

/**
 * The redraw of 2026-09-21 — built from
 * `design/mockups/strategy-capture-org-chart-redrawn.html`, five decisions ruled one at a
 * time. These guard what the screen renders happily either way.
 */
describe('the redraw on screen', () => {
  test('A — three columns, and the person saves to its own box', () => {
    const w = mount({ orgroles: '1', 'orgrole-1-name': 'Managing Director' })
    expect(w.findAll('thead th').length).toBe(5)
    // Two text boxes per row now, not one.
    expect(w.findAll('tbody tr input').length).toBe(2)

    w.vm.onBoxInput({ key: 'orgrole-1-person' }, 'bobby moors')
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgrole-1-person', value: 'bobby moors' }
    ])
    w.destroy()
  })

  test('A — the person is NOT what the picker offers (Decision D)', () => {
    const w = mount({
      orgroles: '1,2',
      'orgrole-1-name': 'Managing Director',
      'orgrole-1-person': 'bobby moors',
      'orgrole-2-name': 'Operations Manager',
      'orgrole-2-person': 'billy smith'
    })
    // A chart built on people breaks when somebody leaves; this one is built on positions.
    expect(w.vm.headOptions(w.vm.rows[1])).toEqual(['Managing Director'])
    expect(w.vm.headOptions(w.vm.rows[1])).not.toContain('bobby moors')
    w.destroy()
  })

  test('C — the top of the chart reads "Nobody", and it is what a new row starts on', () => {
    // 🔴 THE WORD IS THE WHOLE DEFECT — the option always existed and always worked; it read
    // "Reports to…", so Mike reported it missing. This test pins WHICH message the first
    // option shows, because the mount helper returns keys rather than English on purpose.
    // The English word itself is pinned once, beside the data, in `orgChart.test.js`.
    const w = mount({})
    const first = w.findAll('tbody select option').at(0)
    expect(first.text()).toBe('strategyPlanner.orgChart.nobody')
    expect(first.attributes('value')).toBe('')
    expect(w.vm.rows[0].reportsTo).toBe('')
    w.destroy()
  })

  test('C — a chosen head can be put back to Nobody', () => {
    const w = mount({
      orgroles: '1,2',
      'orgrole-1-name': 'Managing Director',
      'orgrole-2-name': 'Operations Manager',
      'orgrole-2-head': 'Managing Director'
    })
    w.vm.onHeadInput(w.vm.rows[1], '')
    expect(w.emitted('fields-changed')[0][0].entries).toEqual([
      { fieldKey: 'orgrole-2-head', value: '' }
    ])
    w.destroy()
  })

  test('B — a role with nobody in it still reaches the chart', () => {
    const w = mount({
      orgroles: '1,2',
      'orgrole-1-name': 'Managing Director',
      'orgrole-1-person': 'bobby moors',
      'orgrole-2-name': 'Quality Manager',
      'orgrole-2-head': 'Managing Director'
    })
    expect(w.vm.chart.roleCount).toBe(2)
    expect(w.find('.soc svg').exists()).toBe(true)
    w.destroy()
  })

  test('E — the chart the advisor sees is coloured by level', () => {
    const w = mount({
      orgroles: '1,2',
      'orgrole-1-name': 'Managing Director',
      'orgrole-2-name': 'Operations Manager',
      'orgrole-2-head': 'Managing Director'
    })
    const fills = w.findAll('.soc svg rect').wrappers.map(r => r.attributes('fill'))
    // Two levels, two different colours. One colour for both is the screen he rejected.
    expect(new Set(fills).size).toBe(2)
    expect(fills).toContain('#002B64')
    w.destroy()
  })

  test('dictating into the person box reaches the person box', () => {
    const w = mount({ orgroles: '1', 'orgrole-1-name': 'Managing Director' })
    w.vm.emitVoice('orgrole-1-person', 'bobby moors')
    expect(w.emitted('fields-changed')[0][0].entries).toContainEqual({
      fieldKey: 'orgrole-1-person', value: 'bobby moors'
    })
    w.destroy()
  })
})
