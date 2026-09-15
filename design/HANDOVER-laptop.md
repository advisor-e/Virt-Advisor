# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-16 · Laptop · branch `feat/advisor-progress`

Suite **11,148 green** (525 suites), lint 0, coverage and audit gates passed. Tree clean, all
pushed, **74 ahead of `master`, 0 behind**. **Eight live items — 7.7 built and closed today.**

🔴 **I CHANGED `server/advisorEngine.js`'s MAIN PATH — merge `master` before touching it.** The
`finish_reason` block in discover mode now `await`s `correctTemplateHeadings()`, which returns
**`{ answer, unresolved }`**, not a string. Everything downstream — the fabrication watch, the
video injector, the display text and **`noteModelChoice`** — must use `answer`, never
`_mainBuffer`. Recording the discarded reply would put a model on the Model Choices screen that
no advisor was ever sent to.

**Item 7.7 closed.** Asked about wages the AI offered **Wages/Salary Review** — a calculator page
(`/wages-review`) — as the best-match *template*; the library holds **Wages Review**.
`server/utils/templateHeadingCheck.js` reads the names under *Best match* / *Also worth
considering* back against the library; a model found there is not sent, and the AI is re-asked
once with the fault and its real page path named.

⚠ **THE RULE WAS ALREADY IN THE PROMPT FOUR TIMES AND WAS IGNORED** — `discover.txt` lines 33, 38
and 92, plus the model-list instruction. Do not reach for a fifth sentence on any prompt fault;
7.6 proved the same week that rewording does not move it.

🔴 **RUNNING IT FOUND TWO THINGS 11,155 TESTS COULD NOT, which is four days running.** The AI
mislabels a **second** calculator the same way (`High-Level Budget`) — a hardcoded pair would have
been wrong within a day. And my first correction made one answer **worse**: told it couldn't use
the calculator, the AI grabbed a weak template instead of saying nothing fitted. A correction must
carry the escape as well as the prohibition.

**7.5's `activeOn` stays on the laptop** — its hub tab still needs `TAB_TIERS`, `NAV_GROUPS` and a
panel in `FirmManagerHub.vue`, which is 9.1's and active on your machine. Backend built and
waiting.

**Shared files I changed:** `server/advisorEngine.js`, `design/features/advisory-engine.md` and
its history, `to-do-items.json` / `to-do.md` / `to-do-done-and-parked.md`, `design/CODE-SIZE.md`.
