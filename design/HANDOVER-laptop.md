# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-23 · Laptop · branch `feat/advisor-progress`

**Clean and pushed at `7eb0ee75`. 617 suites / 13,585 tests green, lint 0 errors, audit gate
PASS. 4 ahead, 0 behind `master`** — under the 10-commit threshold, so no PR is due yet.

### 🔴 THE PLANNER'S CONCEPT COUNT IS 46, NOT 52 — AND THE 52 WAS NEVER WRONG

Mike stood stage 8 down for the twelve frameworks an advisor could not run. **Eleven of the
twelve carried `page: 2`, their deck's AGENDA page**, so nothing pointed at the slide holding
the content. He deleted **eight** of them — *"they are likely to be repeats"*, and they were:
two are literally bullets on the framing page below. Two pages that were **never in the 52**
came in the other way. Brief §0 has the whole account; don't re-derive it.

⚠ **IF YOU TOUCH A CONCEPT, LOOK AT THE SLIDE.** A pass that matched concepts to slides by
comparing **extracted titles** produced ten confident rows and was wrong on most of them.
Mike killed it in four words. Step 1 of the drawing method is LOOK.

### What is built, and the one thing that is new machinery

**`source: 'framing-page'`** is a third row kind, and **a concept can now have more than one
teaching sheet** — Collaborative Thinking has two. The registry holds a **LIST** per concept;
the run screen, the concept card and the printed plan loop `conceptSheetCount`. Before this a
second sheet would have overwritten the first, silently.

🔴 **A PAGE WHOSE WHOLE CONTENT IS A DRAWING WAS BEING DROPPED FROM THE CLIENT'S PLAN.**
`.spd-page.is-teach` demanded a summary or a prompt — correct while every concept had one, and
both new concepts have neither. Fixed. Three more faults of that family are in the commit.

### SHARED FILES I TOUCHED — check before you edit

`components/strategy/` — `StrategyConceptGraphic.vue`, `StrategyTeachingSlide.vue`,
`StrategyConceptCapture.vue`, `StrategyPlanDocument.vue`, `StrategyScopeMenu.vue`,
`concepts/index.js` · `server/utils/strategyFrameworks.js` ·
`server/utils/strategyCaptureForms.js` (the banded-grid heading rule — all 21 templates
snapshotted and 21 of 21 identical after) · `scripts/build-concept-graphics.js` ·
`data/strategy-frameworks.json` · `design/ARTEFACTS.md` · `AGENDA-HELPS-LINES.md` ·
`features/to-do-items.json` · `to-do.md` · five test files.
**Your quiz-builder, currency and register files untouched.**

### Filed today, all on Mike's yes

**15.17** rewritten to what is left: **one drawing** — Define the Cultural Core Values, Org
Review p11. **15.18** his worked answer never reaches the advisor on a ruled table.
**15.19** a drawing awaiting his approval cannot be committed, so the suite goes red — **it
blocks 15.17, so read it before drawing anything.** **5.3** his two spreadsheets are
calculators with nowhere to live.

### In hand here

**15.17**, `activeOn` laptop. Nothing is half-finished and nothing waits on Mike to continue.
