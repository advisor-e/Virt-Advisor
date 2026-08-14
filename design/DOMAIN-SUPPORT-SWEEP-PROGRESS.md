# Domain-Support Authored-Commentary Sweep — progress record

> **What this is.** The running record of item 4.6 in
> [`features/to-do.md`](features/to-do.md) — reading all 29 domains' rows against the source
> documents they were transcribed from, and marking the clauses that turn out to be ours.
> The rules are [`features/domain-support-provenance.md`](features/domain-support-provenance.md);
> the failed-detector history is
> [`features/domain-support-provenance-history.md`](features/domain-support-provenance-history.md).
>
> **Status 2026-08-14: 19 of 29 domains read, 104 of 194 materials. No marks written yet.**
> The owner ruled that the whole read completes first and the marks go in as one batch, because
> the sweep is beta-stage detail and must not hold up a UAT release.

---

## 1 · Scope decision — marks go in `steps` only

All nine Strategy marks sit in `steps`. **None** is in `summary` or `who_when`, and those two
fields are our own descriptive rewriting of each source's "Benefits" block in *every* domain. If
they were in scope, every row in the app would carry a mark, which is not what was ruled.

## 2 · Method

The working scripts lived in a session scratchpad and are **not** kept here — they are a few
dozen lines each and cheaper to rewrite than to maintain. What matters is the method, which is
recorded precisely enough to rebuild:

1. **Build the corpus.** `pdftotext -layout` over all 115 PDFs in the repo
   (`Domain Support/`, `Logic Tables/`, `Central Frameworks/`, `Course Builder Quiz/`). All 115
   convert cleanly; none is image-only. **These 115 files ARE the "115 firm documents"** the
   original Strategy marks were checked against, so the phrase in a mark's `searched` field is
   reproducible rather than rhetorical.
2. **Section the sources.** Every firm document shares one shape — a title line, then
   `Benefits`, then a step header (about fourteen different wordings of "Step-by-Step…" or
   "How to use the material in practice"), then numbered steps. **A section starts at the
   non-empty line above each `Benefits` line.** This finds each material's true source without
   ever looking at a filename.
3. **Read clause by clause.** Split each step where a rationale tail gets welded on — a spaced
   em-dash, `rather than`, `instead of`, `which is what`, `, so`, `, which`, `, because` — and
   for each clause find the firm's best-matching sentence anywhere in the 115 documents. Print
   the two together and read them side by side.

**Validation:** run against Strategy, this re-finds all nine known marks and correctly identifies
every source document.

### ⚠ Two traps, both paid for once

**The score is not a verdict — and this is now measured, not assumed.** The nine known marks
score anywhere from 25% to 75% support, and **61 clauses that are not marks fall inside that
same band.** No threshold separates them. The judgement only comes from reading the firm's
actual sentence beside the clause. This is the fourth independent confirmation of the finding in
the provenance history.

**`grep -E "a\|b"` treats `\|` as a literal pipe, not alternation.** Two "this appears nowhere
in the 115 documents" results were produced this way and both were wrong — *"3-ton loads"* and
the guilt clause are the firm's own words. **Under `-E` use `|`, never `\|`, and re-run any
zero-match result before believing it.**

---

## 3 · Domains read — 19 of 29

| Domain | Materials | Result |
| --- | --- | --- |
| get-seminar | 16 | clean |
| sales-marketing | 19 | **1 mark** |
| get-sales | 6 | clean (2 low-confidence) |
| forecasting | 5 | 2 candidates |
| get-sales-tracker | 5 | clean (2 low-confidence) |
| eoy | 4 | clean |
| data-systems | 4 | 2 candidates |
| profit | 4 | clean |
| get-positioning | 4 | clean |
| get-pricing-proposals | 4 | clean |
| staff | 4 | clean |
| strategy — the 4 rows never swept | 4 | clean |
| due-diligence | 3 | clean |
| get-team-problem | 3 | clean |
| governance | 3 | clean |
| conflict | 2 | clean |
| risk | 2 | clean |
| valuation | 2 | clean |
| stock-purchasing | 1 | clean |

⚠ **Strategy was never finished.** The 2026-08-14 sweep covered only the **9 rows sourced from
`Strategic Planning Support.pdf`**. Its other four materials — Revealing the Growth Curve, The
Heald Matrix, Capacity Capability Opportunity, Client Planning Framework — come from four
*different* documents and had never been read. They are read now and are clean.

### The one confirmed mark

`sales-marketing-powerful-seminars` step 16 — **"not a pitch"**.

`Powerful Seminars.pdf` carries *"(Your invitation for them to take up your service should feel
like you're inviting good friends to a special dinner)"* and, separately, *"Make sure the call to
action is clear."* The contrastive tail is ours; the phrase returns zero matches across all 115
documents. Same shape as the already-marked Strategy clause *"rather than staged ones"*.

### Candidates — read but not resolved

