'use strict'

const fs = require('fs')
const path = require('path')

/**
 * The Model Library grid is light, always — guard.
 *
 * WHY THIS EXISTS. The owner ruled on 2026-07-27 that every report screen shows one light
 * look regardless of the viewer's OS theme, and `reportShell.component.test.js` holds that
 * line for the eight screens. `ModelLibrary.vue` — the catalogue grid the client passes
 * THROUGH to reach a report — sat outside that standard and kept its own
 * `@media (prefers-color-scheme: dark)` override of the `--mlb-*` palette. A dark-mode
 * visitor therefore got a dark catalogue that handed over to a light report, one click
 * apart. The override was removed on 2026-07-28 (owner-approved), extending the ruling to
 * this page.
 *
 * Removal alone does not hold: the file has no other styling guard, so a later tidy-up
 * re-adding a dark block — which reads like an oversight being corrected — would ship with
 * the whole suite green. This test is what makes the ruling durable rather than remembered.
 *
 * Source-read, not mounted: a dark rule is a CSS media query, and jsdom neither resolves
 * scoped `<style>` blocks nor evaluates `prefers-color-scheme`, so mounting the component
 * could not observe the thing being guarded. Reading the source is the only assertion here
 * that can actually fail for the right reason.
 */

const LIBRARY_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'ModelLibrary.vue'),
  'utf8'
)

describe('ModelLibrary — one light look (owner ruling, extended 2026-07-28)', () => {
  it('carries no dark-mode rule', () => {
    // Match an actual media query rather than the bare phrase: the file's own comment
    // explains why dark mode is absent, and a prose mention must not fail the build.
    expect(LIBRARY_SRC).not.toMatch(/@media\s*\(\s*prefers-color-scheme/i)
  })

  it('declares no dark palette values for the grid', () => {
    // Belt and braces on the same ruling. The removed block re-pointed the `--mlb-*`
    // palette at a near-black canvas; those exact values reappearing anywhere in the file
    // means dark styling is back, whatever mechanism was used to apply it (a media query,
    // a body class, a data attribute). Guarding the *values* survives a change of
    // mechanism in a way that guarding the media query alone does not.
    const DARK_PALETTE_VALUES = ['#05132a', '#0a1f3d', '#e6f0fa', '#9fb4d0', '#1a3559']

    DARK_PALETTE_VALUES.forEach((value) => {
      expect(LIBRARY_SRC.toLowerCase()).not.toContain(value)
    })
  })
})
