# Session Notes — 2026-08-12 · Laptop, Session 45

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,015 green / 293 suites**, lint 0 errors, **46 ahead / 0 behind `master`**.
>
> ⚠ **A BACKEND RESTART is needed** wherever the app runs — the prompt builder changed. A running
> Restify process holds the old code and will keep sending the old prompts.

---

## 🔴 THE ONE THING TO READ — the blocker was not the blocker

Two logic-tree P1s had been open since 4 August, and both records said the same thing: the field
drop must not be fixed until 93 content rulings were settled, because emitting the field would push
unresolved tool names into live prompts.

**That was true only while the choice was "emit the whole field" or "emit nothing".** Gating at the
**sentence** dissolves it: the sentence naming an unavailable tool is held back, the coaching beside
it is not. Mike's own ruling of 2026-08-04 already said exactly that — *"if it's not in the search
JSON, don't recommend it… if it's coaching advice, of course that's different"* — and the record had
been reading it as a sequencing instruction rather than as the design.

**So a P1 that had been waiting on 93 human decisions was closed in one session, and the decisions it
was waiting for now only govern how much MORE flows, not whether anything does.**

**Result: of 55 branches, 27 deliver their instruction whole, 14 in part, 14 stay silent** — 6,707
characters that reached the AI nowhere before. The 14 need **no further code**; they release as names
are ruled on the Template Check screen and applied.

Live example, `org_leadership/ol_conduct_warning`:

| | |
|---|---|
| In the tree | "Issue a formal Yellow Card using the Agreed Response Time Guidelines. Document the specific behaviour and the correction deadline clearly." |
| Reaches the AI | *"Document the specific behaviour and the correction deadline clearly."* |
| Held back | the Yellow Card sentence — neither name is in the catalogue **yet**; both are already ruled in `TREE-RECOMMENDATION-REVIEW.md` §1 and waiting to be applied |

Commit `fdb15ca`. Row: [§tree-recommendation-field-dropped](ACTIONS.md#tree-recommendation-field-dropped).

---

## The scanner was inventing names, and it had to be fixed first

The catalogue really publishes **Business Purchase Assessment 1**, **Purchase Assessment Model 2**,
**Purchase Assessment Report 3** and **Business Sale Assessment 1**. The trees name all four
correctly. The scanner's pattern required every word after the first to begin with a capital
**letter**, so it stopped at the digit and reported *"Business Purchase Assessment"* — a name that
exists nowhere.

**Two costs, both invisible until measured:** 9 rows sat on Mike's Template Check queue that needed
no ruling at all, and the new gate would have withheld **8 perfectly correct sentences**.

**Mike's queue: 93 → 88.** ⚠ Anything quoting "93 rows" is now stale; two places in `ACTIONS.md` were
corrected, and this is the number to trust.

The scanner moved to [`toolNameScan.js`](../server/utils/toolNameScan.js) so the Template Check screen
and the runtime gate **share one function**. Two copies would have drifted and nothing would have said
so — the same discipline `isTemplateName` already applies to the template lists.

---

## ⚠ Three things a future session should not take on trust

**1 · `action` and `notes` are NOT gated, and they already carry unresolved names — 21 and 19.** They
have reached the AI for a year and still do. This session did not make that worse and did not fix it.
**Do not "finish the job" by pointing the gate at them**: the detector is a heuristic that also raises
"Santa Claus", "Dream Home" and "Worst Case", so it would silently delete coaching that works. It is a
decision for Mike, and the reasoning is in the row, not just here.

**2 · "Zero unresolved declared names" is true of the NODE trees only.** All 110 names declared in
node `templates[]` lists resolve against `data/templates.json`. **19 do not, in the five flat
Get-the-Job tables**, which the node-shaped gate never sees — [§gate-blind-to-flat-trees](ACTIONS.md#gate-blind-to-flat-trees).
Say the qualifier every time; without it the sentence is false.

**3 · The startup "GHOST REFERENCES DETECTED" warning naming six Lite/Growth Curve templates is a
REPORTING gap, not a broken reference.** All six are in `data/templates.json`, which is what the
running app reads; the validator checks the **search export** instead. This was the open "verify
before acting" item from 4 August — now verified, and the answer is that nothing is missing.

---

## ☐ Open for Mike

- 🔴 **Rule the 88 Template Check rows.** Now materially more valuable than it was: it no longer just
  tidies names, it **releases the 14 branches whose instruction the prompt withholds**.
- ☐ **Decide `advisor_note`** — a second dropped instruction, found by the new guard the day it was
  written, on one node. Should it be emitted the same gated way? →
  [§advisor-note-dropped](ACTIONS.md#advisor-note-dropped).
- ☐ **Decide whether `action` and `notes` should be gated too** (see the warning above — my
  recommendation is no).
- **Decide the mentor +2 / firm +3 tabs** the §2 matrix implies. *(Carried from sessions 42–44.)*
- **Ask the master team for the two role values + which group a manager manages.** ⚠ Note the values
  changed name on our side: `global_group_manager`. *(Carried 39–44.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`. *(Carried.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried.)*
- **Decide on the `/startup` change** in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch). *(Carried.)*
- ☐ **One firm, two spellings** — the Logic-Lab Report still prints raw firm ids. *(Carried, adjacent.)*
- **46 commits sit unmerged on this branch.** 🔴 **Mike ruled 2026-08-11: no PR to `master` until the
  task list is clear.** Known and accepted — do not re-raise.

---

## On conflicts

**Shared files touched this session** — the desktop should merge `master` before going near any:

- [`server/utils/logicTrees.js`](../server/utils/logicTrees.js) — new gate + the emitted field
- [`server/utils/templateCheck.js`](../server/utils/templateCheck.js) — its scanner was **removed**
  and is now imported; a conflict here is resolved by keeping the import, never by restoring the copy
- [`server/utils/toolNameScan.js`](../server/utils/toolNameScan.js) — new file
- [`tests/unit/recommendationGate.test.js`](../tests/unit/recommendationGate.test.js) — new file

🔴 **The guard in that test file fails the build if the tree data grows a field the prompt builder does
not read.** If the desktop adds a field to `data/logic_trees.json`, it must either be emitted in
`formatNodeForPrompt` or explained in the test's `NOT_EMITTED` list. **That is the control working, not
a broken test** — it is what would have caught this defect a year ago.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near them.
The Template Check screen was **read** but not modified.

## Commits

- `fdb15ca` — the recommendation gate, the shared scanner, the numbered-title fix and the field guard
