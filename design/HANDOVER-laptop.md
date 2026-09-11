# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-11 (nineteenth session) · Laptop · branch `feat/advisor-progress`

Suite **10,024 green** (481 suites), lint 0, audit PASS. Eight commits, all pushed, all in
**PR #82** — not yet merged. Tree clean. Nothing active on this machine.

🔴 **DESKTOP, READ THIS FIRST: I CHANGED `components/FirmManagerHub.vue`, WHICH IS ON 4.87'S
`touches` LIST.** 52 lines — a new `TAB_TIERS.countrySchedules`, a panel, an import, a
registration and a `NAV_GROUPS` entry, all appended rather than woven in. Your consent tab and
Mentor Hub page will land in the same three places, so **expect a merge conflict there and
expect to keep both sides**. Nothing else of 4.87's was touched. I should have raised it
before editing rather than after; it is named here so it is not a surprise.

**4.92 IS BUILT END TO END — a country's whole schedule, stored once.** Five slices, all on
Mike's rulings of today, each asked one at a time: it loads at the **global group manager tier
alone** (overriding default-is-mentor-alone for this feature); a schedule gets its **own
allowance of 10 a day**, apart from a firm's 20 documents; a pass that will not read is stored
as a **named gap shown wherever the table is used**; a firm's own table still wins. Drawing:
[`depreciation-rates-country-schedules.html`](mockups/depreciation-rates-country-schedules.html),
approved after all three decisions were ruled.

**The shape that matters: one model answer cannot carry a 52-page schedule.** A survey call
says how far the document runs, then one call per eight pages, added up here. That is the cure
for 4.90 and 4.91 — and it exists because we may not open the PDF ourselves (Mike, 2026-09-09),
so only the model can say how many pages there are.

⚠ **NOTHING HAS MET A REAL DOCUMENT.** No schedule has been read through any of it — that needs
a model key, a manager and a live store, so it is UAT work. **First thing to watch on a live
run: whether the survey names the table pages correctly.** Get that wrong and the passes read
the wrong part of the document, thoroughly and confidently.

**4.90 and 4.91 are much narrower but NOT closed** — each carries a `FOR MIKE` line naming the
choice. 4.90: the picker now searches the whole country table, but the per-document cap is
still 250 and its comment still says "about 156". 4.91: the country path refuses an empty read
outright; the per-document read still asks for a whole schedule in one answer.

**What else changed under you:** `data/ai-prompts.json` (two new prompts, so four prompt-list
guards moved), `server/utils/aiLoadBudget.js` (window logic extracted to `_spend`; its twelve
tests pass unmodified), `tests/unit/hubTabTiers.test.js` (the two middle tiers are no longer
identical — it now pins that they differ by exactly one named tab), `restify-server.js`,
`DepreciationDocumentReview.vue`, `FirmDepreciationRates.vue`, and the depreciation Brief.