| Where | Clause | Note |
| --- | --- | --- |
| `data-systems-deming-s-theory-of-volatility` s6 | "Treating coincidence as causation is the most common form of tampering" | 🔴 **The serious one.** A *factual claim about a named framework* — Deming's four volatility causes. The source defines Tampering only as "data misinterpretation and an inappropriate response to that data". **P5: a claim like this is never ours to author.** A different and more serious class than a rationale tail. |
| `forecasting-the-3-pillars-of-financial-management` s2 | "a weakness here caps everything above it" | no support found |
| `forecasting-the-client-progression…` s5 | "missing the joy that comes from learning" | "joy" appears nowhere in the 115 documents |
| `data-systems-deming-s-theory-of-volatility` s7 | "nobody ever learns what the right decision would have been" | no support found |
| `data-systems-common-size-trend-analysis-template` s6 | "one who receives a completed report does not" | the first half IS supported — "take ownership of our understanding" — the contrast is ours |
| `get-sales-presentation-prompts` s1 | "a proposal built on stale facts dies in the room" | stylistic, low confidence |
| `get-sales-decision-tree-sales-structure` s3 | "nobody feels channelled and the next conversation stays open" | stylistic, low confidence |

### Cleared on checking — do NOT re-hunt

Each of these looked authored and is in fact the firm's own wording:

- `valuation` — *"the buyer is buying a job"* is verbatim in `Valuation support.pdf` Q&A and in
  `Valuation Logic.pdf`.
- `get-positioning` — *"a 3-ton load"* is the firm's phrase for high-impact events and internal fraud.
- `conflict` — *"lessens guilt … let it linger"* is almost word for word in `Conflict Support.pdf`.
- `stock-purchasing` — *"singular by nature"* and the peak-season caution are both verbatim Q&A.
- `staff` — the financial-bonus note is a verbatim source aside.
- `governance` — *"the counter-argument, proving the risks were considered"* is source step 7.
- `data-systems` — the Christmas-ham and AC/DC examples are both the firm's own.

---

## 4 · Why the rate is far below the 150–200 estimate

The estimate came from Strategy, whose source gives **terse steps with sub-bullets** — 4 source
steps became 9 of ours. Expanding a terse step is exactly where a "why it matters" tail gets
welded on.

Most other domains are transcribed from documents whose steps are **already full prose**
(`Get the Job Content.supt`, `EOY Support`, `Sales & Marketing Support`, `Get Sales Tracker
Support`). There was nothing to expand, so the transcription is near-verbatim and adds nothing.

**The habit tracks the shape of the source document, not the transcriber.** On 104 materials the
running rate is 1 confirmed plus 7 candidates, against roughly 80 predicted pro-rata.

⚠ **The 150–200 figure should now be treated as withdrawn, not merely unproven.** It rested on
one domain of twenty-nine, and eighteen further domains have not reproduced it.

---

## 5 · Still to read — 10 domains, 90 materials

people-power (26) · fm-coach-culture (20) · org-board-pack (11) · get-marketing (7) ·
org-firm-strategy (6) · raising-capital (6) · succession (4) · systems (4) ·
org-capacity-planner (3) · org-leadership (3)

🔴 **A separate and possibly larger finding, measured but not investigated.** **20 rows match no
source document at all** — under 6% overlap with any of the 115 documents — and they are
concentrated in exactly the three domains still to read:

- `people-power` — business-clock-vs-body-clock, cafe-turnaround-behaviours, ge-smart-fast-goals,
  l-suppt-alignment, leadership-review, productive-habits-doc, remuneration-incentives, team-survey
- `fm-coach-culture` — group-coaching-programme, applicant-screening-and-competency-based-recruitment,
  fee-estimate-and-job-creep-management, centre-of-influence-coi-engagement-framework
- `org-board-pack` — meeting-minutes, white-paper-program, deming-s-volatility-principles-in-governance
- `sales-marketing` — customer-type-table, sparketing-friction-review, branding-review,
  customer-loyalty-programme, pricing *(these five carry **no steps at all** — they are index rows,
  which is the already-known and deliberate `sales-marketing` gap, not a defect)*

Two of the Board Pack rows were already flagged in
[`DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](DOMAIN-SUPPORT-REVIEW-CHECKLIST.md) as unsourced. **These
must not be read as commentary marks — the question there is whether a source exists at all**,
which is a different question with a different answer.

---

## 6 · Two findings that are not commentary — each needs an owner decision

1. **`get-seminar-blank-platform-template` step 5 silently renumbers** the source's
   *"Stage 2 (Call to Action & Close)"* to *"Stage 4"*. The source itself runs 1, 1, 2, 3, 2, so
   this is almost certainly a correction of a typo — but it is an **undeclared edit to the firm's
   material**, and nothing records that we made it.
2. **`forecasting-cash-tactics…` step 4 softens the firm's own instruction.** The source says
   *"If they refuse, **fire them as a client**."* Ours says *"stop acting for them."* A
   deliberate tone change, also unrecorded.

Neither is a commentary mark and neither belongs in `authored_commentary`. Both are the same
family as the marking problem — a change to the firm's words with nothing saying we made it.
