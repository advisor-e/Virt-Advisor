# Logic-Lab — the build beside the approved artefact

**Built 2026-08-03. Artefact: [`design/mockups/decision-logic-map-mockup.html`](mockups/decision-logic-map-mockup.html),
approved by Mike 2026-08-02.**

This document exists because of the rule added on 2026-08-02 after a Logic-Lab mockup was
approved in chat, never saved, and silently drifted from: *"Before shipping anything built
from an approved design, open the artefact, put it beside the build, and name every
difference. A deliberate deviation is fine; an unrecorded one is not."* (CLAUDE.md → Save
the Artefact.)

Every difference below is deliberate. **Two need Mike's decision** and are marked 🔴.

---

## Where it lives

| | |
|---|---|
| Tab label | **Logic-Lab** — per ACTIONS `#logic-lab-decision-logic-build` |
| Page heading | **Decision Logic** — the artefact's own `<h1>` |
| Component | [`components/firm/FirmDecisionLogic.vue`](../components/firm/FirmDecisionLogic.vue) (sections 1–3) |
| | [`components/firm/DecisionLogicDiagnostic.vue`](../components/firm/DecisionLogicDiagnostic.vue) (sections 4–5) |
| Routes | `GET /logic-lab/summary` · `GET /logic-lab/templates` · `POST /logic-lab/diagnose` — all read-only |

Section order, headings, column order, colours and copy are transcribed from the artefact.
Nothing was reworded to sound better.

---

## 🔴 1. The lede is now factually wrong, and it is the artefact's own sentence

> *"Everything here reads your firm's live configuration. **Nothing on this page changes
> anything.**"*

Section 3 of the same artefact gives every near-miss row a **Move it to X** and a **Copy it
there** button, and both change the firm's live distinction configuration. The two
statements cannot both be true.

**Shipped as approved** — it is Mike's copy and changing it unasked is the deviation this
document exists to prevent. It is first on this list because a page that says it changes
nothing, beside a button that changes something, is exactly the kind of confident half-truth
the rest of the page is built to avoid.

