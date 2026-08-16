# Session Notes — 2026-08-16 · Laptop, Session 63

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,443 green / 314 suites**.
>
> ⚠ **NO APPLICATION CODE WAS TOUCHED.** Documentation only — one settled spec, one new reference,
> two supersede notices, and the list update. Nothing was built and nothing in the running app changed.

---

## 🔴 FIRST TASK NEXT SESSION — build · the design is settled

**Read [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) and build from it. Do not re-derive the analysis.**
Two sessions went into this design; the evidence is recorded in that file's §6 so it never has to be
run again.

**Only one thing in 4.16 still needs Mike, and it is not blocking the other six:** the **engagement
types** (18 authored fields) have **no page at any tier**, and the Advisory Staircase is explicitly not
it — `advisory-staircase.json`'s own `purpose` says it sets the complexity ceiling *only*. Everything
else has a page that already exists.

⚠ **DO NOT** ask about the education-gate wording (settled, session 61), **DO NOT** raise the release
number (settled, session 60), **DO NOT** author routing text for the "ten empty domains" (see below).

---

## What happened — Mike corrected the design three times, and was right every time

**Nothing was built because the plan we started with was wrong in three separate ways.** Each was
caught by him, not by a review.

### 1. "The domain support material exists — I created it"

The approved artefact said ten domains were empty and needed authoring, and the session opened by
asking who would draft them. **They are not empty.** `eoy`, `profit` and `staff` each have a live
logic tree — `eoy_meeting`, `profitability_feasibility` (27 nodes), `staff_performance` (24 nodes) —
and all seven Get-the-Job domains have one too. Two of the three reach the advisor prompt today and
work fine.

🔴 **Drafting them would have duplicated Mike's own writing tenfold**, in a second place, to drift
apart from the first. The source documents were in the repo the whole time: `Domain Support/` (46
PDFs) and `Logic Tables/` (50). `pdftotext` reads them; `pdftoppm` is not installed, so the Read tool
cannot.

### 2. "Everything should be driven from the mentor hub… the cascade rules need apply here also"

His ruling, and it widens the hub-page rule below the mentor: *"as this app seeks to empower educators
at the global group manager, group manager and firm manager levels also — each respective hub page
needs to link to AI so their changes work in practice."*

Checked end to end. The engine already loads firm overlays for six content types.
`coachingConfig.loadResolvedCoaching` is **the only resolver in the codebase that asks
`parentScopeOf`** — everything else hardcodes two levels. That is the shape to copy.

**The two middle tiers cannot be exercised and that is not ours:** `roles.js` issues no
`global_group_manager` or `group_manager`, and no firm→brand/country data exists. It fails toward
today's behaviour, never toward a guess. Both are question 5 of the master-team email.

### 3. 🔴 "Your understanding of the logic tables and domain support is incorrect — I suspect you read notes instead of code"

He was exactly right, and this is the one to remember.

> *"the step by step — here's how you do it in sequence — is provided by the domain support page; the
> if-then-else logic of which template to use in which scenario vs another template is provided by the
> logic tables."*

The code agrees with him and I had it backwards, because I paraphrased `design/features/` instead of
opening the formatters:

- **Domain Support** — `formatMaterialLines()` emits `**How to use it:**` and numbered steps.
  **187 of 194 materials carry ordered steps; 1,118 steps in total.**
- **Logic Tables** — every node in all 42 trees is `condition` → `action` → `templates[]` →
  `branches[] → next_node`.

**This is the third session in a row where trusting a written record over the code cost real time.**
[`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md) now marks every row `code ✓` or `brief only`, and six
rows still say `brief only` rather than quietly reading as verified.

### The result: 4.16 shrank, and the 65 turned out to be duplicates

Laying every domain's diagnostic-entry branches beside its logic tree: **about 55 of the 65 are a
2-to-6 line index of routing the tree already carries at higher resolution** — and the tree names the
actual templates while the branch does not. Trees hold 19, 24, 27 nodes where the entry holds 3.

**So they do not get a screen and do not get wired.** Building one would have created a second
editable copy of existing routing — the exact drift this repo keeps closing. ⚠ **It is a reading of
node names, not a test** — sound enough to plan from, not sound enough to delete from, so the spec
carries a confirm-then-ask-Mike step before anything is removed.

---

## ⚠ What is open, and honestly

1. **Nothing is built.** Two sessions of design, no code. That is the honest position and Mike said so
   himself: *"this has been the second session just trying to get the design right."*
2. ✅ **`org-capacity-planner` — raised with Mike and CLOSED, not an item.** *"there is no capacity
   planner logic — it is a single model used for firms to plan and has a tutorial video attached."*
   One model means no competing-template decision, so no tree is correct. ⚠ **But its 3 branches then
   turn out to be a `sequence`, not routing** — Base Capacity → Scenario Versioning → Client Trimming,
   in that order — so they are Domain Support content. **The one place in all 65 where
   `diagnostic_entry` holds something other than IF-THEN.** Do not assume the field means the same
   thing everywhere.
3. **The Coaching Reference has no Brief** — the only content page in the hub without one, and the
   likeliest reason its name promises coaching while its code calls it *"the menu the AI picks a
   template FROM"*. Writing that Brief is real work and is **not** part of 4.16.
4. **Six rows of `HUB-PAGE-PURPOSES.md` are `brief only`** — Distinctions, Quizzes, Adoption,
   Logic-Lab Report, Case Reviews, Adviser Network. Not code-checked. Do not rely on them.
5. **Carried, untouched from sessions 61 and 62:** six ghost template references logged at every
   startup; two broken Brief links (`tier-cascade.md` → `collaborate.md`,
   `to-do-done-and-parked.md` → `../STATUS.md`). **Now carried four sessions.**
6. **`ARTEFACTS.md` still shows item 2.6 as "☐ awaiting approval"** though it closed on 2026-08-16.
   Carried from session 62, again deliberately not folded into an unrelated commit.

✅ **Closed since session 62:** `data/dev-platform-distinctions.json` is gone — Mike ran the delete, so
Advisory Distinctions should show all 67.

---

## 🖥 FOR THE DESKTOP

**Nothing of yours moved. No application code changed anywhere this session.**

🔴 **If you are near `domainSupport.js` or `logicTrees.js`, read
[`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) first.** The plan you may have seen in
`DIAGNOSTIC-ENTRY-BLOCK.md` is **superseded** — no shared `diagnostic_entry` renderer is being built,
and the 65 branches are not being surfaced anywhere.

🔴 **Page purposes were documented wrongly and are now fixed.** Domain Support = *how to run it, step
by step*. Logic Tables = *which template, in which scenario*. If you have been working from the
Briefs, check [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md).

**Three new files:** `design/4-16-BUILD-SPEC.md`, `design/HUB-PAGE-PURPOSES.md`, and this note.
**Two rewritten:** `design/COACHING-REFERENCE-DOMAIN-ROWS.md` (now the rejected-route record) and a
supersede banner on `design/DIAGNOSTIC-ENTRY-BLOCK.md`.

---

## ☐ Open for Mike

1. **Where the engagement types live** — 18 authored fields, no page at any tier. The one item in
   4.16 that cannot start without him.
2. 🆕 **`org-capacity-planner` has no logic tree** — is that a gap to fill, or deliberate?
3. **4.12 · where the corrected handover lives, and what it describes** — carried **six** sessions.
4. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **six** sessions.
5. **The template picker on a firm's own coaching entry** — carried from session 60, never ruled.

⚠ **Items 3 and 4 have now been carried for six sessions each.** Neither needs a working session.
