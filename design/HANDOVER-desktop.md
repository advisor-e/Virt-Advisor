# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-25 (afternoon) · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed at `1375c0eb`. 636 suites / 13,774 tests green, audit PASS.** 8 ahead of
`master`, 0 behind — not yet at the 10 that calls for a PR. Nothing is `activeOn` here.

**Closed on Mike's word:** 12.1, 10.1 (plus 16.1 and 13.2 this morning). **Parked:** 16.
**Filed:** 13.6 (translation glossary), 46.1 (benchmark provisional years), 10.2 (backend-worded
English on hub screens).

**Pick up first tomorrow:** OpenAI says ZDR is enabled for the organisation (recorded verbatim,
`OPENAI-AUDIO-TERMS-EMAIL.md` §5.8). Mike checks the console for the org badge AND the Project's
setting; then 8.1 and `OPENAI-ZDR-CONSTRAINTS.md`'s status are updated on what he saw.

### 🔴 FOR THE LAPTOP — when this branch reaches `master`
- **Translation is now the backend's** (`server/utils/uiTranslation.js`, `GET /api/ui-translation/:code`,
  new AI role `translate`). Any NEW screen text still just goes in `en.json` — nothing else to do.
- **`locales/en.json` gained ~1,040 lines at its END** (15 new blocks). If you also appended blocks,
  the merge conflicts at the file's tail: keep both sides.
- **`tests/helpers/mountComponent.js`** gained `englishMocks()` (real English `$t`) and renders
  `<i18n>` by default — drop any `stubs: { i18n: true }` you add.
- **`openaiClient.js` now decodes whole letters**; a split "ö" or "—" used to become "��".
- From this morning, still unmerged: Buefy's stylesheet is `assets/css/buefy-brand.css` (edit the
  `.scss`, run `npm run brand-css`; `npm install` with npm 8 on Node 14.15); the forecast P&L has
  four overseas lines.
