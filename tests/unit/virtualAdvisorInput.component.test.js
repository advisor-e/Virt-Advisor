/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const path = require('path')

/**
 * The chat input must appear only where there is a conversation to have.
 *
 * The original defect: `firm` rendered the Firm Dashboard — a full-screen panel, not a
 * message thread — but was missing from the input's exclusion list, so the message box
 * and its send button rendered underneath it: an input with nothing to talk to.
 *
 * `firm` itself was removed on 2026-07-29 along with the FirmDashboard mock, so the
 * original regression anchor is gone. What replaces it is stronger: the two lists must
 * agree in BOTH directions. That catches the same drift for any future mode, and also
 * catches over-listing, which would hide the input from a screen that needs it.
 *
 * The cause was structural rather than careless. The panel modes are declared in one
 * place (the `v-if` chain at the top of the template) and the input's condition was a
 * separate chain of `mode !== '...'` tests further down. Adding a mode to the first did
 * not oblige anyone to update the second, so the two drifted.
 *
 * These tests are read against the SOURCE rather than by mounting. VirtualAdvisor is a
 * ~2,500-line component with speech, streaming and markdown wired into `mounted()`;
 * mounting it to assert one `v-if` would test a great deal that has nothing to do with
 * the rule, and would be brittle for the wrong reasons. What matters here is that the
 * two lists cannot disagree — and that is a property of the source.
 */

const SRC = fs.readFileSync(path.join(__dirname, '../../components/VirtualAdvisor.vue'), 'utf8')

/** The declared panel modes. */
function declaredPanelModes () {
  const m = /const PANEL_MODES = \[([^\]]*)\]/.exec(SRC)
  expect(m).not.toBeNull()
  return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
}

/** Modes that render their own component in the template's top-level v-if chain. */
function modesRenderingAPanel () {
  const head = SRC.slice(0, SRC.indexOf('.input-area'))
  const found = new Set()
  const re = /v-(?:else-)?if="mode === '([a-z]+)'"/g
  let m
  while ((m = re.exec(head)) !== null) { found.add(m[1]) }
  return Array.from(found)
}

describe('VirtualAdvisor — the chat input appears only in conversational modes', () => {
  it('hides the input for every declared panel mode', () => {
    const condition = /\.input-area\(v-if="([^"]+)"\)/.exec(SRC)
    expect(condition).not.toBeNull()

    // One named list, not a chain of inequalities — the chain is how `firm` was missed.
    expect(condition[1]).toContain('PANEL_MODES')
    expect(condition[1]).toContain('mode &&')
  })

  it('declares every mode that renders a full-screen panel', () => {
    // The guard: a new panel mode added to the template but not to PANEL_MODES would
    // put the chat input back underneath it. This is the drift that caused the bug.
    const rendered = modesRenderingAPanel()
    const declared = declaredPanelModes()

    expect(rendered.length).toBeGreaterThan(0)
    rendered.forEach((mode) => {
      expect(declared).toContain(mode)
    })
  })

  it('declares no panel mode that does not render one', () => {
    // The other direction, and the reason this replaced the old `firm` anchor: a mode
    // left in PANEL_MODES after its screen is deleted hides the input from nothing,
    // but it is a lie in the source that the next reader has to disprove. Deleting
    // FirmDashboard on 2026-07-29 is exactly the case — `firm` had to leave both lists.
    const rendered = modesRenderingAPanel()
    declaredPanelModes().forEach((mode) => {
      expect(rendered).toContain(mode)
    })
  })

  it('does not hide the input from the conversational modes', () => {
    // The opposite failure — over-listing — would silently remove the advisor's ability
    // to type on a screen whose whole purpose is typing.
    const declared = declaredPanelModes()
    expect(declared).not.toContain('learn')
    expect(declared).not.toContain('client')
    expect(declared).not.toContain('discover')
  })
})
