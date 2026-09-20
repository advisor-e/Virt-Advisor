# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-20 · Laptop · branch `feat/advisor-progress`

**Seven commits, all pushed.** Suite **12,239 green** (567 suites), lint 0 errors, coverage and
audit gates passed. Tree clean. **16 ahead of `master`, 0 behind — all of it in
[PR #102](https://github.com/advisor-e/Virt-Advisor/pull/102), whose title still names only the
18th's work. 22 live items.**

🔴 **7.12 IS STILL YOURS TO PUT BACK.** Mike ruled 2026-09-19 that `7.12` returns to *the right
calculator is offered only sometimes* and your new job takes `7.13`. **This laptop applied its
half** (`e33002be`); your branch still points `7.12` at *the model's page is recalled by the AI*,
so `npm run check:branch` will keep printing the collision until you move it.

**STAGE 3b — THE STEP BUILDER — IS BUILT** (`7dbb8b08`), on Mike's ruling of 15.9 that morning and
then all five decisions on its [drawing](https://claude.ai/artifact/F9pfW8vbXYqPC6t4NokMjh), every
one as recommended. A new **stage 2** in the rail, so it is now five: Scope · Build the steps ·
Run · Objectives · The plan. **Storage rides `scope_json` — no schema change.** An empty step is
kept at three layers; deleting one anywhere deletes Pivot's step 5.

🔴 **RUNNING IT FOUND A FAULT THREE DAYS OLD THAT WAS NOT IN THE NEW CODE.**
`PUT /api/strategy/sessions/:id/scope` rejected **every** real save — 400 `UNKNOWN_FRAMEWORK` —
because it checked ticked ids with `getFramework()` while stage 1 changed the menu to the 52
**concepts** on 2026-09-17. Nothing had ever called the route, so it sat unfound. **The suite was
green throughout.** Two more the suite could not see: Mike's longer titles broke one word per line,
and 52 ticked concepts offered 18 cards with nothing saying why.

**NEW ITEM 15.10** — *Our Session Objective*, page 2 of six of his decks, is missing from the plan.
**Four decisions wait on Mike**, [drawn](https://claude.ai/artifact/VBb5zM8WhP4VraQrQCt9un). Also a
deviation from the approved plan artefact: three front pages drawn, two built.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `ARTEFACTS.md`,
`strategy-planner.md`, `CODE-SIZE.md`, `locales/en.json`, `StrategyScopeMenu.vue`,
`strategy-plan-output.html`. **New:** `StrategyStepBuilder.vue` and three drawings. **No
`FirmManagerHub.vue`, no engine code, no `report-model-summaries.json`.** **7.5, 15.1 and 15.7
stay active on this laptop.**
