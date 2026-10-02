# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-10-02 (evening) · Laptop · branch `feat/advisor-progress`

**6 ahead of master after this commit, 0 behind; suite green 695 suites / 15,075 tests on Node 14.15.**
7.27's two commits are pushed; the rest go up with this note.

**7.27 done.** Usage limits count each signed-in person within their firm, not the network address
(`server/utils/rateLimit.js`); limits unchanged. Measured: 10 of 40 refused → 0.

**7.21 done.** A client-chat follow-up sends the AI its own full reply from the server's copy
(`server/utils/followUpReplies.js`); a session opens only for the firm and advisor who started it.
Measured: 51 of 51 bench recommendations were cut, all now reach the AI whole.
Both are principles P11 and P12 in `advisory-engine.md`.

**FOR THE DESKTOP:**

- Shared file changed: `server/advisorEngine.js` — the session store (`sessionCreate`, `sessionSave`
  now take an owner), the start of `handleQuery`, and two lines where replies are sent.
- `tests/unit/promptCheck.routes.test.js` now varies the manager, not the address.
- `design/features/README.md` row 7 carries two new design files.

**Still in hand here:** 8.6 and 15.31, both waiting on Mike.
