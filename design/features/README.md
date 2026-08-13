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

## The AI

| Brief | History |
|---|---|
| [Virtual Advisor](virtual-advisor.md) — the conversation screen | [history](virtual-advisor-history.md) |
| [Advisory Engine](advisory-engine.md) — how a recommendation is decided | [history](advisory-engine-history.md) |
| [Advisory Distinctions](advisory-distinctions.md) — teaching the engine, without code | [history](advisory-distinctions-history.md) |

## Reports & models

| Brief | History |
|---|---|
| [Model Library](model-library.md) — the reports landing page | [history](model-library-history.md) |
| [Report Models](report-models.md) — every model screen | [history](report-models-history.md) |

## Learning

| Brief | History |
|---|---|
| [Course Builder](course-builder.md) | [history](course-builder-history.md) |
| [Quizzes](quizzes.md) | [history](quizzes-history.md) |
| [Advisor Progress & CPD](advisor-progression.md) | [history](advisor-progression-history.md) |

## Management

| Brief | History |
|---|---|
| [Firm Manager Hub](firm-manager-hub.md) — one screen, four tiers | [history](firm-manager-hub-history.md) |
| [The Tier Cascade](tier-cascade.md) — what flows down, what reports up | [history](tier-cascade-history.md) |

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
