# Session Notes — 2026-08-13 · Laptop, Session 50

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,114 green / 300 suites**, lint 0 errors, `nuxt build` green, **0 ahead / 0 behind
> `origin/master`** — the branch and `master` are the same commit.
>
> ✅ **`v0.8.0` IS CUT AND PUSHED** — `e3b7a21`, the merge commit of
> [PR #41](https://github.com/advisor-e/Virt-Advisor/pull/41). Confirmed on `origin`.
>
> ⚠ **No dev servers were started or restarted this session.** Ports 3000/4000 were free
> throughout; the `nuxt build` was run in that window.

---

## 🔴 THE ONE THING TO READ — a hazard repeated in prose is not a task

**A save the database REFUSED was written to a scratch file and reported as saved.** Fixed
today (`d3d27a8`). The mechanism is in
[§dev-fallback-absorbed-a-refusal](ACTIONS.md#dev-fallback-absorbed-a-refusal) — read the row,
not this note.

**Why it survived is the transferable part.** It is named as a *hazard* in **five** places in
`ACTIONS.md` and in `ADVISOR-E-DESIGN-LOGIC.md` §6, which itself observes it had been *"written
down three times"*. Every one of those describes it as something to avoid **by seeding a `firms`
row**. **Not one logged it as a code defect.** The record kept warning about the symptom while
nothing owned the cause. Writing a warning is not the same as opening a task, and only the task
gets done.

---

## 🖥 FOR THE DESKTOP — merge `master` BEFORE touching any of these

`master` moved **74 commits** in one go (PR #41), and today's fix touched **14 server files**,
several of which are the desktop's active ground. Every change has the same shape — a dev
fallback that took no argument now takes the caught error — so a conflict will look trivial and
**resolving it the wrong way silently restores the fault**.

- [`server/routes/firmManager.js`](../server/routes/firmManager.js) — 🔴 **the big one.** The
  module-level `const IS_DEV` is **gone**, replaced by `devFallbackOk(err)` at 39 call sites, and
  the require moved into the main import group. If a merge brings back a bare `IS_DEV`, the fault
  is back and nothing will fail.
- [`server/utils/`](../server/utils/) — `caseStore` · `clientStore` · `courseStore` · `coaching` ·
  `activityStore` · `firmContent` · `firmDistinctions` · `firmQuizzes` · `firmStaircase` ·
  `firmsDirectory` · `platformDistinctions` · `templateCheckRulings`. Same one-line shape in each.
- **New:** `server/utils/dbFailure.js` · `tests/unit/dbFailure.test.js`.
- [`tests/unit/currency.routes.test.js`](../tests/unit/currency.routes.test.js) — its
  "production mode" block was **changed on purpose**. It used to restore `NODE_ENV='test'` before
  calling the route, so production was never in force when the assertion ran. Do not "fix" it back.
- [`design/ACTIONS.md`](ACTIONS.md) — three new rows at the top, two rows amended.
- [`design/USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md) — substantially rewritten.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near them.

---

## What else shipped

- **`a8f0591` — the master-team handover corrected.** Its Part 3 was still asking Advisor-e to
  choose between two database shapes for the group layers; Mike settled that a **third** way on
  2026-08-09 (reserved scope ids on the existing `firm_id` column, no schema change) and it is
  built. Either answer they gave would have been the wrong build.
- **`34fb586` / `1b72522` — v0.8.0 notes and ledger.** The notes lead with the three traps rather
  than a feature list. The ledger row was written **before** the tag existed, marked "NOT YET CUT"
  in its first words, and backfilled the moment it was — written-ahead-and-marked is honest;
  written-ahead-and-unmarked would have claimed a release that did not exist.

---

## 🔴 RULED TODAY (Mike) — roles this app deliberately does not model

> *"real roles but do not have need for special pages. All document cloning and major access
> permissions granted by the roles you have been given. There is also a Curator role but again,
> no need to concern this app code."*

**Global Coach, Group Coach and Curator are REAL Advisor-e roles.** They need no pages here and
no code here. Recorded in `USER-LEVEL-CASCADE-HANDOVER.md` Part 1 **verbatim**, because the trap
runs both ways: an earlier reading of that file treated the coaches as staleness to be tidied
away. **Do not add them to the code, and do not delete them from the document.**

---

## ☐ Open for Mike

- ☐ 🔴 **SEND THE MASTER TEAM THE TAG NUMBER.** One message; they cannot pull what they do not
  know exists. v0.6.0 was never pulled at all. Three lines: pull the **tag** `v0.8.0`, **no
  `npm install` this time**, read the notes first.
- ☐ **The four-tab gap — and it is +2 / +2, not "+3"** *(corrected after eight sessions)*.
  See [§tab-gap-is-two-and-two](ACTIONS.md#tab-gap-is-two-and-two).
- ☐ **Get Seminar's 7 lines** — reword toward Public Speaking. *(Carried 48–49.)*
- ☐ **Management Reporting Annual Plan** — Mgt Annual Plan *or* Annual Board Plan. *(Carried 49.)*
- ☐ **Rule the five roll-up labels** · **Decide `advisor_note`**. *(Carried 45–49.)*
- **Ask the master team for the two role values + which group a manager manages.** *(Carried 39–49.)*
- **Raise the export gap — SEVEN tools.** · **Reply to Carl about `npm install`.** *(Carried.)*
- **Template Check queue and the Logic Tables rewording are PARKED** — Mike, 2026-08-13: sort them
  after UAT testing. Do not re-raise as open work.

---

## Two things I got wrong, recorded because the error is the useful part

1. **I raised the mirror-vs-export availability gate as a live fault. It is not one.** Measured:
   0 tree branches and 0 prose fields reference any of the 18 mirror-only titles. The reasoning was
   sound and the conclusion was wrong. Mike's response — *"prove to me its not working first"* — is
   the correct default, and the measurement is now in
   [§templates-mirror-gate-measured](ACTIONS.md#templates-mirror-gate-measured) so nobody re-derives
   it. **Raw substring counts looked alarming and were worthless.**
2. **I told Mike merging to `master` was his job.** It is not, and never was: PRs #33–#40 were all
   merged from this account, and the Working Agreement says `master` is reached *by pull request*,
   not *by Mike personally*. He had already approved the merge. **Inventing a gate and handing him
   work that was mine.**

## Commits

- `a8f0591` · `d3d27a8` · `34fb586` · `e3b7a21` (PR #41) · `1b72522` · `1c35edd` (PR #42)
