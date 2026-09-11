# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-11 (third session) · Desktop · branch `feat/firm-quiz-builder-ui`

**4.87 Outcome Learning seen running for the first time**, on the production build against
local MySQL: seed, sharing on, the mentor's Accept turning a row Live, the firm's count
following. Two defects found by looking and fixed the same day (`ced082b`): the seed keyed
firm A as `dev-firm` where the sign-in carries `dev-firm-001`; and the Client Copy Request
tab (4.58) had no Nuxt proxy line. The no-secret sentence was approved as written.
**Industry suggestions on the intake (T022a) drawn, ruled, approved and built the same day**
from drawing 4 (`mockups/outcome-learning-intake-industry.html`), and seen against the live
engine (`9e52042`).

**Next: the benches (T038–T042)** — `--adjustments` on the Scenario Lab, the outcome bench
and the bench route. `activeOn` for 4.87 stays on the desktop. Nothing waits on Mike.

**Running the app:** `OUTCOME_POOL_SECRET` is not in `.env`; pass the same value to the seed
and the backend. The build regenerates `design/CODE-SIZE.md`; commit it.

Suite green: 495 suites, 10,304 tests. Tree clean, 44 ahead of master, 0 behind. Master
merged in at `452f927`.

**LAPTOP:** none of your files touched. Shared files that changed under you:
`server/advisorEngine.js` (the question sender's closing event carries the field),
`nuxt.config.js` (two proxy lines), `server/restify-server.js` (one mount),
`components/VirtualAdvisor.vue` (the chip row), `components/FirmManagerHub.vue` (merge only),
`locales/en.json` (one string). Merge master before you touch any.
