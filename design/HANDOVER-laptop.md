# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-13 (twenty-seventh session) · Laptop · branch `feat/advisor-progress`

Suite **10,249 green** (492 suites), lint 0 errors, tree clean, 15 ahead / 0 behind
`master`. Two commits pushed — `cdb936a8`, `461c1fdf` — plus this note. **FOUR live
items** — 4.15, 4.58, 4.86, 4.87. **Nothing is active on this machine.**

**4.93's Mid-Level Budget was opened and looked at**, which the last handover named as
unchecked. Shelf card correct; all five steps open; last session's four fixes confirmed
on screen. **Three faults came out of looking, none visible to any assertion.**

1. **Step 4's help line sat on the wrong card.** *"Enter the money that actually reached
   the bank, not what you invoiced"* — Decision 6 on the drawing — was rendered above
   **Stock and Materials** as well as Money In, where it points the money the wrong way.
   That card now reads *"Enter what you actually paid suppliers, not what they invoiced
   you"* (Mike's wording).
2. **Both budget screens opened in April 2021**, the sample workbook's year — five years
   stale, every month label wrong. Now derived from `utils/financialYearStart.js`
   (April of the current NZ tax year), shared by both, rolling over on its own. Nine tests.
3. 🔴 **THE HIGH LEVEL BUDGET HAD NEVER RECEIVED ANY OF 4.93's EMPTY-STATE FIXES.** Found
   while correcting the same chart heading on both. From step 3 it showed a variance
   headline against an empty actuals side, drew twelve nulls as zeroes in both charts —
   a flat line pinned across the bank chart reading *"the actual beat the budget all
   year"* — listed *Actual* in both legends, and totalled `$0` under a column of *not
   entered*. `hasActuals` is ported across and governs all of it. **Verified on screen in
   both directions:** everything returns the moment one actual is entered. No calculation
   changed.

**Both drawings carry every difference** — High Level six → eight, Mid-Level seven → nine
— and the Mid-Level's *"one nit left deliberately"* paragraph is replaced; it was the
thread that led to the older screen. Brief updated in both sections.

**Still open, Mike's call:** the `add-a-report` skill tells sessions to record work in
`ACTIONS.md`, frozen since 2026-08-24.

**Waiting on Mike, unchanged:** 4.58's OpenAI reply, 4.15's eighteen template names, and
whether the four unranked items get placed.

**DESKTOP:** 4.87 untouched. Shared files this session touched and has FINISHED with:
`components/MidLevelBudget.vue`, `components/HighLevelBudget.vue`, `locales/en.json`,
`utils/financialYearStart.js`, `design/features/report-models.md`, both budget mockups,
`design/CODE-SIZE.md`. ⚠ **Your note is still dated 2026-09-10 while your branch has a
commit from 2026-09-12** — flagged last session, still true.
