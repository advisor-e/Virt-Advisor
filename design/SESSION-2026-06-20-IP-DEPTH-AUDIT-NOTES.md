# Session 2026-06-20 — IP DEPTH AUDIT (findings + corrected conclusions)

> Read-cold record of the IP depth audit run on 2026-06-20 (priority set in
> `SESSION-2026-06-19-WINWORK-EOY-NOTES.md` §6). **Goal:** find where the firm's source IP is
> under-served by thin/stale JSON conversions (the EOY pattern — a JSON exists but shortchanges
> the PDF's real method).
>
> **Branch:** `feat/win-work-redirect` (unchanged; not merged). **No `data/*.json` was changed.**
>
> ⚠ **This doc was rewritten mid-session after a methodology error was caught (see §1.1). An
> earlier version of this file asserted two gaps — People Power and get_seminar — that turned out
> to be WRONG. Those are corrected below. If you are reading an older copy, trust THIS one.**

---

## 0. Anchors (Mike, 2026-06-20)
1. **The PDFs in `Logic Tables/` and `Domain Support/` are the CURRENT, authoritative IP.** A
   gap between PDF and JSON means the JSON is stale — fold the PDF in.
2. **Repetition across domains is a FEATURE, not redundancy.** The engine loads only the *active
   domain's* content into the AI's context. So IP being associated with every domain where it's
   useful makes it *more contextually available* — that's good coaching. The ONLY downside is
   **drift** if the same content is hand-copied into divergent copies. ⇒ Rule: **associate IP with
   every domain that needs it, but SINGLE-SOURCE it so copies can't drift** (the existing
   `single-source-wiring` pattern). See memory `north_star_vision`, `feedback-design-philosophy`.
3. **Don't gold-plate the audit.** A full per-domain re-read of all 14 = days of subjective
   "could-also-include" suggestions, not real defects. Bound the work to (a) the genuinely-missing
   short list and (b) single-sourcing shared methods; let the **live case-study feedback loop**
   surface the rest (guide-not-predict).

---

## 1. Method (reproducible)
PDFs extracted to text with `pdftotext -layout` into a scratch folder **outside the repo**
(`e:/Visual Code Projects/ip_audit_scratch/`; helper scripts `concept_check.js` + `verify.js`).
Provenance map: each tree's `source_pdf`/`source_support` (42 trees) → its JSON
(`logic_trees.json` node + `*-reference.json` for learn trees via `LEARN_REFERENCE_FORMATTERS` in
`server/utils/logicTrees.js` + `*-domain-support.json`). Two screens: a PDF-vs-JSON word-count
ratio, and a **named-concept coverage** check (distinctive TitleCase/quoted methods in the PDF
that are absent from the JSON). Every candidate was read-verified against the PDF text + the JSON.

### 1.1 The methodology error (caught + corrected)
The first concept pass compared each tree only against **its own** mapped JSON. That falsely
flagged IP that lives in a **sibling** file. Two "gaps" collapsed on re-check:
- **People Power** — its situation→template matrix (Contrast Models, Force Field Analysis, De Bono
  6 Hats, Turnaround Behaviours, Hiring Winners, Remuneration & Incentives, People vs Process…) is
  **encoded in the live `staff_performance` tree** (the "Performance vs People/Culture" split).
  NOT a gap; correct domain association.
- **get_seminar** — most flagged methods (Universals, Truisms, the park board, Master of
  Ceremonies) live in the **sibling `powerful-seminars.json`** (the live `public_speaking` learn
  tree). NOT missing.

**Fix:** the screen now checks each PDF concept against the **union of ALL `data/*.json`**, so
"present somewhere" isn't mistaken for "missing." **Two known blind spots remain:** (a) it misses
slash/punctuation-separated names — it did NOT catch "Content / Why / Remember" (found by hand);
(b) it over-flags two-column Logic-Table PDF fragments ("Blank Ensure", "Day Prioritize Month").
So the list below is best-effort screen + reading, not a cast-iron guarantee. It also confirmed the
screen over-flags **wording variants**: the `eoy_meeting` flags ("Bob the Chocolate", "EOY Rural",
volatility) are content the 06-19 upgrade already added — EOY is fine.

---

## 2. Headline
Coverage is broad and the depth is mostly sound. After correcting for sibling-file placement and
table noise, the genuinely-missing-from-everywhere list is **short and modest**, concentrated in
**dormant specialist trees**. The core live advisor domains (governance, staff, systems, risk,
succession, profit, sales-process, due-diligence) carry their IP and need no fix. Of the live
learn trees, only **`ratio_analysis`** has a real (modest) gap; **EOY is confirmed healthy**. This
validates Mike's call that exhaustive extra work would not pay off.

---

## 3. The genuinely-missing-from-the-entire-corpus list (verified)
Distinct IP absent from ALL `data/*.json` — not filed elsewhere, not table noise, not a wording
variant.

### Live (advisor-facing now)
| # | Tree | Missing IP | Severity |
|---|---|---|---|
| 1 | **ratio_analysis** (learn) | reference carries the *approach* (Common Size, confirmation-bias framing) but **does not name the actual ratios** — Debtors Days, Return on Equity, Quick/Current Ratio, Gearing, Activity Ratios — nor the **Normalization** method | **modest, real** |
| 2 | **dashboard_discussions** (learn) | one tactical label ("Tactical Process Improvements") + the physical layout cues (Green Box / Top Banner / Action Plan Reminder). Tactical taxonomy itself IS in-file | minor |

