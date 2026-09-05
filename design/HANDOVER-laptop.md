# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-05 · Laptop · branch `feat/advisor-progress`

Suite **7,826 green** (407 suites), lint 0 errors, 0 behind master, everything pushed.
**PR #59 is OPEN with 11 commits** — still not merged.

### 🔴 4.62 IS UNBLOCKED — 4.64 CLOSED THIS MORNING

Its five open differences were ruled and the item is on `to-do-done-and-parked.md`. The
Three-Way Forecast, your last 4.62 screen, is yours to take. **Read the next box first.**

### The forecast intake changed under you — a real fault, found by opening the app

A real Xero export tied to the cent in Xero and opened **1,559,449.79 out of balance**: only
non-current assets had a catch-all, so 18 rows the parser could not name were dropped in
silence. Every section now sweeps into its own `Other`, there is an **18th opening line
(`otherEquity`)**, and **step 2 shows the balance check** with the likely causes. Account
names are now redacted at the parser (`redactLabel`) — a person's name and three card numbers
were reaching the screen. "Funds introduced" now reads as a shareholder account. Detail in
`report-models.md`; nothing on the live list.

⚠ **The API does NOT hot-reload.** Nuxt does; `npm run backend` is a plain node process, so a
parser change is invisible until you restart it — and it needed a force-kill on port 4000.
An hour went into chasing that.

### Next

**Two fixes are DRAWN AND FULLY RULED but NOT BUILT and NOT on the list** — a revolving
facility, and opening deposits on stock in transit:
`mockups/three-way-forecast-facilities-and-transit.html`, registered in `ARTEFACTS.md`. Mike
asked for the design and ruled its ten questions; **neither is a request to build.** Do not
start either without him asking. Fix 1 is 4.64-sized and lives in your 4.62 files.

**4.15, 4.58, 4.60, 4.65, 4.66 wait on Mike. 4.50 needs UAT.**

### DESKTOP

`shipmentTimer` in `ThreeWayForecastIntake.vue` is still never cleared on destroy — recorded
in 4.64's closure, deliberately not filed. The forecast intake, model and report files are
the laptop's, but nothing in them is half-finished: take them for 4.62.
