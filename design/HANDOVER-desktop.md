# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-25 · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean. 630 suites / 13,705 tests green.** PR #132 MERGED to `master` at `8e570996` on Mike's
word (7.10, 22.1, 14.3, 15.8, 14.4). Since then, on this branch only: **16.1** and **13.2**,
both closed on Mike's word.

### 🔴 FOR THE LAPTOP — once you merge `master` (you are 11 behind)
- **14.3 and 7.10 were done on BOTH machines this morning** (your `3ee91ffe`, our PR #132).
  Expect conflicts in `scripts/build-handbook.js`, `buildHandbook.test.js`, `features/handbook.md`
  and the three to-do files. Keep ONE 14.3 implementation and ONE closure entry per item; the
  content-audit fix under 7.10 exists only on ours.
- **Buefy's stylesheet is now `assets/css/buefy-brand.css`**, built with `$primary: #0070c0`.
  Never edit it; change `buefy-brand.scss` and run `npm run brand-css`. `sass` 1.32.13 is a
  new dev tool, so run `npm install` with **npm 8 on Node 14.15** after merging.
- **Test scratch files:** clear them with `tests/helpers/removeFile.js`, never a bare
  `unlinkSync` — that is what blocked pushes at random (22.1).
- **The forecast P&L gained four overseas lines** (`importedStock`, `overseasFreight`,
  `overseasDuty`, `exchangeMovement`) so the itemised lines add up to cost of sales.

### What today settled
Seven items closed: 7.10, 22.1, 14.3, 15.8, 14.4, 16.1, 13.2. Nothing is `activeOn` here.
