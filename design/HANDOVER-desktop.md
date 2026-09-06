# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-04 (third session, closed 2026-09-07) · Desktop · branch `feat/firm-quiz-builder-ui`

Everything pushed after merging master's 25 commits (PRs #59 and #61) in at the close.

**4.62's ten desktop screens eyeballed end to end for the first time** — a real local MySQL
8.4 now exists on this machine (`virt_advisor`, settings in the gitignored `.env`, dev firm
and client rows seeded). Advisor save → client edit and badge → advisor banner and Restore
held on every one. Findings filed: 4.68 (client sign-in refused the firm's currency and tax
rules) and 4.69 (four things for Mike's ruling). The forecast's own loop is the laptop's
(4.67), and its files were not touched here.

**One fix shipped that matters to every hub tab.** `f2b64de`: firmOverlay bound a number to
a prepared `LIMIT ?`, which MySQL 8.0.22+ refuses — the ELEVENTH save of any setting failed
with a 500 and every version-history read failed. Proved live before and after. UAT's MySQL
version is recorded nowhere; if it is 8.0.22 or later, the mentor's saves there fail at v11.

**🔴 4.59 WAS FIXED ON BOTH MACHINES ON 2026-09-04** — the same restamp, the same day, with no
`activeOn` because neither had picked it up when the other started. The laptop's reached
master first and is the one kept; the desktop's copy was dropped at the merge, nothing lost.

**Next:** 4.68 is a small auth-guard change on two read routes. 4.69 waits on Mike.
Unexplained: the suite counted 7,809 in the morning and 7,802 at the push gate after three
tests were added; nothing failed either time.

**LAPTOP:** `server/utils/firmOverlay.js` changed in its two LIMIT lines only — your history
tabs need it on MySQL 8. Nothing else of yours was touched.
