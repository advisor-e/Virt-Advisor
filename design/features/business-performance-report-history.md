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
| Industry context | The Economic & Industry Outlook page reuses the forecast's economic analysis for sourced narrative; no invented medians | 2026-09-07, from Mike's pointer to the forecast feature |
| The Business Health Score | The banded-measures count out of 100, Piotroski F-score cited on the page; Altman Z' considered, left as a possible later line | 2026-09-07, Mike: "i like it and it appears sound… lets site it" |
| Industry benchmarks | From the Stats NZ Business Performance Benchmarker held in the app; industry finder + size dropdown with each band's turnover range; the prompt keeps five sections (a sixth section was approved and superseded within the hour on Stats NZ's own documentation) | 2026-09-07, Mike, "yes" — with his addition of the advisor field and the size-band headers |
| Inventory | An inventory-export reader is a stage of this project, not later work | 2026-09-07, Mike: "just make building an inventory reader part of the project - a seperate stage if needed" |
| Next steps | Advisor-written first; AI draft a later stage with its own privacy ruling | 2026-09-07, Mike, "yes" |
| The look | The first drawing (portrait, half-empty, its own palette) was rejected: *"The one provided is full and complete, rich in colour and completes the page - why did you avoid following the example?"* Redrawn the same day landscape, slide for slide against the deck, in the brand palette, with a logo place; a disclaimer page added on his instruction | 2026-09-07, Mike |
| Both drawings approved to build from | The client's report (second drawing) and the advisor's six input steps | 2026-09-07, Mike, "yes" to *"Do you approve both drawings to build from, so I start stage one"* |
| The route never serves the sample | `POST /api/report/dashboard-reports` computes only what it is given; an absent, empty or non-object body returns empty blocks. Found driving it live: Restify hands `{}` for an empty body and the first cut answered `undefined` with the workbook sample, which a page could have mistaken for a client's figures. The unit test had used `undefined` and passed | 2026-09-07, found and fixed the same hour; recorded as the reason the model's defaults stay out of the route |
| Inventory reader's target layouts | Cin7 Core (12 columns) and Unleashed (11 columns), neither with dates — expected layouts until real files are read; one internal record, two column maps | 2026-09-07, Mike, pasted both layouts with four-row samples and Cin7's parsing characteristics |
| The wording | The six step names, every field label on the intake drawing, the score band words "Good" / "Steady" / "At risk", and the seven-paragraph Important Information page — all as drawn | 2026-09-08, Mike, one "yes" to *"Shall I build stage 2 with the wording exactly as drawn?"* |
| The route | `/dashboard-reports`, the catalogue's own name — `/business-performance-report` was found to be the Working Capital Cycle's page (its component is even called `BusinessPerformanceReport.vue`) | 2026-09-08, found at build time |
| The score counts what is banded | Six measures today, not eight: only the trend read's drivers carry firm thresholds, and inventing two more would put a verdict on a client's page that nobody ruled. The page prints the count. Two thresholds on the trend-thresholds page make it eight with no code change | 2026-09-08, build-time judgement under P3 and P10; flagged to Mike |
| The band cut-offs are provisional | Good from 75, Steady from 50, else At risk — one constant, `SCORE_BANDS`, for Mike to move | 2026-09-08, flagged to Mike |
| The Outlook page is deferred | Research text lives two hours in memory and only inside the forecast page's own state; the components that run it are active on the laptop under 4.66 | 2026-09-08, stage boundary stated in the Brief §4 |
| Eight through the thresholds page | The score stays a count of what is banded; current ratio and debt-to-equity get two rows on the trend-thresholds page so the firm sets the lines, and the score counts eight once they are set | 2026-09-08, Mike, "yes" to *"two new threshold rows on the trend-thresholds page, and the score counts eight once they are set?"* |
| The band cut-offs | Good from 75, Steady from 50, else At risk — approved as built | 2026-09-08, Mike, "yes" to *"Do you approve 75 and 50 as the band lines?"* |
| The optional pages, replaced | The Eight Levers, Debtor Drag and Valuation had been offered because a model existed. Mike: *"perhaps we're trying to take educational models or, in the case of valuation, very specific models requiring acute understanding of decision drivers, and forcing them into our model for the sake of it … what else would a quality report require — even if we have to develop a model — to support what we're doing — not just 'what have we got lying around that we can shove into this model'."* Replaced by *Why profit changed*, *Where the cash went* and *What moves profit*, each a small new model on the accounts alone | 2026-09-08, Mike, "yes" to drawing the three; the three models stay as Model Library screens |
| Stock against the accounts | A fourth optional page reading the Cin7 Core or Unleashed export against the balance sheet and the cash page, offered only once a stock export is dropped in and built after the stage 4 reader. His addition: *"the option to drop in inventory reports and have them analysed against the financials could also be an option — IN ADDITION"* | 2026-09-08, Mike, "yes" |
| The four pages, drawn | [`../mockups/business-performance-report-optional-pages.html`](../mockups/business-performance-report-optional-pages.html), in the approved report's own style sheet, pages 11–14; the memo names one thing to rule — all four beside the Outlook page make sixteen pages against his cap of fifteen | 2026-09-08, Mike, "yes - good work!" to *"Do you approve this drawing to build from?"* |
| Slice 1 built — the two threshold rows | `SCORE_MEASURES` beside the six in `trendModel.js`; `bandLevel` reads a direction, so current ratio (higher is better) bands green at or above its first figure; the validator refuses a pair the wrong way round for the measure; two rows on the trend-thresholds page labelled *Current ratio* and *Debt to equity*; the report reads the eight and the score counts what is banded. The two ship EMPTY in `data/forecast-trend-thresholds.json` — the figures are Mike's to give — so the score still counts six until he types them. The forecast's own trend page is untouched: `computeTrend` reads the six unless a caller passes more | 2026-09-08, built after his "yes" to the slice; the page not yet eyeballed |
| Current ratio thresholds | Green at or above 1.5, amber at or above 1.0, red below — the lender's classic lines, and 1.5 is the healthy mark the approved drawing already prints | 2026-09-08, Mike, "yes" to *"Shall I set current ratio to 1.5 and 1.0?"* |
| Debt to equity thresholds | Green up to 1.0, amber up to 2.0, red above, on TOTAL liabilities (suppliers included) over equity — the definition the two exports can carry. At 1.0 the owners fund half of what the business holds, at 2.0 a third | 2026-09-08, Mike, "yes" to *"Shall I set debt to equity to 1.0 and 2.0?"* — the score now counts eight for every client |
| Slice 2 built — the three accounts-only pages | *Why profit changed*, *Where the cash went* and *What moves profit*, each on a small model of its own with the arithmetic worked by hand; the dropdown offers a page only when its model produced figures. Five deviations from the drawing, all in the Brief §4 (k–o); the largest is that no sentence on the three pages is typed | 2026-09-08, built after his "yes" to the slice; rendered from the test figures and eyeballed; not yet opened in the production build |

---

## 3. Where the raw material is

- The drawings: [`../mockups/business-performance-report.html`](../mockups/business-performance-report.html)
  (the client's report) and [`../mockups/business-performance-report-intake.html`](../mockups/business-performance-report-intake.html)
  (the advisor's six input steps, asked for by Mike the same day: *"the report you've given me is
  what comes AFTER an advisor completes the data input fields - we need a mock up of what that
  input page will look like"*).
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
