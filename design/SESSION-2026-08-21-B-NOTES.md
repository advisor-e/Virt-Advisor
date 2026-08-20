# Session Notes — 2026-08-21 · Laptop, Session 77

> **Branch `feat/advisor-progress`.** Suite **322 suites / 5,895 tests green**, lint 0 errors,
> tree clean, pushed to `origin`.
>
> ✅ **The project can see a rendered page for the first time.** The driver half of item 4.25
> is closed. The list is still **twelve items, four needing Mike** — nothing came off it.

---

## 🔴 FIRST TASK NEXT SESSION

**Ask Mike what he wants.** Same as last session, and for the same reason: nothing is
half-finished and nothing is blocked.

If he has no preference, **the checks half of 4.25 is the natural continuation** — the tool is
in, and writing the first real visual check is ours to do. But read §3 below first: the obvious
shape for that check is the wrong one, and that was measured rather than guessed.

---

## What shipped

One commit: **`7fa5e9a`** — `build(visual-checks)`.

`playwright` pinned to exact **1.34.3** as a devDependency, one line in `.npmrc`, a
`visual:setup` script, and the security write-up. Four files.

### 1. Mike's question is what produced the right answer

He asked twice, in the same words both times: **does this comply with the tech stack
reconciliation plan — yes or no?**

The first answer was yes, and it was right. The second was **no**, and it corrected a
recommendation this session had already made. The proposal on the table was
`playwright-core` — the same Microsoft driver, which downloads nothing, and therefore looked
like the tidy answer to the 604 MB problem. It is a **different package name** from the one
`CLAUDE.md` names, and the `isomorphic-dompurify` ruling at **`CLAUDE.md:215`** treats *"the
named-package requirement"* as a thing that must be satisfied. So it was an avoidable
deviation, and the deviation-logging rule files those as P1.

🔴 **The compliant answer was strictly better than the non-compliant one, and it was only
found by being made to justify the choice against the written rule.** Keeping the named
`playwright` and adding one `.npmrc` line achieves everything `playwright-core` achieved —
nothing downloads on any machine — with no deviation to log at all.

### 2. Three constraints that were genuinely in tension, and how each was settled

| Constraint | Settled by | Proof |
|---|---|---|
| The standards name **Playwright** | `playwright`, not `playwright-core` | `CLAUDE.md:215` precedent |
| **Node 14.15** is locked | pinned exact **1.34.3** | registry: 1.34.3 is `node >=14`, **1.35.0 moves to `>=16`** |
| Nobody else pays for it | `playwright_skip_browser_download=1` | install prints *"Skipping browsers download…"* |

**The third one matters more than it looks.** `playwright`'s install script fetches Chromium,
Firefox *and* WebKit — **measured at 604 MB** — on **every machine that installs**, the master
team's included. Item **3.5** is already an unanswered `npm install` question from Carl. One
config line means their install pulls two text-only packages and no binaries; a developer who
wants a visual check opts in with `npm run visual:setup` (Chromium only, ~265 MB).

### 3. 🔴 The obvious visual check is the WRONG one, and this is the session's real finding

The driver was pointed at `/multiple-property` and asked the naive question — *does anything
overflow its box?* It flagged **10 elements and 51 cells showing a bare dash**.

**Every single one was deliberate.** The wide ten-year tables are `overflow-x: auto` on
purpose; the address is trimmed with an ellipsis on purpose; the dashes are one-off costs —
cash deposit, purchase costs, setup costs — correctly blank in years 2–10.

⚠ **So an anomaly-hunting sweep would have produced a wall of false alarms on its first run,
and the natural response to that is to stop reading it.** A visual check has to assert what a
screen **should** look like. That is a design job and it has not been done.

Recorded in the item itself, not only here, so the next session cannot re-derive it.

### 4. What the driver did confirm

Chromium 114 launched from **Node v14.15.0**, loaded the five-property screen, returned HTTP
200, read the rendered heading, reported **zero JavaScript errors**, confirmed the page does
not scroll sideways, and wrote a full-page screenshot **1440 × 4590**. The layout that
session 76 had to ship marked **UNVERIFIED** has now actually been looked at.

