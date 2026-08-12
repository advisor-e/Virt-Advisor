# Session Notes — 2026-08-05 · Laptop, Session 35 (second session of the day)

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **4,607 green / 268 suites**,
> **0 behind `master`**. The mockup landed as `9ba2b4c` and is pushed; this note and the two record
> updates follow it.
>
> Session 34's notes are [`SESSION-2026-08-05-NOTES.md`](SESSION-2026-08-05-NOTES.md) — same day,
> earlier. Read both.
>
> ⚠ **PR #36's backend restart is STILL outstanding** — carried unchanged from 2026-08-04.

---

## What the next session most needs to know

**A green test is only evidence about what it walks.**

`templateAvailabilityGate.test.js` asserts the gate "withholds NOTHING" across the real trees, and it
passes. It walks `tree.nodes`. **Five of the 42 logic tables keep their rules in `branches` instead**,
so the test has never seen them — and neither has the gate, because flat tables are rendered by
`formatFlatBranch`, which never calls `splitByAvailability`.

Eleven names in those five tables match no template and reach the AI today. The gate built yesterday
covers 37 of 42, and yesterday's note recording "0 withheld, changes nothing today" was true of the
37 and silent about the rest.

**Carry this:** when a test certifies a corpus-wide claim, check what it actually iterates before
quoting its number. Both the safety net and its proof had the same blind spot, so the two agreed with
each other and neither was right.

---

## What was done

### 1. The row-by-row confirmations were ABANDONED, on Mike's call — and that was the right move

The session opened working through §2 of [`TREE-RECOMMENDATION-REVIEW.md`](TREE-RECOMMENDATION-REVIEW.md),
one name per message. Four were settled that way. **Two dissolved on inspection and never needed
asking** — *Chart of Accounts* and *Psyche Errors* are phrases inside Mike's own instructions, and in
both cases the branch already carried its real template. The review doc had listed them as open
questions; checking the tree data rather than the summary line settled them in seconds.

At row 7 Mike stopped it: *"is it possible to build a report that shows logic tables that dont relate
to exact templates — i modify the logic table in the mentor hub which cascades down to the firm
manager hub"*. That replaces ~20 remaining chat questions with a screen he can work from.

**His four rulings are now written into the review doc's §2 table**, not left in chat:

| Name | Ruling |
|---|---|
| Interpreting Data Correctly | Coaching, not a template |
| Yellow Card / Agreed Response Time Guidelines | **Partner Accountability** (`Do the Job › Governance Tools` — the de-merit record) |
| BoardPack Agenda | **FM Agenda & Minutes** |
| Enneagram Employment Questions | A separate real document → the export gap is now **seven** tools, not six |

⚠ **None of the four is applied to `data/logic_trees.json` yet.** That is Phase 4.

### 2. The gate blind spot (`9ba2b4c` commit message; now [§gate-blind-to-flat-trees](ACTIONS.md#gate-blind-to-flat-trees))

Found while gathering real data for the mockup. Proof is in the ACTIONS entry. **Deliberately not
fixed by extending the gate** — if those 11 names are real assets under another title, withholding
them deletes real instructions, which is exactly the 2026-08-04 error. The report comes first.

### 3. The approved design (`9ba2b4c`)

[`mockups/logic-table-template-check.html`](mockups/logic-table-template-check.html) — every row in
it is real data read from `logic_trees.json` and checked against the 285 distinct titles in
`templates.json`. Mike opened it in a browser and approved it: *"that looks great, move forward."*

**The 13 labels and 4 verdict names in that file are APPROVED AS WRITTEN.** Build to them; name any
deviation before shipping.

Two things worth keeping from building it:

- **The first draft invented a purpose line** for a suggested match ("Growth Curve Checklist — maps
  the five stages…"). Caught before Mike saw it and replaced with the real candidate, **Growth
  Fundamentals Framework Philosophy**, whose title literally begins with the name in the tree. The
  mockup claims every row is real; that claim had to be earned, not asserted.
- **Two candidates the earlier hand-review missed** turned up from a wider search: *General Meeting
  Agenda* (offered to Mike alongside FM Agenda & Minutes) and, for the still-open Decision Workpaper
  row, *Draft White Papers* / *FM Board White Paper* — where the doc had said "none found".

---

## Where the work stopped

**Cleanly, before any build.** No application code was touched this session.

The four-phase plan was put to Mike and **Phase 1 is awaiting his yes**:

1. **Phase 1 — the check engine + tests.** Backend only, no screen. Scans **both** tree shapes.
   Corrects `templateAvailabilityGate.test.js` in the same phase. *Not started.*
2. **Phase 2 — persisting rulings and "Not a tool" dismissals.** Reuse the platform overlay scope
   (`server/utils/platformDistinctions.js`) — version history comes free.
3. **Phase 3 — the Mentor Hub tab**, to the approved mockup, all wording via `locales/en.json`.
4. **Phase 4 — applying a ruling** to the logic table, cascading to every firm.

**Ground already checked:** `/api/mentor/*` exists with `mentorGuard` (firmAuth + requireMentorRole);
`pages/mentor.vue` has two tabs today; platform-level content already persists through the Advisory
Distinctions cascade. Nothing new needs inventing.

**Expect the numbers to grow.** The mockup's "27 sentence-names" is what was found *by hand* in 8
tables. Phase 1 checks all 42.

## On conflicts

Touched `ACTIONS.md`, `TREE-RECOMMENDATION-REVIEW.md`, one new mockup, this note. **`ACTIONS.md` is
where a conflict would land**, as ever.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's.** Nothing here went near
`FirmLogicTables.vue`, `FirmLogicLab.vue` or `DecisionLogicDiagnostic.vue` — and Phase 3 deliberately
puts the new screen in the Mentor Hub to keep it that way. `feat/firm-quiz-builder-ui` still holds 1
commit not in `master`.

## Open for Mike

- **Say yes (or no) to Phase 1** — the check engine. Nothing starts without it.
- **Restart the backend** wherever it runs, for PR #36's engine changes. *(Carried from 2026-08-04.)*
- **Raise the export gap with the master-app team — now SEVEN tools**, not six.
