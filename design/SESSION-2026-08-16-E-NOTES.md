# Session Notes — 2026-08-16 · Laptop, Session 65

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,615 green / 317 suites**.
>
> ✅ **4.16 IS FIVE-SEVENTHS DONE.** Mike's instruction was *"4.16 — complete all your pieces then i
> want a new release created."* Four of the five closed. **F remains and the release was NOT cut** —
> he chose to stop rather than start the biggest item on a tired session.

---

## 🔴 FIRST TASK NEXT SESSION

**Item F — the 12 method guides need a screen.** Read
[`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) (note its superseded banner), then
[`DOMAIN-DIAGNOSTIC-BRANCHES.md`](DOMAIN-DIAGNOSTIC-BRANCHES.md) and
[`LEARN-TREE-OPENING-QUESTION-FIELD.md`](LEARN-TREE-OPENING-QUESTION-FIELD.md). **Do not re-derive
the analysis.**

F is the biggest of the seven and unlike C and B it has **no existing table on screen to hang off**:
twelve deeply nested documents, each a different shape, all read by the AI in full today and visible
to nobody at any tier. **It needs its own artefact and Mike's wording approval before any build.**

⚠ **DO NOT** re-raise: the education-gate wording (settled, session 61), the release number
(sequenced after the tech list, session 60), the "ten empty domains" (they are not empty, session
63), or deleting the 55 diagnostic branches (**cancelled by evidence this session — nothing to
delete**).

---

## What shipped

### 1. Item C — the thirteen questions nobody was asked (`95e96ec`)

Thirteen learn tables carry a `stage_entry_question` — the sentence that establishes where in a
method the advisor already is. **It appeared in exactly one file in the repository: the one that
authors it.** These are the same thirteen tables that ship a ~19,000-character method guide to the
model, so the AI read a whole staged method with no idea where the advisor stood in it.

Plus two standing rules on `public_speaking` in a `flat_branches` array. The formatter reads flat
rules from `tree.branches`, **empty on a nodes-shaped table**, which is why nothing ever showed them.

Both halves per the hub-page rule. Screen: *"The question your advisors are asked first"* on the
Logic Tables tab; the two rules are rows tagged **Always applies**. Wording approved by Mike.

### 2. Items A+B, merged (`e30eb3f`)

All **65** `diagnostic_entry` branches now reach the AI, plus the **26** `primary_question` fields
that reached it and appeared on no screen. Screen: *"What to do, depending on the situation"* on the
**Domain Support** tab — Mike's ruling, after the spec's "put them on Logic Tables" failed to survive
reading the content.

🔴 **ITEM A IS CANCELLED, BY THE TEST IT ITSELF DEMANDED.** The spec claimed ~55 were duplicates of
tree routing and proposed retiring them, while admitting the comparison was made on node **names**.
Run text-by-text, only 3 of the 65 had even 85% of their words present in their best tree, and all
three read as complementary: **the tree says WHICH conversation this is, the branch says WHAT TO DO
once you are in it.** Nothing deleted. **Item G is the only genuine duplicate in the whole sweep** —
right once in seven.

### 3. The records (`this commit`)

Both Briefs updated with the rules established today; `to-do-items.json` rewritten and the list
regenerated; `ACTIONS.md` session-65 block.

---

## ⚠ What is open, and honestly

1. **Item F is untouched** and is the only 4.16 build left that is ours.
2. **Item D still has no page at any tier** and cannot start without Mike.
3. **The release Mike asked for was not created.**
4. 🔴 **`to-do-items.json` had described 4.16 with a plan withdrawn two sessions earlier** —
   "mentor tier only", "ship it filled by authoring the ten empty domains", "BLOCKED ON MIKE".
   Anyone picking it up would have started the wrong job. **Rewritten. Worth checking the other
   items for the same rot** — nobody has.
5. **Carried, untouched from sessions 61–64:** six ghost template references logged at every
   startup; two broken Brief links (`tier-cascade.md` → `collaborate.md`,
   `to-do-done-and-parked.md` → `../STATUS.md`); the Coaching Reference still has no Brief;
   `ARTEFACTS.md` still shows 2.6 as "☐ awaiting approval". **Now carried six sessions.**
6. **~100 Handbook links still point at documents with no page** (session 64's finding, untouched).

---

## 🖥 FOR THE DESKTOP

🔴 **Application code changed in three shared places.** Merge `master` before touching
`server/utils/domainSupport.js`, `server/utils/logicTrees.js`, `server/routes/firmManager.js`,
`components/firm/FirmDomainSupport.vue` or `components/firm/FirmLogicTables.vue`. `logic-lab` is
untouched.

🔴 **`domainSupport.js` now has ONE shared diagnostic formatter called from all three prompt paths.**
It had three formatters that had drifted — two emitted the entry question, the advisor path emitted
nothing. **Add a field to the shared formatter, never to one caller.**

🔴 **The Logic Tables save route now MERGES onto a table's existing override** instead of replacing
it, because the override carries three things now (branches, standing rules, opening question).

🔴 **`_treeBranchRows` rows now carry `kind`** (`'branch'` | `'standing'`), and the domain-support
detail route returns `platformSituationKeys`.

**New files:** `design/LEARN-TREE-OPENING-QUESTION-FIELD.md`,
`design/DOMAIN-DIAGNOSTIC-BRANCHES.md`, `tests/unit/logicTreeOpeningQuestion.test.js`,
`tests/unit/domainDiagnosticBranches.test.js`, and this note.

---

## ☐ Open for Mike

1. **Where the engagement types live** — 18 authored fields, no page at any tier. The one 4.16 item
   that cannot start without him. 🔺 **now carried two sessions.**
2. **Whether a firm may REMOVE an inherited diagnostic situation** — today it cannot (overrides
   merge, so a deleted row returns). Needs a different store, not a button. 🆕 today.
3. **The "Ceiling history" button** — covers two settings, names one. Carried from session 64.
4. **4.12 · where the corrected handover lives** — carried **eight** sessions.
5. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **eight**
   sessions.
6. **The template picker on a firm's own coaching entry** — carried from session 60, never ruled.

⚠ **Items 4 and 5 have now been carried for eight sessions each.** Neither needs a working session.
