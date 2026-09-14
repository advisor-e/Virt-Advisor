# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 · Desktop · branch `feat/firm-quiz-builder-ui`

**4.97 US1 IS COMPLETE AND LIVE — the engine asks the advisor what the problem is.** It
proposes one authored label with a reason, the advisor confirms or reframes it, and the
**Main issue** row on the trace shows what was recorded and how (T018, T020). This is the
first thing in 4.97 an advisor actually sees. 16 of 67 tasks; **T019** — the Scenario Lab
measurement — is the remainder of US1 and the obvious next task.

**🔴 BOTH OF TODAY'S FAULTS WERE FOUND BY RUNNING THE APP, NOT BY THE SUITE.** Worth
knowing before trusting a green run on this feature.

1. *Naming a problem from one category word* (`8eec6cea`). "Margins are down, the **cost of
   sales** has gone up" proposed *Sales Execution — poor sales training*, on the word
   "sales". Now withheld where the lone match is the domain's own name and the domain has
   more than one label. Cost, measured on the 51 cases: 16 propose, 6 ask instead.
2. *Plain agreement recorded as a correction* (`468ad92c`). `parseReply` re-ranked the
   reply using signals from the ORIGINAL cause text, which fire whatever is typed next, so
   "Yes that is right" came back `reframed` on a label matching **no word of the reply**.
   A reframe now ranks on the reply's own words. No existing test could catch it — they all
   passed an empty signal map.

**⚠ NEW ITEM 4.100, AND IT IS THE BIGGER ONE.** The supplier-cost conversation is routed to
`sales-marketing` at all. The area decides which templates are even considered, so the
advisor gets sales-and-marketing tools for a margin problem. Reproduced twice. The
primary-issue step is correct in both areas — it is what made this visible. Not fixed.

**4.99 still stands: no AI-backed script runs here** (`NODE_EXTRA_CA_CERTS`), so the
Scenario Lab cannot measure the AI layers on this machine — which T019 will want.

Suite **11,027 green** (522 suites), lint 0, `npm run build` succeeds, tree clean, pushed.

**LAPTOP:** none of your files touched. Shared files changed: `server/advisorEngine.js`,
`server/utils/primaryIssueProposer.js`, `components/VirtualAdvisor.vue` (one trace row),
`locales/en.json` (four `decisionTrace.*` keys), `design/features/advisory-engine.md`, the
to-do list (4.97, new 4.100). Merge `master` before you touch any of them.
