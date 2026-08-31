# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-01 · Desktop · branch `feat/firm-quiz-builder-ui`

Suite **6,560 green** (353 suites), lint 0 errors, everything committed and pushed.
**PR #49 was merged to master this morning** (Mike's yes) — yesterday's Phase 1 and the
desktop handover are now visible to the laptop; master was merged back in before push.

**What shipped: Phase 2 of the Search-Content Cascade** (`c3f2ee9`, approved in session).
The engine now reads the template library through **`server/utils/templateLibrary.js`**
— nearest tier's upload wins WHOLE (firm → group → global → platform), committed
`data/templates.json` as seed, ~60s cache, loud fallback. Wired: advisorEngine,
courseEngine (handleDesign is now async), Logic Lab's `_firmTemplateLibrary`,
videoInjector. Proven live: a firm with no upload received Mike's 291-template upload.
The Template Library tab also got its production-build eyeball (that residual is closed).

**Open on the live list:** 4.55 is now **Phase 3 only** (firm's upload screen + one
dangling-wording fix, waiting on Mike). **4.56 NEW** — Mike to rule whether a firm's
replaced library changes claimable CPD; `cpdCatalogue` deliberately still reads the
committed file until he does. 4.15 / 4.50 / 4.54 unchanged.

**LAPTOP:** any template read now goes through `templateLibrary.js` — do not add a
direct `data/templates.json` read; in route tests its ~60s cache needs
`clearTemplateCache()` in beforeEach (see `logicLab.routes.test.js`). Also: a full
MySQL 8.4 runs on the desktop now, but this app has no credentials for it — dev runs
here set `MYSQL_PORT=3307` so the dev-file fallback engages instead of auth-refusing.
