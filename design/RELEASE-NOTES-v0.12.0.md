# Release Notes — v0.12.0

**Tag:** `v0.12.0` · **Cut:** 2026-09-13 ·
**Previous release:** [`v0.11.1`](RELEASE-NOTES-v0.11.1.md) (`e7e6271`, 2026-09-10)

**92 commits since v0.11.1**, all from the laptop.

✅ **NO `npm install` — `package.json` differs from v0.11.1 only in `version`**, and
`package-lock.json` only in the same field. Nothing was added, removed or moved. A fresh clone
still follows the npm 8 / Node 14.15 instructions in the
[v0.11.0 notes](RELEASE-NOTES-v0.11.0.md).

✅ **No database table changed.** `config/db-schema.sql` is byte-identical to v0.11.1.

**Verified at tag time, on the tagged commit:** 10,507 tests green across 500 suites · lint
0 errors · critical-audit gate PASS · `nuxt build` exit 0 · **and the backend started and was
seen to listen**, the check added after v0.11.0. Runtime target unchanged: **Node 14.15**,
backend CommonJS, Nuxt 2 / Vue 2 / Restify 9.1.0 per the Stack Constitution.

---

## 1. Six new models, and the Model Library has no empty cards left

🔴 **Every card in the Model Library now opens something.** The three that said *"coming soon"*
and did nothing are built. **Eighteen of eighteen models are live.**

| Item | Model | What it answers |
|---|---|---|
| **4.88** | **High-Level Budget** | A top-down budget with actuals and cash-flow variances |
| **4.90** | **Retirement Review** | Whether the plan funds the retirement the owner wants |
| **4.93** | **Mid-Level Budget** | The same budget with timing — sales and purchases spread across up to five months |
| **4.94** | **Stock Purchasing** | Ranks what to buy on five criteria, then checks the client can afford the order |
| **4.95** | **Sales Dashboard** | Where the sales and the margin come from, and how they move |

Each was **drawn first, every decision put to Mike one at a time and ruled, and the drawing
approved before any code** — the drawings are in [`mockups/`](mockups/) and registered in
[`ARTEFACTS.md`](ARTEFACTS.md), where the build is recorded beside the drawing **with every
difference between them named**.

**Each carries a golden test written from its source workbook's own cached values, with the
cell reference beside every expected number**, so any figure can be re-checked by hand against
the spreadsheet it came from.

## 2. 🔴 Where our figures deliberately differ from the source spreadsheets

**Several of these workbooks contain real errors, and we do not reproduce them.** Every
deviation was put to Mike on the drawing and ruled by him before any code was written. Each is
pinned in a golden test **with the workbook's own figure recorded beside ours**, so the
difference is auditable rather than silent.

**The three in the Sales Dashboard are worth reading, because none of them is visible in the
workbook's own sample data** — each hides behind a coincidence in the sample:

- **A sale counted in no band at all.** The band totals sum a sale's money inclusively but two
  of the band *counts* use strict inequalities. A sale of exactly **$2,500, $2,501 or $5,000**
  adds its value to a band and is counted in none — so the transactions column disagrees with
  the money beside it, and the Total disagrees with the sum of the rows. Round numbers are
  exactly what real invoices land on. Ours reconciles.
- **One list read to five different end points.** The headline sales count reads a list **21
  rows shorter** than the money does. Nothing shows at 140 rows; at roughly 491 sales the count
  stops rising while the money keeps going, so the **average sale value climbs for no reason**.
  A plausible-looking wrong number is the kind UAT cannot catch.
- **A salesperson's transaction count reading the previous person's cell.** Invisible in a
  sample that happens to give all ten people the same number of sales.

Stock Purchasing carries two ruled deviations of its own; **919 of its workbook sample's 969
lines reproduce exactly**, and every one of the 50 that move is a workbook zero becoming a real
score.

## 3. The owner sets the thresholds, not us

Mike's ruling on Stock Purchasing, applied to the Sales Dashboard from the start: *"the whole
point of the model is to allow a business owner to quantify their expectations — therefore, all
the rankings need to be variables."*

**Stock Purchasing's five scoring ladders and the Sales Dashboard's nine band ceilings are typed
on the screen** and recalculate everything below them. A boundary typed across its neighbour
**pushes the neighbour aside rather than being refused** — refusing it was the first build, and
it produced the worst outcome available: the box went on showing the number the owner typed
while the model quietly scored against the defaults.

## 4. Also in this release

- **4.92 — country rate schedules**, loaded once at global group manager for every country a
  brand operates in, with the firm's class picker searching the whole schedule.
- **4.82 — paid AI document readings are capped** at 20 per firm per rolling 24 hours. They cost
  real money and nothing limited them.
- **Honesty fixes in the AI path**: the app used to throw away the reason a service refused and
  tell people to retry something that cannot work.
- **Two features were unreachable from the browser** because the proxy list missed them. Fixed.

## 5. What we changed about how we work

**A guard was checking 6 of 13 screens and shipped the regression it exists to stop.**
`reportHeaderFullWidth.test.js` makes a one-line CSS reset mandatory, without which a report's
title banner shrinks to a third of the page. It carried a **hand-typed list** of filenames that
stopped growing, so seven screens were written and none added — and Stock Purchasing shipped
with its header **364px wide inside a 1076px column**. Found by Mike looking at the screen.

It now **reads the components directory** and finds every screen, as the frame guard reads the
catalogue's own routes. **A guard that discovers its subjects cannot go stale.** The same
correction was made to the build recipe, which had never told anyone to add a file to it.

**The lesson repeated from v0.11.1 holds:** every screen in this release was opened in a running
browser. That is where a ring showing **"$140"** above the word TRANSACTIONS was found, and a
line saying *"of the money"* about a count of sales — neither visible to any assertion.

## 6. 🔴 What is NOT in this release, said plainly

- **The desktop's work is not here.** Course Builder and the firm quiz builder sit on their own
  branch, 58 commits' worth, and are not on `master`.
- **The Adviser Network runs on invented people** and persists nothing in production mode
  (item 4.86). Adviser identity belongs to Advisor-e; it closes when the master team answers
  question 7 of the integration email.
- **The two middle-tier manager hubs fail closed** until Advisor-e tells this app which role
  values their tokens carry. They log into Advisor-e and always have — this app simply has not
  been told the values, and failing closed is the deliberate direction.
- **Fourteen logic-table branches name documents the template library does not hold**, so that
  coaching is withheld before an adviser sees it (item 4.15). The gate is behaving correctly;
  the eighteen document names are Mike's to settle in UAT.
- **Meeting Review is code-complete and must not be used on a real client yet** (item 4.58).
  Three non-coding gates stand before a first real recording: staff consultation, a lawyer per
  market, and OpenAI's written terms for submitted audio — the last sent 2026-09-12 and awaiting
  reply. The declaration gate is live, so a firm that has not declared cannot start.
- **Nothing here has been run against MySQL.** The laptop has no database, so every store falls
  back to local files. Real persistence is untested on this side and is the first thing to
  exercise in UAT.

## 7. For whoever pulls this

- **Pull the `v0.12.0` tag**, not `master` — a branch keeps moving, a tag does not.
- **No `npm install` needed** over a v0.11.1 tree.
- **First check after installing: `npm run backend` should print
  `[restify] virt-advisor-api listening on …`.** If it exits instead, stop — no screen is worth
  opening. That check exists because v0.11.0 passed every gate and would not start.
- **Report bugs against the tag number**, so a report can be matched to exact code.
- ⚠ **UAT is still running `709bac5` from 14 July.** This is a large jump; §6 above is the
  honest list of what it does not fix.
