# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-07 (third session) · Laptop · branch `feat/advisor-progress`

Suite **8,108 green** (416 suites), lint 0 errors. Seven commits, and **both pull requests
merged (#64 and #65)** — branch level with `master`, nothing uncommitted.

**4.60 — MYOB filed its fixed assets as CURRENT.** MYOB heads them *"Property, Plant &
Equipment"*; the section test knew only "fixed" and "non-current", so all six rows fell to
the current side. `assets` came back empty and 145,300 went to the other-current-asset
catch-all. The sheet still tied — which is why nothing complained — but every asset opened
at **zero, so the forecast charged no depreciation for the year**. Fixed via one named
constant. **4.60 has NOT moved**; it still waits on four real exports.

**4.71 QUICK-FIRE — SLICE 1 BUILT, drawn and approved the same day, five questions ruled.**
A tick on step 3 opens three rows × three years (growth, margin, overheads). Arithmetic in
`utils/quickFireForecast.js`, pinned to the drawing's own figures. ⚠ **Slice 2 is the larger
half and is NOT approved by that drawing** — step 4 draws one year, so the grid collects
three and shows one. It gets its own drawing.

**"The sliders do nothing" — they never were broken.** Mike's by-month export was the
current year, stopped part-way through a month, that month was stripped, and short of twelve
the seed was refused entirely. He got a **$202,781 loss "on $0 of sales"**, balanced, with
four live sliders multiplying zero. Proven by driving the real app with Playwright: with
figures, the same slider moved sales 890,000 → 1,112,500.

**🔴 MIKE REVERSED THE SEED RULE — this is the one that touches your files.** A short run
now **seeds the months it has** and names the ones it does not. The part month is still
never seeded (a wrong figure vs a missing one). Step 4 also gained an **amber** band when a
forecast has no sales at all.

### 🔴 DESKTOP — read this first

- **Shared files changed:** `server/routes/report.js` (the monthly-seed block),
  `threeWayForecastAssembler.js` (now returns `salesSeededMonths`),
  `ThreeWayForecastIntake.vue` (per-month tagging + quick-fire), `ThreeWayForecastReport.vue`
  (the no-sales band), `locales/en.json`. **Two of your route tests changed** —
  `threeWayForecastIntakeRoute.test.js` pinned "short runs seed nothing" and now pins the
  opposite.
- **The OpenAI account is still OUT OF CREDITS.** Economic analysis fails for every user.
- Your 2026-09-07 handover was read. Nothing of 4.70's was touched.

### Next

**4.71 slice 2** — the three-year step 4. Needs a drawing and Mike's approval before code.
**4.69** still owes one run on the no-date path once credits return. **4.60** waits on four
real exports; MYOB's fixed-asset gap is now closed.

⚠ Worth knowing, not filed: driving the app with Playwright, `setInputFiles` on step 1
never triggered an intake POST — no error either. It may be a harness artefact rather than
a real fault, so it is recorded here rather than as a task nobody can reproduce.

**Nine live items.** 4.71 `activeOn` this laptop.
