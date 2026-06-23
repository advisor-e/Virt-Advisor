# Logic-tree JSON vs source-PDF fidelity sweep — 2026-06-23

> **Why:** this session wired 7 "Get the Job" trees into Learn mode and built a valuation
> soft-hint, with content claims ("full of real IP", "spot on") based on the **JSON**, not the
> **source PDFs**. Mike challenged whether those claims — like the now-retracted DD harvest —
> rested on not having read the PDFs. This sweep checks every wired tree's JSON against its
> `Logic Tables/*.pdf` source. **Verification only — no fixes made tonight.**

## Result: 6 faithful, 1 enrichment-discrepancy, 1 unsupported-by-its-PDF

| Tree | Source PDF | Verdict | Detail |
|---|---|---|---|
| `get_marketing` | Get marketing logic.pdf | ✅ FAITHFUL | 5 branches, IF/THEN/templates all match |
| `get_sales_tracker` | Get Sales Tracker Logic.pdf | ✅ FAITHFUL | 6 branches; only trivial "(1)" markers dropped; `Get.1a.Sales Tracker` = provenance tag |
| `get_team_problem` | Get Team Problem Logic.pdf | ✅ FAITHFUL | 6 branches; Paper/Spaghetti Tower templates match; one illustrative quote summarised |
| `get_pricing_proposals` | Get Advisory Pricing & Proposal Logic.pdf | ✅ FAITHFUL | 4 branches; Advisory Pricing Model/Proposal match; one "(e.g. …)" example dropped |
| `get_seminar` | Get Seminar Logic.pdf | ✅ FAITHFUL | 7 situations 1:1 + a synthetic router node; "use X template" lines are app-layer (not in PDF) but benign |
| `org_leadership` | Org. Leadership Logic.pdf | ✅ FAITHFUL | 7 branches 1:1 + router node; every framework/figure/threshold preserved; only benign notes gloss |
| `get_positioning` | Get Positioning Logic.pdf | ⚠️ **DISCREPANCY** | 4 branches' IF/THEN/Notes faithful, BUT JSON **appends 5 template names absent from the PDF** |
| `valuation` | Valuation Logic.pdf | ⚠️⚠️ **UNSUPPORTED BY ITS PDF** | PDF rules preserved in `notes`, but the whole tree skeleton + all template names are NOT in the PDF |

## ⚠️ `get_positioning` — fabricated template mappings (logic itself is faithful)

The PDF is a 4-row IF/THEN/Notes table with **no template column**. The JSON's 4 branches match the logic faithfully, but add these **5 template recommendations the PDF does not contain**:
- gp_1 → `Business Assessment Report`
- gp_2 → `Revenue Model (What-if Analysis)`, `Agenda & Notes`
- gp_3 → `Dashboard Discussions`, `Management Reporting Annual Plan (Advisory Board Plan)`

**Impact:** these are now surfaced in Learn-mode positioning coaching (via this session's `mode:'learn'` wiring + `formatFlatBranch`). The mappings are unsourced — they may be reasonable, but they are not in the firm's positioning PDF. **Decision for Mike:** keep (confirm they're his intended mappings) or strip the `templates` arrays back to what the source supports.

## ⚠️⚠️ `valuation` — the tree skeleton + template names are not in the source PDF

`Valuation Logic.pdf` is a **flat 13-row IF/THEN table about valuation *methodology***: EBPITDA (hands-on/Owner's Discretionary Earnings) vs EBITDA (passive/Future Maintainable Earnings); goodwill payback <3/3–5/>5yr = Good/Normal/Be Careful; the benchmark double-count trap; perishable stock %, WIP written-acceptance; intangible transferability; stakeholder/staff dependency; lease reinstatement; performance variance.

**The JSON faithfully preserves all 13 rules inside its `notes` fields.** But everything that makes it a *tree* is NOT in the PDF:
- The **pre-assessment gate + seller / buyer / exit-prep / MBO 4-way routing** — none of this is in the PDF.
- The **6-step seller methodology** (adjusted net profit → Add Backs → super profit → 3-point sensitivities → range), serviceability calcs, MBO/BIMBO/Newco branch — not in the PDF.
- **All terminal template names** — `Business Sale Assessment 1`, `Sale Assessment Model 2`, `Sale Assessment Report 3`, `EBITDA` — the PDF names **no templates at all**.

### Why this matters to THIS session

This session's **valuation soft-hint** (commit `327f592`) relies on the tree routing a SELL case to those Sale-side templates. That routing + those names are exactly the unsourced part.
- The soft-hint **code is correct plumbing**, and the boosted names **are real `templates.json` titles** (the name-trace held).
- What is **unverified** is whether the valuation tree's sell/buy structure + Sale-tool mapping is **legitimate firm IP from another source**, or was **invented when the JSON was authored** (old bulk-import era, pre-dates this session). `Valuation Logic.pdf` cannot confirm it.

**Decision for Mike (provenance):** Is the valuation tree's seller/buyer/exit/MBO structure + the Sale Assessment template mapping your real IP (from a source other than this PDF), or does it need rebuilding from an authoritative source? Until confirmed, treat the valuation soft-hint result as **resting on unverified tree data**, not as proven from source.

## What this sweep does NOT change

- The **6 faithful trees** are wired on real, sourced content — those content claims hold.
- The **wiring/mechanism code** (`formatFlatBranch`, `isClientDeliveryLearnTree`, the soft-hint boost) is sound regardless — it surfaces whatever the JSON holds. The issues here are **data provenance** in two tree JSONs, not engine bugs.
- The DD assessment (separate file) already corrected.

## Method note (the lesson, applied)

Verified by reading each **source PDF** against the **JSON the engine actually uses** — not the JSON alone. Faithful extraction was the norm (6/8), but two trees carry JSON-author additions the source doesn't support. Going forward: a tree's content claim must be checked against its PDF, not its JSON shadow.
