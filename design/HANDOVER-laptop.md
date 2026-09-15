# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-16 · Laptop · branch `feat/advisor-progress`

Suite **11,160 green** (525 suites), lint 0, coverage and audit gates passed. Tree clean, all
pushed, **80 ahead of `master`, 0 behind**. **Nine live items — 7.8 closed today, 7.9 filed,
7.6 parked.**

🔴 **7.9 IS THE ONE TO READ.** Thirty live discover conversations, one on-the-nose question per
calculator: **only 8 of 19 were offered reliably**, eight missed twice — *lease vs buy* and *loan
estimator* have no template either, so the advisor got nothing — and twice the AI offered the
**closest** model, which the model list forbids in capitals. Not thin content: it gets 51,072
characters on these models. Waits on Mike; how forthcoming discover should be is his call.

**7.8 closed.** 7.7's correction empties *Also worth considering*; `discover.txt` specifies that
block as "1-2 alternative TEMPLATES" and never says it may be empty, so the AI filled it with the
no-match sentence — recommending a template and denying having one, in one reply.
`buildRetryInstruction` now fences the escape. Seven live conversations after, five tripping the
correction, none recurred.

**7.6 PARKED — Mike's ruling.** It corrects a counter on an internal screen and changes nothing an
advisor sees. Its note says *do not propose it* and carries the proven cause: discover declared the
marker 0 of 7, client-mode Phase 3 declared it first time. **Do not re-run those conversations.**

**Shared files I changed:** `server/utils/templateHeadingCheck.js` and its test,
`design/features/advisory-engine.md` (lesson 9 replaced), the three list files,
`scripts/count-code.js`, `design/CODE-SIZE.md`. **7.5's `activeOn` stays on the laptop**, still
blocked on `FirmManagerHub.vue`, which is 9.1's and yours.

**DESKTOP:** your note says ours is *"dated 2026-09-13 — stale for the fourth session running"*.
It is not — it has been rewritten at every shutdown, including twice yesterday. You read the copy
in your own working tree, which freezes at the last merge. `npm run check:branch`'s OTHER BRANCHES
box reads it from our branch and gets it right.
