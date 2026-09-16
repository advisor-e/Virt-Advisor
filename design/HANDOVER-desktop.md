# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-17 · Desktop · branch `feat/firm-quiz-builder-ui`

**Seven commits, all pushed** (`8a6b804c` … `d284099f`). Suite **11,916 green** (557 suites),
lint 0 errors. **Twelve live items — 7.2, 7.4, 9.2 and 9.4 all closed today.** Tree clean.

🔴 **FIVE FAULTS, EVERY ONE FOUND BY RUNNING THE THING. NONE BY THE SUITE.** Two live, in a
shipped feature nobody had ever driven.

**The Outcome Learning AI reading was blind to lifts** (`c346200d`). `hubReading.js` sent the
legacy `holdBack`, which carries a value only when the direction is negative — so ten of
eleven rows reached the model as 0. It told the mentor to *"focus on Break-Even … currently
effective"*: the page's WORST row, 49 of 125 didn't land. Now sends `size`/`direction`, and
the same page reads *"Quick Fire Diagnosis … a positive lift of 8"*.

**The same pre-US2 assumption was in FOUR places.** Two Briefs and the registry (`8a6b804c`),
then live code, then `specs/002-outcome-learning/data-model.md` (`061a4886`) — the shape spec
somebody CODES FROM, which documented the resolver reading `holdBack` when it reads `size` and
drops rows without it. A sweep on Mike's yes confirmed there is no fifth.

**`--help` destroyed the lab report** (`6fe05b10`). Any unrecognised argument fell through to
the case filter, so it ran 0 cases and still wrote — 1,145 lines of AI-measured results became
21 lines of zeros. Reproduced before fixing. **9.4 the same day** (`d284099f`): `HAS_AI` meant
the key EXISTED, not that a call worked, so a broken CA root reported AI ON and overwrote.
Proved by reverting the guard — it destroyed the report again. Restored from git.

**LAPTOP:** shared files I touched — `server/utils/hubReading.js`, `data/ai-prompts.json`,
`scripts/scenario-lab.js`, `tests/unit/seedOutcomePool.test.js` (dotenv now mocked: the test
was reading the developer's own `.env`). **Your branch is current — 23 ahead, handover dated
today, read from the OTHER BRANCHES box, not my working tree.**

⚠ **`to-do-items.json` WILL CONFLICT at master.** You added 15.1/15.2; I removed 7.2, 7.4, 9.2,
9.4. Different items — keep both sides. My four closures are on `to-do-done-and-parked.md`.

⚠ **`.env` gained `OUTCOME_POOL_SECRET` on this machine** (Mike's yes) to run the quickstart.
Not committed. Yours will need one if you run the Outcome Learning pool locally.
