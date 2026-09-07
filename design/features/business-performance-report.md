# Business Performance Report — the Brief

> **Status: ⏳ DESIGNED, NOT BUILT — 2026-09-07.** Item **4.70**. The drawing is
> [`../mockups/business-performance-report.html`](../mockups/business-performance-report.html),
> registered in [`../ARTEFACTS.md`](../ARTEFACTS.md). **The four rulings it needed were all given
> by Mike on 2026-09-07 (§3)**; the drawing itself still waits on his approval to build from.
> **Nothing below is running code.** Mike's request, in his words:
>
> > *"develop a rich, colourful, and easy to understand business performance report to be read
> > and understood by private business owners. The report needs to be 7-10 pages (pages can be
> > added via droptab request by adviosor) and include engaging graphics. The report should
> > include a contents table, an executive summary with graphics, a summary financial dashboard
> > - it should have room for data extracted from P&L, Balance Sheet and Inventory reports and
> > anything else you consider best practice or useful."* — 2026-09-07, after *"lets get started
> > on the dashboard reports"*. Same day: *"if the pages are colourful, engaging and enlightening
> > the report can go up to 15 pages all told. make the base report between 7-10 with options to
> > add the others if the content supports it."*
>
> **Covers:** the client-facing report, its pages, where each figure comes from, and the rules
> that keep it honest. **Does not cover:** the model screens themselves
> ([`report-models.md`](report-models.md)), the client's access to them
> ([`business-entity-reports.md`](business-entity-reports.md)), or the economic analysis engine
> (`report-models.md` §4, item 4.66).
> **History:** [`business-performance-report-history.md`](business-performance-report-history.md).

---

## 1. Design philosophy

**This is a document a business owner reads on paper, not a screen an advisor drives.** Every
other model in this section is a teaching instrument the advisor works in front of a client.
This one is the thing the client takes away, reads at the kitchen table, and shows the bank. So
the test of every page is the owner's, not the advisor's: *can I read this number, do I know
where it came from, and do I know what it means for me?*

Three consequences follow. **Every figure is read in words beside it** — a ratio without its
sentence is a number, not a finding. **Every figure says where it came from** — the accounts,
the advisor, or approved research — because a client acts on this and a lender reads it.
**The page count is the owner's attention span**, not the size of the workbook: seven to ten
base pages, and a page is only added when there is something real to put on it.

---

## 2. Key principles — the non-negotiables

**P1 · Seven to ten base pages; up to fifteen in all; an optional page is offered only where
the figures behind it exist** (Mike, 2026-09-07). The advisor adds pages from a dropdown. A page
whose data is absent is not offered, so the dropdown can never add an empty page. Ignore this and
the report grows back into the sixty-chart workbook nobody reads.

**P2 · No figure without provenance.** Every number carries one of three marks: *from your
accounts* (read from a file), *entered by your advisor* (typed), or *AI research, approved*
(the economic analysis, on its recorded approval). The badge is `ProvenanceBadge`, the same
component the model screens use. A client who cannot tell a typed figure from a read one cannot
tell a judgement from a fact.

**P3 · Nothing is invented to fill a box the deck has.** The deck shows a Business Health Score,
industry medians, inventory ageing and three next steps. Where no source or rule exists, the
page says so and shows no number (§3). A plausible figure in a client report is worse than a
gap, because it looks exactly like the figures around it.

**P4 · The maths is the workbook's and the drivers', ported and pinned, backend only.** The
ratio hub is `Dashboard Reports_.xlsx`, sheet *API Data*; the cash page is the seven cash
drivers with their stated formulas; six of the seven are already computed by the trend read
(`server/report/trendModel.js`). Every ported figure is pinned to the workbook's own cached
value with its cell reference, as every other model here is. The workbook's own quirks are
ported faithfully and recorded, never silently corrected (§3).

**P5 · Colour means something or it is not used.** Green, amber and red on a ratio follow the
firm's thresholds — the same ones the trend read bands on — never a designer's eye. A colour
with no rule behind it is decoration that a client will read as a verdict.

**P6 · The look is Mike's deck, slide for slide, in the brand palette** (Mike, 2026-09-07:
*"apply our brand colours as provided in our rules, apply different colours as required - if
needed - leave room for the firms logo"*). Landscape 16:9, the deck's composition and density on
every page; navy, blue, cyan and sky from `utils/brandTokens.js` / `BRAND-TOKENS.md` for the
report; green, amber and red **only** where a colour signals good, caution or danger, never as
decoration; a marked place for the firm's logo on the cover and in every footer. The first
drawing was portrait and half-empty and was rejected the same day — *"whats the point of me
providing clear direction if you simply choose to ignore it"* — and it is the reason this rule
is written down. `report-models.md` P1 (every model screen identical) does not apply to a
client-read document; that is the one stated deviation.

