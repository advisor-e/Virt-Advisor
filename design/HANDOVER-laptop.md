# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-23 · Laptop · branch `feat/advisor-progress`

**Clean and pushed. 617 suites / 13,538 tests green, lint 0 errors, audit gate PASS.**
**0 ahead, 0 behind `master`.** PRs #120, #121 and #122 all merged today — `master` holds
every commit from both machines and no pull request is open.

**Your branch is 0 ahead / 10 behind.** It holds nothing `master` does not, so one merge
levels you. The pre-push hook refuses a push while you are behind, so you cannot skip it.

### 🔴 THE HANDBOOK GUARD WILL FAIL YOUR BUILD, AND IT IS MEANT TO

**New, and it has already caught you once.** Link a `design/` document from a Brief and it
must be listed on that feature's row in [`features/README.md`](features/README.md), or
`tests/unit/buildHandbook.test.js` goes red and names the file. Your `ZDR-INTAKE-EMAIL.md`
tripped it within an hour of it existing; it is now on Meeting Review's row.

**The fix is always the same: add `· [Title](../YOUR-DOC.md)` to the History column of the
feature's row.** Never relax the assertion.

**Why it exists.** Mike, 2026-09-23: *"all design and task notes relating to any specific
feature is ONLY located on that page so you never have to read tasks, designs or notes that
relate to a different feature."* It was not happening — the Briefs link 80 design documents
and the Handbook carried **11**. The other 69 rendered as a dead filename, `PLANNING-TEMPLATE-CENSUS.md`
among them. Now 80 of 80, each behind its own gate **on the feature's page**. They take no
page number: `PAGE-NUMBERS.md` says a page is a SUBJECT, and a note about a feature is not
a new subject.

### 🔴 7.13 IS DEAD. DO NOT REBUILD IT — AND THE PROOF IS ONE LINE

You deleted it (`3660ba77`); this machine built for it anyway and **reverted in full**
(`59075e87`). **`VirtualAdvisor.vue` builds MarkdownIt with `linkify: false`**, so a model's
page path reaches the advisor as plain text they read and type. A wrong one costs a retype,
not a broken link. Making it clickable was offered, proved, and refused by Mike — *a
confident click into a dead page in front of a client is worse than visible text that fails
noticeably.*

✅ **`CLAUDE.md`'s debugging command 2 is fixed.** The revert had restored it to a
`search_content` filename that is not in the repo, so the one command that reads the master
library's own row crashed. It now finds the newest export by pattern through
`server/utils/masterExport` — whose header says it exists *"precisely to retire those
hardcoded names"* — and prints a plain line instead of throwing on a clone where the export
is gitignored. Run and proved before committing. ⚠ A bare `return` is illegal in `node -e`;
the committed form is if/else.

### Closed and filed

**15.6 closed** — all twenty capture-form pairings resolve through `resolveTemplate`. Both
halves were already fixed: your four deck pages (34/36/38/40) on 22 Sept, and
`TEMPLATE_ALIASES` for the other four. 🔴 **Its numbers had been checked by string-comparing
`captureTemplate` against ONE of the two table files. There are two and a resolver between
them** — `strategyCaptureForms.js` says it outright: *"compare through a resolver, never by
hoping two strings match."*

**15.16 filed, score 4, waits on Mike** — 32 concepts carry no capture form and an advisor
teaches **22** of them with nowhere to record the client's answer. Not a wiring bug: every
concept naming a form IS wired. A form was never chosen, and the census says choosing one
outside its 24 templates is a design decision, not a reading.

### SHARED FILES I TOUCHED — check before you edit

`scripts/build-handbook.js` · `design/features/README.md` (25 rows gained supports) ·
`tests/unit/buildHandbook.test.js` · `features/to-do-items.json` · `to-do.md` ·
`to-do-done-and-parked.md` · `features/advisory-engine.md` (reverted to your version) ·
`CLAUDE.md`. **Your quiz-builder, currency and model-choices files untouched.**

### In hand here

**15.1**, stage 8 — a manager adds a concept, mentor tier first. Nothing waits on Mike.
