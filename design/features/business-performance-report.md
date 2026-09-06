# Business Performance Report — the Brief

> **Status: ⏳ DESIGNED, NOT BUILT — 2026-09-07.** Item **4.70**. The drawing is
> [`../mockups/business-performance-report.html`](../mockups/business-performance-report.html),
> registered in [`../ARTEFACTS.md`](../ARTEFACTS.md), and it waits on Mike's approval and four
> rulings (§3). **Nothing below is running code.** Mike's request, in his words:
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

**P6 · The look is Mike's deck, and that is a stated deviation.** `report-models.md` P1 says
every model screen looks identical. That rule was made for advisor-driven screens. This is a
client document, drawn in the deck Mike supplied. He rules on it on the mockup; if he rules the
other way, the pages take the report shell's tokens and nothing else here changes.

**P7 · Print is the browser's, with no library.** The forecast settled this on 2026-09-06: no
PDF library runs on Node 14.15, and the browser's own dialog means a client's figures are never
sent anywhere to be rendered. One page per section, portrait, orientation set and paper size
never chosen.

**P8 · Saved per client, through the saved-report store.** The report is a per-client, per-model
saved row like the other twelve screens (item 4.62), so it can be reissued next quarter and
opened to the client on the advisor's decision. The client's page opens it read-only; a report
is not a calculator for the client to edit.

---

## 3. Design considerations

**The four rulings the drawing waits on.** Each is drawn on the mockup with no number and a
*Ruling needed* mark, so the gap is visible rather than filled:

1. **The Business Health Score.** No formula exists in the deck, the workbook, Cash Drivers,
   HOPE or the app. Mike rules what it is made of, or that the panel goes.
2. **Industry benchmarks.** The deck compares four measures with an industry median. No source of
   medians exists in the app. Until one is ruled, the Trends page carries the client's own three
   years, and the Economic & Industry Outlook page carries sourced, dated context instead. A
   sixth research-prompt section asking for industry figures is possible and is Mike's call, not
   an inference.
3. **Inventory.** No reader reads an inventory report today. Inventory Performance is an optional
   page fed by figures the advisor types, badged as typed, until a reader exists. The Stock
   Purchasing workbook is its natural home when it is ported.
4. **Next steps.** Advisor-written. An AI draft is a separate decision carrying the approval
   record and the privacy rule the economic analysis settled.

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
| The drawing Mike rules on | [`../mockups/business-performance-report.html`](../mockups/business-performance-report.html) |
| The deck (target output) | `Support models for perf reports/Business_Performance_Report_Mockup.pptx` |
| The ratio hub workbook | `design/report-source-models/Dashboard Reports_.xlsx` (sheet *API Data*); newer copy with updated tax bands in `Support models for perf reports/` |
| The cash drivers and the outlook framing | `Support models for perf reports/Cash Drivers.pdf`, `HOPE Model.pdf` |
| Maths already built to reuse | `server/report/trendModel.js` (six drivers), `quickPositionModel.js`, `workingCapitalCycleModel.js`, `ebitdaDcfModel.js`, `volatilityModel.js` |
| Research and its approval gate | `server/routes/economicAnalysis.js`, `components/EconomicAnalysisPack.vue` |
| Provenance, glossary, print precedent | `components/base/ProvenanceBadge.vue`, `components/base/GlossaryTerm.vue`, `components/ThreeWayForecastReport.vue` (`@page`, `printStatements`) |
| Saved per client | `server/utils/savedReports.js`, `mixins/savedReport.js` |
| Planned, none exists yet | `server/report/dashboardReportsModel.js` + golden test; a report page and its page components under `report-shell`; the print stylesheet |

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
feature. The four rulings in §3 are open.

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