**P11 · The report closes with an Important Information page** (Mike, 2026-09-07: *"we also need
to include a disclaimer page"*). It says what the report is and is not, where each figure comes
from, what the benchmarks and the score are, that AI research was advisor-approved, and that the
report is confidential. **Its wording is a draft until Mike rules it**, and is never regulatory
advice in itself.

**P7 · Print is the browser's, with no library.** The forecast settled this on 2026-09-06: no
PDF library runs on Node 14.15, and the browser's own dialog means a client's figures are never
sent anywhere to be rendered. One page per section, portrait, orientation set and paper size
never chosen.

**P9 · Industry benchmarks come from the Stats NZ Business Performance Benchmarker held in the
app, never from a search** (Mike, 2026-09-07). The dataset is uploaded at the mentor tier on a hub
page and replaced each release, carrying its year and Stats NZ's provisional/final and accuracy
marks. Size bands are Stats NZ's, which are *turnover quartiles per industry* — *"four even
quarters of the industry population based on the number of businesses"* — so the turnover range
that makes a business "small" differs by industry and is shown beside each band. The eight
benchmark ratios use Stats NZ's definitions, and so does the report's own copy of each, or the
comparison is not like for like. A benchmark with no dataset row is not drawn; a suppressed
value (`S`, `C`) is shown as suppressed, never as zero.

**P10 · The Business Health Score is a count, not a formula, and it says so** (Mike, 2026-09-07).
Eight banded measures, 2 for green, 1 for amber, 0 for red on the firm's thresholds, out of 100,
with the reading naming the measures that pulled it down. The page cites the Piotroski F-score as
the method's basis. A score whose parts a client cannot find on the pages is a verdict, not a
finding.

**P8 · Saved per client, through the saved-report store.** The report is a per-client, per-model
saved row like the other twelve screens (item 4.62), so it can be reissued next quarter and
opened to the client on the advisor's decision. The client's page opens it read-only; a report
is not a calculator for the client to edit.

---

## 3. Design considerations

**The four rulings, all given by Mike on 2026-09-07**, one at a time, each as the
recommendation put to him unless noted:

1. **The Business Health Score** — the banded-measures count (P10), with the Piotroski F-score
   cited on the page: *"lets site it and explain that's what determines the score - gives it more
   credibility to readers."* Band wording ("Good", "Steady", "At risk") is a placeholder to be ruled
   at build time. Altman's Z'-score was considered and left as a possible later optional line.
2. **Industry benchmarks** — from the Stats NZ Business Performance Benchmarker held in the app
   (P9), with an industry finder and a size dropdown showing each band's turnover range. Mike's
   own addition: *"you'll need to insert a field for the advisor since the stats NZ data is broken
   into different sizes per industry... the category headers so an advisor knows what seperates a
   business from being determined as micro, small, medium etc."* An earlier yes to a sixth
   research-prompt section was superseded the same hour when Stats NZ's own documentation showed
   the data is a published table with per-industry cut-offs; the prompt keeps its five sections.
   **The eight ratios Stats NZ publishes are exactly the workbook's yearly ratios, with the
   workbook's definitions** — which is why the "quirks" below exist and must be ported as they are.
3. **Inventory** — *"just make building an inventory reader part of the project - a seperate
   stage if needed."* An inventory-export reader is a stage of this project. It is marked
   `verified` only against real exports (the 4.60 rule), so real inventory files will be asked
   for when the stage starts. Until it exists the page is offered only when the advisor has typed
   the figures, badged as typed.
4. **Next steps** — advisor-written in the first build. An AI draft the advisor edits and approves
   is a later stage with its own privacy ruling before it is built; the safest shape sends only the
   eight ratios and their bands, never the client's name, figures or file.

**The inventory reader's target layouts — supplied by Mike 2026-09-07**, each *"supposed to be
the layout"*, so both are **expected** until a real export is read, exactly as 4.60 holds
QuickBooks and MYOB. One row per product in both; one internal record, two column maps:

| Field the report needs | Cin7 Core | Unleashed |
|---|---|---|
| Code, name | `SKU`, `Product Name` | `Product Code`, `Product Description` |
| Category | `Category` (+ `Brand`, `Barcode`, not needed) | `Group Name` |
| Where held | `Default Location` | `Warehouse Code` (+ `Bin Location`) |
| Units on hand / allocated / available | `OnHand`, `Allocated`, `Available` | `Qty On Hand`, `Qty Allocated`, `Qty Available` |
| Units on order | `OnOrder` | — (absent) |
| Cost per unit | `Unit Cost` | `Average Cost` |
| Value at cost | `Total Value` | `Total Cost On Hand` |
| Currency | — (absent) | `Base Currency Code` (e.g. `NZD`) |

Mike's parsing notes on Cin7, kept verbatim: *"Allocated vs. Available: Cin7 explicitly separates
reserved/allocated stock from uncommitted (Available) physical inventory. Cost Accounting: Tracks
Unit Cost alongside pre-calculated Total Value. Identifier Names: Prefers SKU and Product Name."*
And on Unleashed, likewise verbatim: *"Identifier Names: Uses Product Code and Product
Description instead of SKU/Product Name. Cost Metric: Explicitly defaults to Average Cost rather
than unit cost. Multi-Warehouse / Location: Uses Warehouse Code paired with detailed Bin Location
columns. Currency Explicit: Includes a dedicated Base Currency Code column for foreign-currency
multi-location setups."* Two consequences the reader must honour: the cost basis differs
(Cin7's unit cost, Unleashed's average cost) and the report says which it is reading; and
Unleashed's currency code is checked against the firm's currency, never assumed — a file in
another currency is refused by name rather than summed as if it were the firm's.

What the two yield: stock at cost by category (value summed by category), units on hand,
allocated and available per line, the location split, and on-order units where the file has
them. **What neither yields: any ageing or slow-moving figure, because neither carries a
date.** Stock ageing needs each package's ageing or movement report, or the advisor's typed
figures until one is read. Never derive an age from these files; a plausible ageing chart with no
date behind it is the exact fault P3 exists to prevent. Stock turnover and days on the shelf stay
computed from the accounts, not from these files, so the two sources can be checked against each
other. The reader refuses a file whose columns match neither map, by name, as the accounts readers
do.

**Stages, in build order.** (1) Ratio-hub model and golden test; route; catalogue row.
(2) The base pages from this year's and last year's Balance Sheet and P&L, the dropdown, print,
saved per client. (3) The benchmarker: dataset upload on the mentor hub, the industry finder, the
size band, the Trends comparison. (4) The inventory reader and the Inventory page. (5) Monthly and
five-year views as the readers grow. (6) The AI draft of next steps, after its privacy ruling.

**What the workbook is, read on 2026-09-07.** One data sheet holds fifteen account lines for
twelve months and five years; about seventeen ratios are computed from them, monthly and yearly;
all sixty charts on the five dashboard sheets are those ratios drawn, and three of the five sheets
are the same charts rearranged. Four side sheets ride along and are **not** this feature: *What
If* (a price/margin what-if, already the Margin · Mark-up · Break-even model), *Tax Guestimator*
(GST and company-tax provisions with New Zealand personal tax bands — a distinct tool, rates a
firm setting per `report-models.md` P10), *Manual Data Input* (sales mix, division wages, day
counts — the Sales Dashboard workbook's ground), and *Client Case Study* (a four-year comparison
table with free text). The support folder's copy of the workbook differs from the repo's only in
the Tax Guestimator's personal tax bands, updated to the newer thresholds; the repo copy is to be
replaced by it when the tax tool is filed.

**Four workbook quirks, to port as they are and record, never fix silently.** The yearly
*Current Ratio* actually computes (bank + debtors) ÷ current liabilities, which is the quick
ratio. *Stock Turn P.A* divides trading income by current assets. *Days Cover* counts debtors at
80 percent (cell D49). Monthly *Return on Equity* divides one month's profit by total equity, so
the sample shows 60–140 percent a month. Mike rules on each label when it reaches a page; until
then the page uses the deck's own definitions where the two differ, and says which.

**Why the seven cash drivers organise the cash page.** Cash Drivers gives each driver a formula
and a direction — an increase in debtors *uses* cash, an increase in creditors *releases* it.
That direction is the reading an owner needs and the deck does not carry. Six of the seven are
already the trend read's measures (sales growth, gross margin, overhead ratio, debtor, stock and
creditor days), banded on the firm's thresholds; net capital expenditure is the seventh and comes
from the two balance sheets.