### Dormant (correct-and-ready-when-wired; modest named tools)
| # | Tree | Missing IP |
|---|---|---|
| 3 | **get_seminar** | "Content / Why / Remember" presenter framework; "Story Anchors"; the seminar Common Q&A pairs |
| 4 | **raising_capital** | the VC outreach 6-step process (Warm Introduction → Pitch Deck Submission → Initial Screen → Second Meeting → Deal Structuring) |
| 5 | **fm_coach_culture** | "Flipping the Learning" method; "The Platinum HR" tool |
| 6 | **valuation** | method-selection labels (Discretionary / Future Passive Earnings) |
| 7 | **org_leadership** | the "Conduct & Effect" matrix |
| 8 | **org_firm_board_pack** | risk treatment (Avoid/Reduce/Transfer); the Accountability Boardpack table |
| 9 | **org_ca_firm_strategy** | the CPD Table |

### Not gaps (verified present / noise — do NOT action)
People Power (in `staff_performance`); get_seminar's Universals/Truisms/park-board/MoC (in
`powerful-seminars.json`); stock_purchasing's Weighted Average model (present in corpus);
get_sales_tracker / get_pricing_proposals (table-fragment noise); EOY (upgrade already landed).

---

## 4. Recommended action (Mike: don't gold-plate)
1. **Act on #1 (`ratio_analysis`) only, for live quality** — name the ratios + Normalization in its
   reference. EOY-style targeted fold-in, approval-gated, drawn only from `Ratio Analysis Supt.pdf`.
2. **Single-source any shared method** rather than hand-copying (so repetition across domains can't
   drift) — the structural lever; ties to `single-source-wiring`.
3. **Leave the dormant items (#3–#9) until the 28-dormant-trees decision** (ACTIONS P2) says
   whether those trees go live; fold their IP in at the same time if so. Low value before then.
4. **Let the case-study feedback loop find the long tail** — real sessions where the AI lacked IP
   are a better signal than reading PDFs (`feedback-design-philosophy`, `content_feedback_loop`).

---

## 4a. Fold-ins EXECUTED 2026-06-20 (Mike: "make all fixes")
All transcribed faithfully from the source PDFs (no invented IP); structure-preserving. **421/421
tests pass, lint 0 errors, all 8 JSON valid, formatter renders.** NOT committed (awaiting Mike).

| Item | File(s) changed | What was added |
|---|---|---|
| ratio_analysis (LIVE) | `ratio-analysis-reference.json` + `server/utils/logicTrees.js` | `ratio_categories` (Activity/Profitability/Liquidity/Leverage; Debtors Days, Gross Margin, ROE = Net Profit/Total Equity, ROA = (Net Profit+Bank Interest+Finance Interest)/Total Assets) + "Data Normalization" label + a new formatter block to render it |
| dashboard_discussions (LIVE) | — | **No change** — discussion flow already present; remaining flags were noise / physical-template cues |
| get_seminar | `get-seminar-domain-support.json` | "Content / Why / Remember" presenter framework + M.O.C; "Story Anchors" term |
| raising_capital | `raising-capital-domain-support.json` | `investor_outreach_process` — the 6-step VC outreach (Warm Introduction → Pitch Deck Submission → Initial Screen → First Meeting → Second Meeting → Deal Structuring) |
| fm_coach_culture | `fm-coach-culture-domain-support.json` | `visible_learning_culture` — Flipping the Learning (closed loop) + the Platinum HR loop (Golden Hr, Platinum Case Study Format, VISIBLE Learning Culture Feedback Model, Review) |
| valuation | `valuation-domain-support.json` | method names: Owner's Discretionary Earnings (EBPITDA) / Future Maintainable Earnings (EBITDA) on the existing earnings measures |
| org_leadership | `org-leadership-domain-support.json` | `conduct_and_effect_matrix` — Boardroom Manipulation Tactics, Yellow Card, Bonus Points System (+ demerit cross-ref) |
| org_firm_board_pack | `org-board-pack-domain-support.json` | `risk_treatment_strategies` (Accept/Avoid/Reduce/Transfer) + `board_accountability_signoff` (Boardpack Table "Read and Understood") |
| org_ca_firm_strategy | `org-firm-strategy-domain-support.json` | new tool: Global Actions Report + CPD Log (CPD Table), Weekly Golden Hr |

**Note on dormant items (#3–#9 here):** the content is now correct and ready, but these trees are
still DORMANT — the fold-ins only reach the AI once those trees are wired live (the 28-dormant-trees
decision, ACTIONS P2). The one LIVE fix (ratio_analysis) is reachable now via the learn path.

## 5. Related
- Priority + method origin: `SESSION-2026-06-19-WINWORK-EOY-NOTES.md` §5–6.
- `ACTIONS.md`. Memory: `content_pipeline_architecture`, `feedback-never-invent-firm-ip`,
  `feedback-no-silent-parking`, `feedback-design-philosophy`, the 28-dormant-trees decision.
- **Doc-accuracy note (surfaced 06-20):** `STACK-RECONCILIATION-PLAN.md`'s status header still
  reads "PLAN — install not yet executed," but the reconciliation was executed + merged to
  `master` (06-12/06-16 per ACTIONS.md). Header is stale; left for Mike to decide.
