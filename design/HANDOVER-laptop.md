# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-06 (second session) · Laptop · branch `feat/advisor-progress`

Suite **7,969 green** (412 suites), lint clean (0 errors). Everything pushed. Nothing is
uncommitted.

### 🔴 4.66 IS STILL ACTIVE ON THE LAPTOP — `activeOn` stands

Slice 2 touches `ThreeWayForecastIntake.vue`. Do not start it. Everything else is free.

### 4.66 SLICE 1 IS BUILT — the engine, and no screen

Mike said *"build the economic analysis"*, then approved a three-slice plan and slice 1.
**An advisor cannot reach any of this yet:** nothing in the app calls the new routes.

- `server/routes/economicAnalysis.js` — start / poll / include, `firmAuth` on all three.
  Returns a job because a run takes 83–102 seconds, and **the call streams** (a silent
  non-streamed POST trips the client's own idle guard).
- `server/report/economicAnalysis/researchResult.js` — the validator. Held at **100% on all
  four metrics** by a new `jest.config.js` threshold.
- `server/utils/economicAnalysisRuns.js` — runs in memory, approvals persisted per firm.
- `data/ai-prompts.json` — the fourth prompt, all four tiers. `openaiClient.js` gained a
  `/v1/responses` path beside the chat one.

### 🔴 The one thing to read before touching this

**The citation re-check is permanent now, and it reads the evidence page directly.**
`tests/fixtures/economicAnalysisRuns.js` loads runs 1 and 4 out of
`design/ECONOMIC-ANALYSIS-TEST-RUNS.md` rather than copying them. Run 4 must pass; run 1
must be refused. **So editing run 4's section 4 to "restore" its figures breaks the test
that proves the fix works** — which is the point, not a nuisance.

### Two things wait on Mike, both in `ECONOMIC-ANALYSIS-PROMPT.md` §7

1. **A sentence was added to his approved §6** — *"Number each section heading as it is
   numbered above…"*. The guard finds section 4 by its numbered heading; without it the
   check is skippable by accident. Recorded as an unruled deviation, not absorbed.
2. **The model name was never recorded** by the four test runs and the script is gone.
   `MODEL` in the route carries that warning. **One live call confirms it and re-checks the
   citation fix against fresh output at the same time.**

### Two things a later session would otherwise rediscover

- **Screen 3 cannot be built as drawn.** The API does not say which output section a search
  belongs to, so the four ticking research areas would be a guess dressed as progress. Slice
  2 shows the model's real search phrases instead; the deviation is recorded on the mockup.
- **A firm manager now gets a document picker** on the AI Prompts tab. Correct and
  predicted — the component asks the data, not the tier.

### Next

Slice 2 (the screens) or slice 3 (the printed pack). Neither should start before the model
name is confirmed, because the screens would be built around unproven output.

**4.15, 4.50, 4.58, 4.60, 4.62, 4.65 unchanged and untouched today.** Seven items live.
