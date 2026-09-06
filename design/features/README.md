# Feature Briefs — the index

**Every page/feature in this app has two documents.** The **Brief** is the current rules —
no dates, no arguments, no attribution. The **History** is everything else: why the rules exist,
what was tried and rejected, and what went wrong often enough to be worth remembering. The
History is reached only from the foot of the Brief.

**They are all readable in one place** as the Advisor-e Handbook — a single navigable page
generated from these files, with the history behind a gate and the whole thing editable. Ask
Claude for the link.

---

## Start here

| | |
|---|---|
| **[The To-Do List](to-do.md)** | The whole live list — who each item waits on, and how it was verified. [Done & parked](to-do-done-and-parked.md) |
| **[Product Principles](product-principles.md)** | The tests a thing must pass to earn a place in the product at all. Read before proposing any feature. |
| **[What Each Hub Page Is For](../HUB-PAGE-PURPOSES.md)** | Twelve tabs, one question each — and the names are not a reliable guide to which. Read before deciding where a piece of content belongs. Every row says whether it was checked against the code or only against a Brief. |
| **[Design Logic](../ADVISOR-E-DESIGN-LOGIC.md)** | Where Virt Advisor ends and Advisor-e begins, and how the tier logic applies to every feature built here. |
| **[The Working Agreement](../WORKING-AGREEMENT.md)** | How a session starts and ends, and how the two machines and the master team stay in step. Binding. |

## Checkable records

*Kept in `design/` because generators and tests write to them there. Listed here so they
can be read in one place — the Handbook does not move them.*

| | |
|---|---|
| **[The Tier Cascade Map](../TIER-CASCADE-MAP.md)** | For each thing the Hub does: does it cascade down the tiers, and does anything report back up? Read out of the code. |
| **[Approved Artefacts](../ARTEFACTS.md)** | The register of what Mike has actually approved. If a thing is not in that table, nothing should be built from it. Guarded by a test. |
| **[Content Routing](../CONTENT-ROUTING.md)** | What reaches a client recommendation, and what is filed into a lane where it becomes invisible. Regenerated from the code by `npm run routing`. |
| **[Deployed Versions](../DEPLOYED-VERSIONS.md)** | Which commit is running in which environment, who put it there, and when. |
| **[The Handbook](handbook.md)** | How this handbook is built, published, opened and edited — and why a new feature starts as a page in it. [history](handbook-history.md) |

## The AI engine

| Brief | History |
|---|---|
| [Virtual Advisor](virtual-advisor.md) — the conversation screen | [history](virtual-advisor-history.md) |
| [Advisory Engine](advisory-engine.md) — how a recommendation is decided | [history](advisory-engine-history.md) |
| [Logic Tables](logic-tables.md) — the advisory thinking, written down | [history](logic-tables-history.md) |
| [Domain Support](domain-support.md) — the material the AI draws on | [history](domain-support-history.md) |
| [Advisory Distinctions](advisory-distinctions.md) — teaching the engine, without code | [history](advisory-distinctions-history.md) |

## Hub pages — mentor & firm

*One page per tab, so a single hub screen can be reviewed on its own.*

| Brief | History |
|---|---|
| [The Hub itself](firm-manager-hub.md) — one screen, four tiers | [history](firm-manager-hub-history.md) |
| [Coaching Reference](coaching-reference.md) — 🔴 **REMOVED 2026-08-20**, tab and all; kept as the record of why | [history](coaching-reference-history.md) |
| [Advisory Staircase](advisory-staircase.md) | [history](advisory-staircase-history.md) |
| [Quizzes](quizzes.md) | [history](quizzes-history.md) |
| [Logic Lab](logic-lab.md) ⚠ the desktop's ground | [history](logic-lab-history.md) |
| [Adviser Network](adviser-network.md) | [history](adviser-network-history.md) |
| [Adoption](adoption.md) — mentor & middle tiers | [history](adoption-history.md) |
| [Logic-Lab Report](logic-lab-report.md) — mentor & middle tiers | [history](logic-lab-report-history.md) |
| [Case Reviews](case-reviews.md) — mentor & middle tiers | [history](case-reviews-history.md) |
| [Template Check](template-check.md) — **mentor only** | [history](template-check-history.md) |
| [AI Prompts](ai-prompts.md) — The prompt templates a manager can tune — locked method, three declared variables | [history](ai-prompts-history.md) |

*Also on the Hub but covered elsewhere: Domain Support and Logic Tables (above, under the
engine), and Team Progress / Team Case Studies (see Advisor Progress and Case Studies).
Templates & Videos is dormant — templates are Advisor-e's.*

## Reports & models

| Brief | History |
|---|---|
| [Model Library](model-library.md) — the reports landing page | [history](model-library-history.md) |
| [Report Models](report-models.md) — every model screen | [history](report-models-history.md) |
| [The Economic Analysis Prompt](../ECONOMIC-ANALYSIS-PROMPT.md) — the tick that sends the AI to research a client's market, for a funding pack. The first report model in this app to call the AI. **Approved and built — all three slices, 2026-09-06.** | — |
| [What the Prompt Produced](../ECONOMIC-ANALYSIS-TEST-RUNS.md) — four live runs against two fictional businesses: what it costs, how long it takes, and the citation fault they found and fixed. **Evidence, not a design.** | — |

## Learning

| Brief | History |
|---|---|
| [Course Builder](course-builder.md) | [history](course-builder-history.md) |
| [Quizzes](quizzes.md) | [history](quizzes-history.md) |
| [Advisor Progress & CPD](advisor-progression.md) | [history](advisor-progression-history.md) |
| [Meeting Review](meeting-review.md) — recording a client meeting, and the two reports that come out of it. ⚠ **Design for approval — nothing built.** | [history](meeting-review-history.md) |
| [Business Entity Reports](business-entity-reports.md) — a client's own view of the reports, which models the advisor has opened to them, and how a client's edits are shown. **Part 1, the stub, is built; part 2 is item 4.62.** | [history](business-entity-reports-history.md) |

## Management

| Brief | History |
|---|---|
| [Firm Manager Hub](firm-manager-hub.md) — one screen, four tiers | [history](firm-manager-hub-history.md) |
| [The Tier Cascade](tier-cascade.md) — what flows down, what reports up | [history](tier-cascade-history.md) |
| [Search-Content Cascade Plan](../SEARCH-CONTENT-CASCADE-PLAN.md) — the master template library moves into the cascading database. **Plan for approval — nothing built.** | — |

## The adviser network

| Brief | History |
|---|---|
| [Adviser Network](adviser-network.md) — the manager console | [history](adviser-network-history.md) |
| [Groups & Messaging](collaborate-groups.md) — the adviser-facing side | [history](collaborate-groups-history.md) |
| [People Data Layer](collaborate-data-layer.md) — the database seam | [history](collaborate-data-layer-history.md) |

## Across the app

| Brief | History |
|---|---|
| [Case Studies & Clients](cases-and-clients.md) | [history](cases-and-clients-history.md) |
| [Language & Currency](localisation-and-currency.md) | [history](localisation-and-currency-history.md) |

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
