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

/**
 * The SAME drift, found live on 2026-07-29 in a second place.
 *
 * `selectMode()` opens a conversation with a greeting — `$t('opening.' + mode)` — and
 * skipped that only for modes on its OWN local list, `noConversation = ['course']`.
 * That was a third copy of "modes that are a panel, not a conversation", and it had
 * drifted twice over: it never gained `progression`, and it kept `firm` until the
 * FirmDashboard deletion.
 *
 * The visible consequence: opening My Progress asked vue-i18n for `opening.progression`,
 * a key that has never existed in any locale file, and pushed the raw key text into the
 * message list as the assistant's opening line. Nothing displayed it — the progression
 * panel replaces the message area — so it surfaced only as a console warning, and only
 * once someone finally opened the screen. It had been latent since the screen was built.
 *
 * The fix is to delete the third list and use PANEL_MODES, so this cannot drift again.
 */
describe('VirtualAdvisor — a panel mode never opens a conversation', () => {
  /** The guard inside selectMode that decides whether to push a greeting. */
  function openingGate () {
    const m = /if \(!([A-Za-z_]+)\.includes\(selected\)\) \{/.exec(SRC)
    expect(m).not.toBeNull()
    return m[1]
  }

  it('gates the opening greeting on PANEL_MODES, not a list of its own', () => {
    expect(openingGate()).toBe('PANEL_MODES')
  })

  it('keeps no second list of non-conversational modes', () => {
    // Naming the dead variable directly: its return in any form is the defect itself.
    expect(SRC).not.toContain('noConversation')
  })

  it('asks for no opening greeting a locale file cannot answer', () => {
    // The real assertion behind the rule: every mode that DOES open a conversation must
    // have an `opening.<mode>` string. This is what would have caught the live defect —
    // and it now also catches a new conversational mode shipped without its greeting.
    const en = require('../../locales/en.json')
    const conversational = modesRenderingAPanel()
    expect(conversational).toContain('progression')

    const modeKeys = Array.from(SRC.matchAll(/selectMode\('([a-z]+)'\)/g)).map(m => m[1])
    expect(modeKeys.length).toBeGreaterThan(0)

    modeKeys
      .filter(mode => !declaredPanelModes().includes(mode))
      // 'client' asks who the session is for before any greeting — see selectMode.
      .filter(mode => mode !== 'client')
      .forEach((mode) => {
        expect(typeof en.opening[mode]).toBe('string')
      })
  })

  it('gates progression specifically — the mode whose greeting never existed', () => {
    // The regression anchor. `progression` must stay on PANEL_MODES: off it, selectMode
    // reaches $t('opening.progression') again, and there is no such string to find.
    expect(declaredPanelModes()).toContain('progression')
    expect(require('../../locales/en.json').opening.progression).toBeUndefined()
  })

  // NOT asserted: that a panel mode has no `opening.*` string. `course` legitimately
  // has one — CourseBuilder runs its own conversation inside the panel and uses
  // `$t('opening.course')` in four places. A panel may own a greeting; what it must
  // not do is have selectMode push one on its behalf.
})
