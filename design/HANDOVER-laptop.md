# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-07 (second session) · Laptop · branch `feat/advisor-progress`

Suite **8,058 green** (415 suites), lint **0 errors**. Three commits — `25588c9`, `7fef416`,
`5130a7c` — each through the full push gate. Everything pushed. Nothing uncommitted.

**4.68 CLOSED — the code was right and its own note was stale.** Step 4's $0 screen is
correct: the intake's `immediate` watcher means `seed` is never null, so the report's no-seed
sample path is unreachable from the page — deliberately, because `buildInputs()` sends every
field explicitly so Big Bird Grass Seed cannot reach a client. One comment block, no code
change. That flag is load-bearing for 4.62.

**4.69 FIXED AND PROVEN, STILL OPEN.** §2 asked one date to be both the start of the
assessment period and the yardstick for how current a figure is. Given 30 November 2026 the
model searched *"monetary policy … 2026 November"*, found nothing, and §§1 and 3 came back
unsourced. Reproduced twice, then split into `{{assessmentDate}}` + `{{today}}` — Mike's
wording. The same run after: **14 searches, 13 sources, 1,948 words, accepted.** Runs 13–16
are on [`ECONOMIC-ANALYSIS-TEST-RUNS.md`](ECONOMIC-ANALYSIS-TEST-RUNS.md).

**4.60 — MYOB READ NOTHING AT ALL, AND THEN READ CASH SHORT.** Mike supplied a format
comparison and pointed at two reference workbooks; running our own parser over them found
three faults, all fixed and tested. MYOB puts the account code in its own column, so
`rowShape` took the code as the label — every section came through as `4-0000` and a whole
balance sheet parsed to `proposals: {}`, accepted on screen with no error. Then cash read
**64,500 of a real 89,500**: `BANK_ACCOUNT_RE` matched "savings" but not MYOB's "Online
**Saver** Account". Then the P&L period line gave no date and no year. **4.60 has NOT moved
and must not** — both workbooks are one fictional company with identical figures, three
reports per file; they are reference material, not exports.

### 🔴 DESKTOP — read this first

- **The OpenAI account is OUT OF CREDITS** (`credit_balance_exhausted`). Economic analysis
  fails for every user until Mike tops it up, and it is what blocks 4.69's last check.
- **You used 4.68 and 4.69 for DIFFERENT work today.** Both of yours are closed on your
  branch; ours were open items and are not the same things. Second collision in a week.
- **Shared files:** `fillPlaceholders` in `server/routes/economicAnalysis.js` now takes four
  arguments (`assembled, brief, assessmentDate, now`), and `data/ai-prompts.json` §2 is
  rewritten. In `xeroReportParser.js`, `rowShape`, `BANK_ACCOUNT_RE` and the period patterns
  changed — **shared by every intake, so Xero and QuickBooks were checked and are unchanged.**
  No forecast component or intake screen was touched.

### Next

**4.69 needs one run on the no-date default path** once credits return — §2 renders correctly
there, only the model's reply is unseen. A `SECTIONS_MISSING` run today is unexplained and is
NOT this change: it is the second sighting in two days, and **a third is a real fault**.

**4.60 still waits on four real exports**, and one MYOB gap is open: the fixed-asset
categories come back empty where QuickBooks fills them. Recorded in `supportedPackages.js`.

**Eight live items.** 4.69 `activeOn` this laptop; 4.66's flag cleared — built, pushed, and
waiting on Mike.
