/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { mountWithBuefy } = require('../helpers/mountComponent')

const ReportShell = require('~/components/base/ReportShell.vue').default

/**
 * ReportShell is the single source of the Model Library's visual standard
 * (`design/REPORT-VISUAL-STANDARD.md`). Two things are proven here.
 *
 * 1. THE FRAME + SLOT render — mounted, so a broken template fails the build. This is the
 *    behaviour a page relies on: wrap a screen and get the canvas + centred column around
 *    it. (Token *values* are NOT asserted via computed style: jsdom does not resolve CSS
 *    custom properties from a scoped `<style>` block, so any such assertion would pass by
 *    accident rather than by truth — see note (2).)
 *
 * 2. THE STANDARD NUMBERS are pinned by reading the source. The five owner-confirmed
 *    values (2026-07-27) live in exactly one file now; a future edit that quietly changes
 *    360/20/1120/14/12 — the very drift this component exists to stop — fails here. And
 *    the all-light ruling is guarded: a re-introduced `prefers-color-scheme` rule fails
 *    the build, so dark styling cannot creep back into the one source.
 */

const SHELL_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'base', 'ReportShell.vue'),
  'utf8'
)

describe('ReportShell — frame and slot', () => {
  it('renders the page canvas and the centred content column', () => {
    const wrapper = mountWithBuefy(ReportShell, {
      slots: { default: '<div class="probe">screen goes here</div>' }
    })

    expect(wrapper.find('.report-shell').exists()).toBe(true)
    expect(wrapper.find('.report-shell__wrap').exists()).toBe(true)
  })

  it('renders the screen it wraps, inside the content column', () => {
    // The whole point of the shell is to host a screen in its slot; if the slot were lost
    // in a template refactor every report would render an empty frame.
    const wrapper = mountWithBuefy(ReportShell, {
      slots: { default: '<div class="probe">screen goes here</div>' }
    })

    const probe = wrapper.find('.report-shell__wrap .probe')
    expect(probe.exists()).toBe(true)
    expect(probe.text()).toBe('screen goes here')
  })
})

describe('ReportShell — the standard is the single source', () => {
  // Owner-confirmed 2026-07-27. Each is asserted against the source so the number cannot
  // be changed silently in the one place it now lives.
  const STANDARD_NUMBERS = [
    ['left input column', '--rs-col-input: 360px'],
    ['column gap', '--rs-col-gap: 20px'],
    ['content width', '--rs-content-width: 1120px'],
    ['card corner radius', '--rs-card-radius: 14px'],
    ['card title size', '--rs-card-title-size: 12px']
  ]

  it.each(STANDARD_NUMBERS)('pins the %s', (_label, declaration) => {
    expect(SHELL_SRC).toContain(declaration)
  })

  it('carries no dark-mode rule (Mike ruled one light look, 2026-07-27)', () => {
    // The four screens that once went dark on the OS setting are being unified to light;
    // the shell is the one source, so dark styling must never reappear here. Match an
    // actual media query, not the bare phrase — the file's own JSDoc names
    // `prefers-color-scheme` while explaining why it is absent.
    expect(SHELL_SRC).not.toMatch(/@media\s*\(\s*prefers-color-scheme/i)
  })
})
