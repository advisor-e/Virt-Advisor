# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-07 · Desktop · branch `feat/firm-quiz-builder-ui`

Suite 7,930 green at the first push; the second push's gate covers the closing commit.
Everything pushed.

**4.68 built, proven live and CLOSED.** Three firm-level reads a client's page fetches with
the client's token were advisor-only, so a client silently got the shipped currency, tax
rules and sell-down ladder. A `firmOrEntityAuth` guard in `server/middleware/firmAuth.js` now
admits either on those three GETs only; every write stays the manager's. Proven against the
local MySQL as client, advisor and bad token. Closure on `to-do-done-and-parked.md` §2; the
Brief's "every advisor route" sentence corrected.

**Nothing half-finished on this machine.** No `activeOn` set here. The live list is nine items.

**Next:** 4.69 waits on Mike's four rulings. 4.67 is nobody's; its files are the forecast's.

**LAPTOP:** `server/restify-server.js` changed on three route lines only — the currency,
property-tax-rules and sell-down reads — and `firmAuth.js` gained one exported guard. No
forecast component or intake file was touched. The dev backend on this machine's port 4000
was replaced; it had been running the 2026-09-04 code.
