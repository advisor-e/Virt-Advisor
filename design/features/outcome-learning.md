# Outcome Learning — the Brief

> **Item 4.87 · specified, not built.** This page is the task as Mike set it, and the rules
> the spec derived from it. Nothing here is live in the product yet; the spec is
> [`specs/002-outcome-learning/spec.md`](../../specs/002-outcome-learning/spec.md), and the
> history of how the task came about is in
> [`outcome-learning-history.md`](outcome-learning-history.md).
>
> **Covers:** pooling the outcomes advisors already record, anonymised, from firms that
> consent, and turning them into explainable adjustments to what the engine recommends.
> **Does not cover:** the per-client memory that exists today
> ([`advisory-engine.md`](advisory-engine.md) reads it before scoring), or how a case is
> reviewed ([`cases-and-clients.md`](cases-and-clients.md)).

---

## 1. Design philosophy

**The verdicts already exist; the task is to let them cross firms.** After delivery an
advisor records, for every template, whether it was used in full, partly or not at all, and
whether it went well or less well. Today that verdict changes the next recommendation for the
same client and nothing else. Pooled, anonymised, across every firm that consents, the same
verdicts can tell the platform which templates keep going less well in which situations, and
adjust the ranking for everyone. That is what "smarter with use" means here, and it is a claim
the product could not honestly make before this is built.

**It is counting and weighting, not a trained model.** The engine decides and the AI writes;
that boundary does not move. An adjustment is arithmetic a person can check by hand from the
counts shown beside it, applied through the same seam that Advisory Distinctions already use,
capped so that pooled evidence can never outrank what the advisor said today, and accepted by
the mentor before it applies anywhere.

**Consent is the gate, and it belongs to the firm.** Nothing leaves a firm that has not opted
in. No firm, advisor, client or case identifier ever leaves at all.

---

## 2. Key principles — the non-negotiables

**P1 · Nothing leaves a firm that has not opted in.** A firm manager switches contribution on
and off on a hub page at the firm tier. A review recorded while the switch is off never enters
the pool, and a firm that is not opted in never receives an adjustment. Ignore this and the
feature becomes a way for one firm's advisors to be steered by strangers' cases.

**P2 · The anonymised shape is exact, and the guard throws.** Domain, primary issue, industry,
the signals that fired, engagement type, staircase step, template titles, the per-template
verdict, and review words only after the same stripping the mentor-share path applies. A
personal field refuses the whole contribution and is logged; nothing is dropped silently.

**P3 · The learning is explainable.** Every adjustment can be recomputed from its counts. No
trained model is part of this feature; if a later step needs one, that is a fresh decision for
Mike.

**P4 · The mentor accepts before it applies.** Accept, hold or reject each adjustment, with
name, date, version history and restore. Pooled evidence changes nobody's recommendation
without a person who understands the content saying so.

**P5 · The advisor's own words win.** Adjustments are capped below what the current session's
signals contribute, and every applied or outweighed adjustment appears on the decision trace
with its evidence count. An invisible influence on the ranking would be the first in this
product, and the engine's own principles forbid it.

**P6 · Below the floor, nothing publishes.** A minimum number of contributing firms and cases,
shown beside every adjustment. One prolific firm cannot meet the firm floor alone.

**P7 · A recommendation never waits on learning.** If the pool cannot be read, the engine runs
without adjustments and the trace says so.

---

## 3. Design considerations

**Why not per-advisor consent.** Consent is a firm decision because the firm owns the client
data and the cases; advisors see a notice, worded by Mike, on the case-review screen.

**Why the mentor tier alone.** The pool is one platform-wide set and no lower tier holds a
different value; a firm's only lever is consent. Stated as a judgement, per the hub-page rule.

**Why two benches.** The fixed Scenario Lab proves the cap and the opt-out; a second bench
built from the pooled outcomes themselves proves the adjustments help on real cases. "Smarter"
is the change in those two numbers, on the record.