---

## The high advisory is logged, not swallowed

**GHSA-7mvr-c777-76hp · high · `playwright` < 1.55.1** — browsers are downloaded without
verifying the TLS certificate. **The fix cannot be taken:** 1.55.1 requires Node 18, and the
Constitution is one-directional.

Written up in [`SECURITY-AUDIT-NOTES.md`](SECURITY-AUDIT-NOTES.md) with the reasoning, and
two things deliberately recorded rather than glossed:

- ⚠ **This laptop's network runs Avast TLS interception** — the exact condition the advisory
  describes. That is *why* the download is off by default, not merely why it is unlikely to
  matter.
- 🔴 **Governance §5.6 asks for a team discussion before installing a package with a high
  vulnerability, and that has not happened.** This went in on Mike's explicit instruction,
  which is the product owner's call and is recorded as exactly that — **it is not the same
  thing as the §5.6 sign-off**, which is now an open action in that file.

The gate needed no change: the advisory is `high`, and `scripts/audit-gate.js` blocks only on
criticals. It passed reporting *"no un-accepted critical advisories"*.

---

## 🔴 The list had gone stale, and Mike spotted it before we did

He said he could see tasks that should have been cleared. He was right, and the cause is worth
keeping.

**Item 4.16's part F — the 13 method guides — was built on 2026-08-17 (`6ae9778`) and is in
`master`.** 340-line panel, 592-line `methodGuides.js`, 893 lines of hand-written formatters
deleted, 767 lines of tests. That commit updated the **prose** of `to-do.md`, which has said
*"✅ F IS BUILT"* ever since — and **did not update `to-do-items.json`**, which is what the
ranked table and the Handbook control actually read. So for four days the Handbook told Mike
F's *"BUILD IS NOT STARTED"* while the page two screens away said it was finished.

⚠ **`tests/unit/applyToDo.test.js` did not catch it and could not have.** It validates that
each item *has* a `why`, `risk`, `touches` and `name` — not that any of them is **true**. The
drift it guards is between the table and the data; this drift was between the data and the
**code**.

**Fixed in this session:** 4.16's `why`, `risk`, `touches` and `note` now record F as built and
D as the only part left; 4.25's `why`, `touches` and `note` record the driver as installed and
the checks as outstanding.

**Everything else on the list was checked against the code before being left alone** —
4.17 (no dev-data banner exists anywhere: genuinely open), 4.7 (`engine-strict=false`, no
`overrides` for consola/node-releases: genuinely open), 4.18, 4.12, 2.9, 3.5, 4.15, 4.22, 4.26,
4.27. None had moved.

🔴 **The rule this earns: a commit that closes part of a to-do item edits
`to-do-items.json`, not the prose.** The prose is generated around it; the JSON is the source.
A build commit that touches `to-do.md` and not the JSON will pass every gate and still lie.

---

## A correction worth recording

Session 76's note says the suite is **5,887**. It is **5,895**, and was already 5,895 before
today's commit — measured by stashing the change and re-running. Today's change is provably
test-neutral. The 5,887 was simply wrong when written, and it was quoted onward as fact.

---

## For the other machine

Nothing here touches Course Builder or the Business Performance Report. The changes are
`package.json`, `package-lock.json`, `.npmrc`, `design/SECURITY-AUDIT-NOTES.md`, and the two
to-do files.

⚠ **`npm install` behaves differently now, and this is deliberate:** `.npmrc` suppresses
Playwright's browser download. If you want to run a visual check on the desktop, run
`npm run visual:setup` once. If you never do, nothing changes for you and nothing is
downloaded.

⚠ **Also: export the Avast CA bundle fresh before any install.** The saved one at
`C:\Users\mb\Projects\corp-ca-bundle.pem` (2026-07-01) now fails with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE`; a fresh export of `Cert:\LocalMachine\Root` + `\CA` worked
immediately. Avast regenerates its root, so a saved bundle goes stale silently and the failure
reads like a network fault.
