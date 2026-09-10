# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-10 (close) · Desktop · branch `feat/firm-quiz-builder-ui`

**🔴 v0.11.0 IS CUT AND PUSHED** — tag on `0f0fdab`, the merge of PR #75, on Mike's word.
484 commits from both machines since v0.10.0. Ledger row backfilled; notes at
[`RELEASE-NOTES-v0.11.0.md`](RELEASE-NOTES-v0.11.0.md). **Awaiting the master team's pull** —
when it lands, the deployment row is the next thing to write. The notes carry the one thing
they must not miss: `npm install` with **npm 8 on Node 14.15**, engine-strict is on.

Suite **9,694 green** (471 suites), lint 0, build exit 0. Both branches level with master,
tree clean, everything pushed. Nothing active on this machine except 4.87's flag (below).

**Next session, bring to Mike first** (his instruction): the two open decisions on **4.87
Outcome Learning** — the evidence floor, and hold-back only or both directions — then
`/speckit-clarify` on his yes. Its `activeOn` is the desktop. The three items waiting on us
(4.83 built by the laptop and merged, 4.84, 4.85) and the five waiting on him are unchanged.

**Built today:** the client level of the Meeting Review pre-set; the Course Builder live
click-through; a Code Size page recomputed on every Handbook build; the Founder's Claims Audit
and the Outcome Learning task on one Handbook page, with the spec at
`specs/002-outcome-learning`; question 7 on the integration email; 4.86 filed; five stale
sentences corrected; two small fixes (a dropped cannot-be-heard flag, a log line). The
Handbook's tests no longer rewrite the Code Size record.

**LAPTOP:** master moved four times today (PRs #70, #73, #74, #75); merge it in at startup.
Nothing of yours was touched after your PR #72.
