# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-24 · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed at `a20cf65a`. 622 suites / 13,594 tests, audit PASS, `npm run build` OK.
PR #129 is OPEN — Mike merges it.** (PR #128 merged this morning.)

### 🔴 FOR THE LAPTOP — once #129 is on master
- **Every new AI call must pass `moderate:`** — the text a person typed, said or uploaded, or `[]`.
  Without it `openaiClient` refuses the call and `tests/unit/moderation.test.js` fails the build.
  **Never pass the app's own material** — the moderation allowance is 20,000 tokens a minute.
- **One line in 15.1's `server/routes/strategyPlanner.js` changed**, on Mike's yes (`moderate: []`),
  and its test in `strategyPretick.routes.test.js`. Neither was changed on your branch.
- The 5.1 clash with #127 is unchanged: Mike's closure wins.

### What today settled
OpenAI approved ZDR; the amendment was executed 23 Sep and is recorded under `design/openai/`.
**8.2 moderation is DONE** — built, proven live, closed by Mike. **8.1 stays parked** until the
OpenAI console shows ZDR switched on. Filed: **12.1**, **10.1**. Nothing is `activeOn` here.
Testing the app: follow the corrected `run-the-app` skill (production build, Node 14.15 backend).
