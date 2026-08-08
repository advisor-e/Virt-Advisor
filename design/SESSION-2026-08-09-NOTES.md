# Session Notes — 2026-08-09 · Laptop, Session 36

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, level with `origin`, suite
> **4,695 green / 272 suites**, lint 0 errors, **11 ahead / 0 behind `master`**.
>
> The Mentor Hub exists: twelve tabs, including both screens Mike had approved.

---

## What the next session most needs to know

**A branch you have been told about is not a branch you have read.**

That morning's `/startup` printed the warning it was built to print: *"feat/firm-quiz-builder-ui —
1 ahead, 0 behind master… if you are about to touch the same screens, merge or ask first."* It was
read out to Mike verbatim. Then a whole day of Mentor Hub work happened without anyone opening it.

The commit sitting on that branch was called **"APPROVED Logic Lab Report mockup"**. It held the
design that defines what the Mentor Hub *is*. Mike asked **three times** where his mocked-up page
had gone before it was traced — and each time the honest-sounding answer ("it isn't in any note I
can find") was true of this branch and useless, because a search cannot find a file that has never
been on the branch it is searching.

**Carry this:** when the drift check names another branch, read its commit subjects before building
anything. The detector worked. The response did not. Logged as
[§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch) with a
concrete proposal — `/startup` should print the *subject lines*, not the count.

---

## What was done

### 1. The record first (`2b81e64`)

[`MENTOR-HUB-CONSOLIDATED-NOTES.md`](MENTOR-HUB-CONSOLIDATED-NOTES.md) — the Mentor Hub was
described across 19 files and defined in none. Everything pulled into one place, sourced, with
*ruled* separated from *built* separated from *assumed*.

**Mike's clarification, added the same day and the reason the document reorders everything:**

> *"All editable functions currently in the Firm Manager Hub have cascaded down from Mentor Hub to
> Global Manager Hub to Group Manager Hub to Firm Manager Hub — then down to advisor and business
> entity/client."*

Nothing in the Firm Manager Hub originates at the firm. So the ten tabs are not features missing
from mentor level — they are **the Mentor's own content, visible only at its last stop**. The gap
is not nine absent features; it is one absent thing (the tiers) expressed nine times.

### 2. The hub, one level up (`dacb7f1`)

`FirmManagerHub.vue` gains a `scope` prop. `/mentor` renders that component; nothing was copied.

**`firmId` turned out to be display-only** — no child reads it, every backend call resolves the firm
from the verified token. That is why this was 81 lines rather than a second hub, and it is worth
remembering before anyone plans a "copy the hub" job again.

### 3. Template Check (`b5e3321`) — 93 live findings

Built to [`mockups/logic-table-template-check.html`](mockups/logic-table-template-check.html).
Closes [§gate-blind-to-flat-trees](ACTIONS.md#gate-blind-to-flat-trees) by construction: `rulesOf()`
asks a tree for `nodes` **or** `branches`, and a test asserts 42 = 37 + 5.

**The sentence reader is verb-led, and that is the whole design.** A first version took every
capitalised phrase and returned **745** rows against the 27 found by hand. Reading the real prose
settled it: a tool is the object of an instruction (*"Deploy the Offshoring Review"*, *"Issue a
Yellow Card"*), while a phrase merely being discussed carries none (*"Chart of Accounts design is
the critical first step"*). Both phrases Mike ruled "Not a tool" are of the second kind, so
requiring the verb declines to raise them without anyone dismissing them.

### 4. The Logic Lab Report (`4f29f07`)

Built to the mockup Mike approved 2026-08-04 (*"i love it, it looks great"*), once PR #40 brought it
across. Groups count **firms, not edits** — five reads as a platform gap, two as "watch don't act",
one as that firm's preference. Getting that boundary wrong sends Mike editing content every firm
inherits on the strength of one firm's habit.

**The privacy line is enforced, not assumed.** This is the second read that crosses the firm
boundary and, unlike the anonymised case feed, no human approves each item. Published fields are a
**whitelist**; the manager who made the edit is dropped; and `assertNoPersonalFields` **throws**
rather than filtering, because a silent filter would hide the day the upstream shape changed.

---

## Where the work stopped

**Cleanly.** All four commits are pushed. Nothing is half-finished in code.

**Two things are deliberately not built, and both are Mike's sequencing:**

1. **The cascade wiring.** The shared tabs READ correctly at mentor scope — with no override stored,
   every tier falls back to the platform default, which *is* Mike's content. What they **SAVE**
   still lands in firm-shaped storage: `firm_framework_versions` is keyed `(firm_id, config_key)`
   with no column for a tier above the firm. **Cheapest it will ever be — MySQL has never been
   provisioned, so there is no data to migrate.**
2. **"Apply it"** on Template Check — writing a ruling into the logic table and cascading it. Ruled
   rows currently say *"Recorded — not yet applied to the table."*

**The Logic Lab Report reads zero** on this machine, correctly: it aggregates across firms from
MySQL, and there is no database here. The page says so in words rather than showing zeros as
findings.

**The backend was restarted** (2026-08-09) — the new routes 405'd until it was, because Restify
registers routes at boot. PR #36's outstanding restart is now also satisfied on this machine.

## On conflicts

Touched `components/FirmManagerHub.vue`, `pages/mentor.vue`, `server/routes/mentor.js`,
`server/restify-server.js`, `locales/en.json`, four new source files, four new tests, and
`design/ACTIONS.md`. **`ACTIONS.md` and `locales/en.json` are where a conflict would land.**

⚠ **`FirmManagerHub.vue` is now shared by two tiers.** A change made for the firm screen reaches the
Mentor Hub unasked, and the reverse. `mentorHubScope.component.test.js` is what makes that fail
loudly instead of silently — do not "fix" it by loosening the tab-order assertion.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's.** Nothing here went near
`FirmLogicTables.vue`, `FirmLogicLab.vue` or `DecisionLogicDiagnostic.vue`.

## Open for Mike

- **Walk the twelve tabs at `/mentor`** — Template Check has 93 rows waiting for rulings.
- **Rule on the Logic Lab Report's wording.** The artefact declares its own copy placeholder; it is
  all in `locales/en.json` under `logicLabReport.*`, so a change is a one-line edit.
- **Decide on the `/startup` change** proposed in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried, unchanged.)*
