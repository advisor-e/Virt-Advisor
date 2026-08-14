# Domain-Support Authored-Commentary Sweep — progress record

> **What this is.** The running record of item 4.6 in
> [`features/to-do.md`](features/to-do.md) — reading all 29 domains' rows against the source
> documents they were transcribed from, and marking the clauses that turn out to be ours.
> The rules are [`features/domain-support-provenance.md`](features/domain-support-provenance.md);
> the failed-detector history is
> [`features/domain-support-provenance-history.md`](features/domain-support-provenance-history.md).
>
> **Status 2026-08-14: THE READ IS COMPLETE — 29 of 29 domains, 194 of 194 materials.**
> **No marks are written yet.** The owner ruled that the whole read completes first and the marks
> go in as one batch, because the sweep is beta-stage detail and must not hold up a UAT release.
> That batch write is now the only part of 4.6 outstanding.

---

## 1 · Scope decision — marks go in `steps` only

All nine Strategy marks sit in `steps`. **None** is in `summary` or `who_when`, and those two
fields are our own descriptive rewriting of each source's "Benefits" block in *every* domain. If
they were in scope, every row in the app would carry a mark, which is not what was ruled.

## 2 · Method

The working scripts lived in a session scratchpad and are **not** kept here — they are a few
dozen lines each and cheaper to rewrite than to maintain. What matters is the method, which is
recorded precisely enough to rebuild:

1. **Build the corpus.** `pdftotext -layout` over every PDF in `Domain Support/`,
   `Logic Tables/`, `Central Frameworks/` and `Course Builder Quiz/`. All convert cleanly; none
   is image-only. **These files ARE the "firm documents"** the marks' `searched` field names, so
   the phrase is reproducible rather than rhetorical.
