# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 · Desktop · branch `feat/firm-quiz-builder-ui`

**4.97 US1 AND US2 ARE BOTH COMPLETE** (`ace4ea62`, pushed). 27 of 67 tasks. **US3 — the
advisor's own words always win, across all six evidence families — is the obvious next
task** (T030–T034); it reads the signed sizes US2 introduced, which is why the plan pairs
them.

**Outcome Learning now lifts as well as holds back.** One signed number per pairing:
`size = round(10 × (well − less) ÷ delivered)`, `holdBack` derived from it, matched sizes
NET before a ±10 cap. Same floor, same mentor decision, same trace. A net of zero applies
nothing and writes NO reason. `SCORING_VERSION` → **2.3.0**.

🔴 **THE SEED'S OWN DATA FLIPPED DIRECTION, AND THAT IS THE FAULT IN ONE LINE.** Break-Even
— 31 delivered, 12 less, **19 well** — computed a hold-back of 4 and is in truth a lift of
+2. The engine was holding back a template the pool was recommending. Several test fixtures
changed answer for the same reason; each says so in a comment.

**The advisor's words win in BOTH directions** — a lift that would reorder their own
evidence is `pooled:outweighed` exactly as a hold-back is. Deliberate; do not "fix" it.

**T019: the Scenario Lab measures the primary-issue step.** 25/51 propose (49%), 7 withheld
as too thin, 9 context domains, 10 no match; 24/25 survive the case's own words — **a proxy,
and the report line says so.** ⚠ **The lab itself was NOT run: 4.99 stands**, and a run here
would overwrite a full report with one measured without the AI layers.

⚠ **T020's box in `tasks.md` is still unticked** though it shipped yesterday (`468ad92c`).
Left alone rather than ticking another session's work — worth one word from Mike.

Suite **11,053 green** (522 suites), lint 0, tree clean, pushed. `npm run build` NOT run
this session (nothing was tagged).

**LAPTOP:** none of your files touched. Shared files changed: `server/utils/templateResolver.js`
(the pooled block + version), `outcomeLearning.js`, `outcomeLearningSession.js`, `outcomeBench.js`,
`components/VirtualAdvisor.vue` (trace line), `components/mentor/MentorOutcomeLearning.vue`,
`locales/en.json`, `utils/traceReasonCodes.js`, the dev seed and six test files. **Anything
reading `holdBack` off an adjustment now wants `size`.** Merge `master` before you touch any
of them.