**What each base page draws on.** Cover and Contents: client record, firm settings. Executive
Summary: both exports, the trend read. Financial Dashboard: the workbook's ratio hub, both
readers. Profit & Loss: the P&L export, EBITDA model for the operating-profit line. Balance
Sheet: the Balance Sheet export, Quick Position. Cash Flow & Working Capital: the seven drivers,
the trend read, Working Capital Cycle. Trends: both exports across years. Next Steps: the advisor.
Optional pages reuse a built model each: Sales Volatility, Eight Levers, Debtor Drag, Valuation,
Loan Servicing, Economic & Industry Outlook (the approved research pack, printed on
`approval.isApproved` exactly as the forecast prints it), Inventory Performance (typed until a
reader exists), Tax Provision (when the tax tool exists).

**The intake is new work whichever half comes first.** No reader today reads a Balance Sheet by
month or a five-year comparison export; the annual reader refuses five-plus figure columns on
purpose, and the by-month reader reads a P&L only. The first build reads what the readers read
now — this year's and last year's Balance Sheet and Profit and Loss — and the monthly and
five-year views follow as their own slices.

**The HOPE model feeds the outlook page's conversation, not its numbers.** It is a facilitation
deck on the economic cycle with discussion questions; it belongs with the Dashboard Discussions
reference the AI already reads, and with item 4.66.

