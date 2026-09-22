# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Laptop · branch `feat/advisor-progress`

**Clean, pushed, 18 ahead / 0 behind.** Suite **13,327 green** (599 suites), lint 0 errors.
Merged your PR #109 on the way — item 17 stages 4 and 5 came across cleanly, one conflict and
it was `CODE-SIZE.md`, regenerated rather than hand-merged. **PR #108 IS OPEN and MERGEABLE**
with 18 commits. **NOTHING WAITS ON MIKE.**

**STAGE 6 IS BUILT — the AI pre-tick.** `server/utils/strategyPretick.js` (the prompt and the
validator every reply passes through, 100% covered), `POST /api/strategy/suggest`, and the
suggestion stored beside the ticks in `scope_json`. **NO MOCKUP WAS DRAWN AND NONE SHOULD BE:**
the scope menu's own approved drawing already carries the button, the bar and Decision C, so a
second would have been a rival artefact. Measured before anything was designed — five client
situations gave five different lists, **4 of Pivot's 9** on Mike's own client description,
**0 invented concepts**. Keyed on the CLIENT, not the session: the button sits on Scope session,
which opens before any session exists.

🔴 **NUXT CAN RELOAD HALF A CHANGE, AND RESTARTING BOTH SERVERS DOES NOT FIX IT.** A newly added
prop read as *"not defined on the instance"* while the file declared it and the unit tests
passed — the template had recompiled and the `<script>` block came from cache. Three restarts.
**Now in `run-the-app` with the one `page.evaluate` probe that proves it rather than guessing.**
The fix is to touch the file's timestamp.

🔴 **ITEM 5.3 IS WIDER THAN IT SAID, AND ITS FIRST FIX IS WEAKER THAN IT LOOKED.**
`strategySessionStore.test.js` hit the same Windows EPERM and blocked two pushes — **and that
store already has the per-process env override 5.3 lists as candidate fix one.** Widened on
Mike's yes. Retry once before investigating.

**DESKTOP — shared files I touched**: `locales/en.json`, `design/features/to-do-items.json`,
`design/ARTEFACTS.md`, `design/CODE-SIZE.md`, `server/utils/strategySessionStore.js`,
`server/routes/strategyPlanner.js`, `server/restify-server.js`,
`components/strategy/StrategyScopeMenu.vue`, `pages/strategy-planner.vue`,
`tests/unit/strategyCapture.component.test.js`, `.claude/commands/startup.md`,
`design/WORKING-AGREEMENT.md`, `.claude/skills/run-the-app/SKILL.md`. **Your item 17 files
untouched.** Your branch read **4 ahead / 0 behind `master`** from its own branch, your note
dated 2026-09-22 — current.

**`activeOn`: 7.5 and 15.1 laptop — both still in hand. 17 desktop.**
**NEXT on 15.1: stages 7 and 8.** Three items filed on Mike's own instruction, all **NOT
ASSESSED** and none started: **15.13** (import the three-way forecast and performance figures
into a planning session), **15.14** Wordsmith, **15.15** Devil's Advocate.

⚠ **LOCAL TO THIS LAPTOP, NOT IN GIT:** `data/dev-cases.json` carries a seeded conversation
summary on Harbour Joinery, written to drive the pre-tick in a browser. **Fabricated — never
read it as real client history.**
