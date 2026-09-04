# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-04 (third session) · Laptop · branch `feat/advisor-progress`

Suite **7,812 green** (407 suites), lint 0 errors. `origin/master` merged in (your 4.62
slice 2, ten of ten). **PR #59 is OPEN with 5 commits** — not yet merged.

### 🔴 THE APP RUNS WITHOUT MYSQL — both handovers were wrong about this

`npm run dev:all` works. A placeholder `MYSQL_PASSWORD` is a **warning**, not a blocker:
stores fall back to `data/dev-*.json` and the screens work. `restify-server.js:84-90` says
so in its own comment. **Nuxt listens on IPv6 `::1` only** — a check against `127.0.0.1:3000`
reports it as down when it is up. Use `localhost`.

### Built (4.64 and 4.59)

**4.59 closed** — the mentor's observation points no longer badged as the firm's own.
**4.64 eyeballed for the first time**, which found four faults no test could: the drawing's
revenue block was never built (the *locked figure* Mike's ruling rejected); a badge
overlapped two labels; a badge was on one of three ladder fields; `ProvenanceBadge` was
missing required props. All fixed. **Supplier terms are now editable** on the mentor's
Imported Stock Prices tab, on Mike's instruction — they were hardcoded under a badge
claiming they were platform settings.

### Next

**4.64 stays open for one thing:** five differences from the drawing, recorded in
`ARTEFACTS.md` (k)-(o), none ruled by Mike and none changing a figure. **4.15, 4.60, 4.65,
4.66 and 4.58's open labels wait on Mike.** 4.50 needs UAT.

### DESKTOP

`shipmentTimer` in `ThreeWayForecastIntake.vue` is never cleared on destroy — noticed, not
fixed, not filed. The forecast intake and `forecast-sell-down` files are the laptop's.