**Recommended fix (one clause, Mike's call):** *"Nothing on this page changes anything until
you choose it."* — true, keeps the reassurance, and the buttons already confirm first.

## 🔴 2. Copy the artefact did not cover

The artefact wrote **one** version of the gap explanation: the case where no distinction of
the firm's matched the expected template. Three other outcomes are reachable and needed
words. These are **newly authored and not yet approved**:

| Situation | Wording shipped | Locale key |
|---|---|---|
| A distinction DID match | *"A distinction of yours did match **X**, so start by checking it points at the template you wanted."* | `dxGapMatchedA/B` |
| No lever of theirs reached it | *"No lever of yours reached **X** at all — every point it scored came from the platform's own scoring."* | `dxGapNoLeverA/B` |
| It placed below the sheet | *"It scored {score}, which placed it below the {shown} templates this sheet shows."* | `dxOutsideSheet` |
| It genuinely scored nothing | *"It scored nothing at all for these words — no part of the engine reached it."* | `dxUnscored` |
| It is not in the library | *"There is no template with that name in your library."* | `dxNotInLibrary` |
| No area recognised from the words | *"No area was recognised from these words, so there is no ranking to explain. Start with the trigger phrases — the words above reached nothing."* | `dxNoScoring` |
| The firm's distinctions could not be read | *"Your distinctions could not be read, so none are counted below. This is a fault, not a result."* | `dxDistUnavailable` |
| They got what they expected | *"You got what you expected: it came top."* | `dxGapWon` |

The first line of the gap block (*"The gap is N points."*) and the whole
*"→ Write a distinction in …"* instruction are the artefact's, unchanged.

### Corrected 2026-08-03, after Mike ran the page

The first version of that table had **one** line covering all three
below-the-sheet cases: *"The engine did not rank this template for these words at
all."* **It was false.** `scoringLog` is capped at the top 20
([`templateResolver.js:622`](../server/utils/templateResolver.js#L622)) and drops
anything scoring zero, so a template absent from it may have scored perfectly
well. Mike's test expected *Governance Introduction*; it had **scored 1**
(`engagement:secondary`) and merely placed below the twenty rows the log keeps —
and the page told him the engine had ignored it.

The fix scores the expected template in a pool of one
(`decisionScore.scoreOneTemplate`) — the same resolver, the same options, nothing
to cap. Two consequences beyond the wording:

- **The gap survives.** A null score used to make the whole gap block vanish,
  precisely in the case where the shortfall is largest. Mike's sentence now reads
  *"The gap is 9 points"* (10 − 1) instead of showing nothing.
- **The engine is untouched.** Raising the cap to make the page easier to write
  would have changed scoring behaviour for every advisor session.

---

## 3. The approved addition — a third honest limit

**Approved by Mike 2026-08-03** before building. The artefact's box is headed *"Two honest
limits"*; it is now **"Three honest limits"**, with this added:

> *"A real session also knows things a typed sentence cannot carry — they come from the
> questions an advisor answers. This ran without them, so the ranking here can differ from
> the one a full session produces."*

**Why it was necessary.** A live session gets a complexity ceiling and an engagement type
from the advisor's answers; a typed sentence has neither, so the run fills them in. Without
this line the page shows a score sheet while hiding what it assumed to produce it.

**What it deliberately does NOT say.** It never names the staircase, the engagement types,
the growth stages or the question order — all protected IP (Mike, 2026-08-02). The API
returns a bare `fromSentenceOnly: true` flag for the same reason: the limit is stated in
full, the mechanism is not.

---

## 4. Numbers are live where the artefact hard-coded them

| Artefact | Build |
|---|---|
| "29 documents" | the firm's real domain-support count |
| "42 tables · 37 carry template hints" | the firm's merged tables, so an edit that adds a template hint moves this |
| "67 in your firm" | the firm's resolved effective distinctions |
| "62 banks · 652 questions" | the firm's blended quiz banks |
| "**+3**" | read from `templateResolver.TREE_HINT_BOOST` — the engine's own constant, now exported so the page cannot drift from it |
| "**+5**" | the firm's **most common** distinction boost (ties fall to the lower value). A firm that set every distinction to 8 must not read "+5" on a page whose whole promise is that it shows their configuration |

The Scenario Lab figures (**3** of 51, **29** of 51, **3.0 points**) stay as measured on
2026-08-02 and travel with a `basis: 'scenario-lab'` marker, so no surface can print one as
if it were the firm's own result.

---

## 5. Section 3 — from "shape only" to real, and what real forced

The artefact's near-miss panel was tagged **shape only** with two invented rows. It now
reads the cross-domain bridge the engine already computes on every session and stores in
each case's decision trace.

- **The "shape only" tag is gone.** The data is real.
- **The live row wins over the trace.** A case records the wording as it was when that
  session ran; the row is re-read from the firm's current distinctions. One that has since
  been **deleted** is dropped (and counted in a footnote); one already **moved** into the
  matching area disappears, because telling a manager again that it is misfiled would be
  false.
- **ADDED — what the count rests on:** *"Read from 10 of 12 shared case studies — the ones
  carrying a recorded decision. Private cases are never read."* This is forced by the
  case-study visibility model, not a design choice: a firm manager only ever sees shared
  cases, so "matched 3 conversations" would otherwise read as the whole truth when it is
  not.
- **ADDED — three empty states**, because the artefact assumes there is always at least one
  row and a button reading *"0 of yours are filed under the wrong domain"* would be absurd:
  none misfiled · no shared cases yet · the case store could not be read. *"Nothing found"*
  and *"nothing to look at"* must never read alike.
- **Move and Copy now ask first.** The artefact marks a row done on click. These write to
  the firm's live configuration, so both confirm — matching the existing "Move it here"
  action on the Team Case Studies tab.
- **Copy needed no new endpoint.** A copy is a new firm-own distinction, which
  `POST /distinctions` already creates, for both cascade flavours
  ([`utils/distinctionMove.js`](../utils/distinctionMove.js) → `buildCopyRequest`).
- **"Leave it" writes nothing.** It marks the row decided so the page stops asking; it
  returns on the next load, because nothing changed.

Labels are unchanged: **Move it to X** · **Copy it there** · **Leave it**.

---

## 6. Section 4 — the score sheet is real, which is the blocker ACTIONS named

`matchReasons` was computed on every session and exposed by no route. It is now published
through [`server/utils/decisionScore.js`](../server/utils/decisionScore.js), which runs the
**real** resolver — no second scoring implementation exists.

- **Rows:** the artefact shows two illustrative rows; the build shows the top five plus the
  expected template wherever it ranked.
- **The allowlist fails closed.** Only `distinction:*` and `tree_hint:*` may reach the
  screen. A scoring rule added tomorrow is hidden by default and its points land in the
  remainder — proved by a test using a reason code that does not exist.
- **The remainder is derived, never enumerated:** `score − published`. It cannot develop a
  gap as scoring rules are added.
- **"Other engine factors" can be negative.** The artefact only shows `+11`. Penalties are
  real, and printing "+" on a negative total would be a lie the reader has no way to catch,
  so the sign is shown.
- **The distinction chip names the distinction** (*"your distinction 'Poor decision quality'
  +5"*, as the artefact has it) when exactly one matched that template, and falls back to
  the unnamed form when two point at it — naming the wrong one is worse than naming none.

---

## 7. Smaller, mechanical differences

| # | Artefact | Build | Why |
|---|---|---|---|
| 7.1 | Yellow **"MOCKUP — nothing here is built"** banner | removed | Its whole purpose was to say the thing was not built |
| 7.2 | Lever links are `href="#"` | buttons that open the Domain Support / Logic Tables / Advisory Distinctions tabs | Every row in this page ends in an action; a dead link teaches a route it cannot walk. Resolved by tab **label**, never a hard-coded index — one tab is hidden behind `v-if="false"` |
| 7.3 | Row 4: *"Try the sentence in **Logic-Lab** first"* | unchanged | It now points at section 4 of this same page, which is what it describes |
| 7.4 | Raw `<textarea>` / `<select>` | Buefy `b-input` / `b-select` | House UI library; same fields, same labels, same order |
| 7.5 | Bold runs inside sentences via HTML | sentences split into parts at each bold run | `v-html` is sanitiser-gated in this codebase; splitting avoids raw markup entirely |
| 7.6 | One HTML file | two components | Engineering Standards: one component, one responsibility, and the decompose rule at 200 lines |
| 7.7 | English in the markup | every string in `locales/en.json` | i18n rule — all user-facing strings go through `$t()` |
| 7.8 | Section numbering jumps 2 → 4 | same | Section 3 is the near-miss, which opens **in place** behind router row 5 rather than being a section of its own — as approved |
| 7.9 | *"{count} of yours are filed…"* | `$tc` singular/plural | At one row the artefact's string reads *"1 of yours are filed"*. Corrected 2026-08-03 after Mike hit it |

### Three rendering faults found by running it (2026-08-03), now fixed

These were mine, not the artefact's — the build had drifted from it:

1. **The advisor's quoted sentence printed in the wrong place.** The artefact
   puts it *inside* the sentence, between *"…worded cleverly:"* and *"File it
   under …"*. Splitting the prose into parts for `strong` rendering left the
   quote appended after the paragraph, running those two clauses together and
   orphaning the firm's own words below them.
2. **"measured3 cases in 51".** Pug emits **no whitespace** between a bare `|`
   and a following tag — verified directly, not assumed. The tag runs now use
   inline interpolation (`#[span.tag-il …]`), which does. The Distinctions card
   was unaffected because its next line began with a space.
3. **"3 points" for a 3.0 margin.** JavaScript prints `3.0` as `3`, and this is
   the figure the whole "+3 versus +5" argument rests on. Formatted to one
   decimal at the single point it enters the page (`marginLabel`).

### 🔴 The artefact's closing sentence was arithmetic that only held for its own example

Found by Mike on a second run, 2026-08-03. The artefact ends the gap instruction:

> That is **+5**. A logic-table hint is **+3**. *Either alone leaves you short; both close it.*

That is true at the artefact's **7**-point gap. Mike's gap was **3**, and his own
score sheet showed *Governance Introduction* on 6 against a top of 9 — so +5 alone
takes it to 11 and wins outright. **The page was contradicting the table printed
directly above it**, on the one screen whose entire promise is that the numbers add
up.

Transcribing the artefact faithfully is the rule, and here it produced a false
statement, because the sentence encoded a relationship (gap ≥ 5 and < 8) rather
than a fact. The fix keeps the artefact's shape and derives the claim:

- both resulting scores are printed — *"+5, which would take it to 11 … +3, which
  would take it to 9. The template at the top scored 9."* — so the reader can check
  the verdict against the same numbers the sheet used;
- the verdict itself is one of four, chosen by comparison, never asserted;
- **drawing level is not "enough".** A tie is settled by scoring the firm cannot
  see, so promising a win on a draw would be a guess dressed as arithmetic.

**Second fault in the same block.** The instruction said *"Write a distinction …"*
while the Ideas section below said *"Poor decision quality matched, but Governance
Introduction is not attached to it. Add it."* Both were on screen together. The gap
block only ever looked at what reached the **expected template**, so it could not
see a distinction that matched the **conversation** and pointed elsewhere. It now
says *attach* when there is something to attach to, and *write* only when there is
not — agreeing with Ideas instead of arguing with it.

**Also fixed:** *"Only {count} table opened"* read *"Only 2 table opened"* at two —
the same singular/plural fault as the near-miss button, caught before it appeared.

---

## What is NOT in this build, and was never in the artefact

- **Where the page is reached from beyond the hub tab.** Still Mike's call (ACTIONS).
- **The mentor rollup.** Not built. The counting was deliberately placed in
  [`server/utils/logicLabSummary.js`](../server/utils/logicLabSummary.js) — pure functions
  over resolved config, stamped with a `schemaVersion` — so a future mentor route can
  enumerate firms and call the same functions rather than growing a second definition of
  "what a firm has". Every field it produces is configuration or a count; no client name,
  advisor name or session text can enter a summary, which is the property that makes a
  cross-firm read a content question rather than a privacy one.

## Tests

| Suite | Covers |
|---|---|
| [`decisionScore.test.js`](../tests/unit/decisionScore.test.js) | the fail-closed allowlist, the IP-protected reason families, the arithmetic balancing after a new rule is added |
| [`logicLabSummary.test.js`](../tests/unit/logicLabSummary.test.js) | the lever counts, the firm's own boost, near-miss aggregation, stale and already-moved rows |
| [`logicLab.routes.test.js`](../tests/unit/logicLab.routes.test.js) | the firm's own config reaching the page, the case-store fault degrading without taking the levers down, no internal fault in an error response |
| [`firmDecisionLogic.component.test.js`](../tests/unit/firmDecisionLogic.component.test.js) | live counts, the three empty states, confirm-before-write, per-row decision keys |
| [`decisionLogicDiagnostic.component.test.js`](../tests/unit/decisionLogicDiagnostic.component.test.js) | the remainder on every row, three honest limits, ideas built from the firm's own material |
| [`distinctionMove.test.js`](../tests/unit/distinctionMove.test.js) | move and copy routing per cascade flavour |