---

## 4. For the coder

| Piece | Path |
|---|---|
| The drawing Mike rules on — the client's report | [`../mockups/business-performance-report.html`](../mockups/business-performance-report.html) |
| The drawing Mike rules on — the advisor's six input steps | [`../mockups/business-performance-report-intake.html`](../mockups/business-performance-report-intake.html) — client and industry (finder + size bands), the four exports and the confirm table, inventory, the advisor's words, pages, review / save / print. In the intake screens' own look, never the deck's: an advisor screen follows `report-models.md` P1 |
| The deck (target output) | `Support models for perf reports/Business_Performance_Report_Mockup.pptx` |
| The ratio hub workbook | `design/report-source-models/Dashboard Reports_.xlsx` (sheet *API Data*); newer copy with updated tax bands in `Support models for perf reports/` |
| The cash drivers and the outlook framing | `Support models for perf reports/Cash Drivers.pdf`, `HOPE Model.pdf` |
| Maths already built to reuse | `server/report/trendModel.js` (six drivers), `quickPositionModel.js`, `workingCapitalCycleModel.js`, `ebitdaDcfModel.js`, `volatilityModel.js` |
| Research and its approval gate | `server/routes/economicAnalysis.js`, `components/EconomicAnalysisPack.vue` |
| Provenance, glossary, print precedent | `components/base/ProvenanceBadge.vue`, `components/base/GlossaryTerm.vue`, `components/ThreeWayForecastReport.vue` (`@page`, `printStatements`) |
| Saved per client | `server/utils/savedReports.js`, `mixins/savedReport.js` |
| Planned, none exists yet | `server/report/dashboardReportsModel.js` + golden test; a report page and its page components under `report-shell`; the print stylesheet; a benchmarker data file + mentor-hub upload + industry finder (stage 3); an inventory-export reader under `server/report/intake/` (stage 4) |
| The benchmark source | Stats NZ Business Performance Benchmarker (DataInfo+; JSON download; ANZSIC06; 220 industries; turnover-quartile size bands; median and 25th/75th percentiles; accuracy categories; `S`/`C` suppression) — its own "Information about the data" is quoted in §2 P9 |

**Order of build, once the drawing is approved:** model and golden test for the ratio hub
first (`ADDING-A-REPORT.md` steps 1–2), then the route and catalogue row (`CLASS_REPORT`, no
Illustrative badge), then the pages backend-outward, then the dropdown and print, then the
saved-report wiring. The optional pages are wiring, not new maths.

**Traps.** A green suite proves nothing about a printed page — the forecast's PDF lost six
months to a sideways scroll that a mount test cannot see; open the print dialog and count. The
economic analysis prints only on the approval record, never on a screen flag. The glossary's
Buefy tooltip was dead in the app while every test passed (4.67); register the component in
`plugins/buefy.js` and look at it in a browser.

**Known state.** Drawn, not built. No route, no model, no page, no test exists for this
feature. The four rulings in §3 are given; the drawing awaits Mike's approval to build from.

---

## 5. Related briefs

- [`report-models.md`](report-models.md) — the models this report draws pages from; P1's look
  rule is deviated from here on a stated ground (§2 P6); P10's country-rule-as-setting governs
  the tax page when it exists.
- [`business-entity-reports.md`](business-entity-reports.md) — the saved-report store and the
  client's access switch this report rides on (§2 P8).
- [`model-library.md`](model-library.md) — the catalogue row *Dashboard Reports*, `CLASS_REPORT`,
  currently `STATUS_SOON`, which this feature makes ready.

---

**History:** [`business-performance-report-history.md`](business-performance-report-history.md)
