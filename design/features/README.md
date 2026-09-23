# Feature Briefs — the index

**Every page/feature in this app has two documents.** The **Brief** is the current rules —
no dates, no arguments, no attribution. The **History** is everything else: why the rules exist,
what was tried and rejected, and what went wrong often enough to be worth remembering. The
History is reached only from the foot of the Brief.

**They are all readable in one place** as the Advisor-e Handbook — a single navigable page
generated from these files, with the history behind a gate and the whole thing editable. Ask
Claude for the link.

🔴 **THE `#` COLUMN IS THE PAGE NUMBER, AND IT IS WHERE TASK NUMBERS COME FROM.** Mike's ruling,
2026-09-23: a task belongs to a Handbook page, and it takes that page's number — Sales Tracker is
**17**, so a job on it is `17.1`, `17.2`, and nothing that is not a Sales Tracker job may start
with `17`. A new feature earns a page before it can be given a task number. **A number is never
reused**, and it never changes when the index is reordered. This table is the one register of
them; the rule and the record are in [`../PAGE-NUMBERS.md`](../PAGE-NUMBERS.md), which holds no
second copy of the numbers. `1`–`4` are never allocated.

---

## Start here

| # | | |
|---|---|---|
| 18 | **[The To-Do List](to-do.md)** | The whole live list — who each item waits on, and how it was verified. [Done & parked](to-do-done-and-parked.md) · [Item Numbering](../ITEM-NUMBERING.md) · [Page Numbers](../PAGE-NUMBERS.md) · [Master Team Integration Email](../MASTER-TEAM-INTEGRATION-EMAIL.md) · [Pf Awareness Decision Block](../PF-AWARENESS-DECISION-BLOCK.md) · [Release V0.9.0 Email](../RELEASE-v0.9.0-EMAIL.md) · [Security Audit Notes](../SECURITY-AUDIT-NOTES.md) · [Stack Reconciliation Plan](../STACK-RECONCILIATION-PLAN.md) · [Visual Checks](../VISUAL-CHECKS.md) |
| 19 | **[Product Principles](product-principles.md)** | The tests a thing must pass to earn a place in the product at all. Read before proposing any feature. |
| 20 | **[What Each Hub Page Is For](../HUB-PAGE-PURPOSES.md)** | Twelve tabs, one question each — and the names are not a reliable guide to which. Read before deciding where a piece of content belongs. Every row says whether it was checked against the code or only against a Brief. |
| 21 | **[Design Logic](../ADVISOR-E-DESIGN-LOGIC.md)** | Where Virt Advisor ends and Advisor-e begins, and how the tier logic applies to every feature built here. |
| 22 | **[The Working Agreement](../WORKING-AGREEMENT.md)** | How a session starts and ends, and how the two machines and the master team stay in step. Binding. |

## Checkable records

*Kept in `design/` because generators and tests write to them there. Listed here so they
can be read in one place — the Handbook does not move them.*

| # | | |
|---|---|---|
| 23 | **[The Tier Cascade Map](../TIER-CASCADE-MAP.md)** | For each thing the Hub does: does it cascade down the tiers, and does anything report back up? Read out of the code. |
| 24 | **[Approved Artefacts](../ARTEFACTS.md)** | The register of what Mike has actually approved. If a thing is not in that table, nothing should be built from it. Guarded by a test. |
| 25 | **[Content Routing](../CONTENT-ROUTING.md)** | What reaches a client recommendation, and what is filed into a lane where it becomes invisible. Regenerated from the code by `npm run routing`. |
| 26 | **[Deployed Versions](../DEPLOYED-VERSIONS.md)** | Which commit is running in which environment, who put it there, and when. |
| 27 | **[Code Size](../CODE-SIZE.md)** | How much working code there is, by area, with comments, tests and locale strings shown beside it. Recomputed every time the Handbook is built. |
| 14 | **[The Handbook](handbook.md)** | How this handbook is built, published, opened and edited — and why a new feature starts as a page in it. [history](handbook-history.md) |

## The AI engine

