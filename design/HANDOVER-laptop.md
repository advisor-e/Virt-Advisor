# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-08 (third session) · Laptop · branch `feat/advisor-progress`

Suite **8,318 green**, lint 0 errors, audit pass. Four commits, all pushed — 32 ahead, 0
behind. **PR #69 open.** Nothing uncommitted.

**Shipped:** item **4.75 fixed** — each advisor's meeting state moved to a config key of its
own, so two advisors saving at once can no longer overwrite each other. **`saveFirmConfig` was
deliberately NOT changed.** **QuickBooks Online and MYOB are now `verified`** against Mike's
real exports of 2026-09-07. **Four items closed — 4.75, 4.62, 4.50, 4.60 — eleven down to
seven.**

**Four things worth knowing:**

1. **Storage that is per-PERSON gets a key per person, not a map in one row.**
   `advisorConfigKey('advisorOwn', id)` → `...-own:<advisorId>`, read back in bulk with the new
   `firmOverlay.loadFirmConfigsByPrefix`. The id is capped at 64 so `VARCHAR(128)` cannot
   truncate two people into one row.
2. 🔴 **A note claiming Mike has not approved or supplied something is a CLAIM, not a fact.**
   Two were wrong today — the `clientReports.saved.*` wording (he had approved it) and the
   QuickBooks/MYOB exports (he had sent them). Between them they held two finished items open.
   Ask him; do not encode the doubt.
3. **The MYOB export broke the parser four ways** — that is *why* it is known to be genuine. A
   reconstruction cannot surprise you. The four faults are pinned in
   `accountingPackages.test.js`.
4. **The intake caveat "check the figures on the next step" is gone** — nothing is unconfirmed.
   `sentenceFor(packages)` keeps that branch testable so it returns for the next package added.

**DESKTOP — merge `master` in first.** Shared files that moved, all additive:
`server/utils/firmOverlay.js` (one new export), `locales/en.json` (one string),
`server/report/intake/supportedPackages.js`, `report-models.md`, `to-do-items.json`.
⚠ **Your own handover is dated 2026-09-04 but your branch has commits from 2026-09-08** — I
could not see what that session did.

**Open:** **4.71, 4.72, 4.76** are ours. **4.65 is unblocked** — the asset schedules arrived
inside the 4.60 exports, so it needs a drawing for Mike, not a request for files. **4.15, 4.58,
4.65, 4.66 wait on Mike.**
