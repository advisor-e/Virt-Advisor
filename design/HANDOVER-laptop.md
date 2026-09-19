# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-19 · Laptop · branch `feat/advisor-progress`

**Five commits, all pushed.** Suite **12,217 green** (566 suites), lint 0, coverage and audit
gates passed. Tree clean. **9 ahead of `master`, 0 behind — all of it in
[PR #102](https://github.com/advisor-e/Virt-Advisor/pull/102). 22 live items.**

🔴 **DESKTOP — THE GUARD WILL REFUSE YOUR NEXT LIST COMMIT, AND THAT IS IT WORKING.**
`tests/unit/itemIdentity.test.js` makes a live number's **asked-on date immutable**, measured
against `origin/master` so a later session cannot bury it. Your branch repointed `7.12` from
*the right calculator is offered only sometimes* to *the model's page is recalled by the AI* —
one row rewritten, so nothing was ever duplicated and every gate passed. **Mike ruled
2026-09-19: `7.12` goes BACK (that defect is still open at 4 of 6 and exists nowhere on your
list), and the new job takes `7.13`.** Both halves are yours to apply — `ITEM-NUMBERING.md` §4
carries it. Measured first: 40 name changes in 60 days, 0 false alarms, 3 real ones.

🔴 **THE MICROPHONE FIX TOUCHES YOUR SCREENS.** `mixins/collaborate/speechMixin.js` had no
`beforeDestroy`, so Discover, New Group, Marketplace, Profile and the message pane kept a live
microphone after an advisor navigated away. Copied from the main mixin on Mike's ruling. **A
test was asserting the bug** — it required a restart after a mic error, which is the loop
itself; corrected.

**STAGE 5 STARTED — 1 of the 9 capture forms.** The banded grid, drawn
([artefact](https://claude.ai/artifact/Y11pqGSz6QZDNWpbawx7td)), approved, built; it serves five
of Mike's tables. **Every capture box now carries the `voice.*` bar from "I have a client with a
problem…"** — his ruling: *"i want app user consistency."* Not Meeting Review's recorder, so
none of 8.1's gates apply. Drawing it found two live defects: Blue Ocean gave **14 boxes where
his document rules 15** and had lost his first heading to his own placeholder; the Profit Levers
gave **29 where it has 28**. Both fixed, both now counted against his workbook by test.
**Eight forms remain.**

**NEW ITEM 15.9 — the decision that gates everything after stage 3**, waiting on Mike since
2026-09-17 and until today living only in a note. Do not design past stage 3 without it.

⚠ **I claimed on the first drawing that Porter's loses its headings. It does not** — it uses its
own approved five-force card and never reaches that renderer. Reasoned from code instead of
opening the app; the correction is printed on the drawing.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `ARTEFACTS.md`,
`ITEM-NUMBERING.md`, `strategy-planner.md`, `CODE-SIZE.md`, `scripts/quick-gate.js` (one line),
`tests/unit/quickGate.test.js` (two pinned lists), `mixins/speechMixin.js`,
`mixins/collaborate/speechMixin.js`, `data/strategy-frameworks.json` (one corrupt line — Blue
Ocean's *Helps Your Client To…* ended `"…competitors.tion Point'."`). **No `FirmManagerHub.vue`,
no engine code.** **7.5, 15.1 and 15.7 stay active on this laptop.**
