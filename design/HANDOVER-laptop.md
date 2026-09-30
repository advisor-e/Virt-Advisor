# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-10-01 · Laptop · branch `feat/advisor-progress`

**Caught up with master (v0.14.0) at startup; 3 ahead, 0 behind after this commit; suite green:
686 suites / 14,825 tests on Node 14.15.**

**8.4 screen 4 BUILT and walked, Mike's call PROCEED.** Each recorded section's words now appear
under the box open when they were said (clock only, `server/utils/boxPlacement.js`), with
suggested wording (`passageTidy.js`, prompt `passage-tidy` on the Mentor AI Prompts tab); Keep
adds below what is typed. Walked with a computer-voiced script and real OpenAI: 3/3 under the
right box, 1/1 to the tray, typed text untouched. Never yet run with a real person or two voices.
Rulings and differences: `strategy-planner.md` §9b.
Also fixed on Mike's word: the box timeline read its times in the server's zone (13 h out on an
NZ server); the AI Prompts tab's cash-flow line showed above every document.

**FOR THE DESKTOP:** merge master once this reaches it. Shared files changed: `locales/en.json`
(`strategyPlanner.heard.*`, `recording.finishedWords`), `data/ai-prompts.json` (new
`passage-tidy`), `components/firm/FirmAiPrompts.vue`, `pages/strategy-planner.vue`,
`components/strategy/StrategyCaptureCard.vue`, `StrategyConceptCapture.vue`,
`StrategyCaptureBox.vue` (a slot), `server/routes/strategyPlanner.js` (exports `unknownBoxes`),
`server/routes/meetingReview.js`, `server/utils/strategySessionStore.js`.

**Still in hand here:** 8.4 (proceed), 15.31 (Mike's try-out), 8.6.
