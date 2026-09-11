# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-11 (twentieth session) · Laptop · branch `feat/advisor-progress`

Suite **10,026 green** (482 suites), lint 0, audit PASS. Tree clean, level with `master`. Nothing
active on this machine, nothing uncommitted.

**PRs #82, #83 and #84 are all merged** — `master` carries 4.82, 4.92, **4.88 closed** (a failed
depreciation read can be deleted, and it is the only row that can — closure on
[`to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2), and the proxy fix below.
**Eleven live items.**

🔴 **DESKTOP — TWO OF YOUR FEATURES WERE UNREACHABLE FROM THE BROWSER, NOW FIXED.**
`/api/client-copy-requests` (4.58) and `/api/compliance` (4.83) were never added to
`serverMiddleware` in `nuxt.config.js`, so every call got a Nuxt 404 while the Restify routes
behind them served perfectly. **Compliance is the subtle one and it is NOT the hub tab** — that
reads `/api/firm-manager` and always worked. The only caller is the gate on `meeting-record.vue`,
which failed closed by design, so nobody was offered a recorder at an undeclared firm — but the
gate could never return open either, so **a firm that had ticked saw the same screen as one that
had not.** Both answer 200 now, proven on the running app.
`tests/unit/apiProxyWiring.test.js` now fails the build if a feature ships without its entry.

🔴 **DESKTOP — EXPECT TWO CONFLICTS WHEN YOU MERGE `master` IN, AND KEEP BOTH SIDES.**
`components/FirmManagerHub.vue` gained a `countrySchedules` tab (52 lines, all appended) in the
same three places 4.87's consent tab and Mentor Hub page will land. And `nuxt.config.js` now has
two more proxy lines. You were 46 ahead / 20 behind at 15:00.

**Still open, all Mike's:** 4.90 and 4.91 each carry a `FOR MIKE` line — close, or do the narrow
bit that remains. 4.89 is a wording decision on his own pinned sentence.
