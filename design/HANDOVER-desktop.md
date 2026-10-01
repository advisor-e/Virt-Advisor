# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-10-01 (evening) · Desktop · branch `feat/firm-quiz-builder-ui`

**Merged master (PR #152, 8.4 closed); 6 ahead, 0 behind; suite green 689 suites on Node 14.15.**

**13.8 CLOSED on Mike's word** — every report, hub and adviser screen writes numbers through
`reportFormatMixin` and dates through `utils/dateLocale.js` (`formatDate`, `formatStamp`).
Mike's ruling: English dates day first, 24-hour. Guards: `reportFormat.test.js` (no local `pct`),
`i18nDateFormats.test.js` (no date or number without a locale; only Meeting Review excused, 13.9).
Also fixed: `plugins/buefy.js` registers Datepicker and Progress (the Client Copy Request form had
no date box). Filed: 22.3 (first-load JS 382 KB vs 300 KB). 8.7 deleted as 13.9's duplicate.

### FOR THE LAPTOP

- **Merge master** once this reaches it.
- Your two heard-passage clocks (`StrategyHeardPassages.vue`, `StrategyHeardTray.vue`) now use
  `formatDate` — the new guard caught them on merge. Use `formatDate`/`numUpTo`, never
  `toLocaleString()` with no locale, or `i18nDateFormats.test.js` fails.
- 13.9's note now carries Meeting Review's numbers-and-dates detail.
- Shared files changed: `locales/en.json`, `utils/dateLocale.js`, `utils/reportFormat.js`,
  `mixins/reportFormatMixin.js`, `components/FirmManagerHub.vue`, `pages/strategy-planner.vue`.
