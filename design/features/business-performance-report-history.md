# Business Performance Report — the History

> **Read [`business-performance-report.md`](business-performance-report.md) first.** That page is
> the rules. If the two disagree, **the Brief wins**.

---

## 1. Why this was built

**Mike, 2026-09-07**, opening the day with *"lets get started on the dashboard reports"*, then
after the support folder was read:

> *"the dashboard reports needs to be used in combination with the material i just gave you -
> PLUS - any other model or resource already developed within the virt advisor app - perf report
> section - to develop a rich, colourful, and easy to understand business performance report to
> be read and understood by private business owners. The report needs to be 7-10 pages (pages can
> be added via droptab request by adviosor) and include engaging graphics. The report should
> include a contents table, an executive summary with graphics, a summary financial dashboard -
> it should have room for data extracted from P&L, Balance Sheet and Inventory reports and
> anything else you consider best practice or useful."*

And the page-count rule, later the same day: *"if the pages are colourful, engaging and
enlightening the report can go up to 15 pages all told. make the base report between 7-10 with
options to add the others if the content supports it."* He also pointed at the forecast's new
research feature as the benchmark source: *"links to NZ business stats is now a feature in the
latest 3 way forecast which provides some benchmark data and market reserach is also a feature
of the new 3 way model."*

**What the day's reading found, and how it shaped the design.**

- **The Dashboard Reports workbook is one ratio engine plus sixty charts of it**, with four
  unrelated tools bolted on. The first scoping (before the support folder) proposed porting the
  ratio dashboard; the deck changed that — the deliverable is the client's document, and the
  workbook supplies its numbers.
- **The deck is the target output**, ten slides in eight sections, every figure read in words.
- **Cash Drivers supplies the organising logic of the cash page**, and six of its seven drivers
  were already computed by the trend read built for the forecast on 2026-09-03.
- **The forecast's research feature is sourced prose, not a table of medians.** It cites the
  Reserve Bank, Stats NZ and the Census, refuses an unsourced figure, and prints only on the
  advisor's recorded approval. The report reuses it as an optional page rather than inventing
  industry averages.
- **Four things in the deck have no source or rule anywhere** — the health score, industry
  medians, inventory ageing, and the next-steps narrative. Each is drawn with no number and put
  to Mike rather than filled.

---

## 2. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Page count | Base 7–10 pages; up to 15 in all; optional pages only where the content exists | 2026-09-07, Mike |
| Pages are added by the advisor | From a dropdown ("droptab") on the report | 2026-09-07, Mike |
| What the report draws on | The support folder (deck, workbook, Cash Drivers, HOPE) **plus** every model already in the section | 2026-09-07, Mike |
| Industry context | Reuse the forecast's economic analysis; no invented medians | 2026-09-07, from Mike's pointer to the forecast feature; the medians ruling itself stays open |

---

## 3. Where the raw material is

- The drawing: [`../mockups/business-performance-report.html`](../mockups/business-performance-report.html).
- The support folder Mike supplied on 2026-09-07: `Support models for perf reports/` —
  `Business_Performance_Report_Mockup.pptx`, `Cash Drivers.pdf`, `HOPE Model.pdf`, and
  `Dashboard Reports_ (1).xlsx` (identical to the repo's workbook except the Tax Guestimator's
  personal tax bands).
- The workbook read: sheet-by-sheet formula dumps were made in the session scratchpad; the
  findings that matter are in the Brief §3 (the four quirks, the four side sheets).
- The forecast's research feature: `design/ECONOMIC-ANALYSIS-PROMPT.md`,
  `design/ECONOMIC-ANALYSIS-TEST-RUNS.md`, `design/mockups/three-way-forecast-economic-analysis.html`.
- The two-year trend read: `design/mockups/three-way-forecast-trend.html`, `server/report/trendModel.js`.
- The first scoping message and the revised one after the support folder, in the 2026-09-07
  desktop session; the live item is 4.70 on `to-do-items.json`.
