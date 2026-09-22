# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-23 · Laptop · branch `feat/advisor-progress`

**Clean and pushed. Suite 13,464 green (610 suites), lint 0 errors, audit gate clean.**
**1 commit ahead of `master`, not merged.** PRs #117 and #118 merged earlier today.

### 🔴 READ THE CODE, NOT THE NOTE. Today cost a day because nobody did

An approved artefact said the 32 concept drawings *"already carry this exact frame and
mark"*. **Not one did** — rounded `rx=8`, inset 0.333%, bar 0.667%, foot unbroken, against
Mike's square 0.542%/0.986% with the foot in two segments. Decision A hands a teaching page
the drawing's frame, so every one showed the wrong border and suppressed the right one.
`StrategyPlanFrame.vue` was correct throughout and never needed a line changed. **A premise
about another artefact is worth nothing until you measure it.**

### 🔴 THE 32 DRAWINGS ARE GENERATED. NEVER HAND-EDIT THEM

Change `design/mockups/strategy-concept-*.html`, then `node scripts/build-concept-graphics.js`.
A hand-edit was tried today and the drift guard caught it in under a minute.

### Page numbers: a task's number is its Handbook page

Mike's ruling. [`features/README.md`](features/README.md)'s `#` column is the register;
[`PAGE-NUMBERS.md`](PAGE-NUMBERS.md) holds the rule. **Take a new number from
`npm run check:branch` — page 54 is next.** No live task was renumbered. New page 16,
White-Label & Firm Brand. `5.3` → `22.1`.

### Also built

The firm brand now reaches Run session and Objectives, not just the plan. Two generated flags
decide what a teaching page prints — `CONCEPT_TITLED` and `CONCEPT_PROMPTS_ECHOED`, both
measured from the artefacts, never from a concept's name. **15.12 and 16.2 closed**; 0 of 17
pages over A4, where 2 of 25 ran over.

### SHARED FILES I TOUCHED — check before you edit

`scripts/build-concept-graphics.js` · `components/strategy/concepts/*` (all 33, generated) ·
`StrategyPlanDocument.vue` · `StrategyTeachingSlide.vue` · `StrategyConceptCapture.vue` ·
`StrategyCaptureCard.vue` · `pages/strategy-planner.vue` · `design/features/README.md` ·
`ARTEFACTS.md` · `ITEM-NUMBERING.md` · `to-do-items.json` · `scripts/ref-ceiling.js` ·
`scripts/check-branch-state.js` · `scripts/handbook-shell.html` · `scripts/build-handbook.js`

### In hand here

**15.1**, stage 8 — a manager adds a concept, mentor tier first. Nothing waits on Mike.
