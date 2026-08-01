# Session Notes — 2026-08-02 · Laptop, Session 24 (the stranded programme comes home)

> **Nothing is unsaved.** `feat/advisor-progress` = `origin` at `08cdf75`, **7 ahead / 0
> behind `master`**, working tree clean. Suite **3,665 green / 222 suites**, lint 0 errors,
> audit gate PASS.
>
> **🔴 DESKTOP: [PR #30](https://github.com/advisor-e/Virt-Advisor/pull/30) is OPEN against
> `master` and not yours to merge blind — read the two rulings it is waiting on below.**
> It brings ~80 files including **`ReportShell.vue` and `REPORT-LAYOUT-REFERENCE.html`**,
> which change what "a model screen looks right" *means*. If you are building anything in
> the Model Library, wait for it or you will build to a standard that is about to move.
>
> **Your `feat/firm-quiz-builder-ui` is 3 ahead of `master` and unmerged.** Same blind spot
> as 2026-08-01 — logged, still unfixed.

---

## The one thing the desktop most needs to know

**Three finished features had been sitting outside `master` for two weeks, and the reason
nobody noticed is the reason we keep not noticing.**

Cost of Capital (WACC), Lease vs Buy and the Loan Estimator were **built, tested and
finished** on `feat/business-performance-report`, last touched 2026-07-29. So was
`components/base/ReportShell.vue` — the single source of the model visual standard — and
`design/REPORT-LAYOUT-REFERENCE.html`.

That last file is the point. **The project's binding rule is that every model copies that
layout skeleton, and the skeleton has never existed in the shared code.** Any model built
from `master` alone was working to a standard it could not read.

Mike, told what was there: *"yes, cost of capital is definately supposed to be there —
bring it back."*

It is now merged onto current `master` and raised as PR #30 from a frozen snapshot
(`release/report-programme-2026-08-02` @ `033657d`), never from the live branch — the
PR #23 → #24 lesson.

---

## Three collisions in one merge, and what they have in common

Every one was a rule written on `master` meeting files written on the stale branch. Every
one was **green on both branches alone** and failed only once merged. This is
[`cross-branch-rule-collision`](ACTIONS.md#cross-branch-rule-collision), and it now has
four instances.

**The cost scales with separation.** Two weeks apart produced three collisions. The
2026-08-01 merge, two days apart, produced one.

1. **The routing map** lost count of the Loan Estimator's two data files. `npm run routing`.

2. **The CSS style-block guard — and this one was the guard's fault, not the code's.**
   `ReportShell.vue` **quotes** `` `<style scoped>` `` inside its own documentation; it is
   the component whose entire purpose is to stop each screen hand-writing one. The
   extractor's unanchored `/<style…>/` matched **that sentence**, then ran on to the real
   `</style>` 98 lines below, so postcss was handed a paragraph of English
   (`Unknown word` at 1:1).

   **The real stylesheet was never parsed at all.** That is the worse half: a false failure
   on a healthy file, concealing a genuine blind spot. Both tags are now anchored to the
   start of a line. **Verified it does not blind the guard** — across all 82 `.vue` files
   both versions find blocks in the same 60 files, disagreeing on exactly the one intended.

3. **`server/report/` fell ONE branch under its 85% coverage gate** (790/930 = 84.94%) when
   three models joined the folder. **Closed with tests, not by moving the gate** — lowering
   a threshold to fit the code is the "ratify the drift" move this project does not make,
   and it would have been over a single branch. Six tests on guards that existed and had
   never run: a number arriving as **text**, as **NaN/Infinity**, a **zero servicing
   interval**, a **zero-month loan**, and **0% finance**.

---

## The mistake worth more than the merge

**A half-staged commit passed lint, 3,955 tests and the audit gate, and shipped red.**

`CONTENT-ROUTING.md` and `componentStyles.test.js` were already staged **by the merge**
(as files arriving from `master`). Both were then edited to fix the failures above, and
only a third file was `git add`-ed. Commit `741eb5c` therefore contained the **old regex
and the stale routing map** while every gate reported green.

**`.husky/pre-commit` validates the WORKING TREE, not what is being committed.** Every gate
was honest; none of them was testing the commit.

This is the same defect as the CSS guard found the same hour, and as the 2026-07-31
`nuxt build` failure that "shipped green": **a check pointed one inch to the left of the
artefact.** Caught by diffing the committed blob against the working tree; fixed by
amending to `033657d` (nothing had been pushed).

Logged as [`hook-tests-worktree-not-commit`](ACTIONS.md#hook-tests-worktree-not-commit),
**P1**. The proposed control — refuse a commit while a tracked file has unstaged edits — is
written up and **deliberately NOT built**; it needs its own approval.

**Until it exists the rule is manual:** after any commit that fixes a merge, diff the
**committed blob**, not the working tree.

---

## Two things waiting on a Mike ruling

1. **A silent-default defect in `leaseVsBuyModel.js`.** A numeric field that is **absent**
   is named in `defaultedInputs` (the R8 ruling). A field **present but unusable** —
   `deposit: 'eight thousand'` — is silently replaced by the sample and named **nowhere**,
   so the caller is told the figure is theirs when it is ours. The model sits behind a
   public route taking raw browser JSON. **Pinned as a `⚠ CURRENT BEHAVIOUR` test so a fix
   fails that test rather than passing quietly. Found, reported, not fixed.**

2. **The pre-commit control above.**

---

## Corrected on sight

The `stranded-report-programme` entry listed `components/FirmDashboard.vue`,
`server/routes/firm.js` and `scripts/sync-video-minutes.js` as work to rescue. **Wrong.**
`master` deleted all three **on purpose** (`d3c4e5c`, `b1b4432`); the merge honours those
deletions.

**The trap, worth carrying:** measuring absence and reading it as loss. A file missing from
`master` is either work that never arrived or work deliberately removed, and **only the
deleting commit tells you which**. Checked before committing, because a merge that silently
resurrects deleted code is worse than one that drops it.

---

## Also recorded

- **`STATUS.md` was stale by ~120 rows** — 64 outstanding / 118 completed on the page,
  97 / 208 in reality. Regenerated. This is exactly the already-logged "STATUS.md goes stale
  silently and nothing on the page says so".
- **No `--no-verify` was used at any point**, including on the merge commit. (Contrast
  2026-08-01, where it was used once unasked.)
- `feat/business-performance-report` is **186 ahead of its own remote and unpushed**. Its
  tip `033657d` is byte-identical to the pushed snapshot, so **nothing is at risk** — only
  the branch name is not backed up.

---

## Where the work stopped

Nothing is half-finished. The session ends on a clean tree with everything pushed.

**Next, in order of consequence:**

1. **Mike reviews and merges PR #30.** Nothing reaches `master` until he does, and it gets
   harder the longer it waits.
2. **Then `feat/advisor-progress` merges `master` back in** — expect the same
   `ACTIONS.md` append-vs-append conflict, resolved the same way: keep both sides.
3. The two rulings above.
