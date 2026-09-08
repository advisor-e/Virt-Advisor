# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-08 (fifth session) · Laptop · branch `feat/advisor-progress`

Suite **8,393 green**, lint 0 errors, audit pass. **One commit — `5628a43`, pushed.**
44 ahead, 0 behind. **PR #69 still open** (Meeting Review, from the fourth session).
Nothing uncommitted.

**Shipped: 4.79, both slices.** The readers returned the FIRST recognised report across a
workbook's sheets. A real MYOB or QuickBooks export is ONE workbook holding a P&L, a Balance
Sheet and an asset register, P&L first — so **all three intake screens were wrong, each
differently**: the forecast refused the drop asking for a Balance Sheet the file contained;
Quick Position ticked the P&L zone, left the Balance Sheet unread and disabled Continue
saying nothing; EBITDA failed the whole upload when the Balance Sheet came first. One reader
(`reportsFromBuffer`) now walks every sheet and each caller takes what its screen needs.
`parseUpload` is gone — `parseAnnualReports` replaces it. Item count unchanged at eight.

**Four things worth knowing:**

1. 🔴 **The pin worked exactly as written.** Yesterday's deliberately-wrong test —
   *"DOCUMENTS A DEFECT"* — broke the moment the defect was fixed, which is why the fix could
   not pass unnoticed. Keep writing them that way.
2. 🔴 **I nearly parked slice 2 as "a decision for Mike" and there was no decision to take.**
   Quick Position's screen already routed by report kind and already held both results side by
   side. **Read the screen before declaring something a design question** — the vague version
   of that claim also hid that Quick Position failed SILENTLY, which is worse than the
   forecast's loud refusal, not milder.
3. **A guard that counts the wrong unit is worse than none.** `threeWayForecastAssembler`
   counted reports while the route counts files, so it could have told an advisor to drop
   fewer files while they held four. Deleted, not moved — the route's pre-parse check stands.
4. 🔴 **NOT WATCHED IN A BROWSER.** Everything proving 4.79 is a test. Dropping one real MYOB
   or QuickBooks export into the forecast, Quick Position and EBITDA is a five-minute check
   and has not been done. 4.79 is deliberately still ON the list for that reason.

**DESKTOP — merge `master` in first.** Shared files that moved today:
`server/report/intake/xeroReportParser.js` (**`parseUpload` renamed to `parseAnnualReports`
and now returns an ARRAY** — this will break any caller you have added),
`server/routes/report.js` (all three intake routes), `server/report/intake/annualAssembler.js`
(JSDoc only), `server/report/intake/threeWayForecastAssembler.js`,
`components/QuickPositionIntake.vue` (the upload handler reads `data.reports`),
`report-models.md`, `to-do-items.json`.

⚠ **Your own note is still dated 2026-09-04 while `feat/firm-quiz-builder-ui` committed on
2026-09-08** — 39 ahead of `master`. Four days of desktop work are invisible from here.

**Open:** **4.72 and 4.76** are ours and each wants its own proposal — both touch storage or
cascade shared by all four manager tiers. **4.15, 4.58, 4.66, 4.77 and 4.78 wait on Mike**;
4.78 needs an IRD source for Investment Boost before anything is built on it.
