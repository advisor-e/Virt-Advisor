# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Desktop · branch `feat/firm-quiz-builder-ui`

**Item 17 stage 4 COMPLETE.** Clean, pushed, 2 ahead / 0 behind. Suite **12,963 green**.
Merged master's 12 commits (the laptop's org-chart work) at session start — fast-forward, no
conflicts. **Next: stage 5, the blog tool.**

Built: the firm-wide Team roll-up and the ten dropdown lists (5 routes, 3 backend files, 2
screens), as **two Firm Manager Hub tabs** under *Your Team In Action*, plus **`/sales-tracker`**
— the advisor's landing page. Detail in Brief §10 stage 4 and §13.

### 🔴 TWO RULINGS OF MIKE'S, BOTH BUILT AND PINNED

**A firm manager sees EVERY deal in the firm, private ones included** — the question stage 1 left
open. One read crosses the advisor boundary (`salesTeamStore.listForFirm`); the gate is
server-side `requireManagerRole`, never the tab's presence.

**The approach rate is prospects approached (an approach DATE) over prospects available to
approach (status not `Await Research`)** — it finds the advisor who researches and never starts
the sale. The source app counts `approachStyle`, which its own screen fills in on creation, so
its rate reads ~100% for everyone.

### 🔴 THE STUB FOR THE MASTER TEAM — Brief §13

They place **one link, to `/sales-tracker`**. This app has no navigation of its own
(`layouts/default.vue` is `div > nuxt`), so an unlinked screen cannot be found at all — which is
what had happened to all three advisor screens. A fourth screen later changes that page, never
their link. `/sales-tracker` is asserted **by name** in a test, so a rename fails the build here
before it breaks their link.

### ⚠ Two bugs found by OPENING the app, not by 12,963 tests

The approach rate above measured nothing — visible the moment three advisors all read 100%. And
the firm-total row rendered `7` where it should read `7 / 8`: **Vue 2 reactivity**, `totals`
declared `{}` so a field arriving later was never tracked, while the *identical markup one row
above* was correct because `rows` is an array replaced wholesale. I misdiagnosed it twice (the
Pug slash, then a stale build) before reading the rendered HTML. Both pinned, mutation-verified.

### Notes

- **LAPTOP — shared files I touched**: `components/FirmManagerHub.vue` (TAB_TIERS, NAV_GROUPS, 2
  panels), `locales/en.json`, `server/restify-server.js`, `server/utils/salesMetrics.js`,
  `server/utils/salesPipelineStore.js` (one comment). ⚠ **Tab counts moved in two guards** —
  `mentorHubScope` (19→21) and `hubTabTiers`; `serverWiring` 9→14 sales routes.
  **Your 7.5 and 15.1 untouched.**
- **Dev data**: back to the original 7 seeded deals — two test prospects added to demonstrate the
  approach rate were deleted by exact id (a real `Harbour Freight Ltd` exists; the fake was
  `Harbour Freight Co`).
