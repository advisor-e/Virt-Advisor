# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-15 · Laptop · branch `feat/advisor-progress`

Suite **11,082 green** (521 suites), lint 0, audit PASS. Tree clean, all pushed, **66 ahead of
`master`, 0 behind**. Seven live items; **7.5 filed**, none closed.

🔴 **I CHANGED THE ENGINE'S INSTRUCTION BLOCK — `data/report-model-summaries.json`. You are
active on 7.2, the engine's middle.** Three new rules govern how the AI names a calculation
model: it must decline when none fits, quote a model's limits verbatim, and apply Mike's own
definition of what a model IS (input cells + sequential calculations arriving at a report).
**Merge `master` before touching the engine.**

**WHY: the first effectiveness test these summaries have ever had.** Three real conversations
through `/api/advisor/query` with live AI calls found four faults — every one invisible to
11,082 passing tests, because **the tests check that the words REACH the prompt, never what the
model does with them.** Worth repeating on your own engine work. Record: `report-models.md`.

⚠ **`components/base/ClientAccessSwitch.vue` is on EVERY report page and I changed it.** On a
loopback host it now stands in for the Advisor-e sign-in — without it the client picker rendered
nothing on a laptop, so every client-aware screen behind it was unreachable and looked like a
missing feature rather than a missing sign-in.

🔴 **THE STAFF REGISTER'S DUE-DILIGENCE GATE IS GONE** (Mike: *"i dont need any bullshit gates
telling my advisors what they can and cant do"*). One button; the record of who opened it
survives, and so does the firm-scoping check. 5.1's `activeOn` left clear — its last piece is the
retention dial in `FirmManagerHub.vue`, which is yours.

⚠ **ADDING AN IMPORT TO A `.vue` COMPONENT NEEDS A COLD RESTART.** `cache-loader` serves a stale
transform and hot reload never picks it up; it cost an hour today and looked like a code fault.
Kill nuxt, `rm -rf node_modules/.cache .nuxt`, restart. Seventeen orphaned dev servers were also
fighting over one `.nuxt` — check for those before debugging a build.

**Shared files I changed:** `data/report-model-summaries.json`, `server/utils/videoInjector.js`,
`components/base/ClientAccessSwitch.vue`, `design/features/report-models.md`, `CLAUDE.md`,
`.claude/commands/startup.md` and `shutdown.md`. **Merge `master` before touching any.**
