# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 (second session) · Desktop · branch `feat/firm-quiz-builder-ui`

**4.97 US3 IS COMPLETE** (`b15f0599`, `c773d4be`, both pushed). **34 of 67 tasks; US1, US2 and
US3 all done.** US4 — the client's typed industry reaching the pool (T035/T036) — is next and is
two small tasks.

🔴 **FIVE OF THE SIX WAYS THE ADVISOR'S EVIDENCE REACHES A TEMPLATE WERE NEVER PROTECTED.** One
line decided it — `reasons.some(r => r.indexOf('distinction:') === 0)` — so a firm distinction
won and the confirmed main issue, the client's industry and the signals heard in the description
were all silently overruled by pooled data. It now tests `ADVISOR_EVIDENCE`, and the reason code
carries which kind won: **`pooled:outweighed-<kind>`**.

**Anything reading the bare `pooled:outweighed` now wants the `-<kind>` suffix.** The trace-code
rule matches with or without it, deliberately: a case saved before today would otherwise have
shown an advisor the raw string `pooled:outweighed` on screen.

**The trace names which evidence won** — four endings, Mike's wording of 2026-09-14 from
`mockups/outcome-learning-trace-lift.html`. `outweighed[].by` was the constant `'distinction'`
until now, so the panel named the wrong evidence whenever another kind had actually won.

**The fixed bench counts CAP BREACHES and reports 0/51**, on the list route, the mentor's bench
card and the Scenario Lab. A breach cannot be produced through the resolver, so the counter is
proved on constructed display sets — otherwise "0 breaches" could be a counter that never counts.

**WALKED ON THE RUNNING APP.** The bench line seen rendering under the fixed bench's 100% → 100%;
all four endings rendered from the real locale strings; both engine paths proved against
`data/templates.json`. ⚠ **Not reached through a live conversation** — the intake needs real
advisor answers to drive to a pooled match.

Suite **11,071 green** (522 suites), lint 0 errors, coverage and audit gates passed, tree clean,
pushed. `npm run build` NOT run (nothing tagged). **4.99 still stands** — no AI-backed script runs
here, so the Scenario Lab was not run.

**LAPTOP:** you have moved 30 → **39 commits** ahead of master today; your note is still dated
2026-09-13. None of your files touched. Shared files changed: `server/utils/templateResolver.js`,
`outcomeLearningSession.js`, `outcomeBench.js` (new export `hasCapBreach`), `utils/traceReasonCodes.js`,
`components/VirtualAdvisor.vue`, `components/mentor/MentorOutcomeLearning.vue`, `locales/en.json`,
`scripts/scenario-lab.js` and four test files. Merge `master` before you touch any of them.
