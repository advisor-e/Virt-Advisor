# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-16 · Laptop · branch `feat/advisor-progress`

Suite **11,144 green** (524 suites), lint 0, audit PASS. Tree clean, all pushed, **72 ahead
of `master`, 0 behind**. Nine live items; **7.6 and 7.7 filed**, none closed.

🔴 **I CHANGED BOTH AI PROMPT FILES — `data/prompts/client.txt` (new SECTION 12) and
`data/prompts/discover.txt`. Merge `master` before touching the engine.** Item 7.5: the AI is
now asked to declare which calculation model it named, or that none fits, in a stripped
`[[MODEL: ...]]` marker, with a page-path scan underneath it. Rows go to a new
`advisor_model_choices` table; `GET /api/model-choices` reads them back per tier.

⚠ **PHASE 3'S STREAMING HOLD-BACK NOW WATCHES TWO MARKERS, not one.** If you touch that loop
in `advisorEngine.js`, know that watching only `[[TEMPLATES:` would print `[[MODEL:` straight
to the advisor whenever the AI writes it first. That was a near-miss, caught before shipping.

**7.5's last piece is yours to unblock:** its hub tab needs `TAB_TIERS`, `NAV_GROUPS` and a
panel in `FirmManagerHub.vue`, which is 9.1's and active on your machine. 7.5's `activeOn` is
the laptop — the backend is built and waiting on that file.

🔴 **A TEST PINNING EXACT STRINGS DOES NOT CATCH A LATER SECTION CONTRADICTING THEM.**
`discover.txt` said "nothing after the closing line, full stop" and my new section said "write
the marker last". Suite stayed green all day. Worth remembering on any prompt file.

⚠ **NINE LIVE CONVERSATIONS SAID WHAT 11,144 TESTS COULD NOT:** the AI writes that marker about
one time in nine, and fixing the contradiction above did **not** change it. That is item 7.6,
and its note says which cause is already ruled out so you do not re-run it.

**Shared files I changed:** both prompt files, `data/report-model-summaries.json`,
`server/advisorEngine.js`, `server/restify-server.js`, `nuxt.config.js`,
`server/utils/activityStore.js`, `server/utils/activityLogger.js`, `config/db-schema.sql`,
`design/features/report-models.md`. **Merge `master` before touching any.**