| # | Brief | History |
|---|---|---|
| 28 | [Virtual Advisor](virtual-advisor.md) — the conversation screen | [history](virtual-advisor-history.md) |
| 7 | [Advisory Engine](advisory-engine.md) — how a recommendation is decided | [history](advisory-engine-history.md) · [Engine Defects 2026 07 14 Handover](../ENGINE-DEFECTS-2026-07-14-HANDOVER.md) · [Virt Advisor Registry](../virt-advisor-registry.md) · [Virt Advisor System Design](../virt-advisor-system-design.md) |
| 29 | [Logic Tables](logic-tables.md) — the advisory thinking, written down | [history](logic-tables-history.md) · [Learn Tree Opening Question Field](../LEARN-TREE-OPENING-QUESTION-FIELD.md) · [Logic Table Templates Needed](../LOGIC-TABLE-TEMPLATES-NEEDED.md) · [Tree Pdf Fidelity Sweep 2026 06 23](../TREE-PDF-FIDELITY-SWEEP-2026-06-23.md) · [Tree Recommendation Review](../TREE-RECOMMENDATION-REVIEW.md) |
| 30 | [Domain Support](domain-support.md) — the material the AI draws on | [history](domain-support-history.md) · [Domain Diagnostic Branches](../DOMAIN-DIAGNOSTIC-BRANCHES.md) · [Domain Support Review Checklist](../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md) · [Stage 2 Due Diligence Harvest Draft](../STAGE-2-DUE-DILIGENCE-HARVEST-DRAFT.md) |
| 31 | [Advisory Distinctions](advisory-distinctions.md) — teaching the engine, without code | [history](advisory-distinctions-history.md) · [Distinctions Cascade Plan](../DISTINCTIONS-CASCADE-PLAN.md) · [Wording Distinction Ai Failure](../WORDING-DISTINCTION-AI-FAILURE.md) |
| 32 | [Advisory Staircase](advisory-staircase.md) | [history](advisory-staircase-history.md) · [Staircase Selector Prompt Field](../STAIRCASE-SELECTOR-PROMPT-FIELD.md) |
| 33 | [Logic Lab](logic-lab.md) ⚠ the desktop's ground | [history](logic-lab-history.md) · [Logic Lab Accept And Push](../LOGIC-LAB-ACCEPT-AND-PUSH.md) · [Logic Lab Build Vs Mockup](../LOGIC-LAB-BUILD-VS-MOCKUP.md) |
| 34 | [Logic-Lab Report](logic-lab-report.md) — mentor & middle tiers | [history](logic-lab-report-history.md) |
| 9 | [Founder's Claims Audit & Outcome Learning](outcome-learning.md) — three marketing claims read against the code, and the task that came out of it | [history](outcome-learning-history.md) · [Learn Scope Honesty](../LEARN-SCOPE-HONESTY.md) · [Scenario Lab Report](../SCENARIO-LAB-REPORT.md) · [Wording Trace Reasons](../WORDING-TRACE-REASONS.md) |
| 15 | [Strategy Planner](strategy-planner.md) — the planning session an advisor runs with a client, and the first thing that keeps what was said in the room | [history](strategy-planner-history.md) · [Planning Template Census](../PLANNING-TEMPLATE-CENSUS.md) · [Agenda Helps Lines](../AGENDA-HELPS-LINES.md) |

## Hub pages — mentor & firm

*One page per tab, so a single hub screen can be reviewed on its own.*

| # | Brief | History |
|---|---|---|
| 10 | [The Hub itself](firm-manager-hub.md) — one screen, four tiers | [history](firm-manager-hub-history.md) · [Firm Editable Tables Plan](../FIRM-EDITABLE-TABLES-PLAN.md) · [Hub Navigation Grouping](../HUB-NAVIGATION-GROUPING.md) · [Mentor Ai Hub Stub](../MENTOR-AI-HUB-STUB.md) · [Mentor Hub Consolidated Notes](../MENTOR-HUB-CONSOLIDATED-NOTES.md) · [Mentor Save Scope Plan](../MENTOR-SAVE-SCOPE-PLAN.md) |
| 35 | [Coaching Reference](coaching-reference.md) — 🔴 **REMOVED 2026-08-20**, tab and all; kept as the record of why | [history](coaching-reference-history.md) · [Coaching Reference Evidence](../COACHING-REFERENCE-EVIDENCE.md) · [Method Guides Screen](../METHOD-GUIDES-SCREEN.md) |
| 36 | [Quizzes](quizzes.md) | [history](quizzes-history.md) · [Firm Quiz Builder Plan](../FIRM-QUIZ-BUILDER-PLAN.md) · [Quiz Lab Report](../QUIZ-LAB-REPORT.md) |
| 11 | [Adviser Network](adviser-network.md) | [history](adviser-network-history.md) · [Collaborate Merge Plan](../COLLABORATE-MERGE-PLAN.md) |
| 37 | [Adoption](adoption.md) — mentor & middle tiers | [history](adoption-history.md) |
| 38 | [Case Reviews](case-reviews.md) — mentor & middle tiers | [history](case-reviews-history.md) · [Wording Case Share Cascade](../WORDING-CASE-SHARE-CASCADE.md) |
| 39 | [Template Check](template-check.md) — **mentor only** | [history](template-check-history.md) · [Template Check Already Answered](../TEMPLATE-CHECK-ALREADY-ANSWERED.md) · [Template Check Remaining 58](../TEMPLATE-CHECK-REMAINING-58.md) · [Template Check The Last 12](../TEMPLATE-CHECK-THE-LAST-12.md) |
| 40 | [AI Prompts](ai-prompts.md) — The prompt templates a manager can tune — locked method, three declared variables | [history](ai-prompts-history.md) · [Ai Prompts Page](../AI-PROMPTS-PAGE.md) · [Prompt Contribution Safety](../PROMPT-CONTRIBUTION-SAFETY.md) · [Prompt Contribution Wording](../PROMPT-CONTRIBUTION-WORDING.md) |
| 41 | [Depreciation Rates](depreciation-rates.md) — the depreciation rates a firm's forecasts use, read from its tax authority's own documents | [history](depreciation-rates-history.md) · [Tax Rules Import Gst](../TAX-RULES-IMPORT-GST.md) |
| 42 | [Tax Rates](tax-rates.md) — the company tax rate, GST rate, filing cycle and accounting basis a client's forecast is computed on, per country | [history](tax-rates-history.md) |
| 43 | [Compliance](compliance.md) — what a tier publishes to the tiers beneath it about their legal obligations, and the declaration that will gate Meeting Review. **Built 2026-09-10 — and the gate is live, per firm: a firm that has ticked records as before, one that has not cannot start.** | [history](compliance-history.md) |

*Also on the Hub but covered elsewhere: Domain Support, Logic Tables, Advisory Staircase, Logic
Lab and Logic-Lab Report (above, under the engine), and Team Progress / Team Case Studies (see Advisor Progress and Case Studies).
Templates & Videos is dormant — templates are Advisor-e's.*

## Reports & models

| # | Brief | History |
|---|---|---|
| 5 | [Model Library](model-library.md) — the reports landing page | [history](model-library-history.md) · [Model Classification](../MODEL-CLASSIFICATION.md) |
| 44 | [Report Models](report-models.md) — every model screen | [history](report-models-history.md) · [Adding A Report](../ADDING-A-REPORT.md) · [Multiple Property Assessment](../MULTIPLE-PROPERTY-ASSESSMENT.md) · [Report Data Model](../REPORT-DATA-MODEL.md) · [Report Scaffolding Plan](../REPORT-SCAFFOLDING-PLAN.md) · [Report Visual Standard](../REPORT-VISUAL-STANDARD.md) · [Three Way Forecast Deviations](../THREE-WAY-FORECAST-DEVIATIONS.md) |
| 6 | [The Economic Analysis Prompt](../ECONOMIC-ANALYSIS-PROMPT.md) — the tick that sends the AI to research a client's market, for a funding pack. The first report model in this app to call the AI. **Approved and built — all three slices, 2026-09-06.** | — |
| 45 | [What the Prompt Produced](../ECONOMIC-ANALYSIS-TEST-RUNS.md) — four live runs against two fictional businesses: what it costs, how long it takes, and the citation fault they found and fixed. **Evidence, not a design.** | — |
| 46 | [Business Performance Report](business-performance-report.md) — the client's own performance report — 7 to 15 pages built from the accounts and every model in this section | [history](business-performance-report-history.md) |

## Learning

| # | Brief | History |
|---|---|---|
| 12 | [Course Builder](course-builder.md) | [history](course-builder-history.md) · [Course Builder Plan](../COURSE-BUILDER-PLAN.md) · [Course Session Length Wording](../COURSE-SESSION-LENGTH-WORDING.md) · [Course Session Planning](../COURSE-SESSION-PLANNING.md) · [Course Sliced Session Wording](../COURSE-SLICED-SESSION-WORDING.md) |
| 36 | [Quizzes](quizzes.md) | [history](quizzes-history.md) |
| 47 | [Advisor Progress & CPD](advisor-progression.md) | [history](advisor-progression-history.md) · [Advisor Progress Handover](../ADVISOR-PROGRESS-HANDOVER.md) · [Coverage Debt](../COVERAGE-DEBT.md) |
| 8 | [Meeting Review](meeting-review.md) — recording a client meeting, and the two reports that come out of it. ⚠ **Built. Not for use on a real client until Zero Data Retention is in force (item 8.1, parked).** | [history](meeting-review-history.md) · [Meeting Consent Wording](../MEETING-CONSENT-WORDING.md) · [Meeting Review Dpia](../MEETING-REVIEW-DPIA.md) · [Meeting Types Cascade](../MEETING-TYPES-CASCADE.md) · [Openai Audio Terms Email](../OPENAI-AUDIO-TERMS-EMAIL.md) · [Zdr Intake Email](../ZDR-INTAKE-EMAIL.md) · [Openai Zdr Constraints](../OPENAI-ZDR-CONSTRAINTS.md) |
| 48 | [Business Entity Reports](business-entity-reports.md) — a client's own view of the reports, which models the advisor has opened to them, and how a client's edits are shown. **Part 1, the stub, is built; part 2 is item 4.62.** | [history](business-entity-reports-history.md) |

## Management

| # | Brief | History |
|---|---|---|
| 10 | [Firm Manager Hub](firm-manager-hub.md) — one screen, four tiers | [history](firm-manager-hub-history.md) |
| 49 | [The Tier Cascade](tier-cascade.md) — what flows down, what reports up | [history](tier-cascade-history.md) · [Mentor Tier Chain Plan](../MENTOR-TIER-CHAIN-PLAN.md) · [User Level Cascade Handover](../USER-LEVEL-CASCADE-HANDOVER.md) |
| 50 | [Search-Content Cascade Plan](../SEARCH-CONTENT-CASCADE-PLAN.md) — the master template library moves into the cascading database. **All four phases built on our side (2026-09-09); Advisor-e's call into the push endpoint is the master team's.** | — |

## The adviser network

| # | Brief | History |
|---|---|---|
| 11 | [Adviser Network](adviser-network.md) — the manager console | [history](adviser-network-history.md) |
| 51 | [Groups & Messaging](collaborate-groups.md) — the adviser-facing side | [history](collaborate-groups-history.md) |
| 52 | [People Data Layer](collaborate-data-layer.md) — the database seam | [history](collaborate-data-layer-history.md) · [Handoff](../HANDOFF.md) · [Uat Load Pack](../UAT-LOAD-PACK.md) |
| 17 | [Sales Tracker](sales-tracker.md) — an advisor's own deal pipeline and referral partners, surveyed from an existing app. **Page 17 — nothing is built, and the measurement is not yet named.** | [history](sales-tracker-history.md) |

## Across the app

| # | Brief | History |
|---|---|---|
| 53 | [Case Studies & Clients](cases-and-clients.md) | [history](cases-and-clients-history.md) · [Saved Client Intake Experience Plan](../SAVED-CLIENT-INTAKE-EXPERIENCE-PLAN.md) |
| 13 | [Language & Currency](localisation-and-currency.md) | [history](localisation-and-currency-history.md) · [Cleanup Pass Plan](../CLEANUP-PASS-PLAN.md) |
| 16 | [White-Label & Firm Brand](white-label.md) — the advisor firm's name, colour and logo on a client's document | [history](white-label-history.md) · [Brand Tokens](../BRAND-TOKENS.md) |

---

## Why this exists

`design/` had grown to 120 files and over 25,000 lines, more than half of it dated session
notes. Learning how a report model was built and formatted meant reading across **22 files** and
discarding most of what you read — and the rule and the argument that produced it sat on the page
with equal weight. That is how drift kept winning: the current rule and the historical debate
looked the same.

**The four rules of a Brief** (stated in full in [report-models.md](report-models.md) §6, which
is the worked example the rest follow):

1. The Brief holds current rules. The History holds everything else.
2. It links artefacts; it never paraphrases them.
3. If a number here disagrees with the code, that is a defect to report — not a choice to make,
   and never a reason to update the Brief to match a drift.
4. When a session establishes a new rule, it is written into the Brief **that same session** —
   not left in a session note to be rediscovered.

**Every History page ends by naming where its own source documents have gone stale**, and leaves
them in place. Those documents are accurate records of their own date; they are simply not
descriptions of the code today.
