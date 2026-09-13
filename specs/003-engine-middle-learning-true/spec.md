# Feature Specification: The Engine's Middle, and the Learning Loop Made True

**Feature Branch**: `feat/firm-quiz-builder-ui` (the desktop's branch; Spec Kit creates no branches here)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "The engine's middle, and the learning loop made true — every promise on the page is enforced in the code." Filed on the live list as item **4.97**, asked for by Mike on 2026-09-14 in his words: *"transfer your improvement suggestions (all of them) into fixes"* and *"if you spot an area of improvement and you think it will make a better quality app or user experience — get it in the tasks. DO NOT leave things out just because you're not sure — if in doubt about having it — ask me questions 1 at a time!"* The prompt as run is kept verbatim in the feature brief. The second-opinion idea he raised the same day is item **4.98** and is not part of this specification.

> **What this builds on.** The Founder's Claims Audit (10 September) and its comparison against
> the built Outcome Learning feature (14 September) named ten places where the product's
> promise runs ahead of its code, or where a known gap limits how sharp the engine can be. Every
> one of them is a user story below. Nothing here moves the boundary *the engine decides, the AI
> writes*; nothing here is a trained model; everything the engine reads is on a screen a mentor
> can change.

## Rulings already made (2026-09-14, Mike)

- **Lift and hold-back both exist**: *"the point of the advisor distinctions is to 'lift' a template so yes — there should be BOTH lift and hold back mechanisms."* Same floor, same cap, same mentor gate as the hold-back.
- **A provider fallback, not a second opinion**: yes to a backend fallback provider; the "different perspectives" idea is filed separately as 4.98. Personal data goes only to a provider Mike has cleared in configuration.
- **Template profiles get a screen**: yes to a Mentor Hub screen for authoring each template's profile and signals.
- **Routing groups stay dead**: the System Registry (2026-06-09) removed them; the Advisory Engine brief's line "designed, not in code" is stale and is corrected. The engine's middle means the primary-issue step, not routing groups.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The advisor confirms the primary issue the engine proposes (Priority: P1)

After the cause-first domain check-in, the engine proposes the single most likely primary issue in one line with its reason, in the conversation, with no menu. The advisor confirms it, or reframes it in their own words, or says none of these fit. The confirmed issue is one of Mike's authored labels for that domain, is stored on the case, is named on the decision trace, and travels into the outcome pool. Today this field is never set: it is inferred silently and every pooled row carries a blank.

**Why this priority**: It is the designed middle of the engine, recorded as design debt since June, and it is the input that makes every later story sharper: the pool's primary-issue dimension, the lab's report and the profile screen's signals all read it.

**Independent Test**: Run an intake where the cause words match one authored issue clearly. The engine proposes it with a reason; confirming stores it on the case and it appears on the trace and in the pooled row. Reframing to a different authored issue stores that one instead. "None of these" stores nothing and the conversation continues forward.

**Acceptance Scenarios**:

1. **Given** a confirmed domain and cause words matching one authored primary issue, **When** the check-in completes, **Then** the engine proposes that issue with a one-line reason and asks the advisor to confirm or reframe.
2. **Given** a proposed issue, **When** the advisor confirms, **Then** the case carries that authored label, the trace names it as advisor-confirmed, and the next recommendation's scoring reads it.
3. **Given** a proposed issue, **When** the advisor reframes in their own words, **Then** the engine maps the words to an authored label where one matches, proposes it once more for confirmation, and otherwise stores no issue and says so.
4. **Given** a context domain (Conflict Meetings, End of Year Meetings, Due Diligence), **When** the check-in completes, **Then** no primary issue is proposed, because those domains produce none by design.
5. **Given** a case reviewed at a consenting firm with a confirmed issue, **When** it is pooled, **Then** the pooled row carries that label and the primary-issue dimension can meet the floor.
6. **Given** the Scenario Lab, **When** it runs, **Then** its report states how many of the 51 cases proposed an issue and how many would have been confirmed as proposed.

---

### User Story 2 - Learning lifts as well as holds back (Priority: P1)

A template that keeps landing well in a situation rises in the ranking for that situation, under the same evidence floor, the same cap, the same mentor accept/hold/reject, and the same trace line as a hold-back. The mentor page lists lifts and hold-backs together, each with its counts, and the arithmetic of each can be checked by hand.

**Why this priority**: Mike's ruling. A loop that only learns what to avoid cannot honestly be sold as learning what works.

**Independent Test**: Seed a pool where one template lands well in 25 cases across 5 firms for one domain. The mentor page lists a lift with its counts; accepting it raises that template for matching sessions at consenting firms; the trace names the lift; a firm not opted in sees no change.

**Acceptance Scenarios**:

1. **Given** pooled verdicts above the floor where "landed well" outweighs "went less well" for a template in a situation, **When** the mentor opens the page, **Then** a lift is proposed with its direction, size, firm count and case count.
2. **Given** a live lift matching the session, **When** recommendations are produced, **Then** the template's score rises by the capped amount, and the trace names the lift, the situation and the counts.
3. **Given** a template with both a live lift in one dimension and a live hold-back in another matching the same session, **When** recommendations are produced, **Then** both are weighed under the one cap and the trace shows both.
4. **Given** a live lift, **When** the mentor rejects it with a reason, **Then** it stops applying and can be restored from history.
5. **Given** a firm not opted in, **When** recommendations are produced, **Then** no lift applies.

---

### User Story 3 - The advisor's own words always win (Priority: P1)

Where the advisor's own evidence in this session matched a template — an Advisory Distinction, the confirmed primary issue, the client's industry, or a signal that fired — no pooled adjustment can move that template below or above what that evidence earned. Today only a distinction is protected. The fixed bench proves the rule holds rather than counting cases left unchanged.

**Why this priority**: This is the sentence marketing wants to say, and the design promise the code only partly enforces.

**Independent Test**: A session whose industry matches a template's title while a live hold-back covers that template: the template keeps its industry-earned place, the trace says the hold-back was outweighed by the advisor's evidence. The fixed bench reports zero cases where a pooled adjustment moved a template past one the advisor's evidence favoured.

**Acceptance Scenarios**:

1. **Given** a template matched by any of the advisor's own evidence kinds, **When** a pooled adjustment also matches it, **Then** the adjustment is marked outweighed and applies nothing, and the trace names which evidence outweighed it.
2. **Given** a template matched by none of the advisor's evidence, **When** a pooled adjustment matches it, **Then** the adjustment applies up to the cap.
3. **Given** the fixed bench, **When** it runs, **Then** it reports the count of cases where a pooled adjustment re-ordered a template against the advisor's evidence, and that count is zero.

---

### User Story 4 - The client's industry reaches the pool (Priority: P2)

A typed industry enters the pool when it matches the platform's vocabulary the same way the engine scores it: plural and stem tolerant, so "cafés" pools as the café model's industry. Nothing outside the platform vocabulary ever enters.

**Why this priority**: The industry dimension is one of four the learning reads, and today it is almost always empty because only an exact word is accepted.

**Independent Test**: Review a case whose industry was typed as "cafes". The pooled row carries the vocabulary word the engine matched. Review one typed as "zzzz": the row carries no industry.

**Acceptance Scenarios**:

1. **Given** a typed industry that the engine's own matcher resolves to a vocabulary word, **When** the review is pooled, **Then** the row carries that vocabulary word and nothing typed.
2. **Given** a typed industry the matcher does not resolve, **When** the review is pooled, **Then** the row's industry is empty and the guard still passes.

---

### User Story 5 - The mentor sees how far the loop reaches (Priority: P2)

The mentor's Outcome Learning page shows how many delivered cases carry a review against how many do not, across contributing firms, so the loop's reach is a number. Each firm's Outcome Sharing tab shows the firm's own two counts.

**Why this priority**: A loop that only sees the cases advisors return to review has a reach nobody can state today.

**Independent Test**: With ten delivered cases at a firm and four reviewed, the firm's tab shows 4 of 10 and the mentor's page includes them in the platform figure.

**Acceptance Scenarios**:

1. **Given** contributing firms with delivered cases, **When** the mentor opens the page, **Then** it shows reviewed and unreviewed counts with the date they were read.
2. **Given** a firm manager on the Outcome Sharing tab, **When** it loads, **Then** it shows the firm's own reviewed and unreviewed counts and nothing about other firms.

---

### User Story 6 - The pool secret fails loud (Priority: P2)

The backend refuses to start when any firm has sharing switched on and the pool secret is missing. The Outcome Sharing tab refuses to switch sharing on when the secret is missing, and says why. The UAT load pack states the requirement.

**Why this priority**: A pool written under a lost secret holds rows no firm can ever withdraw, which breaks the withdrawal promise on the consent screen.

**Independent Test**: Start the backend with a consenting firm and no secret: it stops with a message naming the secret. Start it with no consenting firm and no secret: it runs, and the consent tab refuses to switch on.

**Acceptance Scenarios**:

1. **Given** at least one consenting firm and no secret, **When** the backend starts, **Then** it refuses to serve and logs the reason.
2. **Given** no secret, **When** a firm manager tries to switch sharing on, **Then** the switch is refused with a plain message and nothing is written.

---

### User Story 7 - The bench is honest about what it measured (Priority: P2)

Beside the in-sample figure, the mentor page shows an out-of-sample run: adjustments computed only from reviews before a cut-off date and tested only on reviews after it. The honesty line under the card says which is which.

**Why this priority**: Today "smarter" is measured on the same reviews the adjustments were computed from, which flatters the number.

**Independent Test**: Seed reviews across two months. The out-of-sample run computes from month one, tests on month two, and reports a figure that differs from the in-sample figure; both appear on the page with their dates.

**Acceptance Scenarios**:

1. **Given** pooled reviews spanning more than one month, **When** the benches run, **Then** the page shows the in-sample and out-of-sample figures, the cut-off, and the count tested.
2. **Given** pooled reviews all in one month, **When** the benches run, **Then** the out-of-sample card says in words that there is not yet a later month to test on.

---

### User Story 8 - The AI keeps working when the first provider fails (Priority: P2)

Every AI call on the backend goes through one provider seam. When the first provider refuses, fails, or is out of credit, the call retries once on the configured second provider, and the log line and the decision trace record which provider answered. Personal data — a meeting transcript, a client's words, anything Meeting Review sends — is routed only to a provider Mike has cleared for it in configuration, never by default to the fallback. If no cleared provider can answer, the feature reports failure exactly as it does today.

**Why this priority**: On 11 September one provider's empty credit stopped every AI feature. A buyer will ask.

**Independent Test**: Configure two providers, make the first refuse; a narrative call answers from the second and its trace says so. Send a Meeting Review transcript with only the first provider cleared: it never reaches the second, and the failure message is the existing one.

**Acceptance Scenarios**:

1. **Given** two configured providers, **When** the first fails, **Then** the call answers from the second and the log and trace name it.
2. **Given** a call carrying personal data and a fallback not cleared for it, **When** the first provider fails, **Then** the fallback is not tried and the feature reports failure as today.
3. **Given** one configured provider, **When** it fails, **Then** behaviour is unchanged from today.
4. **Given** any provider, **When** a reply arrives, **Then** it passes the same validators as an OpenAI reply; no provider's output is trusted as data.

---

### User Story 9 - The mentor authors each template's profile and signals (Priority: P3)

A Mentor Hub screen lists every template with its semantic profile and signals, flags the templates with no signals and those with purpose-only profiles, and lets the mentor author them with version history and restore. The engine reads the authored profile. The Scenario Lab reports how many templates remain thin.

**Why this priority**: The profiles are the dominant scoring input and 111 of them are thin; they are Mike's content, and today nothing on any screen shows or edits them.

**Independent Test**: Open the screen: 23 templates are flagged as having no signals and 88 as purpose-only. Author signals on one; the next recommendation's scoring log shows them matched; the lab's count of thin templates falls by one.

**Acceptance Scenarios**:

1. **Given** the mentor on the screen, **When** it loads, **Then** every template is listed with its profile, and thin ones are flagged with the reason.
2. **Given** an authored change, **When** it is saved, **Then** it is versioned, restorable, and read by the next recommendation.
3. **Given** a firm, **When** it opens its hub, **Then** it sees no profile screen in this release; the judgement is stated on the brief (the profile is platform content, and a firm's vocabulary already reaches scoring through Advisory Distinctions).

---

### User Story 10 - The engine brief tells the truth about routing groups (Priority: P3)

The Advisory Engine brief's pipeline table and "designed, not built" paragraph say routing groups were removed by the registry's ruling, not that they await building. The registry is unchanged.

**Independent Test**: A reader of the brief and a reader of the registry reach the same conclusion.

**Acceptance Scenarios**:

1. **Given** the brief, **When** read, **Then** no line says routing groups are designed and unbuilt.

---

### Edge Cases

- The advisor confirms a primary issue, then the "none of these fit" escape resets the domain: the stored issue is cleared with it.
- A lift and a hold-back for the same template and the same situation both meet the floor: impossible by construction, since one pairing has one share; the sign of the balance decides which it is.
- A lift is live and the template is already at the top: the trace still names the lift as applied, with no reordering.
- A withdrawal takes a live lift below the floor: it is unpublished automatically, like a hold-back.
- The second provider answers with a shape the validators refuse: the call fails as it would from the first provider; nothing invalid is used.
- The pool secret is present but changed: rows written under the old value cannot be withdrawn; the boot check cannot detect this, and the load pack says the value must never change once set.
- The out-of-sample cut-off leaves fewer than the floor's cases after it: the card says so and shows no figure.
- A template is renamed on the profile screen: profiles are keyed to the template, not its title, so the authored profile follows it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After the domain check-in, for every non-context domain, the engine MUST propose exactly one primary issue from the authored labels for that domain, with a one-line reason, and ask the advisor to confirm or reframe, conversationally and without a menu.
- **FR-002**: The confirmed primary issue MUST be stored on the case as an authored label, named on the decision trace as advisor-confirmed, read by scoring, and carried into the pooled outcome row.
- **FR-003**: A reframe that maps to no authored label MUST store no issue and say so; a reframe that maps to one MUST be proposed once more for confirmation.
- **FR-004**: Pooled evidence MUST produce a lift where "landed well" outweighs "went less well" for a template in a situation, and a hold-back where the reverse holds, each sized from the share and capped, under the same floor (5 firms, 25 cases) and the same mentor accept, hold, reject, history and restore as today.
- **FR-005**: The cap MUST hold for every kind of the advisor's own evidence: a distinction, the confirmed primary issue, the industry, or a fired signal. A template matched by any of them MUST receive no pooled adjustment, and the trace MUST name which evidence outweighed it.
- **FR-006**: The fixed bench MUST report the count of cases where a pooled adjustment re-ordered a template against the advisor's own evidence, and that count MUST be zero.
- **FR-007**: A typed industry MUST enter the pool only as the vocabulary word the engine's own matcher resolves it to; nothing typed and nothing outside the vocabulary MUST enter.
- **FR-008**: The mentor page MUST show reviewed and unreviewed delivered-case counts across contributing firms with the date read; each firm's consent tab MUST show its own two counts only.
- **FR-009**: The backend MUST refuse to start when any firm has sharing on and the pool secret is missing, logging the reason; the consent tab MUST refuse to switch sharing on without the secret, with a plain message.
- **FR-010**: The benches MUST add an out-of-sample run: adjustments computed from reviews before a cut-off, tested on reviews after it, shown beside the in-sample figure with the cut-off and the count tested; when no later month exists the card MUST say so in words.
- **FR-011**: Every backend AI call MUST go through one provider seam configured on the backend; a refused, failed or out-of-credit call MUST retry once on the configured second provider; every AI log line and every trace that records an AI call MUST record which provider answered.
- **FR-012**: A call carrying personal data MUST be routed only to a provider cleared for it in configuration; the fallback MUST NOT be tried for such a call unless cleared; with no cleared provider able to answer, the feature MUST report failure as it does today.
- **FR-013**: Every provider's reply MUST pass the same validators as today's; no provider's output MUST be trusted as data.
- **FR-014**: A Mentor Hub screen MUST list every template's profile and signals, flag those with no signals and those that are purpose-only with the reason, and let the mentor author them with version history and restore; the engine MUST read the authored profile.
- **FR-015**: The profile screen is built at the mentor tier alone in this release; the judgement is stated on the brief.
- **FR-016**: The Scenario Lab MUST report how many cases proposed a primary issue and how many templates remain thin.
- **FR-017**: The Advisory Engine brief MUST state that routing groups were removed by the registry's ruling; the registry is unchanged.
- **FR-018**: Every write MUST be scoped to the verified caller, never an identifier supplied in a request; no schema change is assumed, and any found necessary is a named deviation put to Mike.
- **FR-019**: Nothing here MUST let a model choose, rename or invent a template, a primary issue, a profile or a signal; MUST add a dependency that does not run on the locked runtime; or MUST build a screen at a tier the spec does not name.
- **FR-020**: Every new on-screen word MUST be marked proposed on a committed drawing and approved by Mike before it reaches code.

### Key Entities

- **Confirmed primary issue**: one authored label per case, with whether it was confirmed as proposed or reframed, and the proposal's reason.
- **Pooled adjustment**: as today, plus a direction (lift or hold-back) decided by the sign of the balance; state, counts, decision and history unchanged.
- **Trace line**: as today, plus the direction, and for an outweighed adjustment the kind of advisor evidence that outweighed it.
- **Loop reach**: reviewed and unreviewed delivered-case counts, per firm and across contributing firms, with the date read.
- **Bench result**: as today, plus an out-of-sample run with its cut-off, count tested, and figure.
- **Provider record**: on every AI log line and trace entry, which configured provider answered.
- **Provider clearance**: configuration naming which providers may receive personal data.
- **Template profile**: the signals and weights the engine scores a template by, authored at the platform tier, versioned and restorable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the Scenario Lab, a primary issue is proposed for 100% of cases in a non-context domain, and the report states how many match the case's authored expectation where one exists.
- **SC-002**: With a live lift and a matching case, the lifted template's place rises on 100% of matching runs at consenting firms and on 0% at firms not opted in.
- **SC-003**: The fixed bench reports zero cases where a pooled adjustment re-ordered a template against the advisor's own evidence.
- **SC-004**: Pooled rows carry a primary issue and an industry wherever the case held one the vocabulary recognises; on the dev seed that is above 90% of rows for primary issue.
- **SC-005**: The mentor can read the loop's reach, the in-sample and out-of-sample figures, and their dates on one screen within the page-render limit of 2000 ms at a pool of 10,000 outcomes.
- **SC-006**: With the first provider forced to fail, 100% of non-personal AI calls answer from the second provider, and 0% of personal-data calls reach an uncleared provider.
- **SC-007**: A backend started with a consenting firm and no secret refuses to serve 100% of the time.
- **SC-008**: After the mentor authors signals on a thin template, the lab's thin count falls by one and the next matching recommendation's trace shows the authored signal matched.
- **SC-009**: Every adjustment, lift or hold-back, can be recomputed by hand from the counts on the page and matches to the unit.

## Assumptions

- The authored primary-issue labels in Mike's Workshop 1 list are the only values a confirmed issue may take; the propose step maps cause words to them with the same signal vocabulary the engine already uses, and never invents a label.
- Context domains produce no primary issue by design; the propose step does not run for them.
- A lift's size follows the same share arithmetic as a hold-back, mirrored; the cap of 10 applies to the net of everything matched; no new floor is introduced.
- "The advisor's own evidence" means the four kinds the resolver already records as reasons: distinction, primary issue, industry, signal. Domain priors alone are not advisor evidence.
- The reviewed/unreviewed counts read the existing case records at each firm; no new record is created.
- The out-of-sample cut-off is the start of the latest month in the pool, so the test set is the newest month; no scheduling is added.
- The provider seam keeps the REST-only, backend-only rule; the second provider is any REST-reachable model Mike names in configuration; none is named in code.
- "Personal data" for routing means every call Meeting Review makes and any call carrying client free text; a classification call carrying only the fenced advisor sentence is not personal data for this purpose, and the plan lists every call site with its class for Mike's yes.
- The template profile screen edits the platform's profile file through the existing overlay store at the platform scope, as other mentor-tier content does.
- Four drawings precede any code: the primary-issue proposal in the conversation, the Outcome Learning page with lifts, reach and the out-of-sample bench, the trace line for a lift and for an outweighed adjustment, and the template-profile screen. Every on-screen word is Mike's to approve.
