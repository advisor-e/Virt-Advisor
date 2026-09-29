/**
 * Item 15.20, piece 5. Two imported pages on one screen must not share a font name.
 *
 * WHAT UAT CANNOT SEE: the PDF reader names each converted page's fonts `g_d0_f1`… afresh, so
 * two pages declared the same name for different fonts and the later one won — p11 of
 * Organisational Review printed "beliefs2" for "beliefs?". Only a few characters change and only
 * when another page is on screen, so a tester reads straight past it.
 */

import { ownFontNames } from '~/utils/importedPageFonts'

const page = fontBytes => '<svg><defs><style>@font-face { font-family: "g_d0_f3"; src: url(data:font/opentype;base64,' +
  fontBytes + '); }</style></defs><text font-family="g_d0_f3">x</text></svg>'

const faceName = svg => /font-family: "([^"]+)"/.exec(svg)[1]
const textFont = svg => /<text font-family="([^"]+)"/.exec(svg)[1]

test('🔴 two different pages that both call a font g_d0_f3 come out with different names', () => {
  const a = ownFontNames(page('AAAA'))
  const b = ownFontNames(page('BBBB'))

  expect(faceName(a)).not.toBe(faceName(b))
})

test('each page\'s text still points at its own font', () => {
  const a = ownFontNames(page('AAAA'))

  expect(textFont(a)).toBe(faceName(a))
  expect(a).not.toMatch(/"g_d0_f3"/)
})

test('the same page is named the same every time, so the server and the browser agree', () => {
  expect(ownFontNames(page('AAAA'))).toBe(ownFontNames(page('AAAA')))
})
