# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-11 · Desktop · branch `feat/firm-quiz-builder-ui`

**4.87 Outcome Learning: built through story 3, twelve commits, all pushed.** T007–T037
task by task from `specs/002-outcome-learning/tasks.md`, each approved: the overlay
store's delete-by-prefix, the consent record and tokens, the pool/guard/arithmetic,
the mentor routes and the firm routes (both registered), the review hook, the capped
hold-back in the resolver (SCORING_VERSION 2.2.0), the session wiring and trace block,
and "Learned from outcomes" on the advisor's Why-this panel. Brief §8 says what stands
where. Two wording rulings taken as drawn and recorded on the trace drawing.

**Next: the firm's Outcome Sharing screen (T020–T023).** Its nine proposed wording rows
on `design/mockups/outcome-learning-consent.html` wait on Mike; one correction proposed
("those ticks" → "those answers", to match his own correction of the advisor's line).
Then the mentor page (T027–T030), then the benches (T038–T042). `activeOn` for 4.87
stays on the desktop.

**Unseen:** nothing has run against a real pool. `OUTCOME_POOL_SECRET` must be set in
`.env` before a review at a consenting firm pools anything.

Suite green at the push gate (483 suites, 9,941 tests). Tree clean, 31 ahead, 0 behind.

**LAPTOP:** none of your files touched. Shared files that changed: `templateResolver.js`
(pooled hold-back, one new export), `advisorEngine.js` (a few lines around the resolve
call and the trace), `cases.js` (review hook, one flag on the list), `restify-server.js`
(nine routes), `firmOverlay.js` (one function), `traceReasonCodes.js`, `en.json`.
Merge master before you touch any of them.
