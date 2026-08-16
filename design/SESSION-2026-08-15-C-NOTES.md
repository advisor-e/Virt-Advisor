# Session Notes — 2026-08-15 (C) · Laptop, Session 58

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,321 green / 308 suites**, lint 0 errors, **45 ahead / 0 behind `origin/master`**.
>
> ⚠ **Application code was touched in exactly one place:** seven strings in
> `data/logic_trees.json`. Everything else is tooling (`scripts/`), tests and documents.
> `server/`, `components/`, `pages/` and `store/` are untouched.

---

## 🔴 FIRST TASK NEXT SESSION — ask Mike, do not pick

**The live list is [`features/to-do.md`](features/to-do.md), and it is six items plus one.** Do
**not** rank it yourself; his order is in the file and his ordering rule is §3. Two items wait on
him (2.6 and 2.9) and both are one answer each — 2.6 needs a single **yes**, and the plain-English
explanation is already written in [`features/to-do.md`](features/to-do.md).

🔴 **One thing is off the list entirely and it is his to close:** 2.1 was parked because the
release number changed — *"we will need to issue a new release. we missed last weeks deadline and
have added new features since."* **Nothing now covers cutting that newer release.** The gap is
deliberate. Raise it; do not file an item for it.

---

## What happened — seven commits, and one story

**Item 4.14 was built, then rebuilt three times, because Mike used it.**

| Commit | What |
| --- | --- |
| `7449313` | Phase 2 — the To-Do page becomes a control, 8 deviations from the mockup named first |
| `144ddb5` | The UTC date bug he found in the first minute |
| `a003c95` | Phase 3 — `npm run to-do`, and its refusal to lose an item |
| `41141d6` | Rebuilt on his rule after a row moved out from under him |
| `9d7409a` | His calls applied — 4.14 and 4.4 closed, 2.1 parked |
| `2d6c3be` | The seven Seminar branches now name **Design & Deliver** |
| `abefc6a` | His ordering rule — technical first, fine tuning after UAT |

---

## 🔴 The lesson, and it is not a small one

**Forty-one tests guarded that control. Every fault that mattered was found by Mike, in a browser,
in about twenty minutes.**

1. **A UTC date stamp.** His first save came back dated the 14th; he saved it at 11:36 on the 15th.
   He is **twelve hours ahead of UTC**, so every save before midday recorded yesterday. No test
   could have caught it — it needed a person, in a timezone, pressing a button.
2. **A row that vanished mid-decision.** He marked an item Park and it sank to the bottom before he
   could type the reason. *"The handbook is clunky and confusing… this is very poor design."*
3. **A choice he could not make.** Our two-button "use the project's list / keep mine" — not in the
   mockup, ours — offered a decision with no information attached to it.

> 🔴 **An approved artefact is approved for how it LOOKS, not for how its logic behaves against
> real data.** Fault 2 came straight from the approved mockup, where every call had already been
> made before anyone looked at the screen. Check the behaviour, not only the appearance.

His rule is now [`features/handbook.md`](features/handbook.md) rule 7 — **"nothing leaves my sight
in terms of order etc until I click save"** — and it is mutation-verified: reintroducing the exact
line he hit turns the suite red.

---

## 🔴 The other lesson — the label was the blocker

**2.3 had been carried since session 48.** It was raised with him three times as *"Seminar's seven
lines"*. His comment this session: *"again - i don't know what you need from me."*

He was shown the seven actual sentences. He answered in one line: **the page is "Design & Deliver."**

All seven now pass the gate intact. Corpus: **27 whole / 14 partial / 14 withheld → 34 / 8 / 13.**

> **Never raise an item by its label twice.** Paste the content.

---

## ⚠ What is open, and honestly

1. **4.15 — 21 branches still name a page nobody can open** (`fmc_`, `cas_`, `fbp_`, `ol_`). Filed
   on his instruction, **ranked last** under his ordering rule. Each needs the **real** page name,
   which is his to give. Put the sentences in front of him, not the label.
2. **Four items carry a score of 5 whose stated category is false.** He used 5 to mean *do this
   now*; §2 defines it as security/data integrity, and the data file writes that phrase from the
   score. *"Reply to Carl about npm install"* is labelled a data-integrity item in the repo. **His
   scores were not adjusted.** Decoupling the label from the score was offered and he has not
   answered.
3. **22 of 26 Handbook Briefs have never been checked against the code.** Three have now been
   checked in total. **All three were wrong.**
4. **Two Brief links are still broken** — `tier-cascade.md` → `collaborate.md`, and
   `to-do-done-and-parked.md` → `STATUS.md`.

---

## 🖥 FOR THE DESKTOP

**Almost nothing of yours moved.** Logic Lab, the firm-side screens, every component and every
server file are as you left them.

**The one application-code change is seven strings** in `data/logic_trees.json`:
`"Get Seminar template"` → `"Design & Deliver template"`, on the seven `gs_*` branches. If you are
holding an older copy of that file, take ours — the old name matches no page in the library and
three tests now fail if it returns.

**New tooling you will want to know about:**

- **`npm run to-do`** regenerates the ranked table in `to-do.md` from `to-do-items.json`.
  🔴 **Do not hand-edit that table** — it is between `<!-- BEGIN GENERATED -->` markers and your
  edit will be overwritten. Edit the JSON.
- **`npm run to-do -- <file>`** applies a list Mike saved from the Handbook. It refuses to remove a
  settled item until its closure is written on `to-do-done-and-parked.md`.
- `to-do-items.json` is now **script-formatted**. Do not hand-tune its layout.

**Documents that changed and could conflict:** `features/to-do.md` (heavily — the table is
generated now, and §3 carries his ordering rule), `features/to-do-items.json`,
`features/to-do-done-and-parked.md`, `features/handbook.md` + its history, `ACTIONS.md`.

---

## ☐ Open for Mike — two, and one gap

1. **2.6 · `advisor_note`** — one word: yes. The explanation is written and he has read it.
2. **2.9 · the education-gate wording** — his own design, needs the on-screen words.
3. 🔴 **The new release number** — 2.1 is parked and nothing replaces it. His call.
