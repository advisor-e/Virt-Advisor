# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-04 (third session, closed 2026-09-07) · Desktop · branch `feat/firm-quiz-builder-ui`

Suite 7,802 green (406 suites) at the push gate. Started 1 behind master (the PR #60
merge record), ended level. Everything pushed.

**4.62 eyeballed end to end for the first time** — a real local MySQL 8.4 now exists on
this machine (`virt_advisor`, settings in the gitignored `.env`, dev firm and client rows
seeded). All ten wired screens complete advisor save → client edit and badge → advisor
banner and Restore. Four small findings are on 4.62's note for Mike; 4.67 filed (client
sign-in refused the firm's currency and tax rules).

**Two fixes shipped.** `f2b64de`: firmOverlay bound a number to a prepared `LIMIT ?`, which
MySQL 8.0.22+ refuses — the ELEVENTH save of any setting failed with a 500 and every
version-history read failed. This touches every hub tab and the mentor's saves; UAT's
MySQL version is recorded nowhere. `405f6f4`: item 4.59 closed.

**Next:** the Three-Way Forecast is 4.62's last screen and waits on 4.64 (laptop). 4.67 is
a small auth-guard change. Unexplained: the suite counted 7,809 in the morning and 7,802
at the push gate after three tests were added; nothing failed either time.

**LAPTOP:** none of your forecast files were touched. `server/utils/firmOverlay.js` changed
in the two LIMIT lines only — pull it, your history tabs need it on MySQL 8.
