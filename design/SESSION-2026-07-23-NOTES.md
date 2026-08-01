# Session Notes — 2026-07-23 · Laptop (Business Performance Report)

> **Documentation only — no application code was touched, nothing was built.** Suite
> **1,626 green / 116 suites**, lint 0 errors, on Node 14.15. Branch started the session
> level with `master` (0/0) and ends **2 commits ahead**, working tree clean.
> **Desktop: `git fetch origin && git merge origin/master` before anything else.**

---

## The one thing the desktop most needs

**There is now an `add-a-report` skill** (`.claude/skills/add-a-report/SKILL.md`), and it
is worth knowing about even on the Course Builder branch, because the principle it encodes
is the one that bit hardest last session.

It does **not** restate the 8 steps of [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md) — it
points at that document as the single source and carries only what a document cannot: the
build order, the per-change permission discipline, and the traps that have actually cost
time here. Duplicating the steps would have produced two half-true instruction sets, which
is the exact failure `single-source-wiring` exists to prevent.

That completes the report-scaffolding workstream. **Nothing optional is outstanding.**

---

## What shipped

**`add-a-report` skill** (`2907bc3`). Named `add-a-report`, not the plan's `/add-report`,
to match the sibling `add-a-domain`. Also corrected a stale tick-box: `ACTIONS.md` showed
Phase 4 as open while the line above it said the workstream was complete and named the
finished document. The work was genuinely done; the box was never ticked.

**Loan Estimator plan** (`d0ca0e5`) — [`LOAN-ESTIMATOR-PLAN.md`](LOAN-ESTIMATOR-PLAN.md).
Mike picked this from the ★ triage list and ruled **full scope**.

---

## ⚠ The Loan Estimator is much bigger than its catalogue row says

The catalogue summarises it as *"repayments, interest and total cost across loan options."*
That describes about a tenth of the file. `design/report-source-models/The Loan Estimator.xlsx`
is a **bank lending assessment** in five parts — rule table · security position ·
serviceability · repayment schedules · business block — across **16 NZ-specific security
classes** (Fonterra shares, dairy and sheep/beef farms, glasshouse horticulture). It is
comparable in size to the Business Performance Report.

*Worth generalising: the other eleven `STATUS_SOON` catalogue rows are one-line summaries
written before anyone opened the workbooks. Do not size one of those from its summary.*

**Four decisions are open and gate specific phases** — all logged in `ACTIONS.md`, not just
in the plan:

- **Tax tables (gates Phase 3).** The workbook hardcodes income tax bands with **no
  effective date**. The NZ bands look like **2024–25** thresholds, so probably stale in
  2026 — **not verified against current IRD rates, deliberately: that check is part of
  Mike's decision, not a detail to quietly settle.** This is the one part that goes wrong
  with the passage of time rather than because of a defect, and silently.
- **Australia (gates Phase 3).** **Every Australian federal rate in the workbook is `0.0`**,
  all five bands, while state rates are populated. Cannot be intended. Recommendation: NZ
  only for v1, Australia visibly absent rather than present-and-zero.
- **Verdict wording (gates Phase 4).** The sheet prints "Looking Good!" / "Doesn't Look
  Good" about a household's borrowing capacity. A client may hear a lending decision.
- **One screen or a stepped flow (gates Phase 4).** Part C alone has ~25 inputs.

**Three anchors hand-verified against the workbook**, so a future session can prove the port
is faithful: monthly repayment `5747.094633` (re-derived from the annuity formula, not just
read off the sheet), residential stress payment `9026.370957`, household surplus
`105.7495571` with the verdict flipping above 250.

---

## Defect found in the source workbook (not fixed — owner decision)

`Interest` sheet, cells `AA8`–`AF8`: the **Reducing-loan "Balance Outstanding" is wrong from
year 5**. `AA8` reads `O90` (cumulative *interest*) and `AB8`–`AF8` read `P102`–`P150`
(cumulative *principal*), where all six should read column `N` — as the first four correctly
do. Displayed: 960,000 → **276,719 → 180,000 → 210,000 → … → 300,000**. Correct: 930,000 →
900,000 → … → 780,000. A balance that falls, collapses, then climbs is impossible, and an
advisor could show it to a client.

**Only on the Reducing basis** — the default Table basis is correct throughout, which is why
it has survived. Reproduce-and-flag per the recipe (same treatment as the Working Capital
`D20` flaw); if corrected, the source `.xlsx` needs correcting too so the two do not diverge.

---

## Housekeeping / still open

- **Nothing is half-finished.** No Loan Estimator code exists and none was started — the
  plan is written but **not yet approved to build**.
- **`v0.6.0` has still not been sent to the master team** (Mike's end-of-week item, carried
  from 2026-07-22). `master` has moved a long way past that tag.
- **The advisor-chat `[[TEMPLATES: …]]` change (`d791a9a`) is still unverified live** —
  carried from 2026-07-22. No real conversation has been run; this machine has no
  `OPENAI_API_KEY`. Do one conversation wherever a key exists.
- **No dev server was started this session** — nothing needed running.
- A commit message was written with PowerShell quoting inside the Bash tool and picked up
  two stray `@` characters; caught and amended before pushing. Use `git commit -F <file>`
  for multi-line messages on this machine.