2. **Section the sources.** Most firm documents share one shape — a title line, then `Benefits`,
   then a step header (about fourteen wordings of "Step-by-Step…" or "How to use the material in
   practice"), then numbered steps. **A section starts at the non-empty line above each
   `Benefits` line.** This finds each material's true source without ever looking at a filename.
3. **Read clause by clause.** Split each step where a rationale tail gets welded on — a spaced
   em-dash, `rather than`, `instead of`, `which is what`, `, so`, `, which`, `, because`, `;` —
   and for each clause find the firm's best-matching sentence anywhere in the corpus. Print the
   two together and read them side by side.

**Validation:** run against Strategy, this re-finds all nine known marks and re-derives all
thirteen source mappings exactly — the nine `Strategic Planning Support.pdf` rows *and* the four
that come from four different documents.

### ⚠ Three traps, all paid for once

**The score is not a verdict — and this is measured, not assumed.** The nine known marks score
anywhere from 25% to 75% support, and **61 clauses that are not marks fall inside that same
band.** No threshold separates them. The judgement only comes from reading the firm's actual
sentence beside the clause. This is the fourth independent confirmation of the finding in the
provenance history.

**`grep -E "a\|b"` treats `\|` as a literal pipe, not alternation.** Two "this appears nowhere in
the documents" results were produced this way and both were wrong — *"3-ton loads"* and the guilt
clause are the firm's own words. **Under `-E` use `|`, never `\|`, and re-run any zero-match
result before believing it.**

**🔴 A one-directional word-overlap match silently prefers a BIG document to the true source.**
Found and fixed 2026-08-14. Scoring "what fraction of the material's words appear in this text?"
lets a long file win on bulk alone: every people-power row was being attributed to
`Coaching Content.pdf` or a quiz file, and **`People Power Suppt.pdf` — the actual source — was
never identified at all.** Two changes fix it, and both are needed:

- **Score with a symmetric measure** (Dice over distinct words), so a large text is penalised for
  everything in it that the material does *not* contain.
- **Window the documents that have no `Benefits` blocks** (Risk, Valuation, Stock Purchasing,
  Due Diligence, Sales & Marketing, Coaching Content, the quiz files) into overlapping chunks,
  so they compete as passages rather than as whole books.

After the fix the Strategy control sharpens rather than degrades: its nine rows match their own
sections at 69–82% with a wide gap to second place. **Any future rebuild must re-run the Strategy
control and check the gap, not just the winner.**

---

## 3 · All 29 domains read

| Domain | Materials | Result |
| --- | --- | --- |
| people-power | 26 | **17 candidates** |
| sales-marketing | 19 | **1 mark** (confirmed) |
| fm-coach-culture | 20 | clean on its 15 sourced rows; **5 rows have no source** |
| get-seminar | 16 | clean |
| org-board-pack | 11 | **7 candidates** |
| get-marketing | 7 | **5 candidates** |
| get-sales | 6 | clean (2 low-confidence) |
| org-firm-strategy | 6 | **5 candidates** |
| raising-capital | 6 | clean — near-verbatim |
| forecasting | 5 | 2 candidates |
| get-sales-tracker | 5 | clean (2 low-confidence) |
| eoy | 4 | clean |
| data-systems | 4 | 2 candidates (one serious — see §5) |
| profit | 4 | clean |
| get-positioning | 4 | clean |
| get-pricing-proposals | 4 | clean |
| staff | 4 | clean |
| strategy | 13 | **9 marks** (the original 9 rows) + 4 further rows, clean |
| succession | 4 | **3 candidates** |
| systems | 4 | **2 candidates** — near-verbatim otherwise |
| due-diligence | 3 | clean |
| get-team-problem | 3 | clean |
| governance | 3 | clean |
| org-capacity-planner | 3 | **2 candidates** |
| org-leadership | 3 | **1 candidate** |
| conflict | 2 | clean |
| risk | 2 | clean |
| valuation | 2 | clean |
| stock-purchasing | 1 | clean |

**Running total across the app: 9 marks written, 1 confirmed clause unwritten, 49 candidates.**

---

## 4 · Why the yield is concentrated, and why that is not a surprise

**The habit tracks the shape of the SOURCE DOCUMENT, not the transcriber.** The final ten domains
prove this harder than anything before them, because they contain both extremes at once:

**Six of the ten are clean because their sources are already full prose.** raising-capital,
succession, systems, org-capacity-planner and org-leadership are transcribed almost word for word
from `Do the Job Content.supt`, `Systems Support` and `Org. Leadership Support`. So are
fm-coach-culture's fifteen sourced rows, out of `Get Org. Firm Content.supt`. There was nothing to
expand, so nothing was added.

**The candidates concentrate where the source gives only a ONE-LINE DESCRIPTION of a template.**
`People Power Suppt.pdf` is the clearest case in the app: it carries step-by-step application for
**five toolkits** and then a *"Source Material Summary"* table giving **one sentence per template**
— and the app holds **26 people-power materials with four to eight steps each.** Most of those
steps were written from a single descriptive line. That is the same terse-source shape as Strategy,
and it produces the same result.

**This means an unread domain's yield is predictable from its source, and that prediction now has
two independent confirmations.** Do not quote an app-wide average; look at the document.

⚠ **The withdrawn 150–200 estimate stays withdrawn.** The final figure across all 194 materials is
**1 confirmed and 49 candidates**, and the candidates are a *reading list for the batch write*, not
a count of marks. Many are low-confidence stylistic tails that a second read may clear.

---

## 5 · The candidate list — read but not resolved

**These are copied exactly from the data**, so the batch write can quote from here. Each is the
whole step; the authored part is the tail after the dash, semicolon or `so`/`rather than`.

### 🔴 The serious class — factual claims, not rationale tails

**Brief P5: a factual claim about a named framework or a stated cause-and-effect is never ours to
author.** These are a different and more serious failure than an added rationale, and they should
be resolved before the stylistic ones.

| Where | The claim |
| --- | --- |
| `data-systems-deming-s-theory-of-volatility` s6 | "Treating coincidence as causation is the most common form of tampering" — the source defines Tampering only as *"data misinterpretation and an inappropriate response to that data"* |
| `people-power-hiring-winners` s3 | "internal moves cost less to source, ramp faster and are retained longer" |
| `people-power-ge-smart-fast-goals` s3 | "imposed goals are achieved less often than goals set together" |
| `people-power-team-survey` s4 | "it correlates most strongly with individual performance" |
| `people-power-remuneration-incentives` s2 | "below-median pay loses the best performers first, because they have the most options" |
| `people-power-client-survey` s7 | "Feedback collected and not acted on leaves a client more likely to leave than if they had never been asked." |

*"ramp", "retained longer", "imposed", "median" and "fixable" return zero matches across the whole
corpus; each zero was re-run literally, per the trap above.*

### people-power — 17

- `business-clock-vs-body-clock` s4 · Protect the recovery points the rhythm depends on **rather than trading them away for extra hours.**
- `cafe-turnaround-behaviours` s4 · Train the staff on the scripts as standard behaviour, **rather than leaving the up-sell to individual confidence.**
- `client-survey` s6 · Segment the results by service line, advisor and client tenure — **a pattern inside one segment is an identifiable, fixable cause.**
- `client-survey` s7 · *(factual — see above)*
- `ef-incentive-points-explained` s3 · Set the penalisation rules, **so the scheme cannot be gamed.**
- `ge-smart-fast-goals` s3 · *(factual — see above)*
- `ge-smart-fast-goals` s7 · Check in monthly for 15-30 minutes on the highest-priority goal — **course correction, not evaluation.** *(the phrase "Course Correction" IS in the corpus, but about partner performance reviews, not goals — low confidence)*
- `hiring-winners` s3 · *(factual — see above)*
- `hiring-winners` s8 · …run structured check-ins through the first 90 days — **that period is what decides retention.**
- `l-suppt-alignment` s5 · Agree ten to fifteen operating principles the owners commit to behaving by — **a behavioural commitment, not a legal document.**
- `leadership-review` s5 · Compare their answers against the Team Survey results where both exist — **the difference between the two is the conversation.**
- `managing-poor-performance` s2 · Set clear expectations in writing, **so the standard being missed is not itself in dispute.**
- `productive-habits-doc` s3 · Define the micro-habit — **small enough to be done on the worst day.**
- `remuneration-incentives` s2 · *(factual — see above)*
- `remuneration-incentives` s7 · Keep the calculation transparent; **an opaque scheme buys goodwill but not performance alignment.**
- `supplier-survey` s4 · Record the workflow bottlenecks the supplier names — **they see the ones inside the business that staff have stopped noticing.**
- `team-survey` s4 · *(factual — see above)*

**Cleared on checking in people-power — do NOT re-hunt.** *"balance beats hiring clones"* is the
firm's own (`People Power Suppt`: *"Focus on balancing team dynamics rather than hiring 'clones'"*);
so are the Feel/Know/Test grading, the café third meeting, the conscientiousness anecdote, the
12-month employment criterion, the wash-up clause, the Challenger (Type 8) coping strategy, the
five content domains against Maslow and Alderfer, and *"think laterally"* about sales and cost.

### org-board-pack — 7

- `risk-mgt-cover` s5 · …— **a register reviewed quarterly with named owners will be maintained; one treated as an annual compliance exercise will be neglected.**
- `quality-decisions` s2 · Ask explicitly whether the board has the information it needs — **a decision made without it is a guess, and the board should know when it is guessing.**
- `quality-decisions` s7 · Assign someone to argue the strongest case against the decision before it is taken, **so the counter-argument is heard regardless of the social dynamics in the room.**
- `white-paper-program` s2 · …— **white papers are never urgent, and without one they are always displaced by billable work.**
- `white-paper-program` s4 · Write the executive summary last and position it first; **it has to be compelling enough for a time-pressured reader to continue.**
- `white-paper-program` s5 · End with actionable next steps — **a paper that closes with 'it depends on your circumstances' creates none of the engagement it was written for.**
- `deming-s-volatility-principles-in-governance` s4 · …identify the special cause before choosing any intervention — **acting without identifying the cause creates a second failure.**

*Optimism Bias, the counter-argument requirement itself and the annual-plan month sequence are all
the firm's own and are cleared.*

### get-marketing — 5

- `1st-response-proposal-templates` s1 · Introduce the engagement as three sprints — Feasibility, Planning, Implementation — rather than one commitment, **so the client is deciding one step at a time.**
- `1st-response-proposal-templates` s4 · Set expectations in writing before work starts, **so the transition from feasibility into planning is a decision the client already understands.**
- `crisis-management-covid-19-email-phone-scripts` s1 · Reach out early using the email templates — **the point is contact and clarity, not a sale.**
- `third-party-collaboration-legal-templates…` s5 · …without requiring the client to leave their existing compliance accountant — **that is what makes the referral safe for them to make.**
- `portal-invitations-system-checklists…` s3 · Tailor the Client Service Plan by hiding or locking the modules they do not need yet, **so the first view is not overwhelming.**

### org-firm-strategy — 5

- `capacity-planner-target-models` s2 · Categorise every client into Growth, Maintain or Service…, **so time follows value rather than noise.**
- `capacity-planner-target-models` s5 · Let them finish both independently before partner review — **the buy-in comes from having set the numbers themselves.**
- `capacity-planner-target-models` s7 · Use My Improvement Plan instead for internal staff who are not required to grow fees — **the same plan for everyone is the wrong tool for half the team.**
- `growth-curve-checklist` s4 · Match the service suggestion to the stage rather than to the firm's capability — **the point is relevance, not coverage.**
- `team-training-o-s-coaching-progress-plan` s1 · …— **the Team Training O.S. is a coaching outcome statement, not a wish list.**

### succession — 3

- `quiz-initial-discovery-questionnaire` s3 · …hobbies, family time, future income, mental acuity — **so the vision of the next chapter forms before the hurdles appear.**
- `quiz-initial-discovery-questionnaire` s5 · …pace the engagement to it — **an owner whose identity is the business needs the vision built before the transaction is discussed.**
- `metaphor-dream-home-visual-frameworks` s2 · Introduce the Dream Home metaphor — **the family is not dismantling something, they are designing and building something together.**

⚠ **Note the word *dismantling*.** The provenance Brief records that *dismantled* "appears nowhere
in the firm's material at all" — it is the tell on one of the nine Strategy marks. Finding it again
here, in a different domain, is the clearest single piece of evidence that these clauses share one
author.

### systems — 2

- `six-business-systems` s3 · Assess the stability of that system and the ones it depends on — **the six are interdependent and rarely fail in isolation.**
- `5-step-process-implementation-framework` s2 · …hold it to 5–13 Nodes: **fewer lacks detail, more overloads the team.** *(the 5–13 range is the firm's, from the Lite Fundamentals Quiz; the reason is not)*

### org-capacity-planner — 2

- `client-trimming-advisory-transition-model` s1 · Save the current state as a version first, **so the base scenario survives whatever you try next.**
- `base-capacity-job-estimation-model` s2 · Select which team member performs each task from the dropdown, **so cost follows the level actually doing the work** — Junior, Senior, Equity Partner.

### org-leadership — 1

- `enneagram-based-employment-questions` s6 · Read the answers for self-awareness and emotional intelligence — **that is the signal the exercise exists to produce, not the type label itself.**

### Carried from the first nineteen domains — 7

| Where | Clause | Note |
| --- | --- | --- |
| `sales-marketing-powerful-seminars` s16 | "not a pitch" | 🟢 **CONFIRMED, not a candidate.** Zero matches across the corpus; same shape as the marked Strategy clause *"rather than staged ones"* |
| `forecasting-the-3-pillars-of-financial-management` s2 | "a weakness here caps everything above it" | no support found |
| `forecasting-the-client-progression…` s5 | "missing the joy that comes from learning" | "joy" appears nowhere in the corpus |
| `data-systems-deming-s-theory-of-volatility` s7 | "nobody ever learns what the right decision would have been" | no support found |
| `data-systems-common-size-trend-analysis-template` s6 | "one who receives a completed report does not" | the first half IS supported — *"take ownership of our understanding"* — the contrast is ours |
| `get-sales-presentation-prompts` s1 | "a proposal built on stale facts dies in the room" | stylistic, low confidence |
| `get-sales-decision-tree-sales-structure` s3 | "nobody feels channelled and the next conversation stays open" | stylistic, low confidence |

### Cleared on checking in the first nineteen — do NOT re-hunt

- `valuation` — *"the buyer is buying a job"* is verbatim in `Valuation support.pdf` Q&A and in `Valuation Logic.pdf`.
- `get-positioning` — *"a 3-ton load"* is the firm's phrase for high-impact events and internal fraud.
- `conflict` — *"lessens guilt … let it linger"* is almost word for word in `Conflict Support.pdf`.
- `stock-purchasing` — *"singular by nature"* and the peak-season caution are both verbatim Q&A.
- `staff` — the financial-bonus note is a verbatim source aside.
- `governance` — *"the counter-argument, proving the risks were considered"* is source step 7.
- `data-systems` — the Christmas-ham and AC/DC examples are both the firm's own.

---

## 6 · 🔴 Findings that are NOT commentary — each needs an owner decision

**These must not be answered with a commentary mark.** A row with no source, or a method we
introduced, is a bigger problem than a row with an added clause, and the two have different fixes.

### 6.1 · A whole method with no source — Net Promoter Score

`people-power-client-survey` **step 4** teaches NPS in full: the 0-10 recommendation question, the
9-10 / 7-8 / 0-6 banding, the promoters-less-detractors calculation.

**The words "detractor", "promoters" and "net promoter" return zero matches across the entire
corpus.** ("Promoter" appears once, as *"a concert promoter"*, in an unrelated EOY exception list.)

This is not a rationale tail welded onto a firm step — it is an **entire step of method that the
firm's material does not contain**, which is the never-invent rule in
[`features/domain-support.md`](features/domain-support.md) P2 rather than the marking rule in
[`features/domain-support-provenance.md`](features/domain-support-provenance.md). Steps 5, 6 and 7
of the same material are in the same position: the source's step-by-step gives four steps
(preparation, engagement, execution, follow-up) and the app gives eight.

**Ask the owner whether NPS stands.** It is good practice and may well be wanted — but it is ours,
it is not marked, and it currently reads as the firm's own method.

### 6.2 · The no-source rows are confirmed by reading, and there is one more than measured

The measured finding of **20 rows matching no document** is confirmed by reading, and
`fm-coach-culture-advisory-pip-template` should be **added to it** — its content is absent from the
corpus too. Five whole fm-coach-culture materials are in this position:
`advisory-pip-template`, `group-coaching-programme`,
`applicant-screening-and-competency-based-recruitment`, `fee-estimate-and-job-creep-management`,
`centre-of-influence-coi-engagement-framework`.

This is item **4.6a** in [`features/to-do.md`](features/to-do.md) and is answered there, not here.

### 6.3 · Two undeclared edits to the firm's own material

1. **`get-seminar-blank-platform-template` step 5 silently renumbers** the source's
   *"Stage 2 (Call to Action & Close)"* to *"Stage 4"*. The source itself runs 1, 1, 2, 3, 2, so
   this is almost certainly a correction of a typo — but it is an **undeclared edit to the firm's
   material**, and nothing records that we made it.
2. **`forecasting-cash-tactics…` step 4 softens the firm's own instruction.** The source says
   *"If they refuse, **fire them as a client**."* Ours says *"stop acting for them."* A deliberate
   tone change, also unrecorded.

Neither is a commentary mark and neither belongs in `authored_commentary`. Both are the same family
as the marking problem — a change to the firm's words with nothing saying we made it. **This is
item 4.6b and is waiting on the owner.**

### 6.4 · The corpus is 113 documents, not 115

Counted 2026-08-14: `Domain Support/` 45, `Logic Tables/` 50, `Central Frameworks/` 10,
`Course Builder Quiz/` 8 — **113 PDFs**, all converting cleanly. The only other PDFs in the
repository are `NIST-2024-0001-0006_attachment_1.pdf` at the root and
`design/report-source-models/Dashboard Discussions.pdf`, neither of which is firm domain material;
counting them gives 115.

**Every mark written so far says `"searched": "all 115 firm documents — zero matches"`.** The whole
point of that phrase is that a reader can reproduce it, so it should say what was actually
searched. **Fix it in the same batch as the new marks** — the searches themselves are sound and
nothing needs re-running.

---

## 7 · What is left

**One job: the batch write.** Work down §5, decide mark-or-clear on each candidate, and add an
`authored_commentary` entry beside that material's `steps` in the shape given by
[`features/domain-support-provenance.md`](features/domain-support-provenance.md) §4.1.

- **Copy the clause exactly** — the guard test fails on a fragment that is not in the material, or
  that appears twice.
- **Write `searched` as what was actually done**, and correct the "115" to 113 on the nine existing
  marks at the same time (§6.4).
- **Run `npx jest tests/unit/authoredCommentary.test.js` after each domain**, not at the end.
- **Do the 🔴 factual class in §5 first.** Those are a different and more serious failure, and one
  of them may not be markable at all — a wrong claim about a named framework is corrected or
  removed, not labelled.
- **§6 is not part of the batch.** Those need the owner's answer first.
