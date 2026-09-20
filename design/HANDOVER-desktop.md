# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Desktop · branch `feat/firm-quiz-builder-ui`

**Item 17 stage 1 BUILT and proven. Suite 12,361 green** (572 suites), lint 0, coverage and audit
gates passed. **⚠ UNCOMMITTED at the time of writing** — see the last line.

🔴 **READ THE PLAN BEFORE STAGE 2 — IT WAS WRONG AND IS NOW CORRECTED.** Mike asked for the Firm
Manager Hub code, the stack rules and the colour/font rules to be read before building, then for the
plan to be re-checked against them. **Four findings, all in
[`features/sales-tracker.md`](features/sales-tracker.md):**

1. **The screens are a REPAINT, not a port.** Measured: **93 distinct colours, 3 on brand, and NO
   `font-family` anywhere**, against `BRAND-TOKENS.md`'s *"every screen"*. §4a. The first draft's
   *"broadly portable as they stand"* was the central error.
2. **Their dashboard needs Chart.js.** We have six hand-built SVG charts in `components/base/` and no
   chart library, by design. It is **redrawn**, not ported — so stage 3 is the hardest screen, not
   *"the easiest"* as the plan said.
3. ✅ **`va_courses` already answered multi-tenancy**, better than the plan's `firm_id` alone.
4. 🔴 **"Add the screens to the Firm Manager Hub" was WRONG and nobody asked for it.**

**Finding 4 is the one to carry.** `HUB_SCOPES = ['mentor','global','group','firm']` — **there is no
advisor scope**, and the hub sits behind `requireManagerRole`. Mike ruled this tool is *for the firm's
own advisors*, so that instruction would have built it where its own users cannot open it. **An AI
session wrote it into this Brief on 2026-09-21 and I was an hour from building it**; he caught it by
asking to see the instruction. The mechanism — a true sentence about needing *"an authenticated hub
page"* sliding into *"the Firm Manager Hub"* inside one paragraph — is diagnosed in
[`features/sales-tracker-history.md`](features/sales-tracker-history.md) §5. **Freshness is not
authority: written and read within 24 hours, same machine, neither session doubted it.**

**Estimate re-priced 12–21 → 16–25 days** (§11), per stage, with a reason per row.

### What stage 1 actually is

[`config/db-migration-sales-tracker.sql`](../config/db-migration-sales-tracker.sql) + guard
[`tests/unit/salesTrackerSchema.test.js`](../tests/unit/salesTrackerSchema.test.js) (32 tests).

**FIVE tables, not the plan's eight.** `va_sales_pipeline` (38 cols), `va_sales_coi` (22), and three
inert `va_sales_blog_*` for stage 5. **Two dropped beyond the `user`/`session` recommendation, both
because our own store already does it better:** their `auditlog` → our append-only `audit_log`; their
`appconfig` (`list:<key>` → JSON, deduped in app code) → `firm_framework_versions`, which dedupes in
the database *and* brings version history and restore free. That is the §8 lesson repeating: **read
our schema before designing one.**

**PROVEN ON THE REAL LOCAL MySQL, not by reading it** — the FK refuses an unknown firm
(`ER_NO_REFERENCED_ROW_2`), a new deal defaults to `visibility = 'private'`, and `12345678901.99` /
`0.01` round-trip exactly. The guard is **mutation-verified**: flipping the default to `'firm'`,
dropping `ON DELETE CASCADE`, and making a money column `DOUBLE` each fail it.

⚠ **NOT run against the Advisor-e database** — that is the master team's, and it needs the `firms`
table and the `__platform__` row first.

### NEXT — stage 2, Pipeline end to end

Four Restify routes on the `server/routes/clients.js` pattern, scoped on **`advisor_id` + `firm_id` +
`visibility`, both ids from the verified JWT and never from the body.** ⚠ **`firm_id` alone is NOT
enough** — that returns every advisor's deals to every colleague, the exact fault §8 exists to stop.
The page is an **advisor page** under `pages/sales/`, repainted to brand.

🔴 **ONE QUESTION OPEN AND IT IS MIKE'S:** does a firm manager see their advisors' pipelines by
default? `visibility` carries either answer with no schema change; stage 4's Team screen is where it
shows. Nothing widens the default until he rules.

**LAPTOP — shared files I changed:** `to-do-items.json` (item 17's note, touches and comment only —
three lines, verified by diff). **Your 7.5, 15.1 and 15.7 are untouched**, and so is every other
item's `activeOn`.

⚠ **UNCOMMITTED WHEN THIS WAS WRITTEN.** Five files: the migration, its test, the Brief, the history
file and `to-do-items.json`, plus the generated `design/CODE-SIZE.md` from `npm run handbook`. **If
they were not committed after this note was written, the work is only in this working tree.**
