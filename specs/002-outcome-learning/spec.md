# Feature Specification: Learning from Outcomes Across Consenting Firms

**Feature Branch**: `feat/firm-quiz-builder-ui` (the desktop's branch; Spec Kit creates no branches here)

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "Learning from outcomes across consenting firms — the platform gets smarter with use." Filed on the live list as item **4.87**, asked for by Mike on 2026-09-10 in his words: *"build a prompt to develop the task to enable real machine learning - such that it does, indeed, get smarter with use. Not just from one firm, but from all those who consent to help develop the model by sharing anonymised data."*

> **What this builds on.** Today an advisor's case review already records, for every template
> delivered, whether it was used in full, partly or not at all, and whether it went well or less
> well. The next session for the **same client** reads that verdict before scoring and holds back
> what went less well. Nothing crosses clients. This feature pools those verdicts, anonymised,
> from every firm that consents, turns them into explainable, capped adjustments a mentor
> accepts before they go live, and shows every applied adjustment on the advisor's decision
> trace. It is counting and weighting, visible and reversible, not a trained model.

## Clarifications

### Session 2026-09-10

- Q: Should advisors' free-text review words enter the shared pool at all, or only the tick-box verdicts? → A: Verdicts only; no free text enters the pool in this release.
- Q: Is an adjustment keyed to a template and one situation dimension at a time, or to the full combination of every dimension a case carries? → A: One dimension at a time: template × domain, template × industry, template × signal, or template × engagement type, each meeting the floor on its own.
- Q: Which review verdicts count as evidence against a template: only "went less well" on a template the advisor actually delivered, or also "not used at all"? → A: Only "went less well" on a delivered template (used in full or in part) counts against it; "went well" on a delivered template balances the count; "not used at all" is neutral.
- Q: When are the proposed adjustments recomputed from the pool: when the mentor opens the page, or on a timed schedule in the background? → A: When the mentor opens the page and on a "Recompute now" action, and immediately on a firm's withdrawal; no background schedule.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A firm manager decides whether their firm contributes (Priority: P1)

A firm manager opens a Contribute tab on their hub, reads exactly what would leave the firm and what would never leave it, and switches contribution on. Later they can switch it off, and separately ask for what the firm already contributed to be withdrawn. Every advisor in the firm sees one line on the case-review screen saying anonymised outcomes may contribute, worded by Mike.

**Why this priority**: Nothing else in this feature may exist for a firm until this switch is on. Consent is the gate, and it is the only part a firm decides for itself.

**Independent Test**: With one firm opted in and one not, record a case review at each. Only the opted-in firm's anonymised outcome appears in the pool; the other firm's is absent and its recommendations are unchanged by anything pooled.

**Acceptance Scenarios**:

1. **Given** a firm that has never opted in, **When** an advisor there completes a case review, **Then** nothing from that review enters the pool and the firm's next recommendations are unaffected by pooled adjustments.
2. **Given** a firm manager on the Contribute tab, **When** they switch contribution on, **Then** the screen states the switch is on, who switched it and when, and reviews completed from that moment enter the pool in the anonymised shape.
3. **Given** a firm that is opted in, **When** the manager switches it off, **Then** no further reviews enter the pool, what was already pooled remains, and the screen offers a separate, explicit request to withdraw it.
4. **Given** a manager asks to withdraw, **When** the withdrawal completes, **Then** that firm's contributions are removed from the pool, any adjustment that no longer meets the floor is unpublished, and the screen confirms the count removed.
5. **Given** an advisor at an opted-in firm on the case-review screen, **When** the screen loads, **Then** the approved one-line notice is visible; at a firm not opted in, it is not shown.

---

### User Story 2 - The mentor sees what has been learned and decides what goes live (Priority: P2)

On the Mentor Hub the mentor opens a page listing every proposed adjustment: which template, in which situation (domain, industry, signal or engagement type), the direction and size of the adjustment, and how many firms and cases stand behind it. The mentor accepts, holds or rejects each one. Accepted adjustments go live for every opted-in firm; held and rejected ones do not. Every decision has version history and can be restored.

**Why this priority**: Pooled evidence must not change anybody's recommendation without a person who understands the advisory content deciding it should. This is the same "a human accepts before it is used" rule every other AI-adjacent feature here follows.

**Independent Test**: Seed a pool that crosses the floor for one template in one domain. The mentor page lists that adjustment with its counts; accepting it changes the Scenario Lab's result for a matching case; holding or rejecting it leaves the result unchanged.

**Acceptance Scenarios**:

1. **Given** pooled outcomes above the floor for a template, **When** the mentor opens the page, **Then** the adjustment is listed with its direction, size, firm count and case count, marked proposed.
2. **Given** a proposed adjustment, **When** the mentor accepts it, **Then** it is marked live with the mentor's name and date, appears in version history, and applies to the next recommendation at every opted-in firm.
3. **Given** a live adjustment, **When** the mentor rejects it, **Then** it stops applying immediately, stays visible as rejected with the reason the mentor typed, and can be restored from history.
4. **Given** pooled outcomes below the floor, **When** the mentor opens the page, **Then** the adjustment is listed as "not yet enough evidence" with the counts and the floor, and cannot be accepted.
5. **Given** an empty pool, **When** the mentor opens the page, **Then** it says so in words, with the number of contributing firms, and does not look broken.

---

### User Story 3 - An advisor sees why a recommendation moved (Priority: P3)

An advisor at an opted-in firm asks for recommendations. Where a live adjustment changed a template's place in the ranking, the decision trace names the adjustment, the situation it applies to, and the evidence count behind it, beside the signals and distinctions the trace already shows. What the advisor said today always outranks the pooled evidence.

**Why this priority**: Every recommendation in this product must be traceable. An adjustment the advisor cannot see would be the first invisible influence on the ranking, which the engine's own principles forbid.

**Independent Test**: With one live adjustment and a matching case, the trace shows the adjustment line with its count; with the adjustment rejected, the line is absent and the ranking returns to its previous order.

**Acceptance Scenarios**:

1. **Given** a live adjustment matching the session's situation, **When** recommendations are produced, **Then** the decision trace lists it by name with its evidence count and the size of its effect.
2. **Given** a case where the advisor's own signals favour a template that a live adjustment holds back, **When** recommendations are produced, **Then** the advisor's signals win: the cap prevents the adjustment from outranking what was said today, and the trace says both were weighed.
3. **Given** an advisor at a firm that is not opted in, **When** recommendations are produced, **Then** no adjustment applies and no adjustment line appears.

---

### User Story 4 - The improvement is measured before it ships (Priority: P4)

Before any adjustment goes live and after, the fixed Scenario Lab runs and a second bench built from the pooled anonymised outcomes runs, and both report a figure. "Smarter" is the change in those figures, on the record.

**Why this priority**: Without a number the claim cannot be made or defended. It comes last because it needs the pool to exist.

**Independent Test**: Run both benches with no adjustments live, accept one adjustment, run again; the report shows before and after for both benches.

**Acceptance Scenarios**:

1. **Given** the benches have run, **When** the mentor opens the page, **Then** the latest before-and-after figures are shown beside the adjustments, with the date of the run.
2. **Given** the outcome bench, **When** it runs, **Then** it uses only the anonymised shape and no case can be traced back to a firm, advisor or client from its report.

---

### Edge Cases

- A firm opts out, then opts in again: reviews between the two dates never enter the pool; reviews after re-opting do.
- A withdrawal takes an adjustment below the floor after the mentor accepted it: it is unpublished automatically and the mentor page says why.
- A template is renamed or removed from the library: adjustments keyed to it are shown as orphaned on the mentor page and never applied.
- The same firm submits many reviews for one client: they count as one firm and as many cases; the firm floor cannot be met by one prolific firm.
- A template is delivered in 25 cases across 5 firms but never marked "went less well": it crosses the floor with a hold-back of zero, is listed so the mentor can see it was learned about, and applies no adjustment.
- A review has a verdict on a template the case never held: it is refused at the door, as the case store already does.
- A review contains a personal field the anonymiser does not recognise: the guard throws and nothing from that review enters the pool; the failure is logged for a person to read, never filtered silently.
- The pool is unreachable when a recommendation is requested: recommendations run without adjustments and the trace says so; a recommendation is never blocked by learning.
- Two advisors in one firm record opposite verdicts on the same template: both count; the adjustment reflects the balance and its size shows it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A firm manager MUST be able to switch contribution on and off for their firm on a hub page at the firm tier, and the screen MUST show the current state, who set it and when.
- **FR-002**: Nothing from a firm MUST enter the pool unless that firm's contribution switch is on at the moment the review is recorded.
- **FR-003**: Switching off MUST stop future contributions without removing what was pooled; withdrawal of pooled contributions MUST be a separate, explicit request that reports the count removed.
- **FR-004**: The case-review screen at an opted-in firm MUST show a one-line notice, in wording Mike approves, that anonymised outcomes may contribute; at a firm not opted in it MUST NOT.
- **FR-005**: What enters the pool MUST be exactly: advisory domain, primary issue where present, industry, the signals that fired, engagement type, staircase step, template titles, and each template's verdict (used in full, partly, not at all; went well, less well). No free text enters the pool: the advisor's review words stay at the firm (clarified 2026-09-10).
- **FR-006**: No firm, advisor, client or case identifier MUST enter the pool. The anonymisation guard MUST refuse the whole contribution when it finds a personal field, and MUST log the refusal; it MUST NOT silently drop the field.
- **FR-007**: The system MUST compute proposed adjustments per template and per single situation dimension (template × domain, template × industry, template × signal, or template × engagement type; never a combination of dimensions) from the pooled verdicts, each pairing counting its own firms and cases, using explainable arithmetic that a person can check by hand from the counts shown; no trained model is part of this feature. Only templates the advisor delivered (used in full or in part) are evidence: "went less well" counts against the template, "went well" balances it, and "not used at all" is neutral and never counts. The hold-back size derives from the share of delivered cases that went less well (clarified 2026-09-10).
- **FR-008**: An adjustment MUST NOT be proposed as publishable until it meets a floor of contributing firms and cases; the floor is **5 contributing firms and 25 cases** (Mike's ruling, 2026-09-10), and the floor and the current counts MUST be shown beside every adjustment.
- **FR-009**: The mentor MUST accept, hold or reject each adjustment on the Mentor Hub before it applies anywhere; every decision MUST carry the mentor's name and date, be kept in version history, and be restorable.
- **FR-010**: A live adjustment MUST apply as a score adjustment through the same mechanism as distinction boosts, and MUST be capped so that pooled evidence can never outrank what the advisor said in the current session. Adjustments are **hold-back only** in this release (Mike's ruling, 2026-09-10): a template that keeps going less well ranks lower, and nothing pooled ever lifts a template above the advisor's own evidence. Lifting is a separate decision for a later release.
- **FR-011**: Every applied adjustment MUST appear on the decision trace with the situation it matched and its evidence counts; an adjustment that was considered and outweighed MUST also be visible on the trace.
- **FR-012**: A firm that has not opted in MUST receive no adjustment, ever.
- **FR-013**: The Mentor Hub page MUST show the number of contributing firms, the pool's case count, each adjustment's state, the date and time of the last recompute, and an empty state in words when there is nothing to show; opening the page recomputes, and a "Recompute now" action (wording Mike's to approve) does the same, within the page-render limit.
- **FR-014**: The page is built at the mentor tier alone; the middle tiers and firms get no view in this release, because the pool is one platform-wide set and no lower tier holds a different value. (Stated judgement, per the hub-page rule.)
- **FR-015**: Two benches MUST report a figure before and after any adjustment goes live: the existing fixed-case bench and a new bench built from the pooled anonymised outcomes; the latest figures MUST be visible on the Mentor Hub page.
- **FR-016**: Every write MUST be scoped to the verified caller, never an identifier supplied in a request.
- **FR-017**: The pool and the adjustments MUST live at the platform scope in the existing configuration store; any change to the database schema is a named deviation put to Mike, not assumed.
- **FR-018**: The feature MUST NOT allow any model to choose, rename or invent a template, MUST NOT send identifiers or client words to any model, and MUST NOT add a dependency that does not run on the locked runtime.
- **FR-019**: A recommendation MUST never fail or wait because the pool or an adjustment could not be read; it degrades to no adjustment and says so on the trace.

### Key Entities

- **Contribution consent**: one per firm; on or off, who set it, when; and a separate withdrawal request with its date and the count withdrawn.
- **Pooled outcome**: one anonymised review: domain, primary issue, industry, signals fired, engagement type, staircase step, template titles, per-template verdicts, and the date; carries a contribution token that links it to its firm's consent without naming the firm, so withdrawal can find it.
- **Proposed adjustment**: template plus exactly one situation dimension value (a domain, an industry, a signal or an engagement type), direction and size, firm count, case count, computed date, state (below floor, proposed, live, held, rejected, orphaned).
- **Mentor decision**: accept, hold or reject on one adjustment, with name, date, optional reason, and version history.
- **Bench result**: which bench, run date, the figures before and after, and which adjustments were live at the time.
- **Trace line**: the adjustment name, the situation matched, the evidence counts, the effect applied or outweighed, on an advisor's decision trace.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a firm that has not opted in, 100% of recommendation runs are unchanged by pooled adjustments, proven on the fixed bench with and without adjustments live.
- **SC-002**: 100% of pooled outcomes pass an independent scan for firm, advisor, client and case identifiers; any contribution carrying one is refused and logged, never stored.
- **SC-003**: Every live adjustment can be recomputed by hand from the counts shown on the mentor page and matches to the unit.
- **SC-004**: On the fixed bench, no case where the advisor's own signals favour a template sees that template pushed below an adjusted one; the cap holds in 100% of cases.
- **SC-005**: On the outcome bench, the share of top recommendations that a later review marked "went well" is higher with accepted adjustments live than without, and the difference is reported as a number the mentor can read on the page.
- **SC-008**: Opening the mentor page, including its recompute, returns within the page-render limit of 2000 ms at a pool of 10,000 outcomes.
- **SC-006**: A firm manager can switch contribution on or off, or request withdrawal, in under one minute from opening the hub, and the screen confirms the result in words.
- **SC-007**: The mentor can see, for any live adjustment, who accepted it and when, and can restore any earlier state, within one screen.

## Assumptions

- Consent is a firm-level decision made by a firm manager, and an advisor's notice is informational; an advisor cannot opt out individually in this release.
- The anonymiser used by the mentor-share path is the reference for what "stripped" means; this feature reuses its guard on the structured fields and extends it only where a new field needs covering. Free text is excluded outright rather than stripped.
- "Situation" means the dimensions already recorded on a case: domain, primary issue where present, industry, the signals that fired, engagement type and staircase step. No new dimension is captured. An adjustment is keyed to one dimension value at a time; a case matching several live adjustments has each weighed, all under the one cap (clarified 2026-09-10).
- Only reviews recorded after consent was switched on contribute; nothing is back-filled from earlier cases.
- Adjustments are recomputed when the mentor opens the page, when the mentor asks for a recompute, and immediately when a firm withdraws; there is no background schedule, and the computation never runs inside the request that asks for a recommendation (clarified 2026-09-10).
- The meeting aggregate's floor (5 advisors, 20 meetings) is the in-app precedent for evidence thresholds; the floor of 5 firms and 25 cases follows it, ruled by Mike on 2026-09-10.
- The middle tiers and firms need no view of adjustments in this release because the pool is one platform-wide set; a firm's only lever is consent.
- Three drawings precede any code, per the Save-the-Artefact rule, and every screen's wording is Mike's to approve.
