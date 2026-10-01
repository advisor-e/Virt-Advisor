# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-10-01 (afternoon) · Desktop · branch `feat/firm-quiz-builder-ui`

**Level with master after PR #151 merged (`f0f32188`); suite green: 683 suites / 14,755 tests
on Node 14.15, audit PASS.** This shutdown's commit makes it 1 ahead.

**Closed today on Mike's word:** 46.1 (Stats NZ provisional years worked out from the file),
7.17 (engine briefing builder's dead options; AI input proven byte-identical), 44.3 (bad
debts built; deferred tax, leases, shipping terms kept as disclosures after the impact test).

**13.8 slice 1 BUILT, Mike's call PROCEED, `activeOn` desktop.** The 13 Business Performance
Report screens format through `mixins/reportFormatMixin.js`; German walk 170 wrong figures → 0,
English byte-identical. Slices 2 (other report screens) and 3 (hub screens + seven
browser-language dates) are next here.

### FOR THE LAPTOP

- **Merge `master` at startup** — PR #151 is on it, and your branch is 11 behind.
- Shared files changed: `locales/en.json` (`report.dashboardReports.doc.pts`;
  `firmBenchmarker.inForce.provisional` now takes years), `server/advisorEngine.js`
  (`buildClientContext` options trimmed), `utils/reportFormat.js`, `utils/currencyFormat.js`
  (`kMoney`). A screen must use `reportFormatMixin`, never require `utils/reportFormat`
  directly — `reportFormat.test.js` fails if it does.