**Two decisions open for Mike**, each with a recommendation in the spec: the floor figures
(proposed 5 firms and 30 cases, from the meeting aggregate's precedent), and whether an
adjustment can only hold a template back or may also lift one (recommended hold-back only in
the first release).

**Three drawings come before any code**, under the Save-the-Artefact rule: the firm's consent
screen and the advisor's notice, the Mentor Hub page, and the trace line.

---

## 4. The task, as Mike set it

Pasted to `/speckit-specify` on 2026-09-10 and kept here verbatim, so the spec, the plan and
the build can always be checked against what was asked.

```text
Learning from outcomes across consenting firms — "the platform gets smarter with use".

FILE IT FIRST. Before writing the spec, add this to design/features/to-do-items.json as a feature asked for by Mike on 2026-09-10, in his words: "build a prompt to develop the task to enable real machine learning - such that it does, indeed, get smarter with use. Not just from one firm, but from all those who consent to help develop the model by sharing anonymised data". Score 3 (helps sell the package), waiting on Mike, rankedByMike false, activeOn this machine. Then write the spec.

WHAT EXISTS TODAY, AND MUST BE REUSED, NOT REBUILT.
- A case review records, per template, whether it was used in full, partly or not at all, and whether it went well or less well: server/utils/caseStore.js (template_outcomes, review_went_well, review_went_less, review_changes_recommended).
- The next session for the SAME client reads that history before scoring and holds back templates that were delivered or went less well: server/utils/priorEngagement.js and HISTORY_HOLDBACK_PENALTY in server/utils/templateResolver.js, pinned by tests/unit/historyHoldback.test.js. Nothing crosses clients today.
- An anonymised, double-opt-in path already carries a case upward to the mentor with identifiers stripped and a personal-field guard that throws rather than filters: mentor_anon_summary and mentor_anon_transcript in caseStore.js, design/features/case-reviews.md P1–P4.
- Score adjustments already have a seam: distinction boosts are added to a template's score in templateResolver.js (around line 367), authored on the Advisory Distinctions screen and cascaded through server/utils/tierChain.js with "offer, never override" semantics.
- The Scenario Lab (scripts/scenario-lab.js, 51 fixed cases across 14 domains) measures the engine before and after a change.
- The tier cascade and the hub pages (components/FirmManagerHub.vue, TAB_TIERS) are where anything the AI or the engine reads must be visible and editable (CLAUDE.md, "AI fixes surface on a hub page").

WHAT IT MUST DO.
1. Consent. A firm manager opts the firm in, and can opt out at any time, on a hub page at the firm tier. Nothing leaves a firm that has not opted in, and opting out stops future contributions without deleting what was already pooled unless the manager asks for that too. Every advisor is told on the case-review screen that anonymised outcomes may contribute, in wording Mike approves.
2. Anonymisation. What travels is exactly the anonymised shape and no more: domain, primary issue where present, industry, the signals that fired, engagement type, staircase step, template titles, the per-template verdict, and the advisor's review words only after the same PII stripping the mentor-share path applies. No firm, advisor, client or case identifiers, ever. The guard throws on a personal field; it never filters silently.
3. The learning is explainable code, not a black-box model. From the pooled outcomes compute adjustments per template and per situation (which templates keep going less well, and for which domain, industry, signal or engagement type), and apply them as score adjustments in templateResolver through the same seam as distinction boosts, capped so pooled evidence can never outrank what the advisor said today. Every applied adjustment appears on the decision trace with the evidence count behind it.
4. It surfaces on the Mentor Hub first. A page shows what has been learned, from how many firms and cases, each adjustment with its evidence, and the mentor accepts, holds or rejects each one before it goes live, with version history and restore. State in one line whether the middle tiers and firms need their own view; the default is the mentor alone, and a firm gets a view only when it needs a different value.
5. Thresholds. No adjustment is published below a minimum number of contributing firms and cases; the numbers are shown beside every adjustment. Propose the floors and the reasoning; the meeting aggregate's 5 advisors and 20 meetings is the precedent in this app. Mike sets the final figures.
6. It is measured. "Smarter" is a number: the Scenario Lab runs before and after, plus a second bench built from the pooled anonymised outcomes themselves, so the adjustments are tested against real cases rather than invented ones. Report both in the plan.
7. Every write is scoped to the verified token, never a supplied id. Pooled data lives at the platform scope through the existing overlay store; no schema change unless the plan proves one is unavoidable, and then it is a named deviation for Mike.

WHAT IT MUST NEVER DO.
- Change a recommendation for a firm that has opted out.
- Let the AI choose, rename or invent a template, or move the "engine decides, AI writes" boundary (design/features/advisory-engine.md P1, P2).
- Send an identifier or a client's words to any model.
- Add a dependency that does not run on Node 14.15, use TypeScript, or touch a locked stack version. A trained model is not assumed; if a later step needs one, it is a fresh decision for Mike.
- Build anything at a tier not named in the spec.

DESIGN STAGE, BEFORE ANY CODE (CLAUDE.md, Save the Artefact).
Draw three screens as committed files in design/mockups/, in the style copied from an approved mockup (design/mockups/meeting-preset-advisor-level.html or firm-template-library.html), with real point and template text from the data files and any invented figures marked as examples:
- outcome-learning-consent.html — the firm manager's opt-in and opt-out, and the one line an advisor sees on the case review.
- outcome-learning-mentor.html — the Mentor Hub page: what was learned, evidence counts, accept / hold / reject, history.
- outcome-learning-trace.html — how an applied adjustment appears on an advisor's decision trace.
Each drawing lists every new word in a wording table marked proposed, and ends with its open questions, each carrying ONE recommendation and the argument against it. Register all three in design/ARTEFACTS.md. Put the questions to Mike one at a time, one yes/no each, and record every ruling on the drawing before building. Mike approves the drawing itself as its own question; rulings on the questions inside it are not approval of the drawing.

WORKING RULES FOR THIS TASK.
Every change needs Mike's explicit yes. Wording on screens is his to approve before it goes into code. Tests are written for what UAT cannot see: the consent gate, the anonymisation guard, the threshold, the cap on adjustments, and the trace, with the AI-output and anonymisation validators at 100% coverage. After the spec: run /speckit-clarify, then /speckit-plan, then /speckit-tasks, stopping for Mike's yes between each.
```

---

## 5. For the coder

Nothing is built. The spec names what is reused; the plan, when Mike approves one, names the
files.

| Piece | Where it stands today |
|---|---|
| The per-template verdict | `server/utils/caseStore.js`, `template_outcomes` |
| The per-client read-back | `server/utils/priorEngagement.js`, `HISTORY_HOLDBACK_PENALTY` in `server/utils/templateResolver.js` |
| The anonymiser and its guard | the mentor-share path in `caseStore.js`, [`case-reviews.md`](case-reviews.md) P1–P4 |
| The score-adjustment seam | distinction boosts in `templateResolver.js` |
| The bench | `scripts/scenario-lab.js` |
| The specification | [`specs/002-outcome-learning/spec.md`](../../specs/002-outcome-learning/spec.md) |

---

## 6. Related briefs

[`advisory-engine.md`](advisory-engine.md) — the engine this adjusts ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the seam it reuses ·
[`case-reviews.md`](case-reviews.md) — the anonymised path it reuses ·
[`cases-and-clients.md`](cases-and-clients.md) — where the verdicts are recorded.

**History:** [`outcome-learning-history.md`](outcome-learning-history.md)
