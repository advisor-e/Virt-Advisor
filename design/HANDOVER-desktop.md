# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 · Desktop · branch `feat/firm-quiz-builder-ui`

**Item 4.97 is specified, planned, drawn, ruled and half-built.** Spec Kit feature
`specs/003-engine-middle-learning-true`: ten stories out of the Founder's Claims Audit read
against the built Outcome Learning code. Four drawings approved, **sixteen questions ruled by
Mike one at a time**, 14 of 67 tasks done. **NOTHING AN ADVISOR SEES HAS CHANGED YET** — every
seam built so far is called by nothing. Next task is **T018**, which wires the primary-issue
proposal into the live conversation; do it with the app running, not from tests alone.

**🔴 A REAL FAULT IN 4.87 AS SHIPPED, FOUND AND FIXED (`7a78da2d`).** The decision trace stores
`situation` as a string; `buildContribution` tested it for an object, so **every pooled row in
UAT has a null primary issue and a null industry**. Both are typed trace keys now. Rows already
pooled keep their blanks — not back-filled.

**🔴 MIKE CAUGHT A WRONG SUBJECT IN A DRAWING.** Template Profiles counted the profile FILE
(199) not the library. It is **220 client-facing tools, 61 of them thin**. The audit's "23/88"
and "54 with summaries" figures are withdrawn — by page it is 170 of 220.

**Two faults the proposer found by being RUN, not read** (`77e70acd`, both in its comments):
the industry stop-list gutted Mike's own labels, so "cost of sales has gone up" proposed
*Excessive discounting*; and a reply could confirm a proposal that was null.

**⚠ NO AI-BACKED SCRIPT RUNS ON THIS MACHINE — now item 4.99.** `NODE_EXTRA_CA_CERTS` points at
`certs/digicert-bundle.pem`, which does not work here; export the Avast root instead. A lab run
without the key **overwrote the real report** (separation 2.3 against the true 5.7) and was
caught by the pre-commit hook, not by the lab. Restored; the code half of 4.99 is ours.

Suite **10,984 green** (520 suites), lint 0, tree clean, 69 ahead of master, pushed.

**LAPTOP:** none of your files touched. Shared files that changed: `server/advisorEngine.js`
(trace keys only), `server/utils/templateResolver.js` (three new exports, `options.profileMap`,
primary-issue keyword filter), `server/utils/outcomeLearning.js`, `config/integration.js`,
`.env.example`, `design/UAT-LOAD-PACK.md`, the to-do list (4.97, 4.98, 4.99). Merge `master`
before you touch any of them.
